import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/api_exception.dart';
import '../../core/orders/order_models.dart';
import '../../core/orders/orders_repository.dart';
import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';
import '../../core/widgets/ltr.dart';
import '../../core/widgets/nq_icon.dart';
import '../../core/platform/format.dart';
import '../../design_system/chip.dart';
import '../../design_system/confirm_dialog.dart';
import '../../design_system/offer_card.dart';

/// Customer offers (handoff 4f): the most recent order that is collecting
/// offers, its bids compared (cheapest highlighted), accept + chat. Wired to
/// `GET /orders/:id/bids` + `POST …/bids/:id/accept`.
class CustomerOffersScreen extends ConsumerStatefulWidget {
  const CustomerOffersScreen({super.key});

  @override
  ConsumerState<CustomerOffersScreen> createState() =>
      _CustomerOffersScreenState();
}

enum _Sort { price, pickup }

class _CustomerOffersScreenState extends ConsumerState<CustomerOffersScreen> {
  _Sort _sort = _Sort.price;
  String? _acceptingBidId;

  Future<void> _accept(OrderSummary order, BidModel bid) async {
    final confirmed = await nqConfirm(context,
        title: 'قبول العرض',
        message: 'بقبول عرض ${bid.carrierName} بمبلغ '
            '${bid.amount != null ? money(bid.amount!, decimals: 0) : '—'} ر.س سيُسنَد الطلب '
            'لهذا المزوّد ويُحجز المبلغ في الضمان، وتُرفض بقية العروض. هل تريد المتابعة؟',
        confirmLabel: 'قبول العرض',
        icon: NqIcons.handCoins);
    if (!confirmed) return;
    setState(() => _acceptingBidId = bid.id);
    try {
      await ref.read(ordersRepositoryProvider).acceptBid(order.id, bid.id);
      ref.invalidate(myShipmentsProvider);
      ref.invalidate(orderBidsProvider(order.id));
      ref.invalidate(offersFocusOrderProvider);
      if (mounted) context.push('/order-detail/${order.id}');
    } on ApiException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(e.message)));
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('تعذّر قبول العرض. حاول مجددًا.')));
      }
    } finally {
      if (mounted) setState(() => _acceptingBidId = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = context.nq;
    final focus = ref.watch(offersFocusOrderProvider);
    return SafeArea(
      child: focus.when(
        loading: () => _centered(_loader(c)),
        error: (e, _) => _centered(_errorState(
          c,
          e is ApiException ? e.message : 'تعذّر تحميل العروض.',
          () => ref.invalidate(offersFocusOrderProvider),
        )),
        data: (order) {
          if (order == null) return _centered(_emptyState(c));
          return _withOrder(c, order);
        },
      ),
    );
  }

  Widget _withOrder(NqColors c, OrderSummary order) {
    final bidsAsync = ref.watch(orderBidsProvider(order.id));
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _appBar(c, order),
        Expanded(
          child: bidsAsync.when(
            loading: () => _centered(_loader(c)),
            error: (e, _) => _centered(_errorState(
              c,
              e is ApiException ? e.message : 'تعذّر تحميل العروض.',
              () => ref.invalidate(orderBidsProvider(order.id)),
            )),
            data: (bids) => _list(c, order, bids),
          ),
        ),
      ],
    );
  }

  Widget _list(NqColors c, OrderSummary order, List<BidModel> allBids) {
    final bids = allBids.where((b) => b.isPending).toList();
    bids.sort((a, b) {
      if (_sort == _Sort.pickup) {
        final ad = a.proposedPickupDate ?? DateTime(2100);
        final bd = b.proposedPickupDate ?? DateTime(2100);
        return ad.compareTo(bd);
      }
      return (a.amount ?? 0).compareTo(b.amount ?? 0);
    });
    if (bids.isEmpty) {
      return _centered(Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          NqIcon(NqIcons.handCoins, size: 40, color: c.tx3),
          const SizedBox(height: 12),
          Text('لا توجد عروض بعد', style: NqType.h3.copyWith(color: c.tx2)),
          const SizedBox(height: 6),
          Text('سيصلك إشعار عند وصول أول عرض',
              style: NqType.body.copyWith(color: c.tx3)),
        ],
      ));
    }
    // Cheapest is "best" regardless of the current sort.
    final cheapestId = (List<BidModel>.from(allBids.where((b) => b.isPending))
          ..sort((a, b) => (a.amount ?? 0).compareTo(b.amount ?? 0)))
        .first
        .id;
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
      children: [
        _infoBanner(c, bids.length),
        const SizedBox(height: 14),
        _sortChips(c),
        const SizedBox(height: 18),
        for (final b in bids) ...[
          NqOfferCard(
            initial: b.carrierName.isNotEmpty ? b.carrierName.substring(0, 1) : 'م',
            name: b.carrierName,
            price: b.amount?.toStringAsFixed(0) ?? '—',
            date: b.proposedPickupDate != null
                ? fmtDate(b.proposedPickupDate)
                : (b.proposedDeliveryDate != null
                    ? 'تسليم ${fmtDate(b.proposedDeliveryDate)}'
                    : 'حسب الطلب'),
            best: b.id == cheapestId,
            loading: _acceptingBidId == b.id,
            onAccept: () => _accept(order, b),
            onChat: () => context.push('/chat/${order.id}', extra: b.carrierName),
          ),
          const SizedBox(height: 16),
        ],
      ],
    );
  }

  Widget _appBar(NqColors c, OrderSummary order) => Padding(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
        child: Row(
          children: [
            const Spacer(),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text('العروض', style: NqType.h3.copyWith(color: c.tx)),
                const SizedBox(height: 2),
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text('${order.route} · ', style: NqType.caption.copyWith(color: c.tx2)),
                    Ltr(order.orderNumber,
                        style: NqType.code(size: 12).copyWith(color: c.tx2)),
                  ],
                ),
              ],
            ),
          ],
        ),
      );

  Widget _infoBanner(NqColors c, int n) => Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: c.mintBg,
          borderRadius: BorderRadius.circular(NqRadius.card),
        ),
        child: Row(
          children: [
            NqIcon(NqIcons.handCoins, size: 20, color: c.mintTx),
            const SizedBox(width: 12),
            Expanded(
              child: Text.rich(
                TextSpan(
                  style: NqType.label.copyWith(color: c.tx, height: 1.5),
                  children: [
                    TextSpan(
                        text: '$n عروض',
                        style: NqType.labelStrong.copyWith(color: c.mintTx)),
                    const TextSpan(text: ' على طلبك · اختر الأنسب لك.'),
                  ],
                ),
                textAlign: TextAlign.right,
              ),
            ),
          ],
        ),
      );

  Widget _sortChips(NqColors c) {
    const items = [(_Sort.price, 'الأقل سعرًا'), (_Sort.pickup, 'الأسرع استلامًا')];
    return Row(
      children: [
        for (final it in items) ...[
          NqChip(
            label: it.$2,
            selected: _sort == it.$1,
            onTap: () => setState(() => _sort = it.$1),
          ),
          const SizedBox(width: 8),
        ],
      ],
    );
  }

  Widget _centered(Widget child) => Center(child: child);

  Widget _loader(NqColors c) => SizedBox(
        width: 30,
        height: 30,
        child: CircularProgressIndicator(strokeWidth: 2.5, color: c.mintTx),
      );

  Widget _emptyState(NqColors c) => Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          NqIcon(NqIcons.handCoins, size: 44, color: c.tx3),
          const SizedBox(height: 12),
          Text('لا توجد عروض حالياً', style: NqType.h2.copyWith(color: c.tx2)),
          const SizedBox(height: 6),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 40),
            child: Text(
                'ستظهر هنا عروض المزوّدين على طلباتك المنشورة في المناقصات.',
                style: NqType.body.copyWith(color: c.tx3),
                textAlign: TextAlign.center),
          ),
        ],
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
                  borderRadius: BorderRadius.circular(NqRadius.pill),
                ),
                child: Text('إعادة المحاولة',
                    style: NqType.labelStrong.copyWith(color: c.mintTx)),
              ),
            ),
          ],
        ),
      );
}
