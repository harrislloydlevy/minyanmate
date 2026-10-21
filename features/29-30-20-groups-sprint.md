# Sprint 12: Groups membership — invite members (#29), manage roles (#30), guest→account conversion (#20)

> Sprint 12 — Groups Dashboard
> Stories: https://taiga.tiyrah.duckdns.org/project/minyanmate/us/29, /us/30, /us/20

## Goal

Groups need members and role management, and regular guests should be able to convert to full accounts keeping their history.

## Acceptance Criteria

### #29 — Invite members
- [ ] Group page shows a shareable join link (e.g. /groups/[slug]?join=token or a join code)
- [ ] Organiser can generate/revoke a join link
- [ ] Opening the join link while signed in adds the user to the group as a member
- [ ] Member list visible on the group page

### #30 — Manage roles
- [ ] Roles: organiser (owner), member
- [ ] Organiser can promote a member to co-organiser
- [ ] Organiser can demote a co-organiser back to member
- [ ] Organiser can remove a member
- [ ] Cannot demote/remove the last organiser
- [ ] Role shown next to each member in the member list

### #20 — Guest→account conversion
- [ ] Guest banner on event page after 3+ RSVPs by that guest: "Coming regularly? Create an account to keep your history."
- [ ] Banner links to /login (the existing phone OTP signup)
- [ ] mergeGuestRsvps server action: on login, if a guest cookie exists, transfer guest RSVP rows to the user
- [ ] Prompt is dismissible (cookie flag)

## Constraints & Conventions

- Follow the repository's existing architecture, code style and conventions.
- Keep changes scoped to these features only.
- Never commit secrets.
- Tests must pass; new tables need DB tests.

## Implementation Notes

**Engine:** opencode/mimo-v2.6-flash-free (complete run) — inline verification only.

**#29 Invite members**
- `group_members` table (groupId, userId, role organiser/member, unique per group+user) + `join_token` column on groups — migration 0006 (renumbered from 0004 when merged with main; main owns 0004/0005)
- `generateJoinToken` / `revokeJoinToken` / `joinGroup` server actions (owner/organiser-only token management)
- `/my` → "Your groups" lists groups the user owns **or** belongs to; joining a group adds it to the member's `/my` page.
- Members can leave a group from the group page; a confirmation is required and they are sent back to `/my`. The owner cannot leave (there is no ownership-transfer flow yet), so a group always keeps an organiser.
- The group page shows all future events for the group; `/my` shows each group's next 3 upcoming scheduled events with a **Details** link to the full group page.
- Creating a group event is organiser-only: the "New event for this group" button is hidden for regular members, `/events/new?group=<slug>` redirects them back to the group, and `createEvent` rejects a `groupId` the user cannot manage. Shared `canManageGroup` helper lives in `apps/web/src/lib/group-permissions.ts`.
- `join-link.tsx` (generate + copy link + revoke), `join-group.tsx` (shows a confirmation prompt on ?join=<token>; joins only after the user clicks "Join group", and "Not now" drops the token param without joining)
- Signed-out invite visitors see the same explanation with a **Join group** button; it goes to `/login?joinGroup=<slug>&joinToken=<token>`, and after OTP verification the login form calls `joinGroup` and lands on the group page already joined.
- Copy uses shared `copy-to-clipboard.ts`: Clipboard API with a temporary-textarea fallback, so invite links can be copied over plain-HTTP LAN access where `navigator.clipboard` is unavailable. The event page's copy-link button uses the same helper.

**#30 Manage roles**
- `setMemberRole` / `removeMember` actions: organiser-only; owner cannot be changed or removed
- `member-actions.tsx`: promote/demote/remove controls per member
- Member list on group page with role badges; owner always "Organiser"

**#20 Guest→account**
- `mergeGuestRsvps()` in rsvp.ts: moves guest rows (by cookie token) into rsvps via upsert, deletes guest rows
- Called after OTP verify in login-form.tsx; idempotent guest-merge.tsx safety net on /my
- guest-banner.tsx on event page when guest has ≥3 RSVPs; "Not now" sets guest_banner_dismissed cookie

**Verification:** 45 tests passing (core 18, db 20, whatsapp 7); typecheck 5/5; lint clean.

## Merge with main (2026-10-21)

Merged `main` (`09b683d`) into this branch. The branch was cut from the old group branch (`12d150c`), so main's guest-marker, cancel-event, title/type removal, and group→event link work all arrived at once.

- **Group page:** kept the membership UI (member list, invite link, role actions) and main's "New event for this group" button; removed the type label because main no longer selects `group.typeTag`.
- **RSVP actions:** unioned imports. Main's cancel-freeze guard and guest name-matching now sit alongside `mergeGuestRsvps`.
- **Migrations:** main owns `0004_known_firebird` (event title) and `0005_unknown_quentin_quire` (event group link), both already applied. The membership migration was regenerated as `0006_organic_scarlet_spider` from the merged schema; the old `0004_ancient_mojo` and its snapshot were dropped. Snapshot chain is `0004 → 0005 → 0006`.
- **Dev DB:** migrated through 0006 (`group_members` table + `groups.join_token`).
- Branch is now current with `main`; still pending the user test before merging back.
