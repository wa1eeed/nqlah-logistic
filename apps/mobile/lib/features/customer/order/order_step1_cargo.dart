import 'package:flutter/material.dart';

import '../../../core/theme/tokens.dart';
import '../../../core/theme/typography.dart';
import '../../../core/widgets/ltr.dart';
import '../../../core/widgets/nq_icon.dart';
import '../../../design_system/chip.dart';
import '../../../design_system/segmented.dart';
import 'order_wizard_scaffold.dart';

/// Create-order step 1/6 — cargo (handoff 1b). Single vs consolidated order;
/// per-sub-trip truck type, destination and intermediate stops (incl.
/// empty-container return).
class OrderStep1Cargo extends StatefulWidget {
  const OrderStep1Cargo({super.key, this.onNext});

  final VoidCallback? onNext;

  @override
  State<OrderStep1Cargo> createState() => _OrderStep1CargoState();
}

class _OrderStep1CargoState extends State<OrderStep1Cargo> {
  int _orderType = 0; // 0 = مجمّع, 1 = شحنة واحدة
  int _truckType = 0;

  @override
  Widget build(BuildContext context) {
    final c = context.nq;
    return OrderWizardScaffold(
      step: 1,
      stepName: 'الحمولة',
      nextLabel: 'المسار',
      title: 'ما نوع الطلب؟',
      onNext: widget.onNext,
      footerLeading: Column(
        crossAxisAlignment: CrossAxisAlignment.end,
        mainAxisSize: MainAxisSize.min,
        children: [
          Text('رحلتان · تقديري', style: NqType.caption.copyWith(color: c.tx3)),
          Row(children: [
            Ltr('4,250', style: NqType.price(size: 18).copyWith(color: c.tx)),
            const SizedBox(width: 3),
            Text('ر.س', style: NqType.caption.copyWith(color: c.tx2)),
          ]),
        ],
      ),
      children: [
        NqSegmented(
          options: const ['مجمّع', 'شحنة واحدة'],
          index: _orderType,
          onChanged: (i) => setState(() => _orderType = i),
          height: 52,
        ),
        const SizedBox(height: 12),
        Text('لكل رحلة فرعية نوع شاحنة ووجهة وسعر وتوقفات خاصة بها.',
            style: NqType.caption.copyWith(color: c.tx2)),
        const SizedBox(height: 16),
        _expandedSubTrip(c),
        const SizedBox(height: 12),
        _collapsedSubTrip(c),
        const SizedBox(height: 12),
        _addSubTrip(c),
      ],
    );
  }

