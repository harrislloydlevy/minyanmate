import { describe, expect, it } from "vitest";
import {
  EDIT_NOTIFICATION_WINDOW_MS,
  isWithinNotificationWindow,
  relativeAge,
} from "./edits";
import { evaluateQuorumTransition, quorumState } from "./quorum";
import {
  isValidWeeklySchedule,
  nextOccurrence,
  parseWeeklySchedule,
  type WeeklySchedule,
} from "./schedule";

describe("schedule", () => {
  it("parses valid schedule JSON", () => {
    const schedule = parseWeeklySchedule('{"weekdays":[0,2,4],"time":"06:30"}');
    expect(schedule).toEqual({ weekdays: [0, 2, 4], time: "06:30" });
  });

  it("rejects invalid schedules", () => {
    expect(parseWeeklySchedule("not json")).toBeNull();
    expect(parseWeeklySchedule('{"weekdays":[7],"time":"06:30"}')).toBeNull();
    expect(parseWeeklySchedule('{"weekdays":[0],"time":"6:30"}')).toBeNull();
    expect(parseWeeklySchedule('{"weekdays":[],"time":"25:00"}')).toBeNull();
  });

  it("finds the next occurrence later today", () => {
    // Sunday Sept 6 2026, 05:00 -> shacharis 06:30 same day
    const schedule: WeeklySchedule = { weekdays: [0], time: "06:30" };
    const from = new Date(2026, 8, 6, 5, 0);
    expect(nextOccurrence(schedule, from)).toEqual(new Date(2026, 8, 6, 6, 30));
  });

  it("finds the next occurrence next week when today already passed", () => {
    const schedule: WeeklySchedule = { weekdays: [0], time: "06:30" };
    const from = new Date(2026, 8, 6, 7, 0); // Sunday after 06:30
    expect(nextOccurrence(schedule, from)).toEqual(new Date(2026, 8, 13, 6, 30));
  });

  it("skips weekdays not in the schedule", () => {
    const schedule: WeeklySchedule = { weekdays: [2], time: "20:45" }; // Tuesdays
    const from = new Date(2026, 8, 6, 12, 0); // Sunday noon
    expect(nextOccurrence(schedule, from)).toEqual(new Date(2026, 8, 8, 20, 45));
  });

  it("returns null for an empty weekday list", () => {
    expect(nextOccurrence({ weekdays: [], time: "06:30" }, new Date(2026, 8, 6))).toBeNull();
  });

  it("validates unknown values", () => {
    expect(isValidWeeklySchedule({ weekdays: [1], time: "08:00" })).toBe(true);
    expect(isValidWeeklySchedule(null)).toBe(false);
    expect(isValidWeeklySchedule({ weekdays: "monday", time: "08:00" })).toBe(false);
  });
});

describe("quorum", () => {
  it("marks reached at exactly the target", () => {
    expect(quorumState(10, 10).reached).toBe(true);
    expect(quorumState(9, 10).reached).toBe(false);
  });

  it("detects the crossing into quorum", () => {
    const transition = evaluateQuorumTransition(quorumState(9, 10), quorumState(10, 10));
    expect(transition).toBe("reached");
  });

  it("detects the crossing out of quorum", () => {
    const transition = evaluateQuorumTransition(quorumState(10, 10), quorumState(9, 10));
    expect(transition).toBe("lost");
  });

  it("ignores changes that do not cross the threshold", () => {
    expect(evaluateQuorumTransition(quorumState(5, 10), quorumState(6, 10))).toBe("none");
    expect(evaluateQuorumTransition(quorumState(11, 10), quorumState(12, 10))).toBe("none");
  });
});

describe("event edit notification window", () => {
  const now = new Date(2026, 8, 22, 12, 0, 0);

  it("notifies for an edit made moments ago", () => {
    const editedAt = new Date(now.getTime() - 30_000);
    expect(isWithinNotificationWindow(editedAt, now)).toBe(true);
  });

  it("notifies at exactly one hour and not a millisecond later", () => {
    const exactlyOneHour = new Date(now.getTime() - EDIT_NOTIFICATION_WINDOW_MS);
    const justOver = new Date(now.getTime() - EDIT_NOTIFICATION_WINDOW_MS - 1);
    expect(isWithinNotificationWindow(exactlyOneHour, now)).toBe(true);
    expect(isWithinNotificationWindow(justOver, now)).toBe(false);
  });

  it("does not notify for an older edit", () => {
    const editedAt = new Date(now.getTime() - 5 * 60 * 60 * 1000);
    expect(isWithinNotificationWindow(editedAt, now)).toBe(false);
  });

  it("does not notify when the event was never edited", () => {
    expect(isWithinNotificationWindow(null, now)).toBe(false);
    expect(isWithinNotificationWindow(undefined, now)).toBe(false);
  });

  it("treats a future timestamp as just-now (clock skew guard)", () => {
    const future = new Date(now.getTime() + 60_000);
    expect(isWithinNotificationWindow(future, now)).toBe(true);
  });
});

describe("relative age buckets", () => {
  const now = new Date(2026, 8, 22, 12, 0, 0);

  it("buckets seconds, minutes, hours and days", () => {
    const ago = (ms: number) => new Date(now.getTime() - ms);
    expect(relativeAge(ago(10_000), now)).toBe("just now");
    expect(relativeAge(ago(5 * 60_000), now)).toBe("minutes");
    expect(relativeAge(ago(3 * 60 * 60_000), now)).toBe("hours");
    expect(relativeAge(ago(48 * 60 * 60_000), now)).toBe("days");
  });

  it("defaults to just now for a missing timestamp", () => {
    expect(relativeAge(null, now)).toBe("just now");
  });
});
