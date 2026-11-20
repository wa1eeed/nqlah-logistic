import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/config/maintenance.dart';
import '../../core/i18n/app_strings.dart';
import '../../core/i18n/locale_controller.dart';
import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';
import '../../core/widgets/nq_icon.dart';
import '../../design_system/button.dart';

/// Full-screen page shown while the platform is in maintenance mode. Renders the
/// admin's localized message (or a sensible default) and a retry that re-checks.
class MaintenanceScreen extends ConsumerWidget {
  const MaintenanceScreen({super.key, required this.state});

  final Maintenance state;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = context.nq;
    final ar = ref.watch(localeControllerProvider) != AppLang.en;
    final message = (ar ? state.messageAr : state.messageEn).trim();
    final fallback = ar
        ? 'نقوم بأعمال صيانة وتحديثات على المنصة. نعود إليك قريبًا.'
        : 'We are performing maintenance and updates. We will be back shortly.';

    return Scaffold(
      backgroundColor: c.bg,
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: NqSpace.x6),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 88,
                  height: 88,
                  decoration: BoxDecoration(
                    color: c.mint.withValues(alpha: 0.10),
                    borderRadius: BorderRadius.circular(24),
                    border: Border.all(color: c.mint.withValues(alpha: 0.15)),
                  ),
                  alignment: Alignment.center,
                  child: NqIcon(NqIcons.wrench, size: 40, color: c.mintTx),
                ),
                const SizedBox(height: NqSpace.x5),
                Text(
                  ar ? 'المنصة تحت الصيانة' : 'Under maintenance',
                  textAlign: TextAlign.center,
                  style: NqType.h1.copyWith(color: c.tx),
                ),
                const SizedBox(height: NqSpace.x3),
                Text(
                  message.isNotEmpty ? message : fallback,
                  textAlign: TextAlign.center,
                  style: NqType.body.copyWith(color: c.tx2, height: 1.5),
                ),
                const SizedBox(height: NqSpace.x6),
                NqButton(
                  label: ar ? 'إعادة المحاولة' : 'Try again',
                  icon: NqIcons.arrowCounterClockwise,
                  variant: NqButtonVariant.secondary,
                  expand: false,
                  onPressed: () => ref.invalidate(maintenanceConfigProvider),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
