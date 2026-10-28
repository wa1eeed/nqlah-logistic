import 'dart:async';

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'notifications_repository.dart';

/// Background / terminated-isolate handler. Must be a top-level entry-point.
/// The OS renders the `notification` payload itself while the app is not in the
/// foreground, so this only ensures Firebase is ready for any data processing.
@pragma('vm:entry-point')
Future<void> firebasePushBackgroundHandler(RemoteMessage message) async {
  try {
    await Firebase.initializeApp();
  } catch (_) {/* no-op */}
}

/// Called when the user taps a notification (opened from background/terminated).
typedef PushNavigate = void Function(Map<String, dynamic> data);

/// Called for a message received while the app is in the foreground.
typedef PushForeground = void Function(RemoteMessage message);

/// Owns the device's push lifecycle: initialises Firebase, registers the FCM
/// token with the backend (`/notifications/devices`), and routes foreground /
/// tapped messages. Degrades gracefully — on web, and before a Firebase project
/// is provisioned (no `google-services.json` / `GoogleService-Info.plist`), it
/// is a safe no-op and the app runs normally with in-app notifications only.
class PushService {
  PushService(this._repo);
  final NotificationsRepository _repo;

  bool _ready = false;
  String? _token;
  StreamSubscription<String>? _tokenRefreshSub;
  StreamSubscription<RemoteMessage>? _onMessageSub;
  StreamSubscription<RemoteMessage>? _onOpenedSub;

  PushNavigate? onNavigate;
  PushForeground? onForeground;

  /// Initialise Firebase (once) and register the current device token for the
  /// signed-in user. Safe to call repeatedly.
  Future<void> start() async {
    if (kIsWeb) return; // push targets native iOS / Android only
    if (!_ready) {
      try {
        await Firebase.initializeApp();
      } catch (e) {
        // No native Firebase config yet — stay inert.
        if (kDebugMode) debugPrint('Push: Firebase not configured — $e');
        return;
      }
      FirebaseMessaging.onBackgroundMessage(firebasePushBackgroundHandler);
      _ready = true;
    }

    final messaging = FirebaseMessaging.instance;
    try {
      await messaging.requestPermission();
      await messaging.setForegroundNotificationPresentationOptions(
        alert: true,
        badge: true,
        sound: true,
      );

      // We intentionally use the classic FCM *registration token* (not the new
      // FID from register()/onRegistered): our backend FcmNotificationConnector
      // delivers via FCM HTTP v1 `message.token`, whose target is exactly this
      // registration token. getToken()/onTokenRefresh remain fully functional.
      // ignore: deprecated_member_use
      _token = await messaging.getToken();
      if (_token != null) await _repo.registerDevice(_token!, _platform());

      // ignore: deprecated_member_use
      _tokenRefreshSub ??= messaging.onTokenRefresh.listen((t) {
        _token = t;
        _repo.registerDevice(t, _platform());
      });
      _onMessageSub ??= FirebaseMessaging.onMessage.listen((m) {
        onForeground?.call(m);
      });
      _onOpenedSub ??= FirebaseMessaging.onMessageOpenedApp.listen((m) {
        onNavigate?.call(_data(m));
      });

      // Cold start from a tapped notification.
      final initial = await messaging.getInitialMessage();
      if (initial != null) onNavigate?.call(_data(initial));
    } catch (e) {
      if (kDebugMode) debugPrint('Push: start failed — $e');
    }
  }

  /// Unregister this device (on logout). Keeps Firebase initialised so a
  /// subsequent login can re-register without re-init.
  Future<void> stop() async {
    final token = _token;
    _token = null;
    if (token != null) await _repo.unregisterDevice(token);
    try {
      // ignore: deprecated_member_use
      if (_ready && !kIsWeb) await FirebaseMessaging.instance.deleteToken();
    } catch (_) {/* no-op */}
  }

  String _platform() {
    switch (defaultTargetPlatform) {
      case TargetPlatform.iOS:
        return 'ios';
      case TargetPlatform.android:
        return 'android';
      default:
        return 'android';
    }
  }

  Map<String, dynamic> _data(RemoteMessage m) =>
      m.data.map((k, v) => MapEntry(k, v));
}

final pushServiceProvider = Provider<PushService>((ref) {
  return PushService(ref.watch(notificationsRepositoryProvider));
});
