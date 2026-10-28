import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/orders/order_models.dart';
import '../../core/orders/orders_repository.dart';
import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';
import '../../core/widgets/ltr.dart';
import '../../core/widgets/nq_icon.dart';
import '../../design_system/party_card.dart';

/// Trip monitor — provider view of a running trip (handoff 3d): a sheet with
/// the next stop, the driver (provider-only) and provider actions, over a map.
///
/// Wired to `GET /orders/:id`. The map itself is a styled placeholder until a
/// real maps SDK is wired (see the maps follow-up); the live-location pills
/// (freshness / remaining distance) appear once location telemetry is
/// available. Driver data is never shown to the customer.
class TripMonitorScreen extends ConsumerWidget {
  const TripMonitorScreen({super.key, required this.orderId});

  final String orderId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = context.nq;
    final async = ref.watch(orderDetailModelProvider(orderId));
    return Scaffold(
      backgroundColor: c.map,
      body: Stack(
        children: [
          Positioned.fill(child: CustomPaint(painter: _MapPainter(c))),
          const Align(alignment: Alignment(0.15, -0.05), child: _Truck()),
          _flag(c),
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  _circleBtn(context, c, NqIcons.arrowRight),
                  const Spacer(),
                  _codePill(c, async.valueOrNull?.orderNumber ?? '—'),
                ],
              ),
            ),
          ),
          Align(
            alignment: Alignment.bottomCenter,
            child: async.when(
              loading: () => _sheetShell(
                  context, c, const Center(child: CircularProgressIndicator())),
              error: (e, _) => _sheetShell(
                  context,
                  c,
                  Text('تعذّر تحميل الرحلة',
                      style: NqType.body.copyWith(color: c.tx2))),
              data: (o) => _sheet(context, ref, c, o),
            ),
          ),
        ],
      ),
    );
  }

  Widget _circleBtn(BuildContext context, NqColors c, String icon) =>
      GestureDetector(
        onTap: () => Navigator.of(context).maybePop(),
        child: Container(
          width: 44,
          height: 44,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: c.sf,
            borderRadius: BorderRadius.circular(NqRadius.input),
            boxShadow: [
              BoxShadow(
                  color: const Color(0x1F0A1A19),
                  blurRadius: 12,
                  offset: const Offset(0, 4)),
            ],
          ),
          child: NqIcon(icon, size: 20, color: c.tx),
        ),
      );

  Widget _codePill(NqColors c, String code) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        decoration: BoxDecoration(
          color: c.sf,
          borderRadius: BorderRadius.circular(NqRadius.pill),
          boxShadow: [
            BoxShadow(
                color: const Color(0x1F0A1A19),
                blurRadius: 12,
                offset: const Offset(0, 4)),
          ],
        ),
        child: Ltr(code, style: NqType.code(size: 14).copyWith(color: c.tx)),
      );

  Widget _flag(NqColors c) => Align(
        alignment: const Alignment(-0.45, -0.55),
        child: Container(
          width: 28,
          height: 28,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: c.err,
            shape: BoxShape.circle,
            border: Border.all(color: Colors.white, width: 3),
          ),
          child: NqIcon(NqIcons.flagCheckered,
              fill: true, size: 14, color: Colors.white),
        ),
      );

  Widget _sheetShell(BuildContext context, NqColors c, Widget child) =>
      Container(
        width: double.infinity,
        padding: EdgeInsets.fromLTRB(
            16, 24, 16, 24 + MediaQuery.of(context).padding.bottom),
        decoration: BoxDecoration(
          color: c.sf,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
        ),
        child: Center(child: child),
      );

  Widget _sheet(
      BuildContext context, WidgetRef ref, NqColors c, OrderDetail o) {
    final late = _isLate(o);
    final driver = o.driverName;
    return Container(
      width: double.infinity,
      padding: EdgeInsets.fromLTRB(
          16, 10, 16, 16 + MediaQuery.of(context).padding.bottom),
      decoration: BoxDecoration(
        color: c.sf,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
        boxShadow: [
          BoxShadow(
              color: const Color(0x40000000),
              blurRadius: 30,
              offset: const Offset(0, -10),
              spreadRadius: -12),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Center(
              child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                      color: c.bd, borderRadius: BorderRadius.circular(2)))),
          const SizedBox(height: 14),
          if (late) ...[
            _lateBanner(c, o),
            const SizedBox(height: 14),
          ],
          Row(children: [
            Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('الحالة', style: NqType.caption.copyWith(color: c.tx2)),
              Text(_statusLabel(o.status),
                  style: NqType.numeric(18, FontWeight.w700).copyWith(color: c.tx)),
            ]),
            const Spacer(),
            Flexible(
              child: Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                Text('التوقف التالي',
                    style: NqType.caption.copyWith(color: c.tx2)),
                Text('التفريغ · ${o.destinationCity}',
                    style: NqType.h2.copyWith(fontSize: 20, color: c.tx),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    textAlign: TextAlign.right),
              ]),
            ),
          ]),
          const SizedBox(height: 14),
          Divider(color: c.bd, height: 1),
          const SizedBox(height: 14),
          if (driver != null && driver.isNotEmpty)
            NqPartyCard(
              initial: driver.characters.first,
              name: driver,
              role: truckLabel(o.requiredTruckType),
              phone: o.driverPhone,
              callFilled: true,
              onChat: () => context.push('/chat/$orderId'),
            )
          else
            _noDriver(c),
          const SizedBox(height: 12),
          Row(children: [
            Expanded(
                child: _outlineBtn(c, 'تحديث الموقع', NqIcons.broadcast,
                    () => ref.invalidate(orderDetailModelProvider(orderId)))),
            const SizedBox(width: 12),
            Expanded(
                child: _outlineBtn(c, 'إبلاغ العميل', NqIcons.chats,
                    () => context.push('/chat/$orderId'))),
          ]),
          const SizedBox(height: 12),
          Row(children: [
            const Spacer(),
            Expanded(
              child: Text('العميل يرى الحالة والموقع فقط، لا يرى بيانات السائق',
                  style: NqType.caption.copyWith(color: c.tx2),
                  textAlign: TextAlign.right),
            ),
            const SizedBox(width: 6),
            NqIcon(NqIcons.info, size: 14, color: c.tx3),
          ]),
        ],
      ),
    );
  }

  Widget _noDriver(NqColors c) => Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
            color: c.sf2, borderRadius: BorderRadius.circular(NqRadius.button)),
        child: Row(children: [
          const Spacer(),
          Text('لم يُسنَد سائق بعد',
              style: NqType.caption.copyWith(color: c.tx2)),
          const SizedBox(width: 8),
          NqIcon(NqIcons.steeringWheel, size: 18, color: c.tx2),
        ]),
      );

  Widget _lateBanner(NqColors c, OrderDetail o) => Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
            color: c.errBg, borderRadius: BorderRadius.circular(NqRadius.button)),
        child: Row(children: [
          NqIcon(NqIcons.warningOctagon, size: 20, color: c.err),
          const Spacer(),
          Flexible(
            child: Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
              Text('متأخر عن الموعد المتفق',
                  style: NqType.bodyStrong.copyWith(color: c.err),
                  textAlign: TextAlign.right),
              if (o.deliveryDate != null) ...[
                const SizedBox(height: 2),
                Text('الموعد ${_dmy(o.deliveryDate!)}',
                    style: NqType.caption.copyWith(color: c.tx2)),
              ],
            ]),
          ),
        ]),
      );

  Widget _outlineBtn(
          NqColors c, String label, String icon, VoidCallback onTap) =>
      GestureDetector(
        onTap: onTap,
        child: Container(
          height: 48,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(NqRadius.button),
            border: Border.all(color: c.bd),
          ),
          child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              mainAxisSize: MainAxisSize.min,
              children: [
                NqIcon(icon, size: 18, color: c.tx),
                const SizedBox(width: 8),
                Text(label, style: NqType.labelStrong.copyWith(color: c.tx)),
              ]),
        ),
      );

  static bool _isLate(OrderDetail o) {
    final due = o.deliveryDate;
    if (due == null) return false;
    const openStatuses = {'ASSIGNED', 'CONFIRMED', 'IN_TRANSIT'};
    return openStatuses.contains(o.status.toUpperCase()) &&
        DateTime.now().isAfter(due);
  }

  static String _statusLabel(String status) {
    switch (status.toUpperCase()) {
      case 'IN_TRANSIT':
        return 'في الطريق';
      case 'CONFIRMED':
        return 'مؤكّدة';
      case 'ASSIGNED':
        return 'مُسندة';
      case 'DELIVERED':
        return 'تم التسليم';
      default:
        return status;
    }
  }

  static String _dmy(DateTime d) =>
      '${d.day.toString().padLeft(2, '0')}/${d.month.toString().padLeft(2, '0')}/${d.year}';
}

