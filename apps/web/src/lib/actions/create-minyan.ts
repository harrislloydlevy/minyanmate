"use server";

import { DEFAULT_HORIZON_DAYS } from "@minyanmate/core";
import { generateInstances, minyans } from "@minyanmate/db";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export type CreateMinyanResult =
  | { success: true; minyanId: string; instances: number }
  | { success: false; error: string };

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
const SERVICE_TAGS = ["shacharit", "mincha", "maariv"] as const;

export async function createMinyan(
  _prev: CreateMinyanResult | null,
  form: FormData,
): Promise<CreateMinyanResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { success: false, error: "You must be signed in." };

  const name = form.get("name")?.toString().trim();
  const time = form.get("time")?.toString().trim();
  const weekdaysRaw = form.getAll("weekdays").map((v) => v.toString());
  const serviceTag = form.get("serviceTag")?.toString().trim() || null;
  const locationText = form.get("locationText")?.toString().trim() || null;
  const quorumRaw = form.get("quorumTarget")?.toString().trim();
  const horizonRaw = form.get("horizonDays")?.toString().trim();

  if (!name) return { success: false, error: "Name is required." };

  const weekdays = [...new Set(weekdaysRaw.map(Number))].sort((a, b) => a - b);
  if (weekdays.length === 0) {
    return { success: false, error: "Pick at least one weekday." };
  }
  if (!weekdays.every((d) => Number.isInteger(d) && d >= 0 && d <= 6)) {
    return { success: false, error: "Weekdays must be between 0 and 6." };
  }

  if (!time || !TIME_RE.test(time)) {
    return { success: false, error: "Time must be in HH:MM format." };
  }

  if (serviceTag !== null && !SERVICE_TAGS.includes(serviceTag as (typeof SERVICE_TAGS)[number])) {
    return { success: false, error: "Service must be shacharit, mincha or maariv." };
  }

  const quorumTarget = quorumRaw ? Number(quorumRaw) : 10;
  if (!Number.isInteger(quorumTarget) || quorumTarget < 1) {
    return { success: false, error: "Quorum target must be a positive number." };
  }

  const horizonDays = horizonRaw ? Number(horizonRaw) : DEFAULT_HORIZON_DAYS;
  if (!Number.isInteger(horizonDays) || horizonDays < 1 || horizonDays > 90) {
    return { success: false, error: "Horizon must be between 1 and 90 days." };
  }

  try {
    const [minyan] = await db
      .insert(minyans)
      .values({
        name,
        schedule: JSON.stringify({ weekdays, time }),
        serviceTag: serviceTag as (typeof SERVICE_TAGS)[number] | null,
        locationText,
        quorumTarget,
        ownerId: session.user.id,
      })
      .returning();

    if (!minyan) return { success: false, error: "Failed to create minyan." };

    const instances = await generateInstances(db, minyan, horizonDays);
    return { success: true, minyanId: minyan.id, instances: instances.length };
  } catch {
    return { success: false, error: "An unexpected error occurred." };
  }
}
