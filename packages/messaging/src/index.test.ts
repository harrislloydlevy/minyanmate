import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { createMemoryDb, enqueueOutboxMessage, events, groupMembers, groups, jobs, messages, rsvps, users } from "@minyanmate/db";
import { deliverOutboxMessage } from "./delivery";
import { fanOutQuorumNotifications } from "./quorum";
import type { MessageTransport, OutboundMessage } from "./transports";

const migrationsFolder = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "db",
  "drizzle",
);

function migratedDb() {
  const handle = createMemoryDb();
  migrate(handle.db, { migrationsFolder });
  return handle.db;
}

function fakeTransport(send: (message: OutboundMessage) => Promise<{ provider: string; providerMessageId: string }>): MessageTransport {
  return {
    channel: "console",
    send,
  };
}

async function seedUser(
  db: ReturnType<typeof migratedDb>,
  name: string,
  phoneNumber: string | null,
) {
  const [user] = await db.insert(users).values({ name, phoneNumber }).returning();
  if (!user) throw new Error("user insert failed");
  return user;
}

async function seedEvent(db: ReturnType<typeof migratedDb>) {
  const owner = await seedUser(db, "Owner", "+15550000001");
  const [group] = await db
    .insert(groups)
    .values({ name: "Test Shul", slug: "test-shul", typeTag: "minyan", ownerId: owner.id })
    .returning();
  const [event] = await db
    .insert(events)
    .values({
      groupId: group!.id,
      title: "Morning Minyan",
      date: "2026-11-05",
      startsAt: "2026-11-05T07:00",
      locationText: "Test Shul",
      quorumTarget: 2,
      ownerId: owner.id,
    })
    .returning();
  if (!event) throw new Error("event insert failed");
  return { owner, group: group!, event };
}

describe("deliverOutboxMessage", () => {
  it("marks a message sent and records the provider id", async () => {
    const db = migratedDb();
    const { message } = await enqueueOutboxMessage(db, {
      kind: "otp",
      channel: "console",
      recipient: "+15550000001",
      body: "Your code is 123456",
      maxAttempts: 1,
    });

    const result = await deliverOutboxMessage(db, message!.id, {
      transport: fakeTransport(async () => ({
        provider: "fake",
        providerMessageId: "fake-1",
      })),
    });

    expect(result.outcome).toBe("sent");
    const [row] = await db.select().from(messages);
    expect(row).toMatchObject({
      status: "sent",
      deliveryMode: "auto",
      sentChannel: "console",
      sentRecipient: "+15550000001",
      sentBody: "Your code is 123456",
      technique: "fake",
      sentBy: "worker",
      provider: "fake",
      providerMessageId: "fake-1",
      attempts: 1,
    });
    expect(row?.sentAt).toBeInstanceOf(Date);
  });

  it("can deliver a manual request and records the actual technique", async () => {
    const db = migratedDb();
    const { message } = await enqueueOutboxMessage(db, {
      kind: "quorum_reached",
      channel: "console",
      recipient: "+15550000001",
      body: "Requested body",
      deliveryMode: "manual",
      maxAttempts: 1,
    });
    expect(message?.status).toBe("requested");

    const result = await deliverOutboxMessage(db, message!.id, {
      sentBy: "manual",
      transport: fakeTransport(async () => ({
        provider: "fake",
        providerMessageId: "fake-manual-1",
        technique: "whatsapp:template",
      })),
    });

    expect(result.outcome).toBe("sent");
    const [row] = await db.select().from(messages);
    expect(row).toMatchObject({
      status: "sent",
      deliveryMode: "manual",
      body: "Requested body",
      sentBody: "Requested body",
      technique: "whatsapp:template",
      sentBy: "manual",
      provider: "fake",
      providerMessageId: "fake-manual-1",
    });
  });

  it("marks a message failed after the final attempt instead of retrying forever", async () => {
    const db = migratedDb();
    const { message } = await enqueueOutboxMessage(db, {
      kind: "quorum_reached",
      channel: "console",
      recipient: "+15550000001",
      body: "Quorum reached",
      maxAttempts: 1,
    });

    const result = await deliverOutboxMessage(db, message!.id, {
      transport: fakeTransport(async () => {
        throw new Error("transport exploded");
      }),
    });

    expect(result).toEqual({ outcome: "failed", error: "transport exploded" });
    const [row] = await db.select().from(messages);
    expect(row).toMatchObject({
      status: "failed",
      attempts: 1,
      error: "transport exploded",
    });
  });

  it("leaves a message queued and throws while retries remain", async () => {
    const db = migratedDb();
    const { message } = await enqueueOutboxMessage(db, {
      kind: "quorum_reached",
      channel: "console",
      recipient: "+15550000001",
      body: "Quorum reached",
      maxAttempts: 3,
    });

    await expect(
      deliverOutboxMessage(db, message!.id, {
        transport: fakeTransport(async () => {
          throw new Error("temporary failure");
        }),
      }),
    ).rejects.toThrow("temporary failure");

    const [row] = await db.select().from(messages);
    expect(row).toMatchObject({ status: "queued", attempts: 1 });
  });
});

