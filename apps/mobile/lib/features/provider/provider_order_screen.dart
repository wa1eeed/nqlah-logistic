import 'package:flutter/material.dart';

import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';
import '../../core/widgets/ltr.dart';
import '../../core/widgets/nq_icon.dart';
import '../../design_system/button.dart';
import '../../design_system/party_card.dart';
import '../../design_system/status_chip.dart';

/// Provider order view (handoff 3a), before/after acceptance from the provider
/// side: customer party card, assigned-driver card (internal, hidden from the
/// customer), internal driver note, route, and actions.
class ProviderOrderScreen extends StatelessWidget {
  const ProviderOrderScreen({super.key, this.onChangeDriver, this.onTrack, this.onChat});

  final VoidCallback? onChangeDriver;
  final VoidCallback? onTrack;
  final VoidCallback? onChat;

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
                  const NqPartyCard(
                    initial: 'ر',
                    name: 'مصنع الرّواد للبلاستيك',
                    role: 'العميل · تتواصل معه بصفتك المزوّد',
                    revealed: true,
                    phone: '+966 55 120 7781',
                    revealLabel: 'بيانات العميل متاحة بعد القبول',
                  ),
                  const SizedBox(height: 14),
                  _driverCard(c),
                  const SizedBox(height: 14),
                  _internalNote(c),
                  const SizedBox(height: 18),
                  _routeHeader(c),
                  const SizedBox(height: 10),
                  _routeCard(c),
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
            const NqStatusChip(NqStatus.assigned),
            const Spacer(),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Ltr('NQ-24-08856', style: NqType.code(size: 16).copyWith(color: c.tx)),
                const SizedBox(height: 2),
                Text('الدمام ← الرياض · تريلا سطحة · الأربعاء 07:00',
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

  Widget _driverCard(NqColors c) => Container(
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
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: c.sf2,
                    borderRadius: BorderRadius.circular(NqRadius.pill),
                  ),
                  child: Row(mainAxisSize: MainAxisSize.min, children: [
                    NqIcon(NqIcons.lockSimple, size: 13, color: c.tx3),
                    const SizedBox(width: 6),
                    Text('داخلي · لا يظهر للعميل',
                        style: NqType.caption
                            .copyWith(color: c.tx2, fontWeight: FontWeight.w700)),
                  ]),
                ),
                const Spacer(),
                Text('السائق المُسند',
                    style: NqType.labelStrong.copyWith(color: c.tx2)),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                GestureDetector(
                  onTap: onChangeDriver,
                  child: Text('تغيير',
                      style: NqType.labelStrong.copyWith(color: c.mintTx)),
                ),
                const SizedBox(width: 12),
                Container(
                  width: 44,
                  height: 44,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: c.mintBg,
                    borderRadius: BorderRadius.circular(NqRadius.input),
                  ),
                  child: NqIcon(NqIcons.phone, size: 20, color: c.mintTx),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text('فهد العتيبي', style: NqType.h3.copyWith(color: c.tx)),
                      const SizedBox(height: 2),
                      Text('تريلا سطحة · 7342 KHD · وصل الدمام',
                          style: NqType.caption.copyWith(color: c.tx2),
                          textAlign: TextAlign.right,
                          overflow: TextOverflow.ellipsis),
                    ],
                  ),
                ),
                const SizedBox(width: 12),
                Container(
                  width: 44,
                  height: 44,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(color: c.sf2, shape: BoxShape.circle),
                  child: Text('ف', style: NqType.h3.copyWith(color: c.tx2)),
                ),
              ],
            ),
          ],
        ),
      );

  Widget _internalNote(NqColors c) => Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: c.warnBg,
          borderRadius: BorderRadius.circular(NqRadius.button),
          border: Border.all(color: c.warn, width: 1.5),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                Text('ملاحظة داخلية للسائق',
                    style: NqType.labelStrong.copyWith(color: c.warn)),
                const SizedBox(width: 6),
                NqIcon(NqIcons.notePencil, size: 16, color: c.warn),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              'الدخول من البوابة 3 والتحميل بالرافعة. أي تنسيق مع العميل يتم عن طريق المكتب.',
              style: NqType.body.copyWith(color: c.tx, height: 1.55),
              textAlign: TextAlign.right,
            ),
            const SizedBox(height: 8),
            Text('يراها السائق فقط · آخر تعديل 08:05',
                style: NqType.caption.copyWith(color: c.tx2)),
          ],
        ),
      );

  Widget _routeHeader(NqColors c) => Row(
        children: [
          Text('عرض الكل', style: NqType.labelStrong.copyWith(color: c.mintTx)),
          const Spacer(),
          Text('المسار', style: NqType.h2.copyWith(color: c.tx)),
        ],
      );

  Widget _routeCard(NqColors c) => Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: c.sf,
          borderRadius: BorderRadius.circular(NqRadius.card),
          border: Border.all(color: c.bd),
        ),
        child: Column(
          children: [
            _stop(c, true, '07:00', 'الاستلام · ميناء الملك عبدالعزيز',
                'حاوية TGHU 771392-0'),
            const SizedBox(height: 14),
            _stop(c, false, '~14:20', 'التفريغ · الرياض',
                '+ إرجاع الحاوية الفارغة'),
          ],
        ),
      );

  Widget _stop(NqColors c, bool done, String time, String title, String sub) => Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 48,
            child: Ltr(time,
                style: NqType.numeric(12, FontWeight.w500).copyWith(color: c.tx3),
                textAlign: TextAlign.left),
          ),
          const SizedBox(width: 10),
          Padding(
            padding: const EdgeInsets.only(top: 3),
            child: done
                ? Container(
                    width: 12,
                    height: 12,
                    decoration: BoxDecoration(color: c.mint, shape: BoxShape.circle))
                : Container(
                    width: 12,
                    height: 12,
                    decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        border: Border.all(color: c.tx3, width: 2))),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(title, style: NqType.bodyStrong.copyWith(color: c.tx)),
                const SizedBox(height: 2),
                Text(sub, style: NqType.caption.copyWith(color: c.tx2)),
              ],
            ),
          ),
        ],
      );

  Widget _footer(NqColors c) => Container(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
        decoration: BoxDecoration(
          color: c.sf,
          border: Border(top: BorderSide(color: c.bd)),
        ),
        child: Row(
          children: [
            Expanded(
              child: NqButton(
                  label: 'متابعة الرحلة',
                  icon: NqIcons.mapTrifold,
                  onPressed: onTrack ?? () {}),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: NqButton(
                  label: 'محادثة العميل',
                  icon: NqIcons.chats,
                  variant: NqButtonVariant.secondary,
                  onPressed: onChat ?? () {}),
            ),
          ],
        ),
      );
}
