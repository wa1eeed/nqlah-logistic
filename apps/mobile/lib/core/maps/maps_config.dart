import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/api_client.dart';

/// Client-facing maps config, resolved from the Integration Hub via
/// `GET /config/maps`. The raster [tileUrl] drives the flutter_map renderer, so
/// the provider can be switched from the admin console with no app update.
class MapsConfig {
  const MapsConfig({
    required this.provider,
    required this.tileUrl,
    required this.attribution,
    this.maxZoom = 19,
  });

  final String provider;
  final String tileUrl;
  final String attribution;
  final double maxZoom;

  static const fallback = MapsConfig(
    provider: 'maplibre',
    tileUrl: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors',
  );

  factory MapsConfig.fromJson(Map<String, dynamic> j) => MapsConfig(
        provider: (j['provider'] ?? 'maplibre').toString(),
        tileUrl: (j['tileUrl'] ?? fallback.tileUrl).toString(),
        attribution: (j['attribution'] ?? fallback.attribution).toString(),
        maxZoom: (j['maxZoom'] as num?)?.toDouble() ?? 19,
      );
}

/// Fetches + caches the maps config (public endpoint, no auth needed). Falls
/// back to free OSM if the request fails, so the map always renders.
final mapsConfigProvider = FutureProvider<MapsConfig>((ref) async {
  final dio = ref.watch(apiClientProvider).dio;
  try {
    final res = await dio.get<dynamic>('/config/maps',
        options: Options(extra: {'noAuth': true}));
    final data = res.data;
    if (data is Map) return MapsConfig.fromJson(Map<String, dynamic>.from(data));
  } catch (_) {/* fall back to OSM */}
  return MapsConfig.fallback;
});
