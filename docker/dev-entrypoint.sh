#!/bin/sh
# Dev container entrypoint: install deps on first boot / after lockfile changes.
set -e

cd /workspace

if [ -f pnpm-lock.yaml ] && [ ! -d node_modules/.pnpm ]; then
  echo "[dev-entrypoint] node_modules missing -> running pnpm install..."
  pnpm install
fi

exec "$@"
