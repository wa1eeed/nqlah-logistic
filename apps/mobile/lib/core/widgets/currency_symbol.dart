import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../platform/currency.dart';
import '../platform/format.dart';

/// The official new Saudi Riyal symbol (SAMA 2025). The Unicode sign (U+20C1)
/// is too new for most fonts, so render it as SVG — identical everywhere.
const String _kRiyalSvg =
    '<svg viewBox="0 0 1124.14 1256.39" xmlns="http://www.w3.org/2000/svg">'
    '<path d="M699.62,1113.02h0c-20.06,44.48-33.32,92.75-38.4,143.37l424.51-90.24c20.06-44.47,33.31-92.75,38.4-143.37l-424.51,90.24Z"/>'
    '<path d="M1085.73,895.8c20.06-44.47,33.32-92.75,38.4-143.37l-330.68,70.33v-135.2l292.27-62.11c20.06-44.47,33.32-92.75,38.4-143.37l-330.68,70.27V66.13c-50.67,28.45-95.67,66.32-132.25,110.99v403.35l-132.25,28.11V0c-50.67,28.44-95.67,66.32-132.25,110.99v525.69l-295.91,62.88c-20.06,44.47-33.33,92.75-38.42,143.37l334.33-71.05v170.26l-358.3,76.14c-20.06,44.47-33.32,92.75-38.4,143.37l375.04-79.7c30.53-6.35,56.77-24.4,73.83-49.24l68.78-101.97v-.02c7.14-10.55,11.3-23.27,11.3-36.97v-149.98l132.25-28.11v270.4l424.53-90.28Z"/>'
    '</svg>';

/// Renders the platform's default-currency symbol (admin-managed via
/// `GET /settings/currencies`), watching [currencySymbolProvider] so a change
/// of default currency updates every money display. For the Saudi Riyal it
/// draws the official symbol as SVG (the U+20C1 sign lacks font coverage);
/// any other currency renders its text symbol.
///
/// Use it in place of a hardcoded symbol `Text` next to a `money()` figure.
class CurrencySymbol extends ConsumerWidget {
  const CurrencySymbol({super.key, this.style});

  final TextStyle? style;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final symbol = ref.watch(currencySymbolProvider);
    if (symbol == kRiyalSymbol) {
      final resolved = DefaultTextStyle.of(context).style.merge(style);
      final size = (resolved.fontSize ?? 14) * 0.9;
      final color = resolved.color ?? Colors.black;
      return SvgPicture.string(
        _kRiyalSvg,
        height: size,
        colorFilter: ColorFilter.mode(color, BlendMode.srcIn),
      );
    }
    return Text(symbol, style: style);
  }
}
