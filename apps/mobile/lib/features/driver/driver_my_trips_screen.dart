import 'package:flutter/material.dart';

import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';
import '../../core/widgets/ltr.dart';
import '../../core/widgets/nq_icon.dart';
import '../../design_system/button.dart';
import '../../design_system/segmented.dart';

/// Employed-driver home — my trips (handoff 5a). Execution-only: no prices, no
/// customer identity. New assignments are acknowledged with «استلام التكليف».
class DriverMyTripsScreen extends StatefulWidget {
  const DriverMyTripsScreen({super.key, this.onAcknowledge, this.onOpenTrip});

  final VoidCallback? onAcknowledge;
  final VoidCallback? onOpenTrip;

  @override
  State<DriverMyTripsScreen> createState() => _DriverMyTripsScreenState();
}

class _DriverMyTripsScreenState extends State<DriverMyTripsScreen> {
  int _seg = 0;

  @override
  Widget build(BuildContext context) {
    final c = context.nq;
    return SafeArea(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
            child: _header(c),
          ),
          const SizedBox(height: 16),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: NqSegmented(
              options: const ['جديدة 1', 'قادمة 2', 'مكتملة'],
              index: _seg,
              onChanged: (i) => setState(() => _seg = i),
            ),
          ),
          const SizedBox(height: 14),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
              children: [
                _newAssignment(c),
                const SizedBox(height: 18),
                Text('القادمة', style: NqType.labelStrong.copyWith(color: c.tx2), textAlign: TextAlign.right),
                const SizedBox(height: 10),
                _upcoming(c),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _header(NqColors c) => Row(
        children: [
          Container(
            height: 32,
            padding: const EdgeInsets.symmetric(horizontal: 12),
            alignment: Alignment.center,
            decoration: BoxDecoration(color: c.okBg, borderRadius: BorderRadius.circular(NqRadius.pill)),
            child: Row(mainAxisSize: MainAxisSize.min, children: [
              Container(width: 7, height: 7, decoration: BoxDecoration(color: c.ok, shape: BoxShape.circle)),
              const SizedBox(width: 6),
              Text('متاح', style: NqType.caption.copyWith(color: c.ok, fontWeight: FontWeight.w700)),
            ]),
          ),
          const Spacer(),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text('فهد العتيبي', style: NqType.h2.copyWith(color: c.tx)),
              const SizedBox(height: 2),
              Text('سائق · شركة الأفق للنقل', style: NqType.caption.copyWith(color: c.tx2)),
            ],
          ),
          const SizedBox(width: 12),
          Container(
            width: 52,
            height: 52,
            alignment: Alignment.center,
            decoration: BoxDecoration(color: c.hero, shape: BoxShape.circle),
            child: Text('ف', style: NqType.h1.copyWith(color: NqFixed.heroText)),
          ),
        ],
      );

  Widget _newAssignment(NqColors c) => Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: c.sf,
          borderRadius: BorderRadius.circular(NqRadius.cardOverlap),
          border: Border.all(color: c.mintS, width: 2),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: BoxDecoration(color: c.mintBg, borderRadius: BorderRadius.circular(NqRadius.pill)),
                child: Row(mainAxisSize: MainAxisSize.min, children: [
                  NqIcon(NqIcons.bell, size: 14, color: c.mintTx),
                  const SizedBox(width: 6),
                  Text('تكليف جديد', style: NqType.caption.copyWith(color: c.mintTx, fontWeight: FontWeight.w700)),
                ]),
              ),
              const Spacer(),
              Ltr('NQ-24-08856 · L1', style: NqType.code(size: 14).copyWith(color: c.tx2)),
            ]),
            const SizedBox(height: 12),
            Text('الدمام ← الرياض', style: NqType.driverTitle.copyWith(color: c.tx), textAlign: TextAlign.right),
            const SizedBox(height: 10),
            _detail(c, NqIcons.calendarBlank, 'الأربعاء 29/10 · 07:00'),
            _detail(c, NqIcons.truck, 'تريلا سطحة · 7342 KHD'),
            _detail(c, NqIcons.mapPin, 'استلام + تفريغ + إرجاع حاوية'),
            const SizedBox(height: 12),
            _officeNote(c),
            const SizedBox(height: 14),
            NqButton(
              label: 'استلام التكليف',
              icon: NqIcons.checkCircle,
              size: NqButtonSize.driver,
              onPressed: widget.onAcknowledge ?? () {},
            ),
            const SizedBox(height: 10),
            Text('أسندها لك مكتب شركة الأفق · للاستفسار اتصل بالمكتب',
                style: NqType.caption.copyWith(color: c.tx2), textAlign: TextAlign.center),
          ],
        ),
      );

  Widget _detail(NqColors c, String icon, String text) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 4),
        child: Row(children: [
          const Spacer(),
          Text(text, style: NqType.body.copyWith(color: c.tx)),
          const SizedBox(width: 8),
          NqIcon(icon, size: 18, color: c.tx2),
        ]),
      );

  Widget _officeNote(NqColors c) => Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: c.warnBg,
          borderRadius: BorderRadius.circular(NqRadius.button),
          border: Border.all(color: c.warn, width: 1.5),
        ),
        child: Text.rich(
          TextSpan(children: [
            TextSpan(text: 'ملاحظة من المكتب: ', style: NqType.labelStrong.copyWith(color: c.warn)),
            TextSpan(text: 'الدخول من البوابة 3 والتحميل بالرافعة.', style: NqType.body.copyWith(color: c.tx)),
          ]),
          textAlign: TextAlign.right,
        ),
      );

  Widget _upcoming(NqColors c) => GestureDetector(
        onTap: widget.onOpenTrip,
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: c.sf,
            borderRadius: BorderRadius.circular(NqRadius.card),
            border: Border.all(color: c.bd),
          ),
          child: Row(children: [
            Container(
              height: 28,
              padding: const EdgeInsets.symmetric(horizontal: 10),
              decoration: BoxDecoration(color: c.mintBg, borderRadius: BorderRadius.circular(NqRadius.pill)),
              child: Row(mainAxisSize: MainAxisSize.min, children: [
                NqIcon(NqIcons.checkCircle, size: 14, color: c.mintTx),
                const SizedBox(width: 6),
                Text('مؤكّد', style: NqType.caption.copyWith(color: c.mintTx, fontWeight: FontWeight.w700)),
              ]),
            ),
            const Spacer(),
            Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
              Text('الجبيل ← جدة', style: NqType.h3.copyWith(color: c.tx)),
              const SizedBox(height: 2),
              Text('ستارة · توقفان', style: NqType.caption.copyWith(color: c.tx2)),
            ]),
            const SizedBox(width: 12),
            Container(
              width: 60,
              padding: const EdgeInsets.symmetric(vertical: 8),
              decoration: BoxDecoration(color: c.sf2, borderRadius: BorderRadius.circular(NqRadius.button)),
              child: Column(children: [
                Text('الخميس', style: NqType.caption.copyWith(color: c.tx2)),
                Ltr('05:30', style: NqType.numeric(16, FontWeight.w700).copyWith(color: c.tx)),
              ]),
            ),
          ]),
        ),
      );
}
