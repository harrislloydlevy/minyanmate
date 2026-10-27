"use server";

import { and, asc, count, eq, inArray, sql } from "drizzle-orm";
import { events, guests, rsvps } from "@minyanmate/db/schema";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cookies } from "next/headers";

export type RsvpStatus = "in" | "out" | "maybe" | "waitlisted" | "waitlist" | "waiting";

const WAITLISTED_STATUSES: RsvpStatus[] = ["waitlisted", "waitlist", "waiting"];

function isWaitlistedStatus(status: string): boolean {
  return WAITLISTED_STATUSES.includes(status as RsvpStatus);
}

export type RsvpActionResult =
  | { success: true; status: RsvpStatus }
  | { success: false; error: string };

export async function setRsvp(
  eventId: string,
  status: RsvpStatus,
): Promise<RsvpActionResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { success: false, error: "You must be signed in." };

  if (!["in", "out", "maybe", "waitlisted", "waitlist", "waiting"].includes(status)) {
    return { success: false, error: "Invalid RSVP status." };
  }

  try {
    // Cancelled events are frozen: reject new or changed RSVPs.
    const [event] = await db
      .select({
        status: events.status,
        minPlayers: events.minPlayers,
        maxPlayers: events.maxPlayers,
      })
      .from(events)
      .where(eq(events.id, eventId))
      .limit(1);
    if (!event) return { success: false, error: "Event not found." };
    if (event.status === "cancelled") {
      return { success: false, error: "This event has been cancelled." };
    }

    const [existing] = await db
      .select()
      .from(rsvps)
      .where(and(eq(rsvps.eventId, eventId), eq(rsvps.userId, session.user.id)))
      .limit(1);

    let finalStatus: RsvpStatus = status;
    const now = new Date();

    // Waitlist handling for "in" RSVPs when a max player count is set.
    if (status === "in" && event.maxPlayers != null) {
      const alreadyIn = existing?.status === "in";
      if (!alreadyIn) {
        const [userCount] = await db
          .select({ c: count() })
          .from(rsvps)
          .where(and(eq(rsvps.eventId, eventId), eq(rsvps.status, "in")));
        const [guestCount] = await db
          .select({ c: count() })
          .from(guests)
          .where(and(eq(guests.eventId, eventId), eq(guests.status, "in")));
        const totalConfirmed = (userCount?.c ?? 0) + (guestCount?.c ?? 0);
        if (totalConfirmed >= event.maxPlayers) {
          finalStatus = "waitlisted";
        }
      }
    }

    const waitlistedAt = isWaitlistedStatus(finalStatus) ? now : null;

    // Upsert: insert or update the existing RSVP for this user + event
    await db
      .insert(rsvps)
      .values({
        eventId,
        userId: session.user.id,
        status: finalStatus,
        waitlistedAt,
      })
      .onConflictDoUpdate({
        target: [rsvps.eventId, rsvps.userId],
        set: {
          status: finalStatus,
          waitlistedAt,
          updatedAt: sql`(unixepoch())`,
        },
      });

    // Auto-promote from waitlist when someone drops out of a confirmed slot.
    if (existing?.status === "in" && status !== "in" && event.maxPlayers != null) {
      await autoPromoteOne(eventId, event.maxPlayers);
    }

    return { success: true, status: finalStatus };
  } catch {
    return { success: false, error: "An unexpected error occurred." };
  }
}

async function autoPromoteOne(eventId: string, maxPlayers: number): Promise<void> {
  const [userCount] = await db
    .select({ c: count() })
    .from(rsvps)
    .where(and(eq(rsvps.eventId, eventId), eq(rsvps.status, "in")));
  const [guestCount] = await db
    .select({ c: count() })
    .from(guests)
    .where(and(eq(guests.eventId, eventId), eq(guests.status, "in")));
  const totalConfirmed = (userCount?.c ?? 0) + (guestCount?.c ?? 0);
  if (totalConfirmed >= maxPlayers) return;

  const userCandidates = await db
    .select()
    .from(rsvps)
    .where(and(eq(rsvps.eventId, eventId), inArray(rsvps.status, WAITLISTED_STATUSES)))
    .orderBy(asc(rsvps.waitlistedAt), asc(rsvps.createdAt));
  const guestCandidates = await db
    .select()
    .from(guests)
    .where(and(eq(guests.eventId, eventId), inArray(guests.status, WAITLISTED_STATUSES)))
    .orderBy(asc(guests.waitlistedAt), asc(guests.createdAt));

  const combined: { kind: "user" | "guest"; joined: number; id: string }[] = [
    ...userCandidates.map((r) => ({
      kind: "user" as const,
      joined: (r.waitlistedAt ?? r.createdAt)?.getTime?.() ?? 0,
      id: r.id,
    })),
    ...guestCandidates.map((r) => ({
      kind: "guest" as const,
      joined: (r.waitlistedAt ?? r.createdAt)?.getTime?.() ?? 0,
      id: r.id,
    })),
  ].sort((a, b) => a.joined - b.joined);

  if (combined.length === 0) return;
  const first = combined[0]!;
  const now = new Date();
  if (first.kind === "user") {
    await db
      .update(rsvps)
      .set({ status: "in", waitlistedAt: null, updatedAt: sql`(unixepoch())` })
      .where(eq(rsvps.id, first.id));
  } else {
    await db
      .update(guests)
      .set({ status: "in", waitlistedAt: null, updatedAt: sql`(unixepoch())` })
      .where(eq(guests.id, first.id));
  }
  // Suppress unused variable warning
  void now;
}

