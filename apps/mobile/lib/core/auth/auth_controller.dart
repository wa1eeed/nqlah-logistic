import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/api_client.dart';
import '../api/api_exception.dart';
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

  /// Restores a session on launch. Hydrates the shell with the cached user
  /// snapshot *immediately* (so it mounts with the correct identity — no flash
  /// of the default shell, no cold-start wait), then revalidates with the
  /// server in the background. A transient failure (network/5xx/timeout) keeps
  /// the cached session; only a real auth rejection (401/403) ends it.
  Future<void> _bootstrap() async {
    final tokens = ref.read(tokenStoreProvider);
    // Guard the keychain read: the FIRST secure-storage access right after a
    // fresh install can throw before the keychain is ready. Unguarded, that
    // left the state at `unknown` forever (the launch splash never cleared —
    // the app "stuck on loading" until a manual restart). On any failure we
    // resolve to unauthenticated so the app always opens on the first try.
    String? access;
    try {
      access = await tokens.readAccess();
    } catch (_) {
      state = AuthState.unauthenticated;
      return;
    }
    if (access == null) {
      state = AuthState.unauthenticated;
      return;
    }
    // 1. Instant restore from the cached snapshot.
    String? cachedJson;
    try {
      cachedJson = await tokens.readUser();
    } catch (_) {/* keychain hiccup — fall through to server revalidation */}
    if (cachedJson != null) {
      try {
        final cached = AuthUser.fromJson(
            Map<String, dynamic>.from(jsonDecode(cachedJson) as Map));
        state = AuthState(AuthStatus.authenticated, user: cached);
      } catch (_) {/* ignore a corrupt snapshot — revalidation covers it */}
    }
    // 2. Revalidate + refresh the snapshot in the background.
    try {
      final user = await ref.read(authRepositoryProvider).me();
      await tokens.saveUser(jsonEncode(user.toJson()));
      state = AuthState(AuthStatus.authenticated, user: user);
    } on ApiException catch (e) {
      if (e.statusCode == 401 || e.statusCode == 403) {
        // Token genuinely rejected (even after refresh) — end the session.
        await tokens.clear();
        state = AuthState.unauthenticated;
      } else if (state.status == AuthStatus.unknown) {
        // Couldn't reach the server and we have no cache to fall back on:
        // send the user to login rather than hang. (A cached session stays.)
        state = AuthState.unauthenticated;
      }
      // Otherwise keep the cached authenticated session.
    } catch (_) {
      if (state.status == AuthStatus.unknown) {
        state = AuthState.unauthenticated;
      }
    }
  }

  /// Signs in with a phone (local digits) or email + password. Throws
  /// [ApiException] on failure so the caller can surface the message.
  Future<AuthUser> login(String identifier, String password) async {
    final session = await ref
        .read(authRepositoryProvider)
        .login(identifier: identifier.trim(), password: password);
    final user = await _hydrateFullUser(session.user);
    await _setAuthenticated(user);
    return user;
  }

  /// The login / OTP response is a *lean* user — it carries no `isOwnerDriver`
  /// flag and no embedded company. Only `/users/me` computes those. Fetch it
  /// right after authenticating so the very first post-login session already
  /// has the correct identity: the owner-driver (مزوّد⇄سائق) switch appears,
  /// and the account screen shows the real company instead of a placeholder.
  /// Without this the shell was only correct after an app restart (which runs
  /// `_bootstrap` → `me()`). Falls back to the lean user if `me()` is briefly
  /// unreachable.
  Future<AuthUser> _hydrateFullUser(AuthUser fallback) async {
    try {
      return await ref.read(authRepositoryProvider).me();
    } catch (_) {
      return fallback;
    }
  }

  /// Sets the authenticated state and caches the user snapshot for instant
  /// restore on the next launch.
  Future<void> _setAuthenticated(AuthUser user) async {
    state = AuthState(AuthStatus.authenticated, user: user);
    try {
      await ref.read(tokenStoreProvider).saveUser(jsonEncode(user.toJson()));
    } catch (_) {/* caching is best-effort */}
  }

  /// Request a one-time login code for [phone] (reuses send-otp).
  Future<void> requestLoginOtp(String phone) =>
      ref.read(authRepositoryProvider).sendOtp(phone);

  /// Passwordless login with the OTP [code] sent to [phone].
  Future<AuthUser> loginWithOtp(String phone, String code) async {
    final session =
        await ref.read(authRepositoryProvider).loginWithOtp(phone, code);
    final user = await _hydrateFullUser(session.user);
    await _setAuthenticated(user);
    return user;
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
