/** Weekly recurrence: which weekdays (0 = Sunday … 6 = Saturday) and at what local time. */
export interface WeeklySchedule {
  /** Sorted, unique weekday numbers, 0–6. */
  weekdays: number[];
  /** 24h local time, "HH:MM". */
  time: string;
}

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function isValidWeeklySchedule(value: unknown): value is WeeklySchedule {
  if (typeof value !== "object" || value === null) return false;
  const { weekdays, time } = value as Record<string, unknown>;
  if (!Array.isArray(weekdays)) return false;
  const days = [...new Set(weekdays)];
  if (!days.every((d) => Number.isInteger(d) && d >= 0 && d <= 6)) return false;
  return typeof time === "string" && TIME_RE.test(time);
}

/** Parses a schedule JSON string stored on a minyan; returns null when invalid. */
export function parseWeeklySchedule(json: string): WeeklySchedule | null {
  try {
    const parsed: unknown = JSON.parse(json);
    return isValidWeeklySchedule(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Next occurrence of the schedule at or after `from`.
 * Returns null when the schedule has no weekdays.
 */
export function nextOccurrence(
  schedule: WeeklySchedule,
  from: Date,
): Date | null {
  if (schedule.weekdays.length === 0) return null;

  const [hours, minutes] = schedule.time.split(":").map(Number) as [
    number,
    number,
  ];

  for (let offset = 0; offset < 8; offset++) {
    const candidate = new Date(
      from.getFullYear(),
      from.getMonth(),
      from.getDate() + offset,
      hours,
      minutes,
      0,
      0,
    );
    if (candidate.getTime() > from.getTime() && schedule.weekdays.includes(candidate.getDay())) {
      return candidate;
    }
  }
  return null;
}
