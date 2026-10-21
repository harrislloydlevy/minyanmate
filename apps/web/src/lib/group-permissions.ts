import { and, eq } from "drizzle-orm";
import { groupMembers } from "@minyanmate/db/schema";
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
