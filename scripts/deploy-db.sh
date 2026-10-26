#!/usr/bin/env sh
#
# Post-deploy database step for the Naqla API container (staging / production).
# POSIX sh — works with the container's /bin/sh (busybox ash on Alpine); bash
# is not required.
#
# Run this AFTER the new code is deployed (Coolify Redeploy), from inside the
# API container, e.g.:
#
#     sh scripts/deploy-db.sh
#     # or:  SEED_MODE=seed sh scripts/deploy-db.sh   (staging, adds demo data)
#
# It is safe to re-run: every step is idempotent.
#
# Steps:
#   1. prisma migrate deploy      — apply pending migrations (never `migrate dev`)
#   2. admin                      — ensure the super-admin exists (prod), or the
#                                   full demo seed (staging, SEED_MODE=seed)
#   3. platform tax identity      — the seller on commission tax invoices
#
# Required env (from Coolify):
#   DATABASE_URL                  — the target database
# Recommended env:
#   SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD   — the super-admin credentials
#   PLATFORM_VAT_NUMBER           — Naqla's real 15-digit VAT number (REQUIRED
#                                   before issuing production invoices)
#   PLATFORM_CR_NUMBER / PLATFORM_NAME_AR / PLATFORM_ADDRESS   — platform identity
# Optional:
#   SEED_MODE=seed                — run the demo seed instead of ensure-admin
#                                   (staging only; NEVER in production)

set -eu
# pipefail is not POSIX; enable it only when the shell supports it (busybox ash
# and bash do), so a bare `sh` without it does not abort on `set`.
(set -o pipefail) 2>/dev/null && set -o pipefail || true

# Resolve the API directory whether this is run from the repo root or apps/api.
if [ -f "prisma/schema.prisma" ]; then
  API_DIR="$(pwd)"
elif [ -f "apps/api/prisma/schema.prisma" ]; then
  API_DIR="$(pwd)/apps/api"
else
  echo "❌ Could not find the API (prisma/schema.prisma). Run from the repo root or apps/api." >&2
  exit 1
fi
cd "$API_DIR"

if [ -z "${DATABASE_URL:-}" ]; then
  echo "❌ DATABASE_URL is not set." >&2
  exit 1
fi

echo "──────────────────────────────────────────────"
echo "Naqla DB deploy step  (API dir: $API_DIR)"
echo "──────────────────────────────────────────────"

echo ""
echo "▶ 1/3  Applying migrations (prisma migrate deploy)…"
npx prisma migrate deploy

echo ""
if [ "${SEED_MODE:-}" = "seed" ]; then
  echo "▶ 2/3  Seeding demo data (SEED_MODE=seed)…"
  node dist/prisma/seed.js
else
  echo "▶ 2/3  Ensuring super-admin…"
  node dist/prisma/ensure-admin.js
fi

echo ""
echo "▶ 3/3  Ensuring platform tax identity…"
node dist/prisma/ensure-platform-identity.js

echo ""
echo "✅ Done. The database matches this deploy."
