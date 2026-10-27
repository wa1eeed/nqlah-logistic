import 'package:flutter/material.dart';

import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';
import '../../core/widgets/ltr.dart';
import '../../core/widgets/nq_icon.dart';
import '../../design_system/button.dart';
import '../../design_system/party_card.dart';

/// Available-truck detail + direct request (Addendum-01 6b).
class TruckDetailScreen extends StatelessWidget {
  const TruckDetailScreen({super.key, this.onRequest});

  final VoidCallback? onRequest;

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
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
                children: [
                  const NqPartyCard(
                    initial: 'أ',
                    name: 'شركة الأفق للنقل',
                    role: '★ 4.8 · 312 رحلة · يرد عادة خلال 30 د',
                    showCall: false,
                    revealed: false,
                    phone: '+966 •• ••• ••••',
                    revealLabel: 'التواصل داخل التطبيق حتى قبول الطلب',
                  ),
                  const SizedBox(height: 14),
                  _availabilityCard(c),
                  const SizedBox(height: 14),
                  _priceCard(c),
                ],
              ),
            ),
            _footer(context, c),
          ],
        ),
      ),
    );
  }

  Widget _appBar(NqColors c) => Padding(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
        child: Row(
          children: [
            NqIcon(NqIcons.shareNetwork, size: 22, color: c.tx),
            const Spacer(),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text('رحلة عودة متاحة', style: NqType.h3.copyWith(color: c.tx)),
                const SizedBox(height: 2),
                Text('الرياض ← الدمام · الأربعاء 29/10',
                    style: NqType.caption.copyWith(color: c.tx2)),
              ],
            ),
            const SizedBox(width: 12),
            NqIcon(NqIcons.arrowRight, size: 22, color: c.tx),
          ],
        ),
      );

  Widget _availabilityCard(NqColors c) => Container(
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
              children: [
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                  decoration: BoxDecoration(
                    color: c.mintBg,
                    borderRadius: BorderRadius.circular(NqRadius.pill),
                  ),
                  child: Row(mainAxisSize: MainAxisSize.min, children: [
                    NqIcon(NqIcons.arrowUDownLeft, size: 14, color: c.mintTx),
                    const SizedBox(width: 6),
                    Text('رحلة عودة',
                        style: NqType.caption.copyWith(
                            color: c.mintTx, fontWeight: FontWeight.w700)),
                  ]),
                ),
                const Spacer(),
                Text('نُشر قبل 3 س', style: NqType.caption.copyWith(color: c.tx2)),
              ],
            ),
            const SizedBox(height: 14),
            _route(c),
            const SizedBox(height: 16),
            _specTiles(c),
            const SizedBox(height: 14),
            _featureChips(c),
          ],
        ),
      );

  Widget _route(NqColors c) {
    Widget place(String city, String sub, {bool dim = false}) => Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(city, style: NqType.h2.copyWith(color: dim ? c.tx2 : c.tx)),
            Text(sub, style: NqType.caption.copyWith(color: c.tx2)),
          ],
        );
    return Row(
      children: [
        place('الرياض', 'السلي · نطاق 40 km'),
        const SizedBox(width: 10),
        Expanded(
          child: SizedBox(
            height: 30,
            child: Directionality(
              textDirection: TextDirection.ltr,
              child: Row(
                children: [
                  Container(
                      width: 12,
                      height: 12,
                      decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          border: Border.all(color: c.tx3, width: 2))),
                  Expanded(child: _dash(c)),
                  Container(
                    width: 30,
                    height: 30,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(color: c.mintBg, shape: BoxShape.circle),
                    child: Transform.flip(
                        flipX: true,
                        child: NqIcon(NqIcons.truck,
                            fill: true, size: 16, color: c.mintTx)),
                  ),
                  Expanded(child: _dash(c)),
                  Container(
                      width: 10,
                      height: 10,
                      decoration: BoxDecoration(color: c.mint, shape: BoxShape.circle)),
                ],
              ),
            ),
          ),
        ),
        const SizedBox(width: 10),
        place('الدمام', 'وجهة الشاحنة'),
      ],
    );
  }

  Widget _dash(NqColors c) => CustomPaint(
      size: const Size(double.infinity, 2), painter: _DashPainter(c.bd));

  Widget _specTiles(NqColors c) {
    Widget tile(String label, String value, {bool ltr = false}) => Expanded(
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            decoration: BoxDecoration(
              color: c.sf2,
              borderRadius: BorderRadius.circular(NqRadius.input),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(label, style: NqType.caption.copyWith(color: c.tx2)),
                const SizedBox(height: 2),
                if (ltr)
                  Ltr(value,
                      style: NqType.labelStrong.copyWith(color: c.tx, fontSize: 14))
                else
                  Text(value,
                      style: NqType.labelStrong.copyWith(color: c.tx, fontSize: 14)),
              ],
            ),
          ),
        );
    return Column(
      children: [
        Row(children: [
          tile('متاحة من', 'الأربعاء 29/10 · 14:00'),
          const SizedBox(width: 10),
          tile('حتى', 'الخميس 30/10 · 10:00'),
        ]),
        const SizedBox(height: 10),
        Row(children: [
          tile('الشاحنة', 'تريلا سطحة'),
          const SizedBox(width: 10),
          tile('الحمولة القصوى', '13.6 m · 24 t', ltr: true),
        ]),
      ],
    );
  }

  Widget _featureChips(NqColors c) {
    Widget chip(String label) => Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(NqRadius.pill),
            border: Border.all(color: c.bd),
          ),
          child: Row(mainAxisSize: MainAxisSize.min, children: [
            NqIcon(NqIcons.check, size: 13, color: c.mintTx),
            const SizedBox(width: 6),
            Text(label, style: NqType.caption.copyWith(color: c.tx)),
          ]),
        );
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      alignment: WrapAlignment.end,
      children: [chip('شداد وأحزمة'), chip('غطاء مشمّع'), chip('تتبّع مباشر')],
    );
  }

  Widget _priceCard(NqColors c) => Container(
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
              children: [
                Ltr('1,650–1,900',
                    style: NqType.price(size: 19).copyWith(color: c.tx)),
                const SizedBox(width: 3),
                Text('ر.س', style: NqType.caption.copyWith(color: c.tx2)),
                const Spacer(),
                Flexible(
                  child: Text('السعر التقديري من المزوّد',
                      style: NqType.label.copyWith(color: c.tx2),
                      textAlign: TextAlign.left,
                      overflow: TextOverflow.ellipsis),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Text(
                    'يتحدّد السعر النهائي بعد إرسال تفاصيل الحمولة. رحلات العودة عادة أقل من سعر السوق للمسار 2,250–2,700 ر.س.',
                    style: NqType.caption.copyWith(color: c.tx2, height: 1.6),
                    textAlign: TextAlign.right,
                  ),
                ),
                const SizedBox(width: 10),
                NqIcon(NqIcons.info, size: 16, color: c.info),
              ],
            ),
          ],
        ),
      );

  Widget _footer(BuildContext context, NqColors c) => Container(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
        decoration: BoxDecoration(
          color: c.sf,
          border: Border(top: BorderSide(color: c.bd)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('ننشئ طلبًا مُعبّأ مسبقًا ويُرسل لهذا المزوّد مباشرة · يرد خلال 2 س',
                style: NqType.caption.copyWith(color: c.tx2),
                textAlign: TextAlign.center),
            const SizedBox(height: 10),
            NqButton(
              label: 'اطلب من هذا المزوّد',
              icon: NqIcons.paperPlaneTilt,
              onPressed: onRequest ?? () {},
            ),
          ],
        ),
      );
}

class _DashPainter extends CustomPainter {
  _DashPainter(this.color);
  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final p = Paint()
      ..color = color
      ..strokeWidth = 2;
    double x = 0;
    final y = size.height / 2;
    while (x < size.width) {
      canvas.drawLine(Offset(x, y), Offset(x + 4, y), p);
      x += 8;
    }
  }

  @override
  bool shouldRepaint(_DashPainter old) => old.color != color;
}
