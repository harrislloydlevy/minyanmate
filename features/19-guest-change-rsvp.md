# Feature Spec — #19: As a guest user who has RSVP'd, I can return to the event page and change my response

- **Story id:** 19
- **Branch:** `feature/19-guest-change-rsvp`
- **Source:** Taiga story #19

## Goal
A guest who has already RSVP'd must be able to return to the event page and change their response (Yes / No / Maybe). This completes the guest access flow begun in story #18 (dep-#18).

## Acceptance Criteria
- Returning guest sees their current response highlighted
- Tapping a different response updates it immediately
- If guest cookie is cleared, they can re-identify with their original name
- Changing response updates the attendee count in real-time for all viewers

## Constraints & Conventions
- Guest identity is cookie-based (as established in #18). Do not introduce a new auth model.
- The attendee count must update through the real-time mechanism already in use for #18.
- Preserve the existing guest flow; this is an additive behaviour change.
- Re-identification by name after cookie loss is permitted **only** against another guest RSVP. A guest must never be able to claim, take over, or read the RSVP of a registered user.
- Spec lives in the repo at `features/19-guest-change-rsvp.md` and is committed with the code.

## Decisions (resolved 2026-10-27, Mordi)
- **D1 — Re-identification scope:** a guest may only "claim" an existing **guest** RSVP by name. If the name matches a registered user, the re-identification is rejected; the visitor is treated as a brand-new guest and cannot see or modify the registered user's response.
- **D2 — Update confirmation:** changing a response shows a brief confirmation toast, consistent with the existing event detail UX.

## Definition of Done
- Returning guest sees their last response highlighted on the event page
- Tapping a different response updates it immediately, with a confirmation toast
- A guest whose cookie was cleared can re-identify by name and change their earlier guest response
- Re-identifying against a registered user's name is rejected and does not reveal that response
- Attendee count updates in real-time for all viewers
- `pnpm typecheck` passes
- `pnpm test` passes, including coverage of the guest response-change and re-identification rules
- `pnpm build` succeeds
- PR open against `main`, CI green

## Implementation Notes
- Reuse the guest identity pattern from `features/18-guest-rsvp.md`; do not duplicate it.
- Story #13 (RSVP list grouped by response status) consumes these responses — keep the response model compatible.
- First story run through the devbox pipeline; spec is committed by `task_new` before implementation starts.
