import 'package:flutter/material.dart';

import '../core/theme/tokens.dart';
import '../core/theme/typography.dart';
import '../core/widgets/nq_icon.dart';

/// Filter / choice chip (handoff §6): H 36, R999. Selected = `hero` bg, white,
/// `check` icon. Unselected = 1 border `bd`.
class NqChip extends StatelessWidget {
  const NqChip({
    super.key,
    required this.label,
    this.selected = false,
    this.onTap,
    this.count,
    this.countDanger = false,
  });

  final String label;
  final bool selected;
  final VoidCallback? onTap;
  final int? count;
  /// When true, a non-zero [count] badge is red — a cue that the tab holds
  /// in-progress / incomplete items.
  final bool countDanger;

  @override
  Widget build(BuildContext context) {
    final c = context.nq;
    final fg = selected ? NqFixed.heroText : c.tx2;
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: onTap,
      child: Container(
        height: 36,
        padding: const EdgeInsets.symmetric(horizontal: 14),
        decoration: BoxDecoration(
          color: selected ? c.hero : Colors.transparent,
          borderRadius: BorderRadius.circular(NqRadius.pill),
          border: selected ? null : Border.all(color: c.bd),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (selected) ...[
              NqIcon(NqIcons.check, size: 14, color: fg),
              const SizedBox(width: 6),
            ],
            Text(
              label,
              style: NqType.label.copyWith(
                fontSize: 13.5,
                fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
                color: fg,
              ),
            ),
            if (count != null && count! > 0) ...[
              const SizedBox(width: 6),
              _badge(c, count!, fg),
            ],
          ],
        ),
      ),
    );
  }

  /// A circular/pill count badge. Red when [countDanger]; otherwise a subtle
  /// badge that contrasts with the chip (light on a selected chip, grey tint
  /// on an unselected one).
  Widget _badge(NqColors c, int value, Color fg) {
    final danger = countDanger;
    final Color bg = danger
        ? c.err
        : selected
            ? NqFixed.heroText.withValues(alpha: 0.22)
            : c.sf2;
    final Color txt = danger ? Colors.white : fg;
    return Container(
      constraints: const BoxConstraints(minWidth: 20),
      height: 20,
      padding: const EdgeInsets.symmetric(horizontal: 6),
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(10),
      ),
      child: Text(
        '$value',
        style: NqType.numeric(12, FontWeight.w700).copyWith(color: txt),
      ),
    );
  }
}
