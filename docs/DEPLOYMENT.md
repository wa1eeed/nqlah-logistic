# 🚀 Deployment — نقلة لوجيستك

دليل النشر للإنتاج، البيئات، وتفاصيل البنية التحتية.

---

## 1. البيئات (Environments)

| البيئة | الغرض | الـ Host | NODE_ENV | الحالة |
|---|---|---|---|---|
| **Development** | تطوير محلي على جهاز المطوّر | `localhost` | `development` | ✅ جاهز |
| **Staging** | اختبار قبل الإنتاج | TBD | `staging` | 🚧 لم يُنشأ |
| **Production** | الخدمة الحيّة للمستخدمين | `187.124.218.110` | `production` | 🚧 لم يُنشأ |

### 1.1 ملفات الـ Env

اعتباراً من v0.5.0، كل بيئة لها ملف env منفصل، ومتعقَّب في الـ repo فقط بصيغة `.example`:

```
.env.development.example   ← قالب للتطوير المحلي
.env.staging.example       ← قالب staging
.env.production.example    ← قالب production
```

الـ runtime يحمّل `.env.${NODE_ENV}` تلقائياً عبر `ConfigModule.forRoot({ envFilePath: [...] })`. إذا غاب الملف، يفشل الـ validation عند الـ bootstrap بدلاً من السماح بتشغيل بقيم خاطئة.

### 1.2 الفروقات بين البيئات

| المتغيّر | Development | Staging | Production |
|---|---|---|---|
| `PAYMENT_PROVIDER` | `mock` | `mock` | `moyasar` (إلزامي) |
| `SMS_PROVIDER` | `console` | `console` | `unifonic` (إلزامي) |
| `JWT_SECRET` length | ≥ 32 chars | ≥ 64 chars | ≥ 64 chars + يختلف عن REFRESH |
| `MINIO_USE_SSL` | `false` | `false` | `true` (إلزامي) |
| `CORS_ORIGINS` | `http://localhost:*` | `https://*.staging.naqla.sa` | `https://*.naqla.sa` (HTTPS only) |
| `SENTRY_DSN` | (اختياري) | (warn فقط) | (إلزامي) |
| `JWT_EXPIRES_IN` | `15m` | `15m` | `15m` |

### 1.3 Env Validation

`apps/api/src/config/env.validation.ts` ينفّذ التحقق التالي عند كل bootstrap:

- ✅ المتغيرات المطلوبة موجودة (12 متغيّر أساسي)
- ✅ `NODE_ENV ∈ {development, staging, production, test}`
- ✅ JWT secrets ≥ min length (يختلف per env)
- ✅ في production: JWT_SECRET ≠ JWT_REFRESH_SECRET
- ✅ providers ∈ القيم المعروفة
- ✅ في production: لا `mock` providers، CORS HTTPS-only، MINIO_USE_SSL=true، SENTRY_DSN موجود

عند الفشل، رسالة الخطأ تجمع كل المشاكل معاً (بدل ما تفشل عند أول مشكلة):

```
❌ Environment validation failed:
  • Missing required env var: REDIS_URL
  • JWT_SECRET must be ≥ 64 chars in production
  • PAYMENT_PROVIDER cannot be "mock" in production
  • MINIO_USE_SSL must be "true" in production
```

### 1.4 إعداد بيئة جديدة (deploy checklist)

1. انسخ القالب المناسب: `cp .env.{env}.example .env.{env}`
2. استبدل كل قيم `PLACEHOLDER` بقيم حقيقية (من Doppler/Vault/1Password)
3. ولّد JWT secrets جدد: `openssl rand -hex 32` (×2، لـ SECRET و REFRESH_SECRET)
4. تأكد من إعداد MinIO bucket مناسب للبيئة (`naqla-staging` أو `naqla-prod`)
5. اضبط CORS بدقّة (subdomains الفعلية فقط، لا wildcards)
6. شغّل: `NODE_ENV={env} pnpm --filter @naqla/api start` — الـ validation يجب أن يمرّ
7. شغّل seed لو أوّل deploy: `NODE_ENV={env} pnpm db:seed`

---

## 2. Production Server

### 2.1 معلومات الـ Server

| البند | القيمة |
|---|---|
| **IP** | `187.124.218.110` |
| **OS** | TBD (مفترَض Ubuntu 22.04 LTS) |
| **Specs** | TBD |
| **Network** | TBD |
| **Storage** | TBD |
| **Backup** | TBD |

### 2.2 المنافذ المتوقّعة

