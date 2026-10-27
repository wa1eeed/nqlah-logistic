import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/api_exception.dart';
import '../../core/auth/auth_controller.dart';
import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';
import '../../design_system/button.dart';
import '../../design_system/hero_panel.dart';
import '../../design_system/logo.dart';
import '../../design_system/text_field.dart';

/// Unified login (handoff 2c). One account for customers, providers and
/// drivers. Hero + phone/password form + OTP alternative + register link.
///
/// Wired to `POST /api/auth/login`: on success the auth controller flips to
/// authenticated and the router redirects into the shell.
class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({
    super.key,
    this.onOtp,
    this.onRegister,
    this.onForgot,
  });

  final VoidCallback? onOtp;
  final VoidCallback? onRegister;
  final VoidCallback? onForgot;

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _identifier = TextEditingController();
  final _password = TextEditingController();
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _identifier.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final id = _identifier.text.trim();
    final pw = _password.text;
    if (id.isEmpty || pw.isEmpty) {
      setState(() => _error = 'أدخل رقم الجوال وكلمة المرور.');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ref.read(authControllerProvider.notifier).login(id, pw);
      // Success: the router redirect carries us into the shell.
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

  Future<void> _otpLogin() async {
    final id = _identifier.text.trim();
    if (id.isEmpty) {
      setState(() => _error = 'أدخل رقم الجوال لإرسال رمز الدخول.');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ref.read(authControllerProvider.notifier).requestLoginOtp(id);
      if (mounted) context.push('/login-otp', extra: id);
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } catch (_) {
      if (mounted) setState(() => _error = 'تعذّر إرسال الرمز. حاول مجددًا.');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = context.nq;
    return Scaffold(
      backgroundColor: c.bg,
      body: SafeArea(
        top: false,
        child: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              NqHeroPanel(
                height: 300,
                padding: const EdgeInsets.fromLTRB(24, 0, 24, 28),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    SizedBox(height: MediaQuery.of(context).padding.top + 16),
                    Row(
                      children: [
                        const NqLogoLockup(),
                        const Spacer(),
                        _langPill(),
                      ],
                    ),
                    const Spacer(),
                    Text('أهلًا بك',
                        style: NqType.display.copyWith(color: NqFixed.heroText)),
                    const SizedBox(height: 6),
                    Text('حساب واحد للعملاء والمزوّدين والسائقين',
                        style: NqType.body
                            .copyWith(color: NqFixed.heroTextSecondary)),
                  ],
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(24, 24, 24, 24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    NqTextField(
                      label: 'رقم الجوال',
                      phone: true,
                      controller: _identifier,
                    ),
                    const SizedBox(height: 18),
                    NqTextField(
                      label: 'كلمة المرور',
                      obscure: true,
                      controller: _password,
                      error: _error,
                    ),
                    const SizedBox(height: 10),
                    Align(
                      alignment: AlignmentDirectional.centerStart,
                      child: GestureDetector(
                        onTap: widget.onForgot,
                        child: Text('نسيت كلمة المرور؟',
                            style: NqType.labelStrong.copyWith(color: c.mintTx)),
                      ),
                    ),
                    const SizedBox(height: 20),
                    NqButton(
                      label: 'دخول',
                      loading: _busy,
                      onPressed: _busy ? null : _submit,
                    ),
                    const SizedBox(height: 12),
                    NqButton(
                      label: 'الدخول برمز تحقق',
                      variant: NqButtonVariant.secondary,
                      icon: 'chat-centered-dots',
                      onPressed: _busy ? null : _otpLogin,
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),
              Center(
                child: GestureDetector(
                  onTap: widget.onRegister,
                  child: Text.rich(
                    TextSpan(
                      text: 'ليس لديك حساب؟ ',
                      style: NqType.body.copyWith(color: c.tx2),
                      children: [
                        TextSpan(
                          text: 'إنشاء حساب',
                          style: NqType.bodyStrong.copyWith(color: c.mintTx),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 28),
            ],
          ),
        ),
      ),
    );
  }

  Widget _langPill() {
    return Container(
      height: 36,
      width: 36,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: NqFixed.heroFill2,
        borderRadius: BorderRadius.circular(NqRadius.pill),
      ),
      child: Text('EN',
          style: NqType.labelStrong.copyWith(color: NqFixed.heroText)),
    );
  }
}
