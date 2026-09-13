"use server";

import { events } from "@minyanmate/db/schema";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export type CreateEventResult =
  | { success: true; eventId: string }
  | { success: false; error: string };

export async function createEvent(
  _prev: CreateEventResult | null,
  form: FormData,
): Promise<CreateEventResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { success: false, error: "You must be signed in." };

  const name = form.get("name")?.toString().trim();
  const date = form.get("date")?.toString().trim();
  const time = form.get("time")?.toString().trim();
  const location = form.get("location")?.toString().trim() || null;
  const notes = form.get("notes")?.toString().trim() || null;
  const typeTag = form.get("typeTag")?.toString().trim() || null;

  if (!name) return { success: false, error: "Event title is required." };
  if (!date) return { success: false, error: "Event date is required." };
  if (!time) return { success: false, error: "Start time is required." };

  const startsAt = `${date}T${time}`;

  if (typeTag !== null && typeTag !== "minyan" && typeTag !== "pickup") {
    return { success: false, error: "Type tag must be minyan or pickup." };
  }

  try {
    const [event] = await db
      .insert(events)
      .values({
        minyanId: null,
        date,
        startsAt,
        locationText: location,
        notes,
        typeTag: typeTag as "minyan" | "pickup" | null,
        status: "scheduled",
        ownerId: session.user.id,
      })
      .returning({ id: events.id });

    if (!event) return { success: false, error: "Failed to create event." };

    return { success: true, eventId: event.id };
  } catch {
    return { success: false, error: "An unexpected error occurred." };
  }
}

export async function createEventAndRedirect(form: FormData) {
  const result = await createEvent(null, form);
  if (result.success) {
    redirect("/my");
  }
  throw new Error(result.error);
}
