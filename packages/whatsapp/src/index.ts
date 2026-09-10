import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Thin client for the Meta WhatsApp Cloud API.
 * Docs: https://developers.facebook.com/docs/whatsapp/cloud-api
 */

const DEFAULT_API_VERSION = "v23.0";

export interface WhatsAppConfig {
  token: string;
  phoneNumberId: string;
  apiVersion?: string;
  /** Base URL override for tests. */
  baseUrl?: string;
}

export interface SendResult {
  waMessageId: string;
}

export class WhatsAppError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "WhatsAppError";
  }
}

export class WhatsAppClient {
  private readonly baseUrl: string;

  constructor(private readonly config: WhatsAppConfig) {
    this.baseUrl =
      config.baseUrl ?? `https://graph.facebook.com/${config.apiVersion ?? DEFAULT_API_VERSION}`;
  }

  static fromEnv(): WhatsAppClient {
    const token = process.env.WHATSAPP_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    if (!token || !phoneNumberId) {
      throw new Error(
        "WHATSAPP_TOKEN and WHATSAPP_PHONE_NUMBER_ID must be set to send WhatsApp messages",
      );
    }
    return new WhatsAppClient({ token, phoneNumberId });
  }

  /** Sends a free-form text message. Only valid inside the 24h service window. */
  async sendText(to: string, body: string): Promise<SendResult> {
    const data = await this.post("messages", {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "text",
      text: { preview_url: false, body },
    });
    return { waMessageId: extractMessageId(data) };
  }

  /** Sends a pre-approved template (required for business-initiated messages). */
  async sendTemplate(
    to: string,
    template: { name: string; language?: string; params?: string[] },
  ): Promise<SendResult> {
    const data = await this.post("messages", {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "template",
      template: {
        name: template.name,
        language: { code: template.language ?? "en" },
        components:
          template.params && template.params.length > 0
            ? [
                {
                  type: "body",
                  parameters: template.params.map((text) => ({ type: "text", text })),
                },
              ]
            : [],
      },
    });
    return { waMessageId: extractMessageId(data) };
  }

  private async post(path: string, body: unknown): Promise<unknown> {
    const response = await fetch(`${this.baseUrl}/${this.config.phoneNumberId}/${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.config.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const message =
        typeof data === "object" && data !== null && "error" in data
          ? JSON.stringify((data as { error: unknown }).error)
          : `HTTP ${response.status}`;
      throw new WhatsAppError(message, response.status);
    }
    return data;
  }
}

function extractMessageId(data: unknown): string {
  const messages = (data as { messages?: { id?: string }[] } | null)?.messages;
  return messages?.[0]?.id ?? "";
}

// ---------------------------------------------------------------------------
// Webhook helpers
// ---------------------------------------------------------------------------

/** Verifies Meta's x-hub-signature-256 header against the raw request body. */
export function verifyWebhookSignature(
  appSecret: string,
  rawBody: string,
  signatureHeader: string | null,
): boolean {
  if (!signatureHeader?.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", appSecret).update(rawBody, "utf8").digest("hex");
  const provided = signatureHeader.slice("sha256=".length);
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(provided, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

export interface WebhookSubscriptionQuery {
  "hub.mode": string | null;
  "hub.verify_token": string | null;
  "hub.challenge": string | null;
}

/** Handles Meta's GET subscription handshake; returns the challenge or null. */
export function verifyWebhookSubscription(
  query: WebhookSubscriptionQuery,
  verifyToken: string,
): string | null {
  if (query["hub.mode"] === "subscribe" && query["hub.verify_token"] === verifyToken) {
    return query["hub.challenge"] ?? "";
  }
  return null;
}

export interface InboundMessage {
  /** WhatsApp user id (the phone number in international format, no +). */
  from: string;
  waMessageId: string;
  /** Reply button id or payload, when the message came from a button tap. */
  buttonPayload: string | null;
  /** Message body text, if any. */
  text: string | null;
  timestamp: number;
}

/** Extracts inbound messages from a webhook payload. */
export function parseWebhook(payload: unknown): InboundMessage[] {
  const entries = (payload as WebhookPayload | null)?.entry ?? [];
  const out: InboundMessage[] = [];

  for (const entry of entries) {
    for (const change of entry.changes ?? []) {
      const contacts = change.value?.contacts ?? [];
      for (const msg of change.value?.messages ?? []) {
        const contact = contacts.find((c) => c.wa_id === msg.from);
        out.push({
          from: contact?.wa_id ?? msg.from,
          waMessageId: msg.id,
          buttonPayload: msg.button?.payload ?? msg.interactive?.button_reply?.id ?? null,
          text: msg.text?.body ?? null,
          timestamp: Number(msg.timestamp ?? 0),
        });
      }
    }
  }
  return out;
}

interface WebhookPayload {
  entry?: {
    changes?: {
      value?: {
        contacts?: { wa_id?: string }[];
        messages?: {
          from: string;
          id: string;
          timestamp?: string;
          text?: { body?: string };
          button?: { payload?: string };
          interactive?: { button_reply?: { id?: string } };
        }[];
      };
    }[];
  }[];
}
