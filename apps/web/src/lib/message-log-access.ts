import { eq } from "drizzle-orm";
import { users } from "@minyanmate/db/schema";
import { db } from "@/lib/db";

function isProduction(): boolean {
  return (
    process.env.APP_ENV === "production" ||
    process.env.NODE_ENV === "production"
  );
}

/**
 * The outbox contains recipient phone numbers and message bodies, so the UI is
 * admin-only in production. In development any signed-in user can inspect it,
 * which makes it usable as a local debugging tool without seeding an admin.
 */
export async function canViewMessageLog(userId: string): Promise<boolean> {
  if (!isProduction()) return true;

  const [user] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return user?.role === "admin";
}

export { isProduction };
