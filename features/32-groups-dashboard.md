# Feature Spec — #32: Groups dashboard with upcoming events

- **Story id:** 32
- **Branch:** `feature/32-groups-dashboard`
- **Source:** Taiga story #32

## Goal
Provide a 'My Groups' dashboard showing all groups with upcoming event previews and RSVP status.

## Acceptance Criteria
- Grid or list of all groups the user belongs to
- Each group card shows: name, avatar/color, next upcoming event with RSVP status
- If no upcoming events, show 'No upcoming events' with a prompt to create one
- Tap a group to enter the group detail view (events, members, settings)
- Groups ordered by soonest upcoming event
- Long-press or swipe for quick actions (RSVP to next event, leave group)

## Constraints & Conventions
- Show all groups user belongs to
- Order by soonest upcoming event
- Quick actions for efficiency

## Definition of Done
- Dashboard displays all user groups
- Each card shows group info and next event preview
- RSVP status visible
- Navigation to group detail works
- Ordering is correct (soonest first)
- Quick actions work
- Empty state for groups with no upcoming events
- `pnpm typecheck && pnpm test && pnpm build` all pass
- PR open against `main`, CI green

## Implementation Notes
- May integrate with #31's leave group functionality
- Consider responsive grid/list layout
