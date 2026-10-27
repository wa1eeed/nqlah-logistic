import 'package:flutter/material.dart';

import '../core/theme/tokens.dart';
import '../core/theme/typography.dart';
import '../core/widgets/nq_icon.dart';
import 'pressable.dart';

enum NqButtonVariant { primary, secondary, destructive }

enum NqButtonSize { regular, hero, driver }

/// The NQLAH button set (handoff §6).
///
/// - primary: mint fill, onMint text; pressed → mintS; disabled → sf2/tx3;
///   loading → spinner + label.
/// - secondary: 1.5 outline (mintS), mintTx text.
/// - destructive: errBg fill, err text.
///
/// Sizes: regular 52, hero 56, driver 60.
class NqButton extends StatelessWidget {
  const NqButton({
    super.key,
    required this.label,
    this.onPressed,
    this.variant = NqButtonVariant.primary,
    this.size = NqButtonSize.regular,
    this.icon,
    this.loading = false,
    this.loadingLabel,
    this.locked = false,
    this.expand = true,
  });

  final String label;
  final VoidCallback? onPressed;
  final NqButtonVariant variant;
  final NqButtonSize size;
  final String? icon; // Phosphor icon name (see NqIcons)
  final bool loading;
  final String? loadingLabel;
  final bool locked; // shows a lock icon when blocked by a step
  final bool expand;

  double get _height => switch (size) {
        NqButtonSize.regular => NqLayout.button,
        NqButtonSize.hero => NqLayout.heroButton,
        NqButtonSize.driver => NqLayout.driverPrimary,
      };

  double get _radius => size == NqButtonSize.driver || size == NqButtonSize.hero
      ? NqRadius.buttonLarge
      : NqRadius.button;

  double get _fontSize => size == NqButtonSize.driver ? 19 : 16;

  @override
  Widget build(BuildContext context) {
    final c = context.nq;
    final enabled = onPressed != null && !loading;

    late final Color bg;
    late final Color fg;
    Border? border;

    switch (variant) {
      case NqButtonVariant.primary:
        bg = enabled ? c.mint : c.sf2;
        fg = enabled ? c.onMint : c.tx3;
        break;
      case NqButtonVariant.secondary:
        bg = Colors.transparent;
        fg = enabled ? c.mintTx : c.tx3;
        border = Border.all(color: enabled ? c.mintS : c.bd, width: 1.5);
        break;
      case NqButtonVariant.destructive:
        bg = c.errBg;
        fg = c.err;
        break;
    }

    final content = Row(
      mainAxisSize: expand ? MainAxisSize.max : MainAxisSize.min,
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        if (loading) ...[
          SizedBox(
            width: 18,
            height: 18,
            child: CircularProgressIndicator(strokeWidth: 2, color: fg),
          ),
          const SizedBox(width: NqSpace.x2),
        ] else if (locked && !enabled) ...[
          NqIcon(NqIcons.lockSimple, size: 18, color: fg),
          const SizedBox(width: NqSpace.x2),
        ] else if (icon != null) ...[
          NqIcon(icon!, size: size == NqButtonSize.driver ? 24 : 20, color: fg),
          const SizedBox(width: NqSpace.x2),
        ],
        Flexible(
          child: Text(
            loading ? (loadingLabel ?? 'جارٍ الإرسال') : label,
            style: NqType.labelStrong.copyWith(
              fontSize: _fontSize,
              fontWeight: FontWeight.w800,
              color: fg,
            ),
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ],
    );

    return Pressable(
      enabled: enabled,
      onTap: onPressed,
      child: Container(
        height: _height,
        width: expand ? double.infinity : null,
        padding: expand ? null : const EdgeInsets.symmetric(horizontal: NqSpace.x5),
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: bg,
          border: border,
          borderRadius: BorderRadius.circular(_radius),
        ),
        child: content,
      ),
    );
  }
}
