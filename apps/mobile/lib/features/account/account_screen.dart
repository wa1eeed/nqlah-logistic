import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../shell/app_shell.dart' show requestedShellTabProvider;
import 'package:url_launcher/url_launcher.dart';

import '../../core/auth/auth_controller.dart';
import '../../core/i18n/app_strings.dart';
import '../../core/i18n/language_picker.dart';
import '../../core/i18n/locale_controller.dart';
import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';
import '../../core/widgets/ltr.dart';
import '../../core/widgets/nq_icon.dart';

/// Role-aware account screen (حسابي) for the provider / owner-driver / employed
/// driver shells, wired to the signed-in user. Customers keep their own variant.
class AccountScreen extends ConsumerWidget {
  const AccountScreen({super.key, this.showBack = false});

  /// When shown as a pushed route (not a shell tab) we render a back button
  /// in the header. As a tab this stays false.
  final bool showBack;

  static const _supportPhone =
      String.fromEnvironment('NQ_SUPPORT_PHONE', defaultValue: '+966920000000');

  Future<void> _contactSupport() async {
    final digits = _supportPhone.replaceAll(RegExp(r'[^0-9]'), '');
    final wa = Uri.parse('https://wa.me/$digits');
    if (await canLaunchUrl(wa)) {
      await launchUrl(wa, mode: LaunchMode.externalApplication);
    } else {
      final tel = Uri.parse('tel:$_supportPhone');
      if (await canLaunchUrl(tel)) {
        await launchUrl(tel, mode: LaunchMode.externalApplication);
      }
    }
  }

