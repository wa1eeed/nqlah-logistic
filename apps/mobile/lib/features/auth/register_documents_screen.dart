import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_exception.dart';
import '../../core/auth/registration_controller.dart';
import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';
import '../../core/uploads/uploads_repository.dart';
import '../../core/widgets/nq_icon.dart';
import '../../design_system/upload_row.dart';
import 'wizard_scaffold.dart';

/// Register step 3/4 (4/5 for providers) — verification documents (handoff 5e).
/// Each row picks a file and uploads it DIRECTLY to the object store (via a
/// pre-signed PUT — see the integrations gateway); only the object key is kept
/// and sent with `POST /auth/register`.
class RegisterDocumentsScreen extends ConsumerStatefulWidget {
  const RegisterDocumentsScreen({super.key, this.onSubmitted});

  final VoidCallback? onSubmitted;

  @override
  ConsumerState<RegisterDocumentsScreen> createState() =>
      _RegisterDocumentsScreenState();
}

class _Doc {
  const _Doc(this.key, this.title);
  final String key;
  final String title;
}

class _Uploaded {
  const _Uploaded({this.uploading = false, this.name, this.key});
  final bool uploading;
  final String? name;
  final String? key;
}

class _RegisterDocumentsScreenState
    extends ConsumerState<RegisterDocumentsScreen> {
  bool _busy = false;
  String? _error;
  final Map<String, _Uploaded> _docs = {};

  List<_Doc> _docsFor(bool carrier) => [
        const _Doc('cr', 'السجل التجاري'),
        const _Doc('vat', 'شهادة ضريبة القيمة المضافة'),
        if (carrier) const _Doc('transportLicense', 'ترخيص هيئة النقل العام'),
        const _Doc('nationalAddress', 'العنوان الوطني'),
        if (carrier) const _Doc('signatoryId', 'هوية المفوّض بالتوقيع'),
      ];

  Future<void> _pick(_Doc doc) async {
    if (_docs[doc.key]?.uploading == true) return;
    try {
      final res = await FilePicker.pickFiles(type: FileType.any);
      if (res.isEmpty) return;
      final f = res.first;
      final bytes = await f.readAsBytes();
      setState(() => _docs[doc.key] = _Uploaded(uploading: true, name: f.name));
      final media = await ref.read(uploadsRepositoryProvider).upload(
            bytes: bytes,
            filename: f.name,
            contentType: _mimeForExt(f.extension),
            folder: 'docs',
          );
      // Record the key on the registration draft.
      final next = Map<String, String>.from(
          ref.read(registrationControllerProvider).documents)
        ..[doc.key] = media.key;
      ref.read(registrationControllerProvider.notifier).patch(
            (d) => d.copyWith(documents: next),
          );
      setState(() => _docs[doc.key] = _Uploaded(name: f.name, key: media.key));
    } on ApiException catch (e) {
      setState(() {
        _docs.remove(doc.key);
        _error = e.message;
      });
    } catch (_) {
      setState(() {
        _docs.remove(doc.key);
        _error = 'تعذّر رفع الملف. حاول مجددًا.';
      });
    }
  }

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
      if (mounted) setState(() => _error = 'حدث خطأ غير متوقع. حاول مجددًا.');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = context.nq;
    final d = ref.watch(registrationControllerProvider);
    final carrier = d.isCarrier;
    final docs = _docsFor(carrier);
    return WizardScaffold(
      step: d.docsStep,
      totalSteps: d.totalSteps,
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
        for (var i = 0; i < docs.length; i++) ...[
          if (i > 0) const SizedBox(height: 10),
          _row(docs[i]),
        ],
        const SizedBox(height: 16),
        _privacyNote(c),
      ],
    );
  }

  Widget _row(_Doc doc) {
    final u = _docs[doc.key];
    final NqUploadState state;
    String? meta;
    if (u?.uploading == true) {
      state = NqUploadState.uploading;
    } else if (u?.key != null) {
      state = NqUploadState.uploaded;
      meta = u?.name;
    } else {
      state = NqUploadState.requiredEmpty;
      meta = 'مطلوب';
    }
    return NqUploadRow(
      title: doc.title,
      state: state,
      meta: meta,
      progress: u?.uploading == true ? 0.5 : 0,
      onTap: () => _pick(doc),
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

  static String _mimeForExt(String? ext) {
    switch ((ext ?? '').toLowerCase()) {
      case 'pdf':
        return 'application/pdf';
      case 'png':
        return 'image/png';
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'doc':
        return 'application/msword';
      case 'docx':
        return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      case 'xlsx':
        return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      default:
        return 'application/octet-stream';
    }
  }
}
