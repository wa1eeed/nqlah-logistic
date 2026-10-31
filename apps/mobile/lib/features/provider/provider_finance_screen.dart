import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_exception.dart';
import '../../core/finance/finance_repository.dart';
import '../../core/orders/order_models.dart';
import '../../core/platform/external_links.dart';
import '../../core/platform/format.dart';
import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';
import '../../core/widgets/currency_symbol.dart';
import '../../core/widgets/ltr.dart';
import '../../core/widgets/nq_icon.dart';
import '../../design_system/segmented.dart';

/// Provider finance (handoff 3h) — receivables, wired to `GET /invoices`.
class ProviderFinanceScreen extends ConsumerStatefulWidget {
  const ProviderFinanceScreen({super.key});

  @override
  ConsumerState<ProviderFinanceScreen> createState() =>
      _ProviderFinanceScreenState();
}

class _ProviderFinanceScreenState extends ConsumerState<ProviderFinanceScreen> {
  int _seg = 0; // 0 = due, 1 = paid
  String? _collectingId;
  String? _pdfLoadingId;

  Future<void> _openInvoicePdf(InvoiceModel inv) async {
    if (_pdfLoadingId != null) return;
    final messenger = ScaffoldMessenger.of(context);
    setState(() => _pdfLoadingId = inv.id);
    try {
      final url = await ref.read(financeRepositoryProvider).invoicePdfUrl(inv.id);
      final ok = await ExternalLinks.openUrl(url);
      if (!ok) {
        messenger.showSnackBar(
            const SnackBar(content: Text('تعذّر فتح الفاتورة.')));
      }
    } on ApiException catch (e) {
      messenger.showSnackBar(SnackBar(content: Text(e.message)));
    } catch (_) {
      messenger.showSnackBar(
          const SnackBar(content: Text('تعذّر فتح الفاتورة. حاول مجددًا.')));
    } finally {
      if (mounted) setState(() => _pdfLoadingId = null);
    }
  }

