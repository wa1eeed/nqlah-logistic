import 'package:flutter/material.dart';

import '../../../core/theme/tokens.dart';
import '../../../core/theme/typography.dart';
import '../../../core/widgets/ltr.dart';
import '../../../core/widgets/nq_icon.dart';
import '../../../design_system/chip.dart';
import '../../../design_system/segmented.dart';
import 'order_wizard_scaffold.dart';

/// Create-order step 4/6 — pricing & visibility (handoff 4c).
class OrderStep4Pricing extends StatefulWidget {
  const OrderStep4Pricing({super.key, this.onNext});

  final VoidCallback? onNext;

  @override
  State<OrderStep4Pricing> createState() => _OrderStep4PricingState();
}

class _OrderStep4PricingState extends State<OrderStep4Pricing> {
  int _mode = 0; // 0 = fixed, 1 = tender
  int _visibility = 0;
  int _payment = 0;

  @override
  Widget build(BuildContext context) {
    final c = context.nq;
    return OrderWizardScaffold(
      step: 4,
      stepName: 'التسعير',
      nextLabel: 'المستلم والمستندات',
      title: 'كيف تريد التسعير؟',
      showPrev: true,
      onNext: widget.onNext,
      children: [
        _radioCard(
          c,
          title: 'سعر ثابت',
          sub: 'أول مزوّد مؤهّل يقبل السعر يحصل على الطلب',
          icon: NqIcons.tag,
          selected: _mode == 0,
          onTap: () => setState(() => _mode = 0),
          expanded: _mode == 0 ? _priceField(c) : null,
        ),
        const SizedBox(height: 14),
        _radioCard(
          c,
          title: 'مناقصة',
          sub: 'يقدّم المزوّدون عروضهم خلال مدة تحدّدها وتختار الأنسب',
          icon: NqIcons.gavel,
          selected: _mode == 1,
          onTap: () => setState(() => _mode = 1),
        ),
        const SizedBox(height: 22),
        Text('من يرى الطلب؟', style: NqType.h2.copyWith(color: c.tx)),
        const SizedBox(height: 10),
        NqSegmented(
          options: const ['السوق المفتوح', 'مزوّدون محدّدون'],
          index: _visibility,
          onChanged: (i) => setState(() => _visibility = i),
          height: 52,
        ),
        const SizedBox(height: 22),
        Text('شروط الدفع', style: NqType.h2.copyWith(color: c.tx)),
        const SizedBox(height: 10),
        Row(
          children: [
            for (var i = 0; i < _paymentTerms.length; i++) ...[
              NqChip(
                label: _paymentTerms[i],
                selected: _payment == i,
                onTap: () => setState(() => _payment = i),
              ),
              if (i < _paymentTerms.length - 1) const SizedBox(width: 8),
            ],
          ],
        ),
      ],
    );
  }

  static const _paymentTerms = ['عند التسليم', 'خلال 15 يومًا', 'خلال 30 يومًا'];

  Widget _radioCard(
    NqColors c, {
    required String title,
    required String sub,
    required String icon,
    required bool selected,
    required VoidCallback onTap,
    Widget? expanded,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: c.sf,
          borderRadius: BorderRadius.circular(NqRadius.card),
          border: Border.all(
              color: selected ? c.mintS : c.bd, width: selected ? 2 : 1),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _radio(c, selected),
                const Spacer(),
                Expanded(
                  flex: 6,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(title, style: NqType.h3.copyWith(color: c.tx)),
                      const SizedBox(height: 2),
                      Text(sub,
                          style: NqType.caption.copyWith(color: c.tx2, height: 1.5),
                          textAlign: TextAlign.right),
                    ],
                  ),
                ),
                const SizedBox(width: 12),
                _iconTile(c, icon),
              ],
            ),
            if (expanded != null) ...[
              const SizedBox(height: 14),
              expanded,
            ],
          ],
        ),
      ),
    );
  }

  Widget _radio(NqColors c, bool selected) => Container(
        width: 24,
        height: 24,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          border: Border.all(color: selected ? c.mintS : c.bd, width: 2),
        ),
        child: selected
            ? Container(
                width: 12,
                height: 12,
                decoration: BoxDecoration(color: c.mintS, shape: BoxShape.circle),
              )
            : null,
      );

  Widget _iconTile(NqColors c, String icon) => Container(
        width: 48,
        height: 48,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: c.sf2,
          borderRadius: BorderRadius.circular(NqRadius.input),
        ),
        child: NqIcon(icon, size: 22, color: c.tx2),
      );

  Widget _priceField(NqColors c) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Container(
          height: NqLayout.input,
          padding: const EdgeInsets.symmetric(horizontal: 14),
          decoration: BoxDecoration(
            color: c.sf,
            borderRadius: BorderRadius.circular(NqRadius.input),
            border: Border.all(color: c.mintS, width: 2),
            boxShadow: [BoxShadow(color: c.mintBg, spreadRadius: 3)],
          ),
          child: Row(
            children: [
              Text('ر.س', style: NqType.label.copyWith(color: c.tx2)),
              const Spacer(),
              Ltr('2,400', style: NqType.price(size: 20).copyWith(color: c.tx)),
            ],
          ),
        ),
        const SizedBox(height: 10),
        Row(
          children: [
            NqIcon(NqIcons.chartLineUp, size: 16, color: c.info),
            const SizedBox(width: 6),
            Expanded(
              child: Text('السعر الشائع لهذا المسار 2,250–2,700 ر.س',
                  style: NqType.caption.copyWith(color: c.tx2),
                  textAlign: TextAlign.right),
            ),
          ],
        ),
      ],
    );
  }
}