export async function setGuestRsvp(
  eventId: string,
  name: string,
  status: RsvpStatus,
  guestToken?: string,
): Promise<{ success: true; guestToken: string; status: RsvpStatus } | { success: false; error: string }> {
  if (!["in", "out", "maybe", "waitlisted", "waitlist", "waiting"].includes(status)) {
    return { success: false, error: "Invalid RSVP status." };
  }

  const trimmedName = name.trim();
  if (!trimmedName) {
    return { success: false, error: "Please enter your name." };
  }

  try {
    // Cancelled events are frozen: reject new or changed RSVPs.
    const [event] = await db
      .select({ status: events.status, maxPlayers: events.maxPlayers })
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

    let finalStatus: RsvpStatus = status;
    const now = new Date();
    if (status === "in" && event.maxPlayers != null) {
      const alreadyIn = existing?.status === "in";
      if (!alreadyIn) {
        const [userCount] = await db
          .select({ c: count() })
          .from(rsvps)
          .where(and(eq(rsvps.eventId, eventId), eq(rsvps.status, "in")));
        const [guestCount] = await db
          .select({ c: count() })
          .from(guests)
          .where(and(eq(guests.eventId, eventId), eq(guests.status, "in")));
        const totalConfirmed = (userCount?.c ?? 0) + (guestCount?.c ?? 0);
        if (totalConfirmed >= event.maxPlayers) {
          finalStatus = "waitlisted";
        }
      }
    }

    let token: string;
    if (existing) {
      token = existing.token;
      await db
        .update(guests)
        .set({
          status: finalStatus,
          waitlistedAt: isWaitlistedStatus(finalStatus) ? now : null,
          updatedAt: sql`(unixepoch())`,
        })
        .where(eq(guests.id, existing.id));
    } else {
      token = guestToken ?? crypto.randomUUID();

      await db
        .insert(guests)
        .values({
          eventId,
          name: trimmedName,
          status: finalStatus,
          token,
          waitlistedAt: isWaitlistedStatus(finalStatus) ? now : null,
        })
        .onConflictDoUpdate({
          target: [guests.eventId, guests.token],
          set: {
            name: trimmedName,
            status: finalStatus,
            waitlistedAt: isWaitlistedStatus(finalStatus) ? now : null,
            updatedAt: sql`(unixepoch())`,
          },
        });
    }

    // Auto-promote when a confirmed guest drops out.
    if (existing?.status === "in" && status !== "in" && event.maxPlayers != null) {
      await autoPromoteOne(eventId, event.maxPlayers);
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

    return { success: true, guestToken: token, status: finalStatus };
  } catch {
    return { success: false, error: "An unexpected error occurred." };
  }
}

export type PromoteWaitlistResult =
  | { success: true }
  | { success: false; error: string };

/**
 * Promote a specific waitlisted user RSVP to "in" (organiser only).
 */
export async function promoteFromWaitlist(
  eventId: string,
  userId: string,
): Promise<PromoteWaitlistResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { success: false, error: "You must be signed in." };

  const [event] = await db.select().from(events).where(eq(events.id, eventId)).limit(1);
  if (!event) return { success: false, error: "Event not found." };
  if (event.ownerId !== session.user.id) {
    return { success: false, error: "Only the event organiser can promote from the waitlist." };
  }

  try {
    if (event.maxPlayers != null) {
      const [uc] = await db.select({ c: count() }).from(rsvps).where(and(eq(rsvps.eventId, eventId), eq(rsvps.status, "in")));
      const [gc] = await db.select({ c: count() }).from(guests).where(and(eq(guests.eventId, eventId), eq(guests.status, "in")));
      if ((uc?.c ?? 0) + (gc?.c ?? 0) >= event.maxPlayers) {
        return { success: false, error: "No slots available." };
      }
    }

    const result = await db
      .update(rsvps)
      .set({ status: "in", waitlistedAt: null, updatedAt: sql`(unixepoch())` })
      .where(and(eq(rsvps.eventId, eventId), eq(rsvps.userId, userId), inArray(rsvps.status, WAITLISTED_STATUSES)));
    if (result.changes === 0) {
      return { success: false, error: "User is not on the waitlist." };
    }
    return { success: true };
  } catch {
    return { success: false, error: "An unexpected error occurred." };
  }
}

