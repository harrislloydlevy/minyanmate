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
- [x] Trigger on reaching quorum/capacity
- [x] Notify confirmed and maybe attendees
- [x] Notification content includes required info
- [x] Deep link to event page
- [x] Deduplication - only once per milestone
- [x] Per-group preferences respected
- [x] `pnpm typecheck && pnpm test && pnpm build` all pass
- [ ] PR open against `main`, CI green

## Implementation Notes
- Need to track if notification already sent for this milestone
- Integrate with existing notification/push system

### Follow-up (2026-10-27): quorum/capacity notifications
- Core: `packages/core/src/notifications.ts` provides milestone detection, dedupe keys, notification content (event name/time/location/count + deep link), and per-recipient preference filtering.
- DB: `events.quorum_notified_at` tracks milestone notification; `group_members.notify_quorum`/`notify_reminders` store per-group preferences. Migration `0009_fixed_imperial_guard.sql`.
- Web: RSVP (user + guest) and guest merge trigger `maybeNotifyQuorumReached`, which dedupes via `messages` and enqueues a `quorum_reached` job immediately.
- Worker: handles `quorum_reached` jobs.
- Spec acceptance criteria unchanged.
