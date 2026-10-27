import 'package:flutter/material.dart';

import '../core/theme/tokens.dart';

/// Pill toggle (handoff §6). On = `mint` track (brighter on hero), knob dark;
/// off = translucent / `bd` track, white knob. 150ms.
class NqToggle extends StatelessWidget {
  const NqToggle({
    super.key,
    required this.value,
    required this.onChanged,
    this.onHero = false,
    this.large = false,
  });

  final bool value;
  final ValueChanged<bool> onChanged;
  final bool onHero;
  final bool large;

  @override
  Widget build(BuildContext context) {
    final c = context.nq;
    final w = large ? 50.0 : 40.0;
    final h = large ? 30.0 : 24.0;
    final knob = large ? 24.0 : 18.0;
    final onColor = onHero ? NqFixed.heroAccent : c.mint;
    final offColor = onHero ? const Color(0x2EFFFFFF) : c.bd;
    final knobColor = value ? (onHero ? c.hero : c.onMint) : Colors.white;

    return GestureDetector(
      onTap: () => onChanged(!value),
      child: AnimatedContainer(
        duration: NqMotion.toggle,
        width: w,
        height: h,
        padding: const EdgeInsets.all(3),
        decoration: BoxDecoration(
          color: value ? onColor : offColor,
          borderRadius: BorderRadius.circular(NqRadius.pill),
        ),
        child: AnimatedAlign(
          duration: NqMotion.toggle,
          curve: NqMotion.standard,
          alignment: value ? Alignment.centerRight : Alignment.centerLeft,
          child: Container(
            width: knob,
            height: knob,
            decoration: BoxDecoration(
              color: knobColor,
              shape: BoxShape.circle,
              boxShadow: const [
                BoxShadow(color: Color(0x40000000), blurRadius: 3, offset: Offset(0, 1)),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
