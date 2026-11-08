import { and, desc, eq, like, or } from "drizzle-orm";
import {
  defaultMessageDeliveryMode,
  type MessageChannel,
  type MessageDeliveryMode,
  type MessageKind,
  type MessageSender,
  type MessageStatus,
} from "@minyanmate/core";
import { jobs, messages } from "./schema";
import { users } from "./schema";
import { events } from "./schema";
import type { DbHandle } from "./index";

type Db = DbHandle["db"];

export interface EnqueueOutboxMessageInput {
  userId?: string | null;
  eventId?: string | null;
  kind: MessageKind;
  channel: MessageChannel;
  recipient?: string | null;
  recipientName?: string | null;
  subject?: string | null;
  body?: string | null;
  payload?: unknown;
  dedupeKey?: string | null;
  batchId?: string | null;
  /**
   * `auto` creates a delivery job; `manual` records a `requested` row for a
   * later human/testing step. Defaults to MESSAGING_DELIVERY_MODE.
   */
  deliveryMode?: MessageDeliveryMode;
  /** `skipped` records a row without enqueueing a delivery job. */
  status?: MessageStatus;
  error?: string | null;
  maxAttempts?: number;
  /** Set false for synchronous sends that record the row but bypass the queue. */
  queueJob?: boolean;
}

export interface EnqueueOutboxMessageResult {
  inserted: boolean;
  message: typeof messages.$inferSelect | null;
}

function serialisePayload(payload: unknown): string | null {
  if (payload === undefined || payload === null) return null;
  return typeof payload === "string" ? payload : JSON.stringify(payload);
}

/**
 * Record an outbound message and (unless skipped/synchronous) enqueue its
 * delivery job in the same transaction. Dedupe conflicts are ignored, so
 * callers can safely retry fan-outs.
 */
export async function enqueueOutboxMessage(
  db: Db,
  input: EnqueueOutboxMessageInput,
): Promise<EnqueueOutboxMessageResult> {
  const now = new Date();
  const deliveryMode = input.deliveryMode ?? defaultMessageDeliveryMode();
  const status =
    input.status ?? (deliveryMode === "manual" ? "requested" : "queued");

  return db.transaction((tx) => {
    const [message] = tx
      .insert(messages)
      .values({
        userId: input.userId ?? null,
        eventId: input.eventId ?? null,
        kind: input.kind,
        deliveryMode,
        requestedAt: now,
        channel: input.channel,
        recipient: input.recipient ?? null,
        recipientName: input.recipientName ?? null,
        subject: input.subject ?? null,
        body: input.body ?? null,
        payload: serialisePayload(input.payload),
        dedupeKey: input.dedupeKey ?? null,
        batchId: input.batchId ?? null,
        status,
        error: input.error ?? null,
        maxAttempts: input.maxAttempts ?? 3,
        updatedAt: now,
      })
      .onConflictDoNothing()
      .returning()
      .all();

    if (!message) return { inserted: false, message: null };

    if (status === "queued" && input.queueJob !== false) {
      tx.insert(jobs)
        .values({
          type: "deliver_message",
          payload: JSON.stringify({ messageId: message.id }),
          runAt: now,
        })
        .run();
    }

    return { inserted: true, message };
  });
}

export interface RecordManualDeliveryInput {
  messageId: string;
  /** Concrete technique used, e.g. `whatsapp:template` or `console`. */
  technique: string;
  sentChannel?: MessageChannel | null;
  sentRecipient?: string | null;
  sentBody?: string | null;
  provider?: string | null;
  providerMessageId?: string | null;
  sentBy?: MessageSender;
  now?: Date;
}

export type RecordManualDeliveryResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Fill in the delivery side of a requested message without using a transport.
 *
 * This is the "test different techniques" path: keep a request in `requested`
 * state, then record the channel/body/technique that would actually be used.
 * It intentionally does not send anything.
 */
