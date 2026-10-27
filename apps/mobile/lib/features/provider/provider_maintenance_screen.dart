import 'package:flutter/material.dart';

import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';
import '../../core/widgets/ltr.dart';
import '../../core/widgets/nq_icon.dart';
import '../../design_system/button.dart';

/// Truck detail + maintenance (handoff 3g, paid add-on «إدارة صيانة الأسطول»).
class ProviderMaintenanceScreen extends StatelessWidget {
  const ProviderMaintenanceScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final c = context.nq;
    return Scaffold(
      backgroundColor: c.bg,
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _appBar(context, c),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
                children: [
                  _heroCard(c),
                  const SizedBox(height: 18),
                  _scheduleHeader(c),
                  const SizedBox(height: 10),
                  _scheduleCard(c),
                  const SizedBox(height: 18),
                  Text('آخر الصيانات', style: NqType.h2.copyWith(color: c.tx)),
                  const SizedBox(height: 10),
                  _lastCard(c),
                ],
              ),
            ),
            _footer(c),
          ],
        ),
      ),
    );
  }

  Widget _appBar(BuildContext context, NqColors c) => Padding(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
        child: Row(
          children: [
            NqIcon(NqIcons.dotsThree, size: 22, color: c.tx),
            const Spacer(),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Ltr('7342 KHD', style: NqType.code(size: 16).copyWith(color: c.tx)),
                const SizedBox(height: 2),
                Text('تريلا سطحة · مرسيدس أكتروس 2021',
                    style: NqType.caption.copyWith(color: c.tx2)),
              ],
            ),
            const SizedBox(width: 12),
            GestureDetector(
              onTap: () => Navigator.of(context).maybePop(),
              child: NqIcon(NqIcons.arrowRight, size: 22, color: c.tx),
            ),
          ],
        ),
      );

  Widget _heroCard(NqColors c) => Container(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          color: c.hero,
          borderRadius: BorderRadius.circular(NqRadius.cardOverlap),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Row(
              children: [
                Text('السائق: فهد العتيبي',
                    style: NqType.caption.copyWith(color: NqFixed.heroTextSecondary)),
                const Spacer(),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: NqFixed.heroFill2,
                    borderRadius: BorderRadius.circular(NqRadius.pill),
                  ),
                  child: Row(mainAxisSize: MainAxisSize.min, children: [
                    Text('إدارة صيانة الأسطول',
                        style: NqType.caption.copyWith(
                            color: NqFixed.heroText, fontWeight: FontWeight.w700)),
                    const SizedBox(width: 6),
                    NqIcon(NqIcons.wrench, size: 14, color: NqFixed.heroAccent),
                  ]),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Text('عدّاد المسافة',
                style: NqType.caption.copyWith(color: NqFixed.heroTextSecondary)),
            const SizedBox(height: 2),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                Ltr('184,320',
                    style: NqType.price(size: 26).copyWith(color: NqFixed.heroText)),
                const SizedBox(width: 4),
                Text('km', style: NqType.h3.copyWith(color: NqFixed.heroTextSecondary)),
              ],
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                Ltr('1,200 km',
                    style: NqType.numeric(15, FontWeight.w700).copyWith(color: const Color(0xFFFBBF24))),
                const Spacer(),
                Text('الصيانة القادمة بعد',
                    style: NqType.caption.copyWith(color: NqFixed.heroTextSecondary)),
              ],
            ),
            const SizedBox(height: 8),
            ClipRRect(
              borderRadius: BorderRadius.circular(3),
              child: const LinearProgressIndicator(
                value: 0.92,
                minHeight: 6,
                backgroundColor: Color(0x1FFFFFFF),
                color: Color(0xFFFBBF24),
              ),
            ),
          ],
        ),
      );

  Widget _scheduleHeader(NqColors c) => Row(
        children: [
          Text('إضافة بند', style: NqType.labelStrong.copyWith(color: c.mintTx)),
          const Spacer(),
          Text('جدول الصيانة', style: NqType.h2.copyWith(color: c.tx)),
        ],
      );

  Widget _scheduleCard(NqColors c) => Container(
        decoration: BoxDecoration(
          color: c.sf,
          borderRadius: BorderRadius.circular(NqRadius.card),
          border: Border.all(color: c.bd),
        ),
        child: Column(
          children: [
            _item(c, NqIcons.drop, c.warn, c.warnBg, 'تغيير الزيت والفلاتر',
                'كل 15,000 km', 'بعد 1,200 km', warn: true),
            _divider(c),
            _item(c, NqIcons.clipboardText, c.warn, c.warnBg,
                'الفحص الفني الدوري', 'ينتهي 14/11/2026', 'خلال 18 يومًا', warn: true),
            _divider(c),
            _item(c, NqIcons.shieldCheck, c.ok, c.okBg, 'التأمين',
                'ينتهي 03/2027', 'ساري'),
            _divider(c),
            _item(c, NqIcons.gauge, c.ok, c.okBg, 'الإطارات',
                'آخر تغيير 02/2026', 'سليمة'),
          ],
        ),
      );

  Widget _divider(NqColors c) => Padding(
      padding: const EdgeInsets.symmetric(horizontal: 14),
      child: Divider(color: c.bd, height: 1));

  Widget _item(NqColors c, String icon, Color fg, Color bg, String title,
          String sub, String chip, {bool warn = false}) =>
      Padding(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
        child: Row(
          children: [
            Container(
              height: 28,
              padding: const EdgeInsets.symmetric(horizontal: 10),
              decoration: BoxDecoration(
                color: warn ? c.warnBg : c.okBg,
                borderRadius: BorderRadius.circular(NqRadius.pill),
              ),
              child: Row(mainAxisSize: MainAxisSize.min, children: [
                NqIcon(warn ? NqIcons.warningCircle : NqIcons.checkCircle,
                    size: 14, color: warn ? c.warn : c.ok),
                const SizedBox(width: 6),
                Ltr(chip,
                    style: NqType.caption.copyWith(
                        color: warn ? c.warn : c.ok, fontWeight: FontWeight.w700)),
              ]),
            ),
            const Spacer(),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(title, style: NqType.bodyStrong.copyWith(color: c.tx)),
                const SizedBox(height: 2),
                Text(sub, style: NqType.caption.copyWith(color: c.tx2)),
              ],
            ),
            const SizedBox(width: 12),
            Container(
              width: 40,
              height: 40,
              alignment: Alignment.center,
              decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(NqRadius.input)),
              child: NqIcon(icon, size: 20, color: fg),
            ),
          ],
        ),
      );

  Widget _lastCard(NqColors c) => Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: c.sf,
          borderRadius: BorderRadius.circular(NqRadius.card),
          border: Border.all(color: c.bd),
        ),
        child: Row(
          children: [
            Row(children: [
              Ltr('1,450', style: NqType.price(size: 16).copyWith(color: c.tx)),
              const SizedBox(width: 3),
              Text('ر.س', style: NqType.caption.copyWith(color: c.tx2)),
            ]),
            const Spacer(),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text('تغيير فحمات الفرامل', style: NqType.h3.copyWith(color: c.tx)),
                const SizedBox(height: 2),
                Text('12/09/2026 · ورشة الجبر',
                    style: NqType.caption.copyWith(color: c.tx2)),
              ],
            ),
            const SizedBox(width: 12),
            Container(
              width: 40,
              height: 40,
              alignment: Alignment.center,
              decoration: BoxDecoration(color: c.sf2, borderRadius: BorderRadius.circular(NqRadius.input)),
              child: NqIcon(NqIcons.wrench, size: 20, color: c.tx2),
            ),
          ],
        ),
      );

  Widget _footer(NqColors c) => Container(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
        decoration: BoxDecoration(
          color: c.sf,
          border: Border(top: BorderSide(color: c.bd)),
        ),
        child: NqButton(label: 'تسجيل صيانة', icon: NqIcons.wrench, onPressed: () {}),
      );
}
