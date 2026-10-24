# Running the Backend Locally (dev)

The demo frontends work on their own against `mock-data` (with a mock SWR
fallback), but **wiring features to the real API** needs the backend running.
This is the exact bring-up used for live verification.

## Prerequisites

- **PostgreSQL** (16+) running locally.
- **Redis** running locally — the API connects at boot (`RedisService.onModuleInit`).
- Node + pnpm (repo toolchain).

MinIO is **not** required: `UploadsService` swallows connection errors, so only
file uploads are affected.

## 1. Database

```bash
# role + database (owner)
psql -d postgres -c "CREATE ROLE naqla LOGIN PASSWORD 'naqla_dev_pw' CREATEDB;"
psql -d postgres -c "CREATE DATABASE naqla_dev OWNER naqla;"
```

## 2. Redis

```bash
brew install redis            # once
redis-server --daemonize yes  # or: brew services start redis
redis-cli ping                # -> PONG
```

## 3. Environment

Create a repo-root `.env` (it is gitignored). Start from
`.env.development.example` and fill the required vars — the API validates them
at boot (`apps/api/src/config/env.validation.ts`): `DATABASE_URL`, `REDIS_URL`,
`JWT_SECRET` / `JWT_REFRESH_SECRET` (≥ 32 chars in dev), `MINIO_*` (present but
may be dummy), `NODE_ENV`, `PORT`, `FRONTEND_URL`, `CORS_ORIGINS` (include the
three portals: 3002/3003/3004). Dev-only secrets are fine locally — never reuse
them anywhere real.

`DATABASE_URL=postgresql://naqla:naqla_dev_pw@localhost:5432/naqla_dev`

The frontends read `NEXT_PUBLIC_API_URL` (defaults to `http://localhost:4000`).

## 4. Migrate + seed

```bash
cd apps/api
set -a && . ../.env && set +a       # load env for the Prisma CLI
pnpm exec prisma generate
pnpm exec prisma migrate deploy      # or: migrate dev --name <change> when editing schema
pnpm exec tsx prisma/seed.ts         # seeds demo accounts + carrier fleet
```

Demo accounts (email or phone both work):

| Role    | Email              | Password      |
|---------|--------------------|---------------|
| Admin   | admin@naqla.sa     | `Admin@1234`   |
| Client  | client@naqla.sa    | `Client@1234`  |
| Carrier | carrier@naqla.sa   | `Carrier@1234` |

## 5. Run the API

```bash
cd apps/api
pnpm run build
# The generated Prisma client lives in src/generated/prisma and nest-cli does
# not copy it into dist, so copy it once after each build:
cp -R src/generated/prisma dist/src/generated/prisma
set -a && . ../.env && set +a
node dist/src/main.js
```

The API serves on `http://localhost:4000` with a global `/api` prefix
(`http://localhost:4000/docs` for Swagger). Responses use the envelope
`{ success, data, meta? }`; errors are `{ success:false, error:{ code, message[], messageEn[] } }`.
Log in at `POST /api/auth/login` with `{ phoneOrEmail, password }`.

### Caveats (local build layout)

- `nest build` emits `dist/src/main.js` (not `dist/main.js`), so run that path
  directly. The repo's `start` script (`node dist/main.js`) predates the current
  layout.
- `pnpm run db:seed` runs the compiled `dist/prisma/seed.js`, which resolves the
  generated client from `../src/generated/prisma`; running the `.ts` with `tsx`
  (as above) avoids the dist copy for seeding.

## Signing in on the frontend

The portals store a token under `naqla_<portal>_token`. The literal
`dev-bypass-token` is **not** a real JWT — the API rejects it and the frontend
falls back to mock data. To exercise the live API, sign in through the portal's
login page (or store a real `accessToken` from `POST /api/auth/login`).
