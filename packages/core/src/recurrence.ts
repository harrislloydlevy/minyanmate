import type { WeeklySchedule } from "./schedule";

/** How far ahead instance generation materializes by default (4 weeks). */
export const DEFAULT_HORIZON_DAYS = 28;

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * All dates (YYYY-MM-DD strings) in the schedule between `from` (inclusive of tomorrow)
 * and horizon days ahead. Weekday numbers are JS getDay() (0=Sunday).
 */
export function occurrencesBetween(
  schedule: WeeklySchedule,
  from: Date,
  horizonDays = DEFAULT_HORIZON_DAYS,
): string[] {
  const dates: string[] = [];
  for (let offset = 1; offset <= horizonDays; offset++) {
    const candidate = new Date(
      from.getFullYear(),
      from.getMonth(),
      from.getDate() + offset,
    );
    if (schedule.weekdays.includes(candidate.getDay())) {
      dates.push(toDateKey(candidate));
    }
  }
  return dates;
}
