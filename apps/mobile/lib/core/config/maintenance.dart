import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/api_client.dart';

/// Platform maintenance state, read from the public `GET /settings/app` (which
/// the API keeps reachable during maintenance).
class Maintenance {
  const Maintenance({
    this.enabled = false,
    this.messageAr = '',
    this.messageEn = '',
  });

  final bool enabled;
  final String messageAr;
  final String messageEn;

  static const Maintenance off = Maintenance();

  factory Maintenance.fromJson(Map<String, dynamic> j) => Maintenance(
        enabled: j['enabled'] == true,
        messageAr: (j['messageAr'] ?? '').toString(),
        messageEn: (j['messageEn'] ?? '').toString(),
      );
}

/// Polls the maintenance flag every 30s so the app both enters maintenance and
/// leaves it on its own once the admin turns it off. Fails to "off" so the app
/// never locks itself out on a read error.
final maintenanceConfigProvider = StreamProvider<Maintenance>((ref) async* {
  final dio = ref.watch(apiClientProvider).dio;

  Future<Maintenance> fetch() async {
    try {
      final res = await dio.get<dynamic>('/settings/app',
          options: Options(extra: {'noAuth': true}));
      final data = res.data;
      if (data is Map && data['maintenance'] is Map) {
        return Maintenance.fromJson(
            Map<String, dynamic>.from(data['maintenance'] as Map));
      }
    } catch (_) {/* fall back to off */}
    return Maintenance.off;
  }

  yield await fetch();
  while (true) {
    await Future<void>.delayed(const Duration(seconds: 30));
    yield await fetch();
  }
});

/// The current maintenance state (off until the first fetch resolves / on error).
final maintenanceProvider = Provider<Maintenance>((ref) {
  return ref.watch(maintenanceConfigProvider).valueOrNull ?? Maintenance.off;
});
