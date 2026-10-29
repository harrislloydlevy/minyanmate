# Feature 15: As an organiser, I can cancel an event and notify all confirmed attendees in one action

> Sprint 5 — Pickup Depth & Polish
> Source story: Taiga #15

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

**What was built (final state on `main`):**
- `cancelEvent()` server action (`apps/web/src/lib/actions/cancel-event.ts`) — owner-only; sets `status = "cancelled"`, stamps `lastEditedAt`, and enqueues an `event_cancelled` job.
- `CancelEventButton` (`apps/web/src/components/cancel-event-button.tsx`) — destructive button with a `window.confirm` dialog and a submitting state.
- Event detail page (`apps/web/src/app/events/[id]/page.tsx`):
  - renders the button for the owner at the bottom of the event card; it disappears once the event is cancelled
  - shows a "Cancelled" pill next to "Event details"
  - replaces the RSVP controls with "This event has been cancelled — RSVPs are closed", while keeping the RSVP list visible
- My Minyans (`apps/web/src/app/my/page.tsx`) — cancelled events are excluded from the RSVP-only feed; they remain visible on the event page and group schedule with a "Cancelled" pill. The user's stale Going / Maybe / Not going pill is hidden for cancelled events.
- RSVP freeze (`apps/web/src/lib/actions/rsvp.ts`) — `setRsvp` and `setGuestRsvp` reject writes to cancelled events server-side; hiding the UI alone would not stop an already-open client.
- Worker (`apps/worker/src/index.ts`) — `event_cancelled` handler logs intent (`TODO(minyanmate#15)`) until Meta WhatsApp credentials are available; same durable-job pattern as `event_edited`.
- No migration needed — `events.status` already has the `"cancelled"` enum value.

**Branch review follow-up (`482fb38`, `cb492a4`, doc `a47d035`):**
- The original branch added the action and component but never imported them, so the button never rendered. The event-page and `/my` wiring were added during review.
- The original branch notes claimed the event page already showed the badge and hid RSVP buttons; that was not true until this follow-up.

**Known gaps:**
- Optional cancellation reason (AC 1) is not implemented: it needs a new `events` column + migration. Deliberately deferred while branches 5/6 still carry their own migrations (0004/0005), to avoid numbering collisions.
- Notifications (AC 3) are enqueued but not sent: the handler is log-only until WhatsApp credentials are available.

**How to verify:**
1. Sign in as the event owner and navigate to an event detail page
2. Click "Cancel Event" — a confirmation dialog appears
3. Confirm — the page refreshes showing the cancelled badge and no RSVP buttons; `/my` no longer lists the cancelled event, while the group page still shows it with a Cancelled badge
4. Sign in as a different user or open the guest view — no cancel button appears, and guest RSVPs are rejected
5. Cancel an event, then try to RSVP from an already-open client — the server rejects it with "This event has been cancelled."

