# Prompt for Claude Design — NQLAH (نقلة) mobile app

> Paste this into Claude Design (claude.ai). It gives rich context + hard
> guardrails, then **leaves the creative visual design to you**, and asks you to
> deliver a precise **implementation handoff** so an engineer can rebuild your
> design faithfully in Flutter. Full platform facts are in `design-brief.md`
> (attach it); this prompt is the creative mandate.

---

You are a world-class **mobile product designer** (fintech/logistics caliber).
Design a premium, original, Arabic-first mobile app for **NQLAH (نقلة)** — a Saudi
**B2B freight marketplace + logistics execution** platform. Be genuinely creative:
invent a distinctive, memorable visual language and delightful details. This is a
real product with a real backend; make it beautiful **and** buildable.

## What NQLAH is (context)
Businesses (customers) post freight; transport providers (carriers) win it via the
**open market** or **direct assignment**; pricing is either **bidding (مناقصة)** or
a **fixed price**; drivers execute multi-stop trips (including container pickup →
unload → **empty-container return**) and submit proof of delivery.

**This is ONE unified app** — a single download and a single login for everyone.
After login the server's policy engine resolves the account's role and the **same
app** renders the matching shell (home, bottom navigation, permissions). It is
**not** four separate apps; each role gets a purpose-built experience inside the one
product. The account model collapses to three real identities:
- **Customer** — create orders (single, or **consolidated/مجمّع** with multiple
  **sub-trips/رحلات فرعية**, each its own truck type / destination / price /
  intermediate stops), compare offers, accept, track, pay-on-delivery, invoices.
- **Transport Provider** — receives orders from customers (open market or direct
  assignment), bids or accepts fixed price, then **assigns each order to one of its
  own drivers**; manages fleet & drivers, finances, performance. The provider is the
  **contracting party** the customer deals with.
- **Employed driver** — a sub-account under a provider; execution-only, sees only
  the trips assigned to it. Big touch targets, stop-by-stop actions, ePOD. No
  marketplace, no pricing, no fleet.

**Independent owner-driver = a Provider account whose only driver is himself** — not
a fourth type. He receives the order directly, interacts with the customer **as the
provider**, then dispatches it **to himself** and drives it. Give him a role-aware
home with a light context toggle (**"operate as provider" ↔ "drive now"**), never a
role picker on every screen.

**Who the customer communicates with:** always the **provider** (the contracting
entity), before and during the order. When a provider assigns an employed driver,
the driver's personal contact is **not** revealed to the customer — the provider
coordinates. (For an owner-driver the provider and driver are the same person.)

A **group/policy engine on the server** decides what each account can do (dispatch,
pricing, payment, visibility, tracking). Treat available actions as server-driven.

## Non-negotiable guardrails (design within these; be free on everything else)
- **Brand colors already exist — use them** (don't invent a new brand hue):
  deep teal **`#0A3D3A`** (brand/surfaces), mint **`#00C9A7`** (primary action /
  "live"). Amber/red/green/blue only as semantic status. You MAY craft the full
  tints/shades, neutrals and the status palette creatively around these.
- **Arabic-first, RTL-native** (designed RTL, not mirrored); English LTR as a clean
  second. Numbers/prices/plates/container codes stay LTR.
- **Full dark mode** for every screen (deep teal-black surfaces, brighter mint
  action, a dedicated dark map style) — first-class, not an afterthought.
- **Accessibility:** WCAG AA contrast, ≥44–48px touch targets, status = color +
  icon + label (never color alone), supports text scaling.
- **Mobile, phone-first** (design at ~390dp; check ~360 and ~430).
- **Faithful to the real flows & data** in `design-brief.md` (order journey,
  account types/fields, status model, stop/ container-return semantics).
- **In-app communication** between the customer and the **provider** (the
  contracting carrier — never the employed driver directly): chat (text + voice
  notes + attachments) and **voice/video calls** — usable **before ordering** (in-app
  only, phone numbers hidden) and **after acceptance** (customer ↔ provider full
  contact revealed; the employed driver is not exposed). Design these screens too.

## Be creative on
The overall visual identity & mood, layout/composition (don't default to boring
top-to-bottom lists), the card and timeline language, iconography & custom freight
glyphs, data-viz for tracking/performance, empty/success moments, and tasteful
motion. Surprise us — but keep it trustworthy and uncluttered for business users.

## Screens to design (light **and** dark, Arabic RTL primary + one English LTR each)
Prioritize these flows first:
1. **Customer:** home · create-order wizard (consolidated + per-leg stops) · my
   shipments (list + search + filter sheet) · order detail (stop timeline + price
   breakdown) · live tracking (map + freshness label) · financial.
2. **Provider:** home · available loads + filters · assignments · **driver
   assignment** · fleet & drivers · finances · performance.
3. **Owner-driver:** composed home (find loads / my operations / my trips) ·
   self-dispatch.
4. **Employed driver:** my trips · **trip execution with stop actions + ePOD**.
5. **Auth/onboarding:** login · **register mirroring the real account types**
   (Client/Carrier, Company/Individual, CR & VAT fields, carrier **plan picker**).
6. **Communication:** chat thread · voice-note composer (waveform) · **video call**
   screen · the before-vs-after-acceptance contact-reveal difference.
Also: the reusable component set (buttons, chips, status chip, status timeline, stop
timeline, shipment card, offer card, filter sheet, fields, OTP, upload tile,
skeletons, empty/error/offline, snackbars, dialogs, map overlay, bottom nav per role).

## Deliver (this is what makes it buildable) — an **implementation handoff**
Alongside the screen designs, produce a precise handoff document an engineer can
rebuild from exactly:
1. **Design tokens:** the complete color palette (light + dark) with hex + semantic
   role; type scale (font family, size, weight, line-height) per text style;
   spacing scale; corner radii; elevation/shadow definitions; icon set + sizes.
2. **Component specs:** for each component — anatomy, dimensions, padding, every
   state (default / pressed / disabled / loading / error) and variants.
3. **Per-screen specs:** layout grid, element placement & measurements (redlines),
   which tokens/components each uses, the states shown, RTL notes, and the dark
   variant.
4. **Motion specs:** key transitions, durations, easing curves.
5. **Navigation map** (per role) + an asset/icon inventory + logo usage rules.

Keep one coherent design system across every screen, show **real Arabic microcopy**
and realistic data (cities, plates, container codes, prices, dates), and make the
handoff detailed enough that the Flutter build can match your design to high fidelity.
