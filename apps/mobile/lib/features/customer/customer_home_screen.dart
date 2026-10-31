import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/auth/auth_controller.dart';
import '../../core/orders/order_models.dart';
import '../../core/orders/orders_repository.dart';
import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';
import '../../core/widgets/ltr.dart';
import '../../core/widgets/nq_icon.dart';
import '../../design_system/button.dart';
import '../../design_system/status_chip.dart';
import '../../design_system/waybill_card.dart';

/// Customer home (handoff 1a + Addendum 01 §0: wallet button in the header).
/// Wired to the signed-in user + `GET /orders?mine=true` (KPIs, the active
/// shipment card, and the offers alert).
class CustomerHomeScreen extends ConsumerWidget {
  const CustomerHomeScreen({
    super.key,
    this.onNewOrder,
    this.onWallet,
    this.onBell,
    this.onViewShipments,
    this.onOffers,
    this.onOpenOrder,
  });

  final VoidCallback? onNewOrder;
  final VoidCallback? onWallet;
  final VoidCallback? onBell;
  final VoidCallback? onViewShipments;
  final VoidCallback? onOffers;
  final void Function(String orderId)? onOpenOrder;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = context.nq;
    final user = ref.watch(authControllerProvider).user;
    final orders = ref.watch(myShipmentsProvider).valueOrNull ?? const [];

    final active = orders.where((o) => o.bucket == ShipmentBucket.active).toList();
    final awaitingOffers = orders
        .where((o) =>
            (o.status.toUpperCase() == 'PUBLISHED' ||
                o.status.toUpperCase() == 'BIDDING'))
        .length;
    final withOffers = orders.where((o) => o.bidsCount > 0).toList();
    final name = (user?.fullName.isNotEmpty ?? false)
        ? user!.fullName
        : 'حسابي';

    // The most relevant active order for the hero card.
    final featured = _featured(active);

