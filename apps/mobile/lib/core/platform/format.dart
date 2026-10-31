import 'package:intl/intl.dart';

/// The official new Saudi Riyal sign (Unicode codepoint U+20C1). Use this
/// wherever the SAR label is shown instead of the old «ر.س» abbreviation.
const String kRiyalSymbol = '⃁';

final NumberFormat _money2 = NumberFormat('#,##0.00', 'en');
final NumberFormat _money0 = NumberFormat('#,##0', 'en');

/// Thousands-separated amount, e.g. `370507` → `"370,507.00"`. Keeps Latin
/// digits (we render them LTR). Use for every money value so large amounts stay
/// readable and consistent with the design.
String money(num v, {int decimals = 2}) =>
    (decimals == 0 ? _money0 : _money2).format(v);

/// Money with a trailing currency symbol, e.g. `money(370507, symbol: 'ﻼ')`
/// → `"370,507.00 ﻼ"`. The symbol comes from the admin-managed default
/// currency (see `currencySymbolProvider`); pass the Riyal sign by default.
/// The amount stays LTR via [money]; the symbol is appended for one-shot
/// strings (toasts, confirm messages). In widgets, prefer a separate symbol
/// `Text` so it can be styled.
String moneyWithSymbol(num v, {String symbol = kRiyalSymbol, int decimals = 2}) =>
    '${money(v, decimals: decimals)} $symbol';

/// Thousands-separated integer, e.g. `12500` → `"12,500"`.
String count(num v) => _money0.format(v);

/// Compact form for very tight spaces, e.g. `1250000` → `"1.25M"`.
String moneyCompact(num v) => NumberFormat.compact(locale: 'en').format(v);
