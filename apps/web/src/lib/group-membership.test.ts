import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { createMemoryDb, groupMembers, groups, users } from "@minyanmate/db";
import { getMemberGroupIds } from "./group-membership";

const migrationsFolder = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
  "..",
  "packages",
  "db",
  "drizzle",
);

function migratedDb() {
  const handle = createMemoryDb();
  migrate(handle.db, { migrationsFolder });
  return handle.db;
}

type Db = ReturnType<typeof migratedDb>;

async function seedUser(db: Db, name: string) {
  const [user] = await db.insert(users).values({ name }).returning();
  if (!user) throw new Error("user insert failed");
  return user;
}

async function seedGroup(db: Db, ownerId: string, slug: string) {
  const [group] = await db
    .insert(groups)
    .values({
      name: slug,
      slug,
      typeTag: "minyan",
      ownerId,
    })
    .returning();
  if (!group) throw new Error("group insert failed");
  return group;
}

describe("getMemberGroupIds", () => {
  it("counts the owner as a member without a group_members row", async () => {
    const db = migratedDb();
    const owner = await seedUser(db, "Owner");
    const group = await seedGroup(db, owner.id, "owned");

    const memberGroupIds = await getMemberGroupIds(db, owner.id, [group.id]);

    expect(memberGroupIds).toEqual(new Set([group.id]));
  });

  it("includes joined groups and excludes groups the user does not belong to", async () => {
    const db = migratedDb();
    const owner = await seedUser(db, "Owner");
    const member = await seedUser(db, "Member");
    const joined = await seedGroup(db, owner.id, "joined");
    const other = await seedGroup(db, owner.id, "other");
    await db.insert(groupMembers).values({ groupId: joined.id, userId: member.id, role: "member" });

    const memberGroupIds = await getMemberGroupIds(db, member.id, [joined.id, other.id]);

    expect(memberGroupIds).toEqual(new Set([joined.id]));
  });
});
