import 'package:flutter/material.dart';

import '../core/theme/tokens.dart';
import '../core/theme/typography.dart';
import '../core/widgets/nq_icon.dart';
import 'status_chip.dart';

/// Delivery-app style status timeline for an order. Renders the order lifecycle
/// as vertical steps (نُشر → قُبل → جارٍ التنفيذ → تم التسليم → اكتمل) with the
/// reached steps done, the latest one highlighted as "current", and the rest
/// pending. Cancelled orders render a single cancelled state. Used on both the
/// client and provider order screens.
class OrderStatusTimeline extends StatelessWidget {
  const OrderStatusTimeline({super.key, required this.status});

  final NqStatus status;

  static const _stages = <({String label, String icon})>[
    (label: 'نُشر الطلب', icon: NqIcons.megaphone),
    (label: 'قبله المزوّد', icon: NqIcons.checkCircle),
    (label: 'جارٍ التنفيذ', icon: NqIcons.truck),
    (label: 'تم التسليم', icon: NqIcons.package),
    (label: 'اكتمل الطلب', icon: NqIcons.flagCheckered),
  ];

  /// The index of the latest reached stage, or -1 for cancelled.
  int get _reached {
    switch (status) {
      case NqStatus.cancelled:
        return -1;
      case NqStatus.draft:
      case NqStatus.published:
      case NqStatus.awaitingProvider:
      case NqStatus.tender:
        return 0;
      case NqStatus.assigned:
      case NqStatus.confirmed:
        return 1;
      case NqStatus.inTransit:
        return 2;
      case NqStatus.delivered:
      case NqStatus.epodPending:
      case NqStatus.containerReturnPending:
      case NqStatus.paymentReported:
      case NqStatus.disputed:
        return 3;
      case NqStatus.completed:
      case NqStatus.paymentConfirmed:
        return 4;
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = context.nq;
    if (_reached < 0) {
      return Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: c.errBg,
          borderRadius: BorderRadius.circular(NqRadius.card),
        ),
        child: Row(children: [
          NqIcon(NqIcons.warningCircle, size: 20, color: c.err),
          const SizedBox(width: 10),
          Expanded(
            child: Text('أُلغي هذا الطلب.',
                style: NqType.bodyStrong.copyWith(color: c.err),
                textAlign: TextAlign.right),
          ),
        ]),
      );
    }
    final reached = _reached;
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 4),
      decoration: BoxDecoration(
        color: c.sf,
        borderRadius: BorderRadius.circular(NqRadius.card),
        border: Border.all(color: c.bd),
      ),
      child: Column(
        children: [
          for (var i = 0; i < _stages.length; i++)
            _step(
              c,
              _stages[i],
              done: i < reached,
              current: i == reached,
              last: i == _stages.length - 1,
            ),
        ],
      ),
    );
  }

  Widget _step(NqColors c, ({String label, String icon}) stage,
      {required bool done, required bool current, required bool last}) {
    final active = done || current;
    final dotColor = done
        ? c.mintS
        : current
            ? c.mintS
            : c.sf2;
    final iconColor = active ? (c.isDark ? c.onMint : Colors.white) : c.tx3;
    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Padding(
              padding: const EdgeInsets.only(bottom: 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(stage.label,
                      style: (current ? NqType.bodyStrong : NqType.body).copyWith(
                          color: active ? c.tx : c.tx3)),
                  if (current) ...[
                    const SizedBox(height: 2),
                    Text('الحالة الحالية',
                        style: NqType.caption.copyWith(color: c.mintTx)),
                  ],
                ],
              ),
            ),
          ),
          const SizedBox(width: 12),
          Column(
            children: [
              Container(
                width: 30,
                height: 30,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: dotColor,
                  shape: BoxShape.circle,
                  border: current ? Border.all(color: c.mintBg, width: 3) : null,
                ),
                child: NqIcon(done ? NqIcons.check : stage.icon,
                    size: 16, color: iconColor),
              ),
              if (!last)
                Expanded(
                  child: Container(
                    width: 2,
                    margin: const EdgeInsets.symmetric(vertical: 2),
                    color: done ? c.mintS : c.bd,
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }
}
