import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_exception.dart';
import '../../core/orders/order_models.dart';
import '../../core/orders/orders_repository.dart';
import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';
import '../../core/widgets/ltr.dart';
import '../../core/widgets/nq_icon.dart';
import '../../design_system/button.dart';
import '../../design_system/party_card.dart';
import '../../design_system/status_chip.dart';

/// Provider order view (handoff 3a) — the carrier's view of an order it serves,
/// wired to `GET /orders/:id`: customer party (revealed post-acceptance), the
/// assigned driver (internal), route, and actions.
class ProviderOrderScreen extends ConsumerWidget {
  const ProviderOrderScreen({
    super.key,
    required this.orderId,
    this.onChangeDriver,
    this.onTrack,
    this.onChat,
  });

  final String orderId;
  final VoidCallback? onChangeDriver;
  final VoidCallback? onTrack;
  final VoidCallback? onChat;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = context.nq;
    final async = ref.watch(orderDetailModelProvider(orderId));
    return Scaffold(
      backgroundColor: c.bg,
      body: SafeArea(
        child: async.when(
          loading: () => Center(
            child: SizedBox(
              width: 30,
              height: 30,
              child:
                  CircularProgressIndicator(strokeWidth: 2.5, color: c.mintTx),
            ),
          ),
          error: (e, _) => _error(context, c,
              e is ApiException ? e.message : 'تعذّر تحميل الطلب.',
              () => ref.invalidate(orderDetailModelProvider(orderId))),
          data: (o) => _content(context, ref, c, o),
        ),
      ),
    );
  }

  Widget _content(
          BuildContext context, WidgetRef ref, NqColors c, OrderDetail o) =>
      Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _appBar(context, c, o),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
              children: [
                if (o.client != null)
                  NqPartyCard(
                    initial: o.client!.nameAr.isNotEmpty
                        ? o.client!.nameAr.substring(0, 1)
                        : 'ع',
                    name: o.client!.nameAr,
                    role: 'العميل · تتواصل معه بصفتك المزوّد',
                    revealed: o.client!.phone != null,
                    phone: o.client!.phone,
                    revealLabel: 'بيانات العميل متاحة بعد القبول',
                  ),
                const SizedBox(height: 14),
                _driverCard(c, o),
                const SizedBox(height: 18),
                Text('المسار', style: NqType.h2.copyWith(color: c.tx)),
                const SizedBox(height: 10),
                _routeCard(c, o),
                const SizedBox(height: 18),
                Text('تفاصيل الحمولة', style: NqType.h2.copyWith(color: c.tx)),
                const SizedBox(height: 10),
                _cargoCard(c, o),
              ],
            ),
          ),
          _footer(context, ref, c, o),
        ],
      );

  Widget _appBar(BuildContext context, NqColors c, OrderDetail o) => Padding(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
        child: Row(
          children: [
            NqStatusChip(o.nqStatus),
            const Spacer(),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Ltr(o.orderNumber,
                    style: NqType.code(size: 16).copyWith(color: c.tx)),
                const SizedBox(height: 2),
                Text(
                    '${o.route} · ${truckLabel(o.requiredTruckType)} · ${fmtDate(o.pickupDate)}',
                    style: NqType.caption.copyWith(color: c.tx2)),
              ],
            ),
            const SizedBox(width: 12),
            GestureDetector(
              onTap: () => Navigator.of(context).maybePop(),
              child: NqIcon(NqIcons.arrowRight, size: 22, color: c.tx),
            ),
          ],
        ),
      );

  Widget _driverCard(NqColors c, OrderDetail o) {
    final hasDriver = o.driverName != null;
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
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: c.sf2,
                  borderRadius: BorderRadius.circular(NqRadius.pill),
                ),
                child: Row(mainAxisSize: MainAxisSize.min, children: [
                  NqIcon(NqIcons.lockSimple, size: 13, color: c.tx3),
                  const SizedBox(width: 6),
                  Text('داخلي · لا يظهر للعميل',
                      style: NqType.caption
                          .copyWith(color: c.tx2, fontWeight: FontWeight.w700)),
                ]),
              ),
              const Spacer(),
              Text('السائق المُسند',
                  style: NqType.labelStrong.copyWith(color: c.tx2)),
            ],
          ),
          const SizedBox(height: 12),
          if (hasDriver)
            Row(
              children: [
                GestureDetector(
                  onTap: onChangeDriver,
                  child: Text('تغيير',
                      style: NqType.labelStrong.copyWith(color: c.mintTx)),
                ),
                const SizedBox(width: 12),
                Container(
                  width: 44,
                  height: 44,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: c.mintBg,
                    borderRadius: BorderRadius.circular(NqRadius.input),
                  ),
                  child: NqIcon(NqIcons.phone, size: 20, color: c.mintTx),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(o.driverName!,
                          style: NqType.h3.copyWith(color: c.tx)),
                      if (o.driverPhone != null) ...[
                        const SizedBox(height: 2),
                        Ltr(o.driverPhone!,
                            style: NqType.caption.copyWith(color: c.tx2)),
                      ],
                    ],
                  ),
                ),
                const SizedBox(width: 12),
                Container(
                  width: 44,
                  height: 44,
                  alignment: Alignment.center,
                  decoration:
                      BoxDecoration(color: c.sf2, shape: BoxShape.circle),
                  child: Text(o.driverName!.substring(0, 1),
                      style: NqType.h3.copyWith(color: c.tx2)),
                ),
              ],
            )
          else
            Row(
              children: [
                NqButton(
                    label: 'إسناد سائق',
                    expand: false,
                    icon: NqIcons.steeringWheel,
                    onPressed: onChangeDriver ?? () {}),
                const Spacer(),
                Text('لم يُسنَد سائق بعد',
                    style: NqType.label.copyWith(color: c.tx2)),
                const SizedBox(width: 6),
                NqIcon(NqIcons.userPlus, size: 18, color: c.tx3),
              ],
            ),
        ],
      ),
    );
  }

  Widget _routeCard(NqColors c, OrderDetail o) {
    final pickedUp = o.actualPickupAt != null ||
        o.nqStatus == NqStatus.inTransit ||
        o.nqStatus == NqStatus.delivered ||
        o.nqStatus == NqStatus.completed;
    final delivered = o.actualDeliveryAt != null ||
        o.nqStatus == NqStatus.delivered ||
        o.nqStatus == NqStatus.completed;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: c.sf,
        borderRadius: BorderRadius.circular(NqRadius.card),
        border: Border.all(color: c.bd),
      ),
      child: Column(
        children: [
          _stop(
              c,
              pickedUp,
              o.actualPickupAt != null
                  ? fmtTime(o.actualPickupAt)
                  : fmtDate(o.pickupDate),
              'الاستلام · ${o.originCity}',
              o.originAddress.isNotEmpty ? o.originAddress : o.originRegion),
          const SizedBox(height: 14),
          _stop(
              c,
              delivered,
              o.actualDeliveryAt != null
                  ? fmtTime(o.actualDeliveryAt)
                  : fmtDate(o.deliveryDate),
              'التفريغ · ${o.destinationCity}',
              o.destinationAddress.isNotEmpty
                  ? o.destinationAddress
                  : o.destinationRegion),
        ],
      ),
    );
  }

  Widget _stop(NqColors c, bool done, String time, String title, String sub) =>
      Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 52,
            child: Ltr(time,
                style:
                    NqType.numeric(12, FontWeight.w500).copyWith(color: c.tx3),
                textAlign: TextAlign.left),
          ),
          const SizedBox(width: 10),
          Padding(
            padding: const EdgeInsets.only(top: 3),
            child: done
                ? Container(
                    width: 12,
                    height: 12,
                    decoration:
                        BoxDecoration(color: c.mint, shape: BoxShape.circle))
                : Container(
                    width: 12,
                    height: 12,
                    decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        border: Border.all(color: c.tx3, width: 2))),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(title, style: NqType.bodyStrong.copyWith(color: c.tx)),
                if (sub.isNotEmpty) ...[
                  const SizedBox(height: 2),
                  Text(sub,
                      style: NqType.caption.copyWith(color: c.tx2),
                      textAlign: TextAlign.right),
                ],
              ],
            ),
          ),
        ],
      );

  Widget _cargoCard(NqColors c, OrderDetail o) {
    Widget row(String label, String value) => Padding(
          padding: const EdgeInsets.symmetric(vertical: 4),
          child: Row(
            children: [
              Flexible(
                child: Text(value,
                    style: NqType.bodyStrong.copyWith(color: c.tx),
                    textAlign: TextAlign.left),
              ),
              const Spacer(),
              Text(label, style: NqType.body.copyWith(color: c.tx2)),
            ],
          ),
        );
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: c.sf,
        borderRadius: BorderRadius.circular(NqRadius.card),
        border: Border.all(color: c.bd),
      ),
      child: Column(
        children: [
          row('نوع الحمولة', cargoLabel(o.cargoType)),
          if (o.cargoDescription != null && o.cargoDescription!.isNotEmpty)
            row('الوصف', o.cargoDescription!),
          row('الوزن', o.weight != null ? '${o.weight} طن' : '—'),
          if (o.agreedPrice != null || o.carrierAmount != null)
            row('قيمتك',
                '${(o.carrierAmount ?? o.agreedPrice)!.toStringAsFixed(0)} ر.س'),
        ],
      ),
    );
  }

  Widget _footer(
      BuildContext context, WidgetRef ref, NqColors c, OrderDetail o) {
    // Status-aware carrier transition: confirm an assignment, or mark delivered.
    final status = o.nqStatus;
    Widget? action;
    if (status == NqStatus.assigned) {
      action = NqButton(
        label: 'تأكيد الإسناد',
        icon: NqIcons.checkCircle,
        onPressed: () => _runTransition(
          context, ref, o,
          confirm: true,
          title: 'تأكيد الإسناد',
          body: 'بتأكيد الإسناد يصبح الطلب قيد التنفيذ ويمكنك بدء الرحلة.',
          cta: 'تأكيد',
        ),
      );
    } else if (status == NqStatus.confirmed || status == NqStatus.inTransit) {
      action = NqButton(
        label: 'تأكيد التسليم',
        icon: NqIcons.package,
        onPressed: () => _runTransition(
          context, ref, o,
          confirm: false,
          title: 'تأكيد التسليم',
          body: 'سيُعلَّم الطلب كمُسلَّم وينتظر تأكيد العميل لتحرير المستحقات.',
          cta: 'تم التسليم',
        ),
      );
    }
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
      decoration: BoxDecoration(
        color: c.sf,
        border: Border(top: BorderSide(color: c.bd)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (action != null) ...[
            action,
            const SizedBox(height: 12),
          ],
          Row(
            children: [
              Expanded(
                child: NqButton(
                    label: 'متابعة الرحلة',
                    icon: NqIcons.mapTrifold,
                    variant: action != null
                        ? NqButtonVariant.secondary
                        : NqButtonVariant.primary,
                    onPressed: onTrack ?? () {}),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: NqButton(
                    label: 'محادثة العميل',
                    icon: NqIcons.chats,
                    variant: NqButtonVariant.secondary,
                    onPressed: onChat ?? () {}),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Future<void> _runTransition(
    BuildContext context,
    WidgetRef ref,
    OrderDetail o, {
    required bool confirm,
    required String title,
    required String body,
    required String cta,
  }) async {
    final c = context.nq;
    final messenger = ScaffoldMessenger.of(context);
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: c.sf,
        title: Text(title, style: NqType.h2.copyWith(color: c.tx)),
        content: Text(body,
            style: NqType.body.copyWith(color: c.tx2, height: 1.5)),
        actions: [
          TextButton(
              onPressed: () => Navigator.of(ctx).pop(false),
              child: Text('إلغاء',
                  style: NqType.labelStrong.copyWith(color: c.tx2))),
          TextButton(
              onPressed: () => Navigator.of(ctx).pop(true),
              child: Text(cta,
                  style: NqType.labelStrong.copyWith(color: c.mintTx))),
        ],
      ),
    );
    if (ok != true) return;
    try {
      final repo = ref.read(ordersRepositoryProvider);
      if (confirm) {
        await repo.confirmOrder(o.id);
      } else {
        await repo.deliverOrder(o.id);
      }
      ref.invalidate(orderDetailModelProvider(o.id));
      ref.invalidate(providerWorkProvider);
      messenger.showSnackBar(SnackBar(
          content: Text(confirm ? 'تم تأكيد الإسناد.' : 'تم تأكيد التسليم.')));
    } on ApiException catch (e) {
      messenger.showSnackBar(SnackBar(content: Text(e.message)));
    } catch (_) {
      messenger.showSnackBar(
          const SnackBar(content: Text('تعذّر تنفيذ الإجراء. حاول مجددًا.')));
    }
  }

  Widget _error(
          BuildContext context, NqColors c, String msg, VoidCallback onRetry) =>
      Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
            child: Align(
              alignment: Alignment.centerRight,
              child: GestureDetector(
                onTap: () => Navigator.of(context).maybePop(),
                child: NqIcon(NqIcons.arrowRight, size: 22, color: c.tx),
              ),
            ),
          ),
          Expanded(
            child: Center(
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
                        padding: const EdgeInsets.symmetric(
                            horizontal: 20, vertical: 10),
                        decoration: BoxDecoration(
                            color: c.mintBg,
                            borderRadius: BorderRadius.circular(NqRadius.pill)),
                        child: Text('إعادة المحاولة',
                            style:
                                NqType.labelStrong.copyWith(color: c.mintTx)),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      );
}