  Future<void> _collect(PaymentModel p) async {
    final messenger = ScaffoldMessenger.of(context);
    setState(() => _collectingId = p.id);
    try {
      await ref.read(financeRepositoryProvider).collect(p.id);
      ref.invalidate(paymentsProvider);
      messenger.showSnackBar(
          const SnackBar(content: Text('تم تأكيد استلام النقد.')));
    } on ApiException catch (e) {
      messenger.showSnackBar(SnackBar(content: Text(e.message)));
    } catch (_) {
      messenger.showSnackBar(
          const SnackBar(content: Text('تعذّر تأكيد الاستلام. حاول مجددًا.')));
    } finally {
      if (mounted) setState(() => _collectingId = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = context.nq;
    final async = ref.watch(invoicesProvider);
    final codToCollect = (ref.watch(paymentsProvider).valueOrNull ?? const [])
        .where((p) => p.needsCodCollection)
        .toList();
    final all = async.valueOrNull ?? const [];
    final due = all.where((i) => i.isDue).toList();
    final paid = all.where((i) => i.isPaid).toList();
    final totalDue = due.fold<num>(0, (s, i) => s + i.totalAmount);
    final now = DateTime.now();
    final paidThisMonth = paid
        .where((i) =>
            i.paidAt != null &&
            i.paidAt!.year == now.year &&
            i.paidAt!.month == now.month)
        .fold<num>(0, (s, i) => s + i.totalAmount);

    return SafeArea(
      top: false,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _hero(context, c, totalDue, due.length, paidThisMonth),
          const SizedBox(height: 16),
          if (codToCollect.isNotEmpty) ...[
            _codSection(c, codToCollect),
            const SizedBox(height: 16),
          ],
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: NqSegmented(
              options: ['مستحقة ${due.length}', 'مدفوعة ${paid.length}'],
              index: _seg,
              onChanged: (i) => setState(() => _seg = i),
            ),
          ),
          const SizedBox(height: 14),
          Expanded(
            child: RefreshIndicator(
              onRefresh: () {
                ref.invalidate(paymentsProvider);
                return ref.refresh(invoicesProvider.future);
              },
              color: c.mintTx,
              child: async.when(
                loading: () => _centered(_loader(c)),
                error: (e, _) => _centered(_errorState(
                    c,
                    e is ApiException ? e.message : 'تعذّر تحميل الفواتير.',
                    () => ref.invalidate(invoicesProvider))),
                data: (_) => _list(c, _seg == 0 ? due : paid),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _codSection(NqColors c, List<PaymentModel> items) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: c.warnBg,
          borderRadius: BorderRadius.circular(NqRadius.card),
          border: Border.all(color: c.warn.withValues(alpha: 0.4)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text('نقد عند التسليم بانتظار التأكيد',
                      style: NqType.labelStrong.copyWith(color: c.tx),
                      textAlign: TextAlign.right),
                ),
                const SizedBox(width: 8),
                NqIcon(NqIcons.handCoins, size: 18, color: c.warn),
              ],
            ),
            const SizedBox(height: 10),
            for (var i = 0; i < items.length; i++) ...[
              if (i > 0) Divider(color: c.bd, height: 18),
              _codRow(c, items[i]),
            ],
          ],
        ),
      ),
    );
  }

  Widget _codRow(NqColors c, PaymentModel p) {
    final busy = _collectingId == p.id;
    final amount = p.dueOnDelivery > 0 ? p.dueOnDelivery : p.totalAmount;
    return Row(
      children: [
        SizedBox(
          height: 36,
          child: TextButton(
            onPressed: busy ? null : () => _collect(p),
            style: TextButton.styleFrom(
              backgroundColor: c.mint,
              foregroundColor: c.onMint,
              padding: const EdgeInsets.symmetric(horizontal: 14),
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(NqRadius.pill)),
            ),
            child: Text(busy ? '...' : 'تأكيد الاستلام',
                style: NqType.labelStrong.copyWith(color: c.onMint)),
          ),
        ),
        const Spacer(),
        Column(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Row(mainAxisSize: MainAxisSize.min, children: [
              Ltr(money(amount),
                  style: NqType.price(size: 16).copyWith(color: c.tx)),
              const SizedBox(width: 3),
              CurrencySymbol( style: NqType.caption.copyWith(color: c.tx2)),
            ]),
            if (p.orderNumber != null) ...[
              const SizedBox(height: 2),
              Text(p.orderNumber!,
                  style: NqType.caption.copyWith(color: c.tx2)),
            ],
          ],
        ),
      ],
    );
  }

  Widget _list(NqColors c, List<InvoiceModel> items) {
    if (items.isEmpty) {
      return _centered(Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          NqIcon(NqIcons.wallet, size: 40, color: c.tx3),
          const SizedBox(height: 12),
          Text(_seg == 0 ? 'لا مستحقات' : 'لا مدفوعات',
              style: NqType.h3.copyWith(color: c.tx2)),
        ],
      ));
    }
    return ListView.separated(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
      itemCount: items.length,
      separatorBuilder: (_, _) => const SizedBox(height: 12),
      itemBuilder: (_, i) => _invoiceCard(c, items[i]),
    );
  }

  Widget _invoiceCard(NqColors c, InvoiceModel inv) {
    final party = inv.receiverName ?? inv.issuerName ?? 'فاتورة';
    final (statusLabel, statusColor) = switch (inv.status.toUpperCase()) {
      'PAID' => ('مدفوعة', c.ok),
      'OVERDUE' => ('متأخرة', c.err),
      'ISSUED' => ('مستحقة', c.info),
      'DRAFT' => ('مسودة', c.tx2),
      'CANCELLED' => ('ملغاة', c.tx3),
      _ => (inv.status, c.tx2),
    };
    final sub = [
      if (inv.orderNumber != null) inv.orderNumber!,
      if (inv.paidAt != null)
        'سُددت ${fmtDate(inv.paidAt)}'
      else if (inv.dueDate != null)
        'تستحق ${fmtDate(inv.dueDate)}',
    ].join(' · ');
    return GestureDetector(
      onTap: () => _openInvoicePdf(inv),
      behavior: HitTestBehavior.opaque,
      child: Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: c.sf,
        borderRadius: BorderRadius.circular(NqRadius.card),
        border: Border.all(color: c.bd),
      ),
      child: Row(
        children: [
          SizedBox(
            width: 34,
            child: _pdfLoadingId == inv.id
                ? const SizedBox(
                    width: 18, height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2))
                : NqIcon(NqIcons.fileText, size: 22, color: c.mintTx),
          ),
          const SizedBox(width: 6),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(children: [
                Ltr(money(inv.totalAmount),
                    style: NqType.price(size: 18).copyWith(color: c.tx)),
                const SizedBox(width: 3),
                CurrencySymbol( style: NqType.caption.copyWith(color: c.tx2)),
              ]),
              const SizedBox(height: 6),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                    color: statusColor.withValues(alpha: 0.14),
                    borderRadius: BorderRadius.circular(NqRadius.pill)),
                child: Text(statusLabel,
                    style: NqType.caption.copyWith(
                        color: statusColor, fontWeight: FontWeight.w700)),
              ),
            ],
          ),
          const Spacer(),
          Flexible(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(party,
                    style: NqType.bodyStrong.copyWith(color: c.tx),
                    textAlign: TextAlign.right,
                    overflow: TextOverflow.ellipsis),
                if (sub.isNotEmpty) ...[
                  const SizedBox(height: 2),
                  Text(sub,
                      style: NqType.caption.copyWith(color: c.tx2),
                      textAlign: TextAlign.right,
                      overflow: TextOverflow.ellipsis),
                ],
              ],
            ),
          ),
        ],
      ),
      ),
    );
  }

  Widget _hero(BuildContext context, NqColors c, num totalDue, int dueCount,
          num paidThisMonth) =>
      Container(
        color: c.hero,
        padding: EdgeInsets.fromLTRB(
            16, MediaQuery.of(context).padding.top + 12, 16, 20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Row(
              children: [
                const Spacer(),
                Text('المالية',
                    style: NqType.h1.copyWith(color: NqFixed.heroText)),
              ],
            ),
            const SizedBox(height: 12),
            Text('مستحقات لدى العملاء',
                style: NqType.body.copyWith(color: NqFixed.heroTextSecondary)),
            const SizedBox(height: 4),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                Flexible(
                  child: FittedBox(
                    fit: BoxFit.scaleDown,
                    alignment: AlignmentDirectional.centerStart,
                    child: Ltr(money(totalDue),
                        style: NqType.price(size: 30)
                            .copyWith(color: NqFixed.heroText)),
                  ),
                ),
                const SizedBox(width: 4),
                CurrencySymbol(
                    style:
                        NqType.h3.copyWith(color: NqFixed.heroTextSecondary)),
              ],
            ),
            const SizedBox(height: 14),
            Row(
              children: [
                _heroTile(c, count(dueCount), 'فواتير مستحقة'),
                const SizedBox(width: 12),
                _heroTile(c, money(paidThisMonth, decimals: 0),
                    'مستلمة هذا الشهر'),
              ],
            ),
          ],
        ),
      );

  Widget _heroTile(NqColors c, String value, String label) => Expanded(
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: NqFixed.heroFill1,
            borderRadius: BorderRadius.circular(NqRadius.button),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              FittedBox(
                fit: BoxFit.scaleDown,
                alignment: AlignmentDirectional.centerStart,
                child: Ltr(value,
                    style: NqType.numeric(22, FontWeight.w700)
                        .copyWith(color: NqFixed.heroText)),
              ),
              const SizedBox(height: 2),
              Text(label,
                  style: NqType.caption
                      .copyWith(color: NqFixed.heroTextSecondary),
                  textAlign: TextAlign.right),
            ],
          ),
        ),
      );

  Widget _centered(Widget child) => ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        children: [SizedBox(height: 360, child: Center(child: child))],
      );

  Widget _loader(NqColors c) => SizedBox(
        width: 30,
        height: 30,
        child: CircularProgressIndicator(strokeWidth: 2.5, color: c.mintTx),
      );

  Widget _errorState(NqColors c, String msg, VoidCallback onRetry) => Padding(
        padding: const EdgeInsets.symmetric(horizontal: 32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            NqIcon(NqIcons.warningCircle, size: 40, color: c.err),
            const SizedBox(height: 12),
            Text(msg,
                style: NqType.body.copyWith(color: c.tx2),
                textAlign: TextAlign.center),
            const SizedBox(height: 16),
            GestureDetector(
              onTap: onRetry,
              child: Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                decoration: BoxDecoration(
                    color: c.mintBg,
                    borderRadius: BorderRadius.circular(NqRadius.pill)),
                child: Text('إعادة المحاولة',
                    style: NqType.labelStrong.copyWith(color: c.mintTx)),
              ),
            ),
          ],
        ),
      );
}
