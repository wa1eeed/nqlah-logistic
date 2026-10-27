import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/auth/auth_controller.dart';
import '../../core/platform/external_links.dart';
import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';
import '../../core/widgets/ltr.dart';
import '../../core/widgets/nq_icon.dart';

/// Customer account (handoff 5c — customer variant: no plan card).
class CustomerAccountScreen extends ConsumerWidget {
  const CustomerAccountScreen({super.key});

  Future<void> _signOut(BuildContext context, WidgetRef ref) async {
    final c = context.nq;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: c.sf,
        title: Text('تسجيل الخروج', style: NqType.h2.copyWith(color: c.tx)),
        content: Text('هل تريد تسجيل الخروج من حسابك؟',
            style: NqType.body.copyWith(color: c.tx2)),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: Text('إلغاء', style: NqType.labelStrong.copyWith(color: c.tx2)),
          ),
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            child: Text('خروج', style: NqType.labelStrong.copyWith(color: c.err)),
          ),
        ],
      ),
    );
    if (confirmed == true) {
      await ref.read(authControllerProvider.notifier).logout();
      // Router redirect returns to /login once unauthenticated.
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = context.nq;
    final user = ref.watch(authControllerProvider).user;
    return SafeArea(
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
        children: [
          Row(
            children: [
              const Spacer(),
              Text('حسابي', style: NqType.h1.copyWith(color: c.tx)),
            ],
          ),
          const SizedBox(height: 16),
          _profileCard(c, user?.fullName),
          const SizedBox(height: 16),
          _group(c, [
            _row(c, NqIcons.users, 'المستخدمون والصلاحيات', value: '3'),
            _row(c, NqIcons.fileText, 'مستندات المنشأة', value: 'سارية'),
            _row(c, NqIcons.bell, 'الإشعارات'),
            _row(c, NqIcons.globe, 'اللغة', value: 'العربية'),
            _row(c, NqIcons.moon, 'المظهر', value: 'تلقائي', last: true),
          ]),
          const SizedBox(height: 16),
          _group(c, [
            _row(c, NqIcons.question, 'المساعدة والدعم',
                onTap: () => ExternalLinks.contactSupportWhatsApp()),
            _row(c, NqIcons.signOut, 'تسجيل الخروج',
                danger: true,
                chevron: false,
                last: true,
                onTap: () => _signOut(context, ref)),
          ]),
        ],
      ),
    );
  }

  Widget _profileCard(NqColors c, String? name) => Container(
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
                      NqIcon(NqIcons.sealCheck, fill: true, size: 18, color: c.mintTx),
                      const SizedBox(width: 6),
                      Flexible(
                        child: Text('مصنع الرّواد للبلاستيك',
                            style: NqType.h2.copyWith(color: c.tx),
                            textAlign: TextAlign.right),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: [
                      Ltr('2050118472',
                          style: NqType.numeric(12, FontWeight.w400)
                              .copyWith(color: c.tx2)),
                      Text(' عميل · سجل تجاري ',
                          style: NqType.caption.copyWith(color: c.tx2)),
                    ],
                  ),
                  const SizedBox(height: 2),
                  Text(
                      '${name != null && name.isNotEmpty ? name : 'عبدالرحمن السبيعي'} · مدير الحساب',
                      style: NqType.caption.copyWith(color: c.tx2)),
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
              child: Text('م', style: NqType.h1.copyWith(color: NqFixed.heroText)),
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
              if (chevron)
                NqIcon(NqIcons.caretLeft, size: 16, color: c.tx3),
              if (value != null) ...[
                const SizedBox(width: 8),
                Text(value, style: NqType.label.copyWith(color: c.tx2)),
              ],
              const Spacer(),
              Text(label, style: NqType.body.copyWith(color: color, fontWeight: danger ? FontWeight.w700 : FontWeight.w400)),
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
