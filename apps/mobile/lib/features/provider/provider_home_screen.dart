import 'package:flutter/material.dart';

import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';
import '../../core/widgets/ltr.dart';
import '../../core/widgets/nq_icon.dart';
import '../../design_system/button.dart';

/// Provider home (handoff 2d).
class ProviderHomeScreen extends StatelessWidget {
  const ProviderHomeScreen({super.key, this.onBell, this.onAssign});

  final VoidCallback? onBell;
  final VoidCallback? onAssign;

  @override
  Widget build(BuildContext context) {
    final c = context.nq;
    return ListView(
      padding: EdgeInsets.zero,
      children: [
        _hero(context, c),
        Transform.translate(
          offset: const Offset(0, -24),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 0),
            child: _assignCard(c),
          ),
        ),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: [
                  Expanded(child: _newLoadsTile(c)),
                  const SizedBox(width: 12),
                  Expanded(child: _receivablesTile(c)),
                ],
              ),
              const SizedBox(height: 14),
              _errorAlert(c),
              const SizedBox(height: 12),
              _messagesRow(c),
              const SizedBox(height: 24),
            ],
          ),
        ),
      ],
    );
  }

  Widget _hero(BuildContext context, NqColors c) => Container(
        color: c.hero,
        padding: EdgeInsets.fromLTRB(
            16, MediaQuery.of(context).padding.top + 12, 16, 30),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                GestureDetector(
                  onTap: onBell,
                  child: Container(
                    width: 44,
                    height: 44,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: NqFixed.heroFill2,
                      borderRadius: BorderRadius.circular(NqRadius.input),
                    ),
                    child: NqIcon(NqIcons.bell, size: 22, color: NqFixed.heroText),
                  ),
                ),
                const Spacer(),
                Expanded(
                  flex: 6,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.end,
                        children: [
                          NqIcon(NqIcons.sealCheck,
                              fill: true, size: 16, color: NqFixed.heroAccent),
                          const SizedBox(width: 6),
                          Flexible(
                            child: Text('شركة الأفق للنقل',
                                style: NqType.h2.copyWith(color: NqFixed.heroText),
                                textAlign: TextAlign.right),
                          ),
                        ],
                      ),
                      const SizedBox(height: 2),
                      Text('مزوّد · 14 شاحنة · 11 سائقًا',
                          style: NqType.caption
                              .copyWith(color: NqFixed.heroTextSecondary)),
                    ],
                  ),
                ),
                const SizedBox(width: 12),
                Container(
                  width: 44,
                  height: 44,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: NqFixed.heroFill2,
                    borderRadius: BorderRadius.circular(NqRadius.input),
                  ),
                  child: Text('أ', style: NqType.h3.copyWith(color: NqFixed.heroText)),
                ),
              ],
            ),
            const SizedBox(height: 18),
            Row(
              children: [
                _heroKpi(c, '5', 'سائق متاح'),
                const SizedBox(width: 10),
                _heroKpi(c, '3', 'مجدولة اليوم'),
                const SizedBox(width: 10),
                _heroKpi(c, '6', 'في الطريق'),
              ],
            ),
          ],
        ),
      );

  Widget _heroKpi(NqColors c, String value, String label) => Expanded(
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 12),
          decoration: BoxDecoration(
            color: NqFixed.heroFill1,
            borderRadius: BorderRadius.circular(NqRadius.button),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Ltr(value,
                  style: NqType.numeric(22, FontWeight.w700)
                      .copyWith(color: NqFixed.heroText)),
              const SizedBox(height: 2),
              Text(label,
                  style: NqType.caption.copyWith(color: NqFixed.heroTextSecondary)),
            ],
          ),
        ),
      );

  Widget _assignCard(NqColors c) => Container(
        decoration: BoxDecoration(
          color: c.sf,
          borderRadius: BorderRadius.circular(NqRadius.cardOverlap),
          boxShadow: c.isDark
              ? null
              : [
                  BoxShadow(
                      color: const Color(0x240A1A19),
                      blurRadius: 24,
                      offset: const Offset(0, 8),
                      spreadRadius: -12),
                ],
          border: c.isDark ? Border.all(color: c.bd) : null,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
              child: Row(
                children: [
                  Container(
                    width: 36,
                    height: 36,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: c.warnBg,
                      borderRadius: BorderRadius.circular(NqRadius.input),
                    ),
                    child: NqIcon(NqIcons.userPlus, size: 20, color: c.warn),
                  ),
                  const Spacer(),
                  Text('بانتظار إسناد سائق',
                      style: NqType.h3.copyWith(color: c.tx)),
                  const SizedBox(width: 10),
                  Container(
                    width: 24,
                    height: 24,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                        color: c.warnBg, shape: BoxShape.circle),
                    child: Text('2',
                        style: NqType.caption.copyWith(
                            color: c.warn, fontWeight: FontWeight.w700)),
                  ),
                ],
              ),
            ),
            _assignRow(c, 'الدمام ← الرياض', 'NQ-24-08856 · تريلا سطحة · الأربعاء 07:00'),
            Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Divider(color: c.bd, height: 1)),
            _assignRow(c, 'الجبيل ← جدة', 'NQ-24-08861 · ستارة · الخميس 05:30'),
            const SizedBox(height: 8),
          ],
        ),
      );

  Widget _assignRow(NqColors c, String route, String meta) => Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        child: Row(
          children: [
            NqButton(
                label: 'إسناد',
                expand: false,
                onPressed: onAssign ?? () {}),
            const Spacer(),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(route, style: NqType.h3.copyWith(color: c.tx)),
                const SizedBox(height: 2),
                Text(meta, style: NqType.caption.copyWith(color: c.tx2)),
              ],
            ),
          ],
        ),
      );

  Widget _newLoadsTile(NqColors c) => Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: c.sf,
          borderRadius: BorderRadius.circular(NqRadius.card),
          border: Border.all(color: c.bd),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Row(
              children: [
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: c.infoBg,
                    borderRadius: BorderRadius.circular(NqRadius.pill),
                  ),
                  child: Text('+1 مباشر',
                      style: NqType.caption.copyWith(
                          color: c.info, fontWeight: FontWeight.w700)),
                ),
                const Spacer(),
                NqIcon(NqIcons.magnifyingGlass, size: 20, color: c.tx2),
              ],
            ),
            const SizedBox(height: 12),
            Ltr('8', style: NqType.numeric(26, FontWeight.w700).copyWith(color: c.tx)),
            const SizedBox(height: 2),
            Text('فرص جديدة تناسب أسطولك',
                style: NqType.caption.copyWith(color: c.tx2),
                textAlign: TextAlign.right),
          ],
        ),
      );

  Widget _receivablesTile(NqColors c) => Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: c.sf,
          borderRadius: BorderRadius.circular(NqRadius.card),
          border: Border.all(color: c.bd),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            NqIcon(NqIcons.wallet, size: 20, color: c.tx2),
            const SizedBox(height: 12),
            Ltr('18,400',
                style: NqType.numeric(26, FontWeight.w700).copyWith(color: c.tx)),
            const SizedBox(height: 2),
            Text('مستحقات · 3 دفعات مُبلّغة',
                style: NqType.caption.copyWith(color: c.tx2),
                textAlign: TextAlign.right),
          ],
        ),
      );

  Widget _errorAlert(NqColors c) => Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: c.errBg,
          borderRadius: BorderRadius.circular(NqRadius.card),
        ),
        child: Row(
          children: [
            NqIcon(NqIcons.caretLeft, size: 18, color: c.tx3),
            const Spacer(),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text('تأخّر عن موعد الوصول',
                    style: NqType.bodyStrong.copyWith(color: c.err)),
                const SizedBox(height: 2),
                Text('NQ-24-08799 · سالم القحطاني · آخر موقع قبل 22 د',
                    style: NqType.caption.copyWith(color: c.tx2)),
              ],
            ),
            const SizedBox(width: 12),
            NqIcon(NqIcons.warningOctagon, size: 24, color: c.err),
          ],
        ),
      );

  Widget _messagesRow(NqColors c) => Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: c.sf,
          borderRadius: BorderRadius.circular(NqRadius.card),
          border: Border.all(color: c.bd),
        ),
        child: Row(
          children: [
            Stack(
              clipBehavior: Clip.none,
              children: [
                Container(
                  width: 44,
                  height: 44,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: c.mintBg,
                    borderRadius: BorderRadius.circular(NqRadius.input),
                  ),
                  child: NqIcon(NqIcons.chats, size: 22, color: c.mintTx),
                ),
                PositionedDirectional(
                  top: -4,
                  start: -4,
                  child: Container(
                    width: 20,
                    height: 20,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                        color: c.mint, shape: BoxShape.circle),
                    child: Text('3',
                        style: NqType.caption.copyWith(
                            color: c.onMint, fontWeight: FontWeight.w700, fontSize: 11)),
                  ),
                ),
              ],
            ),
            const Spacer(),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text('رسائل العملاء', style: NqType.h3.copyWith(color: c.tx)),
                const SizedBox(height: 2),
                Text('مصنع الرّواد: «متى يوصل السائق البوابة؟»',
                    style: NqType.caption.copyWith(color: c.tx2)),
              ],
            ),
          ],
        ),
      );
}
