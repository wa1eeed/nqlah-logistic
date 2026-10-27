import 'package:flutter/material.dart';

import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';
import '../../core/widgets/ltr.dart';
import '../../core/widgets/nq_icon.dart';
import '../../design_system/party_card.dart';
import '../../design_system/segmented.dart';

/// Customer order detail after acceptance (handoff 1c): provider party card
/// (contact revealed), stop timeline, price breakdown.
class OrderDetailScreen extends StatefulWidget {
  const OrderDetailScreen({super.key, this.onTrack});

  final VoidCallback? onTrack;

  @override
  State<OrderDetailScreen> createState() => _OrderDetailScreenState();
}

class _OrderDetailScreenState extends State<OrderDetailScreen> {
  int _trip = 0;

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
                  NqSegmented(
                    options: const ['رحلة 1', 'رحلة 2'],
                    index: _trip,
                    onChanged: (i) => setState(() => _trip = i),
                  ),
                  const SizedBox(height: 16),
                  const NqPartyCard(
                    initial: 'أ',
                    name: 'شركة الأفق للنقل',
                    role: 'المزوّد المتعاقد · ★ 4.8',
                    revealed: true,
                    phone: '+966 13 812 4400',
                    revealLabel: 'بيانات المزوّد متاحة',
                    caption: 'تم إسناد سائق · المزوّد يتولّى التنسيق معه',
                    captionIcon: NqIcons.steeringWheel,
                  ),
                  const SizedBox(height: 20),
                  _sectionHeader(c, 'مسار الرحلة',
                      action: 'تتبّع',
                      actionIcon: NqIcons.mapTrifold,
                      onAction: widget.onTrack),
                  const SizedBox(height: 10),
                  _timelineCard(c),
                  const SizedBox(height: 20),
                  Text('تفصيل السعر', style: NqType.h2.copyWith(color: c.tx)),
                  const SizedBox(height: 10),
                  _priceCard(c),
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
            NqIcon(NqIcons.dotsThree, size: 22, color: c.tx),
            const Spacer(),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Ltr('NQ-24-08812',
                    style: NqType.code(size: 16).copyWith(color: c.tx)),
                const SizedBox(height: 2),
                Text('طلب مجمّع · رحلتان',
                    style: NqType.caption.copyWith(color: c.tx2)),
              ],
            ),
            const SizedBox(width: 12),
            NqIcon(NqIcons.arrowRight, size: 22, color: c.tx),
          ],
        ),
      );

  Widget _sectionHeader(NqColors c, String title,
      {String? action, String? actionIcon, VoidCallback? onAction}) {
    return Row(
      children: [
        if (action != null)
          GestureDetector(
            onTap: onAction,
            child: Row(
              children: [
                if (actionIcon != null)
                  NqIcon(actionIcon, size: 16, color: c.mintTx),
                const SizedBox(width: 6),
                Text(action, style: NqType.labelStrong.copyWith(color: c.mintTx)),
              ],
            ),
          ),
        const Spacer(),
        Text(title, style: NqType.h2.copyWith(color: c.tx)),
      ],
    );
  }

  Widget _timelineCard(NqColors c) => Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: c.sf,
          borderRadius: BorderRadius.circular(NqRadius.card),
          border: Border.all(color: c.bd),
        ),
        child: Column(
          children: [
            _row(c,
                time: '08:40',
                title: 'الاستلام · ميناء الملك عبدالعزيز',
                sub: '40ft · TGHU 771392-0 حاوية',
                state: _NodeState.done,
                first: true),
            _row(c,
                time: '~14:20',
                title: 'التفريغ · الرياض',
                subWidget: Text('في الطريق · متبقٍ 186 km',
                    style: NqType.label.copyWith(color: c.info),
                    textAlign: TextAlign.right),
                state: _NodeState.current),
            _row(c,
                time: 'لاحقًا',
                title: 'إرجاع الحاوية الفارغة',
                chip: 'منفصل عن تسليم البضاعة',
                state: _NodeState.containerReturn,
                last: true),
          ],
        ),
      );

  Widget _row(NqColors c,
      {required String time,
      required String title,
      String? sub,
      Widget? subWidget,
      String? chip,
      required _NodeState state,
      bool first = false,
      bool last = false}) {
    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 48,
            child: Padding(
              padding: const EdgeInsets.only(top: 2),
              child: Ltr(time,
                  style: NqType.numeric(12, FontWeight.w500).copyWith(color: c.tx3),
                  textAlign: TextAlign.left),
            ),
          ),
          const SizedBox(width: 10),
          _node(c, state, first: first, last: last),
          const SizedBox(width: 12),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.only(bottom: 18),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(title,
                      style: NqType.bodyStrong.copyWith(color: c.tx),
                      textAlign: TextAlign.right),
                  const SizedBox(height: 3),
                  if (subWidget != null)
                    subWidget
                  else if (sub != null)
                    Text(sub,
                        style: NqType.caption.copyWith(color: c.tx2),
                        textAlign: TextAlign.right),
                  if (chip != null) ...[
                    const SizedBox(height: 6),
                    Container(
                      padding:
                          const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                      decoration: BoxDecoration(
                        color: c.warnBg,
                        borderRadius: BorderRadius.circular(NqRadius.pill),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(chip,
                              style: NqType.caption.copyWith(
                                  color: c.warn, fontWeight: FontWeight.w700)),
                          const SizedBox(width: 6),
                          NqIcon(NqIcons.shippingContainer, size: 14, color: c.warn),
                        ],
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _node(NqColors c, _NodeState state, {bool first = false, bool last = false}) {
    final Color color = switch (state) {
      _NodeState.done => c.ok,
      _NodeState.current => c.info,
      _NodeState.containerReturn => c.warn,
    };
    final bool rotatedSquare = state == _NodeState.containerReturn;
    return Column(
      children: [
        Container(width: 2, height: 4, color: first ? Colors.transparent : (state == _NodeState.done ? c.ok : c.bd)),
        Container(
          width: 24,
          height: 24,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: state == _NodeState.current
                ? c.info
                : (rotatedSquare ? Colors.transparent : color),
            shape: rotatedSquare ? BoxShape.rectangle : BoxShape.circle,
            borderRadius: rotatedSquare ? BorderRadius.circular(5) : null,
            border: rotatedSquare ? Border.all(color: color, width: 2) : null,
          ),
          child: switch (state) {
            _NodeState.done => NqIcon(NqIcons.check, size: 13, color: Colors.white),
            _NodeState.current =>
              NqIcon(NqIcons.truck, fill: true, size: 13, color: Colors.white),
            _NodeState.containerReturn => const SizedBox.shrink(),
          },
        ),
        Expanded(
          child: Container(
            width: 2,
            color: last
                ? Colors.transparent
                : (state == _NodeState.done ? c.ok : c.bd),
          ),
        ),
      ],
    );
  }

  Widget _priceCard(NqColors c) {
    Widget row(String label, String value) => Padding(
          padding: const EdgeInsets.symmetric(vertical: 4),
          child: Row(
            children: [
              Ltr(value,
                  style: NqType.numeric(14, FontWeight.w400).copyWith(color: c.tx)),
              const Spacer(),
              Text(label, style: NqType.body.copyWith(color: c.tx2)),
            ],
          ),
        );
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: c.sf,
        borderRadius: BorderRadius.circular(NqRadius.card),
        border: Border.all(color: c.bd),
      ),
      child: Column(
        children: [
          row('أجرة النقل', '2,400.00'),
          row('رسوم الخدمة', '120.00'),
          row('ضريبة القيمة المضافة 15%', '378.00'),
        ],
      ),
    );
  }
}

enum _NodeState { done, current, containerReturn }
