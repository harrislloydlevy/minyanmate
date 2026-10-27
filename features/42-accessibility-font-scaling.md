# Feature Spec — #42: System font size scaling

- **Story id:** 42
- **Branch:** `feature/42-accessibility-font-scaling`
- **Source:** Taiga story #42

## Goal
Make the app respect system font size settings and ensure core screens work at 2x default text size.

## Acceptance Criteria
- All core screens tested at 2x default OS font size without layout overflow or truncation
- Text scales with system accessibility settings (iOS Dynamic Type, Android font scale)
- No critical content hidden behind scroll at large sizes
- Buttons and touch targets remain usable at all text sizes
- Form labels and input fields scale proportionally

## Constraints & Conventions
- Must work on iOS Dynamic Type and Android font scale
- Touch targets must remain accessible
- No layout breaking at 2x size

## Definition of Done
- Text uses relative units (rem/em) where appropriate
- Core screens tested at 2x scale
- No overflow/truncation on critical content
- Touch targets meet accessibility guidelines
- Forms scale correctly
- `pnpm typecheck && pnpm test && pnpm build` all pass
- PR open against `main`, CI green

## Implementation Notes
- Global CSS/theme changes likely needed
- Test critical user flows at large text sizes
