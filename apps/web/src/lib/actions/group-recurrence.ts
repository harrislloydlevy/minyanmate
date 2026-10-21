"use server";

import { eq } from "drizzle-orm";
import { generateInstances } from "@minyanmate/db";
import { groups, minyans } from "@minyanmate/db/schema";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { canManageGroup } from "@/lib/group-permissions";

export type SetGroupRecurrenceResult = { success: true } | { success: false; error: string };

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

/**
 * Adds recurrence to a group created before groups and series were merged.
 * New groups set their schedule at creation; this is the one-time setup path.
 */
export async function setGroupRecurrence(
  _prev: SetGroupRecurrenceResult | null,
  form: FormData,
): Promise<SetGroupRecurrenceResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { success: false, error: "You must be signed in." };

  const slug = form.get("slug")?.toString().trim();
  const time = form.get("time")?.toString().trim();
  const weekdaysRaw = form.getAll("weekdays").map((value) => value.toString());

  if (!slug) return { success: false, error: "Group is required." };

  const [group] = await db
    .select({
      id: groups.id,
      slug: groups.slug,
      name: groups.name,
      description: groups.description,
      defaultLocation: groups.defaultLocation,
      ownerId: groups.ownerId,
    })
    .from(groups)
    .where(eq(groups.slug, slug))
    .limit(1);

  if (!group) return { success: false, error: "Group not found." };
  if (!(await canManageGroup(group, session.user.id))) {
    return { success: false, error: "Only organisers can set the schedule." };
  }

  const [existing] = await db
    .select({ id: minyans.id })
    .from(minyans)
    .where(eq(minyans.groupId, group.id))
    .limit(1);
  if (existing) {
    return { success: false, error: "This group already has a schedule." };
  }

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

  let createdMinyanId: string | null = null;

  try {
    const [minyan] = await db
      .insert(minyans)
      .values({
        groupId: group.id,
        name: group.name,
        description: group.description,
        locationText: group.defaultLocation,
        schedule: JSON.stringify({ weekdays, time }),
        ownerId: group.ownerId,
      })
      .returning();

    if (!minyan) throw new Error("minyan insert failed");
    createdMinyanId = minyan.id;

    await generateInstances(db, minyan);
    revalidatePath(`/groups/${group.slug}`);
    revalidatePath("/my");

    return { success: true };
  } catch (error) {
    if (createdMinyanId) {
      try {
        await db.delete(minyans).where(eq(minyans.id, createdMinyanId));
      } catch {
        // Fall through to the user-facing error.
      }
    }
    console.error("setGroupRecurrence failed", error);
    return { success: false, error: "An unexpected error occurred." };
  }
}
