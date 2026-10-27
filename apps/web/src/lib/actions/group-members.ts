"use server";

import { and, eq, gte, inArray, or, sql } from "drizzle-orm";
import { events, groupMembers, groups, minyans, rsvps } from "@minyanmate/db/schema";
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
  token?: string,
): Promise<GroupMemberActionResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { success: false, error: "You must be signed in." };

  const group = await findGroupBySlug(slug);
  if (!group) return { success: false, error: "Group not found." };

  // The owner is already part of the group — no membership row needed.
  if (group.ownerId === session.user.id) return { success: true };

  const [membership] = await db
    .select({ id: groupMembers.id })
    .from(groupMembers)
    .where(
      and(
        eq(groupMembers.groupId, group.id),
        eq(groupMembers.userId, session.user.id),
      ),
    )
    .limit(1);
  if (membership) return { success: true };

  const inviteAccepted =
    !!token && !!group.joinToken && group.joinToken === token;

  // A guest who RSVP'd to an event in this group can join without an invite
  // link once they have an account. The guest RSVP is merged into `rsvps`
  // before this action runs during the login flow.
  let hasGroupEventRsvp = false;
  if (!inviteAccepted) {
    const [rsvp] = await db
      .select({ id: rsvps.id })
      .from(rsvps)
      .innerJoin(events, eq(rsvps.eventId, events.id))
      .where(
        and(
          eq(rsvps.userId, session.user.id),
          eq(events.groupId, group.id),
        ),
      )
      .limit(1);
    hasGroupEventRsvp = !!rsvp;
  }

  if (!inviteAccepted && !hasGroupEventRsvp) {
    return {
      success: false,
      error: "You need an invite link or an RSVP to join this group.",
    };
  }

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

export async function leaveGroup(
  slug: string,
  newOrganiserUserId?: string,
): Promise<GroupMemberActionResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { success: false, error: "You must be signed in." };

  const group = await findGroupBySlug(slug);
  if (!group) return { success: false, error: "Group not found." };

  // The group owner cannot leave without transferring ownership.
  if (group.ownerId === session.user.id) {
    return {
      success: false,
      error: "The group owner cannot leave the group.",
    };
  }

  const [membership] = await db
    .select({ id: groupMembers.id, role: groupMembers.role })
    .from(groupMembers)
    .where(
      and(
        eq(groupMembers.groupId, group.id),
        eq(groupMembers.userId, session.user.id),
      ),
    )
    .limit(1);
  if (!membership) {
    return { success: false, error: "You are not a member of this group." };
  }

  // Sole-organiser safeguard: if this member is the only member with the
  // organiser role, they must promote a replacement before leaving.
  const memberOrganisers = await db
    .select({ userId: groupMembers.userId })
    .from(groupMembers)
    .where(
      and(
        eq(groupMembers.groupId, group.id),
        eq(groupMembers.role, "organiser"),
      ),
    );
  const isSoleOrganiser =
    membership.role === "organiser" && memberOrganisers.length === 1 &&
    memberOrganisers[0]?.userId === session.user.id;

  if (isSoleOrganiser) {
    if (!newOrganiserUserId || newOrganiserUserId === session.user.id) {
      return {
        success: false,
        error:
          "You are the sole organiser. Assign a new organiser before leaving.",
      };
    }
    const [replacement] = await db
      .select({ id: groupMembers.id })
      .from(groupMembers)
      .where(
        and(
          eq(groupMembers.groupId, group.id),
          eq(groupMembers.userId, newOrganiserUserId),
        ),
      )
      .limit(1);
    if (!replacement) {
      return {
        success: false,
        error: "That member is not in this group.",
      };
    }
    try {
      await db
        .update(groupMembers)
        .set({ role: "organiser", updatedAt: sql`(unixepoch())` })
        .where(
          and(
            eq(groupMembers.groupId, group.id),
            eq(groupMembers.userId, newOrganiserUserId),
          ),
        );
    } catch {
      return { success: false, error: "An unexpected error occurred." };
    }
  }

  try {
    const removed = await db
      .delete(groupMembers)
      .where(
        and(
          eq(groupMembers.groupId, group.id),
          eq(groupMembers.userId, session.user.id),
        ),
      )
      .returning({ id: groupMembers.id });
    if (removed.length === 0) {
      return { success: false, error: "You are not a member of this group." };
    }

    // Withdraw RSVPs for all future events in this group. Past attendance is
    // preserved by filtering on event date >= today.
    const today = new Date().toISOString().slice(0, 10);
    const minyanRows = await db
      .select({ id: minyans.id })
      .from(minyans)
      .where(eq(minyans.groupId, group.id));
    const minyanIds = minyanRows.map((r) => r.id);

    const associationFilter =
      minyanIds.length > 0
        ? or(eq(events.groupId, group.id), inArray(events.minyanId, minyanIds))
        : eq(events.groupId, group.id);

    const futureEvents = await db
      .select({ id: events.id })
      .from(events)
      .where(and(gte(events.date, today), associationFilter));

    if (futureEvents.length > 0) {
      await db
        .delete(rsvps)
        .where(
          and(
            eq(rsvps.userId, session.user.id),
            inArray(
              rsvps.eventId,
              futureEvents.map((e) => e.id),
            ),
          ),
        );
    }

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
