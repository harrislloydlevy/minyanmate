import { and, eq, inArray } from "drizzle-orm";
import {
  defaultMessageChannel,
  defaultMessageDeliveryMode,
  eventPageUrl,
  quorumReachedDedupeKey,
  type MessageChannel,
  type MessageDeliveryMode,
  type MessageKind,
} from "@minyanmate/core";
import type { DbHandle } from "@minyanmate/db";
import { enqueueOutboxMessage } from "@minyanmate/db";
import {
  events,
  groupMembers,
  guests,
  rsvps,
  users,
} from "@minyanmate/db/schema";

type Db = DbHandle["db"];

export interface FanOutQuorumOptions {
  channel?: MessageChannel;
  /** `manual` records requests without enqueueing delivery jobs. */
  deliveryMode?: MessageDeliveryMode;
  /** Absolute base URL used for the deep link inside the message. */
  baseUrl?: string;
}

export interface FanOutResult {
  /** Messages recorded as queued (auto) or requested (manual). */
  enqueued: number;
  /** Attendees recorded as skipped (no phone number, opted out, ...). */
  skipped: number;
  /** Attendees already recorded by an earlier run. */
  duplicates: number;
}

function eventName(event: { title: string | null }): string {
  return event.title?.trim() || "Minyan";
}

function formatMessage(
  capacity: boolean,
  name: string,
  eventTime: string,
  location: string | null,
  confirmedCount: number,
  link: string,
): { subject: string; body: string } {
  const subject = capacity ? "Capacity reached" : "Quorum reached";
  const timeLine = location ? `${eventTime} · ${location}` : eventTime;
  return {
    subject,
    body: `${subject}: ${name}\n${timeLine}\n${confirmedCount} confirmed\n${link}`,
  };
}

/**
 * Resolve everyone who should hear that an event reached quorum/capacity and
 * write one outbox row per attendee.
 *
 * Idempotent: each attendee gets a dedupe key scoped to the event, so retrying
 * the job never spams anyone. Opt-outs and missing phone numbers are recorded
 * as `skipped` rows so the log explains why a person did not receive anything.
 */
export async function fanOutQuorumNotifications(
  db: Db,
  eventId: string,
  options: FanOutQuorumOptions = {},
): Promise<FanOutResult> {
  const [event] = await db
    .select()
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);
  if (!event) return { enqueued: 0, skipped: 0, duplicates: 0 };

  const rsvpRows = await db
    .select({
      userId: rsvps.userId,
      status: rsvps.status,
      name: users.name,
      phoneNumber: users.phoneNumber,
    })
    .from(rsvps)
    .innerJoin(users, eq(rsvps.userId, users.id))
    .where(and(eq(rsvps.eventId, eventId), inArray(rsvps.status, ["in", "maybe"])));

  const guestRows = await db
    .select({ id: guests.id, status: guests.status })
    .from(guests)
    .where(eq(guests.eventId, eventId));
  const guestCount = guestRows.length;

  const confirmedCount =
    rsvpRows.filter((row) => row.status === "in").length +
    guestRows.filter((row) => row.status === "in").length;
  const target = event.quorumTarget ?? 0;
  if (target > 0 && confirmedCount < target) {
    return { enqueued: 0, skipped: 0, duplicates: 0 };
  }

  const preferences = new Map<string, boolean>();
  if (event.groupId) {
    const rows = await db
      .select({ userId: groupMembers.userId, notifyQuorum: groupMembers.notifyQuorum })
      .from(groupMembers)
      .where(eq(groupMembers.groupId, event.groupId));
    for (const row of rows) preferences.set(row.userId, row.notifyQuorum);
  }

  const channel = options.channel ?? defaultMessageChannel();
  const deliveryMode = options.deliveryMode ?? defaultMessageDeliveryMode();
  const baseUrl =
    options.baseUrl ?? process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
  const link = eventPageUrl(eventId, baseUrl);
  const kind: MessageKind = "quorum_reached";
  const name = eventName(event);
  const message = formatMessage(
    event.typeTag === "pickup",
    name,
    event.startsAt,
    event.locationText,
    confirmedCount,
    link,
  );

  const batchId = quorumReachedDedupeKey(eventId);
  const payload = {
    eventId,
    eventName: name,
    eventTime: event.startsAt,
    eventLocation: event.locationText,
    confirmedCount,
    guestCount,
    target,
    deepLink: `/events/${eventId}`,
    url: link,
    source: "quorum_reached",
  };

  let enqueued = 0;
  let skipped = 0;
  let duplicates = 0;

  for (const attendee of rsvpRows) {
    const optedOut = preferences.get(attendee.userId) === false;
    const skipReason = !attendee.phoneNumber
      ? "No phone number on file"
      : optedOut
        ? "Quorum notifications disabled for this group"
        : null;

    const result = await enqueueOutboxMessage(db, {
      userId: attendee.userId,
      eventId,
      kind,
      channel,
      recipient: attendee.phoneNumber,
      recipientName: attendee.name,
      subject: skipReason ? null : message.subject,
      body: skipReason ? null : message.body,
      payload: { ...payload, recipientStatus: attendee.status, skipReason },
      dedupeKey: `${quorumReachedDedupeKey(eventId)}:${attendee.userId}`,
      batchId,
      deliveryMode,
      status: skipReason ? "skipped" : undefined,
      error: skipReason,
      queueJob: !skipReason,
    });

    if (!result.inserted) duplicates += 1;
    else if (skipReason) skipped += 1;
    else enqueued += 1;
  }

  // Make the absence of recipients visible in the log rather than leaving an
  // empty batch that looks like the system did nothing.
  if (rsvpRows.length === 0) {
    await enqueueOutboxMessage(db, {
      eventId,
      kind,
      channel,
      subject: message.subject,
      payload: { ...payload, skipReason: "No confirmed or maybe attendees" },
      dedupeKey: `${quorumReachedDedupeKey(eventId)}:no-recipients`,
      batchId,
      deliveryMode,
      status: "skipped",
      error: "No confirmed or maybe attendees",
      queueJob: false,
    });
  }

  return { enqueued, skipped, duplicates };
}
