# Account deletion (Apple App Review 5.1.1(v))

A **real**, grace-period account deletion the user triggers from the app:
Profile → «حذف الحساب».

## Flow
1. **Request** (`POST /account/deletion`) — blocked (409 `DELETION_BLOCKED` + the
   pending items) while the user's company has any **active order**
   (PUBLISHED/BIDDING/ASSIGNED/CONFIRMED/IN_TRANSIT/DELIVERED/DISPUTED) or any
   **unpaid invoice** (ISSUED/OVERDUE). Otherwise the account is **frozen now**
   (`isActive=false`) and scheduled for purge **30 days** later.
2. **Grace period** — the user can **cancel** (`DELETE /account/deletion`) and
   reactivate any time before the purge.
3. **Purge** — after 30 days, PII is **anonymized** (name→placeholder,
   email/avatar/nationalId→null, phone→`deleted-<id>`, password cleared),
   sessions + push tokens revoked. The row is kept but stripped, so
   legally-required (now anonymized) tax invoices/orders stay intact (ZATCA).

Endpoints: `GET /account/deletion` (status + `canDelete` + `blockers`),
`POST`/`DELETE /account/deletion`. Mobile: `AccountDeletionScreen`
(`/account/delete`) + `AccountRepository`.

## Required: schedule the purge (daily)
The purge runs via a deploy-token-protected endpoint (no extra runtime
dependency). Wire a **daily** scheduled job (Coolify scheduled task, or any
cron) to call it with the same `APP_VERSION_DEPLOY_TOKEN` used by the version
hook:

```bash
curl -fsS -X POST "$API_BASE/account/deletion/purge" \
  -H "x-deploy-token: $APP_VERSION_DEPLOY_TOKEN"
# → {"purged": <n>}
```

> ⚠️ If this job is not scheduled, accounts are frozen on request but never
> actually purged — which would break the compliance guarantee. Set it up before
> launch.

## Apple review notes
- This satisfies **5.1.1(v)** (in-app account deletion). The grace period +
  deferred purge is an Apple-accepted pattern.
- Deletion is genuinely performed (PII anonymized); retaining anonymized,
  legally-required financial records is an allowed exception — disclose it.
- The in-app copy tells the user the account/data will be deleted and gives the
  date; that statement is **true** (the purge runs and removes PII).
