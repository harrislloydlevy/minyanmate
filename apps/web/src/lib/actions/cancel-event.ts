"use server";

import { eq, sql } from "drizzle-orm";
import { events } from "@minyanmate/db/schema";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export type CancelEventResult =
  | { success: true; eventId: string }
  | { success: false; error: string };

export async function cancelEvent(eventId: string): Promise<CancelEventResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { success: false, error: "You must be signed in." };

  const [event] = await db
    .select()
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);

  if (!event) return { success: false, error: "Event not found." };
  if (event.ownerId !== session.user.id) {
    return { success: false, error: "Only the event organiser can cancel this event." };
  }

  try {
    await db
      .update(events)
      .set({ status: "cancelled", lastEditedAt: sql`(unixepoch())` })
      .where(eq(events.id, eventId));

    return { success: true, eventId };
  } catch {
    return { success: false, error: "An unexpected error occurred." };
  }
}