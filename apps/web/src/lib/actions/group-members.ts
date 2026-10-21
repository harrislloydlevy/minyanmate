"use server";

import { and, eq, sql } from "drizzle-orm";
import { groupMembers, groups } from "@minyanmate/db/schema";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { canManageGroup } from "@/lib/group-permissions";

export type GroupMemberActionResult =
  { success: true } | { success: false; error: string };

export type GenerateJoinTokenResult =
  { success: true; token: string } | { success: false; error: string };

type GroupRole = "organiser" | "member";

async function findGroupBySlug(slug: string) {
  const [group] = await db
    .select()
    .from(groups)
    .where(eq(groups.slug, slug))
    .limit(1);
  return group;
}

async function findGroupById(groupId: string) {
  const [group] = await db
    .select()
    .from(groups)
    .where(eq(groups.id, groupId))
    .limit(1);
  return group;
}

export async function joinGroup(
  slug: string,
  token: string,
): Promise<GroupMemberActionResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { success: false, error: "You must be signed in." };

  const group = await findGroupBySlug(slug);
  if (!group) return { success: false, error: "Group not found." };
  if (!token || !group.joinToken || group.joinToken !== token) {
    return { success: false, error: "This invite link is not valid." };
  }

  // The owner is already part of the group — no membership row needed.
  if (group.ownerId === session.user.id) return { success: true };

  try {
    await db
      .insert(groupMembers)
      .values({ groupId: group.id, userId: session.user.id, role: "member" })
      .onConflictDoNothing();
    return { success: true };
  } catch {
    return { success: false, error: "An unexpected error occurred." };
  }
}

export async function generateJoinToken(
  slug: string,
): Promise<GenerateJoinTokenResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { success: false, error: "You must be signed in." };

  const group = await findGroupBySlug(slug);
  if (!group) return { success: false, error: "Group not found." };
  if (!(await canManageGroup(group, session.user.id))) {
    return {
      success: false,
      error: "Only the group organiser can manage invites.",
    };
  }

  try {
    const token = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
    await db
      .update(groups)
      .set({ joinToken: token, updatedAt: sql`(unixepoch())` })
      .where(eq(groups.id, group.id));
    return { success: true, token };
  } catch {
    return { success: false, error: "An unexpected error occurred." };
  }
}

export async function revokeJoinToken(
  slug: string,
): Promise<GroupMemberActionResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { success: false, error: "You must be signed in." };

  const group = await findGroupBySlug(slug);
  if (!group) return { success: false, error: "Group not found." };
  if (!(await canManageGroup(group, session.user.id))) {
    return {
      success: false,
      error: "Only the group organiser can manage invites.",
    };
  }

  try {
    await db
      .update(groups)
      .set({ joinToken: null, updatedAt: sql`(unixepoch())` })
      .where(eq(groups.id, group.id));
    return { success: true };
  } catch {
    return { success: false, error: "An unexpected error occurred." };
  }
}

export async function setMemberRole(
  groupId: string,
  userId: string,
  role: GroupRole,
): Promise<GroupMemberActionResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { success: false, error: "You must be signed in." };

  if (role !== "organiser" && role !== "member") {
    return { success: false, error: "Role must be organiser or member." };
  }

  const group = await findGroupById(groupId);
  if (!group) return { success: false, error: "Group not found." };
  if (!(await canManageGroup(group, session.user.id))) {
    return {
      success: false,
      error: "Only the group organiser can manage members.",
    };
  }
  if (group.ownerId === userId) {
    return {
      success: false,
      error: "The group owner's role cannot be changed.",
    };
  }

  try {
    const updated = await db
      .update(groupMembers)
      .set({ role, updatedAt: sql`(unixepoch())` })
      .where(
        and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)),
      )
      .returning({ id: groupMembers.id });
    if (updated.length === 0) {
      return { success: false, error: "That member is not in this group." };
    }
    return { success: true };
  } catch {
    return { success: false, error: "An unexpected error occurred." };
  }
}

export async function removeMember(
  groupId: string,
  userId: string,
): Promise<GroupMemberActionResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { success: false, error: "You must be signed in." };

  const group = await findGroupById(groupId);
  if (!group) return { success: false, error: "Group not found." };
  if (!(await canManageGroup(group, session.user.id))) {
    return {
      success: false,
      error: "Only the group organiser can manage members.",
    };
  }
  if (group.ownerId === userId) {
    return { success: false, error: "The group owner cannot be removed." };
  }

  try {
    const removed = await db
      .delete(groupMembers)
      .where(
        and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)),
      )
      .returning({ id: groupMembers.id });
    if (removed.length === 0) {
      return { success: false, error: "That member is not in this group." };
    }
    return { success: true };
  } catch {
    return { success: false, error: "An unexpected error occurred." };
  }
}
