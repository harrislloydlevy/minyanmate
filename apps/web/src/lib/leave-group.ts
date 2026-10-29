import { and, eq, gte, inArray, or, sql } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import {
  events,
  groupMembers,
  groups,
  minyans,
  rsvps,
} from "@minyanmate/db/schema";
import type * as schema from "@minyanmate/db/schema";

type Db = BetterSQLite3Database<typeof schema>;

export type LeaveGroupResult = { ok: true } | { ok: false; error: string };

export interface LeaveGroupInput {
  groupId: string;
  userId: string;
  /** Only used by the legacy sole-organiser flow. */
  newOrganiserUserId?: string;
  /** Local calendar date (YYYY-MM-DD). Injectable so tests are deterministic. */
  today?: string;
}

/**
 * Applies the leave-group mutation without touching auth or cookies so it can
 * be exercised from tests.
 *
 * Rules:
 * - The owner can never leave. Ownership transfer is not part of this action.
 * - The owner always counts as an organiser, so a member who is the only
 *   `groupMembers` organiser is not actually the last organiser.
 * - Future RSVPs are withdrawn by setting `status = "out"` (not deleted);
 *   past attendance is left untouched.
 * - Everything runs in one transaction.
 */
export function leaveGroupInDb(
  database: Db,
  input: LeaveGroupInput,
): LeaveGroupResult {
  const today = input.today ?? new Date().toISOString().slice(0, 10);

  return database.transaction((tx) => {
    const group = tx
      .select({ ownerId: groups.ownerId })
      .from(groups)
      .where(eq(groups.id, input.groupId))
      .get();
    if (!group) return { ok: false, error: "Group not found." };

    if (group.ownerId === input.userId) {
      return {
        ok: false,
        error: "The group owner cannot leave the group.",
      };
    }

    const membership = tx
      .select({ role: groupMembers.role })
      .from(groupMembers)
      .where(
        and(
          eq(groupMembers.groupId, input.groupId),
          eq(groupMembers.userId, input.userId),
        ),
      )
      .get();
    if (!membership) {
      return { ok: false, error: "You are not a member of this group." };
    }

    // The owner is always an organiser even though they have no membership row.
    const organiserIds = tx
      .select({ userId: groupMembers.userId })
      .from(groupMembers)
      .where(
        and(
          eq(groupMembers.groupId, input.groupId),
          eq(groupMembers.role, "organiser"),
        ),
      )
      .all()
      .map((row) => row.userId);
    organiserIds.push(group.ownerId);

    const otherOrganisers = organiserIds.filter((id) => id !== input.userId);
    const isSoleOrganiser =
      membership.role === "organiser" && otherOrganisers.length === 0;

    if (isSoleOrganiser) {
      const replacementId = input.newOrganiserUserId;
      if (!replacementId || replacementId === input.userId) {
        return {
          ok: false,
          error:
            "You are the sole organiser. Assign a new organiser before leaving.",
        };
      }
      const replacement = tx
        .select({ id: groupMembers.id })
        .from(groupMembers)
        .where(
          and(
            eq(groupMembers.groupId, input.groupId),
            eq(groupMembers.userId, replacementId),
          ),
        )
        .get();
      if (!replacement) {
        return { ok: false, error: "That member is not in this group." };
      }
      tx.update(groupMembers)
        .set({ role: "organiser", updatedAt: sql`(unixepoch())` })
        .where(
          and(
            eq(groupMembers.groupId, input.groupId),
            eq(groupMembers.userId, replacementId),
          ),
        )
        .run();
    }

    const removed = tx
      .delete(groupMembers)
      .where(
        and(
          eq(groupMembers.groupId, input.groupId),
          eq(groupMembers.userId, input.userId),
        ),
      )
      .returning({ id: groupMembers.id })
      .all();
    if (removed.length === 0) {
      return { ok: false, error: "You are not a member of this group." };
    }

    const minyanIds = tx
      .select({ id: minyans.id })
      .from(minyans)
      .where(eq(minyans.groupId, input.groupId))
      .all()
      .map((row) => row.id);

    const associationFilter =
      minyanIds.length > 0
        ? or(
            eq(events.groupId, input.groupId),
            inArray(events.minyanId, minyanIds),
          )
        : eq(events.groupId, input.groupId);

    const futureEventIds = tx
      .select({ id: events.id })
      .from(events)
      .where(and(gte(events.date, today), associationFilter))
      .all()
      .map((row) => row.id);

    if (futureEventIds.length > 0) {
      tx.update(rsvps)
        .set({ status: "out", updatedAt: sql`(unixepoch())` })
        .where(
          and(
            eq(rsvps.userId, input.userId),
            inArray(rsvps.eventId, futureEventIds),
          ),
        )
        .run();
    }

    return { ok: true };
  });
}
