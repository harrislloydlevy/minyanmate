import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { createMemoryDb, events, guests, messages, minyans, rsvps, users } from "./index";

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
});
