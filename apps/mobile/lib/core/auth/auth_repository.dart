import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/api_client.dart';
import '../api/api_exception.dart';
import '../api/token_store.dart';
import 'auth_models.dart';

/// Thin wrapper over the `/auth` and `/users/me` endpoints. Translates Dio
/// failures and non-2xx responses into [ApiException].
class AuthRepository {
  AuthRepository(this._client, this._tokens);

  final ApiClient _client;
  final TokenStore _tokens;

  Dio get _dio => _client.dio;

  /// `POST /auth/login` — [identifier] is a Saudi phone (local digits) or an
  /// email. On success persists the tokens and returns the session.
  Future<AuthSession> login({
    required String identifier,
    required String password,
  }) async {
    try {
      final res = await _dio.post<Map<String, dynamic>>(
        '/auth/login',
        data: {'phoneOrEmail': identifier, 'password': password},
        options: Options(extra: {'noAuth': true}),
      );
      _ensureOk(res);
      final session = AuthSession.fromJson(res.data!);
      await _tokens.save(
        access: session.accessToken,
        refresh: session.refreshToken,
      );
      return session;
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }

  /// `POST /auth/register` — creates the account and auto-sends a phone OTP.
  /// Returns the server payload (`{userId, verificationRequired, ...}`).
  Future<Map<String, dynamic>> register(Map<String, dynamic> body) async {
    try {
      final res = await _dio.post<Map<String, dynamic>>(
        '/auth/register',
        data: body,
        options: Options(extra: {'noAuth': true}),
      );
      _ensureOk(res);
      return res.data ?? const {};
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }

  /// `POST /auth/send-otp` — (re)sends the SMS OTP to [phone].
  Future<void> sendOtp(String phone) async {
    try {
      final res = await _dio.post(
        '/auth/send-otp',
        data: {'phone': phone.trim()},
        options: Options(extra: {'noAuth': true}),
      );
      _ensureOk(res);
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }

  /// `POST /auth/verify-phone` — confirms the OTP [code] for [phone].
  Future<void> verifyPhone(String phone, String code) async {
    try {
      final res = await _dio.post(
        '/auth/verify-phone',
        data: {'phone': phone.trim(), 'code': code},
        options: Options(extra: {'noAuth': true}),
      );
      _ensureOk(res);
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }

  /// `GET /users/me` — the current profile; used to restore a session on
  /// launch from a stored token.
  Future<AuthUser> me() async {
    try {
      final res = await _dio.get<Map<String, dynamic>>('/users/me');
      _ensureOk(res);
      return AuthUser.fromJson(res.data!);
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }

  /// `POST /auth/logout` then clears local tokens (best-effort — tokens are
  /// cleared even if the server call fails).
  Future<void> logout() async {
    final refresh = await _tokens.readRefresh();
    try {
      if (refresh != null) {
        await _dio.post('/auth/logout', data: {'refreshToken': refresh});
      }
    } catch (_) {
      // ignore — local clear below is what matters
    } finally {
      await _tokens.clear();
    }
  }

  void _ensureOk(Response res) {
    final code = res.statusCode ?? 0;
    if (code < 200 || code >= 300) {
      throw DioException(
        requestOptions: res.requestOptions,
        response: res,
        type: DioExceptionType.badResponse,
      );
    }
  }
}

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepository(
    ref.watch(apiClientProvider),
    ref.watch(tokenStoreProvider),
  );
});
