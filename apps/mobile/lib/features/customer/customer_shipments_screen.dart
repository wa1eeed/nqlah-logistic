import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/api_exception.dart';
import '../../core/orders/order_models.dart';
import '../../core/orders/orders_repository.dart';
import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';
import '../../core/widgets/nq_icon.dart';
import '../../design_system/segmented.dart';
import '../../design_system/shipment_card.dart';
import '../../design_system/status_chip.dart';

/// Customer "my shipments" (handoff 4g): segmented (active/drafts/completed),
/// search, and compact shipment cards — wired to `GET /orders?mine=true`.
class CustomerShipmentsScreen extends ConsumerStatefulWidget {
  const CustomerShipmentsScreen({super.key});

  @override
  ConsumerState<CustomerShipmentsScreen> createState() =>
      _CustomerShipmentsScreenState();
}

class _CustomerShipmentsScreenState
    extends ConsumerState<CustomerShipmentsScreen> {
  int _seg = 0;
  final _search = TextEditingController();
  String _query = '';

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  static const _buckets = [
    ShipmentBucket.active,
    ShipmentBucket.drafts,
    ShipmentBucket.completed,
  ];

  @override
  Widget build(BuildContext context) {
    final c = context.nq;
    final async = ref.watch(myShipmentsProvider);
    return SafeArea(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
            child: Row(
              children: [
                _filterButton(c),
                const Spacer(),
                Text('شحناتي', style: NqType.h1.copyWith(color: c.tx)),
              ],
            ),
          ),
          const SizedBox(height: 16),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: NqSegmented(
              options: const ['نشطة', 'مسودات', 'مكتملة'],
              counts: _segCounts(async.valueOrNull),
              // نشطة + مسودات are in-progress / incomplete → red badge.
              dangerCounts: const {0, 1},
              index: _seg,
              onChanged: (i) => setState(() => _seg = i),
            ),
          ),
          const SizedBox(height: 12),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: _searchField(c),
          ),
          const SizedBox(height: 12),
          Expanded(
            child: RefreshIndicator(
              onRefresh: () => ref.refresh(myShipmentsProvider.future),
              color: c.mintTx,
              child: async.when(
                loading: () => _centered(const _Loader()),
                error: (e, _) => _centered(_ErrorState(
                  message: e is ApiException
                      ? e.message
                      : 'تعذّر تحميل الشحنات.',
                  onRetry: () => ref.invalidate(myShipmentsProvider),
                )),
                data: (orders) => _list(c, orders),
              ),
            ),
          ),
        ],
      ),
    );
  }

  List<int?> _segCounts(List<OrderSummary>? orders) {
    if (orders == null) return List<int?>.filled(_buckets.length, null);
    return [
      for (final b in _buckets) orders.where((o) => o.bucket == b).length,
    ];
  }

  Widget _list(NqColors c, List<OrderSummary> orders) {
    final bucket = _buckets[_seg];
    var items = orders.where((o) => o.bucket == bucket).toList();
    if (_query.isNotEmpty) {
      final q = _query.toLowerCase();
      items = items
          .where((o) =>
              o.orderNumber.toLowerCase().contains(q) ||
              o.originCity.contains(_query) ||
              o.destinationCity.contains(_query))
          .toList();
    }
    if (items.isEmpty) {
      return _centered(_EmptyState(bucket: bucket, hasQuery: _query.isNotEmpty));
    }
    return ListView.separated(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
      itemCount: items.length,
      separatorBuilder: (_, _) => const SizedBox(height: 10),
      itemBuilder: (_, i) {
        final o = items[i];
        return NqShipmentCard(
          code: o.orderNumber,
          status: o.displayStatus,
          route: o.route,
          statusLine: _statusLine(c, o),
          onTap: () => context.push('/order-detail/${o.id}'),
        );
      },
    );
  }

  Widget _statusLine(NqColors c, OrderSummary o) {
    switch (o.nqStatus) {
      case NqStatus.published:
      case NqStatus.tender:
        if (o.bidsCount > 0) {
          return _rich(c, NqIcons.handCoins, c.warn, [
            TextSpan(
                text: '${o.bidsCount} عروض',
                style: NqType.labelStrong.copyWith(color: c.warn)),
            TextSpan(
                text: ' · بانتظار اختيارك',
                style: NqType.label.copyWith(color: c.tx2)),
          ]);
        }
        return _line(c, NqIcons.broadcast, c.mintTx, 'منشور · بانتظار العروض');
      case NqStatus.assigned:
      case NqStatus.confirmed:
        return _line(c, NqIcons.steeringWheel, c.tx2,
            o.carrierName ?? 'تم إسناد المزوّد');
      case NqStatus.inTransit:
        return _line(c, NqIcons.broadcast, c.mintTx, 'الشحنة في الطريق');
      case NqStatus.delivered:
        return _line(c, NqIcons.package, c.ok, 'تم التسليم · بانتظار الإغلاق');
      case NqStatus.completed:
        return _line(c, NqIcons.sealCheck, c.mintTx, 'اكتملت الشحنة');
      case NqStatus.cancelled:
        return _line(c, NqIcons.xCircle, c.err, 'شحنة ملغاة');
      case NqStatus.draft:
        return _line(c, NqIcons.notePencil, c.tx3, 'مسودة — لم تُنشر بعد');
      default:
        return _line(c, NqIcons.truck, c.tx2,
            '${cargoLabel(o.cargoType)} · ${truckLabel(o.requiredTruckType)}');
    }
  }

  Widget _centered(Widget child) => ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          SizedBox(
            height: 420,
            child: Center(child: child),
          ),
        ],
      );

  Widget _filterButton(NqColors c) => Container(
        width: 44,
        height: 44,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: c.hero,
          borderRadius: BorderRadius.circular(NqRadius.input),
        ),
        child: NqIcon(NqIcons.slidersHorizontal,
            size: 20, color: NqFixed.heroText),
      );

  Widget _searchField(NqColors c) => Container(
        height: 48,
        padding: const EdgeInsets.symmetric(horizontal: 14),
        decoration: BoxDecoration(
          color: c.sf,
          borderRadius: BorderRadius.circular(NqRadius.input),
          border: Border.all(color: c.bd),
        ),
        child: Row(
          children: [
            NqIcon(NqIcons.magnifyingGlass, size: 19, color: c.tx3),
            const SizedBox(width: 10),
            Expanded(
              child: TextField(
                controller: _search,
                onChanged: (v) => setState(() => _query = v.trim()),
                textAlignVertical: TextAlignVertical.center,
                style: NqType.body.copyWith(color: c.tx),
                cursorColor: c.mintS,
                decoration: InputDecoration(
                  isCollapsed: true,
                  border: InputBorder.none,
                  hintText: 'رقم الطلب، مدينة، حاوية',
                  hintStyle: NqType.body.copyWith(color: c.tx3),
                ),
              ),
            ),
          ],
        ),
      );

  Widget _line(NqColors c, String icon, Color iconColor, String text) => Row(
        children: [
          NqIcon(icon, size: 16, color: iconColor),
          const SizedBox(width: 6),
          Expanded(
            child: Text(text,
                style: NqType.label.copyWith(color: c.tx2),
                textAlign: TextAlign.right),
          ),
        ],
      );

  Widget _rich(NqColors c, String icon, Color iconColor, List<TextSpan> spans) =>
      Row(
        children: [
          NqIcon(icon, size: 16, color: iconColor),
          const SizedBox(width: 6),
          Expanded(
            child: Text.rich(TextSpan(children: spans),
                textAlign: TextAlign.right),
          ),
        ],
      );
}

