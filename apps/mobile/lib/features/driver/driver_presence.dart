import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/realtime/realtime_service.dart';

/// Invisible widget that keeps a realtime socket open for a signed-in driver,
/// so the server marks them **online** (presence) the whole time the app is
/// open — independent of which screen they're on. The connection drops when the
/// app is closed or loses network (→ offline), and reconnects automatically.
class DriverPresence extends ConsumerStatefulWidget {
  const DriverPresence({super.key});

  @override
  ConsumerState<DriverPresence> createState() => _DriverPresenceState();
}

class _DriverPresenceState extends ConsumerState<DriverPresence> {
  @override
  void initState() {
    super.initState();
    // Fire after the first frame so provider reads are safe.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) ref.read(realtimeServiceProvider).connect();
    });
  }

  @override
  Widget build(BuildContext context) => const SizedBox.shrink();
}
