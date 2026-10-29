# Feature 33: Display names and dev sign-in

- **Source:** Follow-up request (2026-10-29; no Taiga story id yet)
- **Branch:** `feature/identity-event-owner`

## Goal

Keep phone numbers out of the UI and make local sign-in fast to test.

## Acceptance Criteria

- [x] A new account is asked for a display name immediately after phone verification, before entering the app.
- [x] Phone numbers are never used as display names in profiles, RSVPs, group members, or event owners.
- [x] Existing accounts whose name is still a phone number are sent to the name prompt.
- [x] Guest RSVP names that look like phone numbers are rejected.
- [x] In development, any OTP code signs in. The real code is still generated and logged as `[dev-otp]`.
- [x] Production still verifies the real OTP.

## Implementation Notes

- `apps/web/src/lib/auth.ts`: new phone sign-ups get an empty temporary name; `verifyOTP` is bypassed only when `APP_ENV` is not `production`.
- `apps/web/src/lib/display-name.ts`: shared `needsName` / `displayName` / `safeNextPath` helpers; phone-like values fall back to "Member".
- `apps/web/src/app/welcome/`: name prompt shown after verification, then continues to the original destination.
- `/my` redirects an account without a real name to `/welcome`; the login flow also sends new accounts there.
- `mergeGuestRsvpsInDb` still restores a real name previously used for a guest RSVP, but never restores a phone number.
- The event detail page now shows the event creator as **Owner** (see feature 9).
