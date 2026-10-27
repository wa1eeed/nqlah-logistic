# NQLAH (نقلة) — Mobile App Design Brief (for Claude Design)

**Purpose:** a precise, self-contained brief to generate premium, production-ready
**mobile** screen designs for the NQLAH Flutter app. Hand this to Claude Design (or
use it to generate screens directly). It defines the visual system (light **and**
dark), the component language, and the exact screens/flows to design per user role.

**Grounding:** this brief reflects the **real NQLAH platform** (the backend and web
apps already built). Keep every screen faithful to the actual order journey,
account types, and group/policy-driven behavior described below — not a generic
logistics template.

---

## 0. Product & audience — the feeling to hit

NQLAH is a **Saudi B2B freight marketplace + logistics execution** platform. Users
are businesses and professional drivers, not casual consumers. The app must feel:

- **Trustworthy & premium** — money, contracts and cargo are at stake. Calm,
  confident, uncluttered. Closer to a fintech/operations tool than a flashy
  consumer app, but warmer and more human than an enterprise dashboard.
- **Arabic-first, RTL-native** — Arabic is the primary language and the layout is
  designed RTL from the start (not a mirrored English screen). English LTR is a
  first-class second.
- **Fast & legible on mid-range Android** — large tap targets, strong hierarchy,
  one-handed primary actions, readable numbers (prices, plates, container codes).
- **Role-specialized** — a customer, a provider, an owner-driver, and an employed
  driver each get a purpose-built home and navigation, not one shared screen.

---

## 1. Color system (light + dark) — best-practice for freight/logistics

The brand is **deep teal + mint green** — ideal for this category (teal/green reads
as trust, reliability, movement and "go"). Keep these; do not introduce a new brand
hue. Amber/red/blue appear **only** as semantic/status accents.

### 1.1 Brand & accent

| Token | Light | Dark | Use |
|---|---|---|---|
| `brand/primary` (deep teal) | `#0A3D3A` | `#0A3D3A` surfaces → text on mint | Brand, dark hero panels, app bar on branded screens |
| `brand/primary-tint` | `#0D5C57` | `#0D5C57` | Gradients, pressed brand surfaces |
| `accent/mint` (action) | `#00C9A7` | `#1FE0C0` | **Primary CTA**, active/selected, links, "live" |
| `accent/mint-strong` | `#00A88A` | `#00C9A7` | CTA pressed, emphasis |

> CTA buttons are **mint** (high contrast on teal and on white); the deep teal is a
> surface/brand color, not the main button color.

### 1.2 Neutrals (surfaces & text)

| Token | Light | Dark |
|---|---|---|
| `bg` (app background) | `#F6F8F8` | `#0B1413` |
| `surface` (card) | `#FFFFFF` | `#111E1C` |
| `surface-2` (elevated/sheet) | `#FFFFFF` + shadow | `#16perhaps→#17302C` |
| `border` / hairline | `#E6EAEA` | `#243533` |
| `text/primary` | `#0F1A19` | `#E8F0EF` |
| `text/secondary` | `#5B6B69` | `#9FB4B1` |
| `text/muted` | `#8A9997` | `#6E8582` |
| `overlay/scrim` | `rgba(10,26,25,.45)` | `rgba(0,0,0,.6)` |

### 1.3 Semantic

| Token | Light | Dark | Meaning |
|---|---|---|---|
| `success` | `#16A34A` | `#22C55E` | Delivered, confirmed, paid |
| `warning` | `#F59E0B` | `#FBBF24` | Pending action, attention, awaiting |
| `danger` | `#DC2626` | `#F87171` | Cancelled, dispute, destructive |
| `info` | `#2563EB` | `#60A5FA` | In-transit, neutral info |

### 1.4 Order-status palette (used on chips & the status timeline)

Map each real order status to a consistent color; keep it identical everywhere.

| Status | Tone |
|---|---|
| DRAFT | neutral/muted grey |
| PUBLISHED / BIDDING | `info` blue |
| ASSIGNED / CONFIRMED | `accent/mint` |
| IN_TRANSIT | `info` blue (animated/"live") |
| DELIVERED | `success` green |
| COMPLETED | deep teal (brand) |
| CANCELLED | `danger` red |
| Payment: reported | `warning` · confirmed `success` · disputed `danger` |
| POD / container-return pending | `warning` with a distinct icon |

> Status color is **in addition to** a label + icon — never color alone (accessibility).

### 1.5 Contrast & dark mode

- Meet WCAG AA for text (≥ 4.5:1 body, ≥ 3:1 large). Mint-on-white text must use
  `accent/mint-strong`; mint is fine for fills/icons.
- **Full dark mode** is required for every screen (not an afterthought). Dark uses
  deep teal-black surfaces, brighter mint for action, softened semantic colors.
  Maps get a dedicated dark tile style. Respect the OS light/dark setting with an
  in-app override.

---

