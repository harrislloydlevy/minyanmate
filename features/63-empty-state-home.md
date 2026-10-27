# Feature Spec — #63: Friendly empty state on home screen

- **Story id:** 63
- **Branch:** `feature/63-empty-state-home`
- **Source:** Taiga story #63

## Goal
Show a friendly empty state on the home screen for first-time users with no groups and no events, with exactly one clear call-to-action.

## Acceptance Criteria
**Scenario: New user opens the home screen with no data**
- Given I have just signed up and belong to no groups and have no events
- When I open the app home screen
- Then I see a friendly welcome message explaining what the app does in one sentence
- And I see exactly one primary call-to-action button ("Join a group" or "Create your first minyan")
- And no empty lists, blank cards, or error-looking placeholders are shown

**Scenario: Empty state disappears once data exists**
- Given I belong to at least one group or have at least one upcoming event
- When I open the home screen
- Then the normal dashboard is shown instead of the empty state

## Constraints & Conventions
- Copy must avoid jargon; use "minyan" on MinyanMate and "game" on PickUpGame
- Text must be legible at 2x system font size
- Empty state should also be reachable as a first-run state for invited guests who have no events yet
- Exactly one primary CTA button

## Definition of Done
- Home screen shows empty state only when user has no groups and no upcoming events
- Empty state has welcome message + exactly one primary CTA
- Normal dashboard shown when user has groups or events
- Works correctly for invited guests with no events
- Copy is appropriate for context (minyan/game)
- `pnpm typecheck && pnpm test && pnpm build` all pass
- PR open against `main`, CI green

## Implementation Notes
- Persona considerations: Mr. Goldstein (low tech comfort)
- Must be accessible at 2x font size
