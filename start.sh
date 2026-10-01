#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# MinyanMate — Quick Start Script
#
# Starts the MinyanMate web app in production mode on port 3100.
# DB migrations are run automatically if the DB file doesn't exist.
#
# Usage:
#   ./start.sh                          # start (or restart) the app
#   ./start.sh dev                      # start in dev mode (hot reload)
#   ./start.sh stop                     # stop the running instance
#   ./start.sh logs                     # tail the server logs
#   ./start.sh health                   # quick health check
# ──────────────────────────────────────────────────────────────────────────────

set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
APP_DIR="$ROOT/apps/web"
LOG_FILE="/tmp/minyanmate-web.log"
PID_FILE="/tmp/minyanmate-web.pid"
PORT="${PORT:-3100}"
NODE_ENV="${NODE_ENV:-production}"
BETTER_AUTH_URL="${BETTER_AUTH_URL:-http://localhost:${PORT}}"
DB_PATH="${DB_PATH:-$ROOT/data/dev.db}"

# Source .env if it exists (user-defined overrides)
if [ -f "$ROOT/.env" ]; then
  set -a; source "$ROOT/.env"; set +a
fi

export NODE_ENV BETTER_AUTH_URL DB_PATH PORT

case "${1:-start}" in
  start)
    echo "▸ Ensuring DB directory exists..."
    mkdir -p "$(dirname "$DB_PATH")"

    # Run migrations if the DB doesn't exist yet (first run)
    if [ ! -f "$DB_PATH" ]; then
      echo "▸ Running DB migrations..."
      cd "$ROOT"
      npx --yes pnpm@10.12.1 --filter @minyanmate/db exec tsx src/migrate.ts 2>&1 | tee -a "$LOG_FILE" || true
    fi

    echo "▸ Starting MinyanMate on http://localhost:$PORT ..."
    echo "▸ Logs: $LOG_FILE"
    cd "$APP_DIR"

    # Resolve absolute DB path to avoid workspace-root resolution issues
    ABS_DB="$(realpath "$DB_PATH" 2>/dev/null || echo "$DB_PATH")"

    nohup node -e "
      const { spawn } = require('child_process');
      const fs = require('fs');
      const nextPath = require.resolve('next/dist/bin/next');
      const logFd = fs.openSync('$LOG_FILE', 'a');
      const errFd = fs.openSync('$LOG_FILE', 'a');
      const p = spawn('node', [nextPath, 'start', '--port', '$PORT'], {
        stdio: ['ignore', logFd, errFd],
        detached: true,
        env: {
          ...process.env,
          NODE_ENV: '$NODE_ENV',
          BETTER_AUTH_URL: '$BETTER_AUTH_URL',
          DB_PATH: '$ABS_DB',
          APP_ENV: '\${APP_ENV:-development}'
        }
      });
      fs.writeFileSync('$PID_FILE', String(p.pid));
      p.unref();
    " 2>&1

    # Wait a few seconds and check
    sleep 3
    if curl -sf "http://localhost:$PORT/api/health" > /dev/null 2>&1; then
      echo "✅ MinyanMate is running at http://localhost:$PORT"
    else
      echo "⚠️  App started but health check didn't pass yet. Check logs: tail -f $LOG_FILE"
    fi
    ;;

  dev)
    echo "▸ Starting in dev mode on http://localhost:$PORT ..."
    cd "$ROOT"
    BETTER_AUTH_URL="$BETTER_AUTH_URL" DB_PATH="$DB_PATH" \
      pnpm --filter @minyanmate/web dev --port "$PORT" \
      2>&1 | tee "$LOG_FILE"
    ;;

  stop)
    if [ -f "$PID_FILE" ]; then
      PID=$(cat "$PID_FILE")
      echo "▸ Stopping MinyanMate (PID: $PID)..."
      kill "$PID" 2>/dev/null || true
      rm -f "$PID_FILE"
      echo "✅ Stopped"
    else
      # Try pkill as fallback
      pkill -f "next start.*port.*$PORT" 2>/dev/null && echo "✅ Stopped" || echo "No running instance found."
    fi
    ;;

  logs)
    tail -f "$LOG_FILE"
    ;;

  health)
    curl -sf "http://localhost:$PORT/api/health" && echo " ✅" || echo " ❌ App not responding"
    ;;

  *)
    echo "Usage: $0 {start|dev|stop|logs|health}"
    exit 1
    ;;
esac
