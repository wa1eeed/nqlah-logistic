# Handoff: نقلة NQLAH — Unified Mobile App (Round 1)

## 1. Overview
NQLAH is a B2B freight marketplace for Saudi Arabia. There is **one mobile app**: one download and one login for everyone. After sign-in, the backend policy engine resolves the account's **identity** and **permissions**, and the app mounts the matching **shell** (home, bottom tabs, allowed actions).

There are exactly **three identities**:

| Identity | AR | What they do |
|---|---|---|
| Customer | عميل | Creates orders, compares/accepts offers, chats with the provider, tracks, pays |
| Provider (contracted carrier) | مزوّد | Receives orders (marketplace or direct), wins them, **assigns each order to one of its drivers**, manages fleet + finance |
| Employed driver | سائق تابع | Sub-account under a provider. Execution only. Sees only the trips assigned to them |

**Owner-driver (السائق المستقل)** is not a fourth type. It is a Provider account whose only driver is the account owner. It gets the Provider shell plus a light context switch on Home: «أعمل كمزوّد» (working as provider) ↔ «أقود الآن» (driving now).

### Communication & data-disclosure rule (business rule, must be enforced server-side)
- The customer always talks to the **provider** (the contracted party), before and during the order.
- **Before acceptance:** in-app chat and in-app call only. Name, verification badge and rating are visible. Phone numbers are masked (`+966 •• ••• ••••`).
- **After acceptance (status ≥ Assigned):** customer ↔ provider contact details (name, phone, company) are revealed to each other only.
- **Employed driver data is never shown to the customer.** The customer sees only «تم إسناد سائق · المزوّد يتولّى التنسيق معه». The provider coordinates.
- Owner-driver: provider and driver are the same person, so the driving screen says «تتواصل مع العميل بصفتك المزوّد المتعاقد».

## 2. About the design files
The files in `design_files/` are **design references built in HTML**. They show the intended look and behavior. They are **not production code**. Recreate them in the target mobile codebase (React Native / Flutter / native) with its own patterns and libraries. If no codebase exists yet, pick the most suitable cross-platform framework with first-class RTL support (Flutter or React Native are both fine).

Open any `.dc.html` file directly in a browser (keep `support.js` next to it). Each screen is shown as a phone frame in light and dark. In the editor's Tweaks panel you can switch width (360 / 390 / 430dp) and hide dark mode.

## 3. Fidelity
**High-fidelity.** Final colors, type, spacing, radii and copy. Recreate pixel-accurately at 390dp. Placeholders that are not final:
- **Logo**: placeholder mark (teal rounded square + mint rotated diamond + «نقلة» wordmark). Replace when the real logo arrives.
- **Map**: styled placeholder. Use the real map SDK with the light/dark styles below.
- **Photos / video tiles**: hatched placeholders.
- **Plan prices and add-ons** in 1m are proposals, to be confirmed by business.

## 4. Global layout rules
- Reference frame: **390 × 844dp** (iPhone 14/15). Must reflow at 360 and 430.
- **Direction: RTL by default (Arabic).** English is LTR (see 1e). Use logical properties (start/end), never left/right.
- Numerals, codes, plates, container numbers, prices, times: **Inter, LTR, isolated** (`<bdi dir="ltr">` / `TextDirection.ltr` span) inside RTL text. Use Western digits (0–9).
- Directional icons mirror in RTL: back = `arrow-right`, forward/next = `arrow-left`, list chevron = `caret-left`. Truck icon on route strips is flipped (`scaleX(-1)`) so it drives right → left.
- Route strings read in Arabic order: `الدمام ← الرياض` (origin ← destination).
- Screen gutter **16dp**. Status bar 36dp. Top app bar 52dp (44dp icon buttons, padding 4/8).
- Bottom tab bar: **78dp** high, surface bg, 1dp top border, padding 8/4/14. Item = icon 21dp in a 30dp-high slot + label 11dp. Active item: 52×30 pill `mintBg`, filled icon, label 700 `mintTx`. Inactive: regular icon, `tx2`.
- Sticky bottom action bar: surface bg, 1dp top border, padding 12/16/22–24, primary button 52dp.
- Touch targets ≥ 44dp. Driver primary actions **60dp**.

## 5. Design tokens
Machine-readable copy: `tokens.json`.

### 5.1 Color: Light
| Token | Hex | Use |
|---|---|---|
| bg | #F6F8F8 | App background |
| sf | #FFFFFF | Cards, sheets, bars |
| sf2 | #EDF2F1 | Segmented track, inputs alt, skeleton |
| bd | #E2E8E7 | Borders, dividers, dashed route |
| tx | #0F1A19 | Primary text |
| tx2 | #566664 | Secondary text, inactive tabs |
| tx3 | #7E8E8C | Tertiary, placeholders |
| mint | #00C9A7 | Primary fill (buttons, live) |
| mintS | #00A88A | Strong mint: focus rings, selected borders, progress |
| mintTx | #007A66 | Mint as **text/icon** on light (AA) |
| mintBg | #E2F7F2 | Mint tint (active tab pill, chips) |
| onMint | #06302D | Text on mint fill |
| hero | #0A3D3A | Hero panels, dark chips, avatars |
| hero2 | #0D5C57 | Hero secondary |
| ok / okBg | #15803D / #E6F5EB | Success |
| warn / warnBg | #B45309 / #FEF3E2 | Warning, needs action |
| err / errBg | #DC2626 / #FDECEC | Error, destructive |
| info / infoBg | #1D4ED8 / #E8EFFD | Info, in transit, published |
| map / road / park | #E3EBE8 / #FFFFFF / #D3E6DC | Map style |
| scrim | rgba(10,26,25,.45) | Sheet scrim |
| shadow e1 | 0 1px 2px rgba(10,26,25,.05), 0 8px 24px -14px rgba(10,26,25,.22) | Cards |

### 5.2 Color: Dark
| Token | Hex |
|---|---|
| bg | #0B1413 |
| sf | #111E1C |
| sf2 | #182725 |
| bd | #243533 |
| tx | #E8F0EF |
| tx2 | #9FB4B1 |
| tx3 | #7A918E |
| mint | #1FE0C0 |
| mintS | #00C9A7 |
| mintTx | #1FE0C0 |
| mintBg | rgba(31,224,192,.12) |
| onMint | #062724 |
| hero | #0E2F2C |
| hero2 | #123F3B |
| ok / okBg | #22C55E / rgba(34,197,94,.14) |
| warn / warnBg | #FBBF24 / rgba(251,191,36,.13) |
| err / errBg | #F87171 / rgba(248,113,113,.14) |
| info / infoBg | #60A5FA / rgba(96,165,250,.14) |
| map / road / park | #0E1A19 / #1A2A28 / #12241F |
| scrim | rgba(0,0,0,.6) |
| shadow e1 | none: elevation in dark = 1dp `bd` border only |

Fixed (theme-independent) colors on hero panels: text #E8F0EF, secondary #9FC7C1, accent icon #1FE0C0, translucent fills rgba(255,255,255,.08/.1). Video call screen is always dark (#0B1413).

Brief colors that fail AA as text on light have text-safe variants: mint text #007A66, success #15803D, warning #B45309, info #1D4ED8. The original brief values are kept for fills and icons.

### 5.3 Typography
Arabic: **Tajawal** (400/500/700/800). Latin, numerals, codes: **Inter** (400/500/600/700), `font-feature-settings: 'tnum'` for prices. Both are Google Fonts (not custom); bundle them in the app.

