import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/api_exception.dart';
import '../../core/auth/auth_controller.dart';
import '../../core/i18n/app_strings.dart';
import '../../core/i18n/language_picker.dart';
import '../../core/i18n/locale_controller.dart';
import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';
import '../../design_system/button.dart';
import '../../design_system/hero_panel.dart';
import '../../core/widgets/nq_icon.dart';
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
    final s = ref.read(stringsProvider);
    final id = _identifier.text.trim();
    final pw = _password.text;
    if (id.isEmpty || pw.isEmpty) {
      setState(() => _error = s('login.errFill'));
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
        setState(() => _error = ref.read(stringsProvider)('login.errUnexpected'));
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _otpLogin() async {
    final s = ref.read(stringsProvider);
    final id = _identifier.text.trim();
    if (id.isEmpty) {
      setState(() => _error = s('login.errPhone'));
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
      if (mounted) setState(() => _error = ref.read(stringsProvider)('login.errOtp'));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = context.nq;
    final s = ref.watch(stringsProvider);
    final lang = ref.watch(localeControllerProvider);
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
                        _langPill(lang),
                      ],
                    ),
                    const Spacer(),
                    Text(s('login.welcome'),
                        style: NqType.display.copyWith(color: NqFixed.heroText)),
                    const SizedBox(height: 6),
                    Text(s('login.subtitle'),
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
                      label: s('login.phone'),
                      phone: true,
                      controller: _identifier,
                    ),
                    const SizedBox(height: 18),
                    NqTextField(
                      label: s('login.password'),
                      obscure: true,
                      controller: _password,
                      error: _error,
                    ),
                    const SizedBox(height: 10),
                    Align(
                      alignment: AlignmentDirectional.centerStart,
                      child: GestureDetector(
                        onTap: widget.onForgot,
                        child: Text(s('login.forgot'),
                            style: NqType.labelStrong.copyWith(color: c.mintTx)),
                      ),
                    ),
                    const SizedBox(height: 20),
                    NqButton(
                      label: s('login.signIn'),
                      loading: _busy,
                      onPressed: _busy ? null : _submit,
                    ),
                    const SizedBox(height: 12),
                    NqButton(
                      label: s('login.otpLogin'),
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
                      text: s('login.noAccount'),
                      style: NqType.body.copyWith(color: c.tx2),
                      children: [
                        TextSpan(
                          text: s('login.createAccount'),
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

  /// Language chooser on the onboarding/login screen — shows the active
  /// language and opens the picker so a user whose device is in another
  /// language can pick theirs from the very first screen.
  Widget _langPill(AppLang lang) {
    final code = switch (lang) {
      AppLang.ar => 'ع',
      AppLang.en => 'EN',
      AppLang.ur => 'اُر',
    };
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: () => showLanguagePicker(context, ref),
      child: Container(
        height: 36,
        constraints: const BoxConstraints(minWidth: 36),
        padding: const EdgeInsets.symmetric(horizontal: 10),
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: NqFixed.heroFill2,
          borderRadius: BorderRadius.circular(NqRadius.pill),
        ),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          NqIcon(NqIcons.globe, size: 14, color: NqFixed.heroText),
          const SizedBox(width: 5),
          Text(code,
              style: NqType.labelStrong.copyWith(color: NqFixed.heroText)),
        ]),
      ),
    );
  }
}
