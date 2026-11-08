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
- [x] All outbound messages (including OTP) recorded in the outbox
- [x] Requested and actually-sent details are recorded separately
- [x] Outbox reviewable in the web UI at `/messages`
- [x] Manual mode can hold requests for later technique testing
- [x] Development never sends externally; production uses the WhatsApp transport
- [x] `pnpm typecheck && pnpm test && pnpm lint` pass (production build not run against the live dev checkout)
- [ ] PR open against `main`, CI green

## Implementation Notes
- Need to track if notification already sent for this milestone
- Integrate with existing notification/push system

### Follow-up (2026-10-27): quorum/capacity notifications
- Core: `packages/core/src/notifications.ts` provides milestone detection, dedupe keys, notification content (event name/time/location/count + deep link), and per-recipient preference filtering.
- DB: `events.quorum_notified_at` tracks milestone notification; `group_members.notify_quorum`/`notify_reminders` store per-group preferences. Migration `0010_living_turbo.sql` (renumbered from the original `0009` after merging main's `0009_nostalgic_dracula`).
- Web: RSVP (user + guest) and guest merge trigger `maybeNotifyQuorumReached`, which atomically claims the milestone and enqueues a `quorum_reached` job.
- Worker: handles `quorum_reached` jobs by fanning out one outbox row per confirmed/maybe attendee.

### Follow-up (2026-11-05): delivery outbox + reviewable message log
- **Outbox layer:** `messages` is now a general outbound log (channel, recipient, subject/body, provider, attempts, status, batch/dedupe ids), not a WhatsApp-only table. `enqueueOutboxMessage` writes the row and its `deliver_message` job in one transaction.
- **Request vs delivery:** each row keeps the immutable request (`requestedAt`, `deliveryMode`, requested channel/recipient/body) separate from the delivery (`sentAt`, `sentChannel`, `sentRecipient`, `sentBody`, `technique`, `sentBy`, provider ids). Status is `requested` (held), `queued` (auto dispatch pending), `sent`, `failed` or `skipped`.
- **Manual testing mode:** `MESSAGING_DELIVERY_MODE=manual` on the worker records fan-out requests without enqueueing delivery jobs. `/messages` shows a "Record a manual send" form for requested/failed rows; it fills in the sent channel/recipient/body/technique without sending anything, so different techniques can be compared against the same request. OTPs always send immediately.
- **Transport boundary:** new `packages/messaging` defines `MessageTransport` with console and WhatsApp implementations; SMS/email are explicit unconfigured placeholders so future adapters have a home. `MESSAGING_CHANNEL` overrides the default, which is `console` in development and `whatsapp` in production.
- **Fan-out:** the worker resolves confirmed/maybe attendees, counts guests toward the quorum, writes one row per attendee (deduped by event+user), and records opt-outs / missing phone numbers as `skipped` rows with a reason. Retries are idempotent.
- **Delivery:** `deliverOutboxMessage` accepts `queued`/`requested` rows and updates the sent fields, provider id, attempts, error and timestamps. Retryable failures stay queued (or requested) and are retried by the job worker; `maxAttempts` prevents infinite retries.
- **OTP:** `sendOTP` also goes through the outbox/transport layer. It is sent synchronously (login waits on it) but still recorded, and uses the same console/WhatsApp switch.
- **Web UI:** `/messages` lists the outbox newest-first with filters for status/channel/kind/mode and free-text search over name, phone, requested/sent body and event. Shows the requested and delivered sides separately, plus provider id, attempts, errors and JSON payload. Any signed-in user can view it in development; production is admin-only (`users.role = 'admin'`).
- Migrations: `0011_medical_ma_gnuci.sql` (outbox fields) and `0012_natural_sir_ram.sql` (request/delivery split).
- Verification: `pnpm test`, `pnpm typecheck`, `pnpm lint`; open `/messages` after seeding and RSVPing to a quorum event. In development auto rows end as `sent` via the `console` provider and appear in the server log as `[messaging:console]`; manual rows stay `requested` until filled in.
