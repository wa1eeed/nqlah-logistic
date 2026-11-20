import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:package_info_plus/package_info_plus.dart';

import '../api/api_client.dart';

/// How the running build compares to the admin's minimum supported version.
enum UpdateRequirement {
  /// Up to date (or no minimum configured) — nothing to show.
  none,

  /// Below the minimum but not forced — show a dismissible "update available"
  /// prompt the user can skip for this session.
  soft,

  /// Below the minimum and forced — block the app until the user updates.
  forced,
}

/// Soft-update policy, read from the public `GET /settings/app` (`update`
/// section, set by the admin's "Update policy" card). Lets us ship over-the-air
/// style version gating without forcing a store update for every release.
class AppUpdate {
  const AppUpdate({
    this.minSupportedVersion = '',
    this.forceUpdate = false,
    this.messageAr = '',
    this.messageEn = '',
  });

  /// The lowest build the platform still accepts, e.g. "1.2.0". Empty disables.
  final String minSupportedVersion;

  /// When true, a build below [minSupportedVersion] is blocked (not skippable).
  final bool forceUpdate;
  final String messageAr;
  final String messageEn;

  static const AppUpdate none = AppUpdate();

  factory AppUpdate.fromJson(Map<String, dynamic> j) => AppUpdate(
        minSupportedVersion: (j['minSupportedVersion'] ?? '').toString(),
        forceUpdate: j['forceUpdate'] == true,
        messageAr: (j['messageAr'] ?? '').toString(),
        messageEn: (j['messageEn'] ?? '').toString(),
      );
}

/// The running build's version (e.g. "1.0.0"), from the native bundle.
final currentAppVersionProvider = FutureProvider<String>((ref) async {
  try {
    final info = await PackageInfo.fromPlatform();
    return info.version;
  } catch (_) {
    return '';
  }
});

/// Fetches the update policy once at startup. A one-shot (not a poller):
/// enforcing a new minimum on the next launch/resume is the right UX — yanking
/// an active session mid-task is not. Fails to [AppUpdate.none] so a read error
/// never locks the app.
final appUpdateConfigProvider = FutureProvider<AppUpdate>((ref) async {
  final dio = ref.watch(apiClientProvider).dio;
  try {
    final res = await dio.get<dynamic>('/settings/app',
        options: Options(extra: {'noAuth': true}));
    final data = res.data;
    if (data is Map && data['update'] is Map) {
      return AppUpdate.fromJson(Map<String, dynamic>.from(data['update'] as Map));
    }
  } catch (_) {/* fall back to none */}
  return AppUpdate.none;
});

/// Resolves what (if anything) to show the user. Web is always current (it
/// serves the latest build), so it never gates.
final updateRequirementProvider = Provider<UpdateRequirement>((ref) {
  // Web always serves the latest build, so it never gates.
  if (kIsWeb) return UpdateRequirement.none;
  final cfg = ref.watch(appUpdateConfigProvider).valueOrNull ?? AppUpdate.none;
  final current = ref.watch(currentAppVersionProvider).valueOrNull ?? '';
  if (cfg.minSupportedVersion.trim().isEmpty || current.isEmpty) {
    return UpdateRequirement.none;
  }
  if (!_isBelow(current, cfg.minSupportedVersion)) return UpdateRequirement.none;
  return cfg.forceUpdate ? UpdateRequirement.forced : UpdateRequirement.soft;
});

/// The active update policy (for messages/links in the update screen).
final appUpdateProvider = Provider<AppUpdate>((ref) =>
    ref.watch(appUpdateConfigProvider).valueOrNull ?? AppUpdate.none);

/// Compares dotted numeric versions ("1.2.0" vs "1.10.0") part by part. A build
/// suffix ("1.0.0+3") is ignored. Returns true when [version] < [minimum].
bool _isBelow(String version, String minimum) {
  final a = _parts(version);
  final b = _parts(minimum);
  final n = a.length > b.length ? a.length : b.length;
  for (var i = 0; i < n; i++) {
    final x = i < a.length ? a[i] : 0;
    final y = i < b.length ? b[i] : 0;
    if (x != y) return x < y;
  }
  return false; // equal
}

List<int> _parts(String v) => v
    .split('+')
    .first
    .split('.')
    .map((p) => int.tryParse(p.trim()) ?? 0)
    .toList();