| Port | الخدمة | متاح خارجياً؟ |
|---|---|---|
| `80` | HTTP (redirect to HTTPS) | ✅ |
| `443` | HTTPS (Nginx / Coolify proxy) | ✅ |
| `5432` | PostgreSQL | ❌ (داخلي فقط) |
| `6379` | Redis | ❌ (داخلي فقط) |
| `9000` | MinIO API | ❌ (داخلي فقط) |
| `9001` | MinIO Console | ❌ (VPN فقط) |
| `4000` | API (internal) | ❌ (عبر proxy) |

### 2.3 النطاقات (Domains)

| Subdomain | الواجهة | TLS |
|---|---|---|
| `naqla.sa` | Landing | Let's Encrypt |
| `admin.naqla.sa` | Admin dashboard | Let's Encrypt |
| `app.naqla.sa` | Client app | Let's Encrypt |
| `carrier.naqla.sa` | Carrier app | Let's Encrypt |
| `api.naqla.sa` | REST API | Let's Encrypt |
| `cdn.naqla.sa` | MinIO public objects | Let's Encrypt |

> ⚠️ النطاقات أعلاه مقترحة. التأكيد النهائي مع إعداد DNS.

---

## 3. Environment Variables

> 🚧 **يُكمل لاحقاً.**
>
> ### المتغيّرات المتوقّعة (مرجع أوّلي):
>
> #### Backend API
> - [ ] `DATABASE_URL` — postgres connection string
> - [ ] `DIRECT_URL` — direct connection لـ Prisma migrations
> - [ ] `REDIS_URL` — redis connection
> - [ ] `JWT_SECRET` — مفتاح توقيع access tokens
> - [ ] `JWT_REFRESH_SECRET` — مفتاح توقيع refresh tokens
> - [ ] `JWT_ACCESS_TTL` — `15m`
> - [ ] `JWT_REFRESH_TTL` — `7d`
> - [ ] `MINIO_ENDPOINT` / `MINIO_ACCESS_KEY` / `MINIO_SECRET_KEY` / `MINIO_BUCKET`
> - [ ] `RESEND_API_KEY` — للبريد
> - [ ] `SMS_PROVIDER` / `SMS_API_KEY` / `SMS_SENDER_ID`
> - [ ] `CORS_ORIGINS` — comma-separated whitelist
> - [ ] `THROTTLE_TTL` / `THROTTLE_LIMIT`
> - [ ] `SENTRY_DSN`
> - [ ] `NODE_ENV` — `production`
>
> #### Frontend (per app)
> - [ ] `NEXT_PUBLIC_API_URL` — `https://api.naqla.sa`
> - [ ] `NEXT_PUBLIC_WS_URL` — `wss://api.naqla.sa`
> - [ ] `NEXT_PUBLIC_SENTRY_DSN`
> - [ ] `NEXT_PUBLIC_GA_ID`
>
> ✏️ سيتم توليد ملف `.env.example` كامل في المرحلة التالية.

---

## 4. Docker Production Build

> 🚧 **يُكمل لاحقاً.**
>
> الـ infrastructure للإنتاج: `docker-compose.production.yml` موجود لكن لم يُختبر بعد.
>
> الخطوات المخطّطة:
> - [ ] Multi-stage Dockerfile لكل تطبيق (api + 4 web apps)
> - [ ] Optimized images (alpine + standalone Next.js output)
> - [ ] Image scanning (Trivy / Snyk)
> - [ ] Image registry (Docker Hub خاص أو GitHub Container Registry)
> - [ ] Health check probes لكل خدمة
> - [ ] Resource limits (CPU/Memory) لكل container
> - [ ] Volumes لـ persistent data (Postgres, MinIO, logs)
> - [ ] Backup containers / cron jobs

### الـ Dockerfile الموجود حالياً

- `apps/api/Dockerfile` ✅

### Dockerfiles مطلوبة

- [ ] `apps/web/landing/Dockerfile`
- [ ] `apps/web/admin/Dockerfile`
- [ ] `apps/web/client/Dockerfile`
- [ ] `apps/web/carrier/Dockerfile`

---

## 5. Coolify Setup

> 🚧 **يُكمل لاحقاً.**
>
> الخطوات المخطّطة:
> - [ ] تثبيت Coolify على الـ Server (`187.124.218.110`)
> - [ ] ربط GitHub repo
> - [ ] إعداد webhooks للنشر التلقائي على push إلى `main`
> - [ ] تكوين 5 services في Coolify:
>   - `naqla-api`
>   - `naqla-admin`
>   - `naqla-client`
>   - `naqla-carrier`
>   - `naqla-landing`
> - [ ] Environment variables لكل service (encrypted)
> - [ ] Auto SSL via Let's Encrypt
> - [ ] Domain routing لكل subdomain
> - [ ] Persistent volumes للـ Postgres + MinIO
> - [ ] Backup strategy (daily database dumps)
> - [ ] Monitoring webhooks (Slack/Discord on deploy)

