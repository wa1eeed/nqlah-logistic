import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_client.dart';
import '../../core/api/api_exception.dart';
import '../../core/auth/auth_controller.dart';
import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';
import '../../core/widgets/nq_icon.dart';
import '../../design_system/button.dart';
import '../../design_system/segmented.dart';
import '../../design_system/text_field.dart';

/// Carrier payout / cash-on-delivery settings: how the carrier collects COD
/// (cash to the driver, or a bank transfer to its IBAN) and the bank details
/// shown to clients as payment instructions on a COD order.
class ProviderPayoutSettingsScreen extends ConsumerStatefulWidget {
  const ProviderPayoutSettingsScreen({super.key});

  @override
  ConsumerState<ProviderPayoutSettingsScreen> createState() =>
      _ProviderPayoutSettingsScreenState();
}

class _ProviderPayoutSettingsScreenState
    extends ConsumerState<ProviderPayoutSettingsScreen> {
  final _iban = TextEditingController();
  final _bankName = TextEditingController();
  final _accountName = TextEditingController();
  String _method = 'CASH'; // CASH | BANK_TRANSFER
  bool _loading = true;
  bool _busy = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _iban.dispose();
    _bankName.dispose();
    _accountName.dispose();
    super.dispose();
  }

  String? get _companyId => ref.read(authControllerProvider).user?.companyId;

  Future<void> _load() async {
    final id = _companyId;
    if (id == null) {
      setState(() => _loading = false);
      return;
    }
    try {
      final res = await ref.read(apiClientProvider).dio.get<dynamic>('/companies/$id');
      final data = res.data;
      final m = data is Map ? data : <String, dynamic>{};
      setState(() {
        _method = (m['codPayoutMethod'] ?? 'CASH').toString();
        _iban.text = (m['iban'] ?? '').toString();
        _bankName.text = (m['bankName'] ?? '').toString();
        _accountName.text = (m['bankAccountName'] ?? '').toString();
        _loading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _save() async {
    final id = _companyId;
    if (id == null || _busy) return;
    if (_method == 'BANK_TRANSFER' && _iban.text.trim().isEmpty) {
      setState(() => _error = 'أدخل رقم الآيبان لاستقبال التحويلات.');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ref.read(apiClientProvider).dio.put<dynamic>('/companies/$id', data: {
        'codPayoutMethod': _method,
        'iban': _iban.text.trim(),
        'bankName': _bankName.text.trim(),
        'bankAccountName': _accountName.text.trim(),
      });
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(const SnackBar(content: Text('تم حفظ إعدادات الدفع.')));
        Navigator.of(context).maybePop();
      }
    } on DioException catch (e) {
      final api = ApiException.fromDio(e);
      if (mounted) setState(() => _error = api.message);
    } catch (_) {
      if (mounted) setState(() => _error = 'تعذّر الحفظ. حاول مجددًا.');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = context.nq;
    final bank = _method == 'BANK_TRANSFER';
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
                Text('الدفع عند التسليم', style: NqType.h3.copyWith(color: c.tx)),
                const SizedBox(width: 12),
                GestureDetector(
                  onTap: () => Navigator.of(context).maybePop(),
                  child: NqIcon(NqIcons.arrowRight, size: 22, color: c.tx),
                ),
              ]),
            ),
            Expanded(
              child: _loading
                  ? Center(
                      child: SizedBox(
                        width: 28,
                        height: 28,
                        child: CircularProgressIndicator(
                            strokeWidth: 2.5, color: c.mintTx),
                      ),
                    )
                  : ListView(
                      padding: const EdgeInsets.fromLTRB(16, 16, 16, 16),
                      children: [
                        Text('كيف تستلم مبالغ الطلبات المدفوعة عند التسليم؟',
                            style: NqType.body.copyWith(color: c.tx2, height: 1.5),
                            textAlign: TextAlign.right),
                        const SizedBox(height: 14),
                        NqSegmented(
                          options: const ['كاش للسائق', 'تحويل بنكي'],
                          index: bank ? 1 : 0,
                          onChanged: (i) => setState(
                              () => _method = i == 1 ? 'BANK_TRANSFER' : 'CASH'),
                          height: 52,
                        ),
                        if (bank) ...[
                          const SizedBox(height: 18),
                          NqTextField(
                              label: 'اسم البنك', controller: _bankName),
                          const SizedBox(height: 16),
                          NqTextField(
                              label: 'اسم صاحب الحساب',
                              controller: _accountName),
                          const SizedBox(height: 16),
                          NqTextField(
                            label: 'الآيبان (IBAN)',
                            controller: _iban,
                            textAlign: TextAlign.left,
                          ),
                          const SizedBox(height: 10),
                          Row(children: [
                            NqIcon(NqIcons.info, size: 14, color: c.tx3),
                            const SizedBox(width: 6),
                            Expanded(
                              child: Text(
                                  'تظهر هذه البيانات للعميل كتعليمات دفع، ويُرفق إيصال التحويل.',
                                  style: NqType.caption.copyWith(color: c.tx3),
                                  textAlign: TextAlign.right),
                            ),
                          ]),
                        ],
                        if (_error != null) ...[
                          const SizedBox(height: 14),
                          Row(children: [
                            NqIcon(NqIcons.warningCircle, size: 16, color: c.err),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(_error!,
                                  style: NqType.caption.copyWith(color: c.err)),
                            ),
                          ]),
                        ],
                      ],
                    ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
              child: NqButton(
                label: 'حفظ',
                icon: NqIcons.checkCircle,
                loading: _busy,
                onPressed: _busy || _loading ? null : _save,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

