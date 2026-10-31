import 'dart:async';

import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';

import '../../core/realtime/realtime_service.dart';

/// Invisible widget that reports the driver's live GPS for [orderId] while the
/// trip screen is open. **Cost-aware** (handoff): the OS stream only yields on
/// ≥50 m movement (`distanceFilter`), and we additionally cap sends to one per
/// [_minInterval] (30 s) — so a fast truck doesn't burn map/API quota and a
/// parked truck sends nothing. Emits over the realtime socket (free), never
/// directly to a paid maps API.
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
      _sub = Geolocator.getPositionStream(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          distanceFilter: _distanceFilterM,
        ),
      ).listen(_onPosition, onError: (_) {});
    } catch (_) {/* location unavailable — tracking falls back to simulation */}
  }

  void _onPosition(Position p) {
    // Cap frequency: at most one fix per _minInterval, even while moving fast.
    final now = DateTime.now();
    if (now.difference(_lastSent) < _minInterval) return;
    _lastSent = now;
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
