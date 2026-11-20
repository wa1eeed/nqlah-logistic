import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/i18n/language_picker.dart';
import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';
import '../../core/widgets/nq_icon.dart';
import '../../design_system/button.dart';

/// One elegant square "browse" tile on the guest home (e.g. trucks / loads).
class GuestBrowseTile {
  const GuestBrowseTile({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  final String icon;
  final String label;
  final VoidCallback onTap;
}

/// Shown to a guest (unauthenticated visitor) on any tab or action that needs
/// an account. Explains what signing in unlocks and offers sign-in / create
/// account, plus optional "browse" shortcuts (either square [tiles] or a single
/// button) and a language switch so a guest can keep exploring.
class GuestCta extends ConsumerWidget {
  const GuestCta({
    super.key,
    required this.title,
    required this.subtitle,
    this.icon = NqIcons.userCircle,
    this.browseLabel,
    this.onBrowse,
    this.tiles = const [],
  });

  final String title;
  final String subtitle;
  final String icon;

  /// When set, a secondary "keep browsing" button is shown above sign-in.
  final String? browseLabel;
  final VoidCallback? onBrowse;

  /// Square browse tiles (shown side by side above sign-in). Takes precedence
  /// over [onBrowse] when non-empty.
  final List<GuestBrowseTile> tiles;

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
            if (tiles.isNotEmpty) ...[
              Row(
                children: [
                  for (var i = 0; i < tiles.length; i++) ...[
                    if (i > 0) const SizedBox(width: 12),
                    Expanded(child: _BrowseTile(tile: tiles[i])),
                  ],
                ],
              ),
              const SizedBox(height: 16),
            ] else if (onBrowse != null) ...[
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

/// An elegant square browse tile: a soft mint-gradient card with a brand
/// medallion icon and a label.
class _BrowseTile extends StatelessWidget {
  const _BrowseTile({required this.tile});

  final GuestBrowseTile tile;

  @override
  Widget build(BuildContext context) {
    final c = context.nq;
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: tile.onTap,
      child: AspectRatio(
        aspectRatio: 1,
        child: Container(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                c.mint.withValues(alpha: 0.14),
                c.mint.withValues(alpha: 0.04),
              ],
            ),
            borderRadius: BorderRadius.circular(NqRadius.cardOverlap),
            border: Border.all(color: c.mint.withValues(alpha: 0.18)),
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 60,
                height: 60,
                decoration: BoxDecoration(
                  color: c.mint.withValues(alpha: 0.14),
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(color: c.mint.withValues(alpha: 0.18)),
                ),
                alignment: Alignment.center,
                child: NqIcon(tile.icon, size: 30, color: c.mintTx),
              ),
              const SizedBox(height: 14),
              Text(tile.label,
                  textAlign: TextAlign.center,
                  style: NqType.bodyStrong.copyWith(color: c.tx)),
            ],
          ),
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
