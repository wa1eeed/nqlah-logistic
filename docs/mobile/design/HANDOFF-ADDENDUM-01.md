# HANDOFF Addendum 01: Available trucks + marketplace completion

**How to apply:** this file extends `HANDOFF.md` / `README.md`. All tokens, components and rules there still apply. Do **not** rebuild existing screens. Change existing code only where section 5 of this file says so.

New design file: `design_files/NQLAH Available Trucks.dc.html` (screens 6a, 6b).
New screenshots: `screenshots/6a-available-trucks-light|dark.png`, `screenshots/6b-available-truck-detail-light|dark.png`.

---

## 0. Customer navigation change (apply first)
The customer bottom bar changes. **Finance leaves the bar** and becomes a wallet icon in the Home header. The freed slot becomes a new **Trucks** tab next to Home.

| Slot (RTL, right → left) | Before | After |
|---|---|---|
| 1 | الرئيسية (house-simple) | الرئيسية (house-simple) |
| 2 | شحناتي (package) | **الشاحنات (truck) → 6a** |
| 3 | العروض (hand-coins) | شحناتي (package) |
| 4 | المالية (receipt) | العروض (hand-coins) |
| 5 | حسابي (user-circle) | حسابي (user-circle) |

English: Home · Trucks · Shipments · Offers · Account.

- **Home header (1a / 1e):** add a wallet button immediately before the bell, in a flex row with gap 8. Both buttons are 44×44 with R14 and an rgba(255,255,255,.1) fill. The wallet uses the `wallet` icon at 22dp. It carries an 8dp **#FBBF24** dot at top 10 / start-left 10, with a 2dp `hero` ring, whenever unpaid invoices exist. The bell keeps its mint dot. Tap → 4h.
- **4h Customer finance** is now a pushed screen. It has a back app bar with the title «المالية» and the sub «من أيقونة المحفظة في الرئيسية», and **no tab bar**. All other content is unchanged.
- **6a** is the root of the Trucks tab. There is **no back button**: the title «الشاحنات المتاحة» is 23/800 with the sub-count below, padding 6/16/4/8, and the filter button sits at the end. 6b is pushed from 6a and keeps the tab bar hidden.
- The policy shell map in 2a is updated to match. The Provider and Driver bars are unchanged.
- Updated screenshots: 1a, 1e, 4f, 4g, 4h, 6a (light + dark) and 2a.

## 1. Concept
Until now the marketplace ran one way only: the customer posts an order, then providers accept or bid. This addendum adds the reverse direction:

- **Providers publish truck availability** (التوفّر): a truck free in a city for a time window, optionally heading to a destination. The typical case is a **backhaul (رحلة عودة)**, where a truck has finished a trip and would otherwise return empty.
- **Customers browse availability** (6a), open one (6b), and send a **direct request (طلب مباشر)**. This is a normal order, pre-filled from the availability and addressed only to that provider.
- The provider receives it as a direct order. It appears on the provider home (2d) as «+1 مباشر» and in loads (1f) with a «طلب مباشر» tag. The provider accepts at a price or declines. The rest of the order lifecycle is unchanged.

**Disclosure rules are unchanged.** Before acceptance the customer sees the provider name, verification badge, rating, trips count and response time. The phone stays masked and chat/call are in-app only. Driver identity is never shown. An owner-driver appears under their provider name.

## 2. Data model (new)
```
TruckAvailability {
  id, providerId, truckId (internal; never exposed to customer),
  originCity, originArea, radiusKm (default 40),
  destinationCity | null (null = «أي وجهة»),
  availableFrom, availableUntil (datetime),
  truckType, maxWeightT, lengthM, features[] (straps, tarp, liveTracking, …),
  isBackhaul: boolean (auto-true when created from a completed trip),
  priceHintMin?, priceHintMax? (SAR, optional; null → «السعر بعد الطلب»),
  status: active | booked | expired | withdrawn,
  createdAt
}
Order (existing) + fields:
  source: 'marketplace' | 'direct' | 'availability'
  availabilityId?          // when source = availability
  targetProviderId?        // direct / availability orders are visible to this provider only
  directResponseDeadline   // default now + 2h
```
Customer-facing API returns: provider public profile (name, badge, rating, tripsCount, medianResponseMin), never `truckId`, plate, or driver.

