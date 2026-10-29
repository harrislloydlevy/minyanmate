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
- **D1 — Re-identification scope:** a guest may only "claim" an existing **guest** RSVP by name. If the submitted name matches a registered user's name or phone number (anywhere in the app, not just this event), the submission is rejected outright — no guest row is created and the registered user's response is never revealed or modified.
- **D2 — Update confirmation:** changing a response shows a brief confirmation toast, consistent with the existing event detail UX.

## Definition of Done
- Returning guest sees their last response highlighted on the event page
- Tapping a different response updates it immediately, with a confirmation toast
- A guest whose cookie was cleared can re-identify by name and change their earlier guest response
- Re-identifying against a registered user's name or phone number is rejected and does not reveal that response
- Attendee count updates in real-time for all viewers
- [x] `pnpm typecheck` passes
- [x] `pnpm test` passes, including coverage of the guest response-change and re-identification rules
- [x] `pnpm build` succeeds
- PR open against `main`, CI green

## Implementation Notes
- Reuse the guest identity pattern from `features/18-guest-rsvp.md`; do not duplicate it.

### Follow-up (2026-10-27): guest response change + re-identification
- `setGuestRsvp()` rejects any submitted name that conflicts with a registered user's name (case/whitespace insensitive, across all users) or phone number (matching on full digits or the last 9 digits). No guest row is created in that case, so a registered user's identity and response can never be claimed, and guests cannot register a "name" that is another user's phone number.
- The event page computes the returning guest's current status from the `guest_token` cookie and passes it to `GuestRsvpButtons`, which highlights the active response.
- Signed-out visitors can use the "This is me" button next to a guest in the RSVP list to copy that guest's name into the form and `guest_name` cookie, so their next response updates the same guest row.
- `GuestRsvpButtons` shows a brief "Response updated" confirmation toast on a successful change (D2) and refreshes the page so counts update.
- Added `revalidatePath` for the event route so attendee counts update for all viewers.
- How to verify: typecheck/test/build pass; manual guest flow as in story #18.
- Story #13 (RSVP list grouped by response status) consumes these responses — keep the response model compatible.
- First story run through the devbox pipeline; spec is committed by `task_new` before implementation starts.
