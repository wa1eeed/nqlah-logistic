import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_exception.dart';
import '../../core/orders/order_models.dart';
import '../../core/orders/orders_repository.dart';
import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';
import '../../core/widgets/ltr.dart';
import '../../core/widgets/nq_icon.dart';
import '../../design_system/party_card.dart';
import '../../design_system/status_chip.dart';

/// Live tracking (handoff 1d): full-bleed styled map + freshness pill + a
/// bottom sheet with the next stop, status, progress and the provider row.
/// The map itself is a styled placeholder until a real maps SDK is wired; the
/// sheet and freshness are driven by `GET /orders/:id` (incl. tracking events).
class TrackingScreen extends ConsumerWidget {
  const TrackingScreen({super.key, required this.orderId});

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
          _truckMarker(c),
          _destFlag(c),
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  _circleBtn(context, c, NqIcons.arrowRight,
                      onTap: () => Navigator.of(context).maybePop()),
                  const Spacer(),
                  async.maybeWhen(
                    data: (o) => _freshnessPill(c, o),
                    orElse: () => const SizedBox.shrink(),
                  ),
                  const Spacer(),
                  _circleBtn(context, c, NqIcons.listBullets),
                ],
              ),
            ),
          ),
          Align(
            alignment: Alignment.bottomCenter,
            child: async.when(
              loading: () => _sheetShell(
                context,
                c,
                Center(
                  child: SizedBox(
                    width: 26,
                    height: 26,
                    child: CircularProgressIndicator(
                        strokeWidth: 2.5, color: c.mintTx),
                  ),
                ),
              ),
              error: (e, _) => _sheetShell(
                context,
                c,
                Text(
                  e is ApiException ? e.message : 'تعذّر تحميل التتبّع.',
                  style: NqType.body.copyWith(color: c.tx2),
                  textAlign: TextAlign.center,
                ),
              ),
              data: (o) => _sheet(context, c, o),
            ),
          ),
        ],
      ),
    );
  }

  Widget _circleBtn(BuildContext context, NqColors c, String icon,
          {VoidCallback? onTap}) =>
      GestureDetector(
        onTap: onTap,
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

  Widget _freshnessPill(NqColors c, OrderDetail o) {
    final last = o.tracking.isNotEmpty ? o.tracking.first.createdAt : null;
    final label = last != null ? relativeArabic(last) : 'لا تحديثات بعد';
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
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
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(label, style: NqType.label.copyWith(color: c.tx2)),
          const SizedBox(width: 8),
          Container(
              width: 7,
              height: 7,
              decoration: BoxDecoration(
                  color: last != null ? c.ok : c.tx3, shape: BoxShape.circle)),
        ],
      ),
    );
  }

  Widget _truckMarker(NqColors c) => const Align(
        alignment: Alignment(0.15, -0.05),
        child: _TruckMarker(),
      );

  Widget _destFlag(NqColors c) => Align(
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

  double _progressFor(NqStatus s) => switch (s) {
        NqStatus.delivered || NqStatus.completed => 1.0,
        NqStatus.inTransit => 0.55,
        NqStatus.assigned || NqStatus.confirmed => 0.1,
        _ => 0.0,
      };

  Widget _sheetShell(BuildContext context, NqColors c, Widget child) =>
      Container(
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
                      color: c.bd, borderRadius: BorderRadius.circular(2))),
            ),
            const SizedBox(height: 16),
            SizedBox(height: 80, child: child),
          ],
        ),
      );

  Widget _sheet(BuildContext context, NqColors c, OrderDetail o) {
    final latest = o.tracking.isNotEmpty ? o.tracking.first : null;
    final statusText = latest?.description.isNotEmpty == true
        ? latest!.description
        : 'الحالة: ${o.nqStatus.name}';
    final eta = o.actualDeliveryAt != null
        ? fmtTime(o.actualDeliveryAt)
        : fmtTime(o.deliveryDate);
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
                    color: c.bd, borderRadius: BorderRadius.circular(2))),
          ),
          const SizedBox(height: 14),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('الوصول المتوقع',
                      style: NqType.caption.copyWith(color: c.tx2)),
                  Ltr(eta,
                      style: NqType.numeric(20, FontWeight.w700)
                          .copyWith(color: c.tx)),
                ],
              ),
              const Spacer(),
              Flexible(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text('الوجهة',
                        style: NqType.caption.copyWith(color: c.tx2)),
                    Text('التفريغ · ${o.destinationCity}',
                        style: NqType.h2.copyWith(fontSize: 20, color: c.tx),
                        textAlign: TextAlign.right),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              NqStatusChip(o.nqStatus),
              const SizedBox(width: 10),
              Expanded(
                child: Text(statusText,
                    style: NqType.caption.copyWith(color: c.tx2),
                    textAlign: TextAlign.right,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis),
              ),
            ],
          ),
          const SizedBox(height: 14),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: _progressFor(o.nqStatus),
              minHeight: 8,
              backgroundColor: c.sf2,
              color: c.mintS,
            ),
          ),
          if (o.carrier != null) ...[
            const SizedBox(height: 14),
            Divider(color: c.bd, height: 1),
            const SizedBox(height: 14),
            NqPartyCard(
              initial: o.carrier!.nameAr.isNotEmpty
                  ? o.carrier!.nameAr.substring(0, 1)
                  : 'م',
              name: o.carrier!.nameAr,
              role: 'المزوّد · ينسّق مع السائق',
              phone: o.carrier!.phone,
              revealed: o.carrier!.phone != null,
              callFilled: true,
            ),
          ],
        ],
      ),
    );
  }
}

class _TruckMarker extends StatelessWidget {
  const _TruckMarker();

  @override
  Widget build(BuildContext context) {
    final c = context.nq;
    return Container(
      width: 52,
      height: 52,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: const Color(0x3800C9A7),
        shape: BoxShape.circle,
      ),
      child: Container(
        width: 38,
        height: 38,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: c.hero,
          shape: BoxShape.circle,
          border: Border.all(color: c.mint, width: 2),
        ),
        child: NqIcon(NqIcons.truck, fill: true, size: 18, color: NqFixed.heroText),
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
    canvas.drawLine(
        Offset(0, size.height * 0.55), Offset(size.width, size.height * 0.28), road);

    final truck = Offset(size.width * 0.575, size.height * 0.475);
    final dest = Offset(size.width * 0.275, size.height * 0.225);

    final solid = Paint()
      ..color = c.mintS
      ..strokeWidth = 5
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;
    final path = Path()
      ..moveTo(truck.dx, truck.dy)
      ..quadraticBezierTo(truck.dx + 20, size.height * 0.62, truck.dx - 10,
          size.height * 0.78);
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
