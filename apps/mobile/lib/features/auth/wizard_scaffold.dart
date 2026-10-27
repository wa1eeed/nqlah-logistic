import 'package:flutter/material.dart';

import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';
import '../../core/widgets/nq_icon.dart';
import '../../design_system/button.dart';

/// Shared shell for the registration wizard steps (handoff 1l/1m/5e/5f):
/// a "الخطوة n/N" header + back, title + subtitle, scrolling body, and a
/// sticky footer primary action.
class WizardScaffold extends StatelessWidget {
  const WizardScaffold({
    super.key,
    required this.step,
    required this.totalSteps,
    required this.title,
    required this.children,
    required this.nextLabel,
    this.subtitle,
    this.onNext,
    this.nextEnabled = true,
    this.footerLeading,
    this.nextIcon,
  });

  final int step;
  final int totalSteps;
  final String title;
  final String? subtitle;
  final List<Widget> children;
  final String nextLabel;
  final VoidCallback? onNext;
  final bool nextEnabled;
  final Widget? footerLeading;
  final String? nextIcon;

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
                  Text('الخطوة $step/$totalSteps',
                      style: NqType.label.copyWith(color: c.tx2)),
                  const Spacer(),
                  GestureDetector(
                    onTap: () => Navigator.of(context).maybePop(),
                    child: NqIcon(NqIcons.arrowRight, size: 22, color: c.tx),
                  ),
                ],
              ),
            ),
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text(title,
                        style: NqType.h1.copyWith(fontSize: 24, color: c.tx),
                        textAlign: TextAlign.center),
                    if (subtitle != null) ...[
                      const SizedBox(height: 6),
                      Text(subtitle!,
                          style: NqType.body.copyWith(color: c.tx2),
                          textAlign: TextAlign.center),
                    ],
                    const SizedBox(height: 24),
                    ...children,
                  ],
                ),
              ),
            ),
            Container(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
              decoration: BoxDecoration(
                color: c.sf,
                border: Border(top: BorderSide(color: c.bd)),
              ),
              child: Row(
                children: [
                  if (footerLeading != null) ...[
                    footerLeading!,
                    const SizedBox(width: 16),
                  ],
                  Expanded(
                    child: NqButton(
                      label: nextLabel,
                      icon: nextIcon,
                      onPressed: nextEnabled ? (onNext ?? () {}) : null,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
