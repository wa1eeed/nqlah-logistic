import 'package:flutter/material.dart';

import '../platform/format.dart';
import 'currency_symbol.dart';

/// Renders a string that may contain the Saudi Riyal sign (U+20C1). That sign
/// has no font coverage, so each literal occurrence is replaced inline with the
/// [CurrencySymbol] SVG (which also honours the admin-configured currency).
/// With no riyal sign present it renders as a plain [Text], so it is a safe
/// drop-in for any price/amount label or sentence that embeds the symbol.
class RiyalText extends StatelessWidget {
  const RiyalText(
    this.text, {
    super.key,
    this.style,
    this.textAlign,
    this.maxLines,
    this.overflow,
    this.ltr = false,
  });

  final String text;
  final TextStyle? style;
  final TextAlign? textAlign;
  final int? maxLines;
  final TextOverflow? overflow;

  /// Force left-to-right (for a bare "number ﷼" that should read LTR in an
  /// otherwise RTL screen).
  final bool ltr;

  @override
  Widget build(BuildContext context) {
    final dir = ltr ? TextDirection.ltr : null;
    if (!text.contains(kRiyalSymbol)) {
      return Text(text,
          style: style,
          textAlign: textAlign,
          maxLines: maxLines,
          overflow: overflow,
          textDirection: dir);
    }
    final parts = text.split(kRiyalSymbol);
    final spans = <InlineSpan>[];
    for (var i = 0; i < parts.length; i++) {
      if (parts[i].isNotEmpty) spans.add(TextSpan(text: parts[i]));
      if (i < parts.length - 1) {
        spans.add(WidgetSpan(
          alignment: PlaceholderAlignment.middle,
          child: CurrencySymbol(style: style),
        ));
      }
    }
    return Text.rich(
      TextSpan(style: style, children: spans),
      textAlign: textAlign,
      maxLines: maxLines,
      overflow: overflow,
      textDirection: dir,
    );
  }
}
