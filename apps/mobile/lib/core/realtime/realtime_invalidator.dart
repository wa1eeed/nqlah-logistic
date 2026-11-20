import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../marketplace/marketplace_repository.dart' as market;
import '../orders/orders_repository.dart' as orders;
import 'realtime_service.dart';

/// Keeps the app live: on any server change signal (data:changed / order status
/// / new bid / notification) it invalidates the main data providers so lists
/// and details refresh without a manual pull — the mobile mirror of the web
/// dashboards' RealtimeInvalidator. Throttled so a burst collapses into one
/// refresh. Kept alive by a `ref.watch` from the app shell.
final realtimeInvalidatorProvider = Provider<void>((ref) {
  final svc = ref.watch(realtimeServiceProvider);
  Timer? throttle;
  final sub = svc.onDataChanged.listen((_) {
    if (throttle != null) return; // trailing throttle (~1.2s)
    throttle = Timer(const Duration(milliseconds: 1200), () {
      throttle = null;
      ref.invalidate(orders.myShipmentsProvider);
      ref.invalidate(orders.providerWorkProvider);
      ref.invalidate(orders.marketplaceLoadsProvider);
      ref.invalidate(orders.orderDetailProvider);
      ref.invalidate(market.marketplaceLoadsProvider);
      ref.invalidate(market.marketplaceTrucksProvider);
    });
  });
  ref.onDispose(() {
    sub.cancel();
    throttle?.cancel();
  });
});
