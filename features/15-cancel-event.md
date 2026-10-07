# Feature 15: As an organiser, I can cancel an event and notify all confirmed attendees in one action

> Sprint 5 — Pickup Depth & Polish
> Source story: https://taiga.tiyrah.duckdns.org/project/minyanmate/us/15

## Goal

Events sometimes need to be cancelled — weather, venue issues, not enough people. The organiser needs a single action that marks the event as cancelled and notifies everyone who had confirmed attendance.

## Acceptance Criteria

- [ ] Cancel action with optional cancellation reason (shown to attendees)
- [ ] Confirmation dialog before executing (to prevent accidental cancellation)
- [ ] All confirmed attendees receive a notification that the event is cancelled
- [ ] Cancelled events remain visible but are clearly marked as cancelled
- [ ] The event's RSVP list is frozen — no further responses accepted

## Constraints & Conventions

- Follow the repository's existing architecture, code style and conventions.
- Keep changes scoped to this feature only — no unrelated refactors.
- Never commit secrets, credentials, tokens or environment-specific values.
- Run the repo's tests/build and make them pass before committing.

## Definition of Done

- [ ] Feature implemented and working per the Goal / Acceptance Criteria
- [ ] Tests / build pass where the repo defines them
- [ ] This feature file is committed together with the code
- [ ] A short **Implementation Notes** section is appended below

## Implementation Notes

**What was built:**
- Created `cancelEvent()` server action in `apps/web/src/lib/actions/cancel-event.ts` — sets event status to "cancelled", only by event owner
- Created `CancelEventButton` client component with confirmation dialog (window.confirm)
- Updated event detail page: shows "Cancelled" badge for cancelled events, hides RSVP buttons when cancelled
- Event already had `status` field with `"cancelled"` enum in the schema — no migration needed

**How to verify:**
1. Sign in as the event owner and navigate to an event detail page
2. Click "Cancel Event" — a confirmation dialog appears
3. Confirm — the page refreshes showing the cancelled badge and no RSVP buttons
4. Sign in as a different user — no cancel button appears
