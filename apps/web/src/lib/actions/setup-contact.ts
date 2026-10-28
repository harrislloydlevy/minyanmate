"use server";

import { eq } from "drizzle-orm";
import { users } from "@minyanmate/db/schema";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export type SetupContactInfo = {
  name: string | null;
  phoneNumber: string | null;
  email: string | null;
  preferredContactMethod: "phone" | "email" | "whatsapp" | null;
} | null;

export async function getSetupContact(): Promise<SetupContactInfo> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;

  try {
    const [user] = await db
      .select({
        invitedById: users.invitedById,
      })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    if (!user?.invitedById) return null;

    const [inviter] = await db
      .select({
        name: users.name,
        phoneNumber: users.phoneNumber,
        email: users.email,
        preferredContactMethod: users.preferredContactMethod,
      })
      .from(users)
      .where(eq(users.id, user.invitedById))
      .limit(1);

    if (!inviter) return null;
    return inviter;
  } catch {
    return null;
  }
}
