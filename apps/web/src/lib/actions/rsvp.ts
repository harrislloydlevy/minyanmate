"use server";

import { and, asc, eq, sql } from "drizzle-orm";
import { events, guests, rsvps } from "@minyanmate/db/schema";
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
    // Cancelled events are frozen: reject new or changed RSVPs.
    const [event] = await db
      .select({ status: events.status })
      .from(events)
      .where(eq(events.id, eventId))
      .limit(1);
    if (!event) return { success: false, error: "Event not found." };
    if (event.status === "cancelled") {
      return { success: false, error: "This event has been cancelled." };
    }

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

  const trimmedName = name.trim();
  if (!trimmedName) {
    return { success: false, error: "Please enter your name." };
  }

  try {
    // Cancelled events are frozen: reject new or changed RSVPs.
    const [event] = await db
      .select({ status: events.status })
      .from(events)
      .where(eq(events.id, eventId))
      .limit(1);
    if (!event) return { success: false, error: "Event not found." };
    if (event.status === "cancelled") {
      return { success: false, error: "This event has been cancelled." };
    }

    // Guest rows are always anonymous, so an exact name match on this event
    // means the same person coming back: update their RSVP in place instead
    // of inserting a duplicate row.
    const [existing] = await db
      .select()
      .from(guests)
      .where(and(eq(guests.eventId, eventId), eq(guests.name, trimmedName)))
      .orderBy(asc(guests.createdAt))
      .limit(1);

    let token: string;
    if (existing) {
      token = existing.token;
      await db
        .update(guests)
        .set({ status, updatedAt: sql`(unixepoch())` })
        .where(eq(guests.id, existing.id));
    } else {
      token = guestToken ?? crypto.randomUUID();

      await db
        .insert(guests)
        .values({
          eventId,
          name: trimmedName,
          status,
          token,
        })
        .onConflictDoUpdate({
          target: [guests.eventId, guests.token],
          set: { name: trimmedName, status, updatedAt: sql`(unixepoch())` },
        });
    }

    const cookieStore = await cookies();
    // Both cookies stay JS-readable so the client can restore the guest's
    // identity + name on their next visit.
    cookieStore.set("guest_token", token, {
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
    });
    cookieStore.set("guest_name", trimmedName, {
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
    });

    return { success: true, guestToken: token };
  } catch {
    return { success: false, error: "An unexpected error occurred." };
  }
}

export type MergeGuestRsvpsResult =
  | { success: true; merged: number }
  | { success: false; error: string };

/**
 * Transfers a guest's RSVP rows to their account after they sign in.
 * Called from the login flow once a session exists.
 */
export async function mergeGuestRsvps(): Promise<MergeGuestRsvpsResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { success: false, error: "You must be signed in." };

  const cookieStore = await cookies();
  const token = cookieStore.get("guest_token")?.value;
  if (!token) return { success: true, merged: 0 };

  try {
    const guestRows = await db
      .select()
      .from(guests)
      .where(eq(guests.token, token));

    for (const row of guestRows) {
      await db
        .insert(rsvps)
        .values({
          eventId: row.eventId,
          userId: session.user.id,
          status: row.status,
          source: "web",
        })
        .onConflictDoUpdate({
          target: [rsvps.eventId, rsvps.userId],
          set: { status: row.status, updatedAt: sql`(unixepoch())` },
        });
    }

    if (guestRows.length > 0) {
      await db.delete(guests).where(eq(guests.token, token));
    }

    return { success: true, merged: guestRows.length };
  } catch {
    return { success: false, error: "An unexpected error occurred." };
  }
}
