import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Tracks whether the one-time first-run flow (language choice + onboarding)
/// has been completed.
///
/// - `null`  → still loading from storage; the router holds position.
/// - `false` → first run: show the welcome (language) + onboarding flow.
/// - `true`  → already done: go straight into the app.
class FirstRunController extends StateNotifier<bool?> {
  FirstRunController(this._storage) : super(null) {
    _load();
  }

  final FlutterSecureStorage _storage;
  static const _key = 'nq_onboarded';

  Future<void> _load() async {
    try {
      state = (await _storage.read(key: _key)) == '1';
    } catch (_) {
      // Storage unavailable (e.g. web private mode) — treat as a fresh run.
      state = false;
    }
  }

  /// Mark the first-run flow complete and persist it (best-effort).
  Future<void> complete() async {
    state = true;
    try {
      await _storage.write(key: _key, value: '1');
    } catch (_) {/* best-effort persistence */}
  }
}

final firstRunProvider =
    StateNotifierProvider<FirstRunController, bool?>((ref) {
  // secure_storage 11.x encrypts on Android by default (no options needed).
  return FirstRunController(const FlutterSecureStorage());
});
