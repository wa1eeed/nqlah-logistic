import 'package:flutter/material.dart';

/// Design tokens for NQLAH, generated from `docs/mobile/design/tokens.json`
/// (Claude Design round-1 handoff). Colors live in [NqColors] (a theme
/// extension that swaps light/dark); non-color tokens are plain constants.
///
/// Rule from the handoff §15: never hard-code hex in screens — read semantic
/// colors via `context.nq` — except the fixed on-hero / call colors in
/// [NqFixed], which are theme-independent by design.

Color _hex(String h) {
  var s = h.replaceAll('#', '');
  if (s.length == 6) s = 'FF$s';
  return Color(int.parse(s, radix: 16));
}

/// Semantic color roles. Identical names in light and dark; a widget reads
/// `context.nq.mint` and gets the right value for the active theme.
@immutable
class NqColors extends ThemeExtension<NqColors> {
  const NqColors({
    required this.bg,
    required this.sf,
    required this.sf2,
    required this.bd,
    required this.tx,
    required this.tx2,
    required this.tx3,
    required this.mint,
    required this.mintS,
    required this.mintTx,
    required this.mintBg,
    required this.onMint,
    required this.hero,
    required this.hero2,
    required this.ok,
    required this.okBg,
    required this.warn,
    required this.warnBg,
    required this.err,
    required this.errBg,
    required this.info,
    required this.infoBg,
    required this.map,
    required this.road,
    required this.park,
    required this.scrim,
    required this.completedChipBg,
    required this.brightness,
  });

  final Color bg; // app background
  final Color sf; // cards, sheets, bars
  final Color sf2; // segmented track, alt inputs, skeleton
  final Color bd; // borders, dividers, dashed route
  final Color tx; // primary text
  final Color tx2; // secondary text, inactive tabs
  final Color tx3; // tertiary, placeholders
  final Color mint; // primary fill (buttons, live)
  final Color mintS; // strong mint: focus rings, selected borders, progress
  final Color mintTx; // mint as text/icon (AA-safe on light)
  final Color mintBg; // mint tint (active tab pill, chips)
  final Color onMint; // text on mint fill
  final Color hero; // hero panels, dark chips, avatars
  final Color hero2; // hero secondary
  final Color ok;
  final Color okBg;
  final Color warn;
  final Color warnBg;
  final Color err;
  final Color errBg;
  final Color info;
  final Color infoBg;
  final Color map;
  final Color road;
  final Color park;
  final Color scrim;
  final Color completedChipBg; // "completed" status chip bg
  final Brightness brightness;

  bool get isDark => brightness == Brightness.dark;

  static final light = NqColors(
    bg: _hex('#F6F8F8'),
    sf: _hex('#FFFFFF'),
    sf2: _hex('#EDF2F1'),
    bd: _hex('#E2E8E7'),
    tx: _hex('#0F1A19'),
    tx2: _hex('#566664'),
    tx3: _hex('#7E8E8C'),
    mint: _hex('#00C9A7'),
    mintS: _hex('#00A88A'),
    mintTx: _hex('#007A66'),
    mintBg: _hex('#E2F7F2'),
    onMint: _hex('#06302D'),
    hero: _hex('#0A3D3A'),
    hero2: _hex('#0D5C57'),
    ok: _hex('#15803D'),
    okBg: _hex('#E6F5EB'),
    warn: _hex('#B45309'),
    warnBg: _hex('#FEF3E2'),
    err: _hex('#DC2626'),
    errBg: _hex('#FDECEC'),
    info: _hex('#1D4ED8'),
    infoBg: _hex('#E8EFFD'),
    map: _hex('#E3EBE8'),
    road: _hex('#FFFFFF'),
    park: _hex('#D3E6DC'),
    scrim: const Color(0x730A1A19), // rgba(10,26,25,.45)
    completedChipBg: _hex('#0A3D3A'),
    brightness: Brightness.light,
  );

