# Feature 17: As an unregistered user, I can open a shared event link and view full event details without creating an account

> Sprint 4 — Minyan Depth
> Source story: https://taiga.tiyrah.duckdns.org/project/minyanmate/us/17

## Goal

The no-barrier entry point for casual users (Shan persona). When someone receives an event link, opening it should show the event page immediately — no login wall, no signup prompt. This is the critical 'link-first' experience.

## Acceptance Criteria

- [ ] Event link opens to a fully functional event detail page in any mobile browser
- [ ] Page shows: event name, date/time, location, notes, current RSVP counts by status
- [ ] No account creation prompt before viewing
- [ ] Page loads in under 2 seconds on a 4G connection
- [ ] Works on WhatsApp, SMS, iMessage, Telegram, email link previews
- [ ] Deep links open correctly on both iOS and Android

## Constraints & Conventions

- Follow the repository's existing architecture, code style and conventions.
- Respect any `AGENTS.md`, `CONTRIBUTING.md` or similar guidance in the repo.
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
- Added `guests` table to Drizzle schema (id, name, event_id, status, token, timestamps)
- Created `setGuestRsvp()` server action in `apps/web/src/lib/actions/rsvp.ts` — upserts a guest RSVP, sets a `guest_token` cookie (30-day expiry)
- Created `GuestRsvpButtons` client component — shows name input + Coming/Maybe/Not Coming buttons for unauthenticated users; stores guest identity via cookie
- Created `getCookie()` client-side utility in `apps/web/src/lib/cookies.ts`
- Updated event detail page (`/events/[id]`) to be public — no login redirect for unauthenticated users; shows event details + guest RSVP controls
- RSVP counts combine both registered users and guest responses
- RSVP list shows both registered user names and guest names together

**How to verify:**
1. Open an event link in an incognito/private browser — the event page loads without a login prompt
2. Enter a name and click Coming/Maybe/Not Coming — the RSVP is saved
3. Refresh the page — your name and choice are remembered (via cookie)
4. Open the same event in a logged-in session — the normal RSVP buttons appear
5. The RSVP count includes both guests and registered users
6. In the RSVP list, guest responses show `(guest)` after the name; signed-in users are unmarked

### Follow-up (2026-10-20): name-matched guest RSVPs

- `setGuestRsvp()` now updates the existing guest row when the exact same (trimmed) name re-submits for the same event instead of inserting a duplicate — guest rows are always anonymous, so a name match means the same person returning. Matching is case-sensitive ("Mordi" ≠ "mordi") and scoped to the event.
- On a name match the browser adopts the matched row's token, so the same name from a new browser/device converges onto the one row.
- New `guest_name` cookie remembers the name used; the guest form pre-fills it and the name input is now always visible (it used to disappear once a token existed).
- `guest_token` is no longer `httpOnly` — the client component reads it via `document.cookie`; the flag previously made that impossible and caused one new row per submit.
- Duplicate rows created before this change (e.g. two "Check" rows from an older session) are not removed automatically; the oldest row is reused going forward.

### Follow-up (2026-10-20): guest marker in the RSVP list

- Guest RSVPs now render as `Name (guest)` in the event's RSVP list, so anonymous responses are distinguishable from registered users. Registered users are unmarked.

### Follow-up (2026-10-21): title shown, type removed

- The event page heading now shows the stored event title (`events.title`), with the date still listed in the details block. Events created before titles were stored fall back to "Minyan".
- Removed the "Type" row from the event details; all events are minyans.
