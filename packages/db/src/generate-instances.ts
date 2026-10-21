import { and, eq, gte } from "drizzle-orm";
import type { drizzle } from "drizzle-orm/better-sqlite3";
import {
  DEFAULT_HORIZON_DAYS,
  occurrencesBetween,
  parseWeeklySchedule,
} from "@minyanmate/core";
import * as schema from "./schema";
import { events, minyans } from "./schema";

export interface GeneratedInstance {
  minyanId: string;
  date: string;
  startsAt: string;
}

type Db = ReturnType<typeof drizzle<typeof schema>>;
type Minyan = typeof minyans.$inferSelect;

/**
 * Materializes future instances of a minyan's weekly schedule as events rows.
 * Idempotent: dates that already have an event for this minyan are skipped.
 * Returns only the rows it inserted (or [] when nothing to do).
 */
export async function generateInstances(
  db: Db,
  minyan: Minyan,
  horizonDays = DEFAULT_HORIZON_DAYS,
  now = new Date(),
): Promise<GeneratedInstance[]> {
  const schedule = parseWeeklySchedule(minyan.schedule);
  if (!schedule) return [];

  const dates = occurrencesBetween(schedule, now, horizonDays);
  if (dates.length === 0) return [];

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const today = `${year}-${month}-${day}`;

  const existing = await db
    .select({ date: events.date })
    .from(events)
    .where(and(eq(events.minyanId, minyan.id), gte(events.date, today)));
  const existingDates = new Set(existing.map((row) => row.date));

  const missing = dates.filter((date) => !existingDates.has(date));
  if (missing.length === 0) return [];

  const inserted = await db
    .insert(events)
    .values(
      missing.map((date) => ({
        minyanId: minyan.id,
        title: minyan.name,
        date,
        startsAt: `${date}T${schedule.time}`,
        locationText: minyan.locationText,
        typeTag: "minyan" as const,
        quorumTarget: minyan.quorumTarget,
        ownerId: minyan.ownerId,
        serviceTag: minyan.serviceTag,
        status: "scheduled" as const,
      })),
    )
    .returning({
      minyanId: events.minyanId,
      date: events.date,
      startsAt: events.startsAt,
    });

  return inserted.map((row) => ({
    minyanId: row.minyanId ?? minyan.id,
    date: row.date,
    startsAt: row.startsAt,
  }));
}
