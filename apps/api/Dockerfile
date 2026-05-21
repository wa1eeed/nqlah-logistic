# ─── Stage 1: builder ──────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /repo

RUN corepack enable && corepack prepare pnpm@9 --activate

COPY pnpm-workspace.yaml package.json ./
COPY apps/api/package.json apps/api/
COPY packages/shared-types/package.json packages/shared-types/
COPY packages/shared-utils/package.json packages/shared-utils/
RUN pnpm install --frozen-lockfile=false

COPY . .
RUN pnpm --filter @naqla/shared-utils run build
RUN pnpm --filter @naqla/api run db:generate \
 && pnpm --filter @naqla/api run build

# ─── Stage 2: runtime ──────────────────────────────────────────
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

RUN apk add --no-cache openssl tini

# Root node_modules is the pnpm store; its internal symlinks use relative
# paths (.pnpm/…) so they resolve correctly after COPY to a new location.
# This includes .prisma/client generated inside the pnpm store.
COPY --from=builder /repo/node_modules ./node_modules

# Workspace packages live outside the pnpm store (only linked per-app).
# Copy the built package and expose it under node_modules/@naqla.
COPY --from=builder /repo/packages/shared-utils ./packages/shared-utils
RUN mkdir -p node_modules/@naqla \
 && ln -sf /app/packages/shared-utils node_modules/@naqla/shared-utils

COPY --from=builder /repo/apps/api/dist ./dist
COPY --from=builder /repo/apps/api/package.json ./
COPY --from=builder /repo/apps/api/prisma ./prisma

EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO /dev/null http://localhost:4000/health || exit 1
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/src/main.js"]