| Style | Size/Line | Weight | Example |
|---|---|---|---|
| Display | 30/38 (27–28 on hero) | 800 | إلى أين تتجه شحنتك اليوم؟ |
| H1 | 23/30 (22–24) | 800 | الأحمال المتاحة |
| H2 | 18/24 (17–18) | 700 | مسار الرحلة |
| H3 | 16/22 (15–16) | 700 | شركة الأفق للنقل |
| Body | 15/23 | 400 | الدخول من البوابة 3 |
| Label | 13/19 | 500–700 | field labels |
| Caption | 12/17 | 400 | آخر تحديث قبل 2 د |
| Tab label | 11 | 400 / 700 active | |
| Price | Inter 20–28 | 700 tnum | 2,898.00 ر.س (currency in Tajawal 500 12–14 tx2) |
| Code | Inter 13–16 | 600, letter-spacing .3–.5 | NQ-24-08812 · TGHU 771392-0 · 7342 KHD |
| Driver title | 23–24/1.25 | 800 | تفريغ · مستودع الروّاد |

### 5.4 Spacing
Scale: **4, 8, 12, 16, 20, 24, 32, 48**. Gutter 16. Card padding 14–16. Field gap 12–16. Section header padding 18–22 top / 8–10 bottom. List gap 8–12.

### 5.5 Radii
| Element | Radius |
|---|---|
| Input, button, small tile | 12 |
| Large button (52–60dp) | 14–16 |
| Card | 16 (hero overlap cards 18) |
| Bottom sheet | 20 top corners (tracking sheet 24) |
| Chip / pill / badge | 999 |
| Segmented track / thumb | 12–14 / 9–11 |
| Avatar | 14 (company, square-ish) / 50% (person) |
| Phone frame screen | 42 (mockup only) |

### 5.6 Elevation
- **e1 card**: shadow above (light); border only (dark).
- **e2 sheet**: `0 -10px 30px -12px rgba(0,0,0,.25)`.
- Overlapping card on hero: negative top margin −34 to −38dp so it straddles the hero edge.

### 5.7 Icons
**Phosphor Icons v2.1.1**, Regular + Fill weights only (`@phosphor-icons/web`, `phosphor_flutter` or `phosphor-react-native`). Sizes: nav 21, standard 20–24, inline 14–16. Fill = active/selected/strong state. Full list of icons used:

arrow-counter-clockwise, arrow-down, arrow-left, arrow-right, arrows-left-right, battery-high (F), bell, briefcase, broadcast, calendar-blank, camera-plus, camera-rotate, caret-double-right, caret-down, caret-left, caret-right, caret-up, cell-signal-full (F), chat-centered-dots, chat-circle-dots, chats, check (R/F), check-circle (R/F), check-square, checks, circle-notch, clipboard-text, clock, dots-three, dots-three-vertical, eye, flag-checkered (F), gavel, gear-six, hand-coins, handshake, headset, house-simple (R/F), info, list-bullets, lock-open, lock-simple, magnifying-glass (R/F), map-pin (R/F), map-pin-line (F), map-pin-simple-slash, map-trifold, megaphone, microphone (F), microphone-slash (F), minus, navigation-arrow, note-pencil, package, path (R/F), phone (R/F), phone-disconnect (F), play (F), plus, plus-circle, prohibit, receipt, seal-check (F), shipping-container, sign-in, signature, sliders-horizontal, speaker-high, stack (F), steering-wheel (R/F), tag, timer, trash, truck (R/F), truck-trailer, user-circle, user-plus, video-camera, wallet, warning-circle, warning-octagon, wifi-high (F), wifi-slash, x, x-circle, wrench, gas-pump, chart-line-up, paper-plane-tilt, drop, shield-check, gauge, upload-simple, file-text, bank, users, globe, moon, question, sign-out, hourglass-medium, whatsapp-logo, headset.

## 6. Components
All sizes in dp. "R" = radius.

**Button: primary.** H 52 (hero CTA 56, driver 60). R 14 (60 → R16). Fill `mint`, text `onMint` Tajawal 800 16 (driver 19). Icon 20–24, gap 8–10. States: pressed = `mintS` + scale .98 · disabled = `sf2` bg + `tx3` text (+ lock icon when blocked by a step) · loading = `circle-notch` spinning + «جارٍ الإرسال».
**Button: secondary/outline.** H 44–52, R 12–14, 1.5 border `mintS` (or `bd` for neutral), text `mintTx` 800 15.
**Button: destructive.** `errBg` fill, `err` text, or text-only `err` (44dp) for «الإبلاغ عن مشكلة».
**Icon button.** 44×44, R 12–14. On surfaces: `mintBg` + `mintTx` icon 20. On hero: rgba(255,255,255,.1). Map overlay: `sf` + e1. Primary call: `mint` fill + `onMint` filled phone.
**Text field.** H 52–54, R 12, 1 border `bd`, bg `sf`, padding 0 14, text 15–17. Label above 13/700, gap 6. Focus: 2 border `mintS` + 4 ring `mintBg`. Error: 1.5 border `err`, counter (e.g. `11/15`) Inter 12 `err` at end, message 12 `err` with `warning-circle`. Valid: `check-circle` fill `ok` at end. Phone field is LTR: `+966` prefix Inter 600 16 `tx2` with 1dp end divider.
**Search field.** H 48, R 12, `sf` + `bd` border, `magnifying-glass` 19 + placeholder `tx3` 15. Filter button 48×48 R12 `hero` fill, white icon, count badge 20dp `mint` circle at top-start with 2dp `bg` ring.
**Segmented control.** Track `sf2` R 12–14 padding 4 gap 4. Thumb `sf` + e1 R 9–11, H 40–48, text 14–15/700; inactive `tx2`. Owner-driver switch: active thumb is `hero` with white text and mint filled `steering-wheel`.
**Chip: filter/choice.** H 32–40, R 999, padding 0 10–14, text 13–14. Selected: `hero` bg, white, `check` icon. Unselected: 1 border `bd`. Active-filter chip: `mintBg` + `mintTx` 700 + `x`.
**Status chip.** H 26–30, R 999, padding 0 10–12, gap 6, 12–13/700, icon 14 + label. Always color + icon + label (never color only).