  static final dark = NqColors(
    bg: _hex('#0B1413'),
    sf: _hex('#111E1C'),
    sf2: _hex('#182725'),
    bd: _hex('#243533'),
    tx: _hex('#E8F0EF'),
    tx2: _hex('#9FB4B1'),
    tx3: _hex('#7A918E'),
    mint: _hex('#1FE0C0'),
    mintS: _hex('#00C9A7'),
    mintTx: _hex('#1FE0C0'),
    mintBg: const Color(0x1F1FE0C0), // rgba(31,224,192,.12)
    onMint: _hex('#062724'),
    hero: _hex('#0E2F2C'),
    hero2: _hex('#123F3B'),
    ok: _hex('#22C55E'),
    okBg: const Color(0x2422C55E), // rgba(34,197,94,.14)
    warn: _hex('#FBBF24'),
    warnBg: const Color(0x21FBBF24), // rgba(251,191,36,.13)
    err: _hex('#F87171'),
    errBg: const Color(0x24F87171), // rgba(248,113,113,.14)
    info: _hex('#60A5FA'),
    infoBg: const Color(0x2460A5FA), // rgba(96,165,250,.14)
    map: _hex('#0E1A19'),
    road: _hex('#1A2A28'),
    park: _hex('#12241F'),
    scrim: const Color(0x99000000), // rgba(0,0,0,.6)
    completedChipBg: _hex('#1E4A45'),
    brightness: Brightness.dark,
  );

  @override
  NqColors copyWith({
    Color? bg,
    Color? sf,
    Color? sf2,
    Color? bd,
    Color? tx,
    Color? tx2,
    Color? tx3,
    Color? mint,
    Color? mintS,
    Color? mintTx,
    Color? mintBg,
    Color? onMint,
    Color? hero,
    Color? hero2,
    Color? ok,
    Color? okBg,
    Color? warn,
    Color? warnBg,
    Color? err,
    Color? errBg,
    Color? info,
    Color? infoBg,
    Color? map,
    Color? road,
    Color? park,
    Color? scrim,
    Color? completedChipBg,
    Brightness? brightness,
  }) {
    return NqColors(
      bg: bg ?? this.bg,
      sf: sf ?? this.sf,
      sf2: sf2 ?? this.sf2,
      bd: bd ?? this.bd,
      tx: tx ?? this.tx,
      tx2: tx2 ?? this.tx2,
      tx3: tx3 ?? this.tx3,
      mint: mint ?? this.mint,
      mintS: mintS ?? this.mintS,
      mintTx: mintTx ?? this.mintTx,
      mintBg: mintBg ?? this.mintBg,
      onMint: onMint ?? this.onMint,
      hero: hero ?? this.hero,
      hero2: hero2 ?? this.hero2,
      ok: ok ?? this.ok,
      okBg: okBg ?? this.okBg,
      warn: warn ?? this.warn,
      warnBg: warnBg ?? this.warnBg,
      err: err ?? this.err,
      errBg: errBg ?? this.errBg,
      info: info ?? this.info,
      infoBg: infoBg ?? this.infoBg,
      map: map ?? this.map,
      road: road ?? this.road,
      park: park ?? this.park,
      scrim: scrim ?? this.scrim,
      completedChipBg: completedChipBg ?? this.completedChipBg,
      brightness: brightness ?? this.brightness,
    );
  }

  @override
  NqColors lerp(ThemeExtension<NqColors>? other, double t) {
    if (other is! NqColors) return this;
    return NqColors(
      bg: Color.lerp(bg, other.bg, t)!,
      sf: Color.lerp(sf, other.sf, t)!,
      sf2: Color.lerp(sf2, other.sf2, t)!,
      bd: Color.lerp(bd, other.bd, t)!,
      tx: Color.lerp(tx, other.tx, t)!,
      tx2: Color.lerp(tx2, other.tx2, t)!,
      tx3: Color.lerp(tx3, other.tx3, t)!,
      mint: Color.lerp(mint, other.mint, t)!,
      mintS: Color.lerp(mintS, other.mintS, t)!,
      mintTx: Color.lerp(mintTx, other.mintTx, t)!,
      mintBg: Color.lerp(mintBg, other.mintBg, t)!,
      onMint: Color.lerp(onMint, other.onMint, t)!,
      hero: Color.lerp(hero, other.hero, t)!,
      hero2: Color.lerp(hero2, other.hero2, t)!,
      ok: Color.lerp(ok, other.ok, t)!,
      okBg: Color.lerp(okBg, other.okBg, t)!,
      warn: Color.lerp(warn, other.warn, t)!,
      warnBg: Color.lerp(warnBg, other.warnBg, t)!,
      err: Color.lerp(err, other.err, t)!,
      errBg: Color.lerp(errBg, other.errBg, t)!,
      info: Color.lerp(info, other.info, t)!,
      infoBg: Color.lerp(infoBg, other.infoBg, t)!,
      map: Color.lerp(map, other.map, t)!,
      road: Color.lerp(road, other.road, t)!,
      park: Color.lerp(park, other.park, t)!,
      scrim: Color.lerp(scrim, other.scrim, t)!,
      completedChipBg: Color.lerp(completedChipBg, other.completedChipBg, t)!,
      brightness: t < 0.5 ? brightness : other.brightness,
    );
  }
}

