import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/tokens.dart';
import '../../../core/theme/typography.dart';
import '../../../core/widgets/nq_icon.dart';
import '../../../design_system/button.dart';
import '../../shell/app_shell.dart' show requestedShellTabProvider;

/// Post-publish confirmation (handoff). Replaces landing straight on the order
/// detail: tells the client their order was received, sets expectations for what
/// happens next, and routes them either to track the order or to «طلباتي».
class OrderCreatedScreen extends ConsumerWidget {
  const OrderCreatedScreen({super.key, required this.orderId, this.direct = false});

  final String orderId;
  /// DIRECT order (addressed to one provider) vs OPEN market (bidding).
  final bool direct;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = context.nq;
    final title = direct ? 'تم إرسال طلبك للمزوّد' : 'تم نشر طلبك بنجاح';
    final body = direct
        ? 'استلم المزوّد طلبك وهو قيد المراجعة. سنُشعرك فور قبوله وبدء التنفيذ.'
        : 'أصبح طلبك متاحًا للمزوّدين المؤهّلين. سنُشعرك فور وصول العروض وبدء التنفيذ.';
    final waiting = direct ? 'بانتظار قبول المزوّد' : 'بانتظار عروض المزوّدين';

    return Scaffold(
      backgroundColor: c.bg,
      body: SafeArea(
        child: Column(
          children: [
            Align(
              alignment: AlignmentDirectional.centerStart,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
                child: GestureDetector(
                  onTap: () => _goHome(ref, context),
                  child: NqIcon(NqIcons.x, size: 22, color: c.tx),
                ),
              ),
            ),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Center(
                      child: Container(
                        width: 96,
                        height: 96,
                        alignment: Alignment.center,
                        decoration: BoxDecoration(color: c.mintBg, shape: BoxShape.circle),
                        child: NqIcon(NqIcons.checkCircle, fill: true, size: 56, color: c.mintTx),
                      ),
                    ),
                    const SizedBox(height: 24),
                    Text(title,
                        style: NqType.h1.copyWith(fontSize: 24, color: c.tx),
                        textAlign: TextAlign.center),
                    const SizedBox(height: 12),
                    Text(body,
                        style: NqType.body.copyWith(color: c.tx2, height: 1.6),
                        textAlign: TextAlign.center),
                    const SizedBox(height: 20),
                    // Waiting state chip.
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      decoration: BoxDecoration(
                        color: c.warnBg,
                        borderRadius: BorderRadius.circular(NqRadius.pill),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          NqIcon(NqIcons.hourglassMedium, size: 18, color: c.warn),
                          const SizedBox(width: 8),
                          Text(waiting,
                              style: NqType.bodyStrong.copyWith(color: c.warn)),
                        ],
                      ),
                    ),
                    const SizedBox(height: 14),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        NqIcon(NqIcons.bell, size: 15, color: c.tx3),
                        const SizedBox(width: 6),
                        Flexible(
                          child: Text('سنُرسل لك إشعارًا بكل تحديث على طلبك.',
                              style: NqType.caption.copyWith(color: c.tx3),
                              textAlign: TextAlign.center),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
              child: Column(
                children: [
                  NqButton(
                    label: 'عرض الطلب وتتبّعه',
                    icon: NqIcons.clipboardText,
                    onPressed: () => context.push('/order-detail/$orderId'),
                  ),
                  const SizedBox(height: 10),
                  NqButton(
                    label: 'طلباتي',
                    variant: NqButtonVariant.secondary,
                    onPressed: () => _goToMyOrders(ref, context),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _goHome(WidgetRef ref, BuildContext context) {
    ref.read(requestedShellTabProvider.notifier).state = 0;
    context.go('/app');
  }

  void _goToMyOrders(WidgetRef ref, BuildContext context) {
    // Customer shell: index 2 is the shipments («طلباتي») tab.
    ref.read(requestedShellTabProvider.notifier).state = 2;
    context.go('/app');
  }
}
