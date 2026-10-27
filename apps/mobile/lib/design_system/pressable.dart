import 'package:flutter/material.dart';

import '../core/theme/tokens.dart';

/// Scales its child to .98 on press (handoff §10 button-press spec). Wraps any
/// tappable so every control gets the same tactile feedback.
class Pressable extends StatefulWidget {
  const Pressable({
    super.key,
    required this.child,
    this.onTap,
    this.scale = 0.98,
    this.enabled = true,
  });

  final Widget child;
  final VoidCallback? onTap;
  final double scale;
  final bool enabled;

  @override
  State<Pressable> createState() => _PressableState();
}

class _PressableState extends State<Pressable> {
  bool _down = false;

  bool get _active => widget.enabled && widget.onTap != null;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTapDown: _active ? (_) => setState(() => _down = true) : null,
      onTapUp: _active ? (_) => setState(() => _down = false) : null,
      onTapCancel: _active ? () => setState(() => _down = false) : null,
      onTap: _active ? widget.onTap : null,
      behavior: HitTestBehavior.opaque,
      child: AnimatedScale(
        scale: _down ? widget.scale : 1.0,
        duration: NqMotion.press,
        curve: NqMotion.standard,
        child: widget.child,
      ),
    );
  }
}