export async function promoteGuestFromWaitlist(
  eventId: string,
  guestId: string,
): Promise<PromoteWaitlistResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { success: false, error: "You must be signed in." };

  const [event] = await db.select().from(events).where(eq(events.id, eventId)).limit(1);
  if (!event) return { success: false, error: "Event not found." };
  if (event.ownerId !== session.user.id) {
    return { success: false, error: "Only the event organiser can promote from the waitlist." };
  }

  try {
    if (event.maxPlayers != null) {
      const [uc] = await db.select({ c: count() }).from(rsvps).where(and(eq(rsvps.eventId, eventId), eq(rsvps.status, "in")));
      const [gc] = await db.select({ c: count() }).from(guests).where(and(eq(guests.eventId, eventId), eq(guests.status, "in")));
      if ((uc?.c ?? 0) + (gc?.c ?? 0) >= event.maxPlayers) {
        return { success: false, error: "No slots available." };
      }
    }

    const result = await db
      .update(guests)
      .set({ status: "in", waitlistedAt: null, updatedAt: sql`(unixepoch())` })
      .where(and(eq(guests.id, guestId), eq(guests.eventId, eventId), inArray(guests.status, WAITLISTED_STATUSES)));
    if (result.changes === 0) {
      return { success: false, error: "Guest is not on the waitlist." };
    }
    return { success: true };
  } catch {
    return { success: false, error: "An unexpected error occurred." };
  }
}

export async function promoteNextFromWaitlist(eventId: string): Promise<PromoteWaitlistResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { success: false, error: "You must be signed in." };

  const [event] = await db.select().from(events).where(eq(events.id, eventId)).limit(1);
  if (!event) return { success: false, error: "Event not found." };
  if (event.ownerId !== session.user.id) {
    return { success: false, error: "Only the event organiser can promote from the waitlist." };
  }

  if (event.maxPlayers != null) {
    const [uc] = await db.select({ c: count() }).from(rsvps).where(and(eq(rsvps.eventId, eventId), eq(rsvps.status, "in")));
    const [gc] = await db.select({ c: count() }).from(guests).where(and(eq(guests.eventId, eventId), eq(guests.status, "in")));
    if ((uc?.c ?? 0) + (gc?.c ?? 0) >= event.maxPlayers) {
      return { success: false, error: "No slots available." };
    }
  }

  const userCandidates = await db
    .select()
    .from(rsvps)
    .where(and(eq(rsvps.eventId, eventId), inArray(rsvps.status, WAITLISTED_STATUSES)))
    .orderBy(asc(rsvps.waitlistedAt), asc(rsvps.createdAt));
  const guestCandidates = await db
    .select()
    .from(guests)
    .where(and(eq(guests.eventId, eventId), inArray(guests.status, WAITLISTED_STATUSES)))
    .orderBy(asc(guests.waitlistedAt), asc(guests.createdAt));

  const userFirst = userCandidates[0];
  const guestFirst = guestCandidates[0];
  let promoteUser = false;
  if (userFirst && guestFirst) {
    const ut = (userFirst.waitlistedAt ?? userFirst.createdAt)?.getTime?.() ?? 0;
    const gt = (guestFirst.waitlistedAt ?? guestFirst.createdAt)?.getTime?.() ?? 0;
    promoteUser = ut <= gt;
  } else if (userFirst) {
    promoteUser = true;
  }

  try {
    if (promoteUser && userFirst) {
      await db
        .update(rsvps)
        .set({ status: "in", waitlistedAt: null, updatedAt: sql`(unixepoch())` })
        .where(eq(rsvps.id, userFirst.id));
    } else if (guestFirst) {
      await db
        .update(guests)
        .set({ status: "in", waitlistedAt: null, updatedAt: sql`(unixepoch())` })
        .where(eq(guests.id, guestFirst.id));
    } else {
      return { success: false, error: "Waitlist is empty." };
    }
    return { success: true };
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
