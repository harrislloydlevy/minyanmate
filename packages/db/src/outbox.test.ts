import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { createMemoryDb, jobs, messages, users } from "./index";
import {
  enqueueOutboxMessage,
  listOutboxMessages,
  recordManualDelivery,
} from "./outbox";

const migrationsFolder = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "drizzle",
);

function migratedDb() {
  const handle = createMemoryDb();
  migrate(handle.db, { migrationsFolder });
  return handle.db;
}

async function seedUser(db: ReturnType<typeof migratedDb>, name: string) {
  const [user] = await db
    .insert(users)
    .values({ name, phoneNumber: `+1555000${Math.floor(Math.random() * 10_000)}` })
    .returning();
  if (!user) throw new Error("user insert failed");
  return user;
}

describe("outbox", () => {
  it("enqueues a message and its delivery job", async () => {
    const db = migratedDb();
    const user = await seedUser(db, "Mordy");

    const result = await enqueueOutboxMessage(db, {
      userId: user.id,
      kind: "quorum_reached",
      channel: "console",
      recipient: user.phoneNumber,
      recipientName: user.name,
      body: "Quorum reached",
      dedupeKey: "quorum_reached:e1:u1",
    });

    expect(result.inserted).toBe(true);
    expect(result.message?.status).toBe("queued");

    const [message] = await db.select().from(messages);
    expect(message).toMatchObject({
      userId: user.id,
      channel: "console",
      deliveryMode: "auto",
      recipient: user.phoneNumber,
      status: "queued",
      attempts: 0,
      maxAttempts: 3,
    });
    expect(message?.requestedAt).toBeInstanceOf(Date);

    const jobRows = await db.select().from(jobs);
    expect(jobRows).toHaveLength(1);
    expect(jobRows[0]).toMatchObject({ type: "deliver_message", status: "pending" });
    expect(JSON.parse(jobRows[0]!.payload)).toEqual({ messageId: message!.id });
  });

  it("dedupes by key without enqueueing a second job", async () => {
    const db = migratedDb();
    const input = {
      kind: "quorum_reached" as const,
      channel: "console" as const,
      recipient: "+15550000001",
      body: "Quorum reached",
      dedupeKey: "quorum_reached:e1:u1",
    };

    expect((await enqueueOutboxMessage(db, input)).inserted).toBe(true);
    expect((await enqueueOutboxMessage(db, input)).inserted).toBe(false);

    expect(await db.select().from(messages)).toHaveLength(1);
    expect(await db.select().from(jobs)).toHaveLength(1);
  });

  it("records skipped rows without a delivery job", async () => {
    const db = migratedDb();

    const result = await enqueueOutboxMessage(db, {
      kind: "quorum_reached",
      channel: "console",
      status: "skipped",
      error: "No phone number on file",
      dedupeKey: "quorum_reached:e1:u2",
    });

    expect(result.inserted).toBe(true);
    expect((await db.select().from(messages))[0]).toMatchObject({
      status: "skipped",
      error: "No phone number on file",
    });
    expect(await db.select().from(jobs)).toHaveLength(0);
  });

  it("records manual requests without a delivery job", async () => {
    const db = migratedDb();

    const result = await enqueueOutboxMessage(db, {
      kind: "quorum_reached",
      channel: "console",
      recipient: "+15550000001",
      body: "Quorum reached",
      deliveryMode: "manual",
      dedupeKey: "quorum_reached:e1:u3",
    });

    expect(result.message?.status).toBe("requested");
    const [message] = await db.select().from(messages);
    expect(message).toMatchObject({
      status: "requested",
      deliveryMode: "manual",
      body: "Quorum reached",
    });
    expect(message?.requestedAt).toBeInstanceOf(Date);
    expect(await db.select().from(jobs)).toHaveLength(0);
  });

  it("fills in the delivery side without losing the request", async () => {
    const db = migratedDb();
    const { message } = await enqueueOutboxMessage(db, {
      kind: "quorum_reached",
      channel: "whatsapp",
      recipient: "+15550000001",
      body: "Requested body",
      deliveryMode: "manual",
      dedupeKey: "quorum_reached:e1:u4",
    });

    const result = await recordManualDelivery(db, {
      messageId: message!.id,
      technique: "whatsapp:template",
      sentChannel: "whatsapp",
      sentBody: "Actual template body",
      providerMessageId: "wamid.1",
    });

    expect(result).toEqual({ ok: true });
    const [row] = await db.select().from(messages);
    expect(row).toMatchObject({
      status: "sent",
      deliveryMode: "manual",
      body: "Requested body",
      sentBody: "Actual template body",
      sentChannel: "whatsapp",
      sentRecipient: "+15550000001",
      technique: "whatsapp:template",
      sentBy: "manual",
      provider: "manual",
      providerMessageId: "wamid.1",
      attempts: 1,
    });
    expect(row?.sentAt).toBeInstanceOf(Date);
  });

  it("does not let manual entry bypass an automatic delivery", async () => {
    const db = migratedDb();
    const { message } = await enqueueOutboxMessage(db, {
      kind: "quorum_reached",
      channel: "console",
      recipient: "+15550000001",
      body: "Quorum reached",
      dedupeKey: "quorum_reached:e1:u5",
    });

    const result = await recordManualDelivery(db, {
      messageId: message!.id,
      technique: "manual",
    });

    expect(result.ok).toBe(false);
    const [row] = await db.select().from(messages);
    expect(row?.status).toBe("queued");
    expect(row?.sentBody).toBeNull();
  });

  it("filters the log by status, channel and search term", async () => {
    const db = migratedDb();
    const user = await seedUser(db, "Rivka");

    await enqueueOutboxMessage(db, {
      userId: user.id,
      kind: "otp",
      channel: "console",
      recipient: user.phoneNumber,
      recipientName: "Rivka",
      body: "Your code is 123456",
      status: "sent",
      dedupeKey: "otp:1",
    });
    await enqueueOutboxMessage(db, {
      kind: "custom",
      channel: "sms",
      recipient: "+15559999999",
      body: "A different message",
      status: "skipped",
      dedupeKey: "custom:1",
    });

    const sent = await listOutboxMessages(db, { status: "sent" });
    expect(sent).toHaveLength(1);
    expect(sent[0]?.recipientName).toBe("Rivka");

    const sms = await listOutboxMessages(db, { channel: "sms" });
    expect(sms).toHaveLength(1);
    expect(sms[0]?.body).toBe("A different message");

    const searched = await listOutboxMessages(db, { q: "123456" });
    expect(searched).toHaveLength(1);
    expect(searched[0]?.kind).toBe("otp");

    const all = await listOutboxMessages(db, {});
    expect(all).toHaveLength(2);
  });
});
