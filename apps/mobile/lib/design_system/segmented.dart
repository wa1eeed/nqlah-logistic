import 'package:flutter/material.dart';

import '../core/theme/tokens.dart';
import '../core/theme/typography.dart';

/// Segmented control (handoff §6): track `sf2` R12 padding 4, thumb `sf` + e1
/// that slides between options; active text 700, inactive `tx2`.
class NqSegmented extends StatelessWidget {
  const NqSegmented({
    super.key,
    required this.options,
    required this.index,
    required this.onChanged,
    this.height = 44,
    this.counts,
    this.dangerCounts = const {},
  });

  final List<String> options;
  final int index;
  final ValueChanged<int> onChanged;
  final double height;
  /// Optional per-option count badge (null = no badge). Shown as a small circle.
  final List<int?>? counts;
  /// Option indices whose count badge is red (in-progress / incomplete).
  final Set<int> dangerCounts;

  @override
  Widget build(BuildContext context) {
    final c = context.nq;
    return Container(
      height: height,
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: c.sf2,
        borderRadius: BorderRadius.circular(NqRadius.button),
      ),
      child: LayoutBuilder(
        builder: (context, constraints) {
          final n = options.length;
          final w = constraints.maxWidth / n;
          return Stack(
            children: [
              AnimatedAlign(
                duration: NqMotion.segmented,
                curve: NqMotion.standard,
                // AlignmentDirectional (not Alignment) so the thumb tracks the
                // selected option under RTL: index 0 → start (right in Arabic),
                // matching the options Row. Absolute Alignment mirrored it.
                alignment: AlignmentDirectional(
                  n == 1 ? 0 : (index / (n - 1)) * 2 - 1,
                  0,
                ),
                child: Container(
                  width: w,
                  height: double.infinity,
                  decoration: BoxDecoration(
                    color: c.sf,
                    borderRadius: BorderRadius.circular(10),
                    boxShadow: c.isDark
                        ? null
                        : [
                            BoxShadow(
                              color: const Color(0x140A1A19),
                              blurRadius: 6,
                              offset: const Offset(0, 1),
                            ),
                          ],
                    border: c.isDark ? Border.all(color: c.bd) : null,
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
                        child: Center(
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(
                                options[i],
                                style: NqType.label.copyWith(
                                  fontSize: 14,
                                  fontWeight: i == index
                                      ? FontWeight.w700
                                      : FontWeight.w500,
                                  color: i == index ? c.tx : c.tx2,
                                ),
                              ),
                              if (_countAt(i) != null && _countAt(i)! > 0) ...[
                                const SizedBox(width: 6),
                                _badge(c, _countAt(i)!, dangerCounts.contains(i)),
                              ],
                            ],
                          ),
                        ),
                      ),
                    ),
                ],
              ),
            ],
          );
        },
      ),
    );
  }

  int? _countAt(int i) =>
      (counts != null && i < counts!.length) ? counts![i] : null;

  Widget _badge(NqColors c, int value, bool danger) {
    final Color bg = danger ? c.err : c.sf2;
    final Color txt = danger ? Colors.white : c.tx2;
    return Container(
      constraints: const BoxConstraints(minWidth: 20),
      height: 20,
      padding: const EdgeInsets.symmetric(horizontal: 6),
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(10),
        border: danger ? null : Border.all(color: c.bd),
      ),
      child: Text(
        '$value',
        style: NqType.numeric(12, FontWeight.w700).copyWith(color: txt),
      ),
    );
  }
}
