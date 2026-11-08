import { minyans } from "./schema";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import type Database from "better-sqlite3";
import type * as schema from "./schema";
import { generateInstances } from "./generate-instances";

type Db = ReturnType<typeof drizzle<typeof schema>>;

/**
 * Seeds quorum-testing data into an already-open database.
 * Idempotent: removes previously seeded "Quorum Test ..." data first.
 */
export async function seedQuorumTestData(
  sqlite: Database.Database,
  db: Db,
): Promise<void> {
  // --- 2. Clean previous quorum-test data ---
  const oldEvents = sqlite
    .prepare("SELECT id FROM events WHERE title LIKE 'Quorum Test%'")
    .all() as { id: string }[];
  const oldIds = oldEvents.map((e) => e.id);
  if (oldIds.length > 0) {
    const ph = oldIds.map(() => "?").join(",");
    sqlite.prepare("DELETE FROM guests WHERE event_id IN (" + ph + ")").run(...oldIds);
    sqlite.prepare("DELETE FROM rsvps WHERE event_id IN (" + ph + ")").run(...oldIds);
    sqlite.prepare("DELETE FROM messages WHERE event_id IN (" + ph + ")").run(...oldIds);
    sqlite.prepare("DELETE FROM jobs WHERE payload LIKE '%quorum-test%'").run();
    sqlite.prepare("DELETE FROM events WHERE id IN (" + ph + ")").run(...oldIds);
  }
  const oldGroup = sqlite
    .prepare("SELECT id FROM groups WHERE slug = 'quorum-test'")
    .get() as { id: string } | undefined;
  if (oldGroup) {
    const oldMinyans = sqlite
      .prepare("SELECT id FROM minyans WHERE group_id = ?")
      .all(oldGroup.id) as { id: string }[];
    for (const m of oldMinyans) {
      sqlite.prepare("DELETE FROM minyans WHERE id = ?").run(m.id);
    }
    sqlite.prepare("DELETE FROM group_members WHERE group_id = ?").run(oldGroup.id);
    sqlite.prepare("DELETE FROM groups WHERE id = ?").run(oldGroup.id);
  }
  // Remove previously seeded test users so phone numbers stay in sync.
  sqlite.prepare("DELETE FROM users WHERE name LIKE 'Test User %'").run();
  console.log("[seed-quorum] cleaned previous test data");

  // --- 1. Ensure enough registered test users (12 total) ---
  const existingUsers = sqlite
    .prepare("SELECT id, name, phone_number FROM users ORDER BY created_at")
    .all() as { id: string; name: string; phone_number: string | null }[];

  const needed = 12 - existingUsers.length;
  const createdIds: string[] = [];
  for (let i = 0; i < needed; i++) {
    const id = crypto.randomUUID();
    const phone = "+" + (100 + i);
    sqlite
      .prepare(
        "INSERT INTO users (id, name, email, email_verified, phone_number, phone_number_verified) VALUES (?, ?, ?, ?, ?, ?)",
      )
      .run(id, "Test User " + (i + 1), "test" + (i + 1) + "@example.com", 1, phone, 1);
    createdIds.push(id);
  }
  const allUsers = sqlite
    .prepare("SELECT id, name, phone_number FROM users ORDER BY created_at")
    .all() as { id: string; name: string; phone_number: string | null }[];

  const testUserIds = allUsers.slice(0, 12).map((u) => u.id);
  console.log("[seed-quorum] " + allUsers.length + " users available (" + createdIds.length + " created)");

  const ownerId = testUserIds[0];
  const groupId = crypto.randomUUID();
  sqlite
    .prepare(
      "INSERT INTO groups (id, name, slug, type_tag, default_location, description, owner_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
    )
    .run(groupId, "Quorum Test Group", "quorum-test", "minyan", "Test Shul, 1 Test St", "Group for quorum testing", ownerId);

  for (const uid of testUserIds) {
    if (uid === ownerId) continue;
    sqlite
      .prepare("INSERT INTO group_members (id, group_id, user_id, role, notify_quorum) VALUES (?, ?, ?, ?, ?)")
      .run(crypto.randomUUID(), groupId, uid, "member", uid === testUserIds[1] ? 0 : 1);
  }
  sqlite
    .prepare("INSERT INTO group_members (id, group_id, user_id, role, notify_quorum) VALUES (?, ?, ?, ?, ?)")
    .run(crypto.randomUUID(), groupId, ownerId, "organiser", 1);

  const minyanId = crypto.randomUUID();
  sqlite
    .prepare(
      "INSERT INTO minyans (id, group_id, name, description, location_text, schedule, quorum_target, owner_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .run(
      minyanId,
      groupId,
      "Quorum Test Minyan",
      "Recurring minyan for quorum testing",
      "Test Shul, 1 Test St",
      JSON.stringify({ weekdays: [0, 1, 2, 3, 4, 5, 6], time: "07:00" }),
      10,
      ownerId,
    );

  const [seedMinyan] = await db.select().from(minyans).where(eq(minyans.id, minyanId));
  if (seedMinyan) await generateInstances(db, seedMinyan, 3);
  console.log("[seed-quorum] recurring minyan created (next 3 days)");

  const regularEvents = sqlite
    .prepare("SELECT id, date FROM events WHERE minyan_id = ? ORDER BY date")
    .all(minyanId) as { id: string; date: string }[];

  const fmt = (d: Date) => d.toISOString().split("T")[0];
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);

  const oneOffSpecs: { title: string; date: Date; notes: string }[] = [
    { title: "Quorum Test - 0/10 (empty)", date: today, notes: "No RSVPs yet" },
    { title: "Quorum Test - 8/10 (below)", date: today, notes: "8 confirmed - add 2 more to reach minyan" },
    { title: "Quorum Test - 9/10 (just below)", date: today, notes: "9 confirmed - one more reaches minyan" },
    { title: "Quorum Test - 10/10 (at quorum)", date: tomorrow, notes: "Exactly at quorum, not yet notified" },
    { title: "Quorum Test - 11/10 (over, mixed guests)", date: tomorrow, notes: "11 confirmed including guests" },
    { title: "Quorum Test - 12/10 (over, with maybe)", date: nextWeek, notes: "10 confirmed + 2 maybe" },
    { title: "Quorum Test - 5/10 (way below)", date: nextWeek, notes: "Only 5 confirmed" },
    { title: "Quorum Test - past confirmed", date: new Date(today.getTime() - 2 * 86400000), notes: "Past event, already confirmed" },
  ];

  const oneOffIds: string[] = [];
  for (const spec of oneOffSpecs) {
    const id = crypto.randomUUID();
    oneOffIds.push(id);
    sqlite
      .prepare(
        "INSERT INTO events (id, group_id, title, date, starts_at, location_text, notes, type_tag, status, quorum_target, owner_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      )
      .run(
        id,
        groupId,
        spec.title,
        fmt(spec.date),
        fmt(spec.date) + "T19:00",
        "Test Shul, 1 Test St",
        spec.notes,
        "minyan",
        spec.title.includes("past") ? "confirmed" : "scheduled",
        10,
        ownerId,
      );
  }
  console.log("[seed-quorum] " + oneOffIds.length + " one-off events created");

  const rsvpInsert = sqlite.prepare(
    "INSERT INTO rsvps (id, event_id, user_id, status) VALUES (?, ?, ?, ?)",
  );
  const guestInsert = sqlite.prepare(
    "INSERT INTO guests (id, event_id, name, status, token) VALUES (?, ?, ?, ?, ?)",
  );

  function addRegisteredIn(eventId: string, count: number, offset = 0) {
    for (let i = 0; i < count; i++) {
      const uid = testUserIds[(offset + i) % testUserIds.length];
      rsvpInsert.run(crypto.randomUUID(), eventId, uid, "in");
    }
  }
  function addGuests(eventId: string, count: number, status = "in", tokenPrefix = "guesttok") {
    for (let i = 0; i < count; i++) {
      guestInsert.run(
        crypto.randomUUID(),
        eventId,
        "Guest " + (i + 1),
        status,
        tokenPrefix + "-" + eventId.slice(0, 6) + "-" + i,
      );
    }
  }

  const byTitle = new Map(oneOffSpecs.map((s, i) => [s.title, oneOffIds[i]]));

  const e8 = byTitle.get("Quorum Test - 8/10 (below)")!;
  addRegisteredIn(e8, 7, 0);
  rsvpInsert.run(crypto.randomUUID(), e8, testUserIds[7], "maybe");
  rsvpInsert.run(crypto.randomUUID(), e8, testUserIds[8], "out");
  addGuests(e8, 1, "in", "g8");

  const e9 = byTitle.get("Quorum Test - 9/10 (just below)")!;
  addRegisteredIn(e9, 9, 0);

  const e10 = byTitle.get("Quorum Test - 10/10 (at quorum)")!;
  addRegisteredIn(e10, 10, 0);

  const e11 = byTitle.get("Quorum Test - 11/10 (over, mixed guests)")!;
  addRegisteredIn(e11, 6, 0);
  addGuests(e11, 5, "in", "g11");

  const e12 = byTitle.get("Quorum Test - 12/10 (over, with maybe)")!;
  addRegisteredIn(e12, 8, 0);
  addGuests(e12, 2, "in", "g12");
  rsvpInsert.run(crypto.randomUUID(), e12, testUserIds[8], "maybe");
  rsvpInsert.run(crypto.randomUUID(), e12, testUserIds[9], "maybe");

  const e5 = byTitle.get("Quorum Test - 5/10 (way below)")!;
  addRegisteredIn(e5, 5, 0);

  const epast = byTitle.get("Quorum Test - past confirmed")!;
  addRegisteredIn(epast, 8, 0);
  addGuests(epast, 4, "in", "gpast");
  sqlite
    .prepare("UPDATE events SET quorum_notified_at = (unixepoch()) WHERE id = ?")
    .run(epast);

  if (regularEvents.length >= 1) {
    addRegisteredIn(regularEvents[0]!.id, 9, 0);
  }
  if (regularEvents.length >= 2) {
    addRegisteredIn(regularEvents[1]!.id, 10, 0);
  }
  if (regularEvents.length >= 3) {
    addRegisteredIn(regularEvents[2]!.id, 3, 0);
    addGuests(regularEvents[2]!.id, 2, "in", "greg");
  }

  console.log("[seed-quorum] RSVPs + guests seeded");
}
