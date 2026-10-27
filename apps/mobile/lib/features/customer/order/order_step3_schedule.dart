import 'package:flutter/material.dart';

import '../../../core/theme/tokens.dart';
import '../../../core/theme/typography.dart';
import '../../../core/widgets/ltr.dart';
import '../../../core/widgets/nq_icon.dart';
import '../../../design_system/form_fields.dart';
import '../../../design_system/toggle.dart';
import 'order_wizard_scaffold.dart';

/// Create-order step 3/6 — schedule (handoff 4b).
class OrderStep3Schedule extends StatefulWidget {
  const OrderStep3Schedule({super.key, this.onNext});

  final VoidCallback? onNext;

  @override
  State<OrderStep3Schedule> createState() => _OrderStep3ScheduleState();
}

class _OrderStep3ScheduleState extends State<OrderStep3Schedule> {
  int _day = 2;
  int _window = 0;
  bool _flexible = true;

  static const _days = [
    ('27', 'الأحد'),
    ('28', 'الإثنين'),
    ('29', 'الأربعاء'),
    ('30', 'الخميس'),
    ('31', 'الجمعة'),
    ('1', 'السبت'),
    ('2', 'الأحد'),
  ];
  static const _windows = [
    ('صباحًا', '06:00–12:00'),
    ('ظهرًا', '12:00–16:00'),
    ('مساءً', '16:00–20:00'),
    ('مرن', 'أي وقت'),
  ];

  @override
  Widget build(BuildContext context) {
    final c = context.nq;
    return OrderWizardScaffold(
      step: 3,
      stepName: 'الجدولة',
      nextLabel: 'التسعير',
      title: 'متى تريد الاستلام؟',
      showPrev: true,
      onNext: widget.onNext,
      children: [
        _label(c, 'اليوم'),
        const SizedBox(height: 10),
        SizedBox(
          height: 68,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            reverse: true,
            itemCount: _days.length,
            separatorBuilder: (context, index) => const SizedBox(width: 8),
            itemBuilder: (_, i) => _dayTile(c, i),
          ),
        ),
        const SizedBox(height: 20),
        _label(c, 'نافذة الاستلام'),
        const SizedBox(height: 10),
        GridView.count(
          crossAxisCount: 2,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          crossAxisSpacing: 10,
          mainAxisSpacing: 10,
          childAspectRatio: 2.6,
          children: [for (var i = 0; i < _windows.length; i++) _windowTile(c, i)],
        ),
        const SizedBox(height: 16),
        _flexRow(c),
        const SizedBox(height: 16),
        const NqDropdownField(label: 'آخر موعد للتسليم', value: 'الخميس 31/10'),
        const SizedBox(height: 14),
        _containerWarn(c),
      ],
    );
  }

  Widget _label(NqColors c, String t) =>
      Text(t, style: NqType.labelStrong.copyWith(color: c.tx));

  Widget _dayTile(NqColors c, int i) {
    final sel = _day == i;
    return GestureDetector(
      onTap: () => setState(() => _day = i),
      child: Container(
        width: 52,
        decoration: BoxDecoration(
          color: sel ? c.hero : c.sf,
          borderRadius: BorderRadius.circular(NqRadius.button),
          border: sel ? null : Border.all(color: c.bd),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Ltr(_days[i].$1,
                style: NqType.numeric(20, FontWeight.w700)
                    .copyWith(color: sel ? NqFixed.heroText : c.tx)),
            const SizedBox(height: 2),
            Text(_days[i].$2,
                style: NqType.caption.copyWith(
                    color: sel ? NqFixed.heroTextSecondary : c.tx2)),
          ],
        ),
      ),
    );
  }

  Widget _windowTile(NqColors c, int i) {
    final sel = _window == i;
    return GestureDetector(
      onTap: () => setState(() => _window = i),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14),
        alignment: AlignmentDirectional.centerEnd,
        decoration: BoxDecoration(
          color: sel ? c.mintBg : c.sf,
          borderRadius: BorderRadius.circular(NqRadius.button),
          border: Border.all(color: sel ? c.mintS : c.bd, width: sel ? 2 : 1),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Text(_windows[i].$1, style: NqType.bodyStrong.copyWith(color: c.tx)),
            Ltr(_windows[i].$2, style: NqType.caption.copyWith(color: c.tx2)),
          ],
        ),
      ),
    );
  }

  Widget _flexRow(NqColors c) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          color: c.sf,
          borderRadius: BorderRadius.circular(NqRadius.button),
          border: Border.all(color: c.bd),
        ),
        child: Row(
          children: [
            NqToggle(
                value: _flexible,
                large: true,
                onChanged: (v) => setState(() => _flexible = v)),
            const Spacer(),
            Text('موعد مرن ± يوم', style: NqType.body.copyWith(color: c.tx)),
          ],
        ),
      );

  Widget _containerWarn(NqColors c) => Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: c.warnBg,
          borderRadius: BorderRadius.circular(NqRadius.button),
        ),
        child: Row(
          children: [
            NqIcon(NqIcons.warningCircle, size: 20, color: c.warn),
            const SizedBox(width: 12),
            Expanded(
              child: Text('فترة سماح الحاوية 4 أيام من الاستلام قبل رسوم التأخير.',
                  style: NqType.caption.copyWith(color: c.tx2),
                  textAlign: TextAlign.right),
            ),
          ],
        ),
      );
}