/// Fixed colors that do NOT change with the theme (handoff §5.2): content on
/// hero panels, and the always-dark call screens.
class NqFixed {
  NqFixed._();

  // On hero panels (teal), text/fills are fixed regardless of light/dark.
  static final heroText = _hex('#E8F0EF');
  static final heroTextSecondary = _hex('#9FC7C1');
  static final heroAccent = _hex('#1FE0C0');
  static const heroFill1 = Color(0x14FFFFFF); // rgba(255,255,255,.08)
  static const heroFill2 = Color(0x1AFFFFFF); // rgba(255,255,255,.1)
  static const heroGridLine = Color(0x09FFFFFF); // rgba(255,255,255,.035)
  static const heroGridStep = 26.0;

  // Snackbar (always dark surface).
  static final snackbarBg = _hex('#0F1A19');
  static final snackbarText = _hex('#E8F0EF');
  static final snackbarAccent = _hex('#1FE0C0');

  // Video / voice call screens are always dark.
  static final callBg = _hex('#0B1413');
  static final callSecondary = _hex('#B9CCC9');
  static final callEnd = _hex('#DC2626');
}

/// 4pt spacing scale (handoff §5.4): [4, 8, 12, 16, 20, 24, 32, 48].
class NqSpace {
  NqSpace._();
  static const double x1 = 4;
  static const double x2 = 8;
  static const double x3 = 12;
  static const double x4 = 16;
  static const double x5 = 20;
  static const double x6 = 24;
  static const double x7 = 32;
  static const double x8 = 48;
  static const double gutter = 16;
}

/// Corner radii (handoff §5.5).
class NqRadius {
  NqRadius._();
  static const double input = 12;
  static const double button = 14;
  static const double buttonLarge = 16;
  static const double card = 16;
  static const double cardOverlap = 18;
  static const double sheet = 20;
  static const double trackingSheet = 24;
  static const double pill = 999;
}

/// Layout dimensions (handoff §4, tokens.json `layout`).
class NqLayout {
  NqLayout._();
  static const double gutter = 16;
  static const double statusBar = 36;
  static const double appBar = 52;
  static const double tabBar = 78;
  static const double touchMin = 44;
  static const double driverPrimary = 60;
  static const double button = 52;
  static const double heroButton = 56;
  static const double input = 52;
}

/// Motion durations & curves (handoff §10, tokens.json `motion`).
class NqMotion {
  NqMotion._();
  static const standard = Cubic(0.2, 0, 0, 1);
  static const emphasizedDecel = Cubic(0.05, 0.7, 0.1, 1);
  static const emphasizedAccel = Cubic(0.3, 0, 0.8, 0.15);
  static const press = Duration(milliseconds: 90);
  static const toggle = Duration(milliseconds: 150);
  static const tab = Duration(milliseconds: 180);
  static const segmented = Duration(milliseconds: 220);
  static const sheetIn = Duration(milliseconds: 280);
  static const sheetOut = Duration(milliseconds: 200);
  static const snackbar = Duration(milliseconds: 200);
  static const pulse = Duration(milliseconds: 1600);
}

/// Convenient access: `context.nq.mint`.
extension NqThemeX on BuildContext {
  NqColors get nq =>
      Theme.of(this).extension<NqColors>() ?? NqColors.light;
}
