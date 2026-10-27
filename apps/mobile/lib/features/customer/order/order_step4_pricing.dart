import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/orders/order_draft_controller.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/theme/typography.dart';
import '../../../core/widgets/nq_icon.dart';
import '../../../design_system/chip.dart';
import '../../../design_system/segmented.dart';
import 'order_wizard_scaffold.dart';

/// Create-order step 4/6 — pricing & visibility (handoff 4c).
class OrderStep4Pricing extends ConsumerStatefulWidget {
  const OrderStep4Pricing({super.key, this.onNext});

  final VoidCallback? onNext;

  @override
  ConsumerState<OrderStep4Pricing> createState() => _OrderStep4PricingState();
}

class _OrderStep4PricingState extends ConsumerState<OrderStep4Pricing> {
  late final TextEditingController _budget;

  // Payment chip → collection method.
  static const _payment = [
    (value: 'COD', label: 'عند التسليم'),
    (value: 'ESCROW', label: 'ضمان (إسكرو)'),
    (value: 'PREPAID_WALLET', label: 'محفظة مسبقة'),
  ];

  @override
  void initState() {
    super.initState();
    final d = ref.read(orderDraftProvider);
    _budget = TextEditingController(text: d.clientBudget?.toString() ?? '');
  }

  @override
  void dispose() {
    _budget.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final c = context.nq;
    final n = ref.read(orderDraftProvider.notifier);
    final d = ref.watch(orderDraftProvider);
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
          selected: d.fixedPrice,
          onTap: () => n.patch((x) => x.copyWith(fixedPrice: true)),
          expanded: d.fixedPrice ? _priceField(c, n) : null,
        ),
        const SizedBox(height: 14),
        _radioCard(
          c,
          title: 'مناقصة',
          sub: 'يقدّم المزوّدون عروضهم خلال مدة تحدّدها وتختار الأنسب',
          icon: NqIcons.gavel,
          selected: !d.fixedPrice,
          onTap: () => n.patch((x) => x.copyWith(fixedPrice: false)),
        ),
        const SizedBox(height: 22),
        Text('من يرى الطلب؟', style: NqType.h2.copyWith(color: c.tx)),
        const SizedBox(height: 10),
        NqSegmented(
          options: const ['السوق المفتوح', 'مزوّدون محدّدون'],
          index: d.openMarket ? 0 : 1,
          onChanged: (i) => n.patch((x) => x.copyWith(openMarket: i == 0)),
          height: 52,
        ),
        if (!d.openMarket) ...[
          const SizedBox(height: 10),
          Text('سيُنشر الطلب في السوق المفتوح حاليًا (اختيار مزوّد محدّد قريبًا).',
              style: NqType.caption.copyWith(color: c.tx3),
              textAlign: TextAlign.right),
        ],
        const SizedBox(height: 22),
        Text('شروط الدفع', style: NqType.h2.copyWith(color: c.tx)),
        const SizedBox(height: 10),
        Row(
          children: [
            for (var i = 0; i < _payment.length; i++) ...[
              NqChip(
                label: _payment[i].label,
                selected: d.collectionMethod == _payment[i].value,
                onTap: () => n.patch(
                    (x) => x.copyWith(collectionMethod: _payment[i].value)),
              ),
              if (i < _payment.length - 1) const SizedBox(width: 8),
            ],
          ],
        ),
      ],
    );
  }

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
                          style:
                              NqType.caption.copyWith(color: c.tx2, height: 1.5),
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
                decoration:
                    BoxDecoration(color: c.mintS, shape: BoxShape.circle),
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

  Widget _priceField(NqColors c, OrderDraftController n) {
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
              const SizedBox(width: 10),
              Expanded(
                child: TextField(
                  controller: _budget,
                  keyboardType:
                      const TextInputType.numberWithOptions(decimal: true),
                  textAlign: TextAlign.right,
                  onChanged: (v) =>
                      n.patch((x) => x.copyWith(clientBudget: num.tryParse(v.trim()))),
                  style: NqType.price(size: 20).copyWith(color: c.tx),
                  cursorColor: c.mintS,
                  decoration: InputDecoration(
                    isCollapsed: true,
                    border: InputBorder.none,
                    hintText: 'السعر',
                    hintStyle: NqType.body.copyWith(color: c.tx3),
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 10),
        Row(
          children: [
            NqIcon(NqIcons.chartLineUp, size: 16, color: c.info),
            const SizedBox(width: 6),
            Expanded(
              child: Text('حدّد السعر الذي ترغب بدفعه لهذه الرحلة.',
                  style: NqType.caption.copyWith(color: c.tx2),
                  textAlign: TextAlign.right),
            ),
          ],
        ),
      ],
    );
  }
}
