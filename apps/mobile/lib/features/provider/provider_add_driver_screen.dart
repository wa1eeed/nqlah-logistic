import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_exception.dart';
import '../../core/fleet/fleet_repository.dart';
import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';
import '../../core/widgets/nq_icon.dart';
import '../../design_system/button.dart';
import '../../design_system/text_field.dart';

/// Add employed driver (handoff 3f) — invites a driver to the carrier's fleet
/// via `POST /fleet/drivers/invite`. The driver signs in to the same app and
/// sees only the trips assigned to them.
class ProviderAddDriverScreen extends ConsumerStatefulWidget {
  const ProviderAddDriverScreen({super.key, this.onInvited});

  final VoidCallback? onInvited;

  @override
  ConsumerState<ProviderAddDriverScreen> createState() =>
      _ProviderAddDriverScreenState();
}

class _ProviderAddDriverScreenState
    extends ConsumerState<ProviderAddDriverScreen> {
  final _name = TextEditingController();
  final _phone = TextEditingController();
  final _nationalId = TextEditingController();
  final _license = TextEditingController();
  DateTime? _licenseExpiry;
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _name.dispose();
    _phone.dispose();
    _nationalId.dispose();
    _license.dispose();
    super.dispose();
  }

  bool _validPhone(String p) => RegExp(r'^(\+?966|0)?5\d{8}$').hasMatch(p.trim());

  Future<void> _pickExpiry() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: DateTime(now.year + 1, now.month, now.day),
      firstDate: now,
      lastDate: DateTime(now.year + 15),
    );
    if (picked != null) setState(() => _licenseExpiry = picked);
  }

  Future<void> _invite() async {
    final name = _name.text.trim();
    final phone = _phone.text.trim();
    final license = _license.text.trim();
    if (name.length < 2) {
      setState(() => _error = 'أدخل اسم السائق الكامل.');
      return;
    }
    if (!_validPhone(phone)) {
      setState(() => _error = 'رقم الجوال السعودي غير صالح.');
      return;
    }
    if (license.isEmpty) {
      setState(() => _error = 'أدخل رقم الرخصة.');
      return;
    }
    if (_licenseExpiry == null) {
      setState(() => _error = 'حدّد تاريخ انتهاء الرخصة.');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ref.read(fleetRepositoryProvider).inviteDriver({
        'fullName': name,
        'phone': phone,
        if (_nationalId.text.trim().isNotEmpty)
          'nationalId': _nationalId.text.trim(),
        'licenseNumber': license,
        'licenseExpiry': _licenseExpiry!.toUtc().toIso8601String(),
        'licenseType': 'PRIVATE',
      });
      ref.invalidate(fleetDriversProvider);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('تم إرسال الدعوة إلى $name.')));
        (widget.onInvited ?? () {})();
        Navigator.of(context).maybePop();
      }
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } catch (_) {
      if (mounted) setState(() => _error = 'تعذّر إرسال الدعوة. حاول مجددًا.');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = context.nq;
    final expiry = _licenseExpiry;
    return Scaffold(
      backgroundColor: c.bg,
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
              child: Row(children: [
                const Spacer(),
                Text('إضافة سائق', style: NqType.h3.copyWith(color: c.tx)),
                const SizedBox(width: 12),
                GestureDetector(
                  onTap: () => Navigator.of(context).maybePop(),
                  child: NqIcon(NqIcons.arrowRight, size: 22, color: c.tx),
                ),
              ]),
            ),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 16),
                children: [
                  _infoBanner(c),
                  const SizedBox(height: 18),
                  if (_error != null) ...[
                    _errorBanner(c, _error!),
                    const SizedBox(height: 14),
                  ],
                  NqTextField(label: 'الاسم الكامل', controller: _name),
                  const SizedBox(height: 16),
                  NqTextField(
                      label: 'رقم الجوال', phone: true, controller: _phone),
                  const SizedBox(height: 16),
                  NqTextField(
                      label: 'رقم الهوية / الإقامة (اختياري)',
                      controller: _nationalId,
                      keyboardType: TextInputType.number),
                  const SizedBox(height: 16),
                  NqTextField(
                      label: 'رقم الرخصة',
                      controller: _license,
                      keyboardType: TextInputType.number),
                  const SizedBox(height: 16),
                  _label(c, 'انتهاء الرخصة'),
                  const SizedBox(height: 6),
                  GestureDetector(
                    onTap: _pickExpiry,
                    child: Container(
                      height: NqLayout.input,
                      padding: const EdgeInsets.symmetric(horizontal: 14),
                      decoration: BoxDecoration(
                        color: c.sf,
                        borderRadius: BorderRadius.circular(NqRadius.input),
                        border: Border.all(color: c.bd),
                      ),
                      child: Row(children: [
                        NqIcon(NqIcons.calendarBlank, size: 18, color: c.tx3),
                        const Spacer(),
                        Text(
                            expiry != null
                                ? '${expiry.day}/${expiry.month}/${expiry.year}'
                                : 'اختر التاريخ',
                            style: NqType.body.copyWith(
                                color: expiry != null ? c.tx : c.tx3)),
                      ]),
                    ),
                  ),
                  const SizedBox(height: 18),
                  _permissions(c),
                ],
              ),
            ),
            Container(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
              decoration: BoxDecoration(
                  color: c.sf, border: Border(top: BorderSide(color: c.bd))),
              child: NqButton(
                label: 'إرسال الدعوة',
                icon: NqIcons.paperPlaneTilt,
                loading: _busy,
                onPressed: _busy ? null : _invite,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _label(NqColors c, String t) =>
      Text(t, style: NqType.labelStrong.copyWith(color: c.tx));

  Widget _infoBanner(NqColors c) => Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
            color: c.infoBg, borderRadius: BorderRadius.circular(NqRadius.button)),
        child: Row(children: [
          NqIcon(NqIcons.info, size: 20, color: c.info),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
                'يصل للسائق رابط دعوة برسالة SMS. يدخل بنفس التطبيق ويرى الرحلات المُسندة إليه فقط.',
                style: NqType.caption.copyWith(color: c.tx2, height: 1.5),
                textAlign: TextAlign.right),
          ),
        ]),
      );

  Widget _errorBanner(NqColors c, String msg) => Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
            color: c.errBg, borderRadius: BorderRadius.circular(NqRadius.button)),
        child: Row(children: [
          NqIcon(NqIcons.warningCircle, size: 18, color: c.err),
          const SizedBox(width: 12),
          Expanded(
            child: Text(msg,
                style: NqType.caption.copyWith(color: c.err, height: 1.5),
                textAlign: TextAlign.right),
          ),
        ]),
      );

  Widget _permissions(NqColors c) {
    Widget row(String text, bool allowed) => Padding(
          padding: const EdgeInsets.symmetric(vertical: 4),
          child: Row(children: [
            const Spacer(),
            Flexible(
              child: Text(text,
                  style: NqType.caption.copyWith(color: c.tx2),
                  textAlign: TextAlign.right),
            ),
            const SizedBox(width: 8),
            NqIcon(allowed ? NqIcons.checkCircle : NqIcons.prohibit,
                fill: allowed, size: 16, color: allowed ? c.ok : c.tx3),
          ]),
        );
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: c.sf,
        borderRadius: BorderRadius.circular(NqRadius.card),
        border: Border.all(color: c.bd),
      ),
      child: Column(children: [
        row('تنفيذ الرحلات المُسندة وإثبات التسليم', true),
        row('التواصل مع المكتب والمستلم عند التوقف', true),
        row('رؤية الأسعار والمالية والسوق', false),
        row('التواصل مع العميل أو ظهور بياناته له', false),
      ]),
    );
  }
}