## 2. Typography

- **Arabic UI:** `Tajawal` (matches the web). Weights 400 / 500 / 700.
- **Latin & all numerals** (prices, plates, phone, container/route codes, dates):
  `Inter`, tabular figures, always **LTR** even inside Arabic text.
- Keep Arabic headings tight; never let a heading wrap past two lines.

| Role | Size / weight |
|---|---|
| Display (rare, hero) | 28–32 / 700 |
| H1 screen title | 22–24 / 700 |
| H2 section | 18–20 / 700 |
| H3 / card title | 16 / 600 |
| Body | 15–16 / 400–500 |
| Secondary / label | 13–14 / 400 |
| Caption / meta | 11–12 / 400 |
| Price (emphasis) | 20–28 / 700, Inter tabular |

---

## 3. Spacing, shape, elevation, icons

- **Spacing:** 4-pt base; use 4/8/12/16/20/24/32. Screen side gutter 16. Card
  padding 16. Comfortable 12–16 between stacked fields.
- **Radii:** inputs/buttons 12; cards 16; sheets 20 (top corners); chips/pills full.
- **Elevation:** soft, low shadows in light (`0 1px 2px`, `0 6px 20px -8px` for
  sheets); in dark use border + subtle lift, not heavy shadows.
- **Icons:** one consistent line set (e.g. Lucide/Phosphor style), 1.75px stroke,
  rounded joins. Custom glyphs for truck types, container, POD, tracking.
- **Touch targets:** ≥ 44×44 (≥ 48 for driver primary actions).

---

## 4. Core components to design (reusable)

Primary / secondary / destructive / text buttons (+ loading & disabled) · bottom
nav (per role) · app bar (plain + branded teal) · **shipment card** · **provider
offer card** · **status chip** · **status timeline** (vertical, RTL) · **stop
timeline** (pickup → stops → destination, with container-return badge) · price
breakdown (service, VAT, commission, total) · capacity/truck-type chips · searchable
select · filter bottom sheet with active-count + chips + "clear all" + "apply (N)" ·
segmented control / stepper · text field (+ error/helper) · OTP input · date/time ·
rating · document/upload tile (with progress) · skeletons · empty / error / offline
/ permission-denied states · snackbar/toast · confirm dialog (destructive) · map
overlay card (location + freshness label) · **chat bubble + composer** (text /
voice-note / attachment) · **call screen** (voice & video) · avatar + verified badge.

---

## 5. Screens to design — by role (faithful to the platform)

Design **light + dark**, **Arabic RTL + English LTR**, phone sizes (small ~360dp &
large ~430dp). For flows, show the key states (loading / empty / success / error).

### 5.1 Common (all roles)
- Splash (fast, brand mark on teal) → Onboarding (2–3 slides, skippable).
- **Auth:** login (phone/email + password, reuse platform OTP), register. The
  register flow must mirror the web **account types & fields exactly**:
  **Client** vs **Carrier**; **COMPANY** vs **INDIVIDUAL**; CR number (COMPANY),
  VAT number + "not VAT-registered" toggle (15 digits), city/region, contact. For
  carrier signup include the **plan picker** (plan cards with dynamic price / truck
  limit / trial / modules). Progressive onboarding; "pending approval" vs "rejected"
  states with clear remediation.
- Role / context switcher (only for multi-role accounts) · Notifications inbox ·
  Profile & settings (language, theme, permissions, support) · Document viewer ·
  App-update notice · Error/offline/retry.

### 5.2 Customer (عميل)
- **Home:** prominent "طلب نقل جديد" CTA, active orders, compact progress summary,
  status chips, quick rebook, recent routes. No charts dominating the first screen.
- **Create order (wizard):** mirror the web journey exactly — Cargo (single vs
  **consolidated/مجمّع**; for mixed: **رحلات فرعية** each with its own truck type /
  destination / price / **intermediate stops**) → Route (origin, destination, map,
  optional intermediate stops with examples: return empty container, extra pickup…)
  → Dispatch (**نشر للسوق** vs **مباشر**) → Pricing (**مناقصة** vs **سعر ثابت**) →
  Collection → Review. Save draft; prevent duplicate submit.
- **My shipments:** list grouped by parent order / individual load; filters
  (status, date, route, vehicle, carrier where permitted, pending action); search
  reference/container/order #; active-filter chips; pagination.
- **Offers / العروض:** compare carrier offers side-by-side (price, rating if real,
  truck type, availability, validity); accept/decline.
- **Order detail:** parent order + its loads; per-load carrier/driver (per policy),
  **stop timeline**, documents, price breakdown, confirmed-payment status; clearly
  separate "cargo delivered" from "container-return complete".
- **Tracking:** map with last location + timestamp + **freshness label**
  (Live / updated X min ago / unavailable); pickup/current/next stop; ETA only when
  routing-backed.
