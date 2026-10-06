/**
 * Seed script — populates the dev database with demo data.
 *
 * Usage:
 *   COREPACK_HOME=/tmp/corepack node /usr/local/lib/node_modules/corepack/dist/pnpm.js --filter @minyanmate/db tsx src/seed.ts
 */

import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createDb } from "./index";

const here = path.dirname(fileURLToPath(import.meta.url));
const migrationsFolder = path.join(here, "..", "drizzle");

const { db, sqlite } = createDb();

async function main() {
  migrate(db, { migrationsFolder });
  console.log("[seed] migrations applied");

  // Check if we already have data
  const existing = sqlite.prepare("SELECT COUNT(*) as c FROM users").get() as { c: number };
  if (existing.c > 0) {
    console.log("[seed] data already exists, skipping");
    return;
  }

  // Seed users
  sqlite
    .prepare(
      "INSERT INTO users (id, name, email, email_verified, phone_number, phone_number_verified) VALUES (?, ?, ?, ?, ?, ?)",
    )
    .run(
      crypto.randomUUID(), "Mordi", "mordi@example.com", 1, "+61400000001", 1,
    );
  const mordiId = (
    sqlite.prepare("SELECT id FROM users WHERE phone_number = ?").get("+61400000001") as { id: string }
  ).id;

  sqlite
    .prepare(
      "INSERT INTO users (id, name, email, email_verified, phone_number, phone_number_verified) VALUES (?, ?, ?, ?, ?, ?)",
    )
    .run(
      crypto.randomUUID(), "Rivka", "rivka@example.com", 1, "+61400000002", 1,
    );
  const rivkaId = (
    sqlite.prepare("SELECT id FROM users WHERE phone_number = ?").get("+61400000002") as { id: string }
  ).id;

  sqlite
    .prepare(
      "INSERT INTO users (id, name, email, email_verified, phone_number, phone_number_verified) VALUES (?, ?, ?, ?, ?, ?)",
    )
    .run(
      crypto.randomUUID(), "Yossi", "yossi@example.com", 1, "+61400000003", 1,
    );
  const yossiId = (
    sqlite.prepare("SELECT id FROM users WHERE phone_number = ?").get("+61400000003") as { id: string }
  ).id;

  sqlite
    .prepare(
      "INSERT INTO users (id, name, email, email_verified, phone_number, phone_number_verified) VALUES (?, ?, ?, ?, ?, ?)",
    )
    .run(
      crypto.randomUUID(), "Golda", "golda@example.com", 1, "+61400000004", 1,
    );
  const goldaId = (
    sqlite.prepare("SELECT id FROM users WHERE phone_number = ?").get("+61400000004") as { id: string }
  ).id;

  console.log("[seed] users created: Mordi, Rivka, Yossi, Golda");

  // Seed a minyan
  const minyanId = crypto.randomUUID();
  sqlite
    .prepare(
      "INSERT INTO minyans (id, name, description, location_text, schedule, quorum_target, owner_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
    )
    .run(
      minyanId,
      "Shacharis at the shul",
      "Weekday morning minyan at Central Shul",
      "Central Shul, 42 Main St",
      JSON.stringify({ weekdays: [0, 1, 2, 3, 4, 5, 6], time: "06:30" }),
      10,
      mordiId,
    );

  console.log("[seed] minyan created: Shacharis at the shul");

  // Seed events
  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const nextWeek = new Date(now);
  nextWeek.setDate(nextWeek.getDate() + 7);

  const fmt = (d: Date) => d.toISOString().split("T")[0];

  const eventTodayId = crypto.randomUUID();
  const eventTomorrowId = crypto.randomUUID();
  const eventNextWeekId = crypto.randomUUID();
  const eventYesterdayId = crypto.randomUUID();

  sqlite
    .prepare(
      "INSERT INTO events (id, minyan_id, date, starts_at, location_text, status, quorum_target, owner_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .run(
      eventTodayId, minyanId, today, `${today}T06:30`, "Central Shul, 42 Main St", "scheduled", 10, mordiId,
    );

  sqlite
    .prepare(
      "INSERT INTO events (id, date, starts_at, location_text, notes, type_tag, status, quorum_target, owner_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .run(
      eventTomorrowId, fmt(tomorrow), `${fmt(tomorrow)}T18:00`, "123 Oak Ave", "Bring a siddur", "minyan", "scheduled", 10, mordiId,
    );

  sqlite
    .prepare(
      "INSERT INTO events (id, date, starts_at, location_text, notes, type_tag, status, quorum_target, owner_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .run(
      eventNextWeekId, fmt(nextWeek), `${fmt(nextWeek)}T19:30`, "Community Centre", "Pickup basketball — bring sneakers", "pickup", "scheduled", 8, rivkaId,
    );

  sqlite
    .prepare(
      "INSERT INTO events (id, date, starts_at, location_text, type_tag, status, quorum_target, owner_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .run(
      eventYesterdayId, fmt(yesterday), `${fmt(yesterday)}T07:00`, "Central Shul, 42 Main St", "minyan", "confirmed", 10, mordiId,
    );

  console.log("[seed] events created: today, tomorrow, next week pickup, yesterday");

  // Seed RSVPs
  const rsvpInsert = sqlite.prepare(
    "INSERT INTO rsvps (id, event_id, user_id, status) VALUES (?, ?, ?, ?)",
  );

  rsvpInsert.run(crypto.randomUUID(), eventTodayId, mordiId, "in");
  rsvpInsert.run(crypto.randomUUID(), eventTodayId, rivkaId, "in");
  rsvpInsert.run(crypto.randomUUID(), eventTodayId, yossiId, "maybe");
  rsvpInsert.run(crypto.randomUUID(), eventTomorrowId, mordiId, "in");
  rsvpInsert.run(crypto.randomUUID(), eventTomorrowId, goldaId, "out");
  rsvpInsert.run(crypto.randomUUID(), eventTomorrowId, rivkaId, "in");
  rsvpInsert.run(crypto.randomUUID(), eventNextWeekId, rivkaId, "in");
  rsvpInsert.run(crypto.randomUUID(), eventNextWeekId, yossiId, "in");
  rsvpInsert.run(crypto.randomUUID(), eventNextWeekId, goldaId, "maybe");
  rsvpInsert.run(crypto.randomUUID(), eventYesterdayId, mordiId, "in");
  rsvpInsert.run(crypto.randomUUID(), eventYesterdayId, rivkaId, "in");
  rsvpInsert.run(crypto.randomUUID(), eventYesterdayId, yossiId, "out");
  rsvpInsert.run(crypto.randomUUID(), eventYesterdayId, goldaId, "in");

  console.log("[seed] rsvps created: 13 entries across 4 events");

  console.log("\n[seed] ✅ Done! You can now log in with any of these phone numbers:");
  console.log("       +61400000001 (Mordi)");
  console.log("       +61400000002 (Rivka)");
  console.log("       +61400000003 (Yossi)");
  console.log("       +61400000004 (Golda)");
  console.log("   Note: the app uses Better Auth with phone OTP — you'll need the");
  console.log("   WhatsApp credentials configured for OTP delivery, or set up email login.");
}

main()
  .catch(console.error)
  .finally(() => sqlite.close());
