import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/api_client.dart';
import 'format.dart';

/// One enabled currency, mirroring the web dashboards' shape.
class Currency {
  const Currency({
    required this.code,
    required this.symbol,
    required this.nameAr,
    required this.nameEn,
    this.decimals = 2,
  });

  final String code;
  final String symbol;
  final String nameAr;
  final String nameEn;
  final int decimals;

  /// The Saudi Riyal with its official U+20C1 sign — the platform default and
  /// the fallback used until `GET /settings/currencies` resolves (or if it's
  /// unavailable), so money always renders with the correct symbol.
  static const sar = Currency(
    code: 'SAR',
    symbol: kRiyalSymbol,
    nameAr: 'ريال سعودي',
    nameEn: 'Saudi Riyal',
    decimals: 2,
  );

  factory Currency.fromJson(Map<String, dynamic> j) => Currency(
        code: (j['code'] ?? 'SAR').toString(),
        symbol: (j['symbol'] ?? kRiyalSymbol).toString(),
        nameAr: (j['nameAr'] ?? '').toString(),
        nameEn: (j['nameEn'] ?? '').toString(),
        decimals: (j['decimals'] is num) ? (j['decimals'] as num).toInt() : 2,
      );
}

/// The platform's default currency (admin-managed via Settings → Currencies),
/// resolved from the public `GET /settings/currencies`. Falls back to SAR, so
/// the UI always has a symbol to render.
final defaultCurrencyProvider = FutureProvider<Currency>((ref) async {
  final dio = ref.watch(apiClientProvider).dio;
  try {
    final res = await dio.get<dynamic>('/settings/currencies',
        options: Options(extra: {'noAuth': true}));
    final data = res.data;
    if (data is Map) {
      final list = data['currencies'];
      final def = (data['defaultCurrencyCode'] ?? 'SAR').toString();
      if (list is List && list.isNotEmpty) {
        final currencies = list
            .whereType<Map>()
            .map((e) => Currency.fromJson(Map<String, dynamic>.from(e)))
            .toList();
        return currencies.firstWhere(
          (c) => c.code == def,
          orElse: () => currencies.first,
        );
      }
    }
  } catch (_) {/* fall back to SAR / U+20C1 */}
  return Currency.sar;
});

/// The default currency's symbol, ready to render in a `Text`. Returns the
/// U+20C1 Riyal sign until the provider resolves, so there's never a flash of
/// the wrong (or missing) symbol.
final currencySymbolProvider = Provider<String>((ref) {
  return ref.watch(defaultCurrencyProvider).maybeWhen(
        data: (c) => c.symbol,
        orElse: () => Currency.sar.symbol,
      );
});
