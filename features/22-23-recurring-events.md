# Sprint 13: Recurring events — #22 weekly recurring, #23 daily recurring

> Sprint 13
> Stories: https://taiga.tiyrah.duckdns.org/project/minyanmate/us/22, /us/23

## Goal

Organisers set a schedule once and future event instances are generated automatically. #22: weekly ("every Wednesday at 7pm"). #23: daily with prayer-service time-of-day awareness (Shacharit/Mincha/Maariv labels, per-day times).

## What exists

- `minyans` table: name, description, locationText, schedule (JSON text: {weekdays:[0-6], time:"HH:MM"}), serviceTag, quorumTarget, status, ownerId — this IS the recurring series entity (a "minyan" = a recurring prayer group).
- `events` table: has nullable `minyanId` FK to minyans, title, date (YYYY-MM-DD), startsAt (YYYY-MM-DDTHH:MM), locationText, notes, status, quorumTarget, ownerId, and `serviceTag`. One-off events set minyanId=null.
- `packages/core/src/schedule.ts`: `parseWeeklySchedule`, `nextOccurrence`, `isValidWeeklySchedule`, `WeeklySchedule` type.
- `packages/core/src/recurrence.ts`: `occurrencesBetween` and `DEFAULT_HORIZON_DAYS` (28).
- `packages/db/src/generate-instances.ts`: `generateInstances` materializes missing future instances and is idempotent per `(minyanId, date)`.
- `apps/web/src/app/minyans/`: creation form, series list, and series detail page.
- Migration `0007_romantic_green_goblin.sql` adds `service_tag` to `events` and `minyans`.

## Acceptance Criteria

### #22 — Weekly recurring
- [x] UI to create a weekly recurring series: name, weekday(s) select, time, location, quorum target, and service label. (The old Type field is gone; every event is a minyan.)
- [x] Creates a `minyans` row; generates the next N instances (default 4 weeks ahead) as `events` rows with minyanId set
- [x] Each instance is a separate event with its own RSVPs
- [x] Regeneration: `generateInstances` inserts any missing future instances up to the horizon and skips existing `(minyanId, date)` pairs
- [x] Generated instances are visible in the series detail page and appear on `/my` once the user RSVPs (the current `/my` feed is RSVP-only)

### #23 — Daily recurring with service awareness
- [x] Same creation UI supports a daily series by selecting all seven weekdays
- [x] `serviceTag` label on generated events (Shacharit / Mincha / Maariv), copied from the minyan
- [x] The minyan creation form lets the organiser pick a service label and time; per-day time variation remains future work
- [x] Series list page `/minyans` shows the user's series with next occurrence, upcoming instance count, and a link to the series detail page

## Constraints

- Follow existing code style; server actions pattern; Card UI components.
- Schema changes need drizzle migration + DB tests (minyan insert, instance generation idempotency, serviceTag).
- All tests/typecheck/build must pass.

## Implementation Notes

**Integration with current main (2026-10-21):**
- Merged the original WIP commit (based on `c507cab`) with current `main`, including the group/membership work and the grouped, RSVP-only `/my` feed.
- Renumbered the service-tag migration from `0005_bumpy_dracula` to `0007_romantic_green_goblin`; the snapshot chain is `0004 → 0005 → 0006 → 0007`.
- Generated events now use the series name as their title so cards are identifiable with the current event-card design.
- Added `/minyans/[id]` because `/my` no longer shows un-RSVP'd events. It lists all future instances for the series, including cancelled events with the shared cancelled badge.
- Replaced the `/my` **New minyan** button with **My series** (`/minyans`); creation starts from the series list.
- The series list counts only future events, not the whole generated history.
- Service label is displayed on the event detail page as **Service**; legacy Type is not shown.

**Verification:**
1. Sign in as an owner.
2. Open **My series** → **New minyan**.
3. Create a series with one or more weekdays, a time, and a service label.
4. Confirm the series appears on `/minyans` with next occurrence and upcoming count.
5. Open **View events** and confirm each generated instance links to an event with the series title, service label, location, and RSVP controls.
6. Select all seven weekdays to confirm daily generation.
7. Run `pnpm test`, `pnpm typecheck`, `pnpm lint`, and `pnpm build`.

**Not in scope yet:**
- Background/automatic regeneration after the 28-day horizon (the helper exists; creation seeds the horizon).
- Linking a recurring series to a group (series are owner-scoped in this sprint).
