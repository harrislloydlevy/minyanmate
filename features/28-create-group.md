# Feature 28: As a user, I can create a new group with a name and default location so events inherit those settings

> Sprint 11 — Cancel & Groups
> Source story: Taiga #28

## Goal

Groups are the organisational home. A shul, a workplace, a neighbourhood minyan. When creating a group, the user sets defaults that all future events inherit — saving time on every event creation.

## Acceptance Criteria

- [x] Group creation form: name, recurring weekdays/time, default location, optional description
- [x] Every new group gets one recurring minyan schedule and generated future instances
- [x] Groups are minyan groups only — the minyan/pickup/both type was removed after product testing; no type labels remain anywhere in the app
- [x] Default location auto-filled on new events created in this group
- [x] Events created from a group are linked to it and shown on `/my` as `<Event Title> - <Group Name>`
- [x] Group has a unique slug for URLs
- [x] Creator is automatically the group organiser
- [x] Group creation takes under 30 seconds

## Constraints & Conventions

- Follow the repository's existing architecture, code style and conventions.
- Keep changes scoped to this feature only — no unrelated refactors.
- Never commit secrets, credentials, tokens or environment-specific values.
- Run the repo's tests/build and make them pass before committing.

## Definition of Done

- [x] Feature implemented and working per the Goal / Acceptance Criteria
- [x] Tests / build pass where the repo defines them (`pnpm test`, `pnpm typecheck`, `pnpm lint`)
- [x] This feature file is committed together with the code
- [x] A short **Implementation Notes** section is appended below

## Implementation Notes

**What was built (OpenCode nemotron-3.5-lightning-free + inline fixes):**

- `groups` table in schema (name, slug unique, typeTag legacy minyan/pickup/both, defaultLocation, description, ownerId FK cascade) + drizzle migration `0003_third_sage`
- 4 new DB tests: full insert, duplicate slug rejection, owner cascade delete, nullable fields
- `createGroup` server action: session check, validation, slug generation with collision suffix
- `GroupForm` client component with name/defaultLocation/description fields
- `/groups/[slug]` detail page with organiser name and owner badge
- `/groups/new` page with back button
- "New group" button on `/my` next to "New event"

**Branch review follow-ups (superseded by the type removal below):**

- The type select defaulted to an empty "No type" while the action rejected an empty type — the user had to notice and change it. It was made a required select with an explicit "Select a type" placeholder.
- Added the third documented type, `both` (app-level enum on a text column — no migration needed), so AC 1 matched the spec.
- Added "New event for this group" on the group page → `/events/new?group=<slug>`. The new-event page loads the group and pre-fills `defaultLocation` and the event type; the form notes which group it is creating for.
- Added a "Your groups" list to `/my` (groups you own). Previously a created group had no navigation entry point after you left its page.
- Fixed an unused test helper in `packages/db/src/index.test.ts` that failed lint.
- The original commit also deleted `.opencode-prompt.md` (leftover agent prompt, unrelated to this feature); restored to keep the branch scoped.
- Migration `0003_third_sage` applied to `data/dev.db`.

**Product change (2026-10-21): group type removed**

- "They're all just minyans": removed the Type field entirely. The group form now collects name, default location, and optional description; `createGroup` only validates the name.
- `groups.type_tag` is NOT NULL, so new groups store `"minyan"` in the now-legacy column. No migration was added for the column itself; it can be dropped later.
- Removed the type labels from the group detail page and from the "Your groups" list on `/my`.
- Creating an event from a group now only pre-fills the default location (the event type prefill is gone, since events have no type either).

**Follow-up (2026-10-21): events persist their group**

- Added `events.group_id` (nullable FK to `groups.id`, indexed) in migration `0005_unknown_quentin_quire`; applied to `data/dev.db`.
- Creating an event from a group page now stores the group id: `/events/new?group=<slug>` passes a hidden `groupId`; `createEvent` validates that the group exists and inserts the link.
- `/my` joins `groups` and renders the card title as `<Event Title> - <Group Name>` when the event is linked; unlinked or legacy events keep the plain title.
- The group reference is set only at creation time. There is still no group event feed on the group page, and changing a group's defaults does not update existing events.

**Follow-up (2026-10-21): organiser-only group events + member groups**

- "New event for this group" is now shown only to the owner and co-organisers. A regular member opening `/events/new?group=<slug>` is redirected back to the group page, and `createEvent` rejects a `groupId` the user cannot manage — direct form posts included.
- `/my` → "Your groups" now lists every group the user owns or belongs to, not just owned groups.
- The permission check is shared via `canManageGroup` in `apps/web/src/lib/group-permissions.ts`, used by the group actions, the new-event page, and `createEvent`.

**Follow-up (2026-10-21): group schedule and RSVP-only `/my`**

- The group page now has an "Upcoming minyans" feed showing **all** future events for that group, including cancelled ones with a badge. It is the full group schedule.
- `/my` is RSVP-only. A group section appears only when the user has RSVP'd to an upcoming, non-cancelled event in that group, and it lists every such RSVP'd event with a **Details** button linking to the full group page. Un-RSVP'd group events are not shown on `/my`.

**Follow-up (2026-10-21): groups own their recurring schedule**

- A group and its recurring minyan are now the same thing. Group creation validates weekdays and time, then creates the group, its linked `minyans` schedule row, and the next 28 days of events.
- Generated instances carry both `minyanId` and `groupId`, so invite links, membership, the group feed, and `/my` group sections all apply to recurrence.
- The group page shows the recurring schedule. Groups created before this change get an organiser-only inline "Recurring schedule" setup form.
- The standalone `/minyans` screens and the **My series** button are gone. `/my` keeps **New group**, which now includes the schedule.
- Migration `0008_dizzy_siren` adds `minyans.group_id` (unique, nullable for legacy rows, cascade on group delete). Migration head is now `0008`.

**Known gaps:**

- There is no `events.group_id` editing yet. The link is create-only for now.
- `events.group_id` was added with `ALTER TABLE ... ADD COLUMN`, so SQLite does not record the schema's `ON DELETE SET NULL` (it lands as NO ACTION). Group deletion is not implemented; if it is added, null out `events.group_id` explicitly or rebuild the table.
- A group's schedule can be set once. Editing the weekdays/time after instances exist is not implemented; it needs reconciliation for generated events and RSVPs.

**How to verify:**

1. Sign in → `/my` → "New group". Create one with a name, weekdays, time, default location, and description — there is no Type field.
2. Confirm the group page shows the recurring schedule and generated minyans under "Upcoming minyans".
3. A second group with the same name gets a unique slug suffix.
4. Back on `/my`, a group section appears only after you RSVP to one of its events; it lists that RSVP'd event with a **Details** button linking to the full group page.
5. As the organiser, click "New event for this group" — fill the title/date/time and create it. The event appears on the group page under "Upcoming minyans"; it appears on `/my` only after you RSVP.
6. Join the group as a regular member via an invite link: the "New event for this group" button and schedule setup are hidden and `/events/new?group=<slug>` redirects back to the group page. Their `/my` page shows the group only after they RSVP to an event in it.
7. As that member, click "Leave group" and confirm: you return to `/my` and the group section is gone unless you still have an RSVP'd upcoming event in that group. The owner has no leave button.
8. Tests: `pnpm test` — 54 passing (core 23, db 24, whatsapp 7); `pnpm typecheck` and `pnpm lint` clean.
