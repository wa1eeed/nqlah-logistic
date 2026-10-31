import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/auth/auth_controller.dart';
import '../../core/fleet/fleet_repository.dart';
import '../../core/finance/finance_repository.dart';
import '../../core/orders/order_models.dart';
import '../../core/orders/orders_repository.dart';
import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';
import '../../core/widgets/ltr.dart';
import '../../core/widgets/nq_icon.dart';
import '../../design_system/button.dart';
import '../../design_system/confirm_dialog.dart';
import '../../design_system/context_switch.dart';

/// Owner-driver home — one screen with a context switch (handoff 1i «أعمل
/// كمزوّد» ↔ 2e «أقود الآن»). The shell owns the context + bottom-tab set.
///
/// Wired to the signed-in user + the carrier's own work (`providerWorkProvider`),
/// the marketplace, the fleet and finance. "إسناد لنفسي" assigns the owner's own
/// driver profile to the order; "سائق آخر" opens the assignment screen; the
/// driving actions open the customer chat / native maps; and the arrival button
/// enters the real trip-execution flow.
class OwnerDriverHomeScreen extends ConsumerWidget {
  const OwnerDriverHomeScreen({
    super.key,
    required this.driving,
    required this.onSwitch,
  });

  final bool driving;
  final ValueChanged<int> onSwitch;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = context.nq;
    final user = ref.watch(authControllerProvider).user;
    final work = ref.watch(providerWorkProvider).valueOrNull ?? const [];
    final trucks = ref.watch(fleetTrucksProvider).valueOrNull ?? const [];

    final name = (user?.fullName.isNotEmpty ?? false) ? user!.fullName : 'مزوّد';
    final plate = trucks.isNotEmpty ? trucks.first.plateNumber : null;

    final awaiting =
        work.where((o) => o.status.toUpperCase() == 'ASSIGNED').toList();
    final active =
        work.where((o) => o.status.toUpperCase() == 'IN_TRANSIT').toList();

