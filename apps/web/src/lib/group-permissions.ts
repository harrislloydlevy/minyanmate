import { and, eq } from "drizzle-orm";
import { groupMembers, groups } from "@minyanmate/db/schema";
import { db } from "@/lib/db";

/**
 * The owner, or any member with the organiser role, can manage the group.
 * Shared by the group actions, the new-event page, and createEvent.
 */
export async function canManageGroup(
  group: { id: string; ownerId: string },
  userId: string,
): Promise<boolean> {
  if (group.ownerId === userId) return true;
  const [row] = await db
    .select({ id: groupMembers.id })
    .from(groupMembers)
    .where(
      and(
        eq(groupMembers.groupId, group.id),
        eq(groupMembers.userId, userId),
        eq(groupMembers.role, "organiser"),
      ),
    )
    .limit(1);
  return !!row;
}

/**
 * The event creator can manage a one-off event; for group events, the group
 * owner and any group organiser can manage it too.
 */
export async function canManageEvent(
  event: { ownerId: string; groupId: string | null },
  userId: string,
): Promise<boolean> {
  if (event.ownerId === userId) return true;
  if (!event.groupId) return false;

  const [group] = await db
    .select({ id: groups.id, ownerId: groups.ownerId })
    .from(groups)
    .where(eq(groups.id, event.groupId))
    .limit(1);
  if (!group) return false;
  return canManageGroup(group, userId);
}
