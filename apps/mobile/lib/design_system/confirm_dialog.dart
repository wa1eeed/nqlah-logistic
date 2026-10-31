import 'package:flutter/material.dart';

import '../core/theme/tokens.dart';
import '../core/theme/typography.dart';
import '../core/widgets/nq_icon.dart';

/// Shared confirmation dialog for every consequential in-app action. It asks the
/// user before proceeding and **explains what will happen**, for a premium,
/// protected experience. Returns true only when the user confirms.
///
/// Usage:
/// ```dart
/// if (!await nqConfirm(context,
///     title: 'تأكيد التحميل',
///     message: 'سيتم تحديث حالة الشحنة إلى «جارية» وإشعار العميل بانطلاقها.',
///     confirmLabel: 'تأكيد التحميل')) return;
/// ```
Future<bool> nqConfirm(
  BuildContext context, {
  required String title,
  required String message,
  String confirmLabel = 'تأكيد',
  String cancelLabel = 'إلغاء',
  bool danger = false,
  String? icon,
}) async {
  final c = context.nq;
  final ok = await showDialog<bool>(
    context: context,
    builder: (ctx) => AlertDialog(
      backgroundColor: c.sf,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(NqRadius.card)),
      title: Row(
        children: [
          Expanded(
            child: Text(title,
                style: NqType.h2.copyWith(color: c.tx), textAlign: TextAlign.right),
          ),
          if (icon != null) ...[
            const SizedBox(width: 10),
            Container(
              width: 38,
              height: 38,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: (danger ? c.err : c.mintTx).withValues(alpha: 0.12),
                shape: BoxShape.circle,
              ),
              child: NqIcon(icon, size: 20, color: danger ? c.err : c.mintTx),
            ),
          ],
        ],
      ),
      content: Text(message,
          style: NqType.body.copyWith(color: c.tx2, height: 1.6),
          textAlign: TextAlign.right),
      actionsAlignment: MainAxisAlignment.spaceBetween,
      actions: [
        TextButton(
          onPressed: () => Navigator.of(ctx).pop(false),
          child: Text(cancelLabel, style: NqType.labelStrong.copyWith(color: c.tx2)),
        ),
        TextButton(
          onPressed: () => Navigator.of(ctx).pop(true),
          child: Text(confirmLabel,
              style: NqType.labelStrong.copyWith(color: danger ? c.err : c.mintTx)),
        ),
      ],
    ),
  );
  return ok == true;
}
