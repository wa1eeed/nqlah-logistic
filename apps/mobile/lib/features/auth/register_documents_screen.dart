import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_exception.dart';
import '../../core/auth/registration_controller.dart';
import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';
import '../../core/widgets/nq_icon.dart';
import '../../design_system/upload_row.dart';
import 'wizard_scaffold.dart';

/// Register step 3/4 (4/5 for providers) — verification documents (handoff 5e).
/// Providers upload CR, VAT, transport-authority licence, national address and
/// signatory ID; customers see only CR, VAT and national address.
///
/// "إرسال للمراجعة" submits the account to `POST /auth/register` (which creates
/// the account and sends the phone OTP). Document upload itself is a separate
/// backend track and is shown here as the review checklist only.
class RegisterDocumentsScreen extends ConsumerStatefulWidget {
  const RegisterDocumentsScreen({super.key, this.onSubmitted});

  /// Called after the account is created; the caller routes to OTP.
  final VoidCallback? onSubmitted;

  @override
  ConsumerState<RegisterDocumentsScreen> createState() =>
      _RegisterDocumentsScreenState();
}

class _RegisterDocumentsScreenState
    extends ConsumerState<RegisterDocumentsScreen> {
  bool _busy = false;
  String? _error;

  Future<void> _submit() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ref.read(registrationControllerProvider.notifier).submit();
      if (mounted) (widget.onSubmitted ?? () {})();
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } catch (_) {
      if (mounted) {
        setState(() => _error = 'حدث خطأ غير متوقع. حاول مجددًا.');
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = context.nq;
    final carrier = ref.watch(registrationControllerProvider).isCarrier;
    return WizardScaffold(
      step: carrier ? 4 : 3,
      totalSteps: carrier ? 5 : 4,
      title: 'مستندات التحقّق',
      subtitle: 'نراجعها خلال 24 ساعة عمل',
      nextLabel: _busy ? 'جارٍ الإرسال…' : 'إرسال للمراجعة',
      nextEnabled: !_busy,
      onNext: _busy ? null : _submit,
      children: [
        if (_error != null) ...[
          _errorBanner(c, _error!),
          const SizedBox(height: 14),
        ],
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
        if (carrier) ...[
          const SizedBox(height: 10),
          const NqUploadRow(
            title: 'ترخيص هيئة النقل العام',
            state: NqUploadState.uploading,
            progress: 0.64,
          ),
        ],
        const SizedBox(height: 10),
        const NqUploadRow(
          title: 'العنوان الوطني',
          state: NqUploadState.requiredEmpty,
          meta: 'مطلوب',
        ),
        if (carrier) ...[
          const SizedBox(height: 10),
          const NqUploadRow(
            title: 'هوية المفوّض بالتوقيع',
            state: NqUploadState.requiredEmpty,
            meta: 'مطلوب',
          ),
        ],
        const SizedBox(height: 16),
        _privacyNote(c),
      ],
    );
  }

  Widget _errorBanner(NqColors c, String msg) => Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: c.errBg,
          borderRadius: BorderRadius.circular(NqRadius.button),
        ),
        child: Row(
          children: [
            NqIcon(NqIcons.warningCircle, size: 18, color: c.err),
            const SizedBox(width: 12),
            Expanded(
              child: Text(msg,
                  style: NqType.caption.copyWith(color: c.err, height: 1.5),
                  textAlign: TextAlign.right),
            ),
          ],
        ),
      );

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
