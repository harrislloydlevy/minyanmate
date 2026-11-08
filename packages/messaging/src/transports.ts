import type { MessageChannel, MessageKind } from "@minyanmate/core";
import { WhatsAppClient } from "@minyanmate/whatsapp";

export interface OutboundMessage {
  id: string;
  channel: MessageChannel;
  kind: MessageKind;
  /** Phone number, email address, or other channel-specific address. */
  to: string;
  body: string;
  subject?: string | null;
  payload?: unknown;
}

export interface DeliveryResult {
  provider: string;
  providerMessageId: string;
  /** Concrete method used, e.g. `whatsapp:text`. */
  technique?: string;
}

export interface MessageTransport {
  readonly channel: MessageChannel;
  send(message: OutboundMessage): Promise<DeliveryResult>;
}

/**
 * Development transport. It never leaves the machine: the "sent" message is
 * written to the server log and recorded as sent in the outbox.
 */
export class ConsoleTransport implements MessageTransport {
  readonly channel = "console" as const;

  async send(message: OutboundMessage): Promise<DeliveryResult> {
    console.log(
      "[messaging:console] id=%s kind=%s to=%s body=%s",
      message.id,
      message.kind,
      message.to || "<none>",
      message.body,
    );
    return {
      provider: "console",
      providerMessageId: `console:${message.id}`,
      technique: "console",
    };
  }
}

/** Meta WhatsApp Cloud API transport. Credentials are read lazily. */
export class WhatsAppTransport implements MessageTransport {
  readonly channel = "whatsapp" as const;
  private client: WhatsAppClient | undefined;

  constructor(private readonly providedClient?: WhatsAppClient) {}

  private getClient(): WhatsAppClient {
    this.client ??= this.providedClient ?? WhatsAppClient.fromEnv();
    return this.client;
  }

  async send(message: OutboundMessage): Promise<DeliveryResult> {
    const result = await this.getClient().sendText(message.to, message.body);
    return {
      provider: "whatsapp",
      providerMessageId: result.waMessageId,
      technique: "whatsapp:text",
    };
  }
}

/**
 * Placeholder for channels that are wired into the outbox but do not have a
 * transport yet. Messages fail visibly instead of silently disappearing.
 */
export class UnconfiguredTransport implements MessageTransport {
  constructor(readonly channel: Exclude<MessageChannel, "console" | "whatsapp">) {}

  async send(): Promise<DeliveryResult> {
    throw new Error(
      `No transport configured for the "${this.channel}" channel. ` +
        "Set MESSAGING_CHANNEL to a supported channel or add an adapter.",
    );
  }
}

export function createTransport(channel: MessageChannel): MessageTransport {
  switch (channel) {
    case "console":
      return new ConsoleTransport();
    case "whatsapp":
      return new WhatsAppTransport();
    case "sms":
    case "email":
      return new UnconfiguredTransport(channel);
    default: {
      const exhaustive: never = channel;
      throw new Error(`Unsupported message channel: ${String(exhaustive)}`);
    }
  }
}
