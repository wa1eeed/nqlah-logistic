import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../platform/currency.dart';

/// Renders the platform's default-currency symbol (admin-managed via
/// `GET /settings/currencies`), watching [currencySymbolProvider] so a change
/// of default currency updates every money display. Shows the official U+20C1
/// Saudi Riyal sign until the endpoint resolves, or if it's unavailable.
///
/// Use it in place of a hardcoded symbol `Text` next to a `money()` figure.
class CurrencySymbol extends ConsumerWidget {
  const CurrencySymbol({super.key, this.style});

  final TextStyle? style;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Text(ref.watch(currencySymbolProvider), style: style);
  }
}
