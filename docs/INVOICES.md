# Tax Invoices

VAT-compliant (Saudi/ZATCA) tax invoices, generated automatically when an order
completes. For the money math behind the amounts, see [`FINANCE.md`](FINANCE.md).

---

## 1. What gets generated

On `POST /orders/:id/complete` (client confirms receipt, or the 72-hour
auto-release), inside the completion transaction:

- **One SERVICE invoice** — `kind = SERVICE`, seller = **carrier**, buyer =
  **client**. Amounts = the service base / VAT / total. VAT is zero when the
  carrier is not VAT-registered.
- **One COMMISSION invoice per bearer** — `kind = COMMISSION`, seller = **the
  platform**, buyer = the party that bears the commission. Always VAT-bearing.
  - `commissionAppliesTo = CARRIER` → one invoice to the carrier.
  - `= CLIENT` → one invoice to the client.
  - `= BOTH` → **two** commission invoices (half each; the halves sum back to the
    full commission total).

Generation is **idempotent**: `InvoicesService.generateForOrder(tx, orderId,
financials)` no-ops if the order already has invoices, so a retried completion
never double-issues.

---

## 2. The platform as a party

The platform is the seller on every commission invoice but has **no `Company`
row**, so `issuerId` is `null` there. Its legal identity is read from settings:

| Setting key | Meaning |
| --- | --- |
| `platform_name_ar` | Legal name (seller name snapshot) |
| `platform_vat_number` | Platform VAT number |
| `platform_cr_number` | Platform commercial register |
| `platform_address` | Platform address |

Edit these from the **admin panel** — Settings → Financial → «الهوية الضريبية
للمنصة» — which writes the same setting keys. `db:ensure-platform-identity`
(part of `db:deploy`) only guarantees the rows exist after a fresh deploy,
seeding placeholders when missing; an optional env override
(`PLATFORM_VAT_NUMBER` / `PLATFORM_CR_NUMBER` / `PLATFORM_NAME_AR` /
`PLATFORM_ADDRESS`) exists for CI/bootstrap only.

> ⚠️ The seeded `platform_vat_number` (`300000000000003`) is a **placeholder** —
> set Naqla's real VAT number from the admin panel before issuing production
> invoices.

---

## 3. ZATCA party snapshots

Every invoice freezes both parties' identity **at issue time**, so it stays
correct even if a company later edits its VAT/CR number:

- `sellerName`, `sellerVatNumber`, `sellerCrNumber`
- `buyerName`, `buyerVatNumber`, `buyerCrNumber`

(`vatNumber` / `crNumber` remain as legacy seller fields, mirroring `seller*`.)

---

## 4. Model

Prisma `Invoice` (`apps/api/prisma/schema.prisma`):

```
id, invoiceNumber (unique)
kind            SERVICE | COMMISSION
status          DRAFT | ISSUED | PAID | OVERDUE | CANCELLED   (generated as ISSUED)
orderId         Order? (indexed, NOT unique — 2+ invoices per order)
issuerId        Company?  (null = the platform)
receiverId      Company?
amount          ex-VAT base
vatAmount       the VAT
totalAmount     base + VAT
seller*/buyer*  ZATCA party snapshots (§3)
notes, pdfUrl, dueDate, paidAt, createdAt, updatedAt
```

`Order.invoices` is a one-to-many relation; `GET /orders/:id` embeds the array.

---

## 5. API

Module `apps/api/src/modules/invoices/`:

| Method | Path | Who | Purpose |
| --- | --- | --- | --- |
| `GET` | `/invoices` 🔒 | any | The caller's invoices (issued or received); admin sees all. |
| `GET` | `/invoices/:id` 🔒 | any | One invoice with parties + order. |
| `POST` | `/invoices/:id/send` 🔒 | any | Mark as issued. |
| `POST` | `/invoices` 🔒 | any | Manual invoice (back-office). |

Auto-generated invoices are not created through the API — they are produced by
`generateForOrder` during completion.

---

## 6. Admin UI

The order detail (`apps/web/admin/.../orders/[id]/page.tsx`) shows a **Tax
Invoices** card: each invoice's kind, parties (`seller → buyer`), and base / VAT /
total.

---

## 7. Deferred (future)

- Rendered **PDF** per invoice and a **Fatoora Phase-2** QR / TLV field for full
  e-invoicing.
- Buyer-facing invoice lists in the client / carrier apps.

---

## 8. Changelog anchors

- v0.9.77 — VAT-compliant tax invoices on completion (phase 2b).
