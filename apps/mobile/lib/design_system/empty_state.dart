import 'package:flutter/material.dart';

import '../core/theme/tokens.dart';
import '../core/theme/typography.dart';
import '../core/widgets/nq_icon.dart';

/// A calm, on-brand empty state: a layered mint medallion (a soft tint field
/// with an inner tile, both faintly ringed) carrying the icon in the brand
/// colour, over a title and optional hint. Use it in place of a bare,
/// washed-out icon so an empty list reads as intentional, not unfinished.
///
/// Mirrors the web `EmptyMedallion` (mint/5 field + mint/10 tile, mint icon).
class NqEmptyState extends StatelessWidget {
  const NqEmptyState({
    super.key,
    required this.icon,
    required this.title,
    this.message,
    this.action,
  });

  /// An `NqIcons.*` name.
  final String icon;
  final String title;
  final String? message;

  /// Optional call to action (e.g. a button) shown below the text.
  final Widget? action;

  @override
  Widget build(BuildContext context) {
    final c = context.nq;
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(
          horizontal: NqSpace.x6,
          vertical: NqSpace.x7,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            NqEmptyMedallion(icon: icon),
            const SizedBox(height: NqSpace.x4),
            Text(
              title,
              textAlign: TextAlign.center,
              style: NqType.h3.copyWith(color: c.tx),
            ),
            if (message != null) ...[
              const SizedBox(height: NqSpace.x2),
              Text(
                message!,
                textAlign: TextAlign.center,
                style: NqType.body.copyWith(color: c.tx3),
              ),
            ],
            if (action != null) ...[
              const SizedBox(height: NqSpace.x5),
              action!,
            ],
          ],
        ),
      ),
    );
  }
}

/// The medallion on its own, for empty states that supply their own layout.
class NqEmptyMedallion extends StatelessWidget {
  const NqEmptyMedallion({super.key, required this.icon});

  final String icon;

  @override
  Widget build(BuildContext context) {
    final c = context.nq;
    return Container(
      width: 72,
      height: 72,
      decoration: BoxDecoration(
        color: c.mint.withValues(alpha: 0.05),
        borderRadius: BorderRadius.circular(NqRadius.cardOverlap),
        border: Border.all(color: c.mint.withValues(alpha: 0.10)),
      ),
      alignment: Alignment.center,
      child: Container(
        width: 48,
        height: 48,
        decoration: BoxDecoration(
          color: c.mint.withValues(alpha: 0.10),
          borderRadius: BorderRadius.circular(NqRadius.card),
          border: Border.all(color: c.mint.withValues(alpha: 0.15)),
        ),
        alignment: Alignment.center,
        child: NqIcon(icon, size: 26, color: c.mintTx),
      ),
    );
  }
}
