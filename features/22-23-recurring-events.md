# Sprint 13: Recurring minyans — #22 weekly recurring, #23 daily recurring

> Sprint 13
> Stories: Taiga #22, #23

## Goal

A group and its recurring minyan are the same thing. When an organiser creates a group, they set the weekly or daily schedule, and future minyan instances are generated automatically. #22: weekly ("every Wednesday at 7pm"). #23: daily with prayer-service time-of-day awareness.

There is no separate series screen. Invite links, members, organisers, the group feed, and recurrence all live on the group. Service labels and quorum remain supported in the data model for future generic event types, but the standard group form does not ask for them — the time makes the service obvious, and a minyan quorum is 10.

## What exists

- `groups` table: the organisational home for members, invite links, events, and one recurring schedule.
- `minyans` table: the group's recurrence configuration (schedule JSON `{weekdays:[0-6], time:"HH:MM"}`, `locationText`, optional `serviceTag`, `quorumTarget`, `ownerId`) plus `groupId` (nullable, unique, FK to groups). It is an implementation detail of the group, not a separate UI.
- `events` table: recurring instances have both `minyanId` and `groupId`; one-off group events have `groupId` only. Generated events keep their own RSVPs.
- `packages/core/src/schedule.ts`: `parseWeeklySchedule`, `nextOccurrence`, `isValidWeeklySchedule`, `WeeklySchedule` type.
- `packages/core/src/recurrence.ts`: `occurrencesBetween` and `DEFAULT_HORIZON_DAYS` (28).
- `packages/db/src/generate-instances.ts`: `generateInstances` materializes missing future instances, sets the group link, and is idempotent per `(minyanId, date)`.
- `apps/web/src/components/group-form.tsx` + `recurrence-fields.tsx`: group creation includes weekdays and time.
- `apps/web/src/app/groups/[slug]/page.tsx`: shows the recurring schedule and the group's full future feed; legacy groups without a schedule get an inline one-time setup form for organisers.
- `apps/web/src/lib/actions/create-group.ts`: creates the group, its minyan schedule row, and generated instances together.
- `apps/web/src/lib/actions/group-recurrence.ts`: adds a schedule to a group created before this change.
- Migration `0007_romantic_green_goblin.sql` adds `service_tag` to `events` and `minyans`; migration `0008_dizzy_siren.sql` adds `minyans.group_id` and its unique index.

## Acceptance Criteria

### #22 — Weekly recurring

- [x] Group creation asks for the recurring schedule: weekday(s) select and time, alongside the group name and optional location/description. (The old Type field is gone; every event is a minyan.)
- [x] Creates the `groups` row and a linked `minyans` row, then generates the next N instances (default 4 weeks ahead) as `events` rows with both `minyanId` and `groupId` set
- [x] Each instance is a separate group event with its own RSVPs
- [x] Regeneration: `generateInstances` inserts any missing future instances up to the horizon and skips existing `(minyanId, date)` pairs
- [x] Generated instances appear in the group page's **Upcoming minyans** feed and on `/my` once the user RSVPs (the current `/my` feed is RSVP-only)

### #23 — Daily recurring with service awareness

- [x] The same group creation form supports a daily minyan by selecting all seven weekdays
- [x] `serviceTag` remains supported on minyans and generated events (Shacharit / Mincha / Maariv), but is not collected by the standard form
- [x] The form asks for a time; users infer the service from the time, and per-day time variation remains future work
- [x] The group page shows the recurring schedule with next feed entries, so generated events are reachable even when `/my` has no RSVP

## Constraints

- Follow existing code style; server actions pattern; Card UI components.
- Schema changes need drizzle migration + DB tests (minyan insert, group link, instance generation idempotency, serviceTag).
- All tests/typecheck/build must pass.

## Implementation Notes

**Integration with current main (2026-10-21):**

- Merged the original WIP commit (based on `c507cab`) with current `main`, including the group/membership work and the grouped, RSVP-only `/my` feed.
- Renumbered the service-tag migration from `0005_bumpy_dracula` to `0007_romantic_green_goblin`; the snapshot chain is `0004 → 0005 → 0006 → 0007`.
- Generated events now use the group/minyan name as their title so cards are identifiable with the current event-card design.

**Product change (2026-10-21): series and groups are the same thing**

- Removed the standalone `/minyans` list, `/minyans/new`, `/minyans/[id]`, `MinyanForm`, and `createMinyan`; removed the **My series** button from `/my`.
- `createGroup` now validates weekdays + time, inserts the group and its `minyans` schedule row, then generates instances. If generation fails it removes the group, cascading the schedule and any generated events.
- `minyans.group_id` is nullable for legacy rows, unique when set, and cascades on group delete. New groups always set it. Migration `0008` also backfills an existing series to its owner's group when the owner has exactly one group, and copies that group id onto the series' generated events; ambiguous owners are left unlinked.
- `generateInstances` copies `minyan.groupId` onto every generated event, so group pages, membership, invite links, and `/my` group sections all work with recurring instances.
- Existing groups without a schedule get an organiser-only **Recurring schedule** setup form on the group page; new groups set it during creation.
- The group page shows the schedule in its details and still uses the existing full group feed for upcoming instances.
- The group form no longer asks for **Service** or **Quorum target**. The schema/action support remains for future generic event types, with service `null` and quorum `10`.
- Service label remains conditionally displayed on the event detail page as **Service**, but standard groups leave it unset; legacy Type is not shown.

**Verification:**

1. Sign in as an owner.
2. Open `/my` → **New group**.
3. Create a group with one or more weekdays and a time.
4. Confirm the group page shows the recurring schedule and generated instances under **Upcoming minyans**.
5. RSVP to a generated instance and confirm it appears under that group on `/my`.
6. Select all seven weekdays to confirm daily generation.
7. Open an existing group without a schedule as its organiser and confirm the inline setup form generates instances.
8. Run `pnpm test`, `pnpm typecheck`, `pnpm lint`, and `pnpm build`.

**Not in scope yet:**

- Background/automatic regeneration after the 28-day horizon (the helper exists; creation seeds the horizon).
- Editing or removing an existing group's schedule. The one-time legacy setup is supported; changing a schedule would need a reconciliation step for already-generated events and RSVPs.
- Multiple recurring schedules per group (the model is one schedule per group).
