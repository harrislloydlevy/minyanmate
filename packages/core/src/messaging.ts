/** Shared vocabulary for the outbound message/dispatch layer. */

export const MESSAGE_CHANNELS = ["whatsapp", "sms", "email", "console"] as const;
export type MessageChannel = (typeof MESSAGE_CHANNELS)[number];

export const MESSAGE_KINDS = [
  "otp",
  "reminder",
  "quorum_reached",
  "quorum_lost",
  "rsvp_confirm",
  "event_edited",
  "event_cancelled",
  "custom",
] as const;
export type MessageKind = (typeof MESSAGE_KINDS)[number];

export const MESSAGE_STATUSES = ["requested", "queued", "sent", "failed", "skipped"] as const;
export type MessageStatus = (typeof MESSAGE_STATUSES)[number];

export const MESSAGE_DELIVERY_MODES = ["auto", "manual"] as const;
export type MessageDeliveryMode = (typeof MESSAGE_DELIVERY_MODES)[number];

export const MESSAGE_SENDERS = ["worker", "manual"] as const;
export type MessageSender = (typeof MESSAGE_SENDERS)[number];

export function isMessageChannel(value: unknown): value is MessageChannel {
  return typeof value === "string" && (MESSAGE_CHANNELS as readonly string[]).includes(value);
}

export function isMessageKind(value: unknown): value is MessageKind {
  return typeof value === "string" && (MESSAGE_KINDS as readonly string[]).includes(value);
}

export function isMessageStatus(value: unknown): value is MessageStatus {
  return typeof value === "string" && (MESSAGE_STATUSES as readonly string[]).includes(value);
}

export function isMessageDeliveryMode(value: unknown): value is MessageDeliveryMode {
  return (
    typeof value === "string" &&
    (MESSAGE_DELIVERY_MODES as readonly string[]).includes(value)
  );
}

export function isMessageSender(value: unknown): value is MessageSender {
  return typeof value === "string" && (MESSAGE_SENDERS as readonly string[]).includes(value);
}

function isProduction(env: NodeJS.ProcessEnv): boolean {
  return env.APP_ENV === "production" || env.NODE_ENV === "production";
}

/**
 * Which transport new messages should use.
 *
 * Local development defaults to the console transport so nothing ever leaves
 * the machine. Production defaults to WhatsApp, and can be overridden with
 * `MESSAGING_CHANNEL` when an SMS/email adapter is added later.
 */
export function defaultMessageChannel(env: NodeJS.ProcessEnv = process.env): MessageChannel {
  const configured = env.MESSAGING_CHANNEL?.trim();
  if (isMessageChannel(configured)) return configured;
  return isProduction(env) ? "whatsapp" : "console";
}

/**
 * Whether new messages should be dispatched automatically.
 *
 * `manual` records the request only: no delivery job is created, the row stays
 * `requested`, and a human can later record how it was actually sent. That is
 * useful for trying different transports/templates against the same queue.
 */
export function defaultMessageDeliveryMode(
  env: NodeJS.ProcessEnv = process.env,
): MessageDeliveryMode {
  const configured = env.MESSAGING_DELIVERY_MODE?.trim().toLowerCase();
  return configured === "manual" ? "manual" : "auto";
}