class _Truck extends StatelessWidget {
  const _Truck();

  @override
  Widget build(BuildContext context) {
    final c = context.nq;
    return Container(
      width: 52,
      height: 52,
      alignment: Alignment.center,
      decoration:
          const BoxDecoration(color: Color(0x3800C9A7), shape: BoxShape.circle),
      child: Container(
        width: 38,
        height: 38,
        alignment: Alignment.center,
        decoration: BoxDecoration(
            color: c.hero,
            shape: BoxShape.circle,
            border: Border.all(color: c.mint, width: 2)),
        child: NqIcon(NqIcons.truck,
            fill: true, size: 18, color: NqFixed.heroText),
      ),
    );
  }
}

class _MapPainter extends CustomPainter {
  _MapPainter(this.c);
  final NqColors c;

  @override
  void paint(Canvas canvas, Size size) {
    final grid = Paint()
      ..color = c.road
      ..strokeWidth = 1.5;
    const step = 90.0;
    for (double x = 0; x <= size.width; x += step) {
      canvas.drawLine(Offset(x, 0), Offset(x, size.height), grid);
    }
    for (double y = 0; y <= size.height; y += step) {
      canvas.drawLine(Offset(0, y), Offset(size.width, y), grid);
    }
    final road = Paint()
      ..color = c.road
      ..strokeWidth = 16
      ..strokeCap = StrokeCap.round;
    canvas.drawLine(Offset(0, size.height * 0.55),
        Offset(size.width, size.height * 0.28), road);

    final truck = Offset(size.width * 0.575, size.height * 0.475);
    final dest = Offset(size.width * 0.275, size.height * 0.225);
    final solid = Paint()
      ..color = c.mintS
      ..strokeWidth = 5
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;
    final path = Path()
      ..moveTo(truck.dx, truck.dy)
      ..quadraticBezierTo(
          truck.dx + 20, size.height * 0.62, truck.dx - 10, size.height * 0.78);
    canvas.drawPath(path, solid);
    final dot = Paint()..color = c.mintS;
    final total = (dest - truck).distance;
    final dir = (dest - truck) / total;
    for (double d = 0; d < total; d += 16) {
      canvas.drawCircle(truck + dir * d, 3, dot);
    }
  }

  @override
  bool shouldRepaint(_MapPainter old) => false;
}
