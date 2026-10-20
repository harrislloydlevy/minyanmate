# Feature 21: As an organiser, the shareable event link auto-generates a meaningful preview when shared on messaging and social platforms

> Sprint 5 — Pickup Depth & Polish
> Source story: https://taiga.tiyrah.duckdns.org/project/minyanmate/us/21

## Goal

When an event link is shared in WhatsApp, iMessage, Telegram, or social media, it should render a rich preview (OG tags) showing the event name, date, location, and how many people are confirmed. This drives click-through and makes sharing feel native.

## Acceptance Criteria

- [ ] Open Graph / Twitter Card meta tags on the event page
- [ ] Preview shows: event title, date/time, location, 'X confirmed, Y needed' count
- [ ] Preview image: group or event type icon
- [ ] Works on: WhatsApp, iMessage, Telegram, Facebook, Twitter/X, Discord
- [ ] Preview updates when RSVP counts change (or regenerates on re-scrape)
- [ ] Link copy button on event page for easy sharing

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
- Added `generateMetadata` to the event detail page — generates OG and Twitter card meta tags with event title, date, location
- OG tags include title, description, image URL, and site name
- Added "Copy link" button on the event detail page
- Uses `NEXT_PUBLIC_BASE_URL` env var (falls back to localhost)

**How to verify:**
1. Share an event link in WhatsApp, iMessage, or Telegram — it should show a rich preview with event title and date
2. The event page has a "Copy link" button below the event details
3. View page source — the `og:title`, `og:description`, `og:image`, `twitter:card` meta tags are present