## 3. New screens (designed)

### 6a · Available trucks (customer). File: NQLAH Available Trucks.dc.html#6a
- **Entry points:** (1) the **الشاحنات** tab (slot 2, see §0). (2) Order wizard 1b–4a: once the route is known, show an info banner «${n} شاحنات متاحة على هذا المسار» linking to 6a with filters applied.
- **App bar:** back · «الشاحنات المتاحة» 17/700 · sub «18 شاحنة تناسب بحثك» 12 tx2 · trailing 44dp hero filter button with a count badge (same as 1f).
- **Route selector:** 2-col box, R14, 1dp bd, sf bg, a 1dp divider between columns. Each cell has padding 8/12, label «من» / «إلى» 11 tx2, and value 15/700 with a 16dp icon (`map-pin` fill mintS / `flag-checkered` fill err). Tap opens a city picker. «إلى» can be «أي وجهة».
- **Filter chips** (36dp, horizontal scroll): date (هذا الأسبوع ✓), truck type (تريلا سطحة ✓), «رحلات العودة فقط», more types. The filter sheet reuses 1g with these sections: التاريخ, نوع الشاحنة, الحمولة الدنيا (t), رحلات العودة فقط (toggle), مزوّدون موثّقون فقط (toggle, default on).
- **Sort row:** «الأقرب موعدًا أولًا» 13 tx2 (tap → sort sheet: الأقرب موعدًا / الأقل سعرًا / الأعلى تقييمًا) | «عرض على الخريطة» 13/700 mintTx with `map-trifold`. The map view shows city clusters with a count.
- **Availability card** (waybill family, R16, e1, padding 14, gap 12, cards 10dp apart):
  1. Badge + window: «رحلة عودة» (mintBg/mintTx, `arrow-u-down-left`) or «متاحة الآن» (okBg/ok, `check-circle`) | `calendar-blank` + «الأربعاء 29/10 · 14:00» 12 tx2, nowrap.
  2. Route strip: origin 18/800 + area 12 · dashed line with a 30dp truck badge in the middle · destination 18/800 (tx2 when «أي وجهة», sub «مرن»).
  3. Meta grid 2×2, 13 tx2, 16dp icons: truck type (`truck-trailer`) · max weight (`scales`, «24 t») · length (`ruler`, «13.6 m») or «مزوّد فرد» (`user-circle`) · «11 رحلة على المسار» (`path`).
  4. Perforation divider (same as the waybill card).
  5. Provider row: avatar 36 R14 hero · name 14/700 + `seal-check` · «★ 4.8 · 312 رحلة» 12 tx2 | price at the end: «يبدأ من» 11 tx2 + «1,650 ر.س» Inter 700 17, or «السعر بعد الطلب» 12 tx2 when there is no price hint.
- Tap card → 6b. **Empty state:** «لا توجد شاحنات متاحة لهذا المسار» + action «أنشئ طلبًا وسيصلك العروض» → 1b.
- Tabs: customer set, **الشاحنات** active.

