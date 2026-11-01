import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/driver/driver_repository.dart';
import 'driver_location_beacon.dart';

/// App-level GPS reporter: streams the driver's real location for their active
/// order (pickup or delivery) for the whole time they have one — independent of
/// which screen is open, and in the background. Mounted once in the driver
/// shell. When there is no active order it reports nothing.
///
/// The order is picked by execution priority: a trip in progress (IN_TRANSIT)
/// wins over one heading to pick up (CONFIRMED), then a freshly assigned one.
class DriverActiveOrderBeacon extends ConsumerWidget {
  const DriverActiveOrderBeacon({super.key});

  static const _priority = ['IN_TRANSIT', 'CONFIRMED', 'ASSIGNED'];

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final jobs = ref.watch(driverJobsProvider).valueOrNull ?? const <DriverJob>[];
    final active = _pickActive(jobs);
    if (active == null) return const SizedBox.shrink();
    // The ValueKey restarts the beacon when the active order changes.
    return DriverLocationBeacon(key: ValueKey(active.id), orderId: active.id);
  }

  DriverJob? _pickActive(List<DriverJob> jobs) {
    for (final status in _priority) {
      for (final j in jobs) {
        if (j.status.toUpperCase() == status) return j;
      }
    }
    return null;
  }
}
