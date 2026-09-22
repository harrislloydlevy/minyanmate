/**
 * Pure helpers for "an organiser changed the event details" behaviour.
 *
 * Kept free of DB/IO so the rules are cheap to test and easy to reuse from
 * both the update server action and (later) the WhatsApp fan-out handler.
 */

/** How recent an edit must be to notify confirmed attendees. */
export const EDIT_NOTIFICATION_WINDOW_MS = 60 * 60 * 1000;

/** Fields an organiser may change after creation. */
export type EditableEventField =
  | "name"
  | "date"
  | "time"
  | "location"
  | "notes"
  | "typeTag";

/**
 * True when an edit happened recently enough to page the confirmed attendees.
 * An event that has never been edited (null/undefined `lastEditedAt`) is not
 * "recently edited".
 */
export function isWithinNotificationWindow(
  lastEditedAt: Date | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!lastEditedAt) return false;
  const editedAtMs = lastEditedAt.getTime();
  if (Number.isNaN(editedAtMs)) return false;
  const ageMs = now.getTime() - editedAtMs;
  // Guard against clock skew: a future timestamp is treated as "just now".
  if (ageMs < 0) return true;
  return ageMs <= EDIT_NOTIFICATION_WINDOW_MS;
}

/** Coarse, human-friendly age buckets used by the attendee "details updated" hint. */
export type RelativeAge = "just now" | "minutes" | "hours" | "days";

export function relativeAge(
  timestamp: Date | null | undefined,
  now: Date = new Date(),
): RelativeAge {
  if (!timestamp) return "just now";
  const ageMs = Math.max(0, now.getTime() - timestamp.getTime());
  const minutes = ageMs / 60_000;
  if (minutes < 1) return "just now";
  if (minutes < 60) return "minutes";
  if (minutes < 60 * 24) return "hours";
  return "days";
}
