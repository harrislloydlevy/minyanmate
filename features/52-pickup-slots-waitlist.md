# Feature Spec — #52: Pickup game player limits and waitlist

- **Story id:** 52
- **Branch:** `feature/52-pickup-slots-waitlist`
- **Source:** Taiga story #52

## Goal
Add min/max player counts for pickup games with slot display, waitlist, and auto-promotion.

## Acceptance Criteria
- Organiser sets min players and max players on event creation
- Event page shows: '9 confirmed, need 1 more to play / 4 slots remaining'
- When max is reached, new RSVPs are waitlisted
- Waitlisted users are auto-promoted when someone drops out (in order of waitlist join time)
- Organiser can manually promote from waitlist
- Clear visual distinction between: below minimum (not playing), met minimum (game on), at maximum (full)

## Constraints & Conventions
- Pickup game specific feature
- FIFO waitlist
- Auto-promotion on drop-out

## Definition of Done
- Min/max player settings on event creation
- Slot counts displayed correctly
- Waitlist functionality works
- Auto-promotion in order
- Manual promotion by organiser
- Status indicators for below/min/met/max
- `pnpm typecheck && pnpm test && pnpm build` all pass
- PR open against `main`, CI green

## Implementation Notes
- May need new DB fields for min/max players and waitlist
- Order by waitlist join timestamp

### Follow-up (2026-10-27): pickup slots and waitlist
- Schema: `events`/`minyans` gained `min_players`/`max_players`; `rsvps`/`guests` gained `waitlisted_at` and a `waitlisted` (plus aliases) RSVP status.
- Migration `0009_pretty_rhino.sql` adds the new columns.
- Core: `packages/core/src/pickup.ts` provides slot status, counts, formatting, and FIFO waitlist helpers.
- Web: event creation/edit supports min/max players; event page shows slot summary + waitlist with manual promote; RSVPs auto-waitlist when full and auto-promote on drop-out.
