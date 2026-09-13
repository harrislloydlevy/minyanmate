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

Sign-in code for local dev is printed to the web logs as `[dev-otp]`.

## Quality gates

```bash
docker compose run --rm ci pnpm test       # all package tests
docker compose run --rm ci pnpm typecheck  # strict TS across the monorepo
docker compose run --rm ci pnpm lint       # eslint
docker compose run --rm ci pnpm build      # production build
```

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
