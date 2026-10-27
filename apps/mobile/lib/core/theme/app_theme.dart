import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import 'tokens.dart';
import 'typography.dart';

/// Builds the light & dark [ThemeData] for NQLAH, wiring the [NqColors] theme
/// extension and Tajawal as the default UI font. Screens read semantic colors
/// via `context.nq`; this sets sensible Material defaults (scaffold bg, text
/// color, Material 3).
class NqTheme {
  NqTheme._();

  static ThemeData light() => _build(NqColors.light);
  static ThemeData dark() => _build(NqColors.dark);

  static ThemeData _build(NqColors c) {
    final isDark = c.isDark;
    final base = isDark ? ThemeData.dark() : ThemeData.light();

    final textTheme = GoogleFonts.tajawalTextTheme(base.textTheme).apply(
      bodyColor: c.tx,
      displayColor: c.tx,
    );

    return base.copyWith(
      brightness: c.brightness,
      scaffoldBackgroundColor: c.bg,
      canvasColor: c.bg,
      colorScheme: (isDark ? const ColorScheme.dark() : const ColorScheme.light())
          .copyWith(
        brightness: c.brightness,
        primary: c.mint,
        onPrimary: c.onMint,
        secondary: c.hero,
        surface: c.sf,
        onSurface: c.tx,
        error: c.err,
      ),
      textTheme: textTheme,
      primaryColor: c.mint,
      dividerColor: c.bd,
      splashFactory: InkRipple.splashFactory,
      extensions: <ThemeExtension<dynamic>>[c],
      appBarTheme: AppBarTheme(
        backgroundColor: c.sf,
        foregroundColor: c.tx,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: true,
        titleTextStyle: NqType.h3.copyWith(color: c.tx),
      ),
    );
  }
}
