import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/api_client.dart';
import '../api/token_store.dart';
import 'auth_models.dart';
import 'auth_repository.dart';

enum AuthStatus { unknown, authenticated, unauthenticated }

/// Global authentication state, used by the router to gate the shell and by
/// screens to read the current user/identity.
@immutable
class AuthState {
  const AuthState(this.status, {this.user});

  final AuthStatus status;
  final AuthUser? user;

  bool get isAuthenticated => status == AuthStatus.authenticated;
  bool get isResolved => status != AuthStatus.unknown;

  static const unknown = AuthState(AuthStatus.unknown);
  static const unauthenticated = AuthState(AuthStatus.unauthenticated);
}

class AuthController extends Notifier<AuthState> {
  @override
  AuthState build() {
    // Let the API client drop us to unauthenticated when a refresh fails.
    ref.read(sessionExpirySinkProvider).handler = _onSessionExpired;
    _bootstrap();
    return AuthState.unknown;
  }

  /// Restores a session from a stored token on launch (or falls back to the
  /// login screen).
  Future<void> _bootstrap() async {
    final tokens = ref.read(tokenStoreProvider);
    final access = await tokens.readAccess();
    if (access == null) {
      state = AuthState.unauthenticated;
      return;
    }
    try {
      final user = await ref.read(authRepositoryProvider).me();
      state = AuthState(AuthStatus.authenticated, user: user);
    } catch (_) {
      await tokens.clear();
      state = AuthState.unauthenticated;
    }
  }

  /// Signs in with a phone (local digits) or email + password. Throws
  /// [ApiException] on failure so the caller can surface the message.
  Future<AuthUser> login(String identifier, String password) async {
    final session = await ref
        .read(authRepositoryProvider)
        .login(identifier: identifier.trim(), password: password);
    state = AuthState(AuthStatus.authenticated, user: session.user);
    return session.user;
  }

  /// Request a one-time login code for [phone] (reuses send-otp).
  Future<void> requestLoginOtp(String phone) =>
      ref.read(authRepositoryProvider).sendOtp(phone);

  /// Passwordless login with the OTP [code] sent to [phone].
  Future<AuthUser> loginWithOtp(String phone, String code) async {
    final session =
        await ref.read(authRepositoryProvider).loginWithOtp(phone, code);
    state = AuthState(AuthStatus.authenticated, user: session.user);
    return session.user;
  }

  Future<void> logout() async {
    await ref.read(authRepositoryProvider).logout();
    state = AuthState.unauthenticated;
  }

  void _onSessionExpired() {
    if (state.isAuthenticated) state = AuthState.unauthenticated;
  }
}

final authControllerProvider =
    NotifierProvider<AuthController, AuthState>(AuthController.new);
