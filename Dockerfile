# syntax=docker/dockerfile:1
ARG NODE_VERSION=24

# ---- base: system tools + pnpm + opencode ----------------------------------
FROM node:${NODE_VERSION}-bookworm-slim AS base

# git: turbo + opencode | python3/make/g++: better-sqlite3 native builds | curl: healthchecks
RUN apt-get update \
  && apt-get install -y --no-install-recommends git ca-certificates curl python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

# pnpm version is pinned via the "packageManager" field in package.json
RUN corepack enable

# opencode CLI (pinned for reproducibility via build arg)
ARG OPENCODE_VERSION=latest
RUN npm install -g --no-audit --no-fund opencode-ai@${OPENCODE_VERSION}

ENV pnpm_config_store_dir=/pnpm/store
WORKDIR /workspace

# ---- dev: interactive development (code arrives via bind mount) ------------
FROM base AS dev
ENV NODE_ENV=development

# Pre-create mount points so named volumes inherit node-user ownership
RUN mkdir -p /workspace/node_modules /pnpm/store \
      /home/node/.config/opencode /home/node/.local/share/opencode \
  && chown -R node:node /workspace /pnpm /home/node/.config /home/node/.local

COPY --chmod=0755 docker/dev-entrypoint.sh /usr/local/bin/dev-entrypoint.sh

USER node
ENTRYPOINT ["dev-entrypoint.sh"]
CMD ["sleep", "infinity"]

# ---- ci: non-interactive build + test (used locally and in GitHub Actions) --
FROM base AS ci
COPY --chown=node:node . .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

USER node
CMD ["pnpm", "test"]
