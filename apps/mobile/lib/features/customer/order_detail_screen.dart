import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_exception.dart';
import '../../core/orders/order_models.dart';
import '../../core/platform/format.dart';
import '../../core/orders/orders_repository.dart';
import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';
import '../../core/widgets/ltr.dart';
import '../../core/widgets/nq_icon.dart';
import '../../design_system/confirm_dialog.dart';
import '../../design_system/party_card.dart';
import '../../design_system/status_chip.dart';

/// Customer order detail (handoff 1c) — wired to `GET /orders/:id`. Shows the
/// contracted carrier (contact revealed), the route timeline and the price
/// breakdown, with graceful states before a carrier is assigned.
class OrderDetailScreen extends ConsumerWidget {
  const OrderDetailScreen({super.key, required this.orderId, this.onTrack});

  final String orderId;
  final VoidCallback? onTrack;

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
          error: (e, _) => _error(
            context,
            c,
            e is ApiException ? e.message : 'تعذّر تحميل الطلب.',
            () => ref.invalidate(orderDetailModelProvider(orderId)),
          ),
          data: (o) => _content(context, ref, c, o),
        ),
      ),
    );
  }

  Widget _content(
      BuildContext context, WidgetRef ref, NqColors c, OrderDetail o) {
    final trackable = o.nqStatus == NqStatus.inTransit ||
        o.nqStatus == NqStatus.assigned ||
        o.nqStatus == NqStatus.confirmed ||
        o.nqStatus == NqStatus.delivered;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _appBar(context, ref, c, o),
        Expanded(
          child: ListView(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
            children: [
              Row(
                children: [
                  NqStatusChip(o.displayStatus),
                  const Spacer(),
                  Text('${cargoLabel(o.cargoType)} · ${truckLabel(o.requiredTruckType)}',
                      style: NqType.label.copyWith(color: c.tx2)),
                ],
              ),
              const SizedBox(height: 16),
              _party(c, o),
              const SizedBox(height: 20),
              _sectionHeader(c, 'مسار الرحلة',
                  action: trackable ? 'تتبّع' : null,
                  actionIcon: NqIcons.mapTrifold,
                  onAction: trackable ? onTrack : null),
              const SizedBox(height: 10),
              _timelineCard(c, o),
              const SizedBox(height: 20),
              _sectionHeader(c, 'تفاصيل الحمولة'),
              const SizedBox(height: 10),
              _cargoCard(c, o),
              const SizedBox(height: 20),
              Text('تفصيل السعر', style: NqType.h2.copyWith(color: c.tx)),
              const SizedBox(height: 10),
              _priceCard(c, o),
            ],
          ),
        ),
      ],
    );
  }

  Widget _appBar(
      BuildContext context, WidgetRef ref, NqColors c, OrderDetail o) {
    final sub = o.isConsolidated
        ? 'طلب مجمّع · ${o.truckCount ?? '—'} رحلات'
        : 'طلب مفرد';
    final s = o.status.toUpperCase();
    final canCancel = !['COMPLETED', 'CANCELLED', 'DELIVERED'].contains(s);
    final canComplete = s == 'DELIVERED';
    final hasActions = canCancel || canComplete;
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
      child: Row(
        children: [
          GestureDetector(
            onTap: hasActions
                ? () => _showActions(context, ref, o, canCancel, canComplete)
                : null,
            child: NqIcon(NqIcons.dotsThree,
                size: 22, color: hasActions ? c.tx : c.tx3),
          ),
          const Spacer(),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Ltr(o.orderNumber,
                  style: NqType.code(size: 16).copyWith(color: c.tx)),
              const SizedBox(height: 2),
              Text(sub, style: NqType.caption.copyWith(color: c.tx2)),
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
  }

  Widget _party(NqColors c, OrderDetail o) {
    final carrier = o.carrier;
    if (carrier != null) {
      return NqPartyCard(
        initial: carrier.nameAr.isNotEmpty ? carrier.nameAr.substring(0, 1) : 'م',
        name: carrier.nameAr,
        role: 'المزوّد المتعاقد',
        revealed: true,
        phone: carrier.phone,
        revealLabel: 'بيانات المزوّد متاحة',
        caption: 'المزوّد يتولّى التنسيق مع السائق',
        captionIcon: NqIcons.steeringWheel,
      );
    }
    // No carrier yet — show the marketplace status instead of a party.
    final waiting = o.bidsCount > 0
        ? '${o.bidsCount} عروض بانتظار اختيارك'
        : 'الطلب منشور · بانتظار عروض المزوّدين';
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: c.sf,
        borderRadius: BorderRadius.circular(NqRadius.card),
        border: Border.all(color: c.bd),
      ),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            alignment: Alignment.center,
            decoration: BoxDecoration(
                color: c.mintBg, borderRadius: BorderRadius.circular(NqRadius.input)),
            child: NqIcon(NqIcons.handCoins, size: 22, color: c.mintTx),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text('لم يُسنَد مزوّد بعد',
                    style: NqType.bodyStrong.copyWith(color: c.tx),
                    textAlign: TextAlign.right),
                const SizedBox(height: 2),
                Text(waiting,
                    style: NqType.caption.copyWith(color: c.tx2),
                    textAlign: TextAlign.right),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _sectionHeader(NqColors c, String title,
      {String? action, String? actionIcon, VoidCallback? onAction}) {
    return Row(
      children: [
        if (action != null)
          GestureDetector(
            onTap: onAction,
            child: Row(
              children: [
                if (actionIcon != null)
                  NqIcon(actionIcon, size: 16, color: c.mintTx),
                const SizedBox(width: 6),
                Text(action, style: NqType.labelStrong.copyWith(color: c.mintTx)),
              ],
            ),
          ),
        const Spacer(),
        Text(title, style: NqType.h2.copyWith(color: c.tx)),
      ],
    );
  }

  Widget _timelineCard(NqColors c, OrderDetail o) {
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
          _row(
            c,
            time: o.actualPickupAt != null
                ? fmtTime(o.actualPickupAt)
                : fmtDate(o.pickupDate),
            title: 'الاستلام · ${o.originCity}',
            sub: o.originAddress.isNotEmpty ? o.originAddress : o.originRegion,
            state: pickedUp ? _Node.done : _Node.pending,
            first: true,
          ),
          _row(
            c,
            time: o.actualDeliveryAt != null
                ? fmtTime(o.actualDeliveryAt)
                : fmtDate(o.deliveryDate),
            title: 'التفريغ · ${o.destinationCity}',
            sub: o.destinationAddress.isNotEmpty
                ? o.destinationAddress
                : o.destinationRegion,
            state: delivered
                ? _Node.done
                : (pickedUp ? _Node.current : _Node.pending),
            last: true,
          ),
        ],
      ),
    );
  }

  Widget _row(NqColors c,
      {required String time,
      required String title,
      String? sub,
      required _Node state,
      bool first = false,
      bool last = false}) {
    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 52,
            child: Padding(
              padding: const EdgeInsets.only(top: 2),
              child: Ltr(time,
                  style: NqType.numeric(12, FontWeight.w500).copyWith(color: c.tx3),
                  textAlign: TextAlign.left),
            ),
          ),
          const SizedBox(width: 10),
          _node(c, state, first: first, last: last),
          const SizedBox(width: 12),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.only(bottom: 18),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(title,
                      style: NqType.bodyStrong.copyWith(color: c.tx),
                      textAlign: TextAlign.right),
                  if (sub != null && sub.isNotEmpty) ...[
                    const SizedBox(height: 3),
                    Text(sub,
                        style: NqType.caption.copyWith(color: c.tx2),
                        textAlign: TextAlign.right),
                  ],
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _node(NqColors c, _Node state, {bool first = false, bool last = false}) {
    final Color color = switch (state) {
      _Node.done => c.ok,
      _Node.current => c.info,
      _Node.pending => c.bd,
    };
    return Column(
      children: [
        Container(
            width: 2,
            height: 4,
            color: first ? Colors.transparent : (state == _Node.pending ? c.bd : c.ok)),
        Container(
          width: 24,
          height: 24,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: state == _Node.pending ? Colors.transparent : color,
            shape: BoxShape.circle,
            border: state == _Node.pending ? Border.all(color: c.bd, width: 2) : null,
          ),
          child: switch (state) {
            _Node.done => NqIcon(NqIcons.check, size: 13, color: Colors.white),
            _Node.current =>
              NqIcon(NqIcons.truck, fill: true, size: 13, color: Colors.white),
            _Node.pending => const SizedBox.shrink(),
          },
        ),
        Expanded(
          child: Container(
              width: 2,
              color: last ? Colors.transparent : (state == _Node.done ? c.ok : c.bd)),
        ),
      ],
    );
  }

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
          if (o.pallets != null) row('الطبليات', '${o.pallets}'),
          row('نوع الشاحنة', truckLabel(o.requiredTruckType)),
          row('موعد التحميل', fmtDate(o.pickupDate)),
          if (o.specialInstructions != null &&
              o.specialInstructions!.isNotEmpty)
            row('تعليمات', o.specialInstructions!),
        ],
      ),
    );
  }

  Widget _priceCard(NqColors c, OrderDetail o) {
    Widget row(String label, num? value, {bool strong = false}) => Padding(
          padding: const EdgeInsets.symmetric(vertical: 4),
          child: Row(
            children: [
              Flexible(
                child: FittedBox(
                  fit: BoxFit.scaleDown,
                  alignment: AlignmentDirectional.centerStart,
                  child: Ltr(value != null ? money(value) : '—',
                      style: (strong
                              ? NqType.numeric(16, FontWeight.w700)
                              : NqType.numeric(14, FontWeight.w400))
                          .copyWith(color: c.tx)),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(label,
                    textAlign: TextAlign.end,
                    style: (strong ? NqType.bodyStrong : NqType.body)
                        .copyWith(color: strong ? c.tx : c.tx2)),
              ),
            ],
          ),
        );

    final hasBreakdown = o.agreedPrice != null || o.clientTotalDue != null;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: c.sf,
        borderRadius: BorderRadius.circular(NqRadius.card),
        border: Border.all(color: c.bd),
      ),
      child: hasBreakdown
          ? Column(
              children: [
                row('أجرة النقل', o.carrierAmount ?? o.agreedPrice),
                if (o.commissionAmount != null)
                  row('رسوم الخدمة', o.commissionAmount),
                if (o.serviceVatAmount != null)
                  row('ضريبة القيمة المضافة 15%', o.serviceVatAmount),
                if (o.clientTotalDue != null) ...[
                  const SizedBox(height: 6),
                  Divider(color: c.bd, height: 1),
                  const SizedBox(height: 6),
                  row('الإجمالي المستحق', o.clientTotalDue, strong: true),
                ],
              ],
            )
          : Row(
              children: [
                Ltr(
                    o.clientBudget != null
                        ? '${o.clientBudget!.toStringAsFixed(0)} ر.س'
                        : 'مفتوح للعروض',
                    style: NqType.numeric(16, FontWeight.w700).copyWith(color: c.tx)),
                const Spacer(),
                Text(o.clientBudget != null ? 'الميزانية التقديرية' : 'السعر',
                    style: NqType.body.copyWith(color: c.tx2)),
              ],
            ),
    );
  }

  Widget _error(
      BuildContext context, NqColors c, String msg, VoidCallback onRetry) {
    return Column(
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
                        borderRadius: BorderRadius.circular(NqRadius.pill),
                      ),
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
}

