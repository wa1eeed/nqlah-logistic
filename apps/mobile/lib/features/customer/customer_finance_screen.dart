import 'package:flutter/material.dart';

import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';
import '../../core/widgets/ltr.dart';
import '../../core/widgets/nq_icon.dart';
import '../../design_system/segmented.dart';

/// Customer finance (handoff 4h, Addendum-01: pushed from the wallet button;
/// no tab bar). Direct pay to the provider: report a payment, provider confirms.
class CustomerFinanceScreen extends StatefulWidget {
  const CustomerFinanceScreen({super.key});

  @override
  State<CustomerFinanceScreen> createState() => _CustomerFinanceScreenState();
}

class _CustomerFinanceScreenState extends State<CustomerFinanceScreen> {
  int _seg = 0;

  @override
  Widget build(BuildContext context) {
    final c = context.nq;
    return Scaffold(
      backgroundColor: c.bg,
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _appBar(c),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
                children: [
                  _heroCard(c),
                  const SizedBox(height: 16),
                  NqSegmented(
                    options: const ['بانتظار الدفع 2', 'مُبلّغة 1', 'مدفوعة'],
                    index: _seg,
                    onChanged: (i) => setState(() => _seg = i),
                  ),
                  const SizedBox(height: 14),
                  _infoNote(c),
                  const SizedBox(height: 14),
                  _invoiceCard(c,
                      provider: 'شركة الأفق للنقل',
                      inv: 'INV-2410-0331',
                      amount: '2,898.00',
                      due: 'خلال 3 أيام'),
                  const SizedBox(height: 12),
                  _invoiceCard(c,
                      provider: 'مؤسسة الطريق السريع',
                      inv: 'INV-2410-0329',
                      amount: '1,692.00',
                      due: 'خلال 9 أيام'),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _appBar(NqColors c) => Padding(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
        child: Row(
          children: [
            GestureDetector(
              onTap: () => Navigator.of(context).maybePop(),
              child: NqIcon(NqIcons.arrowRight, size: 22, color: c.tx),
            ),
            const Spacer(),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text('المالية', style: NqType.h3.copyWith(color: c.tx)),
                const SizedBox(height: 2),
                Text('من أيقونة المحفظة في الرئيسية',
                    style: NqType.caption.copyWith(color: c.tx2)),
              ],
            ),
          ],
        ),
      );

  Widget _heroCard(NqColors c) => Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: c.hero,
          borderRadius: BorderRadius.circular(NqRadius.cardOverlap),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Text('المستحق عليك',
                style: NqType.body.copyWith(color: NqFixed.heroTextSecondary)),
            const SizedBox(height: 6),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                Ltr('4,590.00',
                    style: NqType.price(size: 30).copyWith(color: NqFixed.heroText)),
                const SizedBox(width: 4),
                Text('ر.س',
                    style: NqType.h3.copyWith(color: NqFixed.heroTextSecondary)),
              ],
            ),
            const SizedBox(height: 6),
            Text('فاتورتان بانتظار الدفع · أقرب استحقاق خلال 3 أيام',
                style: NqType.caption.copyWith(color: NqFixed.heroTextSecondary)),
          ],
        ),
      );

  Widget _infoNote(NqColors c) => Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: c.sf2,
          borderRadius: BorderRadius.circular(NqRadius.button),
        ),
        child: Row(
          children: [
            NqIcon(NqIcons.info, size: 20, color: c.tx3),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                'يتم الدفع مباشرة للمزوّد. بعد التحويل اضغط «إبلاغ عن دفع» وأرفق الإيصال، ويؤكّد المزوّد الاستلام.',
                style: NqType.caption.copyWith(color: c.tx2, height: 1.6),
                textAlign: TextAlign.right,
              ),
            ),
          ],
        ),
      );

  Widget _invoiceCard(NqColors c,
      {required String provider,
      required String inv,
      required String amount,
      required String due}) {
    return Container(
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
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(provider, style: NqType.h3.copyWith(color: c.tx)),
                  const SizedBox(height: 2),
                  Ltr(inv, style: NqType.code(size: 12).copyWith(color: c.tx2)),
                ],
              ),
            ],
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              _dueChip(c, due),
              const Spacer(),
              _smallBtn(c, 'بيانات البنك', NqIcons.bank, outline: true),
              const SizedBox(width: 8),
              _smallBtn(c, 'إبلاغ عن دفع', null, outline: false),
            ],
          ),
        ],
      ),
    );
  }

  Widget _dueChip(NqColors c, String text) => Container(
        height: 30,
        padding: const EdgeInsets.symmetric(horizontal: 10),
        decoration: BoxDecoration(
          color: c.warnBg,
          borderRadius: BorderRadius.circular(NqRadius.pill),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            NqIcon(NqIcons.clock, size: 14, color: c.warn),
            const SizedBox(width: 6),
            Text(text,
                style: NqType.caption
                    .copyWith(color: c.warn, fontWeight: FontWeight.w700)),
          ],
        ),
      );

  Widget _smallBtn(NqColors c, String label, String? icon, {required bool outline}) {
    return Container(
      height: 36,
      padding: const EdgeInsets.symmetric(horizontal: 12),
      decoration: BoxDecoration(
        color: outline ? Colors.transparent : c.mint,
        borderRadius: BorderRadius.circular(NqRadius.button),
        border: outline ? Border.all(color: c.bd) : null,
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            NqIcon(icon, size: 16, color: outline ? c.tx : c.onMint),
            const SizedBox(width: 6),
          ],
          Text(label,
              style: NqType.labelStrong
                  .copyWith(color: outline ? c.tx : c.onMint)),
        ],
      ),
    );
  }
}
