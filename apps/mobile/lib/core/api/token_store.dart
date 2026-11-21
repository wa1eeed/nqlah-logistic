import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Persists the auth tokens in the platform's secure store (Keychain /
/// Keystore; an encrypted backend on web). Everything auth-related reads and
/// writes tokens only through here.
class TokenStore {
  TokenStore(this._storage);

  final FlutterSecureStorage _storage;

  static const _kAccess = 'nq_access_token';
  static const _kRefresh = 'nq_refresh_token';
  // A minimal JSON snapshot of the signed-in user, kept so the app can restore
  // the correct identity instantly on launch (before `/users/me` resolves).
  static const _kUser = 'nq_user';

  Future<String?> readAccess() => _storage.read(key: _kAccess);
  Future<String?> readRefresh() => _storage.read(key: _kRefresh);

  Future<void> save({required String access, required String refresh}) async {
    await _storage.write(key: _kAccess, value: access);
    await _storage.write(key: _kRefresh, value: refresh);
  }

  Future<void> saveAccess(String access) =>
      _storage.write(key: _kAccess, value: access);

  /// The cached user snapshot (JSON string), or null if none is stored.
  Future<String?> readUser() => _storage.read(key: _kUser);
  Future<void> saveUser(String json) =>
      _storage.write(key: _kUser, value: json);

  Future<void> clear() async {
    await _storage.delete(key: _kAccess);
    await _storage.delete(key: _kRefresh);
    await _storage.delete(key: _kUser);
  }
}

final tokenStoreProvider = Provider<TokenStore>((ref) {
  // flutter_secure_storage 11.x encrypts on Android by default (the old
  // `encryptedSharedPreferences` flag was removed), so no options are needed.
  return TokenStore(const FlutterSecureStorage());
});
