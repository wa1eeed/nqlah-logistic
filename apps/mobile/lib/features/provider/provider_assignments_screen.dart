import 'package:flutter/material.dart';

import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';
import '../../core/widgets/ltr.dart';
import '../../core/widgets/nq_icon.dart';
import '../../design_system/button.dart';
import '../../design_system/chip.dart';

/// Provider assignments (handoff 3c): filter chips + grouped order cards
/// (awaiting assignment / in transit, incl. a late card).
class ProviderAssignmentsScreen extends StatefulWidget {
  const ProviderAssignmentsScreen({super.key, this.onAssign, this.onOpen});

  final VoidCallback? onAssign;
  final VoidCallback? onOpen;

  @override
  State<ProviderAssignmentsScreen> createState() =>
      _ProviderAssignmentsScreenState();
}

class _ProviderAssignmentsScreenState extends State<ProviderAssignmentsScreen> {
  int _filter = 0;

  @override
  Widget build(BuildContext context) {
    final c = context.nq;
    return SafeArea(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
            child: Row(
              children: [
                Text('15 طلبًا', style: NqType.label.copyWith(color: c.tx2)),
                const Spacer(),
                Text('التكليفات', style: NqType.h1.copyWith(color: c.tx)),
              ],
            ),
          ),
          const SizedBox(height: 14),
          _filterChips(c),
          const SizedBox(height: 12),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
              children: [
                _sectionLabel(c, 'بانتظار إسناد · 2'),
                const SizedBox(height: 10),
                _pendingCard(c, 'الدمام ← الرياض',
                    'NQ-24-08856 · تريلا سطحة · الأربعاء 07:00'),
                const SizedBox(height: 12),
                _pendingCard(c, 'الجبيل ← جدة',
                    'NQ-24-08861 · ستارة · الخميس 05:30'),
                const SizedBox(height: 18),
                _sectionLabel(c, 'في الطريق · 6'),
                const SizedBox(height: 10),
                _transitCard(c,
                    route: 'الدمام ← الرياض',
                    code: 'NQ-24-08812',
                    driver: 'فهد العتيبي',
                    status: 'التوقف 2/3 · الوصول 14:20',
                    progress: 0.75,
                    late: false),
                const SizedBox(height: 12),
                _transitCard(c,
                    route: 'الخبر ← الأحساء',
                    code: 'NQ-24-08799',
                    driver: 'سالم القحطاني',
                    status: 'آخر موقع قبل 22 د',
                    progress: 0.9,
                    late: true),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _filterChips(NqColors c) {
    const labels = ['الكل', 'بانتظار إسناد', 'مُسند', 'في الطريق'];
    const counts = [15, 2, 4, 6];
    return SizedBox(
      height: 36,
      child: ListView(
        scrollDirection: Axis.horizontal,
        reverse: true,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        children: [
          for (var i = 0; i < labels.length; i++) ...[
            NqChip(
              label: labels[i],
              selected: _filter == i,
              count: counts[i],
              onTap: () => setState(() => _filter = i),
            ),
            if (i < labels.length - 1) const SizedBox(width: 8),
          ],
        ],
      ),
    );
  }

  Widget _sectionLabel(NqColors c, String t) =>
      Text(t, style: NqType.labelStrong.copyWith(color: c.tx2), textAlign: TextAlign.right);

  Widget _card(NqColors c, Widget child) => GestureDetector(
        onTap: widget.onOpen,
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: c.sf,
            borderRadius: BorderRadius.circular(NqRadius.card),
            border: Border.all(color: c.bd),
          ),
          child: child,
        ),
      );

  Widget _pendingCard(NqColors c, String route, String meta) => _card(
        c,
        Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                  decoration: BoxDecoration(
                    color: c.warnBg,
                    borderRadius: BorderRadius.circular(NqRadius.pill),
                  ),
                  child: Row(mainAxisSize: MainAxisSize.min, children: [
                    NqIcon(NqIcons.userPlus, size: 14, color: c.warn),
                    const SizedBox(width: 6),
                    Text('بانتظار إسناد',
                        style: NqType.caption
                            .copyWith(color: c.warn, fontWeight: FontWeight.w700)),
                  ]),
                ),
                const Spacer(),
                Expanded(
                  flex: 3,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(route, style: NqType.h3.copyWith(color: c.tx)),
                      const SizedBox(height: 2),
                      Text(meta,
                          style: NqType.caption.copyWith(color: c.tx2),
                          textAlign: TextAlign.right),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Divider(color: c.bd, height: 1),
            const SizedBox(height: 12),
            Row(
              children: [
                NqButton(label: 'إسناد', expand: false, onPressed: widget.onAssign ?? () {}),
                const Spacer(),
                Text('لم يُسند بعد', style: NqType.label.copyWith(color: c.tx2)),
                const SizedBox(width: 6),
                NqIcon(NqIcons.userCircle, size: 18, color: c.tx3),
              ],
            ),
          ],
        ),
      );

  Widget _transitCard(NqColors c,
      {required String route,
      required String code,
      required String driver,
      required String status,
      required double progress,
      required bool late}) {
    final accent = late ? c.err : c.info;
    return _card(
      c,
      Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: BoxDecoration(
                  color: late ? c.errBg : c.infoBg,
                  borderRadius: BorderRadius.circular(NqRadius.pill),
                ),
                child: Row(mainAxisSize: MainAxisSize.min, children: [
                  NqIcon(late ? NqIcons.warningOctagon : NqIcons.truck,
                      fill: !late, size: 14, color: accent),
                  const SizedBox(width: 6),
                  Text(late ? 'متأخر 35 د' : 'في الطريق',
                      style: NqType.caption
                          .copyWith(color: accent, fontWeight: FontWeight.w700)),
                ]),
              ),
              const Spacer(),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(route, style: NqType.h3.copyWith(color: c.tx)),
                  const SizedBox(height: 2),
                  Ltr(code, style: NqType.code(size: 13).copyWith(color: c.tx2)),
                ],
              ),
            ],
          ),
          const SizedBox(height: 12),
          ClipRRect(
            borderRadius: BorderRadius.circular(3),
            child: LinearProgressIndicator(
              value: progress,
              minHeight: 6,
              backgroundColor: c.sf2,
              color: accent,
            ),
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Text(status,
                  style: NqType.label.copyWith(
                      color: late ? c.err : c.tx2,
                      fontWeight: late ? FontWeight.w700 : FontWeight.w500)),
              const Spacer(),
              Text(driver, style: NqType.label.copyWith(color: c.tx)),
              const SizedBox(width: 6),
              NqIcon(NqIcons.steeringWheel, size: 18, color: c.tx3),
            ],
          ),
        ],
      ),
    );
  }
}
