# Feature Spec — #35: Quorum/capacity notifications

- **Story id:** 35
- **Branch:** `feature/35-quorum-notifications`
- **Source:** Taiga story #35

## Goal
Send push notifications when events reach quorum (minyan) or capacity (pickup games) with proper deduplication.

## Acceptance Criteria
- Push notification sent to all confirmed and maybe attendees when quorum/capacity is reached
- Notification includes event name, time, location, and confirmation count
- Link in notification opens directly to the event page
- One notification per quorum milestone (don't spam on every new RSVP)
- Notification is sent as soon as quorum is reached (not batched)
- Users can manage notification preferences per group

## Constraints & Conventions
- One notification per milestone
- Send immediately when reached
- Respect per-group notification preferences
- Works for both minyan (quorum) and pickup (capacity)

## Definition of Done
- Trigger on reaching quorum/capacity
- Notify confirmed and maybe attendees
- Notification content includes required info
- Deep link to event page
- Deduplication - only once per milestone
- Per-group preferences respected
- `pnpm typecheck && pnpm test && pnpm build` all pass
- PR open against `main`, CI green

## Implementation Notes
- Need to track if notification already sent for this milestone
- Integrate with existing notification/push system
