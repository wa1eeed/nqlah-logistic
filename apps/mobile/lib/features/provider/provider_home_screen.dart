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

/// Provider home (handoff 2d) — wired to the signed-in user + the carrier's
/// work (`mine=true`) and marketplace (`mine=false`). Fleet counts, receivables
/// and client messages need their own modules (follow-ups), so they are shown
/// as navigations / omitted rather than faked.
class ProviderHomeScreen extends ConsumerWidget {
  const ProviderHomeScreen({
    super.key,
    this.onBell,
    this.onAssign,
    this.onLoads,
    this.onFinance,
    this.onOpenOrder,
  });

  final VoidCallback? onBell;
  final void Function(String orderId)? onAssign;
  final VoidCallback? onLoads;
  final VoidCallback? onFinance;
  final void Function(String orderId)? onOpenOrder;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = context.nq;
    final user = ref.watch(authControllerProvider).user;
    final work = ref.watch(providerWorkProvider).valueOrNull ?? const [];
    final loads = ref.watch(marketplaceLoadsProvider).valueOrNull ?? const [];

    final awaiting =
        work.where((o) => o.status.toUpperCase() == 'ASSIGNED').toList();
    final inTransit =
        work.where((o) => o.status.toUpperCase() == 'IN_TRANSIT').length;
    final newLoads = loads.where((o) {
      final s = o.status.toUpperCase();
      return s == 'PUBLISHED' || s == 'BIDDING';
    }).length;
    final name = (user?.fullName.isNotEmpty ?? false) ? user!.fullName : 'مزوّد';

