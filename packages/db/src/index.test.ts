import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { createMemoryDb, events, messages, minyans, rsvps, users } from "./index";

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
});
