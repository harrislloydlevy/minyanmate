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

### Follow-up (2026-10-27): My Groups dashboard

1. **Route** `apps/web/src/app/groups/page.tsx` (plus `/my/groups` redirect): server component lists every group the signed-in user owns or belongs to, with membership role lookup.
2. **Card** shows a deterministic avatar (initial + hashed color), group name, next upcoming non-cancelled event preview with RSVP counts and the viewer's RSVP status, or a "No upcoming events" prompt with a "New event" button for managers.
3. **Ordering** by soonest upcoming event (groups without one sort last, then by name).
4. **Quick actions**: `RsvpButtons` for the next event and the existing `LeaveGroup` component (which calls `leaveGroup` from `group-members`); owners have no leave button.
5. **Navigation**: header links between `/my` and `/groups`; `/my` gained a "My groups" button.
6. **Button styling**: **New group** / **New event** create actions use the primary blue button; **Leave group** uses the destructive red style.
7. Verified: `pnpm typecheck`, `pnpm test`, `pnpm build` all pass.

### Follow-up (2026-10-29): group directory

- `/groups` is now a group directory, not an event preview feed. The original "next upcoming event" card requirement is superseded.
- Each card shows the group avatar/name, the viewer's role (Owner / Organiser / Member), total member count, and default location.
- Actions are **Manage group** for owners/organisers, **View group** for regular members, and **Leave group** for non-owners.
- Leaving from the directory refreshes the directory instead of sending the user to `/my`.
- Cards are ordered alphabetically by group name; groups with no upcoming events are included.
- Individual minyans and RSVP controls stay on `/my` and the event detail pages — the directory no longer queries events.
- `getGroupDirectory` in `apps/web/src/lib/group-directory.ts` computes roles and counts (owner included without a `group_members` row); tests cover owner, organiser, member, and unrelated-group cases.
