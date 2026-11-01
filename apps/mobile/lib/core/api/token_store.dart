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

  Future<String?> readAccess() => _storage.read(key: _kAccess);
  Future<String?> readRefresh() => _storage.read(key: _kRefresh);

  Future<void> save({required String access, required String refresh}) async {
    await _storage.write(key: _kAccess, value: access);
    await _storage.write(key: _kRefresh, value: refresh);
  }

  Future<void> saveAccess(String access) =>
      _storage.write(key: _kAccess, value: access);

  Future<void> clear() async {
    await _storage.delete(key: _kAccess);
    await _storage.delete(key: _kRefresh);
  }
}

final tokenStoreProvider = Provider<TokenStore>((ref) {
  // flutter_secure_storage 11.x encrypts on Android by default (the old
  // `encryptedSharedPreferences` flag was removed), so no options are needed.
  return TokenStore(const FlutterSecureStorage());
});
