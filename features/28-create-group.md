# Feature 28: As a user, I can create a new group with a name and default location so events inherit those settings

> Sprint 11 — Cancel & Groups
> Source story: https://taiga.tiyrah.duckdns.org/project/minyanmate/us/28

## Goal

Groups are the organisational home. A shul, a workplace, a neighbourhood minyan. When creating a group, the user sets defaults that all future events inherit — saving time on every event creation.

## Acceptance Criteria

- [x] Group creation form: name, default location, optional description
- [x] Groups are minyan groups only — the minyan/pickup/both type was removed after product testing; no type labels remain anywhere in the app
- [x] Default location auto-filled on new events created in this group
- [x] Group has a unique slug for URLs
- [x] Creator is automatically the group organiser
- [x] Group creation takes under 30 seconds

## Constraints & Conventions

- Follow the repository's existing architecture, code style and conventions.
- Keep changes scoped to this feature only — no unrelated refactors.
- Never commit secrets, credentials, tokens or environment-specific values.
- Run the repo's tests/build and make them pass before committing.

## Definition of Done

- [x] Feature implemented and working per the Goal / Acceptance Criteria (event↔group persistence excepted — see Known gaps)
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

**Known gaps:**
- Events are not persisted with a group reference (no `events.group_id`). Creating an event from a group pre-fills the defaults, but the event is not linked to the group, so there is no group event feed and later group-default changes do not propagate. Adding the column needs a migration; the migration head is now `0004` (event titles), so branches 5/6 migrations must be renumbered before they land (planned: branch 5 `0004` → `0005`, branch 6 `0005` → `0006`), then implement together with the group event listing.

**How to verify:**
1. Sign in → `/my` → "New group". Create one with a name, default location, and description — there is no Type field.
2. A second group with the same name gets a unique slug suffix.
3. Back on `/my`, the group appears under "Your groups" (name only) and opens its detail page by slug.
4. On the group page, click "New event for this group" — the location is pre-filled and no type is asked for. Creating it returns to `/my`.
5. Tests: `pnpm test` — 37 passing (core 18, db 15, whatsapp 7); `pnpm typecheck` and `pnpm lint` clean.
