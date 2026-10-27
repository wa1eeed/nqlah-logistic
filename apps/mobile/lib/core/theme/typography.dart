import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Type scale from the handoff §5.3 / tokens.json `font`.
///
/// Arabic UI text = Tajawal. Numerals, prices, codes, plates, container
/// numbers = Inter (LTR, tabular). Colors are applied by widgets (default to
/// `context.nq.tx`); these are shape-only base styles.
class NqType {
  NqType._();

  static TextStyle _ar(double size, double line, FontWeight weight) =>
      GoogleFonts.tajawal(fontSize: size, height: line / size, fontWeight: weight);

  static TextStyle _en(double size, double line, FontWeight weight,
          {bool tabular = false, double? spacing}) =>
      GoogleFonts.inter(
        fontSize: size,
        height: line / size,
        fontWeight: weight,
        letterSpacing: spacing,
        fontFeatures: tabular ? const [FontFeature.tabularFigures()] : null,
      );

  // Arabic UI styles.
  static TextStyle get display => _ar(30, 38, FontWeight.w800);
  static TextStyle get h1 => _ar(23, 30, FontWeight.w800);
  static TextStyle get h2 => _ar(18, 24, FontWeight.w700);
  static TextStyle get h3 => _ar(16, 22, FontWeight.w700);
  static TextStyle get body => _ar(15, 23, FontWeight.w400);
  static TextStyle get bodyStrong => _ar(15, 23, FontWeight.w700);
  static TextStyle get label => _ar(13, 19, FontWeight.w500);
  static TextStyle get labelStrong => _ar(13, 19, FontWeight.w700);
  static TextStyle get caption => _ar(12, 17, FontWeight.w400);
  static TextStyle get tab => _ar(11, 14, FontWeight.w400);
  static TextStyle get tabActive => _ar(11, 14, FontWeight.w700);

  // Driver title (large, for execution screens).
  static TextStyle get driverTitle => _ar(24, 30, FontWeight.w800);

  // Latin / numeric styles (Inter, LTR).
  static TextStyle price({double size = 22}) =>
      _en(size, size * 1.2, FontWeight.w700, tabular: true);
  static TextStyle code({double size = 14}) =>
      _en(size, size * 1.2, FontWeight.w600, spacing: 0.5);
  static TextStyle numeric(double size, FontWeight weight) =>
      _en(size, size * 1.3, weight, tabular: true);
}
