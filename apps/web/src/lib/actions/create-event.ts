"use server";

import { eq } from "drizzle-orm";
import { events, groups } from "@minyanmate/db/schema";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { canManageGroup } from "@/lib/group-permissions";

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
  const groupId = form.get("groupId")?.toString().trim() || null;
  const date = form.get("date")?.toString().trim();
  const time = form.get("time")?.toString().trim();
  const location = form.get("location")?.toString().trim() || null;
  const notes = form.get("notes")?.toString().trim() || null;

  const parsePlayerCount = (keys: string[]): number | null => {
    for (const key of keys) {
      const raw = form.get(key)?.toString().trim();
      if (raw) {
        const n = Number(raw);
        if (Number.isFinite(n) && n > 0) return Math.floor(n);
      }
    }
    return null;
  };
  const minPlayers = parsePlayerCount(["minPlayers", "min_players", "minPlayerCount", "min"]);
  const maxPlayers = parsePlayerCount(["maxPlayers", "max_players", "maxPlayerCount", "max"]);

  if (!name) return { success: false, error: "Event title is required." };
  if (!date) return { success: false, error: "Event date is required." };
  if (!time) return { success: false, error: "Start time is required." };

  if (groupId) {
    const [group] = await db
      .select({ id: groups.id, ownerId: groups.ownerId })
      .from(groups)
      .where(eq(groups.id, groupId))
      .limit(1);
    if (!group) return { success: false, error: "Group not found." };
    if (!(await canManageGroup(group, session.user.id))) {
      return {
        success: false,
        error: "Only group organisers can create events for this group.",
      };
    }
  }

  const startsAt = `${date}T${time}`;

  try {
    const [event] = await db
      .insert(events)
      .values({
        minyanId: null,
        groupId,
        title: name,
        date,
        startsAt,
        locationText: location,
        notes,
        status: "scheduled",
        minPlayers,
        maxPlayers,
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