### 6b · Available truck detail + request. File: NQLAH Available Trucks.dc.html#6b
- **App bar:** back · «رحلة عودة متاحة» (or «شاحنة متاحة») · sub «الرياض ← الدمام · الأربعاء 29/10» · trailing `share-network`.
- **Provider card** (e1): avatar 44 · name + badge · «★ 4.8 · 312 رحلة · يرد عادة خلال 30 د» · chat icon button (opens a pre-acceptance chat, as in 1n, with context = this availability). Locked row (sf2, R10): `lock-simple` + «التواصل داخل التطبيق حتى قبول الطلب» + masked phone.
- **Availability card:** badge + «نُشر قبل 3 س»; route strip with the origin sub «السلي · نطاق 40 km»; 2×2 spec tiles (sf2, R12, padding 10/12, key 11 tx2, value 13/700 nowrap): متاحة من · حتى · الشاحنة · الحمولة القصوى; feature chips (28dp, 1dp bd, `check` mintTx, 12).
- **Price card:** «السعر التقديري من المزوّد» 14 tx2 | «1,650–1,900 ر.س» Inter 700 20; note 12 tx2 with `info`: final price is set after the cargo details are sent, and backhauls are usually below the market range for the route.
- **Sticky footer:** caption 12 tx2 centered «ننشئ طلبًا مُعبّأ مسبقًا ويُرسل لهذا المزوّد مباشرة · يرد خلال 2 س» + primary 52dp «اطلب من هذا المزوّد» (`paper-plane-tilt`).
- **On tap:** open the order wizard 1b with prefill: truck type, origin city/area, destination (if set), pickup date = availableFrom. In step 4 (4c), pricing is locked to «سعر ثابت» with the field prefilled at `priceHintMin` (editable), and visibility is locked to «مزوّد محدّد: شركة الأفق للنقل» (shown as a read-only chip in place of the segmented control). Step 6 (4e) CTA text becomes «إرسال الطلب للمزوّد». After sending, show a snackbar and push to 1c, status «بانتظار رد المزوّد» (new chip: infoBg/info, `clock`) with a countdown to `directResponseDeadline`.
- **Outcomes:** the provider accepts → status مُسند/مؤكّد and contact is revealed (existing rules). The provider declines or the deadline passes → status «لم يرد المزوّد». The customer gets a notification plus a one-tap action «انشر في السوق المفتوح» that converts the order to marketplace, keeping all its data.

## 4. Text-spec screens (build from existing components; no mock)

### 7a · Load detail (provider), from a 1f card tap
- **Pattern:** reuse 1c's layout, seen from the provider side and **before** acceptance.
- **App bar:** code + pricing chip (سعر ثابت / مناقصة / طلب مباشر, the last one as a mint chip with a `paper-plane-tilt` icon).
- **Customer card:** customer name, badge, «★ rating · n طلب» and masked phone. Chat is allowed (1n from the provider side).
- **Content, top to bottom:**
  - Route timeline (1c timeline component, all nodes pending).
  - Cargo block: type, weight, packaging, notes, a documents count (names only, no download until accepted).
  - Schedule: pickup window and delivery deadline.
  - Payment terms.
  - Eligibility row: ✓/✕ against the provider's fleet (truck type available on date). If ✕, the CTA is disabled with the reason.
- **Sticky footer:**
  - Fixed price: price Inter 700 22 + primary «قبول السعر».
  - Tender: live countdown + «7 عروض مقدّمة» + primary «تقديم عرض» → 7b.
  - Direct: two buttons, outline «اعتذار» and primary «قبول». The price is editable via «قبول بسعر مختلف», which opens 7b in direct mode.

### 7b · Submit bid (bottom sheet)
- **Container:** sheet pattern from 1g (R20, grabber, scrim). Title «تقديم عرض» + order code.
- **Price field:** LTR, Inter 700 20, focused, with the hint «السعر الشائع للمسار 2,250–2,700» (same as 4c).
- **Pickup time:** chips for the order's window slots plus «مخصص».
- **Truck to use:** a dropdown of eligible fleet trucks, internal and never shown to the customer. Owner-drivers see only their own truck.
- **Other fields:**
  - Offer validity: chips 2h / 6h / حتى نهاية المناقصة.
  - Note to customer: textarea, optional, 200 chars.
- **Footer:**
  - Summary «عرضك 1,950 ر.س · صافي بعد العمولة 1,852.50 ر.س». The net uses the platform commission from policy, 5% in this example.
  - Primary «إرسال العرض».
- **After sending:** the card in 1f shows «عرضك: 1,950 · الترتيب 2 من 7» as an info chip. «تعديل العرض» and «سحب العرض» stay available until the tender closes.

