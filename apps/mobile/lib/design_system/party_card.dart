import 'package:flutter/material.dart';

import '../core/theme/tokens.dart';
import '../core/theme/typography.dart';
import '../core/widgets/ltr.dart';
import '../core/widgets/nq_icon.dart';

/// Contact party card (handoff §6 "party card"): avatar + name + role, chat &
/// call buttons, an optional contact-reveal row (locked / revealed) and a
/// driver-assigned caption. Used on the customer order detail (1c) and the
/// provider order view (3a).
class NqPartyCard extends StatelessWidget {
  const NqPartyCard({
    super.key,
    required this.initial,
    required this.name,
    required this.role,
    this.revealed = false,
    this.revealLabel,
    this.phone,
    this.caption,
    this.captionIcon,
    this.onCall,
    this.onChat,
    this.callFilled = false,
  });

  final String initial;
  final String name;
  final String role;
  final bool revealed;
  final String? revealLabel;
  final String? phone;
  final String? caption;
  final String? captionIcon;
  final VoidCallback? onCall;
  final VoidCallback? onChat;
  final bool callFilled;

  @override
  Widget build(BuildContext context) {
    final c = context.nq;
    return Container(
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
              _actionBtn(c, NqIcons.phone,
                  filled: callFilled, onTap: onCall),
              const SizedBox(width: 8),
              _actionBtn(c, NqIcons.chatCenteredDots, onTap: onChat),
              const Spacer(),
              Expanded(
                flex: 6,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        NqIcon(NqIcons.sealCheck,
                            fill: true, size: 16, color: c.mintTx),
                        const SizedBox(width: 6),
                        Flexible(
                          child: Text(name,
                              style: NqType.h3.copyWith(color: c.tx),
                              textAlign: TextAlign.right),
                        ),
                      ],
                    ),
                    const SizedBox(height: 2),
                    Text(role,
                        style: NqType.caption.copyWith(color: c.tx2),
                        textAlign: TextAlign.right),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              _avatar(c),
            ],
          ),
          if (phone != null || revealLabel != null) ...[
            const SizedBox(height: 14),
            _revealRow(c),
          ],
          if (caption != null) ...[
            const SizedBox(height: 12),
            Row(
              children: [
                const Spacer(),
                Flexible(
                  child: Text(caption!,
                      style: NqType.caption.copyWith(color: c.tx2),
                      textAlign: TextAlign.right),
                ),
                const SizedBox(width: 6),
                if (captionIcon != null)
                  NqIcon(captionIcon!, size: 16, color: c.tx2),
              ],
            ),
          ],
        ],
      ),
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
        child: Text(initial, style: NqType.h3.copyWith(color: NqFixed.heroText)),
      );

  Widget _actionBtn(NqColors c, String icon,
          {bool filled = false, VoidCallback? onTap}) =>
      GestureDetector(
        onTap: onTap,
        child: Container(
          width: 48,
          height: 48,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: filled ? c.mint : c.mintBg,
            borderRadius: BorderRadius.circular(NqRadius.input),
          ),
          child: NqIcon(icon,
              fill: filled, size: 22, color: filled ? c.onMint : c.mintTx),
        ),
      );

  Widget _revealRow(NqColors c) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: revealed ? c.okBg : c.sf2,
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        children: [
          NqIcon(revealed ? NqIcons.lockOpen : NqIcons.lockSimple,
              size: 16, color: revealed ? c.ok : c.tx3),
          const Spacer(),
          if (phone != null)
            Ltr(phone!,
                style: NqType.numeric(13, FontWeight.w600).copyWith(color: c.tx)),
          if (phone != null && revealLabel != null) const SizedBox(width: 10),
          if (revealLabel != null)
            Text(revealLabel!, style: NqType.caption.copyWith(color: c.tx2)),
        ],
      ),
    );
  }
}
