#!/bin/sh
# API container entrypoint — runs the database step automatically on every start,
# then launches the server. Makes deploys self-applying: no manual `db:deploy`.
#
# migrate deploy is BLOCKING (a failed migration aborts startup, so the container
# never serves a schema it doesn't match → Coolify marks the deploy failed).
# The idempotent bootstraps are NON-FATAL (a transient failure logs a warning and
# the API still starts). Prisma takes an advisory lock, so parallel instances are
# safe. Set SKIP_DB_BOOTSTRAP=1 to launch the server without touching the DB.
set -eu

if [ "${SKIP_DB_BOOTSTRAP:-0}" != "1" ]; then
  echo "▶ [entrypoint] prisma migrate deploy…"
  node_modules/.bin/prisma migrate deploy

  echo "▶ [entrypoint] ensure admin / platform identity / plans (idempotent)…"
  node dist/prisma/ensure-admin.js            || echo "⚠ ensure-admin failed — continuing"
  node dist/prisma/ensure-platform-identity.js || echo "⚠ ensure-platform-identity failed — continuing"
  node dist/prisma/ensure-plans.js            || echo "⚠ ensure-plans failed — continuing"
else
  echo "▶ [entrypoint] SKIP_DB_BOOTSTRAP=1 — skipping the database step"
fi

echo "▶ [entrypoint] starting API…"
exec node dist/src/main.js
