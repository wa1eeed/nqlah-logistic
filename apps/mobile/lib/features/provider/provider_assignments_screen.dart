import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_exception.dart';
import '../../core/orders/order_models.dart';
import '../../core/orders/orders_repository.dart';
import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';
import '../../core/widgets/ltr.dart';
import '../../core/widgets/nq_icon.dart';
import '../../design_system/button.dart';
import '../../design_system/chip.dart';
import '../../design_system/status_chip.dart';

/// Provider assignments (handoff 3c): filter chips + the carrier's assigned
/// orders grouped by status, wired to `GET /orders?mine=true` (carrier work).
class ProviderAssignmentsScreen extends ConsumerStatefulWidget {
  const ProviderAssignmentsScreen({super.key, this.onAssign, this.onOpen});

  final void Function(String orderId)? onAssign;
  final void Function(String orderId)? onOpen;

  @override
  ConsumerState<ProviderAssignmentsScreen> createState() =>
      _ProviderAssignmentsScreenState();
}

// (filterIndex): 0 all · 1 ASSIGNED · 2 CONFIRMED · 3 IN_TRANSIT
class _ProviderAssignmentsScreenState
    extends ConsumerState<ProviderAssignmentsScreen> {
  int _filter = 0;

  static const _active = ['ASSIGNED', 'CONFIRMED', 'IN_TRANSIT', 'DELIVERED'];

  @override
  Widget build(BuildContext context) {
    final c = context.nq;
    final async = ref.watch(providerWorkProvider);
    return SafeArea(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
            child: Row(
              children: [
                Text(
                    async.valueOrNull != null
                        ? '${_activeOf(async.valueOrNull!).length} طلبًا'
                        : '',
                    style: NqType.label.copyWith(color: c.tx2)),
                const Spacer(),
                Text('التكليفات', style: NqType.h1.copyWith(color: c.tx)),
              ],
            ),
          ),
          const SizedBox(height: 14),
          _filterChips(c, async.valueOrNull ?? const []),
          const SizedBox(height: 12),
          Expanded(
            child: RefreshIndicator(
              onRefresh: () => ref.refresh(providerWorkProvider.future),
              color: c.mintTx,
              child: async.when(
                loading: () => _centered(_loader(c)),
                error: (e, _) => _centered(_errorState(
                  c,
                  e is ApiException ? e.message : 'تعذّر تحميل التكليفات.',
                  () => ref.invalidate(providerWorkProvider),
                )),
                data: (orders) => _list(c, orders),
              ),
            ),
          ),
        ],
      ),
    );
  }

  List<OrderSummary> _activeOf(List<OrderSummary> orders) => orders
      .where((o) => _active.contains(o.status.toUpperCase()))
      .toList();

  int _countFor(List<OrderSummary> orders, String status) =>
      orders.where((o) => o.status.toUpperCase() == status).length;

  Widget _filterChips(NqColors c, List<OrderSummary> orders) {
    final active = _activeOf(orders);
    final labels = ['الكل', 'بانتظار إسناد', 'مُسند', 'في الطريق'];
    final counts = [
      active.length,
      _countFor(orders, 'ASSIGNED'),
      _countFor(orders, 'CONFIRMED'),
      _countFor(orders, 'IN_TRANSIT'),
    ];
    return SizedBox(
      height: 36,
      child: ListView(
        scrollDirection: Axis.horizontal,
        reverse: true,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        children: [
          for (var i = 0; i < labels.length; i++) ...[
            NqChip(
              label: labels[i],
              selected: _filter == i,
              count: counts[i],
              onTap: () => setState(() => _filter = i),
            ),
            if (i < labels.length - 1) const SizedBox(width: 8),
          ],
        ],
      ),
    );
  }

  Widget _list(NqColors c, List<OrderSummary> orders) {
    var items = _activeOf(orders);
    if (_filter == 1) {
      items = items.where((o) => o.status.toUpperCase() == 'ASSIGNED').toList();
    } else if (_filter == 2) {
      items = items.where((o) => o.status.toUpperCase() == 'CONFIRMED').toList();
    } else if (_filter == 3) {
      items =
          items.where((o) => o.status.toUpperCase() == 'IN_TRANSIT').toList();
    }
    if (items.isEmpty) {
      return _centered(Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          NqIcon(NqIcons.clipboardText, size: 40, color: c.tx3),
          const SizedBox(height: 12),
          Text('لا توجد تكليفات', style: NqType.h3.copyWith(color: c.tx2)),
          const SizedBox(height: 6),
          Text('اقبل حمولة من السوق لتظهر هنا',
              style: NqType.body.copyWith(color: c.tx3)),
        ],
      ));
    }
    // Sort: awaiting-assignment first, then by status order.
    items.sort((a, b) =>
        _active.indexOf(a.status.toUpperCase()) -
        _active.indexOf(b.status.toUpperCase()));
    return ListView.separated(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
      itemCount: items.length,
      separatorBuilder: (_, _) => const SizedBox(height: 12),
      itemBuilder: (_, i) => _assignmentCard(c, items[i]),
    );
  }

  Widget _assignmentCard(NqColors c, OrderSummary o) {
    final needsDriver = o.status.toUpperCase() == 'ASSIGNED';
    return GestureDetector(
      onTap: () => (widget.onOpen ?? (_) {})(o.id),
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
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                NqStatusChip(o.nqStatus),
                const Spacer(),
                Expanded(
                  flex: 3,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(o.route, style: NqType.h3.copyWith(color: c.tx)),
                      const SizedBox(height: 2),
                      Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Flexible(
                            child: Text(
                                '${truckLabel(o.requiredTruckType)} · ${fmtDate(o.pickupDate)} · ',
                                style: NqType.caption.copyWith(color: c.tx2),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis),
                          ),
                          Ltr(o.orderNumber,
                              style:
                                  NqType.code(size: 12).copyWith(color: c.tx2)),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Divider(color: c.bd, height: 1),
            const SizedBox(height: 12),
            Row(
              children: [
                if (needsDriver)
                  NqButton(
                    label: 'إسناد سائق',
                    expand: false,
                    icon: NqIcons.steeringWheel,
                    onPressed: () => (widget.onAssign ?? (_) {})(o.id),
                  )
                else
                  NqButton(
                    label: 'فتح الطلب',
                    expand: false,
                    variant: NqButtonVariant.secondary,
                    onPressed: () => (widget.onOpen ?? (_) {})(o.id),
                  ),
                const Spacer(),
                Text(_hint(o), style: NqType.label.copyWith(color: c.tx2)),
                const SizedBox(width: 6),
                NqIcon(needsDriver ? NqIcons.userPlus : NqIcons.truck,
                    size: 18, color: c.tx3),
              ],
            ),
          ],
        ),
      ),
    );
  }

  String _hint(OrderSummary o) => switch (o.nqStatus) {
        NqStatus.assigned => 'يحتاج إسناد سائق',
        NqStatus.confirmed => 'جاهز للانطلاق',
        NqStatus.inTransit => 'قيد التنفيذ',
        NqStatus.delivered => 'تم التسليم',
        _ => '',
      };

  Widget _centered(Widget child) => ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        children: [SizedBox(height: 440, child: Center(child: child))],
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
