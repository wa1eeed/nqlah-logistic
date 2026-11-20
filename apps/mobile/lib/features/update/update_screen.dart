import 'dart:io' show Platform;

import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/config/app_update.dart';
import '../../core/i18n/app_strings.dart';
import '../../core/i18n/locale_controller.dart';
import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';
import '../../core/widgets/nq_icon.dart';
import '../../design_system/button.dart';

// Store listings. Android package is real; the App Store numeric id is filled
// in once the app is live (TODO: replace 0000000000 after App Store Connect).
const _kPlayUrl =
    'https://play.google.com/store/apps/details?id=sa.nx.nqlah.nqlah_mobile';
const _kAppStoreUrl = 'https://apps.apple.com/app/id0000000000';

Future<void> _openStore() async {
  final url = (!kIsWeb && Platform.isIOS) ? _kAppStoreUrl : _kPlayUrl;
  await launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication);
}

/// Full-screen, non-dismissible gate shown when the running build is below the
/// admin's forced minimum version. The only way forward is to update.
class UpdateScreen extends ConsumerWidget {
  const UpdateScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = context.nq;
    final ar = ref.watch(localeControllerProvider) != AppLang.en;
    final cfg = ref.watch(appUpdateProvider);
    final message = (ar ? cfg.messageAr : cfg.messageEn).trim();
    final fallback = ar
        ? 'يتوفّر إصدار جديد من نقلة مطلوب للمتابعة. حدِّث التطبيق للاستمرار.'
        : 'A new required version of Naqla is available. Update to continue.';

    return Scaffold(
      backgroundColor: c.bg,
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: NqSpace.x6),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                _medallion(c),
                const SizedBox(height: NqSpace.x5),
                Text(
                  ar ? 'تحديث مطلوب' : 'Update required',
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
                  label: ar ? 'تحديث التطبيق' : 'Update the app',
                  icon: NqIcons.uploadSimple,
                  onPressed: _openStore,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

Widget _medallion(NqColors c) => Container(
      width: 88,
      height: 88,
      decoration: BoxDecoration(
        color: c.mint.withValues(alpha: 0.10),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: c.mint.withValues(alpha: 0.15)),
      ),
      alignment: Alignment.center,
      child: NqIcon(NqIcons.uploadSimple, size: 40, color: c.mintTx),
    );

/// Dismissible "update available" prompt for a non-forced minimum. The user can
/// update now or skip for this session.
Future<void> showSoftUpdateSheet(BuildContext context, WidgetRef ref) {
  final c = context.nq;
  final ar = ref.read(localeControllerProvider) != AppLang.en;
  final cfg = ref.read(appUpdateProvider);
  final message = (ar ? cfg.messageAr : cfg.messageEn).trim();
  final fallback = ar
      ? 'يتوفّر إصدار جديد من نقلة بتحسينات ومزايا. ننصح بالتحديث.'
      : 'A new version of Naqla is available with improvements. We recommend updating.';

  return showModalBottomSheet<void>(
    context: context,
    backgroundColor: c.bg,
    isScrollControlled: true,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
    ),
    builder: (_) => SafeArea(
      top: false,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(NqSpace.x5, 14, NqSpace.x5, NqSpace.x5),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                    color: c.bd, borderRadius: BorderRadius.circular(2)),
              ),
            ),
            const SizedBox(height: NqSpace.x4),
            Center(child: _medallion(c)),
            const SizedBox(height: NqSpace.x4),
            Text(ar ? 'يتوفّر تحديث جديد' : 'Update available',
                textAlign: TextAlign.center,
                style: NqType.h2.copyWith(color: c.tx)),
            const SizedBox(height: NqSpace.x2),
            Text(message.isNotEmpty ? message : fallback,
                textAlign: TextAlign.center,
                style: NqType.body.copyWith(color: c.tx2, height: 1.5)),
            const SizedBox(height: NqSpace.x5),
            NqButton(
              label: ar ? 'تحديث الآن' : 'Update now',
              icon: NqIcons.uploadSimple,
              onPressed: () {
                Navigator.of(context).pop();
                _openStore();
              },
            ),
            const SizedBox(height: NqSpace.x2),
            NqButton(
              label: ar ? 'لاحقًا' : 'Later',
              variant: NqButtonVariant.secondary,
              onPressed: () => Navigator.of(context).pop(),
            ),
          ],
        ),
      ),
    ),
  );
}
