import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/api_client.dart';

/// The admin-managed Country → Region → City dataset, loaded from the PUBLIC
/// `GET /settings/locations` endpoint (PR #197). Drives the cascading location
/// pickers on the registration screen: pick a country → its regions → a
/// region's cities. Active rows only, pre-ordered server-side.
class LocationCity {
  const LocationCity(this.id, this.nameAr, this.nameEn);
  final String id;
  final String nameAr;
  final String nameEn;
}

class LocationRegion {
  const LocationRegion(this.id, this.nameAr, this.nameEn, this.cities);
  final String id;
  final String nameAr;
  final String nameEn;
  final List<LocationCity> cities;
}

class LocationCountry {
  const LocationCountry(
      this.id, this.code, this.nameAr, this.nameEn, this.dialCode, this.regions);
  final String id;
  final String code; // ISO alpha-2, UPPERCASE
  final String nameAr;
  final String nameEn;
  final String? dialCode;
  final List<LocationRegion> regions;
}

/// The parsed dataset plus cascade lookups keyed by ISO country code.
class LocationsData {
  const LocationsData(this.countries);
  final List<LocationCountry> countries;

  static const empty = LocationsData([]);

  LocationCountry? byCode(String? code) {
    if (code == null) return null;
    final up = code.toUpperCase();
    for (final c in countries) {
      if (c.code.toUpperCase() == up) return c;
    }
    return null;
  }

  /// Regions defined for [code]; empty when the country has none yet.
  List<LocationRegion> regionsFor(String? code) => byCode(code)?.regions ?? const [];

  /// Cities defined for a region (matched by its Arabic name) within [code].
  List<LocationCity> citiesFor(String? code, String? regionNameAr) {
    if (regionNameAr == null || regionNameAr.isEmpty) return const [];
    for (final r in regionsFor(code)) {
      if (r.nameAr == regionNameAr) return r.cities;
    }
    return const [];
  }
}

LocationsData _parse(dynamic data) {
  if (data is! Map) return LocationsData.empty;
  final raw = data['countries'];
  if (raw is! List) return LocationsData.empty;
  final countries = <LocationCountry>[];
  for (final c in raw.whereType<Map>()) {
    final regions = <LocationRegion>[];
    final rawRegions = c['regions'];
    if (rawRegions is List) {
      for (final r in rawRegions.whereType<Map>()) {
        final cities = <LocationCity>[];
        final rawCities = r['cities'];
        if (rawCities is List) {
          for (final ct in rawCities.whereType<Map>()) {
            cities.add(LocationCity(
              ct['id'].toString(),
              (ct['nameAr'] ?? '').toString(),
              (ct['nameEn'] ?? '').toString(),
            ));
          }
        }
        regions.add(LocationRegion(
          r['id'].toString(),
          (r['nameAr'] ?? '').toString(),
          (r['nameEn'] ?? '').toString(),
          cities,
        ));
      }
    }
    countries.add(LocationCountry(
      c['id'].toString(),
      (c['code'] ?? '').toString(),
      (c['nameAr'] ?? '').toString(),
      (c['nameEn'] ?? '').toString(),
      c['dialCode']?.toString(),
      regions,
    ));
  }
  return LocationsData(countries);
}

/// Loads `GET /settings/locations` once. On any failure returns an empty
/// dataset so registration falls back to free-text city rather than blocking.
final locationsProvider = FutureProvider<LocationsData>((ref) async {
  final dio = ref.watch(apiClientProvider).dio;
  try {
    final res = await dio.get<dynamic>('/settings/locations',
        options: Options(extra: {'noAuth': true}));
    return _parse(res.data);
  } catch (_) {
    return LocationsData.empty;
  }
});
