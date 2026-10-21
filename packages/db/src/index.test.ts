import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { createMemoryDb, events, generateInstances, groupMembers, groups, guests, messages, minyans, rsvps, users } from "./index";

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
    .values({ name })
    .returning();
  if (!user) throw new Error("user insert failed");
  return user;
}

function expectGroupHasNullableFields(group: unknown) {
  expect(group).toMatchObject({
    description: null,
    defaultLocation: null,
  });
}

describe("schema", () => {
  it("enforces one rsvp per user per event", async () => {
    const db = migratedDb();
    const user = await seedUser(db, "Mordy");
    const [minyan] = await db
      .insert(minyans)
      .values({ name: "Shacharis", schedule: '{"weekdays":[0],"time":"06:30"}', ownerId: user.id })
      .returning();
    const [event] = await db
      .insert(events)
      .values({ minyanId: minyan!.id, date: "2026-09-06", startsAt: "2026-09-06T06:30", ownerId: user.id })
      .returning();

    await db.insert(rsvps).values({ eventId: event!.id, userId: user.id, status: "in" });
    await expect(
      db.insert(rsvps).values({ eventId: event!.id, userId: user.id, status: "out" }),
    ).rejects.toThrow();
  });

  it("dedupes messages by dedupe key", async () => {
    const db = migratedDb();
    const user = await seedUser(db, "Mordy");
    const values = { userId: user.id, kind: "quorum_reached" as const, dedupeKey: "quorum_reached:e1" };

    await db.insert(messages).values(values);
    await expect(db.insert(messages).values(values)).rejects.toThrow();
  });

  it("allows multiple messages without a dedupe key", async () => {
    const db = migratedDb();
    const user = await seedUser(db, "Mordy");
    const base = { userId: user.id, kind: "custom" as const };

    await db.insert(messages).values([{ ...base, payload: "one" }, { ...base, payload: "two" }]);
    expect(await db.select().from(messages)).toHaveLength(2);
  });

  it("allows a one-off event without a minyan reference", async () => {
    const db = migratedDb();
    const user = await seedUser(db, "Mordy");
    const [event] = await db
      .insert(events)
      .values({
        minyanId: null,
        title: "Shacharis at the shul",
        date: "2026-10-01",
        startsAt: "2026-10-01T18:30",
        locationText: "123 Main St",
        notes: "Bring a siddur",
        typeTag: "minyan",
        ownerId: user.id,
      })
      .returning();
    expect(event).toBeDefined();
    expect(event.minyanId).toBeNull();
    expect(event.title).toBe("Shacharis at the shul");
    expect(event.locationText).toBe("123 Main St");
    expect(event.notes).toBe("Bring a siddur");
    expect(event.typeTag).toBe("minyan");
  });

  it("cascades event deletion to rsvps", async () => {
    const db = migratedDb();
    const user = await seedUser(db, "Mordy");
    const [minyan] = await db
      .insert(minyans)
      .values({ name: "Shacharis", schedule: '{"weekdays":[0],"time":"06:30"}', ownerId: user.id })
      .returning();
    const [event] = await db
      .insert(events)
      .values({ minyanId: minyan!.id, date: "2026-09-06", startsAt: "2026-09-06T06:30", ownerId: user.id })
      .returning();
    await db.insert(rsvps).values({ eventId: event!.id, userId: user.id, status: "in" });

    await db.delete(events);
    expect(await db.select().from(rsvps)).toHaveLength(0);
  });

  it("allows setting lastEditedAt on an event", async () => {
    const db = migratedDb();
    const user = await seedUser(db, "Golda");
    // SQLite stores timestamps as integer seconds, so round to whole seconds
    const now = new Date(Math.floor(Date.now() / 1000) * 1000);

    const [event] = await db
      .insert(events)
      .values({
        minyanId: null,
        date: "2026-10-15",
        startsAt: "2026-10-15T09:00",
        locationText: "Shul",
        ownerId: user.id,
        lastEditedAt: now,
      })
      .returning();

    expect(event).toBeDefined();
    expect(event.lastEditedAt).toBeInstanceOf(Date);
    expect(event.lastEditedAt!.getTime()).toBe(now.getTime());
  });


  it("enforces one guest rsvp per event per token", async () => {
    const db = migratedDb();
    const user = await seedUser(db, "Mordy");
    const [event] = await db
      .insert(events)
      .values({ date: "2026-10-15", startsAt: "2026-10-15T09:00", locationText: "Shul", ownerId: user.id })
      .returning();

    await db.insert(guests).values({ eventId: event!.id, name: "Guest A", status: "in", token: "tok-1" });
    await expect(
      db.insert(guests).values({ eventId: event!.id, name: "Guest A again", status: "out", token: "tok-1" }),
    ).rejects.toThrow();
  });

  it("allows multiple guests for the same event with different tokens", async () => {
    const db = migratedDb();
    const user = await seedUser(db, "Mordy");
    const [event] = await db
      .insert(events)
      .values({ date: "2026-10-15", startsAt: "2026-10-15T09:00", locationText: "Shul", ownerId: user.id })
      .returning();

    await db.insert(guests).values([
      { eventId: event!.id, name: "Guest A", status: "in", token: "tok-a" },
      { eventId: event!.id, name: "Guest B", status: "maybe", token: "tok-b" },
      { eventId: event!.id, name: "Guest C", status: "out", token: "tok-c" },
    ]);

    const rows = await db.select().from(guests).where(eq(guests.eventId, event!.id));
    expect(rows).toHaveLength(3);
    expect(rows.filter((r) => r.status === "in")).toHaveLength(1);
    expect(rows.filter((r) => r.status === "maybe")).toHaveLength(1);
    expect(rows.filter((r) => r.status === "out")).toHaveLength(1);
  });

  it("cascades event deletion to guests", async () => {
    const db = migratedDb();
    const user = await seedUser(db, "Mordy");
    const [event] = await db
      .insert(events)
      .values({ date: "2026-10-15", startsAt: "2026-10-15T09:00", locationText: "Shul", ownerId: user.id })
      .returning();
    await db.insert(guests).values({ eventId: event!.id, name: "Guest", status: "in", token: "tok-1" });

    await db.delete(events);
    expect(await db.select().from(guests)).toHaveLength(0);
  });

  it("allows same guest token across different events", async () => {
    const db = migratedDb();
    const user = await seedUser(db, "Mordy");
    const [e1] = await db.insert(events).values({ date: "2026-10-15", startsAt: "2026-10-15T09:00", locationText: "Shul A", ownerId: user.id }).returning();
    const [e2] = await db.insert(events).values({ date: "2026-10-16", startsAt: "2026-10-16T09:00", locationText: "Shul B", ownerId: user.id }).returning();

    await db.insert(guests).values({ eventId: e1!.id, name: "Guest", status: "in", token: "tok-same" });
    await db.insert(guests).values({ eventId: e2!.id, name: "Guest", status: "maybe", token: "tok-same" });

    expect(await db.select().from(guests)).toHaveLength(2);
  });

  it("update sets lastEditedAt", async () => {
    const db = migratedDb();
    const user = await seedUser(db, "Yossi");
    const [event] = await db
      .insert(events)
      .values({ date: "2026-10-15", startsAt: "2026-10-15T09:00", locationText: "Old shul", ownerId: user.id })
      .returning();

    expect(event.lastEditedAt).toBeNull();

    const updatedAt = new Date(2026, 9, 15, 10, 0);
    await db
      .update(events)
      .set({ locationText: "New shul", lastEditedAt: updatedAt })
      .where(eq(events.id, event.id));

    const [refetched] = await db.select().from(events).where(eq(events.id, event.id)).limit(1);
    expect(refetched!.locationText).toBe("New shul");
    expect(refetched!.lastEditedAt).toBeInstanceOf(Date);
    expect(refetched!.lastEditedAt!.getTime()).toBe(updatedAt.getTime());
  });

  describe("groups", () => {
    it("inserts a group with all fields", async () => {
      const db = migratedDb();
      const user = await seedUser(db, "Mordy");
      const [group] = await db
        .insert(groups)
        .values({
          name: "Shul on Main",
          slug: "shul-on-main",
          typeTag: "minyan",
          defaultLocation: "123 Main St",
          description: "The main shul",
          ownerId: user.id,
        })
        .returning();
      expect(group).toBeDefined();
      expect(group.name).toBe("Shul on Main");
      expect(group.slug).toBe("shul-on-main");
      expect(group.typeTag).toBe("minyan");
    });

    it("links a one-off event to a group", async () => {
      const db = migratedDb();
      const user = await seedUser(db, "Mordy");
      const [group] = await db
        .insert(groups)
        .values({
          name: "Shul on Main",
          slug: "shul-on-main",
          typeTag: "minyan",
          ownerId: user.id,
        })
        .returning();
      const [event] = await db
        .insert(events)
        .values({
          title: "Shacharis",
          groupId: group!.id,
          date: "2026-10-22",
          startsAt: "2026-10-22T07:00",
          ownerId: user.id,
        })
        .returning();
      expect(event.groupId).toBe(group!.id);
      expect(event.minyanId).toBeNull();
    });

    it("rejects duplicate slug", async () => {
      const db = migratedDb();
      const user = await seedUser(db, "Mordy");
      await db.insert(groups).values({
        name: "First Group",
        slug: "first-group",
        typeTag: "minyan",
        ownerId: user.id,
      });
      await expect(
        db.insert(groups).values({
          name: "Second Group",
          slug: "first-group",
          typeTag: "pickup",
          ownerId: user.id,
        }),
      ).rejects.toThrow();
    });

    it("cascades delete when owner user is deleted", async () => {
      const db = migratedDb();
      const user = await seedUser(db, "Mordy");
      await db.insert(groups).values({
        name: "Owner Group",
        slug: "owner-group",
        typeTag: "minyan",
        ownerId: user.id,
      });
      await db.delete(users).where(eq(users.id, user.id));
      const [group] = await db.select().from(groups).where(eq(groups.slug, "owner-group"));
      expect(group).toBeUndefined();
    });

    it("allows nullable description and defaultLocation", async () => {
      const db = migratedDb();
      const user = await seedUser(db, "Mordy");
      const [group] = await db
        .insert(groups)
        .values({
          name: "Bare Bones Group",
          slug: "bare-bones-group",
          typeTag: "pickup",
          ownerId: user.id,
        })
        .returning();
      expectGroupHasNullableFields(group);
    });
  });

  describe("groupMembers", () => {
    async function seedGroup(db: ReturnType<typeof migratedDb>, ownerId: string) {
      const [group] = await db
        .insert(groups)
        .values({
          name: "Members Group",
          slug: `members-group-${Math.random().toString(36).slice(2, 8)}`,
          typeTag: "minyan",
          ownerId,
        })
        .returning();
      if (!group) throw new Error("group insert failed");
      return group;
    }

    it("inserts a member and defaults role to member", async () => {
      const db = migratedDb();
      const owner = await seedUser(db, "Mordy");
      const member = await seedUser(db, "Golda");
      const group = await seedGroup(db, owner.id);

      const [row] = await db
        .insert(groupMembers)
        .values({ groupId: group.id, userId: member.id })
        .returning();

      expect(row).toBeDefined();
      expect(row.role).toBe("member");
    });

    it("rejects the same user twice in the same group", async () => {
      const db = migratedDb();
      const owner = await seedUser(db, "Mordy");
      const member = await seedUser(db, "Golda");
      const group = await seedGroup(db, owner.id);

      await db.insert(groupMembers).values({ groupId: group.id, userId: member.id });
      await expect(
        db.insert(groupMembers).values({ groupId: group.id, userId: member.id }),
      ).rejects.toThrow();
    });

    it("cascades delete when the group is deleted", async () => {
      const db = migratedDb();
      const owner = await seedUser(db, "Mordy");
      const member = await seedUser(db, "Golda");
      const group = await seedGroup(db, owner.id);
      await db.insert(groupMembers).values({ groupId: group.id, userId: member.id });

      await db.delete(groups).where(eq(groups.id, group.id));
      expect(await db.select().from(groupMembers)).toHaveLength(0);
    });

    it("cascades delete when the user is deleted", async () => {
      const db = migratedDb();
      const owner = await seedUser(db, "Mordy");
      const member = await seedUser(db, "Golda");
      const group = await seedGroup(db, owner.id);
      await db.insert(groupMembers).values({ groupId: group.id, userId: member.id });

      await db.delete(users).where(eq(users.id, member.id));
      expect(await db.select().from(groupMembers)).toHaveLength(0);
    });
  });
});