extension _OrderActions on OrderDetailScreen {
  void _showActions(BuildContext context, WidgetRef ref, OrderDetail o,
      bool canCancel, bool canComplete) {
    final c = context.nq;
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: c.sf,
      showDragHandle: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (canComplete)
              ListTile(
                leading: NqIcon(NqIcons.sealCheck, fill: true, size: 22, color: c.ok),
                title: Text('تأكيد الاستلام وإغلاق الطلب',
                    style: NqType.body.copyWith(color: c.tx)),
                onTap: () {
                  Navigator.of(ctx).pop();
                  _complete(context, ref, o);
                },
              ),
            if (canCancel)
              ListTile(
                leading: NqIcon(NqIcons.xCircle, size: 22, color: c.err),
                title: Text('إلغاء الطلب',
                    style: NqType.body.copyWith(color: c.err)),
                onTap: () {
                  Navigator.of(ctx).pop();
                  _cancel(context, ref, o);
                },
              ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
  }

  Future<void> _cancel(
      BuildContext context, WidgetRef ref, OrderDetail o) async {
    final c = context.nq;
    final messenger = ScaffoldMessenger.of(context);
    final nav = Navigator.of(context);
    final reasonCtrl = TextEditingController();
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: c.sf,
        title: Text('إلغاء الطلب', style: NqType.h2.copyWith(color: c.tx)),
        content: TextField(
          controller: reasonCtrl,
          textAlign: TextAlign.right,
          style: NqType.body.copyWith(color: c.tx),
          cursorColor: c.mintS,
          decoration: InputDecoration(
            hintText: 'سبب الإلغاء',
            hintStyle: NqType.body.copyWith(color: c.tx3),
          ),
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.of(ctx).pop(false),
              child: Text('تراجع',
                  style: NqType.labelStrong.copyWith(color: c.tx2))),
          TextButton(
              onPressed: () => Navigator.of(ctx).pop(true),
              child: Text('تأكيد الإلغاء',
                  style: NqType.labelStrong.copyWith(color: c.err))),
        ],
      ),
    );
    if (confirmed != true) return;
    try {
      await ref.read(ordersRepositoryProvider).cancelOrder(
          o.id, reasonCtrl.text.trim().isEmpty ? 'إلغاء من العميل' : reasonCtrl.text.trim());
      ref.invalidate(myShipmentsProvider);
      ref.invalidate(orderDetailModelProvider(o.id));
      messenger.showSnackBar(const SnackBar(content: Text('تم إلغاء الطلب.')));
      nav.maybePop();
    } on ApiException catch (e) {
      messenger.showSnackBar(SnackBar(content: Text(e.message)));
    } catch (_) {
      messenger.showSnackBar(const SnackBar(content: Text('تعذّر الإلغاء.')));
    }
  }

  Future<void> _complete(
      BuildContext context, WidgetRef ref, OrderDetail o) async {
    final messenger = ScaffoldMessenger.of(context);
    if (!await nqConfirm(context,
        title: 'تأكيد الاستلام',
        message: 'بتأكيد استلام الشحنة سيُغلق الطلب نهائياً وتُحرَّر مستحقات المزوّد من الضمان. '
            'أكّد فقط بعد استلام شحنتك كاملةً.',
        confirmLabel: 'تأكيد الاستلام',
        icon: NqIcons.checkCircle)) {
      return;
    }
    try {
      await ref.read(ordersRepositoryProvider).completeOrder(o.id);
      ref.invalidate(myShipmentsProvider);
      ref.invalidate(orderDetailModelProvider(o.id));
      messenger.showSnackBar(
          const SnackBar(content: Text('تم تأكيد الاستلام وإغلاق الطلب.')));
    } on ApiException catch (e) {
      messenger.showSnackBar(SnackBar(content: Text(e.message)));
    } catch (_) {
      messenger
          .showSnackBar(const SnackBar(content: Text('تعذّر إغلاق الطلب.')));
    }
  }
}

enum _Node { done, current, pending }
