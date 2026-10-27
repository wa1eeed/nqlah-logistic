import 'package:flutter/material.dart';

import '../../../core/theme/tokens.dart';
import '../../../core/theme/typography.dart';
import '../../../core/widgets/ltr.dart';
import '../../../core/widgets/nq_icon.dart';
import 'order_wizard_scaffold.dart';

/// Create-order step 6/6 — review & publish (handoff 4e).
class OrderStep6Review extends StatefulWidget {
  const OrderStep6Review({super.key, this.onPublish});

  final VoidCallback? onPublish;

  @override
  State<OrderStep6Review> createState() => _OrderStep6ReviewState();
}

class _OrderStep6ReviewState extends State<OrderStep6Review> {
  bool _agreed = false;

  @override
  Widget build(BuildContext context) {
    final c = context.nq;
    return OrderWizardScaffold(
      step: 6,
      stepName: 'المراجعة',
      nextLabel: '',
      nextHint: 'الأخيرة',
      nextButtonLabel: 'نشر الطلب',
      nextIcon: NqIcons.megaphone,
      title: 'راجع وانشر',
      showPrev: true,
      nextEnabled: _agreed,
      onNext: widget.onPublish,
      children: [
        _summaryCard(c),
        const SizedBox(height: 14),
        _detailsCard(c),
        const SizedBox(height: 14),
        _priceCard(c),
        const SizedBox(height: 16),
        _terms(c),
      ],
    );
  }

  Widget _summaryCard(NqColors c) {
    Widget tripRow(String badge, bool first, String route, String sub, String price) {
      return Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(children: [
            Ltr(price, style: NqType.price(size: 16).copyWith(color: c.tx)),
            const SizedBox(width: 3),
            Text('ر.س', style: NqType.caption.copyWith(color: c.tx2)),
          ]),
          const Spacer(),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(route, style: NqType.h3.copyWith(color: c.tx)),
              const SizedBox(height: 2),
              Text(sub, style: NqType.caption.copyWith(color: c.tx2)),
            ],
          ),
          const SizedBox(width: 10),
          _badge(c, badge, first),
        ],
      );
    }

    return _card(
      c,
      Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Text('تعديل', style: NqType.labelStrong.copyWith(color: c.mintTx)),
              const Spacer(),
              Text('مجمّع · رحلتان', style: NqType.h3.copyWith(color: c.tx)),
            ],
          ),
          const SizedBox(height: 14),
          tripRow('1', true, 'الدمام ← الرياض', 'تريلا سطحة · + إرجاع حاوية', '2,400'),
          const SizedBox(height: 12),
          Divider(color: c.bd, height: 1),
          const SizedBox(height: 12),
          tripRow('2', false, 'الدمام ← جدة', 'مبرّدة · بدون توقفات', '1,850'),
        ],
      ),
    );
  }

  Widget _detailsCard(NqColors c) {
    Widget row(String label, String value) => Padding(
          padding: const EdgeInsets.symmetric(vertical: 6),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Text(value,
                    style: NqType.body.copyWith(color: c.tx),
                    textAlign: TextAlign.right),
              ),
              const SizedBox(width: 16),
              Text(label, style: NqType.body.copyWith(color: c.tx2)),
            ],
          ),
        );
    return _card(
      c,
      Column(
        children: [
          row('الاستلام', 'الأربعاء 29/10 · صباحًا'),
          row('التسعير', 'سعر ثابت · السوق المفتوح'),
          row('الدفع', 'عند التسليم'),
          row('المستلم', 'أبو ناصر · +966 50 771 2204'),
          row('المستندات', '2 مرفوعة'),
        ],
      ),
    );
  }

  Widget _priceCard(NqColors c) {
    Widget row(String label, String value) => Padding(
          padding: const EdgeInsets.symmetric(vertical: 3),
          child: Row(
            children: [
              Ltr(value, style: NqType.numeric(14, FontWeight.w400).copyWith(color: c.tx)),
              const Spacer(),
              Text(label, style: NqType.body.copyWith(color: c.tx2)),
            ],
          ),
        );
    return _card(
      c,
      Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          row('أجرة النقل', '4,250.00'),
          row('رسوم الخدمة 5%', '212.50'),
          row('ضريبة القيمة المضافة 15%', '669.38'),
          const SizedBox(height: 8),
          Divider(color: c.bd, height: 1),
          const SizedBox(height: 8),
          Row(
            children: [
              Row(children: [
                Ltr('5,131.88', style: NqType.price(size: 20).copyWith(color: c.tx)),
                const SizedBox(width: 3),
                Text('ر.س', style: NqType.caption.copyWith(color: c.tx2)),
              ]),
              const Spacer(),
              Text('الإجمالي', style: NqType.h3.copyWith(color: c.tx)),
            ],
          ),
        ],
      ),
    );
  }

  Widget _terms(NqColors c) {
    return GestureDetector(
      onTap: () => setState(() => _agreed = !_agreed),
      behavior: HitTestBehavior.opaque,
      child: Row(
        children: [
          Container(
            width: 22,
            height: 22,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: _agreed ? c.mintS : Colors.transparent,
              borderRadius: BorderRadius.circular(6),
              border: _agreed ? null : Border.all(color: c.bd, width: 1.5),
            ),
            child: _agreed
                ? NqIcon(NqIcons.check,
                    size: 15, color: c.isDark ? c.onMint : Colors.white)
                : null,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text.rich(
              TextSpan(
                style: NqType.body.copyWith(color: c.tx2),
                children: [
                  const TextSpan(text: 'أوافق على '),
                  TextSpan(
                      text: 'شروط النقل وسياسة الإلغاء',
                      style: NqType.bodyStrong.copyWith(color: c.mintTx)),
                ],
              ),
              textAlign: TextAlign.right,
            ),
          ),
        ],
      ),
    );
  }

  Widget _badge(NqColors c, String n, bool first) => Container(
        width: 24,
        height: 24,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: first ? c.hero : c.sf2,
          borderRadius: BorderRadius.circular(7),
        ),
        child: Text(n,
            style: NqType.caption.copyWith(
                fontWeight: FontWeight.w700,
                color: first ? NqFixed.heroText : c.tx2)),
      );

  Widget _card(NqColors c, Widget child) => Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: c.sf,
          borderRadius: BorderRadius.circular(NqRadius.card),
          border: Border.all(color: c.bd),
        ),
        child: child,
      );
}
