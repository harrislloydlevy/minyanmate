Full disclosure - this is one step up form vibe-coded.

# MinyanMate

Coordinate minyans, RSVP from WhatsApp, never miss quorum. Greenfield rewrite of the original 2014 Rails app.

## Stack

- **Monorepo**: pnpm workspaces + Turborepo, TypeScript everywhere
- **Web**: Next.js (App Router) + Tailwind v4 + shadcn-style UI, PWA-ready
- **DB**: SQLite via Drizzle ORM (Postgres swap later) — `packages/db`
- **Domain**: recurrence + quorum engine — `packages/core`
- **WhatsApp**: Meta Cloud API client — `packages/whatsapp`
- **Worker**: job queue poller (reminders, notifications) — `apps/worker`
- **Auth**: Better Auth, phone-number OTP delivered via WhatsApp (dev: code in logs)

## Running the app

The dev server is **run externally by the human developer** (currently `pnpm dev` — web on `http://localhost:3100` plus the worker; see the Docker section below for the container workflow).

**Agents / automation: never start the dev server yourself.** Assume it is already running and hot-reloading your edits. Verify changes with `pnpm test`, `pnpm typecheck`, and `pnpm lint` instead. Do not run `pnpm build` against the same working copy while the dev server is up — a production build reuses `apps/web/.next` and leaves the running dev server returning 500s.

## Development (Docker)

Everything runs inside the container defined by the `Dockerfile` / `docker-compose.yml`:

```bash
docker compose up -d dev          # starts the dev container (installs deps on first boot)
docker compose exec dev pnpm dev  # web (localhost:3000) + worker with hot reload
```

One-time setup inside the container:

```bash
docker compose exec dev pnpm db:generate   # generate Drizzle migrations after schema edits
docker compose exec dev pnpm db:migrate    # apply migrations to data/dev.db
```

Sign-in code for local dev is printed to the web logs as `[dev-otp]`. In development any code is accepted, so testing does not require copying the logged value; the logged code remains the real one. New accounts are asked for a display name before entering the app — phone numbers are identity data and are never used as display names.

## Quality gates

```bash
docker compose run --rm ci pnpm test       # all package tests
docker compose run --rm ci pnpm typecheck  # strict TS across the monorepo
docker compose run --rm ci pnpm lint       # eslint
docker compose run --rm ci pnpm build      # production build
```

## Branch workflow

**All work happens on a feature branch — never directly on `main`.**

Each feature branch is the feature *view*: before it is tested or merged back, bring `main` into it so it already contains every previously merged feature. Resolve conflicts and fix wiring on the branch, not on `main`.

1. Branch from `main` when starting a feature.
2. Merge `main` **into** the branch before testing/merging: `git merge main` — this is where integration conflicts get resolved.
3. Get the branch to 100%: implementation complete and wired, feature file updated, `pnpm test` / `pnpm typecheck` / `pnpm lint` clean, and a manual pass on the running app.
4. Only then merge the branch into `main` and delete it (local and remote).
5. Never merge a partial branch into `main` — "present but unwired" counts as partial.

## Feature docs

Each feature lives in `features/` as a Markdown file (`<issue>-<slug>.md`) with its goal, acceptance criteria, implementation notes, and verification steps.

**When a feature's behaviour changes — a fix, follow-up request, or review wiring — update its feature file in the same commit as the code.** Keep the acceptance criteria checkboxes and Implementation Notes accurate: what was built, any deviations or known gaps, and how to verify. Don't leave the file describing the branch's original implementation once `main` behaves differently.

## Layout

```
apps/
  web/        Next.js app (UI, Server Actions, WhatsApp webhook)
  worker/     background job runner
packages/
  core/       pure domain logic: schedules, quorum state machine
  db/         Drizzle schema, migrations, SQLite client
  whatsapp/   Meta WhatsApp Cloud API client + webhook helpers
```

## Milestones

1. [x] Monorepo, Docker env, schema, auth, app shell
2. [ ] Event materialization + RSVP/quorum wiring
3. [ ] WhatsApp send + webhook (RSVP by button)
4. [ ] Worker handlers: reminders, quorum notifications
5. [ ] PWA polish, deploy (Fly.io + Litestream), CI
