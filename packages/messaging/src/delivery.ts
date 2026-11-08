import { eq } from "drizzle-orm";
import type { MessageSender } from "@minyanmate/core";
import type { DbHandle } from "@minyanmate/db";
import { messages } from "@minyanmate/db/schema";
import {
  createTransport,
  type MessageTransport,
  type OutboundMessage,
} from "./transports";

type Db = DbHandle["db"];

export type DeliveryOutcome =
  | { outcome: "sent" }
  | { outcome: "failed"; error: string }
  | { outcome: "missing" }
  | { outcome: "ignored"; status: string };

function parsePayload(value: string | null): unknown {
  if (!value) return null;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export interface DeliverOptions {
  /** Override the transport; useful for tests and local tooling. */
  transport?: MessageTransport;
  /** Who initiated the send. Defaults to the worker. */
  sentBy?: MessageSender;
  now?: Date;
}

/**
 * Deliver one queued/requested outbox row and update its audit fields.
 *
 * Retryable failures leave automatic rows queued (manual rows stay requested)
 * and rethrow so the worker retries the job. Once `maxAttempts` is reached the
 * row is marked failed and the job is considered complete; the failure remains
 * visible in the log.
 */
export async function deliverOutboxMessage(
  db: Db,
  messageId: string,
  options: DeliverOptions = {},
): Promise<DeliveryOutcome> {
  const [message] = await db
    .select()
    .from(messages)
    .where(eq(messages.id, messageId))
    .limit(1);

  if (!message) return { outcome: "missing" };
  // `requested` rows are manual-mode requests; allowing delivery here lets a
  // human/tooling step send one without switching the whole row to auto mode.
  if (message.status !== "queued" && message.status !== "requested") {
    return { outcome: "ignored", status: message.status };
  }

  const now = options.now ?? new Date();
  const transport = options.transport ?? createTransport(message.channel);

  try {
    if (!message.recipient) throw new Error("Message has no recipient address");
    if (!message.body) throw new Error("Message has no body");

    const outbound: OutboundMessage = {
      id: message.id,
      channel: message.channel,
      kind: message.kind,
      to: message.recipient,
      body: message.body,
      subject: message.subject,
      payload: parsePayload(message.payload),
    };

    const result = await transport.send(outbound);
    await db
      .update(messages)
      .set({
        status: "sent",
        sentChannel: message.channel,
        sentRecipient: message.recipient,
        sentBody: message.body,
        technique: result.technique ?? result.provider,
        sentBy: options.sentBy ?? "worker",
        provider: result.provider,
        providerMessageId: result.providerMessageId,
        waMessageId:
          result.provider === "whatsapp"
            ? result.providerMessageId
            : message.waMessageId,
        attempts: message.attempts + 1,
        error: null,
        sentAt: now,
        updatedAt: now,
      })
      .where(eq(messages.id, message.id));

    return { outcome: "sent" };
  } catch (error) {
    const attempts = message.attempts + 1;
    const failed = attempts >= message.maxAttempts;
    const reason = errorMessage(error);

    await db
      .update(messages)
      .set({
        // Keep manual requests requestable; auto rows stay queued for the job
        // retry path.
        status: failed ? "failed" : message.status,
        attempts,
        error: reason,
        updatedAt: now,
      })
      .where(eq(messages.id, message.id));

    if (failed) return { outcome: "failed", error: reason };
    throw error;
  }
}
