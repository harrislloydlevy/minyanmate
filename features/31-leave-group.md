# Feature Spec — #31: Leave group with RSVP cleanup

- **Story id:** 31
- **Branch:** `feature/31-leave-group`
- **Source:** Taiga story #31

## Goal
Allow group members to leave a group with proper cleanup of future RSVPs and safeguards for sole organisers.

## Acceptance Criteria
- 'Leave group' action from group settings
- Confirmation dialog explaining that all future RSVPs will be cancelled
- Member is removed from the group and all future RSVPs are withdrawn
- Past event history is preserved (the member's attendance at past events remains)
- If the leaving member is the sole organiser, they are prompted to assign a new organiser first
- Group member count and event RSVP counts update immediately

## Constraints & Conventions
- Past events must remain unchanged
- Only future events' RSVPs are withdrawn
- Sole organiser must designate replacement before leaving

## Definition of Done
- Leave group action accessible from group settings
- Confirmation dialog with clear explanation
- Member removed from group membership
- Future RSVPs cancelled, past RSVPs unchanged
- Sole organiser flow prevents leaving without replacement
- Counts update correctly
- `pnpm typecheck && pnpm test && pnpm build` all pass
- PR open against `main`, CI green

## Implementation Notes
- Need to distinguish future vs past events by date/time
- Update group member count and RSVP aggregates

### Follow-up (2026-10-27): leave group implemented
- `leaveGroup(slug, newOrganiserUserId?)` now removes membership, deletes only future (date >= today) RSVPs for the user across group events (via `groupId` or linked minyan), preserving past attendance.
- Sole-organiser members are blocked unless a replacement member is promoted in the same call.
- UI adds a confirmation dialog explaining future RSVP cancellation and a sole-organiser assignment dialog.
- Verified: `pnpm typecheck && pnpm test && pnpm build`.
