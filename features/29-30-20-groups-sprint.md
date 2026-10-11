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
- `group_members` table (groupId, userId, role organiser/member, unique per group+user) + `join_token` column on groups — migration 0004
- `generateJoinToken` / `revokeJoinToken` / `joinGroup` server actions (owner/organiser-only token management)
- `join-link.tsx` (generate + copy link + revoke), `join-group.tsx` (auto-join on ?join=<token> then refresh)

**#30 Manage roles**
- `setMemberRole` / `removeMember` actions: organiser-only; owner cannot be changed or removed
- `member-actions.tsx`: promote/demote/remove controls per member
- Member list on group page with role badges; owner always "Organiser"

**#20 Guest→account**
- `mergeGuestRsvps()` in rsvp.ts: moves guest rows (by cookie token) into rsvps via upsert, deletes guest rows
- Called after OTP verify in login-form.tsx; idempotent guest-merge.tsx safety net on /my
- guest-banner.tsx on event page when guest has ≥3 RSVPs; "Not now" sets guest_banner_dismissed cookie

**Verification:** 41 tests passing (core 18, db 19, whatsapp 7); typecheck 5/5; next build green.
