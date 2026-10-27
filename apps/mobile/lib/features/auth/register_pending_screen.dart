import 'package:flutter/material.dart';

import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';
import '../../core/widgets/nq_icon.dart';
import '../../design_system/button.dart';

/// Register step 4/4 — pending approval (handoff 5f). Browsing is allowed while
/// the account is under review.
class RegisterPendingScreen extends StatelessWidget {
  const RegisterPendingScreen({super.key, this.onBrowse});

  final VoidCallback? onBrowse;

  @override
  Widget build(BuildContext context) {
    final c = context.nq;
    return Scaffold(
      backgroundColor: c.bg,
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
              child: Row(
                children: [
                  Text('الخطوة 4/4', style: NqType.label.copyWith(color: c.tx2)),
                ],
              ),
            ),
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(24, 24, 24, 24),
                child: Column(
                  children: [
                    const SizedBox(height: 12),
                    Container(
                      width: 88,
                      height: 88,
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        color: c.infoBg,
                        borderRadius: BorderRadius.circular(28),
                      ),
                      child: NqIcon(NqIcons.hourglassMedium, size: 44, color: c.info),
                    ),
                    const SizedBox(height: 20),
                    Text('قيد المراجعة',
                        style: NqType.h1.copyWith(fontSize: 24, color: c.tx)),
                    const SizedBox(height: 8),
                    Text(
                      'نراجع مستنداتك خلال 24 ساعة عمل، ونعلمك فور اعتماد حسابك.',
                      style: NqType.body.copyWith(color: c.tx2, height: 1.6),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 28),
                    _timeline(c),
                    const SizedBox(height: 20),
                    _browseNote(c),
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
              child: Column(
                children: [
                  NqButton(label: 'تصفّح الأحمال', onPressed: onBrowse ?? () {}),
                  const SizedBox(height: 12),
                  NqButton(
                    label: 'تواصل مع الدعم',
                    variant: NqButtonVariant.secondary,
                    icon: NqIcons.headset,
                    onPressed: () {},
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _timeline(NqColors c) {
    return Column(
      children: [
        _node(c, 'أنشأت الحساب', done: true, first: true),
        _node(c, 'رفع المستندات', done: true),
        _node(c, 'قيد المراجعة', current: true),
        _node(c, 'اعتماد الحساب', next: true, last: true),
      ],
    );
  }

  Widget _node(NqColors c, String label,
      {bool done = false,
      bool current = false,
      bool next = false,
      bool first = false,
      bool last = false}) {
    final Color nodeColor = done ? c.ok : (current ? c.info : c.bd);
    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Expanded(
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 8),
              child: Text(label,
                  style: NqType.body.copyWith(
                      color: next ? c.tx2 : c.tx,
                      fontWeight: current ? FontWeight.w700 : FontWeight.w400),
                  textAlign: TextAlign.right),
            ),
          ),
          const SizedBox(width: 12),
          Column(
            children: [
              Container(
                width: 2,
                height: 8,
                color: first ? Colors.transparent : (done ? c.ok : c.bd),
              ),
              Container(
                width: 24,
                height: 24,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: current ? c.infoBg : Colors.transparent,
                  shape: BoxShape.circle,
                  border: Border.all(color: nodeColor, width: 2),
                ),
                child: done
                    ? NqIcon(NqIcons.check, size: 13, color: c.ok)
                    : (current
                        ? NqIcon(NqIcons.clock, size: 13, color: c.info)
                        : null),
              ),
              Expanded(
                child: Container(
                    width: 2, color: last ? Colors.transparent : c.bd),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _browseNote(NqColors c) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: c.mintBg,
        borderRadius: BorderRadius.circular(NqRadius.button),
      ),
      child: Row(
        children: [
          NqIcon(NqIcons.info, size: 20, color: c.mintTx),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              'يمكنك تصفّح الأحمال المتاحة أثناء انتظار الاعتماد.',
              style: NqType.caption.copyWith(color: c.mintTx, height: 1.5),
            ),
          ),
        ],
      ),
    );
  }
}
