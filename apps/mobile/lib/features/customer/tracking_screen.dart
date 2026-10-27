import 'package:flutter/material.dart';

import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';
import '../../core/widgets/ltr.dart';
import '../../core/widgets/nq_icon.dart';
import '../../design_system/party_card.dart';

/// Live tracking (handoff 1d): full-bleed styled map + freshness pill + a
/// bottom sheet with the next stop, ETA, progress and the provider row.
/// The map is a styled placeholder until the real SDK is wired.
class TrackingScreen extends StatelessWidget {
  const TrackingScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final c = context.nq;
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
                  _circleBtn(c, NqIcons.arrowRight),
                  const Spacer(),
                  _freshnessPill(c),
                  const Spacer(),
                  _circleBtn(c, NqIcons.listBullets),
                ],
              ),
            ),
          ),
          Align(alignment: Alignment.bottomCenter, child: _sheet(context, c)),
        ],
      ),
    );
  }

  Widget _circleBtn(NqColors c, String icon) => Container(
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
      );

  Widget _freshnessPill(NqColors c) => Container(
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
            Ltr('30s', style: NqType.numeric(13, FontWeight.w600).copyWith(color: c.tx)),
            Text(' مباشر · قبل ', style: NqType.label.copyWith(color: c.tx2)),
            Container(
                width: 7,
                height: 7,
                decoration: BoxDecoration(color: c.ok, shape: BoxShape.circle)),
          ],
        ),
      );

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
          child: NqIcon(NqIcons.flagCheckered, fill: true, size: 14, color: Colors.white),
        ),
      );

  Widget _sheet(BuildContext context, NqColors c) {
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
          const SizedBox(height: 16),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('الوصول المتوقع',
                      style: NqType.caption.copyWith(color: c.tx2)),
                  Ltr('14:20',
                      style: NqType.numeric(20, FontWeight.w700).copyWith(color: c.tx)),
                ],
              ),
              const Spacer(),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text('التوقف التالي',
                      style: NqType.caption.copyWith(color: c.tx2)),
                  Text('التفريغ · الرياض',
                      style: NqType.h2.copyWith(fontSize: 20, color: c.tx)),
                ],
              ),
            ],
          ),
          const SizedBox(height: 14),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: 0.53,
              minHeight: 8,
              backgroundColor: c.sf2,
              color: c.mintS,
            ),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Text('متبقٍ 186 km · حسب المسار',
                  style: NqType.caption.copyWith(color: c.tx2)),
              const Spacer(),
              Text('قُطع 212 km', style: NqType.caption.copyWith(color: c.tx2)),
            ],
          ),
          const SizedBox(height: 14),
          Divider(color: c.bd, height: 1),
          const SizedBox(height: 14),
          const NqPartyCard(
            initial: 'أ',
            name: 'شركة الأفق للنقل',
            role: 'المزوّد · ينسّق مع السائق',
            callFilled: true,
          ),
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

    // A wide road diagonal.
    final road = Paint()
      ..color = c.road
      ..strokeWidth = 16
      ..strokeCap = StrokeCap.round;
    canvas.drawLine(
        Offset(0, size.height * 0.55), Offset(size.width, size.height * 0.28), road);

    // Truck position and destination (match the aligned markers roughly).
    final truck = Offset(size.width * 0.575, size.height * 0.475);
    final dest = Offset(size.width * 0.275, size.height * 0.225);

    // Travelled: solid curve below the truck.
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

    // Remaining: dotted line from truck to destination.
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
