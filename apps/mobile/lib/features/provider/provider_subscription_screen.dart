import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/api_exception.dart';
import '../../core/subscription/subscription_repository.dart';
import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';
import '../../core/widgets/ltr.dart';
import '../../core/widgets/nq_icon.dart';

/// Provider membership / subscription (عضويتي). Shows the company's current plan
/// (tier, status, price, renewal, included trucks, modules) and lets the owner
/// change the plan or cancel. Wired to `GET /policies/subscription/mine`.
class ProviderSubscriptionScreen extends ConsumerWidget {
  const ProviderSubscriptionScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = context.nq;
    final async = ref.watch(mySubscriptionProvider);
    return Scaffold(
      backgroundColor: c.bg,
      appBar: AppBar(
        backgroundColor: c.bg,
        elevation: 0,
        centerTitle: true,
        title: Text('عضويتي والاشتراك', style: NqType.h2.copyWith(color: c.tx)),
        leading: IconButton(
          icon: NqIcon(NqIcons.arrowRight, size: 20, color: c.tx),
          onPressed: () => Navigator.of(context).maybePop(),
        ),
      ),
      body: async.when(
        loading: () => Center(
          child: SizedBox(
            width: 28,
            height: 28,
            child: CircularProgressIndicator(strokeWidth: 2.5, color: c.mintTx),
          ),
        ),
        error: (e, _) => _message(
          c,
          e is ApiException ? e.message : 'تعذّر تحميل الاشتراك.',
          onRetry: () => ref.invalidate(mySubscriptionProvider),
        ),
        data: (sub) => RefreshIndicator(
          onRefresh: () async => ref.invalidate(mySubscriptionProvider),
          child: ListView(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
            children: sub == null
                ? [_noSubscription(context, c)]
                : _subscription(context, ref, c, sub),
          ),
        ),
      ),
    );
  }

  List<Widget> _subscription(
      BuildContext context, WidgetRef ref, NqColors c, SubscriptionModel sub) {
    final plan = sub.plan;
    final st = _statusMeta(c, sub.status);
    final cycle = sub.billingCycle == 'YEARLY' ? 'سنوي' : 'شهري';
    return [
      Container(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          color: c.hero,
          borderRadius: BorderRadius.circular(NqRadius.card),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                  decoration: BoxDecoration(
                    color: st.bg,
                    borderRadius: BorderRadius.circular(NqRadius.pill),
                  ),
                  child: Text(st.label,
                      style: NqType.label.copyWith(color: st.fg, fontWeight: FontWeight.w700)),
                ),
                const Spacer(),
                Text(plan?.name ?? 'باقتي',
                    style: NqType.h1.copyWith(color: NqFixed.heroText)),
              ],
            ),
            const SizedBox(height: 14),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                Text(' ريال / $cycle',
                    style: NqType.caption.copyWith(color: NqFixed.heroText.withValues(alpha: 0.8))),
                Ltr(_money(sub.priceSnapshot),
                    style: NqType.numeric(30, FontWeight.w800)
                        .copyWith(color: NqFixed.heroText)),
              ],
            ),
          ],
        ),
      ),
      const SizedBox(height: 16),
      _infoGroup(c, [
        if (plan?.tier != null) _infoRow(c, NqIcons.sealCheck, 'الفئة', _tierLabel(plan!.tier!)),
        if (plan?.includedTruckLimit != null)
          _infoRow(c, NqIcons.truck, 'عدد الشاحنات المشمولة', '${plan!.includedTruckLimit}'),
        _infoRow(c, NqIcons.calendarBlank, 'الفوترة', cycle),
        if (sub.currentPeriodEnd != null)
          _infoRow(
            c,
            NqIcons.clock,
            sub.cancelAtPeriodEnd ? 'ينتهي في' : 'التجديد التالي',
            _fmtDate(sub.currentPeriodEnd!),
            last: true,
          ),
      ]),
      if (plan != null && plan.modules.isNotEmpty) ...[
        const SizedBox(height: 16),
        Padding(
          padding: const EdgeInsets.only(right: 4, bottom: 8),
          child: Text('الوحدات المضمّنة',
              style: NqType.caption.copyWith(color: c.tx2), textAlign: TextAlign.right),
        ),
        _infoGroup(
          c,
          [
            for (int i = 0; i < plan.modules.length; i++)
              _infoRow(c, NqIcons.checkCircle, plan.modules[i].name, '',
                  last: i == plan.modules.length - 1),
          ],
        ),
      ],
      if (sub.cancelAtPeriodEnd)
        Padding(
          padding: const EdgeInsets.only(top: 16),
          child: Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: c.warn.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(NqRadius.input),
            ),
            child: Text(
              'سيتم إيقاف التجديد، ويبقى اشتراكك فعّالاً حتى نهاية المدة الحالية.',
              style: NqType.caption.copyWith(color: c.warn),
              textAlign: TextAlign.center,
            ),
          ),
        ),
      const SizedBox(height: 24),
      _primaryButton(c, 'تغيير الباقة', () => context.push('/register/plan')),
      const SizedBox(height: 10),
      if (!sub.cancelAtPeriodEnd && sub.isActive)
        _textButton(c, 'إلغاء الاشتراك', c.err, () => _confirmCancel(context, ref, c)),
    ];
  }

  Widget _noSubscription(BuildContext context, NqColors c) => Padding(
        padding: const EdgeInsets.only(top: 60),
        child: Column(
          children: [
            NqIcon(NqIcons.sealCheck, size: 44, color: c.tx3),
            const SizedBox(height: 14),
            Text('لا يوجد اشتراك فعّال',
                style: NqType.h2.copyWith(color: c.tx), textAlign: TextAlign.center),
            const SizedBox(height: 6),
            Text('اختر باقة لتفعيل عضويتك والوصول إلى وحدات المزوّد.',
                style: NqType.body.copyWith(color: c.tx2), textAlign: TextAlign.center),
            const SizedBox(height: 24),
            _primaryButton(c, 'اختيار باقة', () => context.push('/register/plan')),
          ],
        ),
      );

  Future<void> _confirmCancel(BuildContext context, WidgetRef ref, NqColors c) async {
    final messenger = ScaffoldMessenger.of(context);
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: c.sf,
        title: Text('إلغاء الاشتراك', style: NqType.h2.copyWith(color: c.tx)),
        content: Text(
          'سيستمر اشتراكك فعّالاً حتى نهاية المدة الحالية ثم يتوقف التجديد. '
          'يمكنك إعادة الاشتراك في أي وقت.',
          style: NqType.body.copyWith(color: c.tx2),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: Text('تراجع', style: NqType.labelStrong.copyWith(color: c.tx2)),
          ),
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            child: Text('تأكيد الإلغاء', style: NqType.labelStrong.copyWith(color: c.err)),
          ),
        ],
      ),
    );
    if (ok != true) return;
    try {
      await ref.read(subscriptionRepositoryProvider).cancel();
      ref.invalidate(mySubscriptionProvider);
      messenger.showSnackBar(const SnackBar(content: Text('تم جدولة الإلغاء في نهاية المدة.')));
    } catch (e) {
      messenger.showSnackBar(SnackBar(
          content: Text(e is ApiException ? e.message : 'تعذّر إلغاء الاشتراك.')));
    }
  }

  // ── pieces ──────────────────────────────────────────────────────────────
  Widget _infoGroup(NqColors c, List<Widget> rows) => Container(
        decoration: BoxDecoration(
          color: c.sf,
          borderRadius: BorderRadius.circular(NqRadius.card),
          border: Border.all(color: c.bd),
        ),
        child: Column(children: rows),
      );

  Widget _infoRow(NqColors c, String icon, String label, String value,
      {bool last = false}) {
    return Column(
      children: [
        Container(
          height: 52,
          padding: const EdgeInsets.symmetric(horizontal: 14),
          child: Row(
            children: [
              if (value.isNotEmpty)
                Text(value, style: NqType.labelStrong.copyWith(color: c.tx)),
              const Spacer(),
              Text(label, style: NqType.body.copyWith(color: c.tx2)),
              const SizedBox(width: 12),
              NqIcon(icon, size: 20, color: c.mintTx),
            ],
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

  Widget _primaryButton(NqColors c, String label, VoidCallback onTap) => SizedBox(
        height: 52,
        child: FilledButton(
          style: FilledButton.styleFrom(
            backgroundColor: c.mint,
            foregroundColor: NqFixed.heroText,
            shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(NqRadius.input)),
          ),
          onPressed: onTap,
          child: Text(label, style: NqType.labelStrong.copyWith(color: NqFixed.heroText)),
        ),
      );

  Widget _textButton(NqColors c, String label, Color color, VoidCallback onTap) =>
      SizedBox(
        height: 48,
        child: TextButton(
          onPressed: onTap,
          child: Text(label, style: NqType.labelStrong.copyWith(color: color)),
        ),
      );

  Widget _message(NqColors c, String text, {VoidCallback? onRetry}) => Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(text, style: NqType.body.copyWith(color: c.tx2), textAlign: TextAlign.center),
            if (onRetry != null) ...[
              const SizedBox(height: 12),
              TextButton(onPressed: onRetry, child: const Text('إعادة المحاولة')),
            ],
          ],
        ),
      );

  ({String label, Color bg, Color fg}) _statusMeta(NqColors c, String status) {
    switch (status.toUpperCase()) {
      case 'ACTIVE':
        return (label: 'فعّال', bg: c.ok.withValues(alpha: 0.18), fg: c.ok);
      case 'TRIALING':
        return (label: 'تجريبي', bg: c.mint.withValues(alpha: 0.22), fg: c.mintTx);
      case 'PAST_DUE':
        return (label: 'متأخر الدفع', bg: c.warn.withValues(alpha: 0.18), fg: c.warn);
      case 'CANCELLED':
        return (label: 'ملغى', bg: c.err.withValues(alpha: 0.18), fg: c.err);
      case 'EXPIRED':
        return (label: 'منتهٍ', bg: c.err.withValues(alpha: 0.18), fg: c.err);
      default:
        return (label: status, bg: c.sf2, fg: c.tx2);
    }
  }

  String _tierLabel(String tier) {
    switch (tier.toUpperCase()) {
      case 'BASIC':
        return 'أساسية';
      case 'PRO':
        return 'احترافية';
      case 'ENTERPRISE':
        return 'مؤسسية';
      default:
        return tier;
    }
  }

  String _money(num v) => v == v.roundToDouble() ? v.toInt().toString() : v.toStringAsFixed(2);

  String _fmtDate(DateTime d) =>
      '${d.day.toString().padLeft(2, '0')}/${d.month.toString().padLeft(2, '0')}/${d.year}';
}
