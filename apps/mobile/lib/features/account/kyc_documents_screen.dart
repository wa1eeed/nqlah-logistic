import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/api_exception.dart';
import '../../core/auth/auth_controller.dart';
import '../../core/kyc/kyc_repository.dart';
import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';
import '../../core/uploads/uploads_repository.dart';
import '../../core/widgets/nq_icon.dart';
import '../../design_system/upload_row.dart';

/// Post-login verification-documents (KYC) screen — reached from Account →
/// "مستندات المنشأة". Lists each required document with its review status and
/// lets the user upload/replace it. Upload goes straight to the object store
/// via a presigned PUT (purpose: `kyc`), then the key is submitted to
/// `POST /companies/:id/kyc`.
class KycDocumentsScreen extends ConsumerStatefulWidget {
  const KycDocumentsScreen({super.key});

  @override
  ConsumerState<KycDocumentsScreen> createState() => _KycDocumentsScreenState();
}

class _KycDoc {
  const _KycDoc(this.type, this.title);
  final String type;
  final String title;
}

class _KycDocumentsScreenState extends ConsumerState<KycDocumentsScreen> {
  bool _loading = true;
  String? _error;
  String? _uploadingType;
  Map<String, KycDoc> _byType = {};

  String? get _companyId => ref.read(authControllerProvider).user?.companyId;
  bool get _isCarrier =>
      (ref.read(authControllerProvider).user?.role ?? '').startsWith('CARRIER');

  List<_KycDoc> get _docs => [
        const _KycDoc('CR', 'السجل التجاري'),
        const _KycDoc('VAT', 'شهادة ضريبة القيمة المضافة'),
        if (_isCarrier) const _KycDoc('transportLicense', 'ترخيص هيئة النقل العام'),
        const _KycDoc('nationalAddress', 'العنوان الوطني'),
        if (_isCarrier) const _KycDoc('signatoryId', 'هوية المفوّض بالتوقيع'),
      ];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final id = _companyId;
    if (id == null) {
      setState(() {
        _loading = false;
        _error = 'لا توجد منشأة مرتبطة بهذا الحساب.';
      });
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final rows = await ref.read(kycRepositoryProvider).list(id);
      // Keep the latest doc per type (list is newest-first).
      final map = <String, KycDoc>{};
      for (final d in rows) {
        map.putIfAbsent(d.type, () => d);
      }
      if (mounted) setState(() => _byType = map);
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } catch (_) {
      if (mounted) setState(() => _error = 'تعذّر تحميل المستندات. حاول مجددًا.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _pick(_KycDoc doc) async {
    final id = _companyId;
    if (id == null || _uploadingType != null) return;
    try {
      final res = await FilePicker.pickFiles(type: FileType.any);
      if (res.isEmpty) return;
      final f = res.first;
      final bytes = await f.readAsBytes();
      setState(() => _uploadingType = doc.type);
      final media = await ref.read(uploadsRepositoryProvider).upload(
            bytes: bytes,
            filename: f.name,
            contentType: _mimeForExt(f.extension),
            purpose: 'kyc',
            docType: doc.type,
          );
      await ref
          .read(kycRepositoryProvider)
          .submit(id, type: doc.type, fileUrl: media.key);
      await _load();
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } catch (_) {
      if (mounted) setState(() => _error = 'تعذّر رفع الملف. حاول مجددًا.');
    } finally {
      if (mounted) setState(() => _uploadingType = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = context.nq;
    return Scaffold(
      backgroundColor: c.bg,
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _header(c),
            Expanded(
              child: _loading
                  ? const Center(child: CircularProgressIndicator())
                  : ListView(
                      padding: const EdgeInsets.fromLTRB(24, 8, 24, 24),
                      children: [
                        Text('نراجع مستنداتك خلال 24 ساعة عمل. الرفع اختياري ويمكنك إكماله لاحقًا.',
                            style: NqType.body.copyWith(color: c.tx2, height: 1.5)),
                        const SizedBox(height: 16),
                        if (_error != null) ...[
                          _banner(c, _error!),
                          const SizedBox(height: 14),
                        ],
                        for (var i = 0; i < _docs.length; i++) ...[
                          if (i > 0) const SizedBox(height: 10),
                          _row(_docs[i]),
                        ],
                      ],
                    ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _header(NqColors c) => Padding(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
        child: Row(
          children: [
            GestureDetector(
              behavior: HitTestBehavior.opaque,
              onTap: () => context.pop(),
              child: NqIcon(NqIcons.arrowRight, size: 22, color: c.tx),
            ),
            const SizedBox(width: 12),
            Text('مستندات التحقّق', style: NqType.h1.copyWith(color: c.tx)),
          ],
        ),
      );

  Widget _row(_KycDoc doc) {
    final submitted = _byType[doc.type];
    final NqUploadState state;
    String? meta;
    if (_uploadingType == doc.type) {
      state = NqUploadState.uploading;
      meta = 'جارٍ الرفع…';
    } else if (submitted == null) {
      state = NqUploadState.optionalEmpty;
      meta = 'اختياري';
    } else {
      switch (submitted.status) {
        case 'APPROVED':
          state = NqUploadState.uploaded;
          meta = 'مُعتمد';
        case 'REJECTED':
          state = NqUploadState.requiredEmpty;
          meta = submitted.notes?.isNotEmpty == true
              ? 'مرفوض — ${submitted.notes}. أعد الرفع'
              : 'مرفوض — أعد الرفع';
        default:
          state = NqUploadState.uploaded;
          meta = 'قيد المراجعة';
      }
    }
    return NqUploadRow(
      title: doc.title,
      state: state,
      meta: meta,
      progress: _uploadingType == doc.type ? 0.5 : 0,
      onTap: () => _pick(doc),
    );
  }

  Widget _banner(NqColors c, String msg) => Container(
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
                  style: NqType.caption.copyWith(color: c.err, height: 1.5)),
            ),
          ],
        ),
      );

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
