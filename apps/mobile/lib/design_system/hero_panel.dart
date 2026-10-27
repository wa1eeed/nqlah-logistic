import 'package:flutter/material.dart';

import '../core/theme/tokens.dart';

/// The teal hero panel (handoff §6): `hero` bg + a 26dp grid texture
/// (1dp rgba(255,255,255,.035) lines) + an optional radial mint glow at the
/// top-start corner. Content on it uses the fixed [NqFixed] colors.
class NqHeroPanel extends StatelessWidget {
  const NqHeroPanel({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.fromLTRB(16, 0, 16, 24),
    this.glow = true,
    this.height,
    this.borderRadius,
  });

  final Widget child;
  final EdgeInsets padding;
  final bool glow;
  final double? height;
  final BorderRadius? borderRadius;

  @override
  Widget build(BuildContext context) {
    final c = context.nq;
    return ClipRRect(
      borderRadius: borderRadius ?? BorderRadius.zero,
      child: Container(
        height: height,
        width: double.infinity,
        color: c.hero,
        child: CustomPaint(
          painter: _HeroTexturePainter(glow: glow),
          child: Padding(padding: padding, child: child),
        ),
      ),
    );
  }
}

class _HeroTexturePainter extends CustomPainter {
  _HeroTexturePainter({required this.glow});
  final bool glow;

  @override
  void paint(Canvas canvas, Size size) {
    // Radial mint glow at the top-start (right edge in RTL, but we paint at the
    // logical top-left corner which maps visually; kept subtle).
    if (glow) {
      final glowPaint = Paint()
        ..shader = RadialGradient(
          colors: [const Color(0x3800C9A7), const Color(0x0000C9A7)],
        ).createShader(Rect.fromCircle(
          center: Offset(size.width, 0),
          radius: size.width * 0.7,
        ));
      canvas.drawRect(Offset.zero & size, glowPaint);
    }

    final line = Paint()
      ..color = NqFixed.heroGridLine
      ..strokeWidth = 1;
    const step = NqFixed.heroGridStep;
    for (double x = 0; x <= size.width; x += step) {
      canvas.drawLine(Offset(x, 0), Offset(x, size.height), line);
    }
    for (double y = 0; y <= size.height; y += step) {
      canvas.drawLine(Offset(0, y), Offset(size.width, y), line);
    }
  }

  @override
  bool shouldRepaint(_HeroTexturePainter old) => old.glow != glow;
}
