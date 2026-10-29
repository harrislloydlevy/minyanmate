import { and, eq, gte, inArray, sql } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { events, guests, rsvps, users } from "@minyanmate/db/schema";
import type * as schema from "@minyanmate/db/schema";
import { isPhoneLikeName, needsName } from "./display-name";

type Db = BetterSQLite3Database<typeof schema>;

export interface MergeGuestRsvpsInput {
  userId: string;
  /** Guest cookie token, if the visitor had one. */
  token?: string;
  /** Name chosen by the guest (cookie). */
  guestNameCookie?: string;
  currentName?: string;
  phoneNumber?: string;
  /** Local calendar date (YYYY-MM-DD). Injectable so tests are deterministic. */
  today?: string;
}

export interface MergeGuestRsvpsResult {
  merged: number;
}

/**
 * Converts a signed-in guest's upcoming RSVPs into normal `rsvps` rows.
 *
 * - Only events dated today or later are converted. Past guest rows stay in
 *   `guests` so historical attendance is not rewritten.
 * - Converted guest rows are removed; the RSVP now belongs to the account.
 * - Runs in a single transaction, including the placeholder-name fix-up.
 */
export function mergeGuestRsvpsInDb(
  database: Db,
  input: MergeGuestRsvpsInput,
): MergeGuestRsvpsResult {
  const today = input.today ?? new Date().toISOString().slice(0, 10);
  const token = input.token;

  return database.transaction((tx) => {
    const guestRows = token
      ? tx
          .select({
            eventId: guests.eventId,
            name: guests.name,
            status: guests.status,
          })
          .from(guests)
          .where(eq(guests.token, token))
          .all()
      : [];

    // New phone sign-ups start without a display name. If this visitor
    // previously RSVP'd as a guest, restore the name they used then instead of
    // sending them through the name prompt.
    const isPlaceholderName = needsName(input.currentName, input.phoneNumber);
    const guestNameFromRows = guestRows
      .map((row) => row.name.trim())
      .find((name) => name.length > 0 && !isPhoneLikeName(name));
    const preferredName = [input.guestNameCookie?.trim(), guestNameFromRows].find(
      (name) => name && !isPhoneLikeName(name),
    );

    if (isPlaceholderName && preferredName) {
      tx.update(users)
        .set({ name: preferredName, updatedAt: sql`(unixepoch())` })
        .where(eq(users.id, input.userId))
        .run();
    }

    const futureRows = token
      ? tx
          .select({ eventId: guests.eventId, status: guests.status })
          .from(guests)
          .innerJoin(events, eq(guests.eventId, events.id))
          .where(and(eq(guests.token, token), gte(events.date, today)))
          .all()
      : [];

    for (const row of futureRows) {
      tx.insert(rsvps)
        .values({
          eventId: row.eventId,
          userId: input.userId,
          status: row.status,
          source: "web",
        })
        .onConflictDoUpdate({
          target: [rsvps.eventId, rsvps.userId],
          set: { status: row.status, updatedAt: sql`(unixepoch())` },
        })
        .run();
    }

    if (token && futureRows.length > 0) {
      tx.delete(guests)
        .where(
          and(
            eq(guests.token, token),
            inArray(
              guests.eventId,
              futureRows.map((row) => row.eventId),
            ),
          ),
        )
        .run();
    }

    return { merged: futureRows.length };
  });
}
