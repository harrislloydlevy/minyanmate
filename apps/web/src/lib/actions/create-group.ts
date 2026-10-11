"use server";

import { eq } from "drizzle-orm";
import { groups } from "@minyanmate/db/schema";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export type CreateGroupResult =
  | { success: true; groupId: string; slug: string }
  | { success: false; error: string };

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
  const typeTag = form.get("typeTag")?.toString().trim();
  const defaultLocation = form.get("defaultLocation")?.toString().trim() || null;
  const description = form.get("description")?.toString().trim() || null;

  if (!name) return { success: false, error: "Group name is required." };
  if (!typeTag) return { success: false, error: "Group type is required." };
  if (typeTag !== "minyan" && typeTag !== "pickup") {
    return { success: false, error: "Type tag must be minyan or pickup." };
  }

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
        typeTag: typeTag as "minyan" | "pickup",
        defaultLocation,
        description,
        ownerId: session.user.id,
      })
      .returning({ id: groups.id, slug: groups.slug });

    if (!group) return { success: false, error: "Failed to create group." };

    return { success: true, groupId: group.id, slug: group.slug };
  } catch {
    return { success: false, error: "An unexpected error occurred." };
  }
}
