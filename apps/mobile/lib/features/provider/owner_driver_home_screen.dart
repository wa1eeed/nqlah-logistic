import 'package:flutter/material.dart';

import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';
import '../../core/widgets/ltr.dart';
import '../../core/widgets/nq_icon.dart';
import '../../design_system/button.dart';
import '../../design_system/context_switch.dart';

/// Owner-driver home — one screen with a context switch (handoff 1i «أعمل
/// كمزوّد» ↔ 2e «أقود الآن»). The shell owns the context + bottom-tab set.
class OwnerDriverHomeScreen extends StatelessWidget {
  const OwnerDriverHomeScreen({
    super.key,
    required this.driving,
    required this.onSwitch,
    this.onSelfAssign,
  });

  final bool driving;
  final ValueChanged<int> onSwitch;
  final VoidCallback? onSelfAssign;

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
          const SizedBox(height: 14),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: NqContextSwitch(
              index: driving ? 1 : 0,
              onChanged: onSwitch,
              options: [
                NqContextOption('أعمل كمزوّد', NqIcons.briefcase,
                    badge: driving ? 1 : null),
                const NqContextOption('أقود الآن', NqIcons.steeringWheel),
              ],
            ),
          ),
          const SizedBox(height: 14),
          Expanded(
            child: driving ? _driving(c) : _provider(c),
          ),
          if (driving)
            Container(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
              decoration: BoxDecoration(
                color: c.sf,
                border: Border(top: BorderSide(color: c.bd)),
              ),
              child: NqButton(
                label: 'تأكيد الوصول للاستلام',
                icon: NqIcons.mapPin,
                size: NqButtonSize.driver,
                onPressed: () {},
              ),
            ),
        ],
      ),
    );
  }

  Widget _header(NqColors c) => Row(
        children: [
          if (!driving)
            Container(
              height: 32,
              padding: const EdgeInsets.symmetric(horizontal: 12),
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: c.okBg,
                borderRadius: BorderRadius.circular(NqRadius.pill),
              ),
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
              Row(mainAxisSize: MainAxisSize.min, children: [
                NqIcon(NqIcons.sealCheck, fill: true, size: 16, color: c.mintTx),
                const SizedBox(width: 6),
                Text('خالد الحربي', style: NqType.h2.copyWith(color: c.tx)),
              ]),
              const SizedBox(height: 2),
              Text(driving ? 'مزوّد · سائقه الوحيد' : 'مزوّد وسائق · 7781 HDA',
                  style: NqType.caption.copyWith(color: c.tx2)),
            ],
          ),
          const SizedBox(width: 12),
          Container(
            width: 52,
            height: 52,
            alignment: Alignment.center,
            decoration: BoxDecoration(color: c.hero, shape: BoxShape.circle),
            child: Text('خ', style: NqType.h1.copyWith(color: NqFixed.heroText)),
          ),
        ],
      );

  // ---- Provider context (1i) ----
  Widget _provider(NqColors c) => ListView(
        padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
        children: [
          _acceptedCard(c),
          const SizedBox(height: 14),
          Row(
            children: [
              Expanded(child: _earningsTile(c)),
              const SizedBox(width: 12),
              Expanded(child: _matchesTile(c)),
            ],
          ),
          const SizedBox(height: 18),
          Row(children: [
            Text('كل الرحلات', style: NqType.labelStrong.copyWith(color: c.mintTx)),
            const Spacer(),
            Text('رحلتي القادمة', style: NqType.h2.copyWith(color: c.tx)),
          ]),
          const SizedBox(height: 10),
          _upcomingTrip(c),
        ],
      );

  Widget _acceptedCard(NqColors c) => Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: c.warnBg,
          borderRadius: BorderRadius.circular(NqRadius.card),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(children: [
              const Spacer(),
              Text('مقبول · بانتظار إسناد سائق',
                  style: NqType.labelStrong.copyWith(color: c.warn)),
              const SizedBox(width: 6),
              NqIcon(NqIcons.warningCircle, size: 16, color: c.warn),
            ]),
            const SizedBox(height: 12),
            Row(children: [
              Ltr('2,100', style: NqType.price(size: 20).copyWith(color: c.tx)),
              const Spacer(),
              Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                Text('الرياض ← القصيم', style: NqType.h2.copyWith(color: c.tx)),
                const SizedBox(height: 2),
                Text('NQ-24-08871 · الخميس 06:30',
                    style: NqType.caption.copyWith(color: c.tx2)),
              ]),
            ]),
            const SizedBox(height: 14),
            Row(children: [
              NqButton(label: 'سائق آخر', variant: NqButtonVariant.secondary, expand: false, onPressed: () {}),
              const SizedBox(width: 12),
              Expanded(
                child: NqButton(
                    label: 'إسناد لنفسي',
                    icon: NqIcons.steeringWheel,
                    onPressed: onSelfAssign ?? () {}),
              ),
            ]),
          ],
        ),
      );

  Widget _earningsTile(NqColors c) => Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: c.sf,
          borderRadius: BorderRadius.circular(NqRadius.card),
          border: Border.all(color: c.bd),
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
          NqIcon(NqIcons.wallet, size: 20, color: c.tx2),
          const SizedBox(height: 12),
          Ltr('8,450', style: NqType.numeric(26, FontWeight.w700).copyWith(color: c.tx)),
          const SizedBox(height: 2),
          Text('أرباح أكتوبر · ر.س', style: NqType.caption.copyWith(color: c.tx2)),
        ]),
      );

  Widget _matchesTile(NqColors c) => Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: c.hero,
          borderRadius: BorderRadius.circular(NqRadius.card),
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
          NqIcon(NqIcons.magnifyingGlass, size: 20, color: NqFixed.heroTextSecondary),
          const SizedBox(height: 12),
          Ltr('12', style: NqType.numeric(26, FontWeight.w700).copyWith(color: NqFixed.heroText)),
          const SizedBox(height: 2),
          Text('حمولة تناسب شاحنتك',
              style: NqType.caption.copyWith(color: NqFixed.heroTextSecondary)),
        ]),
      );

  Widget _upcomingTrip(NqColors c) => Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: c.sf,
          borderRadius: BorderRadius.circular(NqRadius.card),
          border: Border.all(color: c.bd),
        ),
        child: Row(children: [
          _statusPill(c, 'مؤكّدة', c.mintTx, c.mintBg),
          const Spacer(),
          Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
            Text('الدمام ← الأحساء', style: NqType.h3.copyWith(color: c.tx)),
            const SizedBox(height: 2),
            Text('ستارة · 3 توقفات', style: NqType.caption.copyWith(color: c.tx2)),
          ]),
          const SizedBox(width: 12),
          _dateTile(c, 'غدًا', '05:00'),
        ]),
      );

  // ---- Driving context (2e) ----
  Widget _driving(NqColors c) => ListView(
        padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
        children: [
          _activeTripCard(c),
          const SizedBox(height: 18),
          Text('رحلات اليوم', style: NqType.labelStrong.copyWith(color: c.tx2), textAlign: TextAlign.right),
          const SizedBox(height: 10),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: c.sf,
              borderRadius: BorderRadius.circular(NqRadius.card),
              border: Border.all(color: c.bd),
            ),
            child: Row(children: [
              _statusPill(c, 'مؤكّدة', c.mintTx, c.mintBg),
              const Spacer(),
              Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                Text('الرياض ← القصيم', style: NqType.h3.copyWith(color: c.tx)),
                const SizedBox(height: 2),
                Text('أسندتها لنفسك', style: NqType.caption.copyWith(color: c.tx2)),
              ]),
              const SizedBox(width: 12),
              Ltr('16:30', style: NqType.numeric(16, FontWeight.w700).copyWith(color: c.tx)),
            ]),
          ),
        ],
      );

  Widget _activeTripCard(NqColors c) => Container(
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
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: BoxDecoration(color: c.infoBg, borderRadius: BorderRadius.circular(NqRadius.pill)),
                child: Row(mainAxisSize: MainAxisSize.min, children: [
                  NqIcon(NqIcons.truck, fill: true, size: 14, color: c.info),
                  const SizedBox(width: 6),
                  Text('في الطريق · التوقف 1 من 2',
                      style: NqType.caption.copyWith(color: c.info, fontWeight: FontWeight.w700)),
                ]),
              ),
              const Spacer(),
              Ltr('NQ-24-08871', style: NqType.code(size: 13).copyWith(color: c.tx2)),
            ]),
            const SizedBox(height: 12),
            Text('استلام · مستودع التميمي',
                style: NqType.driverTitle.copyWith(color: c.tx), textAlign: TextAlign.right),
            const SizedBox(height: 4),
            Row(children: [
              const Spacer(),
              Text('الرياض، حي السلي · ', style: NqType.caption.copyWith(color: c.tx2)),
              Ltr('متبقٍ 7.8 km', style: NqType.caption.copyWith(color: c.tx2)),
            ]),
            const SizedBox(height: 14),
            Row(children: [
              Expanded(child: NqButton(label: 'العميل', icon: NqIcons.chats, variant: NqButtonVariant.secondary, onPressed: () {})),
              const SizedBox(width: 12),
              Expanded(child: NqButton(label: 'فتح الخرائط', icon: NqIcons.navigationArrow, variant: NqButtonVariant.secondary, onPressed: () {})),
            ]),
            const SizedBox(height: 12),
            Row(children: [
              const Spacer(),
              Text('تتواصل مع العميل بصفتك المزوّد المتعاقد',
                  style: NqType.caption.copyWith(color: c.tx2)),
              const SizedBox(width: 6),
              NqIcon(NqIcons.info, size: 14, color: c.tx3),
            ]),
          ],
        ),
      );

  Widget _statusPill(NqColors c, String label, Color fg, Color bg) => Container(
        height: 28,
        padding: const EdgeInsets.symmetric(horizontal: 10),
        decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(NqRadius.pill)),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          NqIcon(NqIcons.checkCircle, size: 14, color: fg),
          const SizedBox(width: 6),
          Text(label, style: NqType.caption.copyWith(color: fg, fontWeight: FontWeight.w700)),
        ]),
      );

  Widget _dateTile(NqColors c, String day, String time) => Container(
        width: 56,
        padding: const EdgeInsets.symmetric(vertical: 8),
        decoration: BoxDecoration(color: c.sf2, borderRadius: BorderRadius.circular(NqRadius.button)),
        child: Column(children: [
          Text(day, style: NqType.caption.copyWith(color: c.tx2)),
          Ltr(time, style: NqType.numeric(16, FontWeight.w700).copyWith(color: c.tx)),
        ]),
      );
}
