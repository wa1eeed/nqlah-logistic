import 'package:flutter/material.dart';

import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';
import '../../core/widgets/ltr.dart';
import '../../core/widgets/nq_icon.dart';
import '../../design_system/button.dart';

/// Employed-driver trip execution (handoff 1j). Big targets, stop-by-stop
/// actions; no prices, no customer identity. Calls go to the office dispatcher
/// (header) and the stop's consignee.
class DriverTripExecutionScreen extends StatelessWidget {
  const DriverTripExecutionScreen({super.key, this.onArrive});

  final VoidCallback? onArrive;

  @override
  Widget build(BuildContext context) {
    final c = context.nq;
    return Scaffold(
      backgroundColor: c.bg,
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _hero(context, c),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 16),
              children: [
                _stopCard(c),
                const SizedBox(height: 18),
                Text('بعد هذا التوقف', style: NqType.labelStrong.copyWith(color: c.tx2), textAlign: TextAlign.right),
                const SizedBox(height: 10),
                _nextStop(c),
              ],
            ),
          ),
          _footer(c),
        ],
      ),
    );
  }

  Widget _hero(BuildContext context, NqColors c) => Container(
        color: c.hero,
        padding: EdgeInsets.fromLTRB(16, MediaQuery.of(context).padding.top + 12, 16, 12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                Container(
                  width: 44,
                  height: 44,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(color: NqFixed.heroFill2, borderRadius: BorderRadius.circular(NqRadius.input)),
                  child: NqIcon(NqIcons.phone, size: 20, color: NqFixed.heroText),
                ),
                const Spacer(),
                Column(
                  children: [
                    Text('الرحلة النشطة', style: NqType.caption.copyWith(color: NqFixed.heroTextSecondary)),
                    const SizedBox(height: 2),
                    Ltr('NQ-24-08812 · L1', style: NqType.code(size: 16).copyWith(color: NqFixed.heroText)),
                  ],
                ),
                const Spacer(),
                GestureDetector(
                  onTap: () => Navigator.of(context).maybePop(),
                  child: Container(
                    width: 44,
                    height: 44,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(color: NqFixed.heroFill2, borderRadius: BorderRadius.circular(NqRadius.input)),
                    child: NqIcon(NqIcons.arrowRight, size: 20, color: NqFixed.heroText),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            _steps(c),
          ],
        ),
      );

  Widget _steps(NqColors c) {
    // Right→left: استلام (done) · تفريغ (current) · إرجاع حاوية (pending)
    Widget bar(double fill) => Expanded(
          child: Container(
            height: 4,
            decoration: BoxDecoration(color: NqFixed.heroFill2, borderRadius: BorderRadius.circular(2)),
            child: FractionallySizedBox(
              alignment: AlignmentDirectional.centerStart,
              widthFactor: fill,
              child: Container(decoration: BoxDecoration(color: NqFixed.heroAccent, borderRadius: BorderRadius.circular(2))),
            ),
          ),
        );
    Widget label(String t, {bool done = false, bool current = false}) => Expanded(
          child: Text(done ? '$t ✓' : t,
              style: NqType.caption.copyWith(
                  color: current ? NqFixed.heroText : NqFixed.heroTextSecondary,
                  fontWeight: current ? FontWeight.w700 : FontWeight.w400),
              textAlign: TextAlign.center),
        );
    return Column(
      children: [
        Row(children: [bar(1), const SizedBox(width: 6), bar(0.5), const SizedBox(width: 6), bar(0)]),
        const SizedBox(height: 6),
        Row(children: [label('إرجاع حاوية'), label('تفريغ', current: true), label('استلام', done: true)]),
      ],
    );
  }

  Widget _stopCard(NqColors c) => Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: c.sf,
          borderRadius: BorderRadius.circular(NqRadius.card),
          border: Border.all(color: c.bd),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(children: [
              Text('متبقٍ 4.2 km', style: NqType.caption.copyWith(color: c.tx2)),
              const Spacer(),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: BoxDecoration(color: c.infoBg, borderRadius: BorderRadius.circular(NqRadius.pill)),
                child: Row(mainAxisSize: MainAxisSize.min, children: [
                  Text('التوقف 2 من 3', style: NqType.caption.copyWith(color: c.info, fontWeight: FontWeight.w700)),
                  const SizedBox(width: 6),
                  NqIcon(NqIcons.mapPin, fill: true, size: 14, color: c.info),
                ]),
              ),
            ]),
            const SizedBox(height: 12),
            Text('تفريغ · مستودع الرّواد', style: NqType.driverTitle.copyWith(color: c.tx), textAlign: TextAlign.right),
            const SizedBox(height: 4),
            Text('الرياض، المدينة الصناعية الثانية، شارع 142',
                style: NqType.body.copyWith(color: c.tx2), textAlign: TextAlign.right),
            const SizedBox(height: 14),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(color: c.sf2, borderRadius: BorderRadius.circular(NqRadius.button)),
              child: Row(children: [
                NqIcon(NqIcons.info, size: 18, color: c.info),
                const SizedBox(width: 10),
                Expanded(
                  child: Text('الدخول من البوابة 3. اسأل عن أبو ناصر. التفريغ بالرافعة.',
                      style: NqType.body.copyWith(color: c.tx, height: 1.5), textAlign: TextAlign.right),
                ),
              ]),
            ),
            const SizedBox(height: 14),
            Row(children: [
              Ltr('TGHU 771392-0', style: NqType.code(size: 16).copyWith(color: c.tx)),
              const Spacer(),
              Text('حاوية', style: NqType.caption.copyWith(color: c.tx2)),
              const SizedBox(width: 6),
              NqIcon(NqIcons.shippingContainer, size: 18, color: c.tx2),
            ]),
            const SizedBox(height: 14),
            Row(children: [
              Expanded(child: NqButton(label: 'المستلم', icon: NqIcons.phone, variant: NqButtonVariant.secondary, onPressed: () {})),
              const SizedBox(width: 12),
              Expanded(child: NqButton(label: 'فتح الخرائط', icon: NqIcons.navigationArrow, variant: NqButtonVariant.secondary, onPressed: () {})),
            ]),
          ],
        ),
      );

  Widget _nextStop(NqColors c) => Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(NqRadius.button),
          border: Border.all(color: c.warn, width: 1.5),
        ),
        child: Row(children: [
          const Spacer(),
          Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
            Text('إرجاع الحاوية الفارغة', style: NqType.bodyStrong.copyWith(color: c.tx)),
            const SizedBox(height: 2),
            Text('ميناء الملك عبدالعزيز · الدمام', style: NqType.caption.copyWith(color: c.tx2)),
          ]),
          const SizedBox(width: 12),
          NqIcon(NqIcons.shippingContainer, size: 22, color: c.warn),
        ]),
      );

  Widget _footer(NqColors c) => Container(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
        decoration: BoxDecoration(color: c.sf, border: Border(top: BorderSide(color: c.bd))),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          NqButton(label: 'تأكيد الوصول', icon: NqIcons.mapPin, size: NqButtonSize.driver, onPressed: onArrive ?? () {}),
          const SizedBox(height: 10),
          GestureDetector(
            onTap: () {},
            child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
              NqIcon(NqIcons.warningCircle, size: 16, color: c.err),
              const SizedBox(width: 6),
              Text('الإبلاغ عن مشكلة', style: NqType.labelStrong.copyWith(color: c.err)),
            ]),
          ),
        ]),
      );
}
