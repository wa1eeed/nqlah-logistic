import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/api_client.dart';
import 'countries.dart';

/// Best-effort country of the device, from `GET /settings/geo` (resolved from
/// the CDN/proxy IP headers server-side). Used to pre-select the phone country
/// code at registration. Falls back to the default country.
final geoCountryProvider = FutureProvider<Country>((ref) async {
  final dio = ref.watch(apiClientProvider).dio;
  try {
    final res = await dio.get<dynamic>('/settings/geo',
        options: Options(extra: {'noAuth': true}));
    final data = res.data;
    if (data is Map && data['country'] is String) {
      return countryByCode(data['country'] as String);
    }
  } catch (_) {/* fall back to default */}
  return countryByCode(kDefaultCountryCode);
});