describe("generateInstances", () => {
  async function seedMinyan(
    db: ReturnType<typeof migratedDb>,
    ownerId: string,
    overrides: Partial<typeof minyans.$inferInsert> = {},
  ) {
    const [minyan] = await db
      .insert(minyans)
      .values({
        name: "Shacharis",
        schedule: '{"weekdays":[3],"time":"07:00"}',
        serviceTag: "shacharit",
        locationText: "Shul on Main",
        quorumTarget: 10,
        ownerId,
        ...overrides,
      })
      .returning();
    if (!minyan) throw new Error("minyan insert failed");
    return minyan;
  }

  it("creates instances for each weekday within the horizon", async () => {
    const db = migratedDb();
    const user = await seedUser(db, "Mordy");
    const minyan = await seedMinyan(db, user.id);
    const now = new Date(2026, 8, 6); // Sunday Sept 6 2026

    const created = await generateInstances(db, minyan, 28, now);

    expect(created.map((i) => i.date)).toEqual([
      "2026-09-09",
      "2026-09-16",
      "2026-09-23",
      "2026-09-30",
    ]);
    for (const instance of created) {
      expect(instance.minyanId).toBe(minyan.id);
      expect(instance.startsAt).toBe(`${instance.date}T07:00`);
    }

    const rows = await db.select().from(events).where(eq(events.minyanId, minyan.id));
    expect(rows).toHaveLength(4);
    for (const row of rows) {
      expect(row.minyanId).toBe(minyan.id);
      expect(row.title).toBe("Shacharis");
      expect(row.serviceTag).toBe("shacharit");
      expect(row.locationText).toBe("Shul on Main");
      expect(row.quorumTarget).toBe(10);
      expect(row.ownerId).toBe(user.id);
      expect(row.typeTag).toBe("minyan");
      expect(row.status).toBe("scheduled");
    }
  });

  it("is idempotent: a second call inserts nothing", async () => {
    const db = migratedDb();
    const user = await seedUser(db, "Mordy");
    const minyan = await seedMinyan(db, user.id);
    const now = new Date(2026, 8, 6);

    const first = await generateInstances(db, minyan, 28, now);
    expect(first.length).toBeGreaterThan(0);

    const second = await generateInstances(db, minyan, 28, now);
    expect(second).toEqual([]);
    expect(
      await db.select().from(events).where(eq(events.minyanId, minyan.id)),
    ).toHaveLength(first.length);
  });

  it("leaves one-off events (minyanId null) untouched", async () => {
    const db = migratedDb();
    const user = await seedUser(db, "Mordy");
    const minyan = await seedMinyan(db, user.id);
    await db.insert(events).values({
      minyanId: null,
      date: "2026-09-09", // same date the minyan also generates
      startsAt: "2026-09-09T19:00",
      ownerId: user.id,
    });
    const now = new Date(2026, 8, 6);

    const created = await generateInstances(db, minyan, 28, now);

    expect(created.map((i) => i.date)).toContain("2026-09-09");
    const rows = await db.select().from(events);
    expect(rows.filter((r) => r.minyanId === null)).toHaveLength(1);
    expect(rows.filter((r) => r.minyanId === minyan.id)).toHaveLength(4);
  });

  it("returns nothing when the schedule is invalid", async () => {
    const db = migratedDb();
    const user = await seedUser(db, "Mordy");
    const minyan = await seedMinyan(db, user.id, { schedule: "not json" });

    expect(await generateInstances(db, minyan, 28, new Date(2026, 8, 6))).toEqual([]);
  });
});