describe("fanOutQuorumNotifications", () => {
  it("creates one message per attendee, skips opt-outs, and is idempotent", async () => {
    const db = migratedDb();
    const { owner, group, event } = await seedEvent(db);
    const alice = await seedUser(db, "Alice", "+15550000002");
    const bob = await seedUser(db, "Bob", "+15550000003");
    const carol = await seedUser(db, "Carol", null);

    await db.insert(groupMembers).values([
      { groupId: group.id, userId: alice.id, role: "member", notifyQuorum: true },
      { groupId: group.id, userId: bob.id, role: "member", notifyQuorum: false },
    ]);
    await db.insert(rsvps).values([
      { eventId: event.id, userId: owner.id, status: "in" },
      { eventId: event.id, userId: alice.id, status: "maybe" },
      { eventId: event.id, userId: bob.id, status: "in" },
      { eventId: event.id, userId: carol.id, status: "in" },
    ]);

    const first = await fanOutQuorumNotifications(db, event.id, {
      channel: "console",
      baseUrl: "https://minyan.example",
    });

    expect(first).toEqual({ enqueued: 2, skipped: 2, duplicates: 0 });

    const rows = await db.select().from(messages);
    expect(rows).toHaveLength(4);

    const aliceRow = rows.find((row) => row.userId === alice.id);
    expect(aliceRow).toMatchObject({
      status: "queued",
      deliveryMode: "auto",
      channel: "console",
      recipient: "+15550000002",
      recipientName: "Alice",
      batchId: `quorum_reached:${event.id}`,
    });
    expect(aliceRow?.body).toContain("https://minyan.example/events/" + event.id);
    expect(aliceRow?.body).toContain("3 confirmed");

    const bobRow = rows.find((row) => row.userId === bob.id);
    expect(bobRow).toMatchObject({
      status: "skipped",
      error: "Quorum notifications disabled for this group",
    });

    const carolRow = rows.find((row) => row.userId === carol.id);
    expect(carolRow).toMatchObject({
      status: "skipped",
      error: "No phone number on file",
    });

    expect(await db.select().from(jobs)).toHaveLength(2);

    const second = await fanOutQuorumNotifications(db, event.id, {
      channel: "console",
      baseUrl: "https://minyan.example",
    });
    expect(second).toEqual({ enqueued: 0, skipped: 0, duplicates: 4 });
    expect(await db.select().from(messages)).toHaveLength(4);
    expect(await db.select().from(jobs)).toHaveLength(2);
  });

  it("can hold fan-out as manual requests", async () => {
    const db = migratedDb();
    const { owner, event } = await seedEvent(db);
    const alice = await seedUser(db, "Alice", "+15550000002");

    await db.insert(rsvps).values([
      { eventId: event.id, userId: owner.id, status: "in" },
      { eventId: event.id, userId: alice.id, status: "in" },
    ]);

    const result = await fanOutQuorumNotifications(db, event.id, {
      channel: "console",
      deliveryMode: "manual",
      baseUrl: "https://minyan.example",
    });

    expect(result).toEqual({ enqueued: 2, skipped: 0, duplicates: 0 });
    const rows = await db.select().from(messages);
    expect(rows).toHaveLength(2);
    expect(rows.every((row) => row.status === "requested")).toBe(true);
    expect(rows.every((row) => row.deliveryMode === "manual")).toBe(true);
    expect(await db.select().from(jobs)).toHaveLength(0);
  });

  it("does nothing when quorum has not been reached", async () => {
    const db = migratedDb();
    const { event } = await seedEvent(db);

    const result = await fanOutQuorumNotifications(db, event.id, { channel: "console" });

    expect(result).toEqual({ enqueued: 0, skipped: 0, duplicates: 0 });
    expect(await db.select().from(messages)).toHaveLength(0);
  });
});
