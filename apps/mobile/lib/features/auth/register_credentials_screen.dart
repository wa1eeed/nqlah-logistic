import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/auth/registration_controller.dart';
import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';
import '../../core/widgets/nq_icon.dart';
import '../../design_system/form_fields.dart';
import '../../design_system/text_field.dart';
import 'wizard_scaffold.dart';

/// Register step 1 — login credentials + identity. Collects the fields the API
/// requires that the design wizard omits (name, phone, password, company name).
/// A single consent gates the step (recorded as terms + privacy + transport).
class RegisterCredentialsScreen extends ConsumerStatefulWidget {
  const RegisterCredentialsScreen({super.key, this.onNext});

  final VoidCallback? onNext;

  @override
  ConsumerState<RegisterCredentialsScreen> createState() =>
      _RegisterCredentialsScreenState();
}

class _RegisterCredentialsScreenState
    extends ConsumerState<RegisterCredentialsScreen> {
  late final TextEditingController _first;
  late final TextEditingController _last;
  late final TextEditingController _phone;
  late final TextEditingController _email;
  late final TextEditingController _company;
  late final TextEditingController _password;

  bool _accepted = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    final d = ref.read(registrationControllerProvider);
    _first = TextEditingController(text: d.firstName);
    _last = TextEditingController(text: d.lastName);
    _phone = TextEditingController(text: d.phone);
    _email = TextEditingController(text: d.email);
    _company = TextEditingController(text: d.companyNameAr);
    _password = TextEditingController(text: d.password);
    _accepted = d.acceptedTerms;
  }

  @override
  void dispose() {
    _first.dispose();
    _last.dispose();
    _phone.dispose();
    _email.dispose();
    _company.dispose();
    _password.dispose();
    super.dispose();
  }

  bool _validPassword(String p) =>
      p.length >= 8 &&
      RegExp(r'[A-Z]').hasMatch(p) &&
      RegExp(r'[a-z]').hasMatch(p) &&
      RegExp(r'\d').hasMatch(p);

  bool _validPhone(String p) => RegExp(r'^(\+?966|0)?5\d{8}$').hasMatch(p.trim());

  void _next() {
    final first = _first.text.trim();
    final last = _last.text.trim();
    final company = _company.text.trim();
    final phone = _phone.text.trim();
    final password = _password.text;
    if (first.length < 2 || last.length < 2) {
      setState(() => _error = 'أدخل الاسم الأول والأخير.');
      return;
    }
    if (!_validPhone(phone)) {
      setState(() => _error = 'رقم الجوال السعودي غير صالح.');
      return;
    }
    if (company.length < 2) {
      setState(() => _error = 'أدخل اسم المنشأة.');
      return;
    }
    if (!_validPassword(password)) {
      setState(() => _error =
          'كلمة المرور: 8 أحرف على الأقل، مع حرف كبير وصغير ورقم.');
      return;
    }
    if (!_accepted) {
      setState(() => _error = 'يجب الموافقة على الشروط وسياسة الخصوصية.');
      return;
    }
    ref.read(registrationControllerProvider.notifier).patch((d) => d.copyWith(
          firstName: first,
          lastName: last,
          phone: phone,
          email: _email.text.trim(),
          password: password,
          companyNameAr: company,
          acceptedTerms: true,
        ));
    (widget.onNext ?? () {})();
  }

  @override
  Widget build(BuildContext context) {
    final c = context.nq;
    final carrier = ref.watch(registrationControllerProvider).isCarrier;
    return WizardScaffold(
      step: 1,
      totalSteps: carrier ? 5 : 4,
      nextLabel: 'التالي: نوع الحساب',
      nextIcon: NqIcons.arrowLeft,
      title: 'إنشاء حساب',
      subtitle: 'بياناتك الأساسية وكلمة المرور',
      onNext: _next,
      children: [
        Row(
          children: [
            Expanded(
              child: NqTextField(label: 'الاسم الأول', controller: _first),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: NqTextField(label: 'الاسم الأخير', controller: _last),
            ),
          ],
        ),
        const SizedBox(height: 18),
        NqTextField(label: 'رقم الجوال', phone: true, controller: _phone),
        const SizedBox(height: 18),
        NqTextField(
          label: 'البريد الإلكتروني (اختياري)',
          controller: _email,
          keyboardType: TextInputType.emailAddress,
          textAlign: TextAlign.left,
        ),
        const SizedBox(height: 18),
        NqTextField(label: 'اسم المنشأة', controller: _company),
        const SizedBox(height: 18),
        NqTextField(
          label: 'كلمة المرور',
          obscure: true,
          controller: _password,
          error: _error,
        ),
        const SizedBox(height: 8),
        Row(
          children: [
            NqIcon(NqIcons.info, size: 14, color: c.tx3),
            const SizedBox(width: 6),
            Expanded(
              child: Text('8 أحرف على الأقل، مع حرف كبير وصغير ورقم.',
                  style: NqType.caption.copyWith(color: c.tx3),
                  textAlign: TextAlign.right),
            ),
          ],
        ),
        const SizedBox(height: 18),
        NqCheckbox(
          value: _accepted,
          onChanged: (v) => setState(() => _accepted = v),
          label: 'أوافق على شروط الاستخدام وسياسة الخصوصية وشروط النقل',
        ),
      ],
    );
  }
}