### 7c · Publish truck availability (provider)
- **Entry points:**
  1. Provider Home 2d: new tile «أعلن عن توفّر شاحنة» (`megaphone`).
  2. Fleet 3e → truck row overflow → «إعلان توفّر».
  3. **Auto-prompt after trip completion** (1k success / 3c completed): snackbar-style card «انتهت رحلتك في الدمام. انشر رحلة عودة؟» → 7c prefilled with origin = last stop city, availableFrom = completion time + 1h, and isBackhaul = true.
  4. Owner-driver «أقود الآن» context: the same prompt after ePOD.
- **Form, full screen** (pattern: 3f form + 4b schedule components):
  - الشاحنة: dropdown, which prefills type, weight and length.
  - From city/area + radius chips (20 / 40 / 80 km).
  - To: city or «أي وجهة» toggle.
  - Available from / until: 4b day strip + time field.
  - Price hint: optional min–max fields, or toggle «السعر بعد الطلب».
  - Features: multi-select chips.
- **CTA:** «نشر التوفّر».
- **Management:** a list under Fleet 3e → new segment «التوفّر» showing active availabilities with status chips (نشط ok / محجوز mint / منتهي neutral) and actions تعديل / سحب. Booking an availability (provider accepts a request from it) sets it to `booked` automatically and hides it from 6a.

## 5. Changes to existing screens
| Screen | Change |
|---|---|
| 1a / 1e Customer home | Wallet button in the header next to the bell (§0). No new rows in the body. |
| Customer tab bar | New order: الرئيسية · الشاحنات · شحناتي · العروض · حسابي (§0). |
| 4h Customer finance | Pushed from the wallet; back app bar; no tab bar (§0). |
| 1f Loads | Cards from direct/availability requests get a mint «طلب مباشر» chip and are pinned to the top; footer action = «قبول» / «اعتذار». Card tap → 7a. Tender «تقديم عرض» → 7b. |
| 1g Filters | Pricing segmented gains a 4th option «مباشر». |
| 2d Provider home | «+1 مباشر» pill is now backed by direct/availability requests. Add tile «أعلن عن توفّر شاحنة» → 7c. |
| 3e Fleet | Add the 3rd segment «التوفّر» (list + status) and the truck row action «إعلان توفّر». |
| 4c Pricing | When the order is created from 6b: pricing locked to fixed, visibility shown as read-only chip «مزوّد محدّد: {name}». |
| 4e Review | CTA label «إرسال الطلب للمزوّد» for direct orders. |
| 1c / 4g | New status chip «بانتظار رد المزوّد» (infoBg/info, `clock`) + countdown; fallback action «انشر في السوق المفتوح». |
| 1k / 2e | After ePOD success on the last stop: backhaul prompt → 7c. |
| 5b Notifications | New types: «طلب مباشر جديد» (provider), «المزوّد قبل طلبك» / «لم يرد المزوّد» (customer), «رحلة العودة نُشرت» (provider). |

## 6. Navigation additions
```
Customer: tab الشاحنات → 6a   │   1a header wallet → 4h
          6a ⇄ filter sheet → 6b ─ chat → 1n
                                                          └ «اطلب من هذا المزوّد» → 1b…4e (prefilled, direct) → 1c «بانتظار رد المزوّد»
Provider: 1f card → 7a ─ fixed: accept │ tender: → 7b │ direct: accept / decline
          2d tile │ 3e truck │ post-trip prompt → 7c → 3e «التوفّر»
```

## 7. New icons (Phosphor)
arrow-u-down-left, scales, ruler, share-network, paper-plane-tilt, megaphone (already used).

## 8. Server rules (add to section 15 of HANDOFF)
1. An availability is visible to customers only while `status = active` and `availableUntil > now`.
2. Direct/availability orders are visible to `targetProviderId` only until declined or expired, then converted to marketplace only by customer action.
3. Never expose `truckId`, plate or driver on availability or direct-order payloads to customers.
4. Bids are visible to the customer as amount + provider public profile. Other providers' bid amounts are never shown to providers (only rank).
