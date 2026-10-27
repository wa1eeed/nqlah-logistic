import 'package:flutter/material.dart';

import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';
import '../../core/widgets/nq_icon.dart';
import '../../design_system/upload_row.dart';
import 'wizard_scaffold.dart';

/// Register step 3/4 — verification documents (handoff 5e). Providers upload
/// CR, VAT, transport-authority licence, national address and signatory ID;
/// customers see only CR, VAT and national address.
class RegisterDocumentsScreen extends StatelessWidget {
  const RegisterDocumentsScreen({super.key, this.onNext});

  final VoidCallback? onNext;

  @override
  Widget build(BuildContext context) {
    final c = context.nq;
    return WizardScaffold(
      step: 3,
      totalSteps: 4,
      title: 'مستندات التحقّق',
      subtitle: 'نراجعها خلال 24 ساعة عمل',
      nextLabel: 'أكمل المستندات المطلوبة (2)',
      nextEnabled: false,
      onNext: onNext,
      children: [
        const NqUploadRow(
          title: 'السجل التجاري',
          state: NqUploadState.uploaded,
          meta: 'CR-2050118472.pdf · 240 KB',
        ),
        const SizedBox(height: 10),
        const NqUploadRow(
          title: 'شهادة ضريبة القيمة المضافة',
          state: NqUploadState.uploaded,
          meta: 'VAT-cert.pdf · 180 KB',
        ),
        const SizedBox(height: 10),
        const NqUploadRow(
          title: 'ترخيص هيئة النقل العام',
          state: NqUploadState.uploading,
          progress: 0.64,
        ),
        const SizedBox(height: 10),
        const NqUploadRow(
          title: 'العنوان الوطني',
          state: NqUploadState.requiredEmpty,
          meta: 'مطلوب',
        ),
        const SizedBox(height: 10),
        const NqUploadRow(
          title: 'هوية المفوّض بالتوقيع',
          state: NqUploadState.requiredEmpty,
          meta: 'مطلوب',
        ),
        const SizedBox(height: 16),
        _privacyNote(c),
      ],
    );
  }

  Widget _privacyNote(NqColors c) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: c.infoBg,
        borderRadius: BorderRadius.circular(NqRadius.button),
      ),
      child: Row(
        children: [
          NqIcon(NqIcons.shieldCheck, size: 20, color: c.info),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              'مستنداتك محفوظة ومشفّرة، تُستخدم للتحقّق فقط ولا تُشارك مع أطراف أخرى.',
              style: NqType.caption.copyWith(color: c.tx2, height: 1.5),
            ),
          ),
        ],
      ),
    );
  }
}