  Widget _expandedSubTrip(NqColors c) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: c.sf,
        borderRadius: BorderRadius.circular(NqRadius.cardOverlap),
        border: Border.all(color: c.mint, width: 1.5),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              _numberBadge(c, '1', selected: true),
              const SizedBox(width: 10),
              Text('رحلة فرعية', style: NqType.h2.copyWith(color: c.tx)),
              const Spacer(),
              NqIcon(NqIcons.caretUp, size: 18, color: c.tx3),
            ],
          ),
          const SizedBox(height: 16),
          _label(c, 'نوع الشاحنة'),
          const SizedBox(height: 8),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                for (var i = 0; i < _truckTypes.length; i++) ...[
                  NqChip(
                    label: _truckTypes[i],
                    selected: _truckType == i,
                    onTap: () => setState(() => _truckType = i),
                  ),
                  if (i < _truckTypes.length - 1) const SizedBox(width: 8),
                ],
              ],
            ),
          ),
          const SizedBox(height: 16),
          _label(c, 'الوجهة'),
          const SizedBox(height: 6),
          _destinationField(c, 'الرياض – المدينة الصناعية الثانية'),
          const SizedBox(height: 16),
          _label(c, 'توقفات وسيطة'),
          const SizedBox(height: 8),
          _containerReturnRow(c),
          const SizedBox(height: 10),
          _addStop(c),
        ],
      ),
    );
  }

  static const _truckTypes = ['تريلا سطحة', 'ستارة', 'لوري', 'مبرّدة'];

  Widget _numberBadge(NqColors c, String n, {bool selected = false}) => Container(
        width: 28,
        height: 28,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: selected ? c.hero : c.sf2,
          borderRadius: BorderRadius.circular(8),
        ),
        child: Text(n,
            style: NqType.labelStrong.copyWith(
                color: selected ? NqFixed.heroText : c.tx2)),
      );

  Widget _label(NqColors c, String t) =>
      Text(t, style: NqType.labelStrong.copyWith(color: c.tx2));

  Widget _destinationField(NqColors c, String value) => Container(
        height: NqLayout.input,
        padding: const EdgeInsets.symmetric(horizontal: 14),
        decoration: BoxDecoration(
          color: c.sf2,
          borderRadius: BorderRadius.circular(NqRadius.input),
        ),
        child: Row(
          children: [
            NqIcon(NqIcons.mapPin, fill: true, size: 20, color: c.err),
            const Spacer(),
            Flexible(
              child: Text(value,
                  style: NqType.body.copyWith(color: c.tx),
                  overflow: TextOverflow.ellipsis),
            ),
          ],
        ),
      );

  Widget _containerReturnRow(NqColors c) => Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: c.warnBg,
          borderRadius: BorderRadius.circular(NqRadius.button),
        ),
        child: Row(
          children: [
            NqIcon(NqIcons.dotsThreeVertical, size: 18, color: c.tx3),
            const Spacer(),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text('إرجاع حاوية فارغة',
                    style: NqType.bodyStrong.copyWith(color: c.tx)),
                const SizedBox(height: 2),
                Text('ميناء الملك عبدالعزيز · الدمام',
                    style: NqType.caption.copyWith(color: c.tx2)),
              ],
            ),
            const SizedBox(width: 12),
            NqIcon(NqIcons.shippingContainer, size: 20, color: c.warn),
          ],
        ),
      );

  Widget _addStop(NqColors c) => _dashed(
        c,
        color: c.bd,
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            NqIcon(NqIcons.plus, size: 16, color: c.mintTx),
            const SizedBox(width: 8),
            Text('إضافة توقف (استلام إضافي، تفريغ…)',
                style: NqType.labelStrong.copyWith(color: c.mintTx)),
          ],
        ),
      );

  Widget _collapsedSubTrip(NqColors c) => Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: c.sf,
          borderRadius: BorderRadius.circular(NqRadius.card),
          border: Border.all(color: c.bd),
        ),
        child: Row(
          children: [
            NqIcon(NqIcons.caretDown, size: 18, color: c.tx3),
            const SizedBox(width: 10),
            Row(children: [
              Ltr('1,850', style: NqType.price(size: 16).copyWith(color: c.tx)),
              const SizedBox(width: 3),
              Text('ر.س', style: NqType.caption.copyWith(color: c.tx2)),
            ]),
            const Spacer(),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text('مبرّدة · جدة', style: NqType.h3.copyWith(color: c.tx)),
                const SizedBox(height: 2),
                Text('بدون توقفات', style: NqType.caption.copyWith(color: c.tx2)),
              ],
            ),
            const SizedBox(width: 10),
            _numberBadge(c, '2'),
          ],
        ),
      );

  Widget _addSubTrip(NqColors c) => _dashed(
        c,
        color: c.mint,
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            NqIcon(NqIcons.plusCircle, size: 18, color: c.mintTx),
            const SizedBox(width: 8),
            Text('إضافة رحلة فرعية',
                style: NqType.labelStrong.copyWith(color: c.mintTx)),
          ],
        ),
      );

  Widget _dashed(NqColors c, {required Color color, required Widget child}) =>
      Container(
        height: 52,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(NqRadius.button),
          border: Border.all(color: color, width: 1.5),
        ),
        child: child,
      );
}
