import { and, eq, inArray } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { groupMembers, groups } from "@minyanmate/db/schema";
import type * as schema from "@minyanmate/db/schema";

type Db = BetterSQLite3Database<typeof schema>;

/**
 * Group IDs the user belongs to. The owner always counts as a member even
 * when there is no `group_members` row for them.
 */
export async function getMemberGroupIds(
  database: Db,
  userId: string,
  groupIds: string[],
): Promise<Set<string>> {
  if (groupIds.length === 0) return new Set();

  const [ownedGroups, memberships] = await Promise.all([
    database
      .select({ id: groups.id })
      .from(groups)
      .where(and(inArray(groups.id, groupIds), eq(groups.ownerId, userId))),
    database
      .select({ groupId: groupMembers.groupId })
      .from(groupMembers)
      .where(and(inArray(groupMembers.groupId, groupIds), eq(groupMembers.userId, userId))),
  ]);

  return new Set([
    ...ownedGroups.map((group) => group.id),
    ...memberships.map((membership) => membership.groupId),
  ]);
}
