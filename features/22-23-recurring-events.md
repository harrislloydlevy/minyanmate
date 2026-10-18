# Sprint 13: Recurring events — #22 weekly recurring, #23 daily recurring

> Sprint 13
> Stories: https://taiga.tiyrah.duckdns.org/project/minyanmate/us/22, /us/23

## Goal

Organisers set a schedule once and future event instances are generated automatically. #22: weekly ("every Wednesday at 7pm"). #23: daily with prayer-service time-of-day awareness (Shacharit/Mincha/Maariv labels, per-day times).

## What exists

- `minyans` table: name, description, locationText, schedule (JSON text: {weekdays:[0-6], time:"HH:MM"}), quorumTarget, status, ownerId — this IS the recurring series entity (a "minyan" = a recurring prayer group).
- `events` table: has nullable `minyanId` FK to minyans, date (YYYY-MM-DD), startsAt (YYYY-MM-DDTHH:MM), locationText, notes, typeTag, status, quorumTarget, ownerId. One-off events set minyanId=null.
- `packages/core/src/schedule.ts`: `parseWeeklySchedule`, `nextOccurrence`, `isValidWeeklySchedule`, `WeeklySchedule` type.
- `packages/core/src/core.test.ts`: tests for those.
- The `jobs` table: type, payload JSON, runAt, status pending/processing/done/failed, attempts, maxAttempts — durable queue, currently unused.
- No UI creates minyans yet; the seed script inserts one minyan with schedule text.

## Acceptance Criteria

### #22 — Weekly recurring
- [ ] UI to create a weekly recurring series: name, weekday(s) select, time, location, quorum target, type
- [ ] Creates a `minyans` row; generates the next N instances (default 4 weeks ahead) as `events` rows with minyanId set
- [ ] Each instance is a separate event with its own RSVPs
- [ ] Regeneration: a helper that, given a minyan, inserts any missing future instances up to the horizon (idempotent — existing (minyanId, date) pairs are skipped via the existing unique index)
- [ ] Events feed (/my) shows generated instances like any other event

### #23 — Daily recurring with service awareness
- [ ] Same creation UI but "daily" mode: generates every day within horizon
- [ ] `serviceTag` label on events for minyan type: Shacharit / Mincha / Maariv / custom (new nullable text column on events, enum-ish ["shacharit","mincha","maariv"] + free label on the minyan)
- [ ] The minyan creation form lets the organiser pick a service label and time; per-day time variation is future work (out of scope) — single time is fine
- [ ] Series list page: /minyans page showing the user's series with next occurrence + instance count

## Constraints

- Follow existing code style; server actions pattern; Card UI components.
- Schema changes need drizzle migration + DB tests (minyan insert, instance generation idempotency, serviceTag).
- All tests/typecheck/build must pass.

## Implementation Notes

_(Appended after implementation.)_