| Status | AR | Icon | Colors |
|---|---|---|---|
| Draft | مسودة | note-pencil | sf2 / tx2 |
| Published | منشور | megaphone | infoBg / info |
| Tender | مناقصة | gavel | infoBg / info |
| Assigned | مُسند | handshake | mintBg / mintTx |
| Confirmed | مؤكّد | check-circle | mintBg / mintTx |
| In transit | في الطريق | truck (F) | infoBg / info (+ dot with 3dp ring) |
| Delivered | تم التسليم | package | okBg / ok |
| Completed | مكتمل | seal-check (F) | hero (#0A3D3A, dark #1E4A45) / #E8F0EF |
| Cancelled | ملغى | x-circle | errBg / err |
| Payment reported | دفع مُبلّغ | hand-coins | warnBg / warn |
| Payment confirmed | دفع مؤكّد | check-square | okBg / ok |
| Disputed | متنازع عليه | warning-octagon | errBg / err |
| Container return pending | إرجاع حاوية معلّق | shipping-container | warnBg / warn |
| ePOD pending | إثبات تسليم معلّق | signature | warnBg / warn |

**Waybill card** (signature component). `sf`, 1 `bd`, e1, R 16, padding 14/16/12, gap 12–14. Rows: (1) code Inter 600 13 `tx2` + sub 12 `tx3` | status chip. (2) **Route strip**: origin city 18/800 + sub 12 `tx2` · strip · destination (end-aligned). Strip = 10dp origin dot `mint` → 2dp solid line (travelled) → 30dp truck badge (`mintBg`, truck 16 flipped) → dashed 2dp `bd` → 10dp destination ring (2dp `tx3`). Marketplace variant: dashed only + mid «+1 توقف» pill (22dp, `sf2`, 11). (3) live line: `broadcast` 16 `mintTx` + «مباشر · آخر تحديث قبل 2 د» 13 `tx2` + stop counter at end. (4) **Perforation divider**: 1.5 dashed `bd` full-bleed (−16 margins) with 18dp half-circles in `bg` color cut into both edges. (5) meta: truck type + plate, container no. (Inter 600 13 `tx`).
**Load card (provider marketplace).** Waybill card + pricing tag chip (سعر ثابت `tag` mint / مناقصة `gavel` info), age caption or countdown (`timer`, `warn`, Inter `05:42:10`), 2×2 meta grid 13 `tx2` with 16 icons, perforation, then a **server-driven action zone**: fixed price → price Inter 700 22 + primary «قبول السعر» 48; tender → «7 عروض مقدّمة» + outline «تقديم عرض» 44; ineligible → disabled with reason.
**Hero panel.** `hero` bg + 26dp grid texture (1dp rgba(255,255,255,.035) lines both axes) + optional radial mint glow at top-start (rgba(0,201,167,.22)). Text #E8F0EF. Bottom padding 52–60 to host an overlapping card.
**KPI strip.** Overlap card R 18, 3 equal columns, values Inter 700 22 (colored by meaning: info / warn), labels 12 `tx2`, 1dp vertical dividers. Hero variant: 3 tiles rgba(255,255,255,.08) R 14 padding 10/12.
**Alert row.** R 16, padding 12/14, tinted bg (`warnBg` / `errBg`), 40dp icon tile (R 12, `sf` bg, colored icon 20) or bare icon 22, title 14–15/700, sub 12 `tx2`, trailing `caret-left`.
**Party card (contact reveal).** Avatar 44 R 14 `hero` + initial · name 15/700 + `seal-check` fill `mintTx` · role line 12 `tx2` · chat + call icon buttons. Below, a reveal row R 10, padding 8/10: locked = `sf2` + `lock-simple` + masked number; revealed = `okBg` + `lock-open` `ok` + number Inter 600 13. Then a caption row «تم إسناد سائق · المزوّد يتولّى التنسيق معه» with `steering-wheel`.
**Timeline (stops).** Grid 28 / 1fr / auto, gap 10. Node 24dp: done = `ok` + check; current = `info` + truck + 5dp `infoBg` ring; pending container return = 24dp rotated square, 2dp `warn` border. Connector 2dp: solid `ok` for done, dashed `bd` for upcoming. Time Inter 500 12 at end (`~14:20` for ETA in `tx3`).
**Driver option row (assignment).** R 16, padding 12, avatar 44 circle `sf2`, name 15/700, sub 12 (truck · plate · location). Radio 26dp: selected = 2dp `mintS` card border + `mintS` filled check circle. Unavailable group: opacity .6 + `prohibit`.
**Stepper (plan picker).** Track rgba(255,255,255,.07) R 14 padding 6; ± buttons 44×44 R 10 rgba(255,255,255,.1); value Inter 700 24 + unit 11. Range 5–50; minus at min is opacity .35.
**Toggle.** 40×24 (plan picker) or 50×30 (filters) pill. On: `mint` (#1FE0C0 on hero) track, knob dark; off: rgba(255,255,255,.18) / `bd`, knob white with shadow 0 1 3 rgba(0,0,0,.25). Knob 18 / 24. Transition 150ms.
**Bottom sheet.** Scrim; sheet `sf`, R 20 top, starts 120dp from top; grabber 40×4 `bd` R2, 10dp from top; header 20/800 + count Inter 700 13 `mintTx` + «مسح الكل»; sections padding 10/16, title 14/700; sticky footer primary «عرض 24 حمولة».
**Chat bubble.** Max width 76–80%. Outgoing (me) = `hero` bg, #E8F0EF, R 16 16 4 16, time Inter 11 #9FC7C1 + `checks` #1FE0C0. Incoming = `sf` + 1 `bd`, R 16 16 16 4. Voice note: 36dp `mint` play + waveform bars 3dp wide, gap 2, heights 6–26, played bars `mintS`, rest `bd`, duration Inter 11. Image: 110dp tile + caption 13.
**Voice recorder bar.** Red 10dp dot with 4dp `errBg` ring, timer Inter 600 14, live waveform (`err` at .75), «اسحب للإلغاء» hint with `caret-double-right`, 52dp mint mic with 6dp `mintBg` ring.
**OTP boxes.** 4 × 58dp, R 12, gap 10, LTR, Inter 700 24. Active box: 2 `mintS` + 4 `mintBg` ring + caret 2×26.
**Snackbar.** `#0F1A19` bg, #E8F0EF text 14, R 12, padding 12/14, `check-circle` fill #1FE0C0, action 700 #1FE0C0.
**Offline banner.** `warnBg`, R 12, `wifi-slash` `warn` 18, «أنت غير متصل. نعرض آخر بيانات محفوظة.», action «إعادة».
**Freshness pill.** 28dp: live (`okBg`/`ok` + 7dp dot) · stale «قبل 14 د» (`warnBg`/`warn` + `clock`) · unavailable «الموقع غير متاح» (`sf2`/`tx2` + `map-pin-simple-slash`).
**Skeleton.** `sf2` bars R 6 (12/18/12dp high) inside a bordered card. **Empty state.** 48dp icon tile + title 15/700 + sub 12 + text action.

## 7. Screens
Every screen exists in **Light and Dark**, Arabic RTL, 390dp. PNGs are in `screenshots/` (`<id>-<name>-light.png` / `-dark.png`). IDs match the design files.

### Shell & auth (`NQLAH App Shell.dc.html`, `NQLAH Auth and Comms.dc.html`)
**2a · Unified app structure (diagram).** Login → `GET /me` returns identity + policy → policy engine resolves Home, Tabs, Actions. Tab sets:
- Customer: الرئيسية (house-simple) · شحناتي (package) · العروض (hand-coins) · المالية (receipt) · حسابي (user-circle)
- Provider: الرئيسية · الأحمال (magnifying-glass) · التكليفات (clipboard-text) · الأسطول (truck) · المالية (wallet)
- Owner-driver, provider context (1i): الرئيسية · الأحمال · عملياتي (briefcase) · رحلاتي (path) · حسابي
- Owner-driver "driving now" context (2e) and Employed driver: رحلاتي (path) · الرسائل (chats) · حسابي. Employed driver alternative third tab is الإشعارات (bell). No marketplace, prices, fleet or finance.

**2b · Communication rule (diagram).** Three cards: BEFORE ACCEPTANCE (sf2 / bg) · ASSIGNED+ (okBg) · NEVER customer ↔ employed driver (errBg). See §1.

**2c · Unified login.** Hero 300dp (logo mark 44 + «نقلة» 24/800, «EN» language pill 36dp top-end; «أهلًا بك» 28/800; «حساب واحد للعملاء والمزوّدين والسائقين» 15 #9FC7C1). Form padding 24: phone field (focused state shown), password field with `eye` toggle and «نسيت كلمة المرور؟» 13/700 `mintTx`; primary «دخول» 54 R14; outline «الدخول برمز تحقق» 54 with `chat-centered-dots`. Footer, 28dp from bottom: «ليس لديك حساب؟ إنشاء حساب».

**1l · Register: account type (step 1/4).** Title «إنشاء حساب» 24/800 + sub. Two 112dp choice cards (عميل / ناقل = Provider). Selected: 2 `mintS` border + `mintBg` + 22dp check at top-start + `hero` icon tile. Segmented منشأة | فرد. Fields: CR number (valid), VAT number (error state: must be 15 digits, counter `11/15`), checkbox «المنشأة غير مسجّلة في ضريبة القيمة المضافة» (disables VAT when checked), Region / City dropdowns in a 2-col grid. Sticky CTA «التالي: اختيار الباقة».

**1m · Provider plan picker (step 2/4), interactive.** Scrollable body (bottom padding 120) with:
- Basic أساسي: 199 ر.س/شهر, up to 3 trucks, marketplace (compact row).
- **Pro احترافي** (selected, hero card, 2dp mint ring, «الأكثر اختيارًا» badge): base **299 SAR includes 5 trucks**; truck stepper 5–50, **+39 SAR per extra truck**; add-on toggles: إدارة صيانة الأسطول +99 (default ON), الوقود والمصاريف +79, تقارير متقدمة +69, دعم بأولوية +49. Live breakdown: base / extra trucks × n / add-ons / **الإجمالي الشهري** (Inter 700 26).
- Enterprise مؤسسات: 50+ trucks, integrations, «تواصل معنا».
- VAT note: prices exclude 15% VAT; changes later are prorated.
- Sticky footer: «بعد التجربة» + total ر.س/شهر | primary «ابدأ التجربة المجانية».
- Formula: `total = 299 + max(0, trucks − 5) × 39 + Σ enabled add-ons`. Default state: 8 trucks + maintenance = **515**.

### Customer (`NQLAH Customer.dc.html`)
**1a · Home.** Hero (padding 0 16 60): avatar 44 R14 + greeting 13 #9FC7C1 + company 16/700; bell button with 8dp mint dot; headline 27/800; CTA «طلب نقل جديد» 56dp with `plus`. KPI strip overlaps −38: شحنات نشطة 4 · بانتظار العروض 2 (info) · تحتاج إجراءك 1 (warn). Section «شحنات نشطة» + «عرض الكل». Waybill card (NQ-24-08812, consolidated, 2 trips, in transit, Dammam → Riyadh, stop 2/3, 7342 KHD, TGHU 771392-0). Warn alert «3 عروض بانتظار قرارك», expires in 5h. «أعد الطلب» quick re-order chips 40dp. Tabs: Customer.

**1b · Create order: Cargo (step 1/6, consolidated).** App bar: `x` close · title · «حفظ كمسودة». 6-segment progress (4dp bars, active `mint`) + «الحمولة · الخطوة 1/6 / التالي: المسار». Segmented شحنة واحدة | **مجمّع**. Expanded sub-trip card (1.5 `mint` border): number badge 28 `hero`; truck type chips; destination field with `map-pin` fill `err`; intermediate stops incl. warn row «إرجاع حاوية فارغة»; dashed «إضافة توقف». Collapsed sub-trip 2 (مبرّدة · جدة · 1,850). Dashed mint «إضافة رحلة فرعية». Sticky footer: «رحلتان · تقديري 4,250 ر.س» + «التالي: المسار».

**1c · Order detail after acceptance.** App bar: back · code Inter 700 16 + «طلب مجمّع · رحلتان» · `dots-three`. Trip segmented (رحلة 1 info dot / رحلة 2 mint dot). **Party card = provider only** (شركة الأفق للنقل, «المزوّد المتعاقد · ★ 4.8»), revealed phone `+966 13 812 4400`, caption «تم إسناد سائق · المزوّد يتولّى التنسيق معه». Stop timeline (pickup done 08:40 · unloading in transit 186 km ~14:20 · container return separate from cargo delivery «لاحقًا»). Price breakdown: أجرة النقل 2,400.00 · رسوم الخدمة 120.00 · VAT 15% 378.00.

**1d · Live tracking.** Full-bleed map. Top overlay: back 44 (`sf` + e1), freshness pill «مباشر · قبل 30s», list button. Route: travelled solid 6dp `mintS`, remaining dotted (2 12). Truck marker 38dp `hero` with 2dp mint border inside a 52dp halo rgba(0,201,167,.22). Origin 24dp `ok`, destination 28dp `err` with `flag-checkered`, both with 3dp white border. Bottom sheet R24 e2: next stop 20/800 + ETA Inter 700 20; progress 8dp (53%) + «قُطع 212 km / متبقٍ 186 km»; provider row (not driver): «المزوّد · ينسّق مع السائق», chat (mintBg) + call (mint fill).

**1e · English LTR reference.** Same as 1a, mirrored: LTR, Inter text, radial glow at top-right, `caret-right`, truck not flipped, tabs Home / Shipments / Offers / Finance / Account.

### Provider & drivers (`NQLAH App Shell.dc.html`, `NQLAH Provider and Drivers.dc.html`)
**2d · Provider home.** Hero: company avatar, «شركة الأفق للنقل» + seal, «مزوّد · 14 شاحنة · 11 سائقًا», bell; 3 hero KPI tiles (في الطريق 6 · مجدولة اليوم 3 · سائق متاح 5). Overlap card −34 «بانتظار إسناد سائق» (warn badge 2) with rows: route 15/700, code · truck · date, primary «إسناد» 40dp. 2-col tiles: new loads 8 («+1 مباشر» info pill = direct assignment) · receivables 18,400 «3 دفعات مُبلّغة». Error alert «تأخّر عن موعد الوصول» (driver name is shown to the provider, never to the customer). «رسائل العملاء» row with preview + count badge 3. Tabs: Provider.

**1f · Available loads (marketplace).** H1 + count «24 حمولة»; search + filter button (badge 3); active filter chips + «مسح الكل»; load cards (fixed price 3,200 «قبول السعر»; tender with countdown, 7 bids, «تقديم عرض»). Tab الأحمال active.

**1g · Filter sheet.** Pricing type segmented (الكل / سعر ثابت / مناقصة); truck type chips (multi); route from/to (from = focused); pickup date chips (اليوم / هذا الأسبوع / مخصص); toggle «أحمال مع إرجاع حاوية»; sticky «عرض 24 حمولة» (live count).

**1h · Driver assignment.** Order context bar (`hero`, code `· L1`, route · truck, date). Search by driver/plate. «مؤهّلون ومتاحون · 3» list with single-select; «غير متاحين · 2» dimmed with reason «في رحلة حتى 31/10». Footer note «يصل للسائق إشعار فورًا · لا تظهر بياناته للعميل» + primary «تأكيد إسناد فهد العتيبي» (name updates with the selection).

**1i · Owner-driver home: provider context «أعمل كمزوّد».** Header: avatar circle + name + seal, «مزوّد وسائق · 7781 HDA», availability pill «متاح» (ok). Context switch (active = «أعمل كمزوّد»). Warn card «مقبول · بانتظار إسناد سائق»: route, code, date, 2,100; primary «إسناد لنفسي» + secondary «سائق آخر». Tiles: 12 matching loads (hero) · October earnings 8,450. «رحلتي القادمة» row (date tile 48×52) + «مؤكّدة» chip. Tabs: owner-driver provider set.

**2e · Owner-driver: driving context «أقود الآن».** Same header («مزوّد · سائقه الوحيد»). Switch with active «أقود الآن» (`hero` thumb); the «أعمل كمزوّد» side carries a warn badge `1` for pending provider work. Active trip card: status «في الطريق · التوقف 1 من 2», code, title 23/800 «استلام · مستودع التميمي», distance; buttons «فتح الخرائط» / «العميل» (chat with the customer as the provider); info caption «تتواصل مع العميل بصفتك المزوّد المتعاقد». «رحلات اليوم» list. Sticky 60dp «تأكيد الوصول للاستلام» above the 3-tab driver bar.

**1j · Employed driver: trip execution.** Hero header: back, «الرحلة النشطة» + code, phone button (calls **the provider's dispatcher**, not the customer); 3-step progress (استلام ✓ / تفريغ, half filled / إرجاع حاوية). Stop card: «التوقف 2 من 3» + remaining km; title 24/800; address 15; instructions box (`sf2`, `info` icon); container number Inter 700 16; «فتح الخرائط» / «المستلم» (consignee at the stop). Next: dashed warn «إرجاع الحاوية الفارغة». Footer: 60dp «تأكيد الوصول» + text-button «الإبلاغ عن مشكلة» (`err`). No prices, no customer identity.

**1k · ePOD.** App bar title + stop. Step 1 photos (3-col square tiles: uploaded ✓, uploading progress 4dp, dashed add `camera-plus`), counter «2/2 ✓». Step 2 signature pad 120dp with dashed baseline + «إعادة». Step 3 recipient OTP (4 boxes) + note «أُرسل الرمز إلى جوال المستلم المسجّل في الطلب». Footer 60dp disabled «أكمل الرمز لإرسال الإثبات» with lock; enables when all 3 steps are done.

### Provider ops: fleet provider with employed drivers (`NQLAH Provider Ops.dc.html`)
Applies when the Provider has employed drivers. The «أعمل كمزوّد / أقود الآن» switch does **not** appear unless the account owner is also listed as a driver in their own fleet (policy decides).

**3a · Provider order view.** App bar: back · code Inter 700 16 · sub «الدمام ← الرياض · تريلا سطحة · الأربعاء 07:00» 12 tx2 · trailing status chip «مُسند». Card 1, customer (e1 shadow): avatar 44 R14 «ر» · «مصنع الروّاد للبلاستيك» 15/700 · «العميل · تتواصل معه بصفتك المزوّد» 12 · chat + call icon buttons (44, mintBg). Revealed row (okBg, R10, padding 8/10): lock-open + «بيانات العميل متاحة بعد القبول» + `+966 55 120 7781` Inter 600 13. Card 2, assigned driver: header «السائق المُسند» 13/700 tx2 + pill «داخلي · لا يظهر للعميل» (24dp, sf2, 11/700, lock-simple). Row: round soft avatar 44 · «فهد العتيبي» · «تريلا سطحة · 7342 KHD · وصل الدمام» · call button · text action «تغيير» 13/700 mintTx (opens 1h). **Internal note** block: R14, 1.5 dashed `warn` border, `warnBg` fill, padding 12/14, title note-pencil + «ملاحظة داخلية للسائق» 13/700 warn, body 14/1.55, meta «يراها السائق فقط · آخر تعديل 08:05» 11 tx2. Section «المسار» + «عرض الكل», then a compact 2-stop list (12dp dots: filled mintS = pickup, ring tx3 = dropoff). Sticky footer: outline «محادثة العميل» (chats) + primary «متابعة الرحلة» (map-trifold), each flex 1, 52dp.

**3b · Customer chat with internal driver note.** Same chat header as 1n but the counterparty is the customer, with sub «NQ-24-08856 · مُسند». Banner (okBg): «تم القبول · أرقام الطرفين متاحة لبعضهما. بيانات السائق لا تُشارك مع العميل.» Bubbles: customer (incoming, sf + bd, R 16 16 16 4), provider (outgoing, hero, R 16 16 4 16, checks). **Internal note bubble**: max-width 86%, R14, 1.5 dashed warn, warnBg, label 11/700 warn «ملاحظة للسائق فهد · لا يراها العميل» with lock icon. System line «وصلت الملاحظة إلى تطبيق السائق» 12 tx3 centered. Composer: a segmented switch on top (36dp) «للعميل» | «ملاحظة للسائق», shown with the note mode active. In note mode the input border is 1.5 `warn` and the placeholder reads «اكتب ملاحظة للسائق…». Input: 44dp pill R22, plus-circle start, 44dp mint mic end. **Rule:** internal notes are a separate message type (`visibility: provider+driver`). The server must never deliver them to customer clients.

**3c · Assignments (tab التكليفات).** H1 + «15 طلبًا». Filter chips 36dp, horizontally scrollable: الكل 15 (active, hero) · بانتظار إسناد (count badge, warn) · مُسند 4 · في الطريق 6 · مكتملة. Grouped list with section labels 13/700 tx2. Card: route 16/700 + meta 12 + status chip at the end. A divider, then the bottom row: driver line (steering-wheel + name, or user-circle + «لم يُسند بعد») and the action (36dp mint «إسناد» → 1h). In-transit card: 6dp progress bar (info; err when late) + «التوقف 2/3 · الوصول 14:20». Late card: chip «متأخر 35 د» (errBg/err, warning-octagon) + «آخر موقع قبل 22 د» err 700.

**3d · Trip monitor (provider).** Full-bleed map, same style as 1d. A stale-location pill sits next to the truck marker: «قبل 22 د», warn, clock icon. Top: back 44 + code pill. Bottom sheet (R24, e2): error banner (errBg) «متأخر 35 د عن الموعد المتفق» / «الموعد 13:30 · المتوقع الآن 14:05»; next stop 19/800 + remaining km Inter 700 19; driver row (round avatar, name, truck · plate, chat + solid call; **visible to the provider only**); two outline 48dp buttons «إبلاغ العميل» (opens 3b with a prefilled delay message) · «تحديث الموقع» (pushes a location ping to the driver app); caption «العميل يرى الحالة والموقع فقط، لا يرى بيانات السائق».

**3e · Fleet: drivers (tab الأسطول).** H1 + 44dp mint add-driver button (user-plus → 3f). Segmented «الشاحنات 14» | «السائقون 11» (drivers active; trucks list uses the same row pattern with plate, type and status). Summary card: «باقة احترافي · 14 شاحنة مفعّلة» + «إدارة الباقة» link (→ 5c / 1m); 4 counters Inter 700 20: متاح 5 (ok) · في رحلة 6 (info) · تنبيه وثائق 1 (warn) · دعوة معلّقة 1 (tx2). Search 48dp. Driver list card (padding 2/14, rows 12dp vertical, 1dp dividers): round soft avatar 44, name 15/700, sub 12, trailing status: dot-pill (26dp, 7dp dot): متاح ok / في رحلة info / دعوة معلّقة neutral; or document chip «الرخصة · 12 يومًا» (warn, warning-circle).

**3f · Add employed driver.** Info banner (infoBg): «يصل للسائق رابط دعوة برسالة SMS. يدخل بنفس التطبيق ويرى الرحلات المُسندة إليه فقط.» Fields (52dp, gap 14): الاسم الكامل · رقم الجوال (LTR, +966 prefix, focused state) · 2-col: رقم الهوية / الإقامة (LTR) | انتهاء الرخصة (calendar) · الشاحنة الافتراضية (dropdown). Permissions card (read-only summary, gap 10): ✓ تنفيذ الرحلات المُسندة وإثبات التسليم · ✓ التواصل مع المكتب والمستلم عند التوقف · ✕ رؤية الأسعار والمالية والسوق · ✕ التواصل مع العميل أو ظهور بياناته له (check-circle fill ok / prohibit tx3). CTA «إرسال الدعوة» (paper-plane-tilt). After sending, the driver appears in 3e as «دعوة معلّقة» until they accept.

**3g · Truck detail + maintenance (paid add-on «إدارة صيانة الأسطول»).** App bar: plate Inter 700 · «تريلا سطحة · مرسيدس أكتروس 2021» · dots-three. Hero card R18: add-on pill (wrench #1FE0C0) + «السائق: فهد العتيبي»; odometer «184,320 km» Inter 700 26; «الصيانة القادمة بعد» + «1,200 km» Inter 700 15 #FBBF24; 6dp bar 92% #FBBF24 on rgba(255,255,255,.12). «جدول الصيانة» + «إضافة بند»: rows with a 40dp tone tile, title 15/700, sub 12 and a status chip: تغيير الزيت والفلاتر (drop, warn, «بعد 1,200 km») · الفحص الفني الدوري (clipboard-text, warn, «خلال 18 يومًا») · التأمين (shield-check, ok «ساري») · الإطارات (gauge, ok «سليمة»). «آخر الصيانات»: row + cost 1,450 ر.س. CTA «تسجيل صيانة» (wrench). Warn threshold: ≤ 2,000 km or ≤ 30 days; err when overdue. If the add-on is off, this section is replaced by an upsell card linking to 1m.

**3h · Provider finance (tab المالية).** Hero panel (grid texture): «المالية» 23/800 + month pill; «مستحقات لدى العملاء» + «18,400.00 ر.س» Inter 700 30; 2 tiles: «6,200 · مُبلّغة بانتظار تأكيدك · 3» and «42,750 · مستلمة هذا الشهر». Segmented: مُبلّغة (warn count) · مستحقة 5 · مؤكّدة. Payment card: payer 15/700 · code · method/time 12 · amount Inter 700 17; bottom row: chip «دفع مُبلّغ» · outline 36dp «الإيصال» (receipt) · mint 36dp «تأكيد الاستلام». Confirm → status «دفع مؤكّد» on both sides. A dispute option sits in the receipt viewer.

### Customer flows (`NQLAH Customer Flows.dc.html`)
Wizard shell (all steps): top bar = x close (start) · «طلب نقل جديد» 17/700 · «حفظ كمسودة» 14/700 mintTx. Progress = 6 segments 4dp, gap 4, filled `mint` from the start (right in RTL). Label row 12 tx2, nowrap: «<b>Step</b> · الخطوة n/6» | «التالي: …». Title 22/800, padding 18/16/0. Footer: outline «السابق» (flex none, padding 0 20) + primary «التالي: …» with trailing arrow-left.

**4a · Step 2 Route.** Sub-trip segmented (consolidated orders only): «رحلة 1 · سطحة» | «رحلة 2 · مبرّدة». Mini-map 130dp R16 with route line 4dp mintS, start dot 18 mintS and end dot 20 err (3dp white border), plus a pill «تعديل على الخريطة». Stops card: grid 28/1fr/28; node 24 (pickup = mintS + map-pin fill; dropoff = err + flag-checkered; container return = 20dp rotated square, warn border); dashed connector; title 15/700 + sub 12; drag handle dots-three-vertical (reorder by long-press). Dashed «إضافة توقف» 40dp. Info (infoBg): «المسافة التقديرية 798 km · نحو 9 ساعات قيادة».

**4b · Step 3 Schedule.** Month label + «التقويم» link. Day strip: tiles 52×68 R14, gap 8, horizontally scrollable; selected = hero bg with white day number Inter 700 20 and a #9FC7C1 day name; past days opacity .4. «نافذة الاستلام»: 2×2 grid of 60dp slots (title 15/700 + LTR range Inter 12); selected = 2dp mintS border + mintBg. Toggle row «موعد مرن ± يوم» (50×30, on). Field «آخر موعد للتسليم». Warn info about the container free-time deadline.

**4c · Step 4 Pricing & visibility.** Two radio option cards (R16; selected = 2dp mintS border, 24dp radio with 12dp dot): «سعر ثابت» (expanded: LTR price field 52dp, focused, Inter 700 20 + ر.س; hint «السعر الشائع لهذا المسار 2,250–2,700 ر.س» with chart-line-up info) · «مناقصة» (when selected it reveals a tender-duration chip set: 6h / 12h / 24h / مخصص). «من يرى الطلب؟» segmented: السوق المفتوح | مزوّدون محدّدون (the latter opens a provider picker = direct assignment). «شروط الدفع» chips: عند التسليم (selected) · خلال 15 يومًا · خلال 30 يومًا.

**4d · Step 5 Consignee & documents.** Card per drop-off stop: «جهة الاتصال عند التفريغ · الرياض», 2-col name | LTR phone. Caption: «يصله رمز التحقق لتأكيد إثبات التسليم» (this is the OTP target in 1k). Documents (gap 8, R14): uploaded (ok file tile, name + size Inter, check-circle + trash) · uploading (info tile, 4dp progress mintS, x to cancel) · optional (1.5 dashed bd, upload-simple tile neutral, «رفع» link). Required, not yet uploaded = dashed mintS (see 5e). Notes textarea min 72dp.

**4e · Step 6 Review & publish.** Card 1: «مجمّع · رحلتان» + «تعديل»; sub-trip rows (24dp number badge: hero for 1, sf2 for 2), route 15/700, sub, price Inter 15. Card 2: key/value rows 14 (label tx2, value nowrap): الاستلام · التسعير · الدفع · المستلم · المستندات. Card 3 price breakdown: أجرة النقل 4,250.00 · رسوم الخدمة 5% 212.50 · ضريبة القيمة المضافة 15% 669.38 · divider · الإجمالي 5,131.88 (Inter 700 20). Formula: service = fare × 5%; VAT = (fare + service) × 15%, rounded to 2 dp. Checkbox (22dp R6, checked mintS) «أوافق على شروط النقل وسياسة الإلغاء» with mintTx links. CTA «نشر الطلب» (megaphone); disabled until the checkbox is checked.

**4f · Offers compare (tab العروض).** App bar «العروض · 3» + «NQ-24-08840 · جدة ← مكة · مناقصة». Warn info with a live countdown «04:58:12» Inter 700 13. Sort chips: الأقل سعرًا (active) · الأعلى تقييمًا · الأسرع استلامًا. Offer card R16: provider avatar, name + seal, «★ 4.8 · 312 رحلة», price Inter 700 20; meta row: pickup time + masked phone (lock-simple). Actions: chat icon button + «قبول العرض» 44dp: primary mint on the best card, mint outline on the others. The best card has a 2dp mintS border and a badge «أفضل قيمة» (22dp, mint, −11 top). Accept → confirm sheet → status مُسند/مؤكّد → contact revealed (1c).

**4g · My shipments (tab شحناتي).** H1 + 44dp hero filter button. Segmented نشطة 4 · مسودات 1 · مكتملة 28. Search 48dp. Compact waybill cards (gap 8): code Inter 600 13 tx2 + status chip; route 17/800; one status line 13 tx2 with a leading icon (in transit: broadcast + «التوقف 2/3 · الوصول 14:20» + 4dp info progress; tender: warn «3 عروض» + expiry; assigned: steering-wheel «تم إسناد سائق»; container pending: «تم تسليم البضاعة · الحاوية لم تُرجع بعد»).

**4h · Customer finance (tab المالية).** Hero card R18: «المستحق عليك» + «4,590.00 ر.س» Inter 700 30 + «فاتورتان بانتظار الدفع · أقرب استحقاق خلال 3 أيام». Segmented: بانتظار الدفع (warn count) · مُبلّغة 1 · مدفوعة. Neutral info: «يتم الدفع مباشرة للمزوّد…». Invoice card: provider 15/700 · invoice no Inter 12 · amount; row: due chip (clock, warn «خلال 3 أيام»; err when overdue) · outline 36dp «بيانات البنك» (bank; reveals the provider IBAN) · mint 36dp «إبلاغ عن دفع» (opens a sheet: amount, transfer date, receipt upload). Status then becomes «دفع مُبلّغ» on both sides until the provider confirms (3h).

### Driver, account, notifications, auth (`NQLAH Driver Account Auth.dc.html`)
**5a · Employed driver: my trips (tab رحلاتي).** Header: round avatar hero 44 · name 16/700 · «سائق · شركة الأفق للنقل» · availability dot-pill «متاح» (tap toggles to غير متاح). Segmented 44dp: جديدة (mint count) · قادمة 2 · مكتملة. New-assignment card: 2dp mintS border, R18, e1, padding 16: chip «تكليف جديد» (mintBg, bell) + code «NQ-24-08856 · L1»; route 24/800; 3 detail lines 14 with 18dp tx2 icons (date/time, truck · plate, stops summary); office note (dashed warn, «ملاحظة من المكتب:» 700 warn); **60dp** primary «استلام التكليف» (check-circle fill); caption «أسندها لك مكتب شركة الأفق · للاستفسار اتصل بالمكتب». No price, no customer name/phone. «القادمة» list rows (48×52 date tile + chip مؤكّد). Tabs: driver (رحلاتي · الإشعارات · حسابي). Acknowledge → trip moves to قادمة and the provider sees «استلم السائق التكليف».

**5b · Notifications (from the bell; customer example).** App bar + «قراءة الكل». Filter chips: الكل · الطلبات · العروض (count) · المالية. Groups «اليوم» / «أمس» (label 13/700 tx2). Row: padding 12/16, 40dp tone tile, title 15/700, body 13/1.5 tx2, time Inter 12 tx3; unread = mintBg row bg + 8dp mintS dot under the time. The group sits on `sf` with 1dp top/bottom borders. Tap → deep link to the related screen. Types and tones: offer (warn hand-coins) · in transit (info truck) · driver assigned (mint steering-wheel) · payment confirmed (ok check-square) · ePOD available (warn signature) · container reminder (warn shipping-container).

**5c · Account & plan (provider; opened from the avatar on Home).** Profile card: 52dp avatar, name 17/700 + seal, «مزوّد · سجل تجاري 2050118472», «عبدالرحمن السبيعي · مدير الحساب». Plan card (hero, R16): «باقة احترافي» 16/800 + trial pill (rgba(251,191,36,.18), #FBBF24, «تجربة · متبقٍ 9 أيام»); «14 شاحنة · إدارة صيانة الأسطول»; price «749 ر.س/شهر» (= 299 + 9×39 + 99) + mint «إدارة الباقة» → plan editor (same component as 1m, prorated). Settings groups (rows ≥ 52dp, icon 21 tx2, value 13 tx2, caret-left): المستخدمون والصلاحيات 3 · مستندات المنشأة سارية · الحساب البنكي SA•• 4471 · الإشعارات · اللغة العربية · المظهر تلقائي (system/light/dark); then المساعدة والدعم · تسجيل الخروج (err, no chevron). Customer and driver variants hide the plan card; the driver variant shows only: profile, اللغة, المظهر, الإشعارات, المساعدة, تسجيل الخروج.

**5d · OTP login.** Back-only app bar. Title 26/800 «أدخل رمز التحقق»; sub 15/1.6 with the LTR number + «تعديل». 4 boxes 62dp, gap 12, LTR (same component as 1k, larger). «إعادة الإرسال خلال 0:42» + «عبر واتساب» (disabled tx3 until the timer ends). Auto-fill hint. Error state: boxes get 1.5 err borders + message «الرمز غير صحيح، تبقّى 2 محاولات». CTA 54dp «تحقق», disabled (sf2/tx3 + lock) until 4 digits are entered; auto-submits on the 4th digit.

**5e · Register step 3/4: verification documents.** Title 24/800 + «نراجعها خلال 24 ساعة عمل». Upload rows (see 4d): السجل التجاري ✓ · شهادة ضريبة القيمة المضافة ✓ · ترخيص هيئة النقل العام (providers only) uploading 64% · العنوان الوطني (required, dashed mintS) · هوية المفوّض بالتوقيع (required). Neutral info with shield-check about privacy. CTA disabled «أكمل المستندات المطلوبة (2)»; it becomes «إرسال للمراجعة» once everything is uploaded. Customers (عميل) see only CR, VAT and national address.

**5f · Register step 4/4: pending approval.** Centered: 88dp tile R28 infoBg with hourglass-medium 44 info; title 24/800; body 15/1.6. Status timeline (28dp nodes: done ok + check, current info + clock + 5dp ring, next = bd ring; 2dp connectors). Mint info: browsing allowed while waiting. Rejected variant (err info): reason text + «إعادة رفع المستند» (returns to 5e with the rejected row in err border). CTA stack: primary «تصفّح الأحمال» + outline 48dp «تواصل مع الدعم» (headset).

**5g · Incoming in-app call (always dark).** Background radial(#123F3B → #0B1413). Label «مكالمة صوتية واردة · داخل التطبيق» 14 #B9CCC9. Avatar 108 R32 #0E2F2C with a 2dp #1FE0C0 border, inside 2 concentric rings (136/168, 1dp rgba(31,224,192,.35/.18); animate the pulse 1.6s). Name 26/800 + seal; «شركة الأفق للنقل · بخصوص NQ-24-08812» 15; pill «الرقم غير ظاهر · مكالمة عبر نقلة». Quick replies 36dp pills: «سأعاود الاتصال» · «رد برسالة». Buttons 72dp: رفض (#DC2626, phone-disconnect) · رد (#22C55E, 8dp rgba(34,197,94,.18) ring). Accept → voice call screen (same layout as 1o without video tiles).

### Communication (`NQLAH Auth and Comms.dc.html`)
**1n · Chat before acceptance + voice recording.** Header (sf, bottom border): back, provider avatar R12, name + seal, «★ 4.8 · متصل الآن», call + video icons (in-app). Lock banner «التواصل داخل التطبيق فقط. تظهر أرقام الجوال بعد قبول العرض.». Pinned offer context row (code + 1,950). Day separator «اليوم». Bubbles: text (outgoing), voice note (incoming), photo (incoming). Composer shown in **recording** state.

**1o · Video call (always dark).** Remote video full-bleed, top/bottom gradient (rgba(0,0,0,.55) → transparent 22% … 70% → rgba(0,0,0,.7)). Caller = provider's ops contact «عبدالرحمن السبيعي · شركة الأفق للنقل · 04:12», quality pill «اتصال جيد» (4 signal bars). Self-view 104×150 R16, 16dp from start edge, top 130. Controls 56dp circles, gap 14, 34dp from bottom: كتم (active = white bg, hero icon) · السماعة · تبديل · الكاميرا · إنهاء (#DC2626).

## 8. Navigation map
```
Splash → Login 2c ─(OTP alt)→ 5d
   └─ «إنشاء حساب» → Register 1l → Plan 1m (provider only) → Documents 5e → Pending 5f → (approved) shell
GET /me → policy engine
├─ Customer shell (tabs: الرئيسية 1a · شحناتي 4g · العروض 4f · المالية 4h · حسابي 5c-variant)
│   Home 1a ─ «طلب نقل جديد» → 1b Cargo → 4a Route → 4b Schedule → 4c Pricing → 4d Consignee/Docs → 4e Review → publish → 4g (منشور/مناقصة)
│          ─ shipment card → 1c Order detail → 1d Tracking
│          ─ offers alert → 4f Offers → chat 1n / accept → 1c
│          ─ bell → 5b Notifications
│   Finance 4h → «إبلاغ عن دفع» sheet → دفع مُبلّغ → (provider confirms) دفع مؤكّد
│   Calls: in-app voice/video 1o, incoming 5g
├─ Provider shell (tabs: الرئيسية 2d · الأحمال 1f · التكليفات 3c · الأسطول 3e · المالية 3h; avatar → 5c)
│   Home 2d / 3c ─ «إسناد» → 1h → confirm → driver gets 5a
│   Loads 1f ⇄ filter 1g → accept / bid
│   Order 3a ─ chat 3b (customer + internal note) ─ «متابعة الرحلة» → 3d ─ «تغيير» → 1h
│   Delay alert (2d) → 3d → «إبلاغ العميل» → 3b
│   Fleet 3e ─ add → 3f ─ truck → 3g (maintenance add-on)
│   Owner-driver variant (only driver = self): 1i ⇄ 2e via the context switch
└─ Employed driver shell (tabs: رحلاتي 5a · الإشعارات · حسابي)
    5a «استلام التكليف» → trip active → 1j execution → arrive → 1k ePOD → next stop / container return → completed
```
Back navigation: system back + app-bar `arrow-right`. Sheets close by drag-down, scrim tap, or back.

## 9. Interactions & behavior
- **Shell resolution:** after login show a skeleton of the generic shell, then mount the shell from policy. Never show a role picker. Policy changes (e.g. a provider adds a second driver) take effect on next `/me` refresh.
- **Context switch (owner-driver):** segmented, persists last choice per device; deep links/notifications for trips open «أقود الآن», for orders/offers open «أعمل كمزوّد». The inactive side shows a count badge for pending items.
- **Contact reveal:** driven by order status from the server; the client never decides. Masked numbers are not tappable; call before acceptance = in-app VoIP only.
- **Plan picker (1m):** stepper ± clamps 5–50; toggles flip on row tap; totals recompute instantly; the footer total mirrors the card total.
- **Assignment (1h):** single select; CTA label includes the selected name; on confirm send a push to the driver; customer sees «تم إسناد سائق» only.
- **ePOD (1k):** CTA disabled until photos ≥ required, signature captured, OTP complete; OTP auto-advance and paste support; resend timer.
- **Voice note:** press-and-hold mic to record; slide toward start edge to cancel; release to send.
- **Forms:** VAT = 15 digits (live counter), disabled by «غير مسجّلة» checkbox; CR validated on blur with check icon.
- **Live tracking:** freshness pill states live (≤ 60s) / stale (shows age) / unavailable.
- **Offline:** banner at top of content, cached data shown, actions that need network are disabled with explanation.

## 10. Motion
| Interaction | Spec |
|---|---|
| Button press | scale .98 + color to `mintS`, 90ms ease-out; release 120ms |
| Tab switch | active pill cross-fade + icon swap regular → fill, 180ms standard easing (0.2, 0, 0, 1) |
| Segmented / context switch | thumb slides 220ms (0.2, 0, 0, 1); content cross-fades 160ms |
| Bottom sheet | enter: slide up 280ms (0.05, 0.7, 0.1, 1) + scrim fade 200ms; exit 200ms (0.3, 0, 0.8, 0.15) |
| Toggle | knob + track 150ms ease |
| Push navigation | platform default (iOS slide, Android shared-axis X), mirrored for RTL |
| Stepper value | number roll / cross-fade 120ms |
| Snackbar | slide up + fade 200ms, auto dismiss 4s |
| Live dot / truck halo | pulse: scale 1 → 1.6, opacity .6 → 0, 1.6s loop |
| Truck marker on map | interpolate position between GPS fixes over the update interval, linear |
| Skeleton | shimmer 1.2s loop (or static `sf2` with reduce-motion) |
| Recording | waveform bars update at ~12fps; mic ring pulse 1.2s |
Honour OS "reduce motion": replace slides/pulses with fades.

## 11. State (per shell)
- `session` { identity: customer | provider | driver, providerId?, isOwnerDriver (provider with drivers = [self]), permissions[] }
- `ownerDriverContext`: 'provider' | 'driving' (persisted)
- Customer: orders[], offersByOrder, activeOrderTracking (position, lastFixAt, eta, progress)
- Provider: loads (filters, count), pendingAssignments[], drivers[] (availability, eligibility per order), receivables, threads[]
- Driver: assignedTrips[], activeTrip (stops[], currentStopIndex), epodDraft { photos[], signature, otp }
- Plan picker: trucks (5–50, default 8), addons { maint, fuel, reports, support }
- Order contact visibility: from server per order: `contactRevealed: boolean`; driver identity never sent to customer clients.

## 12. Assets
- `assets/logo-mark.svg`, `assets/logo-mark-on-dark.svg`, `assets/logo-lockup-ar.svg`: **placeholder** logo (no logo was provided).
- Icons: Phosphor v2.1.1 (MIT), Regular + Fill. Use the package, don't export individually.
- Fonts: Tajawal + Inter, Google Fonts (OFL). Not custom.
- No other illustrations. Map, photos and video are placeholders.

## 13. Files
- `design_files/NQLAH App Shell.dc.html`: 2a–2e (unified model, comms rule, login, provider home, owner-driver driving)
- `design_files/NQLAH Customer.dc.html`: 1a–1e
- `design_files/NQLAH Provider and Drivers.dc.html`: 1f–1k
- `design_files/NQLAH Auth and Comms.dc.html`: 1l–1o
- `design_files/NQLAH Provider Ops.dc.html`: 3a–3h (fleet provider: order view, chat + internal note, assignments, trip monitor, fleet, add driver, maintenance, finance)
- `design_files/NQLAH Customer Flows.dc.html`: 4a–4h (wizard steps 2–6, offers, shipments, finance)
- `design_files/NQLAH Driver Account Auth.dc.html`: 5a–5g (driver trips, notifications, account & plan, OTP, verification, pending approval, incoming call)
- `design_files/NQLAH Design System.dc.html`: token sheet, status chips, buttons, contact reveal, states
- `design_files/support.js`: runtime required to open the files in a browser
- `tokens.json`: all tokens, light + dark
- `screenshots/`: PNG per screen, light + dark

## 14. Coverage & remaining gaps
All primary flows for the 3 identities are now designed (2a–2e, 1a–1o, 3a–3h, 4a–4h, 5a–5g), in light and dark. These are reusable patterns, not separate mocks, and should be built from the components above: the trucks tab of 3e (same row pattern), the payment-report sheet (4h), the tender-duration chips (4c), the voice-call screen (1o layout without video), the driver account variant (5c), and empty/offline/skeleton states (Design System sheet). Not designed: admin/back-office (out of scope for the mobile app).

## 15. Build checklist (for exact match)
1. Implement the tokens from `tokens.json` as theme objects (light/dark) before any screen. Never hard-code hex values in screens, except the fixed on-hero/call colors listed in §5.2.
2. Set the app locale to ar-SA with RTL by default and Western digits. Wrap every number, code, plate, phone and price in an LTR-isolated Inter span.
3. Build the shared components in §6 first (button set, field, chip/status chip, segmented, waybill card + route strip + perforation, party card + reveal row, timeline, sheet, tab bar, upload row, toggle, OTP boxes).
4. Compare every screen at 390dp against `screenshots/<id>-<name>-light.png` and `-dark.png` (2x PNGs, 820×1728 incl. a 10dp device bezel; the screen area is 390×844 at offset 10,10).
5. Enforce server-side: identity/policy resolution, contact reveal by status, driver data never sent to customer clients, internal notes delivered to provider + driver only.
