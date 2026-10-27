import 'package:flutter/material.dart';

import '../core/theme/tokens.dart';
import '../core/theme/typography.dart';
import '../core/widgets/ltr.dart';
import '../core/widgets/nq_icon.dart';
import 'button.dart';

/// An offer card in the compare list (handoff 4f). Provider public profile +
/// price + masked phone (pre-acceptance) + accept / chat actions. The best
/// offer gets a mint ring and an «أفضل قيمة» badge.
class NqOfferCard extends StatelessWidget {
  const NqOfferCard({
    super.key,
    required this.initial,
    required this.name,
    required this.rating,
    required this.trips,
    required this.price,
    required this.date,
    this.providerType,
    this.best = false,
    this.onAccept,
    this.onChat,
  });

  final String initial;
  final String name;
  final String rating; // "4.8"
  final int trips;
  final String price; // "1,950"
  final String date; // "الأربعاء 07:00"
  final String? providerType; // e.g. "مزوّد فرد"
  final bool best;
  final VoidCallback? onAccept;
  final VoidCallback? onChat;

  @override
  Widget build(BuildContext context) {
    final c = context.nq;
    return Stack(
      clipBehavior: Clip.none,
      children: [
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: c.sf,
            borderRadius: BorderRadius.circular(NqRadius.card),
            border: Border.all(
                color: best ? c.mintS : c.bd, width: best ? 2 : 1),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _avatar(c),
                  const SizedBox(width: 12),
                  Expanded(child: _nameCol(c)),
                  const SizedBox(width: 12),
                  _priceCol(c),
                ],
              ),
              const SizedBox(height: 12),
              _metaRow(c),
              const SizedBox(height: 14),
              Row(
                children: [
                  Expanded(
                    child: NqButton(
                      label: 'قبول العرض',
                      variant: best
                          ? NqButtonVariant.primary
                          : NqButtonVariant.secondary,
                      size: NqButtonSize.regular,
                      onPressed: onAccept ?? () {},
                    ),
                  ),
                  const SizedBox(width: 10),
                  _chatButton(c),
                ],
              ),
            ],
          ),
        ),
        if (best)
          PositionedDirectional(
            top: -11,
            end: 16,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
              decoration: BoxDecoration(
                color: c.mint,
                borderRadius: BorderRadius.circular(NqRadius.pill),
              ),
              child: Text('أفضل قيمة',
                  style: NqType.caption
                      .copyWith(color: c.onMint, fontWeight: FontWeight.w700)),
            ),
          ),
      ],
    );
  }

  Widget _avatar(NqColors c) => Container(
        width: 44,
        height: 44,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: c.hero,
          borderRadius: BorderRadius.circular(NqRadius.input),
        ),
        child: Text(initial,
            style: NqType.h3.copyWith(color: NqFixed.heroText)),
      );

  Widget _nameCol(NqColors c) => Column(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              NqIcon(NqIcons.sealCheck, fill: true, size: 16, color: c.mintTx),
              const SizedBox(width: 6),
              Flexible(
                child: Text(name,
                    style: NqType.h3.copyWith(color: c.tx),
                    textAlign: TextAlign.right),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                  providerType != null
                      ? '★ $rating · $trips رحلة · $providerType'
                      : '★ $rating · $trips رحلة',
                  style: NqType.caption.copyWith(color: c.tx2)),
            ],
          ),
        ],
      );

  Widget _priceCol(NqColors c) => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Ltr(price, style: NqType.price(size: 22).copyWith(color: c.tx)),
          Text('ر.س', style: NqType.caption.copyWith(color: c.tx2)),
        ],
      );

  Widget _metaRow(NqColors c) => Row(
        children: [
          NqIcon(NqIcons.lockSimple, size: 14, color: c.tx3),
          const SizedBox(width: 6),
          Ltr('+966 •• ••• ••••',
              style: NqType.numeric(13, FontWeight.w500).copyWith(color: c.tx2)),
          const Spacer(),
          Text(date, style: NqType.label.copyWith(color: c.tx2)),
          const SizedBox(width: 6),
          NqIcon(NqIcons.calendarBlank, size: 16, color: c.tx2),
        ],
      );

  Widget _chatButton(NqColors c) => GestureDetector(
        onTap: onChat,
        child: Container(
          width: 52,
          height: 52,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: c.mintBg,
            borderRadius: BorderRadius.circular(NqRadius.button),
          ),
          child: NqIcon(NqIcons.chatCenteredDots, size: 22, color: c.mintTx),
        ),
      );
}
