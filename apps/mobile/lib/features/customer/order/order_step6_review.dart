import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/orders/order_draft_controller.dart';
import '../../../core/orders/order_models.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/theme/typography.dart';
import '../../../core/widgets/ltr.dart';
import '../../../core/widgets/nq_icon.dart';
import 'order_wizard_scaffold.dart';

/// Create-order step 6/6 — review & publish (handoff 4e). Builds the single
/// order from the draft and POSTs + publishes it.
class OrderStep6Review extends ConsumerStatefulWidget {
  const OrderStep6Review({super.key, this.onPublished});

  /// Called with the new order id after a successful publish.
  final void Function(String orderId)? onPublished;

  @override
  ConsumerState<OrderStep6Review> createState() => _OrderStep6ReviewState();
}

class _OrderStep6ReviewState extends ConsumerState<OrderStep6Review> {
  bool _agreed = false;
  bool _busy = false;
  String? _error;

  Future<void> _publish() async {
    final draft = ref.read(orderDraftProvider);
    if (!draft.isValid) {
      setState(() => _error = _missingHint(draft));
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final id = await ref.read(orderDraftProvider.notifier).submitAndPublish();
      ref.read(orderDraftProvider.notifier).reset();
      if (mounted) (widget.onPublished ?? (_) {})(id);
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } catch (_) {
      if (mounted) setState(() => _error = 'تعذّر نشر الطلب. حاول مجددًا.');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  String _missingHint(OrderDraft d) {
    if (!d.single) return 'الطلب المجمّع غير مدعوم للنشر بعد. اختر «شحنة واحدة».';
    final miss = <String>[];
    if (d.cargoDescription.trim().isEmpty) miss.add('وصف الحمولة');
    if ((d.weight ?? 0) < 1) miss.add('الوزن');
    if (d.originAddress.trim().isEmpty) miss.add('عنوان الاستلام');
    if (d.destinationAddress.trim().isEmpty) miss.add('عنوان التفريغ');
    if (d.pickupDate == null) miss.add('موعد الاستلام');
    return 'أكمل: ${miss.join('، ')}.';
  }

  @override
  Widget build(BuildContext context) {
    final c = context.nq;
    final d = ref.watch(orderDraftProvider);
    return OrderWizardScaffold(
      step: 6,
      stepName: 'المراجعة',
      nextLabel: '',
      nextHint: 'الأخيرة',
      nextButtonLabel: _busy
          ? 'جارٍ الإرسال…'
          : (d.isDirectTargeted ? 'إرسال الطلب للمزوّد' : 'نشر الطلب'),
      nextIcon: d.isDirectTargeted ? NqIcons.paperPlaneTilt : NqIcons.megaphone,
      title: d.isDirectTargeted ? 'راجع وأرسِل' : 'راجع وانشر',
      showPrev: true,
      nextEnabled: _agreed && !_busy,
      onNext: _busy ? null : _publish,
      children: [
        if (_error != null) ...[
          _errorBanner(c, _error!),
          const SizedBox(height: 14),
        ],
        _summaryCard(c, d),
        const SizedBox(height: 14),
        _detailsCard(c, d),
        const SizedBox(height: 14),
        _priceCard(c, d),
        const SizedBox(height: 16),
        _terms(c),
      ],
    );
  }

  Widget _summaryCard(NqColors c, OrderDraft d) => _card(
        c,
        Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                Text('شحنة واحدة', style: NqType.h3.copyWith(color: c.tx2)),
                const Spacer(),
                Text('${d.originCity} ← ${d.destinationCity}',
                    style: NqType.h3.copyWith(color: c.tx)),
              ],
            ),
            const SizedBox(height: 10),
            Divider(color: c.bd, height: 1),
            const SizedBox(height: 10),
            Row(
              children: [
                Text(truckLabel(d.requiredTruckType),
                    style: NqType.body.copyWith(color: c.tx2)),
                const Spacer(),
                Text(cargoLabel(d.cargoType),
                    style: NqType.bodyStrong.copyWith(color: c.tx)),
              ],
            ),
            if (d.cargoDescription.trim().isNotEmpty) ...[
              const SizedBox(height: 4),
              Text(d.cargoDescription.trim(),
                  style: NqType.caption.copyWith(color: c.tx2),
                  textAlign: TextAlign.right),
            ],
          ],
        ),
      );

  Widget _detailsCard(NqColors c, OrderDraft d) {
    Widget row(String label, String value) => Padding(
          padding: const EdgeInsets.symmetric(vertical: 6),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Text(value,
                    style: NqType.body.copyWith(color: c.tx),
                    textAlign: TextAlign.right),
              ),
              const SizedBox(width: 16),
              Text(label, style: NqType.body.copyWith(color: c.tx2)),
            ],
          ),
        );
    final windowLabel = pickupWindowOptions
        .firstWhere((o) => o.value == d.pickupWindow,
            orElse: () => (value: d.pickupWindow, label: d.pickupWindow))
        .label;
    final consignee = d.consigneeName.trim().isNotEmpty
        ? '${d.consigneeName.trim()} · ${d.consigneePhone.trim()}'
        : '—';
    return _card(
      c,
      Column(
        children: [
          row('الوزن', d.weight != null ? '${d.weight} طن' : '—'),
          row('الاستلام', '${fmtDate(d.pickupDate)} · $windowLabel'),
          row(
              'التسعير',
              d.isDirectTargeted
                  ? 'سعر ثابت · مزوّد محدّد: ${d.targetCarrierName ?? 'محدّد'}'
                  : '${d.fixedPrice ? 'سعر ثابت' : 'مناقصة'} · ${d.openMarket ? 'السوق المفتوح' : 'مزوّدون محدّدون'}'),
          row('الدفع', _paymentLabel(d.collectionMethod)),
          row('المستلم', consignee),
        ],
      ),
    );
  }

  String _paymentLabel(String m) => switch (m) {
        'COD' => 'عند التسليم',
        'PREPAID_WALLET' => 'محفظة مسبقة',
        'PREPAID_GATEWAY' => 'دفع إلكتروني',
        _ => 'ضمان (إسكرو)',
      };

  Widget _priceCard(NqColors c, OrderDraft d) {
    final hasPrice = d.fixedPrice && d.clientBudget != null;
    return _card(
      c,
      Row(
        children: [
          if (hasPrice)
            Row(children: [
              Ltr(d.clientBudget!.toStringAsFixed(0),
                  style: NqType.price(size: 20).copyWith(color: c.tx)),
              const SizedBox(width: 3),
              Text('ر.س', style: NqType.caption.copyWith(color: c.tx2)),
            ])
          else
            Text('عروض المزوّدين',
                style: NqType.bodyStrong.copyWith(color: c.tx)),
          const Spacer(),
          Text(hasPrice ? 'السعر المطلوب' : 'التسعير',
              style: NqType.h3.copyWith(color: c.tx)),
        ],
      ),
    );
  }

  Widget _errorBanner(NqColors c, String msg) => Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: c.errBg,
          borderRadius: BorderRadius.circular(NqRadius.button),
        ),
        child: Row(
          children: [
            NqIcon(NqIcons.warningCircle, size: 18, color: c.err),
            const SizedBox(width: 12),
            Expanded(
              child: Text(msg,
                  style: NqType.caption.copyWith(color: c.err, height: 1.5),
                  textAlign: TextAlign.right),
            ),
          ],
        ),
      );

  Widget _terms(NqColors c) {
    return GestureDetector(
      onTap: () => setState(() => _agreed = !_agreed),
      behavior: HitTestBehavior.opaque,
      child: Row(
        children: [
          Container(
            width: 22,
            height: 22,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: _agreed ? c.mintS : Colors.transparent,
              borderRadius: BorderRadius.circular(6),
              border: _agreed ? null : Border.all(color: c.bd, width: 1.5),
            ),
            child: _agreed
                ? NqIcon(NqIcons.check,
                    size: 15, color: c.isDark ? c.onMint : Colors.white)
                : null,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text.rich(
              TextSpan(
                style: NqType.body.copyWith(color: c.tx2),
                children: [
                  const TextSpan(text: 'أوافق على '),
                  TextSpan(
                      text: 'شروط النقل وسياسة الإلغاء',
                      style: NqType.bodyStrong.copyWith(color: c.mintTx)),
                ],
              ),
              textAlign: TextAlign.right,
            ),
          ),
        ],
      ),
    );
  }

  Widget _card(NqColors c, Widget child) => Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: c.sf,
          borderRadius: BorderRadius.circular(NqRadius.card),
          border: Border.all(color: c.bd),
        ),
        child: child,
      );
}
