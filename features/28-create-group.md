# Feature 28: As a user, I can create a new group with a name, type, and default location so events inherit those settings

> Sprint 11 — Cancel & Groups
> Source story: https://taiga.tiyrah.duckdns.org/project/minyanmate/us/28

## Goal

Groups are the organisational home. A shul, a football crew, a workplace minyan. When creating a group, the user sets defaults that all future events inherit — saving time on every event creation.

## Acceptance Criteria

- [ ] Group creation form: name, type (minyan/pickup/both), default location, optional description
- [ ] Group type determines default event type label and quorum terminology
- [ ] Default location auto-filled on new events created in this group
- [ ] Group has a unique slug for URLs
- [ ] Creator is automatically the group organiser
- [ ] Group creation takes under 30 seconds

## Constraints & Conventions

- Follow the repository's existing architecture, code style and conventions.
- Keep changes scoped to this feature only — no unrelated refactors.
- Never commit secrets, credentials, tokens or environment-facing values.
- Run the repo's tests/build and make them pass before committing.

## Definition of Done

- [ ] Feature implemented and working per the Goal / Acceptance Criteria
- [ ] Tests / build pass where the repo defines them
- [ ] This feature file is committed together with the code
- [ ] A short **Implementation Notes** section is appended below

## Implementation Notes

**What was built (OpenCode nemotron-3.5-lightning-free + inline fixes):**
- `groups` table in schema (name, slug unique, typeTag minyan/pickup, defaultLocation, description, ownerId FK cascade) + drizzle migration `0003_third_sage`
- 4 new DB tests: full insert, duplicate slug rejection, owner cascade delete, nullable fields
- `createGroup` server action: session check, validation, slug generation with collision suffix
- `GroupForm` client component with name/type/defaultLocation/description fields
- `/groups/[slug]` detail page with organiser name and owner badge
- `/groups/new` page with back button
- "New group" button on `/my` next to "New event"

**How to verify:**
1. Sign in → `/my` → click "New group" → create a group → lands on the group detail page by slug
2. Second group with the same name gets a unique slug suffix
3. Tests: `pnpm run test` — 37 passing (core 18, db 15, whatsapp 7)
