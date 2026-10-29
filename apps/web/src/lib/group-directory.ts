import { eq, inArray, or } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { groupMembers, groups } from "@minyanmate/db/schema";
import type * as schema from "@minyanmate/db/schema";

type Db = BetterSQLite3Database<typeof schema>;

export type GroupDirectoryRole = "owner" | "organiser" | "member";

export interface GroupDirectoryEntry {
  group: typeof groups.$inferSelect;
  role: GroupDirectoryRole;
  memberCount: number;
  canManage: boolean;
}

/**
 * Every group the user owns or belongs to, with their role and the total
 * member count. Owners count as members even without a `group_members` row.
 */
export async function getGroupDirectory(
  database: Db,
  userId: string,
): Promise<GroupDirectoryEntry[]> {
  const memberships = await database
    .select({ groupId: groupMembers.groupId, role: groupMembers.role })
    .from(groupMembers)
    .where(eq(groupMembers.userId, userId));

  const memberGroupIds = memberships.map((membership) => membership.groupId);
  const roleByGroup = new Map(
    memberships.map((membership) => [membership.groupId, membership.role]),
  );

  const userGroups = await database
    .select()
    .from(groups)
    .where(
      memberGroupIds.length > 0
        ? or(eq(groups.ownerId, userId), inArray(groups.id, memberGroupIds))
        : eq(groups.ownerId, userId),
    );

  if (userGroups.length === 0) return [];

  const memberRows = await database
    .select({ groupId: groupMembers.groupId, userId: groupMembers.userId })
    .from(groupMembers)
    .where(
      inArray(
        groupMembers.groupId,
        userGroups.map((group) => group.id),
      ),
    );

  const membersByGroup = new Map<string, Set<string>>();
  for (const group of userGroups) {
    membersByGroup.set(group.id, new Set([group.ownerId]));
  }
  for (const row of memberRows) {
    membersByGroup.get(row.groupId)?.add(row.userId);
  }

  return userGroups
    .map((group) => {
      const role: GroupDirectoryRole =
        group.ownerId === userId ? "owner" : (roleByGroup.get(group.id) ?? "member");
      return {
        group,
        role,
        memberCount: membersByGroup.get(group.id)?.size ?? 1,
        canManage: role !== "member",
      };
    })
    .sort((a, b) => a.group.name.localeCompare(b.group.name));
}