    return ListView(
      padding: EdgeInsets.zero,
      children: [
        Stack(
          clipBehavior: Clip.none,
          children: [
            _hero(context, c, name),
            Positioned(
              left: 16,
              right: 16,
              bottom: -38,
              child: _kpiStrip(
                  c, active.length, awaitingOffers, withOffers.length),
            ),
          ],
        ),
        const SizedBox(height: 38 + 20),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              _sectionHeader(c, 'شحنات نشطة', 'عرض الكل', onViewShipments),
              const SizedBox(height: 10),
              if (featured != null)
                NqWaybillCard(
                  code: featured.orderNumber,
                  subtitle: featured.isConsolidated
                      ? 'مجمّع · ${featured.truckCount ?? ''} رحلات'
                      : cargoLabel(featured.cargoType),
                  status: featured.nqStatus,
                  origin: RoutePoint(featured.originCity, ''),
                  destination: RoutePoint(featured.destinationCity, ''),
                  liveText: _liveText(featured),
                  truckType: truckLabel(featured.requiredTruckType),
                  onTap: () => (onOpenOrder ?? (_) {})(featured.id),
                )
              else
                _emptyActive(c),
              if (withOffers.isNotEmpty) ...[
                const SizedBox(height: 14),
                _offersAlert(c, withOffers),
              ],
              const SizedBox(height: 24),
            ],
          ),
        ),
      ],
    );
  }

  OrderSummary? _featured(List<OrderSummary> active) {
    if (active.isEmpty) return null;
    for (final s in ['IN_TRANSIT', 'ASSIGNED', 'CONFIRMED', 'DELIVERED']) {
      final m = active.where((o) => o.status.toUpperCase() == s);
      if (m.isNotEmpty) return m.first;
    }
    return active.first;
  }

  String _liveText(OrderSummary o) => switch (o.nqStatus) {
        NqStatus.inTransit => 'الشحنة في الطريق',
        NqStatus.assigned || NqStatus.confirmed => 'تم إسناد المزوّد',
        NqStatus.delivered => 'تم التسليم · بانتظار الإغلاق',
        NqStatus.tender ||
        NqStatus.published =>
          '${o.bidsCount} عروض · بانتظار قرارك',
        _ => truckLabel(o.requiredTruckType),
      };

  Widget _hero(BuildContext context, NqColors c, String name) {
    final initial = name.isNotEmpty ? name.substring(0, 1) : 'ع';
    return Container(
      color: c.hero,
      padding: EdgeInsets.fromLTRB(
          16, MediaQuery.of(context).padding.top + 12, 16, 56),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              _avatar(c, initial),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('مرحبًا',
                        style: NqType.caption
                            .copyWith(color: NqFixed.heroTextSecondary)),
                    Text(name,
                        style: NqType.h3.copyWith(color: NqFixed.heroText),
                        overflow: TextOverflow.ellipsis),
                  ],
                ),
              ),
              _headerBtn(c, NqIcons.wallet,
                  dotColor: const Color(0xFFFBBF24), onTap: onWallet),
              const SizedBox(width: 8),
              _headerBtn(c, NqIcons.bell,
                  dotColor: NqFixed.heroAccent, onTap: onBell),
            ],
          ),
          const SizedBox(height: 24),
          Text('إلى أين تتجه شحنتك اليوم؟',
              style: NqType.display.copyWith(color: NqFixed.heroText)),
          const SizedBox(height: 18),
          NqButton(
            label: 'طلب نقل جديد',
            icon: NqIcons.plus,
            size: NqButtonSize.hero,
            onPressed: onNewOrder ?? () {},
          ),
        ],
      ),
    );
  }

  Widget _avatar(NqColors c, String initial) => Container(
        width: 44,
        height: 44,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: NqFixed.heroFill2,
          borderRadius: BorderRadius.circular(NqRadius.input),
        ),
        child: Text(initial, style: NqType.h3.copyWith(color: NqFixed.heroText)),
      );

  Widget _headerBtn(NqColors c, String icon,
      {Color? dotColor, VoidCallback? onTap}) {
    return GestureDetector(
      onTap: onTap,
      child: SizedBox(
        width: 44,
        height: 44,
        child: Stack(
          children: [
            Container(
              width: 44,
              height: 44,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: NqFixed.heroFill2,
                borderRadius: BorderRadius.circular(NqRadius.input),
              ),
              child: NqIcon(icon, size: 22, color: NqFixed.heroText),
            ),
            if (dotColor != null)
              PositionedDirectional(
                top: 10,
                start: 10,
                child: Container(
                  width: 8,
                  height: 8,
                  decoration: BoxDecoration(
                    color: dotColor,
                    shape: BoxShape.circle,
                    border: Border.all(color: c.hero, width: 2),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _kpiStrip(NqColors c, int active, int awaiting, int needsAction) {
    Widget col(int value, String label, Color valueColor) => Expanded(
          child: Column(
            children: [
              FittedBox(
                fit: BoxFit.scaleDown,
                child: Ltr('$value',
                    style: NqType.numeric(22, FontWeight.w700)
                        .copyWith(color: valueColor)),
              ),
              const SizedBox(height: 2),
              Text(label,
                  style: NqType.caption.copyWith(color: c.tx2),
                  textAlign: TextAlign.center,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis),
            ],
          ),
        );
    Widget divider() => Container(width: 1, height: 36, color: c.bd);
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 14),
      decoration: BoxDecoration(
        color: c.sf,
        borderRadius: BorderRadius.circular(NqRadius.cardOverlap),
        boxShadow: c.isDark
            ? null
            : [
                BoxShadow(
                    color: const Color(0x240A1A19),
                    blurRadius: 24,
                    offset: const Offset(0, 8),
                    spreadRadius: -12),
              ],
        border: c.isDark ? Border.all(color: c.bd) : null,
      ),
      child: Row(
        children: [
          col(active, 'شحنات نشطة', c.tx),
          divider(),
          col(awaiting, 'بانتظار العروض', c.info),
          divider(),
          col(needsAction, 'تحتاج إجراءك', c.warn),
        ],
      ),
    );
  }

  Widget _sectionHeader(
      NqColors c, String title, String action, VoidCallback? onAction) {
    return Row(
      children: [
        GestureDetector(
          onTap: onAction,
          child: Text(action,
              style: NqType.labelStrong.copyWith(color: c.mintTx)),
        ),
        const Spacer(),
        Text(title, style: NqType.h2.copyWith(color: c.tx)),
      ],
    );
  }

  Widget _emptyActive(NqColors c) => Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: c.sf,
          borderRadius: BorderRadius.circular(NqRadius.card),
          border: Border.all(color: c.bd),
        ),
        child: Column(
          children: [
            NqIcon(NqIcons.truck, size: 34, color: c.tx3),
            const SizedBox(height: 10),
            Text('لا توجد شحنات نشطة',
                style: NqType.bodyStrong.copyWith(color: c.tx2)),
            const SizedBox(height: 4),
            Text('ابدأ بطلب نقل جديد من الأعلى',
                style: NqType.caption.copyWith(color: c.tx3)),
          ],
        ),
      );

  Widget _offersAlert(NqColors c, List<OrderSummary> withOffers) {
    final total = withOffers.fold<int>(0, (s, o) => s + o.bidsCount);
    final first = withOffers.first;
    return GestureDetector(
      onTap: onOffers,
      behavior: HitTestBehavior.opaque,
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: c.warnBg,
          borderRadius: BorderRadius.circular(NqRadius.card),
        ),
        child: Row(
          children: [
            NqIcon(NqIcons.caretLeft, size: 18, color: c.tx3),
            const Spacer(),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text('$total عروض بانتظار قرارك',
                    style: NqType.bodyStrong.copyWith(color: c.tx)),
                const SizedBox(height: 2),
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text('${first.route} · ',
                        style: NqType.caption.copyWith(color: c.tx2)),
                    Ltr(first.orderNumber,
                        style: NqType.code(size: 12).copyWith(color: c.tx2)),
                  ],
                ),
              ],
            ),
            const SizedBox(width: 12),
            Container(
              width: 44,
              height: 44,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: c.sf,
                borderRadius: BorderRadius.circular(NqRadius.input),
              ),
              child: NqIcon(NqIcons.handCoins, size: 22, color: c.warn),
            ),
          ],
        ),
      ),
    );
  }
}
