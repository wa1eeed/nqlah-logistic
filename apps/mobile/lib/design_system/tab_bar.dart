import 'package:flutter/material.dart';

import '../core/session/identity.dart';
import '../core/theme/tokens.dart';
import '../core/theme/typography.dart';
import '../core/widgets/nq_icon.dart';

/// Bottom navigation bar (handoff §4): 78dp, surface bg, 1dp top border.
/// Active item = 52×30 `mintBg` pill with a filled icon + `mintTx` 700 label;
/// inactive = regular icon + `tx2`.
class NqTabBar extends StatelessWidget {
  const NqTabBar({
    super.key,
    required this.tabs,
    required this.index,
    required this.onChanged,
  });

  final List<NqTab> tabs;
  final int index;
  final ValueChanged<int> onChanged;

  @override
  Widget build(BuildContext context) {
    final c = context.nq;
    return Container(
      height: NqLayout.tabBar,
      padding: const EdgeInsets.only(top: 8, bottom: 14, left: 4, right: 4),
      decoration: BoxDecoration(
        color: c.sf,
        border: Border(top: BorderSide(color: c.bd)),
      ),
      child: Row(
        children: [
          for (var i = 0; i < tabs.length; i++)
            Expanded(
              child: _Item(
                tab: tabs[i],
                active: i == index,
                onTap: () => onChanged(i),
              ),
            ),
        ],
      ),
    );
  }
}

class _Item extends StatelessWidget {
  const _Item({required this.tab, required this.active, required this.onTap});

  final NqTab tab;
  final bool active;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final c = context.nq;
    final color = active ? c.mintTx : c.tx2;
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: onTap,
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          AnimatedContainer(
            duration: NqMotion.tab,
            curve: NqMotion.standard,
            width: 52,
            height: 30,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: active ? c.mintBg : Colors.transparent,
              borderRadius: BorderRadius.circular(NqRadius.pill),
            ),
            child: NqIcon(tab.icon, fill: active, size: 21, color: color),
          ),
          const SizedBox(height: 4),
          Text(
            tab.label,
            style: (active ? NqType.tabActive : NqType.tab).copyWith(color: color),
          ),
        ],
      ),
    );
  }
}
