import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/account/account_repository.dart';
import '../../core/api/api_exception.dart';
import '../../core/i18n/app_strings.dart';
import '../../core/i18n/locale_controller.dart';
import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';
import '../../core/widgets/nq_icon.dart';
import '../../design_system/button.dart';
import '../../design_system/confirm_dialog.dart';
import '../../design_system/empty_state.dart';

/// Account deletion (Apple 5.1.1(v)). Real, grace-period deletion: requesting it
/// freezes the account and schedules a purge ~30 days later (cancellable). If
/// there are active orders or unpaid dues, it lists them and blocks the request
/// until they're resolved.
class AccountDeletionScreen extends ConsumerWidget {
  const AccountDeletionScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = context.nq;
    final ar = ref.watch(localeControllerProvider) != AppLang.en;
    final async = ref.watch(deletionOverviewProvider);

    return Scaffold(
      backgroundColor: c.bg,
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
              child: Row(
                children: [
                  GestureDetector(
                    behavior: HitTestBehavior.opaque,
                    onTap: () => Navigator.of(context).maybePop(),
                    child: NqIcon(NqIcons.arrowRight, size: 22, color: c.tx),
                  ),
                  const SizedBox(width: 12),
                  Text(ar ? 'حذف الحساب' : 'Delete account',
                      style: NqType.h2.copyWith(color: c.tx)),
                ],
              ),
            ),
            Expanded(
              child: async.when(
                loading: () => const Center(child: CircularProgressIndicator()),
                error: (e, _) => NqEmptyState(
                  icon: NqIcons.warningCircle,
                  title: ar ? 'تعذّر تحميل الحالة' : 'Could not load status',
                  message: ar ? 'اسحب أو أعد المحاولة' : 'Pull to refresh or retry',
                ),
                data: (o) => _body(context, ref, c, ar, o),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _body(BuildContext context, WidgetRef ref, NqColors c, bool ar,
      DeletionOverview o) {
    if (o.scheduled) return _scheduled(context, ref, c, ar, o);
    if (o.hasBlockers) return _blocked(c, ar, o);
    return _eligible(context, ref, c, ar, o);
  }

  // ── already scheduled ──────────────────────────────────────────────────
  Widget _scheduled(BuildContext context, WidgetRef ref, NqColors c, bool ar,
      DeletionOverview o) {
    final d = o.scheduledAt;
    final date = d == null ? '' : '${d.year}/${d.month}/${d.day}';
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
      children: [
        _banner(c, c.warn, NqIcons.clock,
            ar ? 'حسابك مجدوَل للحذف' : 'Your account is scheduled for deletion',
            ar
                ? 'سيُحذف حسابك وبياناتك الشخصية نهائيًا بتاريخ $date. حسابك موقوف حتى ذلك الحين، ويمكنك التراجع قبل التنفيذ.'
                : 'Your account and personal data will be permanently deleted on $date. It is frozen until then; you can cancel before it runs.'),
        const SizedBox(height: 20),
        NqButton(
          label: ar ? 'إلغاء طلب الحذف وإعادة تفعيل الحساب' : 'Cancel deletion & reactivate',
          icon: NqIcons.arrowCounterClockwise,
          onPressed: () async {
            final messenger = ScaffoldMessenger.of(context);
            try {
              await ref.read(accountRepositoryProvider).cancelDeletion();
              ref.invalidate(deletionOverviewProvider);
              messenger.showSnackBar(SnackBar(
                  content: Text(ar ? 'تم إلغاء طلب الحذف.' : 'Deletion cancelled.')));
            } catch (e) {
              messenger.showSnackBar(SnackBar(
                  content: Text(e is ApiException ? e.message : (ar ? 'تعذّر الإلغاء' : 'Failed'))));
            }
          },
        ),
      ],
    );
  }

  // ── blocked by pending items ───────────────────────────────────────────
  Widget _blocked(NqColors c, bool ar, DeletionOverview o) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
      children: [
        _banner(c, c.err, NqIcons.warningCircle,
            ar ? 'لا يمكن حذف الحساب الآن' : 'Can’t delete the account yet',
            ar
                ? 'لإتمام طلب الحذف، أنهِ أولًا المعاملات التالية:'
                : 'Resolve these first before you can request deletion:'),
        if (o.orders.isNotEmpty) ...[
          const SizedBox(height: 16),
          _sectionTitle(c, ar ? 'طلبات جارية' : 'Active orders'),
          ...o.orders.map((x) => _item(c, NqIcons.package, x.route,
              '${x.orderNumber} · ${x.status}')),
        ],
        if (o.dues.isNotEmpty) ...[
          const SizedBox(height: 16),
          _sectionTitle(c, ar ? 'مستحقات مالية' : 'Outstanding dues'),
          ...o.dues.map((x) => _item(c, NqIcons.handCoins,
              '${x.invoiceNumber} · ${x.status}', '${x.totalAmount} ﷼')),
        ],
      ],
    );
  }

  // ── eligible → confirm ─────────────────────────────────────────────────
  Widget _eligible(BuildContext context, WidgetRef ref, NqColors c, bool ar,
      DeletionOverview o) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
      children: [
        _banner(c, c.tx2, NqIcons.trash,
            ar ? 'حذف حسابك نهائيًا' : 'Delete your account',
            ar
                ? 'عند التأكيد، يُجمَّد حسابك فورًا ويُحذف نهائيًا مع بياناتك الشخصية بعد ${o.graceDays} يومًا. يمكنك التراجع خلال هذه المدة. تُحفَظ الفواتير المطلوبة نظامًا بعد إخفاء هويتك.'
                : 'On confirm, your account is frozen now and permanently deleted with your personal data after ${o.graceDays} days. You can cancel within that period. Legally-required invoices are kept after anonymizing your identity.'),
        const SizedBox(height: 20),
        NqButton(
          label: ar ? 'طلب حذف الحساب' : 'Request account deletion',
          icon: NqIcons.trash,
          variant: NqButtonVariant.destructive,
          onPressed: () async {
            final messenger = ScaffoldMessenger.of(context);
            final ok = await nqConfirm(
              context,
              title: ar ? 'تأكيد حذف الحساب' : 'Confirm account deletion',
              message: ar
                  ? 'سيُجمَّد حسابك فورًا ويُحذف نهائيًا بعد ${o.graceDays} يومًا. متابعة؟'
                  : 'Your account is frozen now and deleted after ${o.graceDays} days. Continue?',
              confirmLabel: ar ? 'نعم، احذف حسابي' : 'Yes, delete',
              danger: true,
              icon: NqIcons.trash,
            );
            if (ok != true) return;
            try {
              await ref.read(accountRepositoryProvider).requestDeletion();
              ref.invalidate(deletionOverviewProvider);
              messenger.showSnackBar(SnackBar(
                  content: Text(ar ? 'تم جدولة حذف حسابك.' : 'Account deletion scheduled.')));
            } catch (e) {
              messenger.showSnackBar(SnackBar(
                  content: Text(e is ApiException ? e.message : (ar ? 'تعذّر الطلب' : 'Failed'))));
            }
          },
        ),
      ],
    );
  }

  // ── pieces ──────────────────────────────────────────────────────────────
  Widget _banner(NqColors c, Color accent, String icon, String title, String body) =>
      Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: c.sf,
          borderRadius: BorderRadius.circular(NqRadius.card),
          border: Border.all(color: c.bd),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                NqIcon(icon, size: 20, color: accent),
                const SizedBox(width: 10),
                Expanded(
                    child: Text(title, style: NqType.bodyStrong.copyWith(color: c.tx))),
              ],
            ),
            const SizedBox(height: 8),
            Text(body, style: NqType.caption.copyWith(color: c.tx2, height: 1.5)),
          ],
        ),
      );

  Widget _sectionTitle(NqColors c, String t) => Padding(
        padding: const EdgeInsets.only(bottom: 8, right: 2),
        child: Text(t, style: NqType.labelStrong.copyWith(color: c.tx2)),
      );

  Widget _item(NqColors c, String icon, String title, String sub) => Container(
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: c.sf,
          borderRadius: BorderRadius.circular(NqRadius.input),
          border: Border.all(color: c.bd),
        ),
        child: Row(
          children: [
            NqIcon(icon, size: 18, color: c.tx3),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title,
                      style: NqType.body.copyWith(color: c.tx),
                      maxLines: 1, overflow: TextOverflow.ellipsis),
                  Text(sub, style: NqType.caption.copyWith(color: c.tx2)),
                ],
              ),
            ),
          ],
        ),
      );
}
