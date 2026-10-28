# Feature Spec — #44: Simple RSVP home for assisted setup

- **Story id:** 44
- **Branch:** `feature/44-simple-rsvp-home`
- **Source:** Taiga story #44

## Goal
Provide a simplified home screen for assisted setup with two large buttons for RSVP and easy access to weekly attendance.

## Acceptance Criteria
- Post-setup home screen: next upcoming event prominently displayed
- Two large, high-contrast action buttons: 'I'm Coming' and 'I Can't Make It'
- Secondary view: weekly attendance grid where user can tap once per day
- Settings are accessible but tucked away — user doesn't need to go there
- No onboarding tutorial or tour required — the screen is self-explanatory
- 'Help' button connects to the family member who set up the account via their preferred contact method

## Constraints & Conventions
- Designed for assisted setup / elderly users
- Must be very simple, no complex navigation
- Large buttons, high contrast
- No tutorial needed

## Definition of Done
- Simple home view shown for assisted setup users
- Next event prominently displayed
- Large 'I'm Coming' and 'I Can't Make It' buttons work
- Weekly attendance grid available
- Help button connects to setup contact
- Settings tucked away
- `pnpm typecheck && pnpm test && pnpm build` all pass
- PR open against `main`, CI green

## Implementation Notes
- May need to detect assisted setup state
- Help connection depends on setup metadata

### Follow-up (2026-10-27): <topic>
- weekly attendance grid (outstanding)
- help-contact flow (outstanding)
- any DB migration (outstanding)
