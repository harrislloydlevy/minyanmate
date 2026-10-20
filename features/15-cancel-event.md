# Feature 15: As an organiser, I can cancel an event and notify all confirmed attendees in one action

> Sprint 5 — Pickup Depth & Polish
> Source story: https://taiga.tiyrah.duckdns.org/project/minyanmate/us/15

## Goal

Events sometimes need to be cancelled — weather, venue issues, not enough people. The organiser needs a single action that marks the event as cancelled and notifies everyone who had confirmed attendance.

## Acceptance Criteria

- [x] Cancel action (confirmation + owner-only) — optional cancellation reason deferred, see notes
- [x] Confirmation dialog before executing (to prevent accidental cancellation)
- [ ] All confirmed attendees receive a notification that the event is cancelled — job is enqueued, but fan-out is log-only (no WhatsApp credentials in this environment)
- [x] Cancelled events remain visible but are clearly marked as cancelled
- [x] The event's RSVP list is frozen — no further responses accepted (UI + server-side guards)

## Constraints & Conventions

- Follow the repository's existing architecture, code style and conventions.
- Keep changes scoped to this feature only — no unrelated refactors.
- Never commit secrets, credentials, tokens or environment-specific values.
- Run the repo's tests/build and make them pass before committing.

## Definition of Done

- [x] Feature implemented and working per the Goal / Acceptance Criteria (notification fan-out and cancellation reason excepted — see notes)
- [x] Tests / build pass where the repo defines them (`pnpm test`, `pnpm typecheck`, `pnpm lint`)
- [x] This feature file is committed together with the code
- [x] A short **Implementation Notes** section is appended below

## Implementation Notes

**What was built:**
- Created `cancelEvent()` server action in `apps/web/src/lib/actions/cancel-event.ts` — sets event status to "cancelled", only by event owner
- Created `CancelEventButton` client component with confirmation dialog (window.confirm)
- Updated event detail page: shows "Cancelled" badge for cancelled events, hides RSVP buttons when cancelled
- Event already had `status` field with `"cancelled"` enum in the schema — no migration needed

**Follow-up wiring (merged into `main` after branch review — `482fb38`, `cb492a4`):**
- The original branch never rendered `CancelEventButton`, so the button was invisible. Now rendered for the owner at the bottom of the event card, hidden once cancelled.
- Event detail page shows a "Cancelled" badge and replaces the RSVP controls with "RSVPs are closed".
- `setRsvp` / `setGuestRsvp` now reject RSVPs for cancelled events (server-side freeze, not just hidden UI).
- My Minyans (`/my`) shows a "Cancelled" pill on both Upcoming and Past cards and hides the stale RSVP pill.
- `cancelEvent` enqueues an `event_cancelled` job; the worker handler is log-only (`TODO(minyanmate#15)`) until Meta WhatsApp credentials are available — same pattern as `event_edited`.
- Deferred: optional cancellation reason needs a new column + migration. Deliberately not added on `main` while branches 5/6 still carry their own migrations (0004/0005), to avoid numbering collisions.

**How to verify:**
1. Sign in as the event owner and navigate to an event detail page
2. Click "Cancel Event" — a confirmation dialog appears
3. Confirm — the page refreshes showing the cancelled badge and no RSVP buttons; `/my` shows a Cancelled pill
4. Sign in as a different user or open the guest view — no cancel button appears, and guest RSVPs are rejected
5. Cancel an event, then try to RSVP from an already-open client — the server rejects it with "This event has been cancelled."

