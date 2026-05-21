FROM node:20-alpine AS deps
WORKDIR /repo
RUN corepack enable && corepack prepare pnpm@9 --activate
COPY pnpm-workspace.yaml package.json ./
COPY apps/web/carrier/package.json apps/web/carrier/
COPY packages/shared-ui/package.json packages/shared-ui/
COPY packages/shared-types/package.json packages/shared-types/
COPY packages/shared-utils/package.json packages/shared-utils/
RUN pnpm install --frozen-lockfile=false

FROM node:20-alpine AS builder
WORKDIR /repo
COPY --from=deps /repo/node_modules ./node_modules
COPY . .
RUN corepack enable && corepack prepare pnpm@9 --activate
RUN pnpm --filter @naqla/carrier run build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /repo/apps/web/carrier/.next ./.next
COPY --from=builder /repo/apps/web/carrier/public ./public
COPY --from=builder /repo/apps/web/carrier/package.json ./
COPY --from=builder /repo/node_modules ./node_modules
EXPOSE 3003
CMD ["node_modules/.bin/next", "start", "-p", "3003"]
