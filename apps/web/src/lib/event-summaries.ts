import { and, asc, eq, gte, inArray, isNull, or } from "drizzle-orm";
import { events, rsvps } from "@minyanmate/db/schema";
import { db } from "@/lib/db";

export type EventSummary = {
  event: typeof events.$inferSelect;
  counts: { in: number; maybe: number; out: number };
  userRsvp: "in" | "out" | "maybe" | null;
};

type EventScope =
  | { kind: "group"; groupId: string }
  | { kind: "my"; groupIds: string[] };

/**
 * Loads upcoming events (date >= fromDate) in one query and collapses the
 * RSVP join rows into per-event counts. `userRsvp` is null when signed out.
 */
export async function getUpcomingEventSummaries(
  userId: string | null,
  fromDate: string,
  scope: EventScope,
): Promise<EventSummary[]> {
  const scopeFilter =
    scope.kind === "group"
      ? eq(events.groupId, scope.groupId)
      : scope.groupIds.length > 0
        ? or(isNull(events.groupId), inArray(events.groupId, scope.groupIds))
        : isNull(events.groupId);

  const rows = await db
    .select({
      event: events,
      rsvpStatus: rsvps.status,
      rsvpUserId: rsvps.userId,
    })
    .from(events)
    .leftJoin(rsvps, eq(rsvps.eventId, events.id))
    .where(and(gte(events.date, fromDate), scopeFilter))
    .orderBy(asc(events.date), asc(events.startsAt));

  const byId = new Map<string, EventSummary>();

  for (const row of rows) {
    let summary = byId.get(row.event.id);
    if (!summary) {
      summary = {
        event: row.event,
        counts: { in: 0, maybe: 0, out: 0 },
        userRsvp: null,
      };
      byId.set(row.event.id, summary);
    }

    if (row.rsvpStatus) {
      summary.counts[row.rsvpStatus as keyof EventSummary["counts"]]++;
      if (userId && row.rsvpUserId === userId) {
        summary.userRsvp = row.rsvpStatus;
      }
    }
  }

  return Array.from(byId.values());
}
