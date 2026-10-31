import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/api_client.dart';

/// Platform branding (logo + names), resolved from `GET /settings/platform` —
/// the same public endpoint the web portals and the invoice PDF read. Lets the
/// logo be changed from the admin console with no app update.
class BrandingConfig {
  const BrandingConfig({
    this.logoUrl = '',
    this.logoUrlDark = '',
    this.nameAr = 'نقلة لوجيستك',
    this.nameEn = 'Naqla Logistics',
  });

  final String logoUrl;
  final String logoUrlDark;
  final String nameAr;
  final String nameEn;

  static const fallback = BrandingConfig();

  /// The logo URL to use for the given surface; dark falls back to the light
  /// logo, and an empty string means "no configured logo → draw the built-in".
  String logoFor({required bool onDark}) {
    if (onDark) return logoUrlDark.isNotEmpty ? logoUrlDark : logoUrl;
    return logoUrl;
  }

  factory BrandingConfig.fromJson(Map<String, dynamic> j) => BrandingConfig(
        logoUrl: (j['logoUrl'] ?? '').toString(),
        logoUrlDark: (j['logoUrlDark'] ?? '').toString(),
        nameAr: (j['nameAr'] ?? 'نقلة لوجيستك').toString(),
        nameEn: (j['nameEn'] ?? 'Naqla Logistics').toString(),
      );
}

/// Fetches + caches platform branding (public endpoint, no auth). Falls back to
/// the built-in identity if the request fails, so the UI always renders.
final brandingConfigProvider = FutureProvider<BrandingConfig>((ref) async {
  final dio = ref.watch(apiClientProvider).dio;
  try {
    final res = await dio.get<dynamic>('/settings/platform',
        options: Options(extra: {'noAuth': true}));
    final data = res.data;
    if (data is Map) return BrandingConfig.fromJson(Map<String, dynamic>.from(data));
  } catch (_) {/* fall back to built-in identity */}
  return BrandingConfig.fallback;
});
