import 'package:flutter/material.dart';

import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';
import '../../core/widgets/ltr.dart';
import '../../core/widgets/nq_icon.dart';
import '../../design_system/toggle.dart';
import 'wizard_scaffold.dart';

/// Register step 2/4 — provider plan picker (handoff 1m). Interactive: truck
/// stepper (5–50, +39 each over 5) and add-on toggles, with a live monthly
/// total. Formula: total = 299 + max(0, trucks−5)×39 + Σ enabled add-ons.
class PlanPickerScreen extends StatefulWidget {
  const PlanPickerScreen({super.key, this.onNext});

  final VoidCallback? onNext;

  @override
  State<PlanPickerScreen> createState() => _PlanPickerScreenState();
}

class _Addon {
  const _Addon(this.key, this.title, this.sub, this.icon, this.price);
  final String key;
  final String title;
  final String sub;
  final String icon;
  final int price;
}

const _addons = [
  _Addon('maint', 'إدارة صيانة الأسطول', 'جدولة الصيانة وتنبيهات الفحص الدوري',
      NqIcons.wrench, 99),
  _Addon('fuel', 'الوقود والمصاريف', 'تسجيل التعبئة وتكلفة كل رحلة',
      NqIcons.gasPump, 79),
  _Addon('reports', 'تقارير متقدمة', 'ربحية الشاحنة والسائق وتصدير Excel',
      NqIcons.chartLineUp, 69),
  _Addon('support', 'دعم بأولوية', 'استجابة خلال ساعة على مدار الأسبوع',
      NqIcons.headset, 49),
];

class _PlanPickerScreenState extends State<PlanPickerScreen> {
  int _trucks = 8;
  final _enabled = {'maint': true, 'fuel': false, 'reports': false, 'support': false};

  int get _extraTrucks => _trucks > 5 ? _trucks - 5 : 0;
  int get _addonsTotal =>
      _addons.where((a) => _enabled[a.key]!).fold(0, (s, a) => s + a.price);
  int get _total => 299 + _extraTrucks * 39 + _addonsTotal;

  @override
  Widget build(BuildContext context) {
    final c = context.nq;
    return WizardScaffold(
      step: 3,
      totalSteps: 5,
      title: 'اختر باقتك',
      subtitle: 'تجربة مجانية 14 يومًا على كل الباقات',
      nextLabel: 'ابدأ التجربة المجانية',
      onNext: widget.onNext ?? () {},
      footerLeading: Column(
        crossAxisAlignment: CrossAxisAlignment.end,
        mainAxisSize: MainAxisSize.min,
        children: [
          Text('بعد التجربة', style: NqType.caption.copyWith(color: c.tx3)),
          Row(children: [
            Ltr('$_total', style: NqType.price(size: 18).copyWith(color: c.tx)),
            const SizedBox(width: 3),
            Text('ر.س/شهر', style: NqType.caption.copyWith(color: c.tx2)),
          ]),
        ],
      ),
      children: [
        _basicCard(c),
        const SizedBox(height: 14),
        _proCard(c),
        const SizedBox(height: 14),
        _enterpriseCard(c),
      ],
    );
  }

