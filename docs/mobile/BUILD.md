# NQLAH Mobile — Build Guide & Progress

The Flutter implementation of the unified NQLAH app, built from the Claude Design
handoff in [`design/`](design/). This doc is kept **up to date as the app is
built** — structure, decisions, and per-phase status.

## Stack
- **Flutter** 3.47.8 / Dart 3.13.7 · **Riverpod** (state) · **GoRouter** (routing)
- **google_fonts** (Tajawal + Inter) · **flutter_svg** (Phosphor icons as SVG)
- Arabic-first, **RTL / `ar-SA`** by default · light + dark from design tokens.

## Project layout (`apps/mobile/`)
```
lib/
  main.dart                 ProviderScope → NqApp
  app.dart                  MaterialApp.router (RTL, ar-SA, light/dark)
  core/
    router.dart             GoRouter routes
    session/identity.dart   NqIdentity + per-role bottom-tab sets
    theme/tokens.dart       NqColors (ThemeExtension) + spacing/radii/motion
    theme/typography.dart   NqType (Tajawal/Inter scale)
    theme/app_theme.dart    light/dark ThemeData
    widgets/nq_icon.dart    NqIcon + NqIcons (Phosphor SVG names)
    widgets/ltr.dart        LTR-isolated numbers/codes
  design_system/            NqButton, NqTextField, NqStatusChip, NqSegmented,
                            NqChip, NqToggle, NqTabBar, NqHeroPanel, NqLogoMark,
                            form_fields, pressable
  features/
    auth/                   login, otp, register wizard
    shell/app_shell.dart    policy-driven shell + bottom nav
    gallery/                design-system gallery (dev reference)
assets/
  icons/{regular,fill}/     102 Phosphor SVGs (fill="currentColor")
  logo/                     placeholder logo SVGs
```

## Key decisions
- **Icons = Phosphor SVGs, not `phosphor_flutter`.** That package extends
  `IconData`, which is `final` in Flutter 3.47, so it won't compile. We bundle the
  Phosphor SVGs and render with `flutter_svg` (`NqIcon`). Add a new icon by
  dropping its SVG in `assets/icons/{regular,fill}/` and a name in `NqIcons`.
- **Never hard-code hex** in screens — read `context.nq.<role>`; the only fixed
  colors are `NqFixed` (on-hero / call screens).
- **Numbers/codes/prices/plates** always `Ltr(...)` + Inter.
- Verified in the browser via `flutter run -d web-server --web-port=8090`; iOS
  simulator pending full Xcode on the dev machine.
- **Follow-up:** `google_fonts` fetches Tajawal/Inter at runtime (first load can
  show tofu until fetched). Bundle the font files in `assets/` + pubspec for
  reliable offline rendering before release.

## Phase status
| Phase | Scope | Status |
|---|---|---|
| 0 | Design system (tokens, theme, components, icons, gallery) | ✅ merged (#101) |
| 1 | Shell + auth: login (2c), OTP (5d), register (1l/1m/5e/5f), per-role nav (2a) | ✅ merged (#102, #103) |
| 2 | Customer: home (1a), create-order wizard (1b/4a–4e), shipments (4g), offers (4f), order detail (1c), tracking (1d), trucks (6a/6b), finance (4h), notifications (5b), account (5c) | ✅ complete — all customer screens built & verified; full shell nav works |
| 3 | Provider: home (2d), loads (1f/1g), order view (3a), assignment (1h), assignments (3c), trip monitor (3d), fleet (3e/3f), maintenance (3g), finance (3h), owner-driver (1i/2e), availability (7a/7b/7c) | 🚧 home (2d) + loads (1f) + order view (3a) + assignment (1h) + assignments (3c) + fleet-drivers (3e) + maintenance (3g) + finance (3h) done; trip monitor (3d), fleet-trucks + add-driver (3f), owner-driver (1i/2e), availability (7a/7b/7c) next |
| 4 | Driver: my trips, execution, ePOD | ⏳ |
| 5 | Communication: chat, voice notes, calls | ⏳ |

## Design updates applied
- **Addendum 01** ([`design/HANDOFF-ADDENDUM-01.md`](design/HANDOFF-ADDENDUM-01.md)) —
  reverse marketplace (truck availability / backhaul) + customer nav change.
  - ✅ Applied: customer tab bar is now **الرئيسية · الشاحنات · شحناتي · العروض · حسابي**
    (Finance moved to a wallet button in the home header; Trucks tab added).
  - ⏳ Pending (Phases 2–3): screens 6a/6b (available trucks) & 7a/7b/7c (load
    detail, bid sheet, publish availability); home wallet button; finance (4h)
    pushed; loads «طلب مباشر» chip; fleet «التوفّر» segment; new status chip
    «بانتظار رد المزوّد»; `TruckAvailability` data model + server rules (§2, §8).
