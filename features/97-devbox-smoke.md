# Feature 97: Devbox smoke test

> Source story: local smoke test
> Branch: feature/97-devbox-smoke

## Goal

Prove the devbox pipeline can take a docs-only story from spec to draft PR.

## Acceptance Criteria

- [ ] `docs/devbox-smoke.md` exists with the exact line `# Devbox smoke test`
- [ ] The change is committed on the branch
- [ ] The branch is pushed to origin
- [ ] A draft PR against `main` exists

## Constraints & Conventions

- Docs only. Do not touch application code.
- Do not merge the PR.
- Do not force-push.

## Definition of Done

- [ ] File created and committed
- [ ] Branch pushed
- [ ] Draft PR opened
- [ ] Implementation Notes updated

## Implementation Notes

(pending)

### Follow-up (2026-10-26): smoke verification

- Verified docs/devbox-smoke.md exists on feature/97-devbox-smoke.
- Pushed branch to origin and opened a draft PR for smoke testing of the devbox pipeline.