  Future<void> _signOut(BuildContext context, WidgetRef ref) async {
    final c = context.nq;
    final s = ref.read(stringsProvider);
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: c.sf,
        title: Text(s('account.signOutTitle'), style: NqType.h2.copyWith(color: c.tx)),
        content: Text(s('account.signOutBody'),
            style: NqType.body.copyWith(color: c.tx2)),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child:
                Text(s('common.cancel'), style: NqType.labelStrong.copyWith(color: c.tx2)),
          ),
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            child:
                Text(s('account.exit'), style: NqType.labelStrong.copyWith(color: c.err)),
          ),
        ],
      ),
    );
    if (confirmed == true) {
      await ref.read(authControllerProvider.notifier).logout();
    }
  }

  String _roleLabel(S s, String role) {
    final r = role.toUpperCase();
    if (r == 'DRIVER') return s('role.driver');
    if (r.startsWith('CARRIER')) return s('role.carrier');
    if (r.startsWith('CLIENT')) return s('role.client');
    return s('role.user');
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = context.nq;
    final s = ref.watch(stringsProvider);
    final lang = ref.watch(localeControllerProvider);
    final user = ref.watch(authControllerProvider).user;
    final name =
        (user?.fullName.isNotEmpty ?? false) ? user!.fullName : s('account.defaultName');
    final role = user?.role.toUpperCase() ?? '';
    final isDriver = role == 'DRIVER';
    final isCarrier = role.startsWith('CARRIER');
    return Material(
      color: c.bg,
      child: SafeArea(
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
        children: [
          Row(children: [
            if (showBack)
              GestureDetector(
                behavior: HitTestBehavior.opaque,
                onTap: () => Navigator.of(context).maybePop(),
                child: NqIcon(NqIcons.caretRight, size: 22, color: c.tx2),
              ),
            const Spacer(),
            Text(s('account.title'), style: NqType.h1.copyWith(color: c.tx)),
          ]),
          const SizedBox(height: 16),
          _profileCard(c, name, _roleLabel(s, user?.role ?? ''), user?.phone),
          const SizedBox(height: 16),
          // Provider (carrier) management as a labelled card hub so the key
          // sections read as sections, not buried rows.
          if (isCarrier) ...[
            _hubGrid(c, [
              (NqIcons.sealCheck, s('account.membership'),
                  () => context.push('/subscription')),
              (NqIcons.wrench, s('account.maintenance'),
                  () => context.push('/maintenance-hub')),
              (NqIcons.handCoins, s('account.cod'),
                  () => context.push('/payout-settings')),
              (NqIcons.fileText, s('account.docs'), () => context.push('/kyc')),
            ]),
            const SizedBox(height: 16),
          ],
          _group(c, [
            _row(c, NqIcons.bell, s('account.notifications'),
                onTap: () => context.push('/notifications')),
            if (isDriver)
              _row(c, NqIcons.path, s('account.myTrips'),
                  onTap: () => context.go('/app'))
            else
              _row(c, NqIcons.truck, s('account.fleet'), onTap: () {
                // Land on the Fleet tab (provider tab 3), not Home.
                ref.read(requestedShellTabProvider.notifier).state = 3;
                context.go('/app');
              }),
            _row(c, NqIcons.globe, s('account.language'),
                value: lang.nativeName,
                onTap: () => showLanguagePicker(context, ref)),
            _row(c, NqIcons.moon, s('account.appearance'),
                value: s('account.appearanceAuto'), last: true),
          ]),
          const SizedBox(height: 16),
          _group(c, [
            _row(c, NqIcons.question, s('account.help'), onTap: _contactSupport),
            _row(c, NqIcons.trash, s('account.deleteAccount'),
                danger: true,
                onTap: () => context.push('/account/delete')),
            _row(c, NqIcons.signOut, s('account.signOut'),
                danger: true,
                chevron: false,
                last: true,
                onTap: () => _signOut(context, ref)),
          ]),
        ],
      ),
      ),
    );
  }

  /// A 2-column grid of labelled shortcut cards — the account "hub".
  Widget _hubGrid(NqColors c, List<(String, String, VoidCallback)> items) {
    final rows = <Widget>[];
    for (var i = 0; i < items.length; i += 2) {
      final a = items[i];
      rows.add(Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Expanded(child: _hubCard(c, a.$1, a.$2, a.$3)),
          const SizedBox(width: 12),
          if (i + 1 < items.length)
            Expanded(
                child: _hubCard(
                    c, items[i + 1].$1, items[i + 1].$2, items[i + 1].$3))
          else
            const Expanded(child: SizedBox()),
        ],
      ));
      if (i + 2 < items.length) rows.add(const SizedBox(height: 12));
    }
    return Column(children: rows);
  }

  Widget _hubCard(NqColors c, String icon, String label, VoidCallback onTap) =>
      GestureDetector(
        onTap: onTap,
        behavior: HitTestBehavior.opaque,
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: c.sf,
            borderRadius: BorderRadius.circular(NqRadius.card),
            border: Border.all(color: c.bd),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Container(
                width: 42,
                height: 42,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                    color: c.mintBg, borderRadius: BorderRadius.circular(12)),
                child: NqIcon(icon, size: 22, color: c.mintTx),
              ),
              const SizedBox(height: 10),
              Text(label,
                  style: NqType.bodyStrong.copyWith(color: c.tx),
                  textAlign: TextAlign.right),
            ],
          ),
        ),
      );

  Widget _profileCard(NqColors c, String name, String role, String? phone) =>
      Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: c.sf,
          borderRadius: BorderRadius.circular(NqRadius.card),
          border: Border.all(color: c.bd),
        ),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: [
                      NqIcon(NqIcons.sealCheck,
                          fill: true, size: 18, color: c.mintTx),
                      const SizedBox(width: 6),
                      Flexible(
                        child: Text(name,
                            style: NqType.h2.copyWith(color: c.tx),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            textAlign: TextAlign.right),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(role, style: NqType.caption.copyWith(color: c.tx2)),
                  if (phone != null && phone.isNotEmpty) ...[
                    const SizedBox(height: 2),
                    Ltr(phone,
                        style: NqType.numeric(12, FontWeight.w400)
                            .copyWith(color: c.tx2)),
                  ],
                ],
              ),
            ),
            const SizedBox(width: 14),
            Container(
              width: 56,
              height: 56,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: c.hero,
                borderRadius: BorderRadius.circular(NqRadius.card),
              ),
              child: Text(name.isNotEmpty ? name.characters.first : 'ح',
                  style: NqType.h1.copyWith(color: NqFixed.heroText)),
            ),
          ],
        ),
      );

  Widget _group(NqColors c, List<Widget> rows) => Container(
        decoration: BoxDecoration(
          color: c.sf,
          borderRadius: BorderRadius.circular(NqRadius.card),
          border: Border.all(color: c.bd),
        ),
        child: Column(children: rows),
      );

  Widget _row(NqColors c, String icon, String label,
      {String? value,
      bool danger = false,
      bool chevron = true,
      bool last = false,
      VoidCallback? onTap}) {
    final color = danger ? c.err : c.tx;
    return Column(
      children: [
        GestureDetector(
          onTap: onTap,
          behavior: HitTestBehavior.opaque,
          child: Container(
            height: 54,
            padding: const EdgeInsets.symmetric(horizontal: 14),
            child: Row(
              children: [
                if (chevron) NqIcon(NqIcons.caretLeft, size: 16, color: c.tx3),
                if (value != null) ...[
                  const SizedBox(width: 8),
                  Text(value, style: NqType.label.copyWith(color: c.tx2)),
                ],
                const Spacer(),
                Text(label,
                    style: NqType.body.copyWith(
                        color: color,
                        fontWeight:
                            danger ? FontWeight.w700 : FontWeight.w400)),
                const SizedBox(width: 12),
                NqIcon(icon, size: 21, color: danger ? c.err : c.tx2),
              ],
            ),
          ),
        ),
        if (!last)
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 14),
            child: Divider(color: c.bd, height: 1),
          ),
      ],
    );
  }
}
