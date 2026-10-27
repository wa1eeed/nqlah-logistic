import 'package:flutter/material.dart';

import '../../../core/theme/tokens.dart';
import '../../../core/theme/typography.dart';
import '../../../core/widgets/nq_icon.dart';
import '../../../design_system/segmented.dart';
import 'order_wizard_scaffold.dart';

/// Create-order step 2/6 — route & stops (handoff 4a).
class OrderStep2Route extends StatefulWidget {
  const OrderStep2Route({super.key, this.onNext});

  final VoidCallback? onNext;

  @override
  State<OrderStep2Route> createState() => _OrderStep2RouteState();
}

class _OrderStep2RouteState extends State<OrderStep2Route> {
  int _subTrip = 0;

  @override
  Widget build(BuildContext context) {
    final c = context.nq;
    return OrderWizardScaffold(
      step: 2,
      stepName: 'المسار',
      nextLabel: 'الجدولة',
      title: 'حدّد مسار الرحلة',
      showPrev: true,
      onNext: widget.onNext,
      children: [
        NqSegmented(
          options: const ['رحلة 1 · سطحة', 'رحلة 2 · مبرّدة'],
          index: _subTrip,
          onChanged: (i) => setState(() => _subTrip = i),
        ),
        const SizedBox(height: 14),
        _miniMap(c),
        const SizedBox(height: 14),
        _stopsCard(c),
        const SizedBox(height: 14),
        _infoBanner(c),
      ],
    );
  }

  Widget _miniMap(NqColors c) => ClipRRect(
        borderRadius: BorderRadius.circular(NqRadius.card),
        child: Container(
          height: 130,
          color: c.map,
          child: Stack(
            children: [
              Center(
                child: Container(height: 4, color: c.mintS, margin: const EdgeInsets.symmetric(horizontal: 40)),
              ),
              PositionedDirectional(
                top: 59,
                start: 36,
                child: _mapDot(c, c.mintS, 18),
              ),
              PositionedDirectional(
                top: 57,
                end: 36,
                child: _mapDot(c, c.err, 20),
              ),
              PositionedDirectional(
                bottom: 10,
                end: 10,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: c.sf,
                    borderRadius: BorderRadius.circular(NqRadius.pill),
                  ),
                  child: Text('تعديل على الخريطة',
                      style: NqType.caption.copyWith(color: c.mintTx)),
                ),
              ),
            ],
          ),
        ),
      );

  Widget _mapDot(NqColors c, Color color, double size) => Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          color: color,
          shape: BoxShape.circle,
          border: Border.all(color: Colors.white, width: 3),
        ),
      );

  Widget _stopsCard(NqColors c) => Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: c.sf,
          borderRadius: BorderRadius.circular(NqRadius.card),
          border: Border.all(color: c.bd),
        ),
        child: Column(
          children: [
            _stop(c, NqIcons.mapPin, c.mintS, true,
                'الاستلام', 'ميناء الملك عبدالعزيز · الدمام', first: true),
            _stop(c, NqIcons.flagCheckered, c.err, true,
                'التفريغ', 'المدينة الصناعية الثانية · الرياض'),
            _stop(c, NqIcons.shippingContainer, c.warn, false,
                'إرجاع الحاوية الفارغة', 'ميناء الملك عبدالعزيز · الدمام',
                last: true, rotatedSquare: true),
          ],
        ),
      );

  Widget _stop(NqColors c, String icon, Color color, bool filled, String title,
      String sub,
      {bool first = false, bool last = false, bool rotatedSquare = false}) {
    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          NqIcon(NqIcons.dotsThreeVertical, size: 16, color: c.tx3),
          const SizedBox(width: 10),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.only(bottom: 14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(title, style: NqType.bodyStrong.copyWith(color: c.tx)),
                  const SizedBox(height: 2),
                  Text(sub, style: NqType.caption.copyWith(color: c.tx2)),
                ],
              ),
            ),
          ),
          const SizedBox(width: 10),
          Column(
            children: [
              Container(
                  width: 2,
                  height: 4,
                  color: first ? Colors.transparent : c.bd),
              Container(
                width: 24,
                height: 24,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: filled ? color : Colors.transparent,
                  shape: rotatedSquare ? BoxShape.rectangle : BoxShape.circle,
                  borderRadius: rotatedSquare ? BorderRadius.circular(5) : null,
                  border: rotatedSquare ? Border.all(color: color, width: 2) : null,
                ),
                child: NqIcon(icon,
                    fill: true, size: 13, color: filled ? Colors.white : color),
              ),
              Expanded(
                child: Container(
                    width: 2, color: last ? Colors.transparent : c.bd),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _infoBanner(NqColors c) => Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: c.infoBg,
          borderRadius: BorderRadius.circular(NqRadius.button),
        ),
        child: Row(
          children: [
            NqIcon(NqIcons.info, size: 20, color: c.info),
            const SizedBox(width: 12),
            Expanded(
              child: Text('المسافة التقديرية 798 km · نحو 9 ساعات قيادة',
                  style: NqType.caption.copyWith(color: c.tx2),
                  textAlign: TextAlign.right),
            ),
          ],
        ),
      );
}
