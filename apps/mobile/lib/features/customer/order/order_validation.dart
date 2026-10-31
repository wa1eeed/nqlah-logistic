import 'package:flutter/material.dart';

import '../../../core/theme/tokens.dart';
import '../../../core/theme/typography.dart';
import '../../../core/widgets/nq_icon.dart';
import '../../../design_system/button.dart';

/// A required field that is still empty: a human [label] and the [key] of the
/// on-screen widget to scroll to.
class MissingField {
  const MissingField(this.label, this.key);
  final String label;
  final GlobalKey key;
}

/// Gatekeeper for a wizard step's «التالي»: if any required field is [missing],
/// scroll to the first one and show an elegant popup listing them all, then
/// return false so the caller does NOT advance. Returns true (advance) when
/// nothing is missing.
Future<bool> ensureStepComplete(
  BuildContext context,
  List<MissingField> missing,
) async {
  if (missing.isEmpty) return true;
  final target = missing.first.key.currentContext;
  if (target != null) {
    await Scrollable.ensureVisible(
      target,
      duration: const Duration(milliseconds: 350),
      curve: Curves.easeOutCubic,
      alignment: 0.12,
    );
  }
  if (!context.mounted) return false;
  await showDialog<void>(
    context: context,
    builder: (_) => _MissingFieldsDialog(missing.map((m) => m.label).toList()),
  );
  return false;
}

class _MissingFieldsDialog extends StatelessWidget {
  const _MissingFieldsDialog(this.labels);
  final List<String> labels;

  @override
  Widget build(BuildContext context) {
    final c = context.nq;
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Dialog(
        backgroundColor: c.sf,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(NqRadius.card)),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 20, 20, 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(children: [
                Container(
                  width: 44,
                  height: 44,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(color: c.warnBg, shape: BoxShape.circle),
                  child: NqIcon(NqIcons.warningCircle, size: 24, color: c.warn),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text('حقول مطلوبة',
                      style: NqType.h3.copyWith(color: c.tx)),
                ),
              ]),
              const SizedBox(height: 14),
              Text('يرجى إكمال الحقول التالية للمتابعة:',
                  style: NqType.body.copyWith(color: c.tx2)),
              const SizedBox(height: 10),
              for (final l in labels)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 3),
                  child: Row(children: [
                    Container(
                      width: 6,
                      height: 6,
                      margin: const EdgeInsets.only(top: 2),
                      decoration: BoxDecoration(color: c.err, shape: BoxShape.circle),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(l, style: NqType.bodyStrong.copyWith(color: c.tx)),
                    ),
                  ]),
                ),
              const SizedBox(height: 18),
              NqButton(
                label: 'حسنًا',
                onPressed: () => Navigator.of(context).maybePop(),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Inline error line for non-text fields (chips / pickers / segments), matching
/// NqTextField's own error style.
class NqInlineError extends StatelessWidget {
  const NqInlineError(this.message, {super.key});
  final String? message;

  @override
  Widget build(BuildContext context) {
    final c = context.nq;
    if (message == null) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.only(top: 6),
      child: Row(children: [
        NqIcon(NqIcons.warningCircle, size: 14, color: c.err),
        const SizedBox(width: 6),
        Expanded(child: Text(message!, style: NqType.caption.copyWith(color: c.err))),
      ]),
    );
  }
}
