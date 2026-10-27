import 'package:flutter/material.dart';

import '../core/theme/tokens.dart';
import '../core/theme/typography.dart';
import '../core/widgets/nq_icon.dart';

/// A dropdown-style field (label + current value + caret). Static display for
/// now; opens a picker when wired.
class NqDropdownField extends StatelessWidget {
  const NqDropdownField({
    super.key,
    required this.label,
    required this.value,
    this.onTap,
  });

  final String label;
  final String value;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final c = context.nq;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(label, style: NqType.labelStrong.copyWith(color: c.tx)),
        const SizedBox(height: 6),
        GestureDetector(
          onTap: onTap,
          child: Container(
            height: NqLayout.input,
            padding: const EdgeInsets.symmetric(horizontal: 14),
            decoration: BoxDecoration(
              color: c.sf,
              borderRadius: BorderRadius.circular(NqRadius.input),
              border: Border.all(color: c.bd),
            ),
            child: Row(
              children: [
                NqIcon(NqIcons.caretDown, size: 18, color: c.tx3),
                const Spacer(),
                Text(value, style: NqType.body.copyWith(color: c.tx, fontSize: 16)),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

// end

/// A square checkbox (handoff: 22dp, R6, checked = `mintS`).
class NqCheckbox extends StatelessWidget {
  const NqCheckbox({super.key, required this.value, this.onChanged, this.label});

  final bool value;
  final ValueChanged<bool>? onChanged;
  final String? label;

  @override
  Widget build(BuildContext context) {
    final c = context.nq;
    final box = Container(
      width: 22,
      height: 22,
      decoration: BoxDecoration(
        color: value ? c.mintS : Colors.transparent,
        borderRadius: BorderRadius.circular(6),
        border: value ? null : Border.all(color: c.bd, width: 1.5),
      ),
      child: value
          ? NqIcon(NqIcons.check, size: 15, color: c.isDark ? c.onMint : Colors.white)
          : null,
    );
    if (label == null) {
      return GestureDetector(onTap: () => onChanged?.call(!value), child: box);
    }
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: () => onChanged?.call(!value),
      child: Row(
        children: [
          Expanded(
            child: Text(label!, style: NqType.body.copyWith(color: c.tx)),
          ),
          const SizedBox(width: 12),
          box,
        ],
      ),
    );
  }
}