### خطوات التشغيل المخطّطة (high-level)

```bash
# 1. SSH للسيرفر
ssh root@187.124.218.110

# 2. تثبيت Coolify (مرّة واحدة)
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash

# 3. فتح Coolify UI: https://187.124.218.110:8000
# 4. إنشاء project: naqla-platform
# 5. إضافة 5 resources (api + 4 web)
# 6. ربط GitHub repo
# 7. إعداد env vars
# 8. أوّل deploy
```

---

## 6. Database Migrations في الإنتاج

### الـ Workflow الآمن

```bash
# 1. أنشئ migration محلياً
cd apps/api
pnpm prisma migrate dev --name describe_change

# 2. اختبر محلياً
pnpm db:seed
pnpm dev
# تأكّد أن كل شيء يعمل

# 3. ارفع على staging
git push origin staging
# Coolify ينشر تلقائياً
# في staging:
pnpm prisma migrate deploy

# 4. اختبر على staging

# 5. ارفع على production
git checkout main && git merge staging && git push origin main
# Coolify ينشر تلقائياً
# في production:
pnpm prisma migrate deploy  # عبر hook في Coolify
```

### Backups قبل الـ migration
```bash
# Coolify يدير backup يومي تلقائي، لكن قبل أي migration كبير:
docker exec naqla-postgres pg_dump -U naqla naqla_prod > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Backup Script اليومي (`scripts/backup-db.sh`)

أضِفت في v0.5.0 — يدمج `pg_dump` + `gzip` + رفع لـ MinIO في pipeline واحد:

```bash
# تشغيل يدوي
./scripts/backup-db.sh

# مع بيئة محدّدة
NODE_ENV=production ./scripts/backup-db.sh
```

**جدولة كرون (production)** — backup يومي الساعة 2:00 صباحاً UTC:

```cron
0 2 * * *   /opt/naqla/scripts/backup-db.sh >> /var/log/naqla-backup.log 2>&1
```

**ما يفعله:**
1. يحمّل `.env.${NODE_ENV}` (defaults إلى `development`)
2. `pg_dump --no-owner --no-privileges --clean --if-exists` → `gzip -9`
3. يرفع إلى `naqla-backup/${MINIO_BUCKET}/backups/naqla-${env}-${timestamp}.sql.gz`
4. يحذف backups أقدم من `BACKUP_RETENTION_DAYS` (افتراضي 30 يوم)

**متطلبات الـ host:** `pg_dump` (postgresql-client بنفس النسخة الكبيرة للـ DB)، `mc` (MinIO client)، `gzip`.

---

## 7. CI/CD Pipeline

> 🚧 **يُكمل لاحقاً.**
>
> GitHub Actions:
> - [ ] `.github/workflows/ci.yml` — على كل PR:
>   - `pnpm install --frozen-lockfile`
>   - `pnpm lint`
>   - `pnpm test`
>   - `pnpm build`
>   - Type-check across all apps
> - [ ] `.github/workflows/deploy-staging.yml` — على push إلى `staging`
> - [ ] `.github/workflows/deploy-production.yml` — على push إلى `main` (مع manual approval)

---

## 8. Rollback Procedure

> 🚧 **يُكمل لاحقاً.**
>
> - [ ] Rollback عبر Coolify UI (deploy السابق بنقرة)
> - [ ] Rollback لـ database (restore أحدث backup)
> - [ ] Communication plan (Slack channel + status page)

---

## 9. Performance & Scaling

> 🚧 **يُكمل لاحقاً.**
>
> Targets أولية:
> - **API**: < 200ms p95 latency
> - **Web**: < 1.5s LCP, < 100ms INP
> - **DB**: connection pool size 20, query timeout 10s
>
> خطط التوسّع:
> - [ ] Horizontal scaling للـ API (multiple replicas + load balancer)
> - [ ] Read replicas لـ Postgres للقراءات الكثيفة
> - [ ] CDN (Cloudflare) للـ static assets
> - [ ] Image optimization (next/image + S3)
> - [ ] Caching strategy (Redis) للقراءات المتكرّرة

---

## 10. الأمان في الإنتاج

> 📄 راجع: [`SECURITY.md`](./SECURITY.md) (يُكمل في الأمر التالي)

نقاط حرجة قبل الإطلاق:
- [ ] فحص أمني شامل (penetration test)
- [ ] تشفير كل المفاتيح في secrets manager
- [ ] WAF (Cloudflare/AWS) أمام الـ API
- [ ] Rate limiting صارم على endpoints الحسّاسة
- [ ] 2FA إلزامي للأدمن
- [ ] Audit log لكل الإجراءات الإدارية
- [ ] Compliance audit (نظام حماية البيانات السعودي + الزكاة والضريبة)
