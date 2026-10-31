import 'package:intl/intl.dart';

final NumberFormat _money2 = NumberFormat('#,##0.00', 'en');
final NumberFormat _money0 = NumberFormat('#,##0', 'en');

/// Thousands-separated amount, e.g. `370507` → `"370,507.00"`. Keeps Latin
/// digits (we render them LTR). Use for every money value so large amounts stay
/// readable and consistent with the design.
String money(num v, {int decimals = 2}) =>
    (decimals == 0 ? _money0 : _money2).format(v);

/// Thousands-separated integer, e.g. `12500` → `"12,500"`.
String count(num v) => _money0.format(v);

/// Compact form for very tight spaces, e.g. `1250000` → `"1.25M"`.
String moneyCompact(num v) => NumberFormat.compact(locale: 'en').format(v);
