import 'package:flutter/material.dart';

import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';
import '../../design_system/button.dart';
import '../../design_system/hero_panel.dart';
import '../../design_system/logo.dart';
import '../../design_system/text_field.dart';

/// Unified login (handoff 2c). One account for customers, providers and
/// drivers. Hero + phone/password form + OTP alternative + register link.
class LoginScreen extends StatelessWidget {
  const LoginScreen({
    super.key,
    this.onLogin,
    this.onOtp,
    this.onRegister,
    this.onForgot,
  });

  final VoidCallback? onLogin;
  final VoidCallback? onOtp;
  final VoidCallback? onRegister;
  final VoidCallback? onForgot;

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
                    const NqTextField(label: 'رقم الجوال', phone: true),
                    const SizedBox(height: 18),
                    const NqTextField(
                        label: 'كلمة المرور', obscure: true),
                    const SizedBox(height: 10),
                    Align(
                      alignment: AlignmentDirectional.centerStart,
                      child: GestureDetector(
                        onTap: onForgot,
                        child: Text('نسيت كلمة المرور؟',
                            style: NqType.labelStrong.copyWith(color: c.mintTx)),
                      ),
                    ),
                    const SizedBox(height: 20),
                    NqButton(label: 'دخول', onPressed: onLogin ?? () {}),
                    const SizedBox(height: 12),
                    NqButton(
                      label: 'الدخول برمز تحقق',
                      variant: NqButtonVariant.secondary,
                      icon: 'chat-centered-dots',
                      onPressed: onOtp ?? () {},
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),
              Center(
                child: GestureDetector(
                  onTap: onRegister,
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
