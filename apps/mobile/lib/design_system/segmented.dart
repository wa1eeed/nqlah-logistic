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
  });

  final List<String> options;
  final int index;
  final ValueChanged<int> onChanged;
  final double height;

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
                          child: Text(
                            options[i],
                            style: NqType.label.copyWith(
                              fontSize: 14,
                              fontWeight:
                                  i == index ? FontWeight.w700 : FontWeight.w500,
                              color: i == index ? c.tx : c.tx2,
                            ),
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
}