class _Loader extends StatelessWidget {
  const _Loader();
  @override
  Widget build(BuildContext context) {
    final c = context.nq;
    return SizedBox(
      width: 30,
      height: 30,
      child: CircularProgressIndicator(strokeWidth: 2.5, color: c.mintTx),
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState({required this.bucket, required this.hasQuery});
  final ShipmentBucket bucket;
  final bool hasQuery;

  @override
  Widget build(BuildContext context) {
    final c = context.nq;
    final (icon, title) = switch (bucket) {
      ShipmentBucket.active => (NqIcons.truck, 'لا توجد شحنات نشطة'),
      ShipmentBucket.drafts => (NqIcons.notePencil, 'لا توجد مسودات'),
      ShipmentBucket.completed => (NqIcons.sealCheck, 'لا توجد شحنات مكتملة'),
    };
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        NqIcon(icon, size: 40, color: c.tx3),
        const SizedBox(height: 12),
        Text(hasQuery ? 'لا نتائج مطابقة' : title,
            style: NqType.h3.copyWith(color: c.tx2)),
        const SizedBox(height: 6),
        Text(hasQuery ? 'جرّب كلمة بحث أخرى' : 'ستظهر شحناتك هنا',
            style: NqType.body.copyWith(color: c.tx3)),
      ],
    );
  }
}

class _ErrorState extends StatelessWidget {
  const _ErrorState({required this.message, required this.onRetry});
  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final c = context.nq;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 32),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          NqIcon(NqIcons.warningCircle, size: 40, color: c.err),
          const SizedBox(height: 12),
          Text(message,
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
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  NqIcon(NqIcons.arrowCounterClockwise,
                      size: 16, color: c.mintTx),
                  const SizedBox(width: 8),
                  Text('إعادة المحاولة',
                      style: NqType.labelStrong.copyWith(color: c.mintTx)),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