- **Financial:** agreed charges, invoices, amount owed, pay-at-delivery terms,
  reported/confirmed/disputed. No fake wallet balance.

### 5.3 Transport Provider (مزوّد)
- **Home:** new opportunities (if marketplace allowed), admin-assigned loads, driver-
  assignment queue, active fleet/trips, exceptions, receivables (per contract).
- **Available loads:** cards (origin→destination, cargo, truck requirement, pickup,
  stops, payment terms, rate if permitted) + powerful filters; quote/accept only
  when policy + eligibility allow (**accept fixed price** vs **submit bid/مناقصة**).
- **Assignments:** segments — awaiting response / accepted-awaiting-driver / driver
  assigned / in transit / delivered-pending return / completed / exceptions.
- **Driver assignment:** searchable driver + vehicle, availability/eligibility,
  confirm (uses the existing provider→driver dispatch). Controlled driver-swap.
- **Fleet & drivers · Finances (earnings, direct-pay reported vs confirmed) ·
  Performance (real KPIs) · Profile & group.** Never show platform margin or
  competitors' offers.

### 5.4 Independent owner-driver (سائق مستقل ومزوّد)
A single verified account with a smart composed home / two modes:
- **Find loads** (browse/filter/quote/accept per policy) · **My operations**
  (received/accepted, **dispatch to self**, own drivers if any, availability) ·
  **My trips** (execute as driver) · **Earnings** · **Profile** (one identity
  linked to provider + driver records). A clear, minimal context toggle — not role
  selection on every screen.

### 5.5 Employed driver (سائق تابع) — execution-only
- **My trips** is home (NOT a marketplace): New / Upcoming / Active / Completed;
  current job card, next action, next stop, instructions, contact.
- **Trip execution:** ordered stops, big contextual actions (confirm pickup /
  arrival / load / unload / **container return** / exception), external-maps
  navigation shortcut, **ePOD** (photo/signature/OTP). Big targets, few taps.
- **Notifications · Account.** No freight board, bids, pricing, fleet or finance.

---

## 6. In-app communication (new — design the screens now)

The customer can contact the carrier **both before ordering and inside the order
screen**, with privacy-preserving rules:

- **Chat:** text + **voice notes** + attachments (image/doc). Bubbles RTL, clear
  sent/delivered/read, recording UI with waveform, playback with scrubber.
- **Voice call & video call:** in-app call screens (ringing, in-call controls:
  mute, speaker, flip camera, end; connection-quality indicator; call duration).
- **Contact reveal rules (privacy-first, like major platforms):**
  - **Before acceptance / while browsing:** communication is **in-app only** (chat/
    call) — phone numbers are **hidden**; show name + verified badge + rating only.
  - **After the carrier is accepted (order ASSIGNED+):** reveal both parties' full
    contact details to each other (name, phone, company) in the order screen.
- Design an "entry point to chat/call" on the offer card and the order detail, plus
  the full chat thread, the voice-note composer, and the voice/video call screens —
  in light & dark, RTL & LTR.

> Note for the build team: chat + voice/video are a **new backend capability**
> (realtime signaling + media/TURN); design now, implement as a separate track.

---

## 7. Maps & tracking (visual)

Premium but cost-controlled. Design: route overview (pickup / stops / destination /
truck marker), the **freshness label**, a dark map style, marker clustering for
fleet/multi-load, and graceful **fallback to list/timeline** when the map/route
provider is unavailable. Do not fabricate movement after stale data.

---

## 8. Motion

Restrained and purposeful: shared-element transitions where meaningful, responsive
bottom sheets, smooth tab/list transitions, interpolated truck-marker movement,
clear button-press feedback. Respect Reduced Motion. Motion must never compete with
a driver's critical action.

---

## 9. What to deliver (for Claude Design)

For each screen in §5 and §6, produce a **high-fidelity mobile mockup** (phone
frame), in **light and dark**, primarily **Arabic RTL** (plus one English LTR
reference per key screen). Prioritize these flows for the first round (the
spec's design-approval gate):

1. Customer: **create order** (consolidated + per-leg stops) + **my shipments
   (list/search/filter)** + **order detail with stop timeline & tracking**.
2. Provider: **available loads + filters** + **driver assignment**.
3. Owner-driver: **find loads / my operations**.
4. Employed driver: **active trip execution + ePOD**.
5. Auth/onboarding: **register (account types + carrier plan picker)**.
6. Communication: **chat thread + voice-note composer + video call**, and the
   **contact-reveal** difference (before vs after acceptance).

Keep one consistent design system across all screens; show real Arabic microcopy and
realistic data (plates, container codes, cities, prices, dates). Deliver the color
tokens and type scale as a one-page style sheet alongside the screens.

---

*Design tokens, exact map-provider styling, and final Arabic fonts are confirmed at
implementation time. This brief is the visual north star for the Flutter build; the
build targets high fidelity to the approved designs, iterating against on-device
screenshots.*
