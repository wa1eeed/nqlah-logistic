import 'package:flutter/material.dart';

import '../../../core/theme/tokens.dart';
import '../../../core/theme/typography.dart';
import '../../../core/widgets/nq_icon.dart';
import '../../../design_system/button.dart';

/// Shared shell for the create-order wizard (handoff 1b, 4a–4e): a close +
/// save-draft bar, a 6-segment progress bar, a step label row, the title, the
/// scrolling body, and a footer (summary/price + next, or prev + next).
class OrderWizardScaffold extends StatelessWidget {
  const OrderWizardScaffold({
    super.key,
    required this.step,
    required this.stepName,
    required this.nextLabel,
    required this.title,
    required this.children,
    this.totalSteps = 6,
    this.subtitle,
    this.footerLeading,
    this.showPrev = false,
    this.onNext,
    this.onPrev,
    this.onClose,
    this.nextHint,
    this.nextButtonLabel,
    this.nextIcon,
    this.nextEnabled = true,
  });

  final int step;
  final int totalSteps;
  final String stepName;
  final String nextLabel;
  final String title;
  final String? subtitle;
  final List<Widget> children;
  final Widget? footerLeading;
  final bool showPrev;
  final VoidCallback? onNext;
  final VoidCallback? onPrev;
  final VoidCallback? onClose;
  final String? nextHint; // label-row hint (default "التالي: $nextLabel")
  final String? nextButtonLabel; // footer button (default "التالي: $nextLabel")
  final String? nextIcon; // footer icon (default arrow-left)
  final bool nextEnabled;

  @override
  Widget build(BuildContext context) {
    final c = context.nq;
    return Scaffold(
      backgroundColor: c.bg,
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
              child: Row(
                children: [
                  GestureDetector(
                    onTap: onClose ?? () => Navigator.of(context).maybePop(),
                    child: NqIcon(NqIcons.x, size: 22, color: c.tx),
                  ),
                  Expanded(
                    child: Center(
                      child: Text('طلب نقل جديد',
                          style: NqType.h3.copyWith(color: c.tx)),
                    ),
                  ),
                  Text('حفظ كمسودة',
                      style: NqType.labelStrong.copyWith(color: c.mintTx)),
                ],
              ),
            ),
            const SizedBox(height: 16),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: _progress(c),
            ),
            const SizedBox(height: 10),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Row(
                children: [
                  Text(nextHint ?? 'التالي: $nextLabel',
                      style: NqType.caption.copyWith(color: c.tx2)),
                  const Spacer(),
                  Text('$stepName · الخطوة $step/$totalSteps',
                      style: NqType.caption.copyWith(color: c.tx2)),
                ],
              ),
            ),
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text(title, style: NqType.h1.copyWith(fontSize: 22, color: c.tx)),
                    if (subtitle != null) ...[
                      const SizedBox(height: 8),
                      Text(subtitle!, style: NqType.body.copyWith(color: c.tx2)),
                    ],
                    const SizedBox(height: 18),
                    ...children,
                  ],
                ),
              ),
            ),
            _footer(context, c),
          ],
        ),
      ),
    );
  }

  Widget _progress(NqColors c) {
    return Row(
      children: [
        for (var i = 0; i < totalSteps; i++) ...[
          Expanded(
            child: Container(
              height: 4,
              decoration: BoxDecoration(
                color: i < step ? c.mint : c.sf2,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          if (i < totalSteps - 1) const SizedBox(width: 4),
        ],
      ],
    );
  }

  Widget _footer(BuildContext context, NqColors c) {
    final next = NqButton(
      label: nextButtonLabel ?? 'التالي: $nextLabel',
      icon: nextIcon ?? NqIcons.arrowLeft,
      onPressed: nextEnabled ? (onNext ?? () {}) : null,
    );
    Widget content;
    if (footerLeading != null) {
      content = Row(
        children: [footerLeading!, const SizedBox(width: 16), Expanded(child: next)],
      );
    } else if (showPrev) {
      content = Row(
        children: [
          NqButton(
            label: 'السابق',
            variant: NqButtonVariant.secondary,
            expand: false,
            onPressed: onPrev ?? () => Navigator.of(context).maybePop(),
          ),
          const SizedBox(width: 12),
          Expanded(child: next),
        ],
      );
    } else {
      content = next;
    }
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
      decoration: BoxDecoration(
        color: c.sf,
        border: Border(top: BorderSide(color: c.bd)),
      ),
      child: content,
    );
  }
}
