"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { isMessageChannel, type MessageChannel } from "@minyanmate/core";
import { recordManualDelivery } from "@minyanmate/db";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { canViewMessageLog } from "@/lib/message-log-access";

export type RecordManualDeliveryActionResult =
  | { success: true }
  | { success: false; error: string };

export interface RecordManualDeliveryActionInput {
  messageId: string;
  technique: string;
  sentChannel?: string;
  sentRecipient?: string;
  sentBody?: string;
  providerMessageId?: string;
}

/**
 * Record the delivery side of a `requested` message without sending anything.
 * This is deliberately a log/testing tool: it lets a request be fulfilled with
 * a different channel, body or technique and keeps both sides visible.
 */
export async function recordManualSend(
  input: RecordManualDeliveryActionInput,
): Promise<RecordManualDeliveryActionResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { success: false, error: "You must be signed in." };

  if (!(await canViewMessageLog(session.user.id))) {
    return { success: false, error: "You do not have access to the message log." };
  }

  const messageId = input.messageId?.trim();
  if (!messageId) return { success: false, error: "Message id is required." };

  const technique = input.technique?.trim();
  if (!technique) return { success: false, error: "A technique is required." };
  if (technique.length > 80) {
    return { success: false, error: "Technique must be 80 characters or fewer." };
  }

  const rawChannel = input.sentChannel?.trim();
  let sentChannel: MessageChannel | undefined;
  if (rawChannel) {
    if (!isMessageChannel(rawChannel)) {
      return { success: false, error: "Unknown sent channel." };
    }
    sentChannel = rawChannel;
  }

  try {
    const result = await recordManualDelivery(db, {
      messageId,
      technique,
      sentChannel,
      sentRecipient: input.sentRecipient?.trim() || undefined,
      sentBody: input.sentBody?.trim() || undefined,
      providerMessageId: input.providerMessageId?.trim() || null,
    });
    if (!result.ok) return { success: false, error: result.error };

    revalidatePath("/messages");
    return { success: true };
  } catch {
    return { success: false, error: "An unexpected error occurred." };
  }
}
