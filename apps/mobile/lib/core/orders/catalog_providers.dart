import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/api_client.dart';
import '../i18n/app_strings.dart';
import '../i18n/locale_controller.dart';
import 'order_draft_controller.dart' show Opt, truckOptions, cargoOptions;

/// Live platform catalogs (truck + cargo types) from the admin-managed
/// `/settings/catalogs`. The order wizard and filters read these at runtime, so
/// an admin adding or editing a type appears in the app WITHOUT an app-store
/// update. Falls back to the bundled defaults when the endpoint has none, is
/// empty, or errors — the app always has something to show offline.
final catalogsProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  final dio = ref.watch(apiClientProvider).dio;
  try {
    final res = await dio.get<dynamic>(
      '/settings/catalogs',
      options: Options(extra: {'noAuth': true}),
    );
    final data = res.data;
    return data is Map ? Map<String, dynamic>.from(data) : const {};
  } catch (_) {
    return const {};
  }
});

/// Map a catalog array of `{id/value, nameAr, nameEn, active}` records to the
/// picker `Opt` shape, honouring the active flag and the current locale. Any
/// malformed/empty result falls back to [fallback].
List<Opt> _toOpts(dynamic raw, bool en, List<Opt> fallback) {
  if (raw is! List || raw.isEmpty) return fallback;
  final opts = <Opt>[];
  for (final e in raw) {
    if (e is! Map) continue;
    if (e['active'] == false) continue;
    final value = (e['id'] ?? e['value'] ?? '').toString();
    if (value.isEmpty) continue;
    final label =
        ((en ? e['nameEn'] : e['nameAr']) ?? e['nameAr'] ?? e['label'] ?? value)
            .toString();
    opts.add((value: value, label: label));
  }
  return opts.isEmpty ? fallback : opts;
}

/// Truck types for pickers/filters — live from the admin catalog, else defaults.
final truckOptionsProvider = Provider<List<Opt>>((ref) {
  final en = ref.watch(localeControllerProvider) == AppLang.en;
  final cat = ref.watch(catalogsProvider).valueOrNull;
  return _toOpts(cat?['truckTypes'], en, truckOptions);
});

/// Cargo types for pickers — live from the admin catalog, else defaults.
final cargoOptionsProvider = Provider<List<Opt>>((ref) {
  final en = ref.watch(localeControllerProvider) == AppLang.en;
  final cat = ref.watch(catalogsProvider).valueOrNull;
  return _toOpts(cat?['cargoTypes'], en, cargoOptions);
});

/// Resolve the display label for a stored type [value] against the live
/// [opts]; when the value isn't in the catalog (e.g. a legacy id), [fallback]
/// provides the bundled label so nothing ever renders blank.
String labelFor(List<Opt> opts, String? value, String Function(String?) fallback) {
  for (final o in opts) {
    if (o.value == value) return o.label;
  }
  return fallback(value);
}
