# Feature Spec — #43: Text labels for all interactive elements

- **Story id:** 43
- **Branch:** `feature/43-accessibility-text-labels`
- **Source:** Taiga story #43

## Goal
Ensure every interactive element has clear, descriptive text labels; icons may supplement but never replace labels.

## Acceptance Criteria
- All navigation elements have visible text labels
- All action buttons have text (e.g. 'Share Event' not just an arrow icon)
- Icon+label combinations are the default pattern
- No tooltip-reliant or hover-reveal controls (these fail on mobile)
- Status indicators have text equivalents (e.g. '8 Confirmed' not just a green dot)
- Audit all screens for icon-only elements and add labels

## Constraints & Conventions
- Mobile-first - no hover-only controls
- Icons supplement, never replace
- Status indicators must have text

## Definition of Done
- Complete audit of interactive elements
- All icon-only buttons converted to icon+label or label-only
- Navigation has text labels
- Status indicators have text equivalents
- No tooltip-reliant controls
- `pnpm typecheck && pnpm test && pnpm build` all pass
- PR open against `main`, CI green

## Implementation Notes
- Systematic audit across all screens
- May need to refactor component library

### Follow-up (2026-10-27): visible text labels for interactive elements
- Converted the icon-only theme toggle to an icon+label button ("Theme").
- Made the copy-link button's label always visible (was hidden on mobile).
- Removed tooltip-only `title` attributes from copy-link and member role toggle buttons; visible text remains.
- Verified `pnpm typecheck`, `pnpm test`, and `pnpm build` all pass.
