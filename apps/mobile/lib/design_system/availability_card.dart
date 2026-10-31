import 'package:flutter/material.dart';

import '../core/theme/tokens.dart';
import '../core/theme/typography.dart';
import '../core/widgets/ltr.dart';
import '../core/widgets/nq_icon.dart';
import 'pressable.dart';
import 'waybill_card.dart' show RoutePoint;

class MetaItem {
  const MetaItem(this.icon, this.text, {this.ltr = false});
  final String icon;
  final String text;
  final bool ltr; // true for numeric + latin values (e.g. "24 t")
}

/// A truck-availability card (Addendum-01 6a). Backhaul / available-now badge,
/// a route strip, a 2×2 meta grid, a perforation, and a provider + price row.
class NqAvailabilityCard extends StatelessWidget {
  const NqAvailabilityCard({
    super.key,
    required this.isBackhaul,
    required this.date,
    required this.origin,
    required this.destination,
    required this.meta,
    required this.providerInitial,
    required this.providerName,
    required this.providerMeta,
    this.price,
    this.priceNote,
    this.destDim = false,
    this.onTap,
  });

  final bool isBackhaul;
  final String date;
  final RoutePoint origin;
  final RoutePoint destination;
  final bool destDim;
  final List<MetaItem> meta; // 4 items
  final String providerInitial;
  final String providerName;
  final String providerMeta; // "★ 4.8 · 312 رحلة"
  final String? price; // "1,650"
  final String? priceNote; // "السعر بعد الطلب"
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final c = context.nq;
    return Pressable(
      enabled: onTap != null,
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(
          color: c.sf,
          borderRadius: BorderRadius.circular(NqRadius.card),
          border: Border.all(color: c.bd),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 14, 16, 12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  _topRow(c),
                  const SizedBox(height: 14),
                  _routeStrip(c),
                  const SizedBox(height: 14),
                  _metaGrid(c),
                ],
              ),
            ),
            _perforation(c),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 14),
              child: _providerRow(c),
            ),
          ],
        ),
      ),
    );
  }

  Widget _topRow(NqColors c) {
    return Row(
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
          decoration: BoxDecoration(
            color: isBackhaul ? c.mintBg : c.okBg,
            borderRadius: BorderRadius.circular(NqRadius.pill),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              NqIcon(isBackhaul ? NqIcons.arrowUDownLeft : NqIcons.checkCircle,
                  size: 14, color: isBackhaul ? c.mintTx : c.ok),
              const SizedBox(width: 6),
              Text(isBackhaul ? 'رحلة عودة' : 'متاحة الآن',
                  style: NqType.caption.copyWith(
                      color: isBackhaul ? c.mintTx : c.ok,
                      fontWeight: FontWeight.w700)),
            ],
          ),
        ),
        const Spacer(),
        Text(date, style: NqType.caption.copyWith(color: c.tx2)),
        const SizedBox(width: 6),
        NqIcon(NqIcons.calendarBlank, size: 16, color: c.tx2),
      ],
    );
  }

  Widget _routeStrip(NqColors c) {
    Widget place(RoutePoint p, {bool dim = false}) => Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(p.city, style: NqType.h2.copyWith(color: dim ? c.tx2 : c.tx)),
            Text(p.area, style: NqType.caption.copyWith(color: c.tx2)),
          ],
        );
    return Row(
      children: [
        place(origin),
        const SizedBox(width: 10),
        Expanded(
          child: SizedBox(
            height: 30,
            child: Directionality(
              textDirection: TextDirection.ltr,
              child: Row(
                children: [
                  Container(
                      width: 12,
                      height: 12,
                      decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          border: Border.all(color: c.tx3, width: 2))),
                  Expanded(child: _dashed(c)),
                  Container(
                    width: 30,
                    height: 30,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(color: c.mintBg, shape: BoxShape.circle),
                    child: Transform.flip(
                        flipX: true,
                        child: NqIcon(NqIcons.truck,
                            fill: true, size: 16, color: c.mintTx)),
                  ),
                  Expanded(child: _dashed(c)),
                  Container(
                      width: 10,
                      height: 10,
                      decoration: BoxDecoration(color: c.mint, shape: BoxShape.circle)),
                ],
              ),
            ),
          ),
        ),
        const SizedBox(width: 10),
        place(destination, dim: destDim),
      ],
    );
  }

  Widget _dashed(NqColors c) =>
      CustomPaint(size: const Size(double.infinity, 2), painter: _DashPainter(c.bd));

  Widget _metaGrid(NqColors c) {
    Widget cell(MetaItem m) => Row(
          children: [
            NqIcon(m.icon, size: 16, color: c.tx2),
            const SizedBox(width: 6),
            Expanded(
              child: m.ltr
                  ? Align(
                      alignment: Alignment.centerRight,
                      child: Ltr(m.text,
                          style: NqType.label.copyWith(color: c.tx2)),
                    )
                  : Text(m.text,
                      style: NqType.label.copyWith(color: c.tx2),
                      textAlign: TextAlign.right,
                      overflow: TextOverflow.ellipsis),
            ),
          ],
        );
    return Column(
      children: [
        Row(children: [
          Expanded(child: cell(meta[0])),
          const SizedBox(width: 12),
          Expanded(child: cell(meta[1])),
        ]),
        const SizedBox(height: 10),
        Row(children: [
          Expanded(child: cell(meta[2])),
          const SizedBox(width: 12),
          Expanded(child: cell(meta[3])),
        ]),
      ],
    );
  }

  Widget _providerRow(NqColors c) {
    return Row(
      children: [
        if (price != null)
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('يبدأ من', style: NqType.caption.copyWith(color: c.tx2)),
              Row(children: [
                Ltr(price!, style: NqType.price(size: 17).copyWith(color: c.tx)),
                const SizedBox(width: 3),
                Text('⃁', style: NqType.caption.copyWith(color: c.tx2)),
              ]),
            ],
          )
        else
          Text(priceNote ?? '', style: NqType.caption.copyWith(color: c.tx2)),
        const Spacer(),
        Column(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Row(mainAxisSize: MainAxisSize.min, children: [
              NqIcon(NqIcons.sealCheck, fill: true, size: 15, color: c.mintTx),
              const SizedBox(width: 6),
              Text(providerName, style: NqType.bodyStrong.copyWith(color: c.tx)),
            ]),
            const SizedBox(height: 2),
            Text(providerMeta, style: NqType.caption.copyWith(color: c.tx2)),
          ],
        ),
        const SizedBox(width: 12),
        Container(
          width: 36,
          height: 36,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: c.hero,
            borderRadius: BorderRadius.circular(NqRadius.input),
          ),
          child: Text(providerInitial,
              style: NqType.labelStrong.copyWith(color: NqFixed.heroText)),
        ),
      ],
    );
  }

  Widget _perforation(NqColors c) => SizedBox(
        height: 18,
        child: Stack(
          alignment: Alignment.center,
          children: [
            Padding(
                padding: const EdgeInsets.symmetric(horizontal: 9),
                child: _dashed(c)),
            Align(
              alignment: Alignment.centerLeft,
              child: Transform.translate(
                  offset: const Offset(-9, 0), child: _cut(c)),
            ),
            Align(
              alignment: Alignment.centerRight,
              child: Transform.translate(
                  offset: const Offset(9, 0), child: _cut(c)),
            ),
          ],
        ),
      );

  Widget _cut(NqColors c) => Container(
        width: 18,
        height: 18,
        decoration: BoxDecoration(
            color: c.bg, shape: BoxShape.circle, border: Border.all(color: c.bd)),
      );
}

class _DashPainter extends CustomPainter {
  _DashPainter(this.color);
  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final p = Paint()
      ..color = color
      ..strokeWidth = 2;
    double x = 0;
    final y = size.height / 2;
    while (x < size.width) {
      canvas.drawLine(Offset(x, y), Offset(x + 4, y), p);
      x += 8;
    }
  }

  @override
  bool shouldRepaint(_DashPainter old) => old.color != color;
}
