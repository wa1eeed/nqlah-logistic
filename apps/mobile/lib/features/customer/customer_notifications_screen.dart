import 'package:flutter/material.dart';

import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';
import '../../core/widgets/ltr.dart';
import '../../core/widgets/nq_icon.dart';
import '../../design_system/chip.dart';

/// Customer notifications (handoff 5b), pushed from the bell.
class CustomerNotificationsScreen extends StatefulWidget {
  const CustomerNotificationsScreen({super.key});

  @override
  State<CustomerNotificationsScreen> createState() =>
      _CustomerNotificationsScreenState();
}

class _Note {
  const _Note(this.time, this.title, this.body, this.icon, this.tone,
      {this.unread = false});
  final String time;
  final String title;
  final String body;
  final String icon;
  final _Tone tone;
  final bool unread;
}

enum _Tone { offer, transit, driver, payment, epod, container }

class _CustomerNotificationsScreenState
    extends State<CustomerNotificationsScreen> {
  int _filter = 0;

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
            const SizedBox(height: 16),
            _filterChips(c),
            const SizedBox(height: 12),
            Expanded(
              child: ListView(
                padding: EdgeInsets.zero,
                children: [
                  _group(c, 'اليوم', const [
                    _Note('10:24', 'عرض جديد على NQ-24-08840',
                        'شركة الأفق للنقل قدّمت 1,950 ر.س',
                        NqIcons.handCoins, _Tone.offer, unread: true),
                    _Note('08:52', 'الشحنة في الطريق',
                        'NQ-24-08812 غادرت الميناء متجهة إلى الرياض',
                        NqIcons.truck, _Tone.transit, unread: true),
                    _Note('08:10', 'تم إسناد سائق',
                        'NQ-24-08856 · المزوّد يتولّى التنسيق',
                        NqIcons.steeringWheel, _Tone.driver),
                  ]),
                  _group(c, 'أمس', const [
                    _Note('16:40', 'تم تأكيد الدفع',
                        'INV-2410-0318 · 3,105.00 ر.س',
                        NqIcons.checkSquare, _Tone.payment),
                    _Note('13:05', 'إثبات التسليم متاح',
                        'NQ-24-08790 · صور + توقيع المستلم',
                        NqIcons.signature, _Tone.epod),
                    _Note('09:00', 'تذكير إرجاع الحاوية',
                        'مهلة الحاوية 4 · MSKU 220871 تنتهي 02/11',
                        NqIcons.shippingContainer, _Tone.container),
                  ]),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _appBar(NqColors c) => Padding(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
        child: Row(
          children: [
            Text('قراءة الكل',
                style: NqType.labelStrong.copyWith(color: c.mintTx)),
            const Spacer(),
            Text('الإشعارات', style: NqType.h3.copyWith(color: c.tx)),
            const SizedBox(width: 12),
            GestureDetector(
              onTap: () => Navigator.of(context).maybePop(),
              child: NqIcon(NqIcons.arrowRight, size: 22, color: c.tx),
            ),
          ],
        ),
      );

  Widget _filterChips(NqColors c) {
    const labels = ['الكل', 'الطلبات', 'العروض', 'المالية'];
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Row(
        children: [
          for (var i = 0; i < labels.length; i++) ...[
            NqChip(
              label: labels[i],
              selected: _filter == i,
              count: i == 2 ? 1 : null,
              onTap: () => setState(() => _filter = i),
            ),
            if (i < labels.length - 1) const SizedBox(width: 8),
          ],
        ],
      ),
    );
  }

  Widget _group(NqColors c, String label, List<_Note> notes) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 10, 16, 8),
          child: Text(label,
              style: NqType.labelStrong.copyWith(color: c.tx2),
              textAlign: TextAlign.right),
        ),
        for (final n in notes) _row(c, n),
      ],
    );
  }

  (Color, Color) _toneColors(NqColors c, _Tone t) => switch (t) {
        _Tone.offer => (c.warnBg, c.warn),
        _Tone.transit => (c.infoBg, c.info),
        _Tone.driver => (c.mintBg, c.mintTx),
        _Tone.payment => (c.okBg, c.ok),
        _Tone.epod => (c.warnBg, c.warn),
        _Tone.container => (c.warnBg, c.warn),
      };

  Widget _row(NqColors c, _Note n) {
    final (tileBg, tileFg) = _toneColors(c, n.tone);
    return Container(
      color: n.unread ? c.mintBg : c.sf,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Ltr(n.time,
                  style: NqType.numeric(12, FontWeight.w400).copyWith(color: c.tx3)),
              if (n.unread) ...[
                const SizedBox(height: 6),
                Container(
                    width: 8,
                    height: 8,
                    decoration:
                        BoxDecoration(color: c.mintS, shape: BoxShape.circle)),
              ],
            ],
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(n.title,
                    style: NqType.bodyStrong.copyWith(color: c.tx),
                    textAlign: TextAlign.right),
                const SizedBox(height: 3),
                Text(n.body,
                    style: NqType.caption.copyWith(color: c.tx2, height: 1.5),
                    textAlign: TextAlign.right),
              ],
            ),
          ),
          const SizedBox(width: 12),
          Container(
            width: 40,
            height: 40,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: tileBg,
              borderRadius: BorderRadius.circular(NqRadius.input),
            ),
            child: NqIcon(n.icon, size: 20, color: tileFg),
          ),
        ],
      ),
    );
  }
}
