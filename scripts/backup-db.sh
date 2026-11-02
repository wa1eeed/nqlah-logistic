#!/usr/bin/env bash
# -----------------------------------------------------------------------------
# scripts/backup-db.sh — Daily Postgres → Cloudflare R2 backup, 30-day retention.
#
# Usage:
#   ./scripts/backup-db.sh                       (uses env from current shell)
#   NODE_ENV=production ./scripts/backup-db.sh   (loads .env.production)
#
# Schedule via cron (production):
#   0 2 * * *   /opt/naqla/scripts/backup-db.sh >> /var/log/naqla-backup.log 2>&1
#
# Requirements on the host:
#   • pg_dump  (postgresql-client matching the DB major version)
#   • mc       (MinIO client — also speaks to R2's S3 API)
#   • gzip
#
# Reads:
#   DATABASE_URL       — connection string for pg_dump
#   R2_ENDPOINT        — R2 S3 endpoint, e.g. https://<acct>.r2.cloudflarestorage.com
#   R2_ACCESS_KEY      — R2 access key
#   R2_SECRET_KEY      — R2 secret key
#   R2_BACKUP_BUCKET   — a PRIVATE R2 bucket for DB dumps (NOT the public assets
#                        bucket; e.g. nqlah-backups). Never give it a public domain.
#   NODE_ENV           — used to namespace backups (dev/staging/prod)
# -----------------------------------------------------------------------------

set -euo pipefail

# ─── Load env file ───────────────────────────────────────────────────────────
ENV_NAME="${NODE_ENV:-development}"
ENV_FILE=".env.${ENV_NAME}"
if [ -f "${ENV_FILE}" ]; then
  # shellcheck disable=SC1090
  set -a; source "${ENV_FILE}"; set +a
fi

# ─── Validate required env ───────────────────────────────────────────────────
: "${DATABASE_URL:?DATABASE_URL is required}"
: "${R2_ENDPOINT:?R2_ENDPOINT is required}"
: "${R2_ACCESS_KEY:?R2_ACCESS_KEY is required}"
: "${R2_SECRET_KEY:?R2_SECRET_KEY is required}"
: "${R2_BACKUP_BUCKET:?R2_BACKUP_BUCKET is required (a PRIVATE bucket, not the assets bucket)}"

RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
TIMESTAMP="$(date -u +%Y%m%d-%H%M%S)"
BACKUP_NAME="naqla-${ENV_NAME}-${TIMESTAMP}.sql.gz"
TMPFILE="$(mktemp -t naqla-backup.XXXXXX).sql.gz"
trap 'rm -f "${TMPFILE}"' EXIT

# ─── Dump + compress in a single pipeline (no intermediate disk file) ────────
echo "[$(date -u +%FT%TZ)] Dumping database..."
pg_dump --no-owner --no-privileges --clean --if-exists "${DATABASE_URL}" | gzip -9 > "${TMPFILE}"
SIZE_BYTES=$(stat -f%z "${TMPFILE}" 2>/dev/null || stat -c%s "${TMPFILE}")
echo "[$(date -u +%FT%TZ)] Dump completed: ${SIZE_BYTES} bytes"

# ─── Configure the S3 client against R2 (idempotent) ─────────────────────────
mc alias set naqla-backup "${R2_ENDPOINT}" "${R2_ACCESS_KEY}" "${R2_SECRET_KEY}" > /dev/null

# Ensure the private backup bucket exists (no-op if already there)
mc mb --ignore-existing "naqla-backup/${R2_BACKUP_BUCKET}" > /dev/null || true

# ─── Upload ──────────────────────────────────────────────────────────────────
DEST="naqla-backup/${R2_BACKUP_BUCKET}/${ENV_NAME}/${BACKUP_NAME}"
echo "[$(date -u +%FT%TZ)] Uploading to ${DEST}..."
mc cp "${TMPFILE}" "${DEST}"
echo "[$(date -u +%FT%TZ)] Upload successful"

# ─── Retention: delete backups older than RETENTION_DAYS days ────────────────
echo "[$(date -u +%FT%TZ)] Pruning backups older than ${RETENTION_DAYS} days..."
mc rm --recursive --force --older-than "${RETENTION_DAYS}d" \
  "naqla-backup/${R2_BACKUP_BUCKET}/${ENV_NAME}/" 2>/dev/null || true

echo "[$(date -u +%FT%TZ)] ✅ Backup complete: ${BACKUP_NAME}"
