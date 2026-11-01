import 'dart:async';

import 'package:flutter/foundation.dart' show kIsWeb, defaultTargetPlatform, TargetPlatform;
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';

import '../../core/realtime/realtime_service.dart';

/// Invisible widget that reports the driver's live GPS for [orderId] while the
/// trip screen is open. This is the ONLY source of the truck's position on the
/// tracking maps — there is no server-side simulation, so the truck moves only
/// when the device actually moves and stays put when parked.
///
/// **Cost-aware** (handoff): the OS stream only yields on ≥50 m movement
/// (`distanceFilter`), and we cap sends to one per [_minInterval] (30 s) — so a
/// fast truck doesn't burn map/API quota. One immediate fix is sent on start so
/// the truck appears at the real position right away. Emits over the realtime
/// socket (free), never directly to a paid maps API.
class DriverLocationBeacon extends ConsumerStatefulWidget {
  const DriverLocationBeacon({super.key, required this.orderId});

  final String orderId;

  @override
  ConsumerState<DriverLocationBeacon> createState() => _DriverLocationBeaconState();
}

class _DriverLocationBeaconState extends ConsumerState<DriverLocationBeacon> {
  static const _minInterval = Duration(seconds: 30);
  static const _distanceFilterM = 50;

  StreamSubscription<Position>? _sub;
  DateTime _lastSent = DateTime.fromMillisecondsSinceEpoch(0);

  @override
  void initState() {
    super.initState();
    _start();
  }

  Future<void> _start() async {
    // GPS reporting targets real driver devices (Android/iOS). Skip on web —
    // the web build is a preview and the browser geolocation flow would prompt
    // / hang needlessly.
    if (kIsWeb) return;
    try {
      if (!await Geolocator.isLocationServiceEnabled()) return;
      var perm = await Geolocator.checkPermission();
      if (perm == LocationPermission.denied) {
        perm = await Geolocator.requestPermission();
      }
      if (perm == LocationPermission.denied || perm == LocationPermission.deniedForever) {
        return;
      }
      // Send one fix immediately so the map shows the real current position
      // without waiting for the truck to move 50 m.
      try {
        final first = await Geolocator.getCurrentPosition(
          locationSettings: const LocationSettings(accuracy: LocationAccuracy.high),
        );
        _send(first);
      } catch (_) {/* no immediate fix — the stream will provide one */}
      _sub = Geolocator.getPositionStream(locationSettings: _locationSettings())
          .listen(_onPosition, onError: (_) {});
    } catch (_) {/* location unavailable — the truck keeps its last-known spot */}
  }

  /// Keep streaming while the app is backgrounded / screen-off during an active
  /// trip: Android runs a foreground service (persistent notification), iOS
  /// uses background location updates. Needs "always" location permission + the
  /// native config (AndroidManifest permissions, iOS UIBackgroundModes).
  LocationSettings _locationSettings() {
    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        return AndroidSettings(
          accuracy: LocationAccuracy.high,
          distanceFilter: _distanceFilterM,
          foregroundNotificationConfig: const ForegroundNotificationConfig(
            notificationTitle: 'نقلة — تتبّع الرحلة',
            notificationText: 'جارٍ مشاركة موقعك أثناء تنفيذ الطلب',
            enableWakeLock: true,
          ),
        );
      case TargetPlatform.iOS:
        return AppleSettings(
          accuracy: LocationAccuracy.high,
          distanceFilter: _distanceFilterM,
          allowBackgroundLocationUpdates: true,
          pauseLocationUpdatesAutomatically: false,
          showBackgroundLocationIndicator: true,
        );
      default:
        return const LocationSettings(
          accuracy: LocationAccuracy.high,
          distanceFilter: _distanceFilterM,
        );
    }
  }

  void _onPosition(Position p) {
    // Cap frequency: at most one fix per _minInterval, even while moving fast.
    if (DateTime.now().difference(_lastSent) < _minInterval) return;
    _send(p);
  }

  void _send(Position p) {
    _lastSent = DateTime.now();
    ref.read(realtimeServiceProvider).emitDriverLocation(
          widget.orderId,
          p.latitude,
          p.longitude,
          speedKmh: p.speed.isFinite && p.speed > 0 ? p.speed * 3.6 : null,
        );
  }

  @override
  void dispose() {
    _sub?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => const SizedBox.shrink();
}
