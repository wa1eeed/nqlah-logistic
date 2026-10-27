import 'package:flutter/material.dart';

import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';
import '../../core/widgets/ltr.dart';
import '../../core/widgets/nq_icon.dart';
import '../../design_system/segmented.dart';

/// Provider finance (handoff 3h). Receivables from customers; confirm reported
/// direct payments.
class ProviderFinanceScreen extends StatefulWidget {
  const ProviderFinanceScreen({super.key});

  @override
  State<ProviderFinanceScreen> createState() => _ProviderFinanceScreenState();
}

class _ProviderFinanceScreenState extends State<ProviderFinanceScreen> {
  int _seg = 0;

  @override
  Widget build(BuildContext context) {
    final c = context.nq;
    return SafeArea(
      top: false,
      child: ListView(
        padding: EdgeInsets.zero,
        children: [
          _hero(context, c),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                NqSegmented(
                  options: const ['مُبلّغة 3', 'مستحقة 5', 'مؤكّدة'],
                  index: _seg,
                  onChanged: (i) => setState(() => _seg = i),
                ),
                const SizedBox(height: 14),
                _payCard(c, 'مصنع الرّواد للبلاستيك',
                    'NQ-24-08812 · حوالة بنكية · قبل 2 س', '2,898.00'),
                const SizedBox(height: 12),
                _payCard(c, 'شركة البناء الحديث',
                    'NQ-24-08790 · حوالة بنكية · أمس', '1,610.00'),
                const SizedBox(height: 12),
                _payCard(c, 'مؤسسة النخبة التجارية',
                    'NQ-24-08771 · نقدًا عند التسليم', '1,692.00'),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _hero(BuildContext context, NqColors c) => Container(
        color: c.hero,
        padding: EdgeInsets.fromLTRB(
            16, MediaQuery.of(context).padding.top + 12, 16, 20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: NqFixed.heroFill2,
                    borderRadius: BorderRadius.circular(NqRadius.pill),
                  ),
                  child: Row(mainAxisSize: MainAxisSize.min, children: [
                    NqIcon(NqIcons.calendarBlank, size: 14, color: NqFixed.heroTextSecondary),
                    const SizedBox(width: 6),
                    Text('أكتوبر', style: NqType.caption.copyWith(color: NqFixed.heroText)),
                  ]),
                ),
                const Spacer(),
                Text('المالية', style: NqType.h1.copyWith(color: NqFixed.heroText)),
              ],
            ),
            const SizedBox(height: 12),
            Text('مستحقات لدى العملاء',
                style: NqType.body.copyWith(color: NqFixed.heroTextSecondary)),
            const SizedBox(height: 4),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                Ltr('18,400.00',
                    style: NqType.price(size: 30).copyWith(color: NqFixed.heroText)),
                const SizedBox(width: 4),
                Text('ر.س', style: NqType.h3.copyWith(color: NqFixed.heroTextSecondary)),
              ],
            ),
            const SizedBox(height: 14),
            Row(
              children: [
                _heroTile(c, '6,200', 'مُبلّغة بانتظار تأكيدك · 3'),
                const SizedBox(width: 12),
                _heroTile(c, '42,750', 'مستلمة هذا الشهر'),
              ],
            ),
          ],
        ),
      );

  Widget _heroTile(NqColors c, String value, String label) => Expanded(
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: NqFixed.heroFill1,
            borderRadius: BorderRadius.circular(NqRadius.button),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Ltr(value,
                  style: NqType.numeric(22, FontWeight.w700).copyWith(color: NqFixed.heroText)),
              const SizedBox(height: 2),
              Text(label,
                  style: NqType.caption.copyWith(color: NqFixed.heroTextSecondary),
                  textAlign: TextAlign.right),
            ],
          ),
        ),
      );

  Widget _payCard(NqColors c, String payer, String meta, String amount) => Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: c.sf,
          borderRadius: BorderRadius.circular(NqRadius.card),
          border: Border.all(color: c.bd),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(children: [
                  Ltr(amount, style: NqType.price(size: 18).copyWith(color: c.tx)),
                  const SizedBox(width: 3),
                  Text('ر.س', style: NqType.caption.copyWith(color: c.tx2)),
                ]),
                const Spacer(),
                Expanded(
                  flex: 3,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(payer, style: NqType.h3.copyWith(color: c.tx)),
                      const SizedBox(height: 2),
                      Text(meta,
                          style: NqType.caption.copyWith(color: c.tx2),
                          textAlign: TextAlign.right),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),
            Row(
              children: [
                _confirmBtn(c),
                const SizedBox(width: 8),
                _receiptBtn(c),
                const Spacer(),
                _reportedChip(c),
              ],
            ),
          ],
        ),
      );

  Widget _reportedChip(NqColors c) => Container(
        height: 32,
        padding: const EdgeInsets.symmetric(horizontal: 10),
        decoration: BoxDecoration(
          color: c.warnBg,
          borderRadius: BorderRadius.circular(NqRadius.pill),
        ),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          NqIcon(NqIcons.handCoins, size: 14, color: c.warn),
          const SizedBox(width: 6),
          Text('دفع مُبلّغ',
              style: NqType.caption.copyWith(color: c.warn, fontWeight: FontWeight.w700)),
        ]),
      );

  Widget _receiptBtn(NqColors c) => Container(
        height: 36,
        padding: const EdgeInsets.symmetric(horizontal: 12),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(NqRadius.button),
          border: Border.all(color: c.bd),
        ),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          NqIcon(NqIcons.receipt, size: 16, color: c.tx),
          const SizedBox(width: 6),
          Text('الإيصال', style: NqType.labelStrong.copyWith(color: c.tx)),
        ]),
      );

  Widget _confirmBtn(NqColors c) => Container(
        height: 36,
        padding: const EdgeInsets.symmetric(horizontal: 14),
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: c.mint,
          borderRadius: BorderRadius.circular(NqRadius.button),
        ),
        child: Text('تأكيد الاستلام',
            style: NqType.labelStrong.copyWith(color: c.onMint)),
      );
}
