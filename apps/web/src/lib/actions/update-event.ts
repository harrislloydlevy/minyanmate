"use server";

import { eq } from "drizzle-orm";
import { events, jobs } from "@minyanmate/db/schema";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isWithinNotificationWindow } from "@minyanmate/core";

export type UpdateEventResult =
  | { success: true; eventId: string }
  | { success: false; error: string };

export async function updateEvent(
  _prev: UpdateEventResult | null,
  form: FormData,
): Promise<UpdateEventResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { success: false, error: "You must be signed in." };

  const eventId = form.get("eventId")?.toString().trim();
  if (!eventId) return { success: false, error: "Event ID is required." };

  // Fetch the existing event
  const [event] = await db
    .select()
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);

  if (!event) return { success: false, error: "Event not found." };
  if (event.ownerId !== session.user.id) {
    return {
      success: false,
      error: "Only the event organiser can edit this event.",
    };
  }

  const date = form.get("date")?.toString().trim();
  const time = form.get("time")?.toString().trim();
  const location = form.get("location")?.toString().trim();
  const notes = form.get("notes")?.toString().trim();
  const typeTag = form.get("typeTag")?.toString().trim();

  if (!date) return { success: false, error: "Event date is required." };
  if (!time) return { success: false, error: "Start time is required." };

  const startsAt = `${date}T${time}`;

  if (typeTag && typeTag !== "minyan" && typeTag !== "pickup") {
    return { success: false, error: "Type tag must be minyan or pickup." };
  }

  const now = new Date();

  try {
    await db
      .update(events)
      .set({
        date,
        startsAt,
        locationText: location || null,
        notes: notes || null,
        typeTag: (typeTag as "minyan" | "pickup" | null) || null,
        lastEditedAt: now,
      })
      .where(eq(events.id, eventId));

    // Enqueue a notification job for confirmed attendees if the edit is recent
    if (isWithinNotificationWindow(now)) {
      await db.insert(jobs).values({
        type: "event_edited",
        payload: JSON.stringify({ eventId, editedAt: now.toISOString() }),
        runAt: now,
      });
    }

    return { success: true, eventId };
  } catch {
    return { success: false, error: "An unexpected error occurred." };
  }
}
