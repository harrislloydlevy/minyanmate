"use server";

import { eq } from "drizzle-orm";
import { generateInstances } from "@minyanmate/db";
import { groups, minyans } from "@minyanmate/db/schema";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export type CreateGroupResult =
  { success: true; groupId: string; slug: string } | { success: false; error: string };

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

function makeSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function createGroup(
  _prev: CreateGroupResult | null,
  form: FormData,
): Promise<CreateGroupResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { success: false, error: "You must be signed in." };

  const name = form.get("name")?.toString().trim();
  const defaultLocation = form.get("defaultLocation")?.toString().trim() || null;
  const description = form.get("description")?.toString().trim() || null;
  const time = form.get("time")?.toString().trim();
  const weekdaysRaw = form.getAll("weekdays").map((value) => value.toString());

  if (!name) return { success: false, error: "Group name is required." };

  const weekdays = [...new Set(weekdaysRaw.map(Number))].sort((a, b) => a - b);
  if (weekdays.length === 0) {
    return { success: false, error: "Pick at least one weekday." };
  }
  if (!weekdays.every((day) => Number.isInteger(day) && day >= 0 && day <= 6)) {
    return { success: false, error: "Weekdays must be between 0 and 6." };
  }
  if (!time || !TIME_RE.test(time)) {
    return { success: false, error: "Time must be in HH:MM format." };
  }

  let createdGroupId: string | null = null;

  try {
    let slug = makeSlug(name) || `group-${Date.now().toString(36)}`;
    // Ensure slug is unique: append a short random suffix if it already exists
    for (let i = 0; i < 5; i++) {
      const [existing] = await db
        .select({ id: groups.id })
        .from(groups)
        .where(eq(groups.slug, slug))
        .limit(1);
      if (!existing) break;
      slug = `${makeSlug(name)}-${Math.random().toString(36).slice(2, 6)}`;
    }

    const [group] = await db
      .insert(groups)
      .values({
        name,
        slug,
        // Legacy column: groups no longer have a type; every group is a minyan group.
        typeTag: "minyan",
        defaultLocation,
        description,
        ownerId: session.user.id,
      })
      .returning({ id: groups.id, slug: groups.slug });

    if (!group) return { success: false, error: "Failed to create group." };
    createdGroupId = group.id;

    // The group and its recurring minyan are the same thing. The minyan row is
    // the schedule used to generate event instances; it is not a separate UI.
    const [minyan] = await db
      .insert(minyans)
      .values({
        groupId: group.id,
        name,
        description,
        locationText: defaultLocation,
        schedule: JSON.stringify({ weekdays, time }),
        ownerId: session.user.id,
      })
      .returning();

    if (!minyan) throw new Error("minyan insert failed");

    await generateInstances(db, minyan);

    return { success: true, groupId: group.id, slug: group.slug };
  } catch (error) {
    // Keep group creation atomic: removing the group cascades to its minyan
    // and any generated events.
    if (createdGroupId) {
      try {
        await db.delete(groups).where(eq(groups.id, createdGroupId));
      } catch {
        // Fall through to the user-facing error.
      }
    }
    console.error("createGroup failed", error);
    return { success: false, error: "An unexpected error occurred." };
  }
}
