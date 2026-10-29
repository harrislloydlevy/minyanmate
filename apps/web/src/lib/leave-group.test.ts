import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { and, eq } from "drizzle-orm";
import {
  createMemoryDb,
  events,
  groupMembers,
  groups,
  guests,
  rsvps,
  users,
} from "@minyanmate/db";
import { leaveGroupInDb } from "./leave-group";
import { mergeGuestRsvpsInDb } from "./merge-guest-rsvps";

const migrationsFolder = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
  "..",
  "packages",
  "db",
  "drizzle",
);

const TODAY = "2026-10-29";

function migratedDb() {
  const handle = createMemoryDb();
  migrate(handle.db, { migrationsFolder });
  return handle.db;
}

type Db = ReturnType<typeof migratedDb>;

async function seedUser(db: Db, name: string, phoneNumber?: string) {
  const [user] = await db
    .insert(users)
    .values({ name, phoneNumber })
    .returning();
  if (!user) throw new Error("user insert failed");
  return user;
}

async function seedGroup(db: Db, ownerId: string) {
  const [group] = await db
    .insert(groups)
    .values({
      name: "Test Minyan",
      slug: "test-minyan",
      typeTag: "minyan",
      ownerId,
    })
    .returning();
  if (!group) throw new Error("group insert failed");
  return group;
}

async function seedEvent(
  db: Db,
  ownerId: string,
  date: string,
  groupId?: string,
) {
  const [event] = await db
    .insert(events)
    .values({
      date,
      startsAt: `${date}T19:00`,
      ownerId,
      groupId,
    })
    .returning();
  if (!event) throw new Error("event insert failed");
  return event;
}

describe("leaveGroupInDb", () => {
  it("blocks the owner from leaving", async () => {
    const db = migratedDb();
    const owner = await seedUser(db, "Owner");
    const group = await seedGroup(db, owner.id);

    const result = leaveGroupInDb(db, {
      groupId: group.id,
      userId: owner.id,
      today: TODAY,
    });

    expect(result).toEqual({
      ok: false,
      error: "The group owner cannot leave the group.",
    });
  });

  it("withdraws only future RSVPs by setting status to out", async () => {
    const db = migratedDb();
    const owner = await seedUser(db, "Owner");
    const member = await seedUser(db, "Member");
    const other = await seedUser(db, "Other");
    const group = await seedGroup(db, owner.id);
    await db
      .insert(groupMembers)
      .values({ groupId: group.id, userId: member.id, role: "member" });

    const past = await seedEvent(db, owner.id, "2026-10-20", group.id);
    const today = await seedEvent(db, owner.id, TODAY, group.id);
    const future = await seedEvent(db, owner.id, "2026-11-05", group.id);
    const unrelated = await seedEvent(db, owner.id, "2026-11-05");

    await db.insert(rsvps).values([
      { eventId: past.id, userId: member.id, status: "in" },
      { eventId: today.id, userId: member.id, status: "maybe" },
      { eventId: future.id, userId: member.id, status: "in" },
      { eventId: unrelated.id, userId: member.id, status: "in" },
      { eventId: future.id, userId: other.id, status: "in" },
    ]);

    const result = leaveGroupInDb(db, {
      groupId: group.id,
      userId: member.id,
      today: TODAY,
    });

    expect(result).toEqual({ ok: true });

    const memberships = await db
      .select()
      .from(groupMembers)
      .where(
        and(
          eq(groupMembers.groupId, group.id),
          eq(groupMembers.userId, member.id),
        ),
      );
    expect(memberships).toHaveLength(0);

    const memberRsvps = await db
      .select()
      .from(rsvps)
      .where(eq(rsvps.userId, member.id));
    const byEvent = new Map(memberRsvps.map((row) => [row.eventId, row.status]));

    expect(byEvent.get(past.id)).toBe("in");
    expect(byEvent.get(today.id)).toBe("out");
    expect(byEvent.get(future.id)).toBe("out");
    expect(byEvent.get(unrelated.id)).toBe("in");
    expect(memberRsvps).toHaveLength(4);

    const [otherRsvp] = await db
      .select()
      .from(rsvps)
      .where(and(eq(rsvps.eventId, future.id), eq(rsvps.userId, other.id)));
    expect(otherRsvp?.status).toBe("in");
  });

  it("lets a non-owner organiser leave because the owner is still an organiser", async () => {
    const db = migratedDb();
    const owner = await seedUser(db, "Owner");
    const organiser = await seedUser(db, "Organiser");
    const group = await seedGroup(db, owner.id);
    await db
      .insert(groupMembers)
      .values({ groupId: group.id, userId: organiser.id, role: "organiser" });

    const result = leaveGroupInDb(db, {
      groupId: group.id,
      userId: organiser.id,
      today: TODAY,
    });

    expect(result).toEqual({ ok: true });
  });

  it("rejects a non-member", async () => {
    const db = migratedDb();
    const owner = await seedUser(db, "Owner");
    const outsider = await seedUser(db, "Outsider");
    const group = await seedGroup(db, owner.id);

    const result = leaveGroupInDb(db, {
      groupId: group.id,
      userId: outsider.id,
      today: TODAY,
    });

    expect(result).toEqual({
      ok: false,
      error: "You are not a member of this group.",
    });
  });
});

describe("mergeGuestRsvpsInDb", () => {
  it("converts future guest RSVPs and keeps past guest history", async () => {
    const db = migratedDb();
    const user = await seedUser(db, "5551234", "5551234");
    const owner = await seedUser(db, "Owner");
    const group = await seedGroup(db, owner.id);

    const past = await seedEvent(db, owner.id, "2026-10-01", group.id);
    const future = await seedEvent(db, owner.id, "2026-11-01", group.id);

    await db.insert(guests).values([
      { eventId: past.id, name: "Chaim", status: "in", token: "tok" },
      { eventId: future.id, name: "Chaim", status: "maybe", token: "tok" },
    ]);

    const result = mergeGuestRsvpsInDb(db, {
      userId: user.id,
      token: "tok",
      guestNameCookie: "Chaim",
      currentName: "5551234",
      phoneNumber: "5551234",
      today: TODAY,
    });

    expect(result.merged).toBe(1);

    const rsvpRows = await db
      .select()
      .from(rsvps)
      .where(eq(rsvps.userId, user.id));
    expect(rsvpRows).toHaveLength(1);
    expect(rsvpRows[0]).toMatchObject({
      eventId: future.id,
      status: "maybe",
    });

    const guestRows = await db.select().from(guests);
    expect(guestRows).toHaveLength(1);
    expect(guestRows[0]?.eventId).toBe(past.id);

    const [updatedUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, user.id));
    expect(updatedUser?.name).toBe("Chaim");
  });

  it("merges into an existing RSVP without creating a duplicate", async () => {
    const db = migratedDb();
    const user = await seedUser(db, "Member");
    const owner = await seedUser(db, "Owner");
    const group = await seedGroup(db, owner.id);
    const future = await seedEvent(db, owner.id, "2026-11-01", group.id);

    await db.insert(guests).values({
      eventId: future.id,
      name: "Member",
      status: "in",
      token: "tok",
    });
    await db.insert(rsvps).values({
      eventId: future.id,
      userId: user.id,
      status: "maybe",
    });

    mergeGuestRsvpsInDb(db, {
      userId: user.id,
      token: "tok",
      currentName: "Member",
      today: TODAY,
    });

    const rsvpRows = await db
      .select()
      .from(rsvps)
      .where(eq(rsvps.userId, user.id));
    expect(rsvpRows).toHaveLength(1);
    expect(rsvpRows[0]?.status).toBe("in");
  });
});
