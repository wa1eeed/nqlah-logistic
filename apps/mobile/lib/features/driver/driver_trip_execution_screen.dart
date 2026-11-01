import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_exception.dart';
import '../../core/orders/order_models.dart';
import '../../core/orders/orders_repository.dart';
import '../../core/platform/external_links.dart';
import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';
import '../../core/widgets/ltr.dart';
import '../../core/widgets/nq_icon.dart';
import '../../design_system/button.dart';
import '../../design_system/confirm_dialog.dart';
import '../../design_system/status_chip.dart';

/// Employed-driver trip execution (handoff 1j), wired to `GET /orders/:id`.
/// Big targets, no prices/customer identity. The primary action advances the
/// trip: confirm pickup (→ IN_TRANSIT) then arrival (→ ePOD). Calls/maps are
/// device integrations (follow-ups).
class DriverTripExecutionScreen extends ConsumerWidget {
  const DriverTripExecutionScreen({super.key, required this.orderId, this.onArrive});

  final String orderId;
  final void Function(String orderId)? onArrive;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = context.nq;
    final async = ref.watch(orderDetailModelProvider(orderId));
    return Scaffold(
      backgroundColor: c.bg,
      // StackFit.expand so the Stack fills the Scaffold; otherwise it would
      // size to its only non-positioned child (the 0×0 beacon) and collapse,
      // leaving the screen blank.
      body: Stack(
        fit: StackFit.expand,
        children: [
          async.when(
            loading: () => Center(
              child: SizedBox(
                width: 30,
                height: 30,
                child: CircularProgressIndicator(strokeWidth: 2.5, color: c.mintTx),
              ),
            ),
            error: (e, _) => SafeArea(
              child: _error(context, c,
                  e is ApiException ? e.message : 'تعذّر تحميل الرحلة.',
                  () => ref.invalidate(orderDetailModelProvider(orderId))),
            ),
            data: (o) => _content(context, ref, c, o),
          ),
          // GPS reporting is hoisted to the driver shell (DriverActiveOrderBeacon)
          // so it keeps running in the background for the whole active order.
        ],
      ),
    );
  }

  Widget _content(
      BuildContext context, WidgetRef ref, NqColors c, OrderDetail o) {
    final picked = o.actualPickupAt != null ||
        o.nqStatus == NqStatus.inTransit ||
        o.nqStatus == NqStatus.delivered ||
        o.nqStatus == NqStatus.completed;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _hero(context, c, o, picked),
        Expanded(
          child: ListView(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 16),
            children: [
              _stopCard(c, o, picked),
            ],
          ),
        ),
        _footer(context, ref, c, o, picked),
      ],
    );
  }

  Widget _hero(BuildContext context, NqColors c, OrderDetail o, bool picked) =>
      Container(
        color: c.hero,
        padding: EdgeInsets.fromLTRB(
            16, MediaQuery.of(context).padding.top + 12, 16, 14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                const SizedBox(width: 44),
                const Spacer(),
                Column(
                  children: [
                    Text('الرحلة النشطة',
                        style: NqType.caption
                            .copyWith(color: NqFixed.heroTextSecondary)),
                    const SizedBox(height: 2),
                    Ltr(o.orderNumber,
                        style: NqType.code(size: 16)
                            .copyWith(color: NqFixed.heroText)),
                  ],
                ),
                const Spacer(),
                GestureDetector(
                  onTap: () => Navigator.of(context).maybePop(),
                  child: Container(
                    width: 44,
                    height: 44,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                        color: NqFixed.heroFill2,
                        borderRadius: BorderRadius.circular(NqRadius.input)),
                    child: NqIcon(NqIcons.arrowRight,
                        size: 20, color: NqFixed.heroText),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Row(children: [
              _step(c, 'التفريغ', picked),
              const SizedBox(width: 6),
              _step(c, 'الاستلام', true),
            ]),
          ],
        ),
      );

  Widget _step(NqColors c, String label, bool done) => Expanded(
        child: Column(
          children: [
            Container(
              height: 4,
              decoration: BoxDecoration(
                  color: done ? NqFixed.heroAccent : NqFixed.heroFill2,
                  borderRadius: BorderRadius.circular(2)),
            ),
            const SizedBox(height: 6),
            Text(done ? '$label ✓' : label,
                style: NqType.caption.copyWith(
                    color: done
                        ? NqFixed.heroText
                        : NqFixed.heroTextSecondary)),
          ],
        ),
      );

  Widget _stopCard(NqColors c, OrderDetail o, bool picked) {
    final title = picked ? 'التفريغ · ${o.destinationCity}' : 'الاستلام · ${o.originCity}';
    final addr = picked
        ? (o.destinationAddress.isNotEmpty
            ? o.destinationAddress
            : o.destinationRegion)
        : (o.originAddress.isNotEmpty ? o.originAddress : o.originRegion);
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: c.sf,
        borderRadius: BorderRadius.circular(NqRadius.card),
        border: Border.all(color: c.bd),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
              decoration: BoxDecoration(
                  color: c.infoBg, borderRadius: BorderRadius.circular(NqRadius.pill)),
              child: Row(mainAxisSize: MainAxisSize.min, children: [
                Text(picked ? 'الوجهة' : 'نقطة الاستلام',
                    style: NqType.caption
                        .copyWith(color: c.info, fontWeight: FontWeight.w700)),
                const SizedBox(width: 6),
                NqIcon(NqIcons.mapPin, fill: true, size: 14, color: c.info),
              ]),
            ),
            const Spacer(),
          ]),
          const SizedBox(height: 12),
          Text(title,
              style: NqType.driverTitle.copyWith(color: c.tx),
              textAlign: TextAlign.right),
          if (addr.isNotEmpty) ...[
            const SizedBox(height: 4),
            Text(addr,
                style: NqType.body.copyWith(color: c.tx2),
                textAlign: TextAlign.right),
          ],
          if (o.cargoDescription != null && o.cargoDescription!.isNotEmpty) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                  color: c.sf2,
                  borderRadius: BorderRadius.circular(NqRadius.button)),
              child: Row(children: [
                NqIcon(NqIcons.package, size: 18, color: c.tx2),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(o.cargoDescription!,
                      style: NqType.body.copyWith(color: c.tx, height: 1.5),
                      textAlign: TextAlign.right),
                ),
              ]),
            ),
          ],
          const SizedBox(height: 14),
          Row(children: [
            Expanded(
                child: NqButton(
                    label: 'فتح الخرائط',
                    icon: NqIcons.navigationArrow,
                    variant: NqButtonVariant.secondary,
                    onPressed: () => ExternalLinks.openMaps(
                        [o.destinationAddress, o.destinationCity]
                            .where((s) => s.trim().isNotEmpty)
                            .join('، ')))),
          ]),
        ],
      ),
    );
  }

  Widget _footer(BuildContext context, WidgetRef ref, NqColors c, OrderDetail o,
      bool picked) {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
      decoration: BoxDecoration(
          color: c.sf, border: Border(top: BorderSide(color: c.bd))),
      child: Column(mainAxisSize: MainAxisSize.min, children: [
        if (!picked)
          NqButton(
            label: 'تأكيد التحميل',
            icon: NqIcons.checkCircle,
            size: NqButtonSize.driver,
            onPressed: () => _confirmPickup(context, ref, o),
          )
        else
          NqButton(
            label: 'تأكيد الوصول وإثبات التسليم',
            icon: NqIcons.mapPin,
            size: NqButtonSize.driver,
            onPressed: () => (onArrive ?? (_) {})(o.id),
          ),
      ]),
    );
  }

  Future<void> _confirmPickup(
      BuildContext context, WidgetRef ref, OrderDetail o) async {
    final messenger = ScaffoldMessenger.of(context);
    if (!await nqConfirm(context,
        title: 'تأكيد التحميل',
        message: 'سيتم تحديث حالة الشحنة إلى «جارية» وإشعار العميل بانطلاق الرحلة. '
            'تأكّد من تحميل الشحنة فعلياً قبل المتابعة.',
        confirmLabel: 'تأكيد التحميل',
        icon: NqIcons.package)) {
      return;
    }
    try {
      await ref
          .read(ordersRepositoryProvider)
          .addTracking(o.id, status: 'PICKED_UP', description: 'تم تحميل الشحنة');
      ref.invalidate(orderDetailModelProvider(o.id));
      messenger.showSnackBar(
          const SnackBar(content: Text('تم تأكيد التحميل. الرحلة جارية.')));
    } on ApiException catch (e) {
      messenger.showSnackBar(SnackBar(content: Text(e.message)));
    } catch (_) {
      messenger.showSnackBar(
          const SnackBar(content: Text('تعذّر تأكيد التحميل.')));
    }
  }

  Widget _error(
          BuildContext context, NqColors c, String msg, VoidCallback onRetry) =>
      Center(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              NqIcon(NqIcons.warningCircle, size: 40, color: c.err),
              const SizedBox(height: 12),
              Text(msg,
                  style: NqType.body.copyWith(color: c.tx2),
                  textAlign: TextAlign.center),
              const SizedBox(height: 16),
              GestureDetector(
                onTap: onRetry,
                child: Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                  decoration: BoxDecoration(
                      color: c.mintBg,
                      borderRadius: BorderRadius.circular(NqRadius.pill)),
                  child: Text('إعادة المحاولة',
                      style: NqType.labelStrong.copyWith(color: c.mintTx)),
                ),
              ),
            ],
          ),
        ),
      );
}
