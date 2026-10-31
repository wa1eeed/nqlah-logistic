import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/api_client.dart';

/// Admin-managed Country → Region → City geography, from the public
/// `GET /settings/locations` feed. The registration (and later order) pickers
/// build cascading country → region → city dropdowns from this tree. Only
/// active rows are returned; a country/region with no children simply falls
/// back to free-text entry in the UI.
class LocCity {
  const LocCity(this.id, this.nameAr);
  final String id;
  final String nameAr;

  factory LocCity.fromJson(Map<String, dynamic> j) =>
      LocCity((j['id'] ?? '').toString(), (j['nameAr'] ?? '').toString());
}

class LocRegion {
  const LocRegion(this.id, this.nameAr, this.cities);
  final String id;
  final String nameAr;
  final List<LocCity> cities;

  factory LocRegion.fromJson(Map<String, dynamic> j) => LocRegion(
        (j['id'] ?? '').toString(),
        (j['nameAr'] ?? '').toString(),
        ((j['cities'] as List?) ?? const [])
            .whereType<Map>()
            .map((c) => LocCity.fromJson(c.cast<String, dynamic>()))
            .toList(),
      );
}

class LocCountry {
  const LocCountry(this.code, this.nameAr, this.regions);
  final String code; // ISO alpha-2 (uppercase)
  final String nameAr;
  final List<LocRegion> regions;

  factory LocCountry.fromJson(Map<String, dynamic> j) => LocCountry(
        (j['code'] ?? '').toString().toUpperCase(),
        (j['nameAr'] ?? '').toString(),
        ((j['regions'] as List?) ?? const [])
            .whereType<Map>()
            .map((r) => LocRegion.fromJson(r.cast<String, dynamic>()))
            .toList(),
      );
}

/// The whole geography tree plus cascade helpers keyed by ISO country code and
/// Arabic region name (the values stored on the registration draft).
class LocationsData {
  const LocationsData(this.countries);
  final List<LocCountry> countries;

  static const empty = LocationsData([]);

  LocCountry? country(String? code) {
    if (code == null) return null;
    final up = code.toUpperCase();
    for (final c in countries) {
      if (c.code == up) return c;
    }
    return null;
  }

  List<LocRegion> regionsFor(String? code) => country(code)?.regions ?? const [];

  List<LocCity> citiesFor(String? code, String? regionNameAr) {
    if (regionNameAr == null || regionNameAr.isEmpty) return const [];
    for (final r in regionsFor(code)) {
      if (r.nameAr == regionNameAr) return r.cities;
    }
    return const [];
  }
}

/// Loads the geography tree once (best-effort). On any failure returns an empty
/// tree so the UI degrades to free-text region/city rather than blocking signup.
final locationsProvider = FutureProvider<LocationsData>((ref) async {
  final dio = ref.watch(apiClientProvider).dio;
  try {
    final res = await dio.get<dynamic>('/settings/locations',
        options: Options(extra: {'noAuth': true}));
    final data = res.data;
    final list =
        (data is Map && data['countries'] is List) ? data['countries'] as List : const [];
    return LocationsData(list
        .whereType<Map>()
        .map((c) => LocCountry.fromJson(c.cast<String, dynamic>()))
        .toList());
  } catch (_) {
    return LocationsData.empty;
  }
});
