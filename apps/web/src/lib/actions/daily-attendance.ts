"use server";

import { and, eq } from "drizzle-orm";
import { dailyAttendance } from "@minyanmate/db/schema";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export type DailyAttendanceResult =
  | { success: true }
  | { success: false; error: string };

export async function setDailyAttendance(date: string, attended: boolean): Promise<DailyAttendanceResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { success: false, error: "You must be signed in." };

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { success: false, error: "Invalid date." };
  }

  try {
    const { sql } = await import("drizzle-orm");
    await db
      .insert(dailyAttendance)
      .values({
        userId: session.user.id,
        date,
        attended,
      })
      .onConflictDoUpdate({
        target: [dailyAttendance.userId, dailyAttendance.date],
        set: { attended, updatedAt: sql`(unixepoch())` },
      });
    return { success: true };
  } catch {
    return { success: false, error: "An unexpected error occurred." };
  }
}

export async function getWeeklyDailyAttendance(fromDate: string): Promise<Record<string, boolean>> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return {};

  // Get 7 days starting from fromDate (Monday-Sunday or just 7 consecutive days)
  try {
    const start = new Date(`${fromDate}T00:00:00`);
    const dates: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      dates.push(`${yyyy}-${mm}-${dd}`);
    }

    const rows = await db
      .select()
      .from(dailyAttendance)
      .where(and(eq(dailyAttendance.userId, session.user.id)));

    const result: Record<string, boolean> = {};
    for (const row of rows) {
      if (dates.includes(row.date)) {
        result[row.date] = row.attended;
      }
    }
    return result;
  } catch {
    return {};
  }
}
