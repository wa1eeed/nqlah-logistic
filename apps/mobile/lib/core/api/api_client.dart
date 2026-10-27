import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'api_config.dart';
import 'token_store.dart';

/// Signals that the session is no longer valid (refresh failed / revoked).
/// The auth controller listens for this to drop to the unauthenticated state.
typedef OnSessionExpired = void Function();

/// Builds the app's single [Dio] instance: base URL + JSON defaults, a Bearer
/// interceptor that attaches the stored access token, and transparent
/// refresh-token renewal on `401`.
class ApiClient {
  ApiClient(this._tokens, {OnSessionExpired? onSessionExpired})
      : dio = Dio(BaseOptions(
          baseUrl: ApiConfig.baseUrl,
          connectTimeout: ApiConfig.connectTimeout,
          receiveTimeout: ApiConfig.receiveTimeout,
          contentType: 'application/json',
          // We parse non-2xx ourselves (interceptor + ApiException).
          validateStatus: (s) => s != null && s < 500,
        )) {
    // A separate bare client for /auth/refresh so renewal can't recurse
    // through this interceptor.
    _refreshDio = Dio(BaseOptions(
      baseUrl: ApiConfig.baseUrl,
      connectTimeout: ApiConfig.connectTimeout,
      receiveTimeout: ApiConfig.receiveTimeout,
      contentType: 'application/json',
    ));
    _onSessionExpired = onSessionExpired;
    dio.interceptors.add(QueuedInterceptorsWrapper(
      onRequest: _onRequest,
      onResponse: _onResponse,
    ));
  }

  final TokenStore _tokens;
  final Dio dio;
  late final Dio _refreshDio;
  OnSessionExpired? _onSessionExpired;

  Future<void> _onRequest(
      RequestOptions options, RequestInterceptorHandler handler) async {
    if (options.extra['noAuth'] != true) {
      final token = await _tokens.readAccess();
      if (token != null) options.headers['Authorization'] = 'Bearer $token';
    }
    handler.next(options);
  }

  Future<void> _onResponse(
      Response response, ResponseInterceptorHandler handler) async {
    final req = response.requestOptions;
    final renewable = response.statusCode == 401 &&
        req.extra['noAuth'] != true &&
        req.extra['retried'] != true;
    if (!renewable) {
      handler.next(response);
      return;
    }
    final renewed = await _tryRefresh();
    if (!renewed) {
      _onSessionExpired?.call();
      handler.next(response);
      return;
    }
    // Replay the original request once with the fresh token.
    final token = await _tokens.readAccess();
    final opts = Options(
      method: req.method,
      headers: {...req.headers, 'Authorization': 'Bearer $token'},
      extra: {...req.extra, 'retried': true},
      responseType: req.responseType,
      contentType: req.contentType,
    );
    try {
      final retry = await dio.request(
        req.path,
        data: req.data,
        queryParameters: req.queryParameters,
        options: opts,
      );
      handler.resolve(retry);
    } on DioException catch (e) {
      handler.reject(e);
    }
  }

  Future<bool> _tryRefresh() async {
    final refresh = await _tokens.readRefresh();
    if (refresh == null) return false;
    try {
      final res = await _refreshDio.post<Map<String, dynamic>>(
        '/auth/refresh',
        data: {'refreshToken': refresh},
      );
      final data = res.data;
      if (res.statusCode == 200 && data != null && data['accessToken'] != null) {
        await _tokens.save(
          access: data['accessToken'] as String,
          refresh: (data['refreshToken'] ?? refresh) as String,
        );
        return true;
      }
    } catch (_) {
      // fall through
    }
    await _tokens.clear();
    return false;
  }
}

/// A settable sink the client calls when the session expires. The auth
/// controller installs its handler here, decoupling the client from it.
class SessionExpirySink {
  OnSessionExpired? handler;
  void call() => handler?.call();
}

final sessionExpirySinkProvider = Provider<SessionExpirySink>((_) => SessionExpirySink());

/// The app-wide API client.
final apiClientProvider = Provider<ApiClient>((ref) {
  final tokens = ref.watch(tokenStoreProvider);
  final sink = ref.watch(sessionExpirySinkProvider);
  return ApiClient(tokens, onSessionExpired: sink.call);
});
