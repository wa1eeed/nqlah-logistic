import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import 'app_strings.dart';

/// Holds the app's active language, persisted across launches. Defaults to
/// Arabic; the user changes it from the account screen's language picker.
class LocaleController extends StateNotifier<AppLang> {
  LocaleController(this._storage) : super(AppLang.ar) {
    _load();
  }

  final FlutterSecureStorage _storage;
  static const _key = 'nq_lang';

  Future<void> _load() async {
    try {
      final v = await _storage.read(key: _key);
      if (v != null) state = AppLangX.fromCode(v);
    } catch (_) {
      // Secure storage unavailable (e.g. web private mode) — keep the default.
    }
  }

  Future<void> set(AppLang lang) async {
    state = lang;
    try {
      await _storage.write(key: _key, value: lang.code);
    } catch (_) {/* best-effort persistence */}
  }
}

final localeControllerProvider =
    StateNotifierProvider<LocaleController, AppLang>((ref) {
  return LocaleController(const FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
  ));
});

/// The translation lookup for the active language. Widgets do
/// `final s = ref.watch(stringsProvider);` then `s('nav.home')`.
final stringsProvider = Provider<S>((ref) {
  return S(ref.watch(localeControllerProvider));
});
