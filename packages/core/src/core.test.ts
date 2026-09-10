import { describe, expect, it } from "vitest";
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
    const schedule: WeeklySchedule = { weekdays: [2], time: "20:45" }; // Wednesdays
    const from = new Date(2026, 8, 6, 12, 0); // Sunday noon
    expect(nextOccurrence(schedule, from)).toEqual(new Date(2026, 8, 9, 20, 45));
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
