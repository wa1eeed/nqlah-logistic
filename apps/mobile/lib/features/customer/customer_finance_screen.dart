import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_exception.dart';
import '../../core/finance/finance_repository.dart';
import '../../core/orders/order_models.dart';
import '../../core/platform/external_links.dart';
import '../../core/platform/format.dart';
import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';
import '../../core/widgets/ltr.dart';
import '../../core/widgets/nq_icon.dart';
import '../../design_system/segmented.dart';

/// Customer finance (handoff 4h) — what the customer owes providers, wired to
/// `GET /invoices`. Direct-pay: report a payment, provider confirms.
class CustomerFinanceScreen extends ConsumerStatefulWidget {
  const CustomerFinanceScreen({super.key});

  @override
  ConsumerState<CustomerFinanceScreen> createState() =>
      _CustomerFinanceScreenState();
}

class _CustomerFinanceScreenState extends ConsumerState<CustomerFinanceScreen> {
  int _seg = 0; // 0 = due, 1 = paid
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

  @override
  Widget build(BuildContext context) {
    final c = context.nq;
    final async = ref.watch(invoicesProvider);
    final all = async.valueOrNull ?? const [];
    final due = all.where((i) => i.isDue).toList();
    final paid = all.where((i) => i.isPaid).toList();
    final totalDue = due.fold<num>(0, (s, i) => s + i.totalAmount);
    final heldInEscrow = (ref.watch(paymentsProvider).valueOrNull ?? const [])
        .where((p) => p.isHeld)
        .fold<num>(0, (s, p) => s + p.totalAmount);
    return Scaffold(
      backgroundColor: c.bg,
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _appBar(c),
            _heroCard(c, totalDue, due.length),
            if (heldInEscrow > 0) ...[
              const SizedBox(height: 12),
              _escrowCard(c, heldInEscrow),
            ],
            const SizedBox(height: 16),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: NqSegmented(
                options: ['بانتظار الدفع ${due.length}', 'مدفوعة ${paid.length}'],
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
      ),
    );
  }

  Widget _list(NqColors c, List<InvoiceModel> items) {
    final children = <Widget>[
      if (_seg == 0) ...[_infoNote(c), const SizedBox(height: 14)],
    ];
    if (items.isEmpty) {
      return ListView(
        padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          ...children,
          SizedBox(
            height: 240,
            child: Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  NqIcon(NqIcons.wallet, size: 40, color: c.tx3),
                  const SizedBox(height: 12),
                  Text(_seg == 0 ? 'لا فواتير مستحقة' : 'لا فواتير مدفوعة',
                      style: NqType.h3.copyWith(color: c.tx2)),
                ],
              ),
            ),
          ),
        ],
      );
    }
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
      children: [
        ...children,
        for (final inv in items) ...[
          _invoiceCard(c, inv),
          const SizedBox(height: 12),
        ],
      ],
    );
  }

  Widget _invoiceCard(NqColors c, InvoiceModel inv) {
    final provider = inv.issuerName ?? inv.receiverName ?? 'مزوّد';
    final due = inv.dueDate != null
        ? 'يستحق ${fmtDate(inv.dueDate)}'
        : (inv.paidAt != null ? 'سُدد ${fmtDate(inv.paidAt)}' : '');
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
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              SizedBox(
                width: 30,
                child: _pdfLoadingId == inv.id
                    ? const SizedBox(
                        width: 18, height: 18,
                        child: CircularProgressIndicator(strokeWidth: 2))
                    : NqIcon(NqIcons.fileText, size: 22, color: c.mintTx),
              ),
              const SizedBox(width: 4),
              Row(children: [
                Ltr(money(inv.totalAmount),
                    style: NqType.price(size: 18).copyWith(color: c.tx)),
                const SizedBox(width: 3),
                Text('ر.س', style: NqType.caption.copyWith(color: c.tx2)),
              ]),
              const Spacer(),
              Flexible(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(provider,
                        style: NqType.bodyStrong.copyWith(color: c.tx),
                        textAlign: TextAlign.right,
                        overflow: TextOverflow.ellipsis),
                    const SizedBox(height: 2),
                    Row(mainAxisSize: MainAxisSize.min, children: [
                      if (due.isNotEmpty)
                        Text('$due · ',
                            style: NqType.caption.copyWith(color: c.tx2)),
                      Ltr(inv.invoiceNumber,
                          style: NqType.code(size: 12).copyWith(color: c.tx2)),
                    ]),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
      ),
    );
  }

  Widget _appBar(NqColors c) => Padding(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
        child: Row(
          children: [
            GestureDetector(
              onTap: () => Navigator.of(context).maybePop(),
              child: NqIcon(NqIcons.arrowRight, size: 22, color: c.tx),
            ),
            const Spacer(),
            Text('المالية', style: NqType.h3.copyWith(color: c.tx)),
          ],
        ),
      );

  Widget _heroCard(NqColors c, num totalDue, int dueCount) => Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16),
        child: Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: c.hero,
            borderRadius: BorderRadius.circular(NqRadius.cardOverlap),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text('المستحق عليك',
                  style:
                      NqType.body.copyWith(color: NqFixed.heroTextSecondary)),
              const SizedBox(height: 6),
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
                  Text('ر.س',
                      style: NqType.h3
                          .copyWith(color: NqFixed.heroTextSecondary)),
                ],
              ),
              const SizedBox(height: 6),
              Text(
                  dueCount > 0
                      ? '$dueCount فواتير بانتظار الدفع'
                      : 'لا فواتير مستحقة حاليًا',
                  style:
                      NqType.caption.copyWith(color: NqFixed.heroTextSecondary)),
            ],
          ),
        ),
      );

  Widget _escrowCard(NqColors c, num held) => Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: c.mintBg,
            borderRadius: BorderRadius.circular(NqRadius.card),
            border: Border.all(color: c.mint.withValues(alpha: 0.5)),
          ),
          child: Row(
            children: [
              Container(
                width: 44,
                height: 44,
                alignment: Alignment.center,
                decoration:
                    BoxDecoration(color: c.mint, shape: BoxShape.circle),
                child: NqIcon(NqIcons.shieldCheck, size: 22, color: c.onMint),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Row(mainAxisSize: MainAxisSize.min, children: [
                      Ltr(money(held),
                          style: NqType.price(size: 18).copyWith(color: c.tx)),
                      const SizedBox(width: 3),
                      Text('ر.س', style: NqType.caption.copyWith(color: c.tx2)),
                    ]),
                    const SizedBox(height: 2),
                    Text('محفوظ في الضمان — يُحرَّر للمزوّد بعد تأكيدك الاستلام',
                        style: NqType.caption.copyWith(color: c.tx2, height: 1.5),
                        textAlign: TextAlign.right),
                  ],
                ),
              ),
            ],
          ),
        ),
      );

  Widget _infoNote(NqColors c) => Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: c.sf2,
          borderRadius: BorderRadius.circular(NqRadius.button),
        ),
        child: Row(
          children: [
            NqIcon(NqIcons.info, size: 20, color: c.tx3),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                'يتم الدفع مباشرة للمزوّد. بعد التحويل أبلِغ عن الدفع وأرفق الإيصال، ويؤكّد المزوّد الاستلام.',
                style: NqType.caption.copyWith(color: c.tx2, height: 1.6),
                textAlign: TextAlign.right,
              ),
            ),
          ],
        ),
      );

  Widget _centered(Widget child) => ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        children: [SizedBox(height: 300, child: Center(child: child))],
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
