import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/i18n/language_picker.dart';
import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';
import '../../core/widgets/nq_icon.dart';
import '../../design_system/button.dart';

/// Shown to a guest (unauthenticated visitor) on any tab or action that needs
/// an account. Explains what signing in unlocks and offers sign-in / create
/// account, plus an optional "browse" shortcut and a language switch so a guest
/// can keep exploring in their own language.
class GuestCta extends ConsumerWidget {
  const GuestCta({
    super.key,
    required this.title,
    required this.subtitle,
    this.icon = NqIcons.userCircle,
    this.browseLabel,
    this.onBrowse,
  });

  final String title;
  final String subtitle;
  final String icon;

  /// When set, a secondary "keep browsing" button is shown above sign-in.
  final String? browseLabel;
  final VoidCallback? onBrowse;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = context.nq;
    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            NqIcon(icon, size: 48, color: c.tx3),
            const SizedBox(height: 16),
            Text(title,
                style: NqType.h1.copyWith(color: c.tx),
                textAlign: TextAlign.center),
            const SizedBox(height: 8),
            Text(subtitle,
                style: NqType.body.copyWith(color: c.tx2, height: 1.5),
                textAlign: TextAlign.center),
            const SizedBox(height: 24),
            if (onBrowse != null) ...[
              NqButton(
                label: browseLabel ?? 'تصفّح',
                variant: NqButtonVariant.secondary,
                icon: NqIcons.magnifyingGlass,
                onPressed: onBrowse,
              ),
              const SizedBox(height: 12),
            ],
            NqButton(label: 'تسجيل الدخول', onPressed: () => context.push('/login')),
            const SizedBox(height: 12),
            NqButton(
              label: 'إنشاء حساب',
              variant: NqButtonVariant.secondary,
              onPressed: () => context.push('/register'),
            ),
            const SizedBox(height: 18),
            Center(
              child: GestureDetector(
                behavior: HitTestBehavior.opaque,
                onTap: () => showLanguagePicker(context, ref),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    NqIcon(NqIcons.globe, size: 16, color: c.mintTx),
                    const SizedBox(width: 6),
                    Text('تغيير اللغة',
                        style: NqType.labelStrong.copyWith(color: c.mintTx)),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Bottom sheet gate for a guest tapping an action that needs an account
/// (e.g. requesting a truck). Returns true if the user is (now) signed in.
/// For a guest it shows the sign-in prompt and returns false.
Future<void> showGuestSignInSheet(BuildContext context, {String? message}) {
  return showModalBottomSheet<void>(
    context: context,
    showDragHandle: true,
    builder: (ctx) {
      final c = ctx.nq;
      return SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(24, 8, 24, 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text('سجّل للمتابعة',
                  style: NqType.h1.copyWith(color: c.tx),
                  textAlign: TextAlign.center),
              const SizedBox(height: 8),
              Text(
                message ?? 'أنشئ حسابًا أو سجّل الدخول لإتمام هذا الإجراء.',
                style: NqType.body.copyWith(color: c.tx2, height: 1.5),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 20),
              NqButton(
                label: 'تسجيل الدخول',
                onPressed: () {
                  Navigator.of(ctx).pop();
                  ctx.push('/login');
                },
              ),
              const SizedBox(height: 12),
              NqButton(
                label: 'إنشاء حساب',
                variant: NqButtonVariant.secondary,
                onPressed: () {
                  Navigator.of(ctx).pop();
                  ctx.push('/register');
                },
              ),
            ],
          ),
        ),
      );
    },
  );
}
