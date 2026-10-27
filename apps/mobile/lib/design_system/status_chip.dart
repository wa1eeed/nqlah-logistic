import 'package:flutter/material.dart';

import '../core/theme/tokens.dart';
import '../core/theme/typography.dart';
import '../core/widgets/nq_icon.dart';

/// Order / payment statuses with their AR label, icon and colors
/// (handoff §6 status-chip table). Always color + icon + label.
enum NqStatus {
  draft,
  published,
  awaitingProvider,
  tender,
  assigned,
  confirmed,
  inTransit,
  delivered,
  completed,
  cancelled,
  paymentReported,
  paymentConfirmed,
  disputed,
  containerReturnPending,
  epodPending,
}

class _StatusSpec {
  const _StatusSpec(this.label, this.icon, this.bg, this.fg, {this.fill = false});
  final String label;
  final String icon;
  final bool fill;
  final Color Function(NqColors) bg;
  final Color Function(NqColors) fg;
}

final Map<NqStatus, _StatusSpec> _specs = {
  NqStatus.draft: _StatusSpec('مسودة', NqIcons.notePencil, (c) => c.sf2, (c) => c.tx2),
  NqStatus.published:
      _StatusSpec('منشور', NqIcons.megaphone, (c) => c.infoBg, (c) => c.info),
  NqStatus.awaitingProvider: _StatusSpec('بانتظار رد المزوّد',
      NqIcons.hourglassMedium, (c) => c.warnBg, (c) => c.warn),
  NqStatus.tender: _StatusSpec('مناقصة', NqIcons.gavel, (c) => c.infoBg, (c) => c.info),
  NqStatus.assigned:
      _StatusSpec('مُسند', NqIcons.handshake, (c) => c.mintBg, (c) => c.mintTx),
  NqStatus.confirmed:
      _StatusSpec('مؤكّد', NqIcons.checkCircle, (c) => c.mintBg, (c) => c.mintTx),
  NqStatus.inTransit: _StatusSpec('في الطريق', NqIcons.truck, (c) => c.infoBg,
      (c) => c.info, fill: true),
  NqStatus.delivered:
      _StatusSpec('تم التسليم', NqIcons.package, (c) => c.okBg, (c) => c.ok),
  NqStatus.completed: _StatusSpec('مكتمل', NqIcons.sealCheck,
      (c) => c.completedChipBg, (c) => NqFixed.heroText, fill: true),
  NqStatus.cancelled:
      _StatusSpec('ملغى', NqIcons.xCircle, (c) => c.errBg, (c) => c.err),
  NqStatus.paymentReported: _StatusSpec(
      'دفع مُبلّغ', NqIcons.handCoins, (c) => c.warnBg, (c) => c.warn),
  NqStatus.paymentConfirmed: _StatusSpec(
      'دفع مؤكّد', NqIcons.checkSquare, (c) => c.okBg, (c) => c.ok),
  NqStatus.disputed: _StatusSpec(
      'متنازع عليه', NqIcons.warningOctagon, (c) => c.errBg, (c) => c.err),
  NqStatus.containerReturnPending: _StatusSpec('إرجاع حاوية معلّق',
      NqIcons.shippingContainer, (c) => c.warnBg, (c) => c.warn),
  NqStatus.epodPending: _StatusSpec(
      'إثبات تسليم معلّق', NqIcons.signature, (c) => c.warnBg, (c) => c.warn),
};

/// A status pill: H 28, R999, icon 14 + label 12/700 (handoff §6).
class NqStatusChip extends StatelessWidget {
  const NqStatusChip(this.status, {super.key});

  final NqStatus status;

  @override
  Widget build(BuildContext context) {
    final c = context.nq;
    final spec = _specs[status]!;
    final fg = spec.fg(c);
    return Container(
      height: 28,
      padding: const EdgeInsets.symmetric(horizontal: 11),
      decoration: BoxDecoration(
        color: spec.bg(c),
        borderRadius: BorderRadius.circular(NqRadius.pill),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          NqIcon(spec.icon, fill: spec.fill, size: 14, color: fg),
          const SizedBox(width: 6),
          Text(
            spec.label,
            style: NqType.caption.copyWith(
              fontSize: 12.5,
              fontWeight: FontWeight.w700,
              color: fg,
            ),
          ),
        ],
      ),
    );
  }
}