export async function recordManualDelivery(
  db: Db,
  input: RecordManualDeliveryInput,
): Promise<RecordManualDeliveryResult> {
  const [message] = await db
    .select()
    .from(messages)
    .where(eq(messages.id, input.messageId))
    .limit(1);
  if (!message) return { ok: false, error: "Message not found." };
  if (message.status === "sent") {
    return { ok: false, error: "Message has already been sent." };
  }
  if (message.status === "skipped") {
    return { ok: false, error: "Skipped messages cannot be marked as sent." };
  }
  if (message.status !== "requested" && message.status !== "failed") {
    return {
      ok: false,
      error: "Only requested or failed messages can be filled in manually.",
    };
  }

  const technique = input.technique.trim();
  if (!technique) return { ok: false, error: "A delivery technique is required." };

  const sentBody = input.sentBody?.trim() || message.body;
  if (!sentBody) return { ok: false, error: "A sent body is required." };

  const now = input.now ?? new Date();
  await db
    .update(messages)
    .set({
      status: "sent",
      sentChannel: input.sentChannel ?? message.channel,
      sentRecipient: input.sentRecipient ?? message.recipient,
      sentBody,
      technique,
      sentBy: input.sentBy ?? "manual",
      provider: input.provider ?? "manual",
      providerMessageId: input.providerMessageId ?? null,
      attempts: message.attempts + 1,
      error: null,
      sentAt: now,
      updatedAt: now,
    })
    .where(eq(messages.id, message.id));

  return { ok: true };
}

export interface OutboxFilters {
  status?: MessageStatus;
  channel?: MessageChannel;
  kind?: MessageKind;
  deliveryMode?: MessageDeliveryMode;
  /** Free-text search over recipient, name, requested/sent body, user and event. */
  q?: string;
  limit?: number;
}

export async function listOutboxMessages(db: Db, filters: OutboxFilters = {}) {
  const conditions = [];
  if (filters.status) conditions.push(eq(messages.status, filters.status));
  if (filters.channel) conditions.push(eq(messages.channel, filters.channel));
  if (filters.kind) conditions.push(eq(messages.kind, filters.kind));
  if (filters.deliveryMode) {
    conditions.push(eq(messages.deliveryMode, filters.deliveryMode));
  }

  const term = filters.q?.trim();
  if (term) {
    const pattern = `%${term}%`;
    conditions.push(
      or(
        like(messages.recipient, pattern),
        like(messages.sentRecipient, pattern),
        like(messages.recipientName, pattern),
        like(messages.body, pattern),
        like(messages.sentBody, pattern),
        like(users.name, pattern),
        like(events.title, pattern),
      ),
    );
  }

  const limit = Math.min(Math.max(filters.limit ?? 100, 1), 200);
  return db
    .select({
      id: messages.id,
      userId: messages.userId,
      eventId: messages.eventId,
      kind: messages.kind,
      deliveryMode: messages.deliveryMode,
      requestedAt: messages.requestedAt,
      channel: messages.channel,
      recipient: messages.recipient,
      recipientName: messages.recipientName,
      subject: messages.subject,
      body: messages.body,
      sentChannel: messages.sentChannel,
      sentRecipient: messages.sentRecipient,
      sentBody: messages.sentBody,
      technique: messages.technique,
      sentBy: messages.sentBy,
      dedupeKey: messages.dedupeKey,
      batchId: messages.batchId,
      provider: messages.provider,
      providerMessageId: messages.providerMessageId,
      status: messages.status,
      error: messages.error,
      payload: messages.payload,
      attempts: messages.attempts,
      maxAttempts: messages.maxAttempts,
      sentAt: messages.sentAt,
      createdAt: messages.createdAt,
      updatedAt: messages.updatedAt,
      userName: users.name,
      eventTitle: events.title,
      eventStartsAt: events.startsAt,
    })
    .from(messages)
    .leftJoin(users, eq(messages.userId, users.id))
    .leftJoin(events, eq(messages.eventId, events.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(messages.createdAt))
    .limit(limit);
}

export type OutboxMessageRow = Awaited<ReturnType<typeof listOutboxMessages>>[number];
