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
  });

  final String label;
  final bool selected;
  final VoidCallback? onTap;
  final int? count;

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
            if (count != null) ...[
              const SizedBox(width: 6),
              Text(
                '$count',
                style: NqType.numeric(13, FontWeight.w700).copyWith(color: fg),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