  Widget _basicCard(NqColors c) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: c.sf,
        borderRadius: BorderRadius.circular(NqRadius.card),
        border: Border.all(color: c.bd),
      ),
      child: Row(
        children: [
          Row(children: [
            Ltr('199', style: NqType.price(size: 18).copyWith(color: c.tx)),
            const SizedBox(width: 3),
            Text('ر.س/شهر', style: NqType.caption.copyWith(color: c.tx2)),
          ]),
          const Spacer(),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text('أساسي', style: NqType.h2.copyWith(color: c.tx)),
              const SizedBox(height: 2),
              Text('حتى 3 شاحنات · سوق الأحمال',
                  style: NqType.caption.copyWith(color: c.tx2)),
            ],
          ),
        ],
      ),
    );
  }

  Widget _enterpriseCard(NqColors c) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: c.sf,
        borderRadius: BorderRadius.circular(NqRadius.card),
        border: Border.all(color: c.bd),
      ),
      child: Row(
        children: [
          Text('تواصل معنا', style: NqType.labelStrong.copyWith(color: c.mintTx)),
          const Spacer(),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text('مؤسسات', style: NqType.h2.copyWith(color: c.tx)),
              const SizedBox(height: 2),
              Text('50+ شاحنة · تكاملات',
                  style: NqType.caption.copyWith(color: c.tx2)),
            ],
          ),
        ],
      ),
    );
  }

  Widget _proCard(NqColors c) {
    return Stack(
      clipBehavior: Clip.none,
      children: [
        Container(
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            color: c.hero,
            borderRadius: BorderRadius.circular(NqRadius.cardOverlap),
            border: Border.all(color: NqFixed.heroAccent, width: 2),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: [
                  _check(c),
                  const Spacer(),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text('احترافي',
                          style: NqType.h1.copyWith(color: NqFixed.heroText)),
                      const SizedBox(height: 2),
                      Text('من 299 ر.س · 5 شاحنات مشمولة',
                          style: NqType.caption
                              .copyWith(color: NqFixed.heroTextSecondary)),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 18),
              _sectionLabel('عدد الشاحنات', '+39 ر.س لكل شاحنة إضافية'),
              const SizedBox(height: 10),
              _stepper(),
              const SizedBox(height: 18),
              Text('ميزات إضافية',
                  style: NqType.h3.copyWith(color: NqFixed.heroText),
                  textAlign: TextAlign.right),
              const SizedBox(height: 8),
              for (final a in _addons) _addonRow(a),
              const SizedBox(height: 14),
              _breakdown(),
            ],
          ),
        ),
        PositionedDirectional(
          top: -11,
          end: 18,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
            decoration: BoxDecoration(
              color: NqFixed.heroAccent,
              borderRadius: BorderRadius.circular(NqRadius.pill),
            ),
            child: Text('الأكثر اختيارًا',
                style: NqType.caption
                    .copyWith(color: c.hero, fontWeight: FontWeight.w700)),
          ),
        ),
      ],
    );
  }

  Widget _check(NqColors c) => Container(
        width: 28,
        height: 28,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: NqFixed.heroAccent,
          borderRadius: BorderRadius.circular(8),
        ),
        child: NqIcon(NqIcons.check, size: 16, color: c.hero),
      );

  Widget _sectionLabel(String title, String note) => Row(
        children: [
          Text(note,
              style: NqType.caption.copyWith(color: NqFixed.heroTextSecondary)),
          const Spacer(),
          Text(title, style: NqType.h3.copyWith(color: NqFixed.heroText)),
        ],
      );

  Widget _stepper() {
    // RTL: first child renders on the right. Plus on the right, minus on the
    // left (matches the design).
    return Row(
      children: [
        _stepBtn(NqIcons.plus, () {
          if (_trucks < 50) setState(() => _trucks++);
        }, _trucks < 50),
        Expanded(
          child: Column(
            children: [
              Ltr('$_trucks',
                  style: NqType.numeric(28, FontWeight.w700)
                      .copyWith(color: NqFixed.heroText)),
              Text('شاحنة',
                  style: NqType.caption
                      .copyWith(color: NqFixed.heroTextSecondary)),
            ],
          ),
        ),
        _stepBtn(NqIcons.minus, () {
          if (_trucks > 5) setState(() => _trucks--);
        }, _trucks > 5),
      ],
    );
  }

  Widget _stepBtn(String icon, VoidCallback onTap, bool enabled) => Opacity(
        opacity: enabled ? 1 : 0.35,
        child: GestureDetector(
          onTap: enabled ? onTap : null,
          child: Container(
            width: 56,
            height: 56,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: NqFixed.heroFill2,
              borderRadius: BorderRadius.circular(NqRadius.input),
            ),
            child: NqIcon(icon, size: 22, color: NqFixed.heroText),
          ),
        ),
      );

  Widget _addonRow(_Addon a) {
    final on = _enabled[a.key]!;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 10),
      child: Row(
        children: [
          NqIcon(a.icon, size: 22, color: NqFixed.heroAccent),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(a.title,
                    style: NqType.bodyStrong.copyWith(color: NqFixed.heroText)),
                const SizedBox(height: 2),
                Text(a.sub,
                    style: NqType.caption
                        .copyWith(color: NqFixed.heroTextSecondary),
                    textAlign: TextAlign.right),
              ],
            ),
          ),
          const SizedBox(width: 10),
          Text('+${a.price}',
              style: NqType.numeric(14, FontWeight.w600)
                  .copyWith(color: NqFixed.heroText)),
          const SizedBox(width: 10),
          NqToggle(
            value: on,
            onHero: true,
            onChanged: (v) => setState(() => _enabled[a.key] = v),
          ),
        ],
      ),
    );
  }

  Widget _breakdown() {
    Widget row(String label, int value) => Padding(
          padding: const EdgeInsets.symmetric(vertical: 3),
          child: Row(
            children: [
              Ltr('$value',
                  style: NqType.numeric(14, FontWeight.w500)
                      .copyWith(color: NqFixed.heroTextSecondary)),
              const Spacer(),
              Text(label,
                  style: NqType.label.copyWith(color: NqFixed.heroTextSecondary)),
            ],
          ),
        );
    return Column(
      children: [
        Divider(color: NqFixed.heroFill2, height: 1),
        const SizedBox(height: 10),
        row('الباقة الأساسية (5 شاحنات)', 299),
        if (_extraTrucks > 0) row('شاحنات إضافية × $_extraTrucks', _extraTrucks * 39),
        row('الميزات الإضافية', _addonsTotal),
        const SizedBox(height: 8),
        Row(
          children: [
            Ltr('$_total',
                style: NqType.price(size: 26).copyWith(color: NqFixed.heroText)),
            const Spacer(),
            Text('الإجمالي الشهري',
                style: NqType.h3.copyWith(color: NqFixed.heroText)),
          ],
        ),
      ],
    );
  }
}
