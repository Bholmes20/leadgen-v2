#!/usr/bin/env bash
# Scheduled Facebook posting run — called 3x/day via cron.
# 1. Generates queued ads via the API (if server is up).
# 2. Posts eligible approved ads to Facebook.
# Uses flock to prevent overlapping runs.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$PROJECT_DIR/.env.local"
LOCK_FILE="/tmp/leadgen-fb-post.lock"
LOG_DIR="$PROJECT_DIR/logs"
TSX="$PROJECT_DIR/node_modules/.bin/tsx"
PORT=3002

mkdir -p "$LOG_DIR"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] [fb-cron] $*"; }

# ── Overlap guard ─────────────────────────────────────────────────────────────

exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  log "Another run is in progress — skipping this slot."
  exit 0
fi

# ── Load CRON_SECRET ──────────────────────────────────────────────────────────

CRON_SECRET="$(grep -m1 '^CRON_SECRET=' "$ENV_FILE" 2>/dev/null | cut -d= -f2-)"
if [[ -z "$CRON_SECRET" ]]; then
  log "WARN: CRON_SECRET not found in $ENV_FILE — skipping ad generation step."
fi

# ── Step 1: generate ads ──────────────────────────────────────────────────────

if [[ -n "$CRON_SECRET" ]]; then
  log "Generating ad..."
  HTTP_STATUS="$(curl -s -o /tmp/adgen-response.txt -w "%{http_code}" \
    -X POST "http://localhost:${PORT}/api/generate-ads" \
    -H "x-cron-secret: ${CRON_SECRET}" \
    -H "Content-Type: application/json" \
    -d '{"count":1}' 2>/dev/null || echo "000")"

  if [[ "$HTTP_STATUS" == "200" ]]; then
    log "Ad generation OK."
  else
    log "WARN: Ad generation returned HTTP $HTTP_STATUS ($(cat /tmp/adgen-response.txt 2>/dev/null || echo 'no body')) — continuing to posting step."
  fi
fi

# ── Step 2: post to Facebook ──────────────────────────────────────────────────

log "Running post-to-facebook..."
"$TSX" --env-file="$ENV_FILE" "$PROJECT_DIR/scripts/post-to-facebook.ts"
log "Done."
