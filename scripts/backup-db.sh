#!/usr/bin/env bash
# Daily SQLite backup — timestamped, compressed, verified.
# Retains 7 copies. Alerts Discord on failure.
# Run: bash scripts/backup-db.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
DB_PATH="$PROJECT_DIR/data/leads.db"
BACKUP_DIR="$PROJECT_DIR/backups"
ENV_FILE="$PROJECT_DIR/.env.local"
RETAIN_DAYS=7
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP_FILE="$BACKUP_DIR/leads_${TIMESTAMP}.db"

# ── Helpers ───────────────────────────────────────────────────────────────────

log() { echo "[backup] $*"; }

discord_alert() {
  local message="$1"
  local webhook
  webhook="$(grep -m1 '^DISCORD_WEBHOOK_URL=' "$ENV_FILE" 2>/dev/null | cut -d= -f2-)"
  if [[ -z "$webhook" ]]; then return; fi
  curl -s -X POST "$webhook" \
    -H "Content-Type: application/json" \
    -d "{\"embeds\":[{\"title\":\"SQLite Backup Failed\",\"description\":\"$message\",\"color\":15158332,\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}]}" \
    > /dev/null
}

fail() {
  rm -f "$BACKUP_FILE"
  log "ERROR: $*"
  discord_alert "$*"
  exit 1
}

# ── Pre-flight ────────────────────────────────────────────────────────────────

mkdir -p "$BACKUP_DIR"

[[ -f "$DB_PATH" ]] || fail "Database not found at $DB_PATH"
command -v sqlite3 >/dev/null 2>&1 || fail "sqlite3 not installed"

# ── Backup ────────────────────────────────────────────────────────────────────

log "Backing up $DB_PATH → $BACKUP_FILE"

# Use SQLite's online backup — safe under concurrent reads/writes
sqlite3 "$DB_PATH" ".backup $BACKUP_FILE" \
  || fail "sqlite3 .backup command failed"

# ── Verify ────────────────────────────────────────────────────────────────────

log "Verifying integrity..."
INTEGRITY="$(sqlite3 "$BACKUP_FILE" "PRAGMA integrity_check;" 2>&1)"
if [[ "$INTEGRITY" != "ok" ]]; then
  rm -f "$BACKUP_FILE"
  fail "Integrity check failed: $INTEGRITY"
fi

# ── Compress ──────────────────────────────────────────────────────────────────

gzip "$BACKUP_FILE"
FINAL="${BACKUP_FILE}.gz"
SIZE="$(du -sh "$FINAL" | cut -f1)"
log "Compressed: $FINAL ($SIZE)"

# ── Prune ─────────────────────────────────────────────────────────────────────

PRUNED="$(find "$BACKUP_DIR" -name "leads_*.db.gz" -mtime +${RETAIN_DAYS} -print -delete | wc -l | tr -d ' ')"
[[ "$PRUNED" -gt 0 ]] && log "Pruned $PRUNED backup(s) older than ${RETAIN_DAYS} days"

# ── Done ──────────────────────────────────────────────────────────────────────

TOTAL="$(find "$BACKUP_DIR" -name "leads_*.db.gz" | wc -l | tr -d ' ')"
log "Done — $TOTAL backup(s) retained"