    return SafeArea(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
            child: _header(c, name, plate),
          ),
          const SizedBox(height: 14),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: NqContextSwitch(
              index: driving ? 1 : 0,
              onChanged: onSwitch,
              options: [
                NqContextOption('أعمل كمزوّد', NqIcons.briefcase,
                    badge: awaiting.isNotEmpty ? awaiting.length : null),
                const NqContextOption('أقود الآن', NqIcons.steeringWheel),
              ],
            ),
          ),
          const SizedBox(height: 14),
          Expanded(
            child: driving
                ? _driving(context, c, active, work)
                : _provider(context, ref, c, user?.id, awaiting, work),
          ),
          if (driving && active.isNotEmpty)
            Container(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
              decoration: BoxDecoration(
                color: c.sf,
                border: Border(top: BorderSide(color: c.bd)),
              ),
              child: NqButton(
                label: 'تأكيد الوصول للاستلام',
                icon: NqIcons.mapPin,
                size: NqButtonSize.driver,
                onPressed: () => context.push('/trip-execution/${active.first.id}'),
              ),
            ),
        ],
      ),
    );
  }

  Widget _header(NqColors c, String name, String? plate) => Row(
        children: [
          if (!driving)
            Container(
              height: 32,
              padding: const EdgeInsets.symmetric(horizontal: 12),
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: c.okBg,
                borderRadius: BorderRadius.circular(NqRadius.pill),
              ),
              child: Row(mainAxisSize: MainAxisSize.min, children: [
                Container(width: 7, height: 7, decoration: BoxDecoration(color: c.ok, shape: BoxShape.circle)),
                const SizedBox(width: 6),
                Text('متاح', style: NqType.caption.copyWith(color: c.ok, fontWeight: FontWeight.w700)),
              ]),
            ),
          const Spacer(),
          Flexible(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Row(mainAxisSize: MainAxisSize.min, children: [
                  NqIcon(NqIcons.sealCheck, fill: true, size: 16, color: c.mintTx),
                  const SizedBox(width: 6),
                  Flexible(
                    child: Text(name,
                        style: NqType.h2.copyWith(color: c.tx),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis),
                  ),
                ]),
                const SizedBox(height: 2),
                Text(
                    driving
                        ? 'مزوّد · سائقه الوحيد'
                        : (plate != null ? 'مزوّد وسائق · $plate' : 'مزوّد وسائق'),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: NqType.caption.copyWith(color: c.tx2)),
              ],
            ),
          ),
          const SizedBox(width: 12),
          Container(
            width: 52,
            height: 52,
            alignment: Alignment.center,
            decoration: BoxDecoration(color: c.hero, shape: BoxShape.circle),
            child: Text(name.isNotEmpty ? name.characters.first : 'م',
                style: NqType.h1.copyWith(color: NqFixed.heroText)),
          ),
        ],
      );

  // ---- Provider context (1i) ----
  Widget _provider(BuildContext context, WidgetRef ref, NqColors c,
      String? userId, List<OrderSummary> awaiting, List<OrderSummary> work) {
    final loads = ref.watch(marketplaceLoadsProvider).valueOrNull ?? const [];
    final payments = ref.watch(paymentsProvider).valueOrNull ?? const [];
    final now = DateTime.now();
    final monthEarnings = payments
        .where((p) =>
            p.isReleased &&
            p.releasedAt != null &&
            p.releasedAt!.year == now.year &&
            p.releasedAt!.month == now.month)
        .fold<num>(0, (s, p) => s + p.totalAmount);
    final newLoads = loads.where((o) {
      final s = o.status.toUpperCase();
      return s == 'PUBLISHED' || s == 'BIDDING';
    }).length;
    final upcoming =
        work.where((o) => o.status.toUpperCase() == 'CONFIRMED').toList();

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
      children: [
        if (awaiting.isNotEmpty)
          _acceptedCard(context, c, userId, awaiting.first)
        else
          _emptyCard(c, NqIcons.checkCircle, 'لا طلبات بانتظار الإسناد'),
        const SizedBox(height: 14),
        Row(
          children: [
            Expanded(child: _earningsTile(context, c, monthEarnings)),
            const SizedBox(width: 12),
            Expanded(child: _matchesTile(c, newLoads)),
          ],
        ),
        const SizedBox(height: 18),
        Row(children: [
          Text('كل الرحلات', style: NqType.labelStrong.copyWith(color: c.mintTx)),
          const Spacer(),
          Text('رحلتي القادمة', style: NqType.h2.copyWith(color: c.tx)),
        ]),
        const SizedBox(height: 10),
        if (upcoming.isNotEmpty)
          _upcomingTrip(c, upcoming.first)
        else
          _emptyCard(c, NqIcons.truck, 'لا رحلات قادمة'),
      ],
    );
  }

  Widget _acceptedCard(BuildContext context, NqColors c,
          String? userId, OrderSummary o) =>
      Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: c.warnBg,
          borderRadius: BorderRadius.circular(NqRadius.card),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(children: [
              const Spacer(),
              Text('مقبول · بانتظار إسناد سائق',
                  style: NqType.labelStrong.copyWith(color: c.warn)),
              const SizedBox(width: 6),
              NqIcon(NqIcons.warningCircle, size: 16, color: c.warn),
            ]),
            const SizedBox(height: 12),
            Row(children: [
              if (o.agreedPrice != null || o.clientBudget != null)
                Ltr(_grouped(((o.agreedPrice ?? o.clientBudget)!).round()),
                    style: NqType.price(size: 20).copyWith(color: c.tx)),
              const Spacer(),
              Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                Text(o.route, style: NqType.h2.copyWith(color: c.tx)),
                const SizedBox(height: 2),
                Text('${o.orderNumber} · ${fmtDate(o.pickupDate)}',
                    style: NqType.caption.copyWith(color: c.tx2)),
              ]),
            ]),
            const SizedBox(height: 14),
            Row(children: [
              NqButton(
                  label: 'سائق آخر',
                  variant: NqButtonVariant.secondary,
                  expand: false,
                  onPressed: () => context.push('/driver-assignment/${o.id}')),
              const SizedBox(width: 12),
              Expanded(
                child: NqButton(
                    label: 'إسناد لنفسي',
                    icon: NqIcons.steeringWheel,
                    onPressed: () => _selfAssign(context, o.id, userId)),
              ),
            ]),
          ],
        ),
      );

  Future<void> _selfAssign(
      BuildContext context, String orderId, String? userId) async {
    // Capture objects that outlive this widget so nothing touches `ref` across
    // an await gap (the ConsumerWidget element may rebuild on invalidation).
    final messenger = ScaffoldMessenger.of(context);
    final container = ProviderScope.containerOf(context);
    final fleet = container.read(fleetRepositoryProvider);
    final orders = container.read(ordersRepositoryProvider);
    if (!await nqConfirm(context,
        title: 'إسناد الرحلة لك',
        message: 'ستُسنَد هذه الرحلة إليك كسائق وتُؤكَّد مباشرةً لتصبح ضمن رحلاتك القادمة. متابعة؟',
        confirmLabel: 'إسنادها لي',
        icon: NqIcons.steeringWheel)) {
      return;
    }
    try {
      final drivers = await fleet.drivers();
      if (drivers.isEmpty) {
        messenger.showSnackBar(const SnackBar(
            content: Text('لا يوجد ملف سائق مرتبط بحسابك')));
        return;
      }
      // The owner's own driver profile, else the sole fleet driver.
      final mine = drivers.where((d) => d.userId != null && d.userId == userId);
      final driverId = mine.isNotEmpty ? mine.first.id : drivers.first.id;
      // Assign the owner as the driver, then confirm — for an owner-driver the
      // two are one act, advancing the order ASSIGNED → CONFIRMED so it leaves
      // the "awaiting" card and becomes their upcoming trip.
      await orders.assignDriver(orderId, driverId);
      await orders.confirmOrder(orderId);
      container.invalidate(providerWorkProvider);
      messenger.showSnackBar(
          const SnackBar(content: Text('تم إسناد الرحلة لك')));
    } catch (_) {
      messenger.showSnackBar(
          const SnackBar(content: Text('تعذّر الإسناد. حاول مجددًا.')));
    }
  }

  Widget _earningsTile(BuildContext context, NqColors c, num earnings) =>
      GestureDetector(
        onTap: () => context.push('/finance'),
        behavior: HitTestBehavior.opaque,
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: c.sf,
            borderRadius: BorderRadius.circular(NqRadius.card),
            border: Border.all(color: c.bd),
          ),
          child: Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
            NqIcon(NqIcons.wallet, size: 20, color: c.tx2),
            const SizedBox(height: 12),
            FittedBox(
              fit: BoxFit.scaleDown,
              alignment: Alignment.centerRight,
              child: Ltr(_grouped(earnings.round()),
                  style:
                      NqType.numeric(26, FontWeight.w700).copyWith(color: c.tx)),
            ),
            const SizedBox(height: 2),
            Text('أرباح هذا الشهر · ر.س',
                style: NqType.caption.copyWith(color: c.tx2)),
          ]),
        ),
      );

  Widget _matchesTile(NqColors c, int count) => Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: c.hero,
          borderRadius: BorderRadius.circular(NqRadius.card),
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
          NqIcon(NqIcons.magnifyingGlass, size: 20, color: NqFixed.heroTextSecondary),
          const SizedBox(height: 12),
          FittedBox(
            fit: BoxFit.scaleDown,
            alignment: Alignment.centerRight,
            child: Ltr('$count',
                style: NqType.numeric(26, FontWeight.w700)
                    .copyWith(color: NqFixed.heroText)),
          ),
          const SizedBox(height: 2),
          Text('حمولة تناسب شاحنتك',
              style: NqType.caption.copyWith(color: NqFixed.heroTextSecondary)),
        ]),
      );

  Widget _upcomingTrip(NqColors c, OrderSummary o) => Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: c.sf,
          borderRadius: BorderRadius.circular(NqRadius.card),
          border: Border.all(color: c.bd),
        ),
        child: Row(children: [
          _statusPill(c, 'مؤكّدة', c.mintTx, c.mintBg),
          const Spacer(),
          Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
            Text(o.route, style: NqType.h3.copyWith(color: c.tx)),
            const SizedBox(height: 2),
            Text(truckLabel(o.requiredTruckType),
                style: NqType.caption.copyWith(color: c.tx2)),
          ]),
          const SizedBox(width: 12),
          _dateTile(c, fmtDate(o.pickupDate), ''),
        ]),
      );

  // ---- Driving context (2e) ----
  Widget _driving(BuildContext context, NqColors c,
      List<OrderSummary> active, List<OrderSummary> work) {
    final today = DateTime.now();
    final todays = work.where((o) {
      final d = o.pickupDate;
      return d != null &&
          d.year == today.year &&
          d.month == today.month &&
          d.day == today.day;
    }).toList();

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
      children: [
        if (active.isNotEmpty)
          _activeTripCard(context, c, active.first)
        else
          _emptyCard(c, NqIcons.truck, 'لا رحلة نشطة حاليًا'),
        const SizedBox(height: 18),
        Text('رحلات اليوم',
            style: NqType.labelStrong.copyWith(color: c.tx2),
            textAlign: TextAlign.right),
        const SizedBox(height: 10),
        if (todays.isEmpty)
          _emptyCard(c, NqIcons.calendarBlank, 'لا رحلات اليوم')
        else
          for (final o in todays) ...[
            _todayRow(c, o),
            const SizedBox(height: 10),
          ],
      ],
    );
  }

  Widget _todayRow(NqColors c, OrderSummary o) => Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: c.sf,
          borderRadius: BorderRadius.circular(NqRadius.card),
          border: Border.all(color: c.bd),
        ),
        child: Row(children: [
          _statusPill(c, 'مؤكّدة', c.mintTx, c.mintBg),
          const Spacer(),
          Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
            Text(o.route, style: NqType.h3.copyWith(color: c.tx)),
            const SizedBox(height: 2),
            Text(truckLabel(o.requiredTruckType),
                style: NqType.caption.copyWith(color: c.tx2)),
          ]),
          const SizedBox(width: 12),
          Ltr(fmtDate(o.pickupDate),
              style: NqType.numeric(14, FontWeight.w700).copyWith(color: c.tx)),
        ]),
      );

  Widget _activeTripCard(
          BuildContext context, NqColors c, OrderSummary o) =>
      Container(
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
                decoration: BoxDecoration(color: c.infoBg, borderRadius: BorderRadius.circular(NqRadius.pill)),
                child: Row(mainAxisSize: MainAxisSize.min, children: [
                  NqIcon(NqIcons.truck, fill: true, size: 14, color: c.info),
                  const SizedBox(width: 6),
                  Text('في الطريق',
                      style: NqType.caption.copyWith(color: c.info, fontWeight: FontWeight.w700)),
                ]),
              ),
              const Spacer(),
              Ltr(o.orderNumber, style: NqType.code(size: 13).copyWith(color: c.tx2)),
            ]),
            const SizedBox(height: 12),
            Text('استلام · ${o.originCity}',
                style: NqType.driverTitle.copyWith(color: c.tx), textAlign: TextAlign.right),
            const SizedBox(height: 4),
            Row(children: [
              const Spacer(),
              Text('الوجهة ${o.destinationCity}',
                  style: NqType.caption.copyWith(color: c.tx2)),
            ]),
            const SizedBox(height: 14),
            Row(children: [
              Expanded(
                  child: NqButton(
                      label: 'العميل',
                      icon: NqIcons.chats,
                      variant: NqButtonVariant.secondary,
                      onPressed: () => context.push('/chat/${o.id}',
                          extra: o.clientName))),
              const SizedBox(width: 12),
              Expanded(
                  child: NqButton(
                      label: 'فتح الخرائط',
                      icon: NqIcons.navigationArrow,
                      variant: NqButtonVariant.secondary,
                      onPressed: () => _openMaps(o.originCity))),
            ]),
            const SizedBox(height: 12),
            Row(children: [
              const Spacer(),
              Text('تتواصل مع العميل بصفتك المزوّد المتعاقد',
                  style: NqType.caption.copyWith(color: c.tx2)),
              const SizedBox(width: 6),
              NqIcon(NqIcons.info, size: 14, color: c.tx3),
            ]),
          ],
        ),
      );

  Future<void> _openMaps(String query) async {
    final q = Uri.encodeComponent(query.trim());
    if (q.isEmpty) return;
    final uri = Uri.parse('https://www.google.com/maps/search/?api=1&query=$q');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  Widget _emptyCard(NqColors c, String icon, String label) => Container(
        padding: const EdgeInsets.symmetric(vertical: 26),
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: c.sf,
          borderRadius: BorderRadius.circular(NqRadius.card),
          border: Border.all(color: c.bd),
        ),
        child: Column(children: [
          NqIcon(icon, size: 24, color: c.tx2),
          const SizedBox(height: 10),
          Text(label, style: NqType.caption.copyWith(color: c.tx2)),
        ]),
      );

  Widget _statusPill(NqColors c, String label, Color fg, Color bg) => Container(
        height: 28,
        padding: const EdgeInsets.symmetric(horizontal: 10),
        decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(NqRadius.pill)),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          NqIcon(NqIcons.checkCircle, size: 14, color: fg),
          const SizedBox(width: 6),
          Text(label, style: NqType.caption.copyWith(color: fg, fontWeight: FontWeight.w700)),
        ]),
      );

  Widget _dateTile(NqColors c, String day, String time) => Container(
        width: 64,
        padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 4),
        decoration: BoxDecoration(color: c.sf2, borderRadius: BorderRadius.circular(NqRadius.button)),
        child: Column(children: [
          Ltr(day, style: NqType.caption.copyWith(color: c.tx), textAlign: TextAlign.center),
          if (time.isNotEmpty)
            Ltr(time, style: NqType.numeric(16, FontWeight.w700).copyWith(color: c.tx)),
        ]),
      );
}

/// 8450 → "8,450".
String _grouped(int n) {
  final s = n.abs().toString();
  final buf = StringBuffer(n < 0 ? '-' : '');
  for (var i = 0; i < s.length; i++) {
    if (i > 0 && (s.length - i) % 3 == 0) buf.write(',');
    buf.write(s[i]);
  }
  return buf.toString();
}
