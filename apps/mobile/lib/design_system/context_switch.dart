import 'package:flutter/material.dart';

import '../core/theme/tokens.dart';
import '../core/theme/typography.dart';
import '../core/widgets/nq_icon.dart';

class NqContextOption {
  const NqContextOption(this.label, this.icon, {this.badge});
  final String label;
  final String icon;
  final int? badge;
}

/// Owner-driver context switch (handoff 1i/2e): a 2-option segmented whose
/// active thumb is `hero` with white text + mint-filled icon; the inactive
/// side can carry a count badge for pending items.
class NqContextSwitch extends StatelessWidget {
  const NqContextSwitch({
    super.key,
    required this.options,
    required this.index,
    required this.onChanged,
  });

  final List<NqContextOption> options;
  final int index;
  final ValueChanged<int> onChanged;

  @override
  Widget build(BuildContext context) {
    final c = context.nq;
    return Container(
      height: 56,
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: c.sf2,
        borderRadius: BorderRadius.circular(NqRadius.buttonLarge),
      ),
      child: LayoutBuilder(builder: (context, box) {
        final n = options.length;
        final w = box.maxWidth / n;
        return Stack(
          children: [
            AnimatedAlign(
              duration: NqMotion.segmented,
              curve: NqMotion.standard,
              // RTL-aware (see NqSegmented): index 0 → start (right in Arabic),
              // matching the options Row. Absolute Alignment mirrored the thumb.
              alignment: AlignmentDirectional(n == 1 ? 0 : (index / (n - 1)) * 2 - 1, 0),
              child: Container(
                width: w,
                height: double.infinity,
                decoration: BoxDecoration(
                  color: c.hero,
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
            Row(
              children: [
                for (var i = 0; i < n; i++)
                  Expanded(
                    child: GestureDetector(
                      behavior: HitTestBehavior.opaque,
                      onTap: () => onChanged(i),
                      child: _item(c, options[i], i == index),
                    ),
                  ),
              ],
            ),
          ],
        );
      }),
    );
  }

  Widget _item(NqColors c, NqContextOption o, bool active) {
    final fg = active ? NqFixed.heroText : c.tx2;
    return Stack(
      alignment: Alignment.center,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(o.label,
                style: NqType.bodyStrong.copyWith(color: fg)),
            const SizedBox(width: 8),
            NqIcon(o.icon,
                fill: active, size: 20, color: active ? NqFixed.heroAccent : c.tx2),
          ],
        ),
        if (o.badge != null && !active)
          PositionedDirectional(
            start: 8,
            child: Container(
              width: 20,
              height: 20,
              alignment: Alignment.center,
              decoration: BoxDecoration(color: c.warnBg, shape: BoxShape.circle),
              child: Text('${o.badge}',
                  style: NqType.caption.copyWith(
                      color: c.warn, fontWeight: FontWeight.w700, fontSize: 11)),
            ),
          ),
      ],
    );
  }
}
