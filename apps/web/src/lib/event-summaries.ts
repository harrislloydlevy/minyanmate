import { and, asc, eq, gte, inArray } from "drizzle-orm";
import { events, groupMembers, groups, rsvps } from "@minyanmate/db/schema";
import { db } from "@/lib/db";

export type EventSummary = {
  event: typeof events.$inferSelect;
  counts: { in: number; maybe: number; out: number };
  /** Group members (including the owner) with no RSVP row; null for one-off events. */
  notRsvpdCount: number | null;
  userRsvp: "in" | "out" | "maybe" | null;
};

type EventScope = { kind: "group"; groupId: string } | { kind: "rsvp"; userId: string };

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
      : inArray(
          events.id,
          db.select({ eventId: rsvps.eventId }).from(rsvps).where(eq(rsvps.userId, scope.userId)),
        );

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
  const respondersByEventId = new Map<string, Set<string>>();

  for (const row of rows) {
    let summary = byId.get(row.event.id);
    if (!summary) {
      summary = {
        event: row.event,
        counts: { in: 0, maybe: 0, out: 0 },
        notRsvpdCount: null,
        userRsvp: null,
      };
      byId.set(row.event.id, summary);
    }

    if (row.rsvpStatus && row.rsvpUserId) {
      summary.counts[row.rsvpStatus as keyof EventSummary["counts"]]++;

      let responders = respondersByEventId.get(row.event.id);
      if (!responders) {
        responders = new Set();
        respondersByEventId.set(row.event.id, responders);
      }
      responders.add(row.rsvpUserId);

      if (userId && row.rsvpUserId === userId) {
        summary.userRsvp = row.rsvpStatus;
      }
    }
  }

  const summaries = Array.from(byId.values());
  const groupIds = [
    ...new Set(
      summaries.flatMap((summary) => (summary.event.groupId ? [summary.event.groupId] : [])),
    ),
  ];

  if (groupIds.length > 0) {
    const [ownerRows, memberRows] = await Promise.all([
      db
        .select({ id: groups.id, ownerId: groups.ownerId })
        .from(groups)
        .where(inArray(groups.id, groupIds)),
      db
        .select({ groupId: groupMembers.groupId, userId: groupMembers.userId })
        .from(groupMembers)
        .where(inArray(groupMembers.groupId, groupIds)),
    ]);

    // The owner is an organiser even when there is no membership row.
    const memberIdsByGroupId = new Map<string, Set<string>>();
    for (const groupId of groupIds) {
      memberIdsByGroupId.set(groupId, new Set());
    }
    for (const owner of ownerRows) {
      memberIdsByGroupId.get(owner.id)?.add(owner.ownerId);
    }
    for (const member of memberRows) {
      memberIdsByGroupId.get(member.groupId)?.add(member.userId);
    }

    for (const summary of summaries) {
      if (!summary.event.groupId) continue;
      const memberIds = memberIdsByGroupId.get(summary.event.groupId);
      if (!memberIds) continue;
      const responders = respondersByEventId.get(summary.event.id);
      let notRsvpdCount = 0;
      for (const memberId of memberIds) {
        if (!responders?.has(memberId)) notRsvpdCount++;
      }
      summary.notRsvpdCount = notRsvpdCount;
    }
  }

  return summaries;
}
