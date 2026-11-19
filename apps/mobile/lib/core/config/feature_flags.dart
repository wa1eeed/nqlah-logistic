import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/api_client.dart';

/// Server-driven feature flags, resolved from the public `GET /settings/app`
/// (`flags`). Lets a feature be turned on/off from the admin with no app
/// update. Unknown/missing keys fall back to the built-in defaults, so the UI
/// always has a sensible value — including before the fetch resolves or if it
/// fails.
class FeatureFlags {
  const FeatureFlags(this._values);

  final Map<String, bool> _values;

  /// The value of [key], or [fallback] (the registry default) when unset.
  bool call(String key, {bool fallback = true}) => _values[key] ?? fallback;

  /// Built-in defaults — mirror the API registry (feature-flags.ts).
  static const Map<String, bool> _defaults = {
    'inAppChat': true,
    'liveTracking': true,
    'promoBanner': false,
    'guestBrowsing': true,
  };

  static const FeatureFlags fallback = FeatureFlags(_defaults);

  factory FeatureFlags.fromJson(Map<String, dynamic> flags) {
    final out = <String, bool>{..._defaults};
    flags.forEach((k, v) {
      if (v is bool) out[k] = v;
    });
    return FeatureFlags(out);
  }
}

/// Fetches the flags (public endpoint, no auth). Falls back to defaults on error.
final featureFlagsProvider = FutureProvider<FeatureFlags>((ref) async {
  final dio = ref.watch(apiClientProvider).dio;
  try {
    final res = await dio.get<dynamic>('/settings/app',
        options: Options(extra: {'noAuth': true}));
    final data = res.data;
    if (data is Map && data['flags'] is Map) {
      return FeatureFlags.fromJson(Map<String, dynamic>.from(data['flags'] as Map));
    }
  } catch (_) {/* fall back to built-in defaults */}
  return FeatureFlags.fallback;
});

/// Watch a single flag, with the built-in default while loading / on error.
/// Usage: `if (ref.watch(featureFlagProvider('inAppChat'))) { … }`.
final featureFlagProvider = Provider.family<bool, String>((ref, key) {
  final async = ref.watch(featureFlagsProvider);
  final flags = async.valueOrNull ?? FeatureFlags.fallback;
  return flags(key);
});
