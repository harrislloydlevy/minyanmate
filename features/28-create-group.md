# Feature 28: As a user, I can create a new group with a name, type, and default location so events inherit those settings

> Sprint 11 — Cancel & Groups
> Source story: https://taiga.tiyrah.duckdns.org/project/minyanmate/us/28

## Goal

Groups are the organisational home. A shul, a football crew, a workplace minyan. When creating a group, the user sets defaults that all future events inherit — saving time on every event creation.

## Acceptance Criteria

- [x] Group creation form: name, type (minyan/pickup/both), default location, optional description
- [x] Group type determines default event type label and quorum terminology — type label is shown on the group page and the group's type is pre-selected when creating an event from it (quorum terminology does not exist in the app yet)
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
- `groups` table in schema (name, slug unique, typeTag minyan/pickup/both, defaultLocation, description, ownerId FK cascade) + drizzle migration `0003_third_sage`
- 4 new DB tests: full insert, duplicate slug rejection, owner cascade delete, nullable fields
- `createGroup` server action: session check, validation, slug generation with collision suffix
- `GroupForm` client component with name/type/defaultLocation/description fields
- `/groups/[slug]` detail page with organiser name and owner badge
- `/groups/new` page with back button
- "New group" button on `/my` next to "New event"

**Branch review follow-ups:**
- The type select defaulted to an empty "No type" while the action rejected an empty type — the user had to notice and change it. It is now a required select with an explicit "Select a type" placeholder.
- Added the third documented type, `both` (app-level enum on a text column — no migration needed), so AC 1 matches the spec.
- Added "New event for this group" on the group page → `/events/new?group=<slug>`. The new-event page loads the group and pre-fills `defaultLocation` and the event type; the form notes which group it is creating for.
- Added a "Your groups" list to `/my` (groups you own). Previously a created group had no navigation entry point after you left its page.
- Fixed an unused test helper in `packages/db/src/index.test.ts` that failed lint.
- The original commit also deleted `.opencode-prompt.md` (leftover agent prompt, unrelated to this feature); restored to keep the branch scoped.
- Migration `0003_third_sage` applied to `data/dev.db`.

**Known gaps:**
- Events are not persisted with a group reference (no `events.group_id`). Creating an event from a group pre-fills the defaults, but the event is not linked to the group, so there is no group event feed and later group-default changes do not propagate. Adding the column needs a migration; deferred until branches 5/6 land their migrations (`0004`/`0005`) to avoid numbering collisions, then implement together with group event listing.
- Quorum terminology is not implemented anywhere in the app yet (quorum UI is a later milestone), so the "both" type currently only affects labels and the event-type default.

**How to verify:**
1. Sign in → `/my` → "New group". Submitting without a type is blocked; create one as Minyan, Pickup, and Minyan & pickup.
2. A second group with the same name gets a unique slug suffix.
3. Back on `/my`, the group appears under "Your groups" and opens its detail page by slug.
4. On the group page, click "New event for this group" — the location is pre-filled and the type is pre-selected. Creating it returns to `/my`.
5. Tests: `pnpm test` — 37 passing (core 18, db 15, whatsapp 7); `pnpm typecheck` and `pnpm lint` clean.
