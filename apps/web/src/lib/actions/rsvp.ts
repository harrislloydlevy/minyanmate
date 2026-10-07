"use server";

import { sql } from "drizzle-orm";
import { rsvps, guests } from "@minyanmate/db/schema";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cookies } from "next/headers";

export type RsvpStatus = "in" | "out" | "maybe";

export type RsvpActionResult =
  | { success: true; status: RsvpStatus }
  | { success: false; error: string };

export async function setRsvp(
  eventId: string,
  status: RsvpStatus,
): Promise<RsvpActionResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { success: false, error: "You must be signed in." };

  if (!["in", "out", "maybe"].includes(status)) {
    return { success: false, error: "Invalid RSVP status." };
  }

  try {
    // Upsert: insert or update the existing RSVP for this user + event
    await db
      .insert(rsvps)
      .values({
        eventId,
        userId: session.user.id,
        status,
      })
      .onConflictDoUpdate({
        target: [rsvps.eventId, rsvps.userId],
        set: { status, updatedAt: sql`(unixepoch())` },
      });

    return { success: true, status };
  } catch {
    return { success: false, error: "An unexpected error occurred." };
  }
}

export async function setGuestRsvp(
  eventId: string,
  name: string,
  status: RsvpStatus,
  guestToken?: string,
): Promise<{ success: true; guestToken: string } | { success: false; error: string }> {
  if (!["in", "out", "maybe"].includes(status)) {
    return { success: false, error: "Invalid RSVP status." };
  }

  try {
    const token = guestToken ?? crypto.randomUUID();

    await db
      .insert(guests)
      .values({
        eventId,
        name,
        status,
        token,
      })
      .onConflictDoUpdate({
        target: [guests.eventId, guests.token],
        set: { name, status, updatedAt: sql`(unixepoch())` },
      });

    const cookieStore = await cookies();
    cookieStore.set("guest_token", token, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
    });

    return { success: true, guestToken: token };
  } catch {
    return { success: false, error: "An unexpected error occurred." };
  }
}