    return ListView(
      padding: EdgeInsets.zero,
      children: [
        _hero(context, c, name, awaiting.length, inTransit, newLoads),
        if (awaiting.isNotEmpty)
          Transform.translate(
            offset: const Offset(0, -24),
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 0),
              child: _assignCard(c, awaiting),
            ),
          )
        else
          const SizedBox(height: 20),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: [
                  Expanded(child: _newLoadsTile(c, newLoads)),
                  const SizedBox(width: 12),
                  Expanded(child: _financeTile(c)),
                ],
              ),
              const SizedBox(height: 24),
            ],
          ),
        ),
      ],
    );
  }

  Widget _hero(BuildContext context, NqColors c, String name, int awaiting,
          int inTransit, int newLoads) =>
      Container(
        color: c.hero,
        padding: EdgeInsets.fromLTRB(
            16, MediaQuery.of(context).padding.top + 12, 16, 30),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                GestureDetector(
                  onTap: onBell,
                  child: Container(
                    width: 44,
                    height: 44,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: NqFixed.heroFill2,
                      borderRadius: BorderRadius.circular(NqRadius.input),
                    ),
                    child:
                        NqIcon(NqIcons.bell, size: 22, color: NqFixed.heroText),
                  ),
                ),
                const Spacer(),
                Expanded(
                  flex: 6,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.end,
                        children: [
                          NqIcon(NqIcons.sealCheck,
                              fill: true, size: 16, color: NqFixed.heroAccent),
                          const SizedBox(width: 6),
                          Flexible(
                            child: Text(name,
                                style: NqType.h2
                                    .copyWith(color: NqFixed.heroText),
                                textAlign: TextAlign.right,
                                overflow: TextOverflow.ellipsis),
                          ),
                        ],
                      ),
                      const SizedBox(height: 2),
                      Text('مزوّد نقل',
                          style: NqType.caption
                              .copyWith(color: NqFixed.heroTextSecondary)),
                    ],
                  ),
                ),
                const SizedBox(width: 12),
                Container(
                  width: 44,
                  height: 44,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: NqFixed.heroFill2,
                    borderRadius: BorderRadius.circular(NqRadius.input),
                  ),
                  child: Text(name.isNotEmpty ? name.substring(0, 1) : 'م',
                      style: NqType.h3.copyWith(color: NqFixed.heroText)),
                ),
              ],
            ),
            const SizedBox(height: 18),
            Row(
              children: [
                _heroKpi(c, '$awaiting', 'بانتظار إسناد'),
                const SizedBox(width: 10),
                _heroKpi(c, '$inTransit', 'في الطريق'),
                const SizedBox(width: 10),
                _heroKpi(c, '$newLoads', 'أحمال جديدة'),
              ],
            ),
          ],
        ),
      );

  Widget _heroKpi(NqColors c, String value, String label) => Expanded(
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 12),
          decoration: BoxDecoration(
            color: NqFixed.heroFill1,
            borderRadius: BorderRadius.circular(NqRadius.button),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Ltr(value,
                  style: NqType.numeric(22, FontWeight.w700)
                      .copyWith(color: NqFixed.heroText)),
              const SizedBox(height: 2),
              Text(label,
                  style: NqType.caption
                      .copyWith(color: NqFixed.heroTextSecondary)),
            ],
          ),
        ),
      );

  Widget _assignCard(NqColors c, List<OrderSummary> awaiting) {
    final rows = awaiting.take(3).toList();
    return Container(
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
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
            child: Row(
              children: [
                Container(
                  width: 36,
                  height: 36,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: c.warnBg,
                    borderRadius: BorderRadius.circular(NqRadius.input),
                  ),
                  child: NqIcon(NqIcons.userPlus, size: 20, color: c.warn),
                ),
                const Spacer(),
                Text('بانتظار إسناد سائق',
                    style: NqType.h3.copyWith(color: c.tx)),
                const SizedBox(width: 10),
                Container(
                  width: 24,
                  height: 24,
                  alignment: Alignment.center,
                  decoration:
                      BoxDecoration(color: c.warnBg, shape: BoxShape.circle),
                  child: Text('${awaiting.length}',
                      style: NqType.caption.copyWith(
                          color: c.warn, fontWeight: FontWeight.w700)),
                ),
              ],
            ),
          ),
          for (var i = 0; i < rows.length; i++) ...[
            if (i > 0)
              Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: Divider(color: c.bd, height: 1)),
            _assignRow(c, rows[i]),
          ],
          const SizedBox(height: 8),
        ],
      ),
    );
  }

  Widget _assignRow(NqColors c, OrderSummary o) => GestureDetector(
        onTap: () => (onOpenOrder ?? (_) {})(o.id),
        behavior: HitTestBehavior.opaque,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          child: Row(
            children: [
              NqButton(
                  label: 'إسناد',
                  expand: false,
                  onPressed: () => (onAssign ?? (_) {})(o.id)),
              const Spacer(),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(o.route, style: NqType.h3.copyWith(color: c.tx)),
                  const SizedBox(height: 2),
                  Text(
                      '${truckLabel(o.requiredTruckType)} · ${fmtDate(o.pickupDate)}',
                      style: NqType.caption.copyWith(color: c.tx2)),
                ],
              ),
            ],
          ),
        ),
      );

  Widget _newLoadsTile(NqColors c, int count) => GestureDetector(
        onTap: onLoads,
        behavior: HitTestBehavior.opaque,
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: c.sf,
            borderRadius: BorderRadius.circular(NqRadius.card),
            border: Border.all(color: c.bd),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              NqIcon(NqIcons.magnifyingGlass, size: 20, color: c.tx2),
              const SizedBox(height: 12),
              Ltr('$count',
                  style:
                      NqType.numeric(26, FontWeight.w700).copyWith(color: c.tx)),
              const SizedBox(height: 2),
              Text('أحمال متاحة تناسب أسطولك',
                  style: NqType.caption.copyWith(color: c.tx2),
                  textAlign: TextAlign.right),
            ],
          ),
        ),
      );

  Widget _financeTile(NqColors c) => GestureDetector(
        onTap: onFinance,
        behavior: HitTestBehavior.opaque,
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: c.sf,
            borderRadius: BorderRadius.circular(NqRadius.card),
            border: Border.all(color: c.bd),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              NqIcon(NqIcons.wallet, size: 20, color: c.tx2),
              const SizedBox(height: 12),
              Text('المالية', style: NqType.h3.copyWith(color: c.tx)),
              const SizedBox(height: 2),
              Text('المستحقات والدفعات',
                  style: NqType.caption.copyWith(color: c.tx2),
                  textAlign: TextAlign.right),
            ],
          ),
        ),
      );
}
