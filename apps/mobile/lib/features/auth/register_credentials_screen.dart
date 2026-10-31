import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:dio/dio.dart';

import '../../core/api/api_client.dart';
import '../../core/auth/registration_controller.dart';
import '../../core/platform/countries.dart';
import '../../core/platform/geo.dart';
import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';
import '../../core/widgets/nq_icon.dart';
import '../../design_system/form_fields.dart';
import '../../design_system/phone_field.dart';
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
  String? _phoneErr;
  String? _emailErr;
  bool _checking = false;
  late Country _country;

  @override
  void initState() {
    super.initState();
    final d = ref.read(registrationControllerProvider);
    _first = TextEditingController(text: d.firstName);
    _last = TextEditingController(text: d.lastName);
    // Phone is stored full-international; show just the local part in the field.
    _country = countryByCode(d.countryCode);
    _phone = TextEditingController(text: _localPart(d.phone, _country));
    _email = TextEditingController(text: d.email);
    _company = TextEditingController(text: d.companyNameAr);
    _password = TextEditingController(text: d.password);
    _accepted = d.acceptedTerms;
    // Pre-select the country from the caller's IP when they haven't entered a
    // number yet (first visit).
    if (d.phone.isEmpty) {
      ref.read(geoCountryProvider.future).then((cc) {
        if (mounted && _phone.text.isEmpty) setState(() => _country = cc);
      });
    }
  }

  /// The local digits of [full] once [c]'s dial code is stripped.
  String _localPart(String full, Country c) {
    var s = full.trim();
    if (s.startsWith(c.dial)) s = s.substring(c.dial.length);
    return s.replaceAll(RegExp(r'\D'), '');
  }

  /// Compose the full E.164 number from the selected country + local digits.
  String _composePhone() {
    var digits = _phone.text.trim().replaceAll(RegExp(r'\D'), '');
    digits = digits.replaceFirst(RegExp(r'^0+'), '');
    final dialDigits = _country.dial.replaceAll('+', '');
    if (digits.startsWith(dialDigits)) digits = digits.substring(dialDigits.length);
    return '${_country.dial}$digits';
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

  /// Valid for the selected country: Saudi keeps the strict 5XXXXXXXX rule;
  /// other countries just require a plausible number length.
  bool _validPhone() {
    final digits = _phone.text.trim().replaceAll(RegExp(r'\D'), '');
    if (_country.code == 'SA') {
      return RegExp(r'^(966|0)?5\d{8}$').hasMatch(digits);
    }
    return digits.replaceFirst(RegExp(r'^0+'), '').length >= 6;
  }

  Future<void> _next() async {
    if (_checking) return;
    final first = _first.text.trim();
    final last = _last.text.trim();
    final company = _company.text.trim();
    final password = _password.text;
    setState(() {
      _error = null;
      _phoneErr = null;
      _emailErr = null;
    });
    if (first.length < 2 || last.length < 2) {
      setState(() => _error = 'أدخل الاسم الأول والأخير.');
      return;
    }
    if (!_validPhone()) {
      setState(() => _phoneErr = _country.code == 'SA'
          ? 'رقم الجوال السعودي غير صالح.'
          : 'رقم الجوال غير صالح.');
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
    final fullPhone = _composePhone();
    final email = _email.text.trim();
    // Pre-check availability so a taken phone/email is flagged here, not after
    // the whole wizard.
    setState(() => _checking = true);
    try {
      final res = await ref.read(apiClientProvider).dio.get<dynamic>(
            '/auth/check-availability',
            queryParameters: {
              'phone': fullPhone,
              if (email.isNotEmpty) 'email': email,
            },
            options: Options(extra: {'noAuth': true}),
          );
      final data = res.data;
      if (data is Map) {
        if (data['phoneTaken'] == true) {
          setState(() => _phoneErr = 'رقم الجوال مسجّل مسبقاً. سجّل الدخول بدلاً من ذلك.');
          return;
        }
        if (data['emailTaken'] == true) {
          setState(() => _emailErr = 'البريد الإلكتروني مسجّل مسبقاً. سجّل الدخول بدلاً من ذلك.');
          return;
        }
      }
    } catch (_) {
      // Availability check is best-effort; a network error won't block signup —
      // the final register POST still enforces uniqueness.
    } finally {
      if (mounted) setState(() => _checking = false);
    }
    if (!mounted) return;
    ref.read(registrationControllerProvider.notifier).patch((d) => d.copyWith(
          firstName: first,
          lastName: last,
          phone: fullPhone,
          countryCode: _country.code,
          email: email,
          password: password,
          companyNameAr: company,
          acceptedTerms: true,
        ));
    (widget.onNext ?? () {})();
  }

  @override
  Widget build(BuildContext context) {
    final c = context.nq;
    return WizardScaffold(
      step: 1,
      totalSteps: ref.watch(registrationControllerProvider).totalSteps,
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
        NqPhoneField(
          label: 'رقم الجوال',
          controller: _phone,
          country: _country,
          onCountryChanged: (cc) => setState(() => _country = cc),
          error: _phoneErr,
          onChanged: (_) {
            if (_phoneErr != null) setState(() => _phoneErr = null);
          },
        ),
        const SizedBox(height: 18),
        NqTextField(
          label: 'البريد الإلكتروني (اختياري)',
          controller: _email,
          keyboardType: TextInputType.emailAddress,
          textAlign: TextAlign.left,
          error: _emailErr,
          onChanged: (_) {
            if (_emailErr != null) setState(() => _emailErr = null);
          },
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
