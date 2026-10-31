import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:latlong2/latlong.dart';

import '../../core/maps/maps_config.dart';
import '../../core/orders/order_models.dart';
import '../../core/realtime/realtime_service.dart';
import '../../core/theme/tokens.dart';
import '../../core/widgets/nq_icon.dart';
import '../../design_system/status_chip.dart';

/// Full-bleed live tracking map (flutter_map + OSM/MapLibre raster tiles from
/// the Integration Hub). Shows the origin → destination route and a driver
/// marker that moves on realtime `tracking:location_update` events — a real GPS
/// fix when the driver app reports one, otherwise the simulated progress
/// interpolated along the route.
class LiveTrackingMap extends ConsumerStatefulWidget {
  const LiveTrackingMap({super.key, required this.order});

  final OrderDetail order;

  @override
  ConsumerState<LiveTrackingMap> createState() => _LiveTrackingMapState();
}

class _LiveTrackingMapState extends ConsumerState<LiveTrackingMap> {
  final _map = MapController();
  StreamSubscription<TrackingUpdate>? _sub;
  LatLng? _driver;
  bool _fitted = false;

  LatLng? get _origin => widget.order.hasRouteCoords
      ? LatLng(widget.order.originLat!, widget.order.originLng!)
      : null;
  LatLng? get _dest => widget.order.hasRouteCoords
      ? LatLng(widget.order.destinationLat!, widget.order.destinationLng!)
      : null;

  @override
  void initState() {
    super.initState();
    // Seed the driver marker from the order's status progress (if we have a route).
    final o = _origin, d = _dest;
    if (o != null && d != null) {
      _driver = _lerp(o, d, _progressFor(widget.order.nqStatus));
    }
    final rt = ref.read(realtimeServiceProvider);
    rt.subscribeOrder(widget.order.id);
    _sub = rt.onTracking.listen(_onTracking);
  }

  @override
  void dispose() {
    _sub?.cancel();
    ref.read(realtimeServiceProvider).unsubscribeOrder(widget.order.id);
    super.dispose();
  }

  void _onTracking(TrackingUpdate u) {
    if (u.orderId != widget.order.id || !mounted) return;
    LatLng? next;
    if (u.lat != null && u.lng != null) {
      next = LatLng(u.lat!, u.lng!); // real GPS fix
    } else if (u.progress != null && _origin != null && _dest != null) {
      next = _lerp(_origin!, _dest!, u.progress!.clamp(0, 1)); // simulated
    }
    if (next == null) return;
    setState(() => _driver = next);
    // Keep the driver gently in view without fighting the user's pan.
    try {
      _map.move(next, _map.camera.zoom);
    } catch (_) {/* controller not ready */}
  }

  static LatLng _lerp(LatLng a, LatLng b, double t) => LatLng(
        a.latitude + (b.latitude - a.latitude) * t,
        a.longitude + (b.longitude - a.longitude) * t,
      );

  double _progressFor(NqStatus s) => switch (s) {
        NqStatus.delivered || NqStatus.completed => 1.0,
        NqStatus.inTransit => 0.5,
        NqStatus.assigned || NqStatus.confirmed => 0.08,
        _ => 0.0,
      };

  void _fitOnce() {
    if (_fitted) return;
    final o = _origin, d = _dest;
    if (o == null || d == null) return;
    _fitted = true;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      try {
        _map.fitCamera(CameraFit.bounds(
          bounds: LatLngBounds.fromPoints([o, d, ?_driver]),
          padding: const EdgeInsets.fromLTRB(60, 120, 60, 260),
        ));
      } catch (_) {/* ignore */}
    });
  }

  @override
  Widget build(BuildContext context) {
    final c = context.nq;
    final cfg = ref.watch(mapsConfigProvider).valueOrNull ?? MapsConfig.fallback;
    final center = _driver ?? _origin ?? const LatLng(24.7136, 46.6753); // Riyadh
    final hasRoute = _origin != null && _dest != null;
    if (hasRoute) _fitOnce();

    return FlutterMap(
      mapController: _map,
      options: MapOptions(
        initialCenter: center,
        initialZoom: hasRoute ? 7 : 11,
        minZoom: 3,
        maxZoom: cfg.maxZoom,
        interactionOptions: const InteractionOptions(
          flags: InteractiveFlag.pinchZoom | InteractiveFlag.drag | InteractiveFlag.doubleTapZoom,
        ),
      ),
      children: [
        TileLayer(
          urlTemplate: cfg.tileUrl,
          maxZoom: cfg.maxZoom,
          userAgentPackageName: 'sa.nx.nqlah.nqlah_mobile',
          tileProvider: NetworkTileProvider(),
        ),
        if (hasRoute)
          PolylineLayer(polylines: [
            Polyline(
              points: [_origin!, ?_driver, _dest!],
              strokeWidth: 4,
              color: c.mintS,
            ),
          ]),
        MarkerLayer(markers: [
          if (_origin != null)
            Marker(
              point: _origin!,
              width: 26,
              height: 26,
              child: _pin(c.tx, NqIcons.mapPin),
            ),
          if (_dest != null)
            Marker(
              point: _dest!,
              width: 28,
              height: 28,
              child: _pin(c.err, NqIcons.flagCheckered),
            ),
          if (_driver != null)
            Marker(
              point: _driver!,
              width: 52,
              height: 52,
              child: const _DriverMarker(),
            ),
        ]),
        const _OsmAttribution(),
      ],
    );
  }

  Widget _pin(Color color, String icon) => Container(
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: color,
          shape: BoxShape.circle,
          border: Border.all(color: Colors.white, width: 3),
          boxShadow: const [BoxShadow(color: Color(0x33000000), blurRadius: 6, offset: Offset(0, 2))],
        ),
        child: NqIcon(icon, fill: true, size: 13, color: Colors.white),
      );
}

class _DriverMarker extends StatelessWidget {
  const _DriverMarker();

  @override
  Widget build(BuildContext context) {
    final c = context.nq;
    return Container(
      alignment: Alignment.center,
      decoration: const BoxDecoration(color: Color(0x3800C9A7), shape: BoxShape.circle),
      child: Container(
        width: 38,
        height: 38,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: c.hero,
          shape: BoxShape.circle,
          border: Border.all(color: c.mint, width: 2),
        ),
        child: NqIcon(NqIcons.truck, fill: true, size: 18, color: NqFixed.heroText),
      ),
    );
  }
}

class _OsmAttribution extends StatelessWidget {
  const _OsmAttribution();

  @override
  Widget build(BuildContext context) {
    return const Align(
      alignment: Alignment.bottomLeft,
      child: Padding(
        padding: EdgeInsets.only(left: 6, bottom: 2),
        child: Text('© OpenStreetMap',
            style: TextStyle(fontSize: 9, color: Color(0x99000000))),
      ),
    );
  }
}
