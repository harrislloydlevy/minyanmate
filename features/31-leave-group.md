# Feature Spec — #31: Leave group with RSVP cleanup

- **Story id:** 31
- **Branch:** `feature/31-leave-group`
- **Source:** Taiga story #31

## Goal

Allow group members to leave a group, withdraw their upcoming RSVPs, and keep the owner in place. Organisers (including the owner) manage the group; ownership is permanent.

## Roles

- **Owner** — exactly one per group, always an organiser, can never leave or be removed.
- **Organiser** — zero or more members with the organiser role. Organisers can manage the group (members, events, phone numbers). The owner counts as an organiser even though the owner has no `group_members` row.
- **Member** — regular participant.

## Acceptance Criteria

- [x] 'Leave group' action from group settings
- [x] Confirmation dialog explaining that all future RSVPs will be cancelled
- [x] Member is removed from the group and all future RSVPs are withdrawn (`status = "out"`)
- [x] Past event history is preserved (the member's attendance at past events remains)
- [x] The owner can never leave, even when other organisers exist
- [x] A non-owner organiser can leave without assigning a replacement (the owner remains an organiser)
- [x] Group member count and event RSVP counts update immediately

## Constraints & Conventions

- Past events must remain unchanged; "future" means `events.date >= today` (local calendar date). Same-day events count as future — exact start time is not considered.
- Only future events' RSVPs are withdrawn, by setting `status = "out"`. Rows are never deleted, so downstream consumers see an explicit "not coming" answer.
- The whole mutation (membership removal + RSVP withdrawal) runs in one Drizzle transaction.
- Following a group and being a member of a group are the same concept. The unused `minyan_followers` table was removed in migration `0009`; notification/follower queries must use `group_members` (owner included).

## Definition of Done

- Leave group action accessible from group settings
- Confirmation dialog with clear explanation
- Member removed from group membership
- Future RSVPs cancelled, past RSVPs unchanged
- Owner blocked on both the server and the UI
- Counts update correctly
- `pnpm typecheck && pnpm test && pnpm lint && pnpm build` all pass
- PR open against `main`, CI green

## Implementation Notes

- **Logic + tests:** `apps/web/src/lib/leave-group.ts` (`leaveGroupInDb`) holds the mutation so it can be tested against an in-memory SQLite DB. `apps/web/src/lib/leave-group.test.ts` covers owner blocking, future-only `out` withdrawal, organiser-with-owner, and non-member cases.
- **Server action:** `leaveGroup(slug, newOrganiserUserId?)` in `apps/web/src/lib/actions/group-members.ts` authenticates, resolves the group, and delegates to `leaveGroupInDb`. `newOrganiserUserId` is retained for the legacy sole-organiser flow but is effectively unreachable while the owner is always an organiser.
- **UI:** `leave-group.tsx` keeps the existing confirmation dialogs. `isSoleOrganiser` is computed from the full member list (owner included), so a non-owner organiser is never treated as the last organiser. The button stays hidden for the owner.
- **RSVPs:** future rows are updated to `out` with a fresh `updatedAt`; no rows are deleted.
- **No worker/core impact:** `apps/worker` only logs `event_edited` / `event_cancelled` today and does not read RSVPs at all; `packages/core` has no RSVP logic. When reminder/quorum fan-out lands it should treat `out` as an explicit decline.
- **Event management:** `canManageEvent` (`group-permissions.ts`) lets the group owner and any group organiser edit or cancel group events, not just the creator. One-off events remain creator-only.
- **Verification:** `pnpm test` (includes 6 web action tests), `pnpm typecheck`, `pnpm lint`.

### Follow-up (2026-10-27): leave group implemented

- `leaveGroup` removes membership and withholds future RSVPs; past attendance preserved.
- Sole-organiser flow, as originally specified, is superseded by the owner-always-organiser rule above.

### Follow-up (2026-10-29): owner/organiser rules, OUT status, transaction, followers

- Owner is permanently blocked from leaving; owner always counts as an organiser.
- Future RSVPs are set to `out` instead of being deleted.
- Membership removal and RSVP withdrawal are wrapped in one Drizzle transaction.
- `minyan_followers` was unused; following is now identical to group membership and the table was dropped (migration `0009_nostalgic_dracula.sql`).
- The **Leave group** trigger and its confirmation use the red destructive button style, per the project UI conventions.
