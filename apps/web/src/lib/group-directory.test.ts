import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { createMemoryDb, groupMembers, groups, users } from "@minyanmate/db";
import { getGroupDirectory } from "./group-directory";

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

async function seedGroup(db: Db, ownerId: string, slug: string, name = slug) {
  const [group] = await db
    .insert(groups)
    .values({ name, slug, typeTag: "minyan", ownerId })
    .returning();
  if (!group) throw new Error("group insert failed");
  return group;
}

describe("getGroupDirectory", () => {
  it("counts the owner as a member without a group_members row", async () => {
    const db = migratedDb();
    const owner = await seedUser(db, "Owner");
    const group = await seedGroup(db, owner.id, "owned");

    const entries = await getGroupDirectory(db, owner.id);

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      role: "owner",
      memberCount: 1,
      canManage: true,
    });
    expect(entries[0]?.group.id).toBe(group.id);
  });

  it("assigns roles, counts everyone, and excludes unrelated groups", async () => {
    const db = migratedDb();
    const owner = await seedUser(db, "Owner");
    const organiser = await seedUser(db, "Organiser");
    const member = await seedUser(db, "Member");
    const outsider = await seedUser(db, "Outsider");
    const shared = await seedGroup(db, owner.id, "shared", "Shared Minyan");
    const unrelated = await seedGroup(db, owner.id, "unrelated", "Unrelated");
    await db.insert(groupMembers).values([
      { groupId: shared.id, userId: organiser.id, role: "organiser" },
      { groupId: shared.id, userId: member.id, role: "member" },
      { groupId: unrelated.id, userId: outsider.id, role: "member" },
    ]);

    const organiserEntries = await getGroupDirectory(db, organiser.id);
    expect(organiserEntries).toHaveLength(1);
    expect(organiserEntries[0]).toMatchObject({
      role: "organiser",
      memberCount: 3,
      canManage: true,
    });

    const memberEntries = await getGroupDirectory(db, member.id);
    expect(memberEntries[0]).toMatchObject({
      role: "member",
      memberCount: 3,
      canManage: false,
    });

    const ownerEntries = await getGroupDirectory(db, owner.id);
    expect(ownerEntries.map((entry) => entry.group.name)).toEqual(["Shared Minyan", "Unrelated"]);
    expect(ownerEntries[0]).toMatchObject({ role: "owner", memberCount: 3 });

    expect(await getGroupDirectory(db, outsider.id)).toHaveLength(1);
  });
});
