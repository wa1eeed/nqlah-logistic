import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_exception.dart';
import '../../core/fleet/fleet_repository.dart';
import '../../core/orders/order_models.dart';
import '../../core/orders/orders_repository.dart';
import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';
import '../../core/widgets/ltr.dart';
import '../../core/widgets/nq_icon.dart';
import '../../design_system/button.dart';
import '../../design_system/confirm_dialog.dart';

/// Driver assignment (handoff 1h). Single-select an available driver for an
/// order; wired to `GET /fleet/drivers/available` + `POST /orders/:id/assign-driver`.
class DriverAssignmentScreen extends ConsumerStatefulWidget {
  const DriverAssignmentScreen({super.key, required this.orderId, this.onConfirm});

  final String orderId;
  final VoidCallback? onConfirm;

  @override
  ConsumerState<DriverAssignmentScreen> createState() =>
      _DriverAssignmentScreenState();
}

class _DriverAssignmentScreenState
    extends ConsumerState<DriverAssignmentScreen> {
  String? _selectedId;
  final _search = TextEditingController();
  String _query = '';
  bool _busy = false;

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  Future<void> _confirm(DriverModel driver) async {
    if (!await nqConfirm(context,
        title: 'إسناد السائق',
        message: 'سيتم إسناد ${driver.name} لهذا الطلب وإشعاره ببدء المهمة. '
            'يمكنك تغيير السائق لاحقاً قبل انطلاق الرحلة.',
        confirmLabel: 'إسناد السائق',
        icon: NqIcons.steeringWheel)) {
      return;
    }
    setState(() => _busy = true);
    try {
      await ref
          .read(ordersRepositoryProvider)
          .assignDriver(widget.orderId, driver.id);
      ref.invalidate(providerWorkProvider);
      ref.invalidate(availableDriversProvider);
      ref.invalidate(orderDetailModelProvider(widget.orderId));
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('تم إسناد ${driver.name} للطلب.')));
        (widget.onConfirm ?? () {})();
        Navigator.of(context).maybePop();
      }
    } on ApiException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(e.message)));
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('تعذّر الإسناد. حاول مجددًا.')));
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = context.nq;
    final order = ref.watch(orderDetailModelProvider(widget.orderId)).valueOrNull;
    final driversAsync = ref.watch(availableDriversProvider);
    return Scaffold(
      backgroundColor: c.bg,
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _appBar(c),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
                children: [
                  _contextBar(c, order),
                  const SizedBox(height: 14),
                  _searchField(c),
                  const SizedBox(height: 18),
                  driversAsync.when(
                    loading: () => _pad(_loader(c)),
                    error: (e, _) => _pad(_errorState(
                      c,
                      e is ApiException ? e.message : 'تعذّر تحميل السائقين.',
                      () => ref.invalidate(availableDriversProvider),
                    )),
                    data: (drivers) => _driversList(c, drivers),
                  ),
                ],
              ),
            ),
            driversAsync.maybeWhen(
              data: (drivers) => _footer(c, drivers),
              orElse: () => const SizedBox.shrink(),
            ),
          ],
        ),
      ),
    );
  }

  List<DriverModel> _filtered(List<DriverModel> drivers) {
    if (_query.isEmpty) return drivers;
    return drivers.where((d) => d.name.contains(_query)).toList();
  }

  Widget _driversList(NqColors c, List<DriverModel> drivers) {
    final items = _filtered(drivers);
    if (items.isEmpty) {
      return _pad(Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          NqIcon(NqIcons.steeringWheel, size: 40, color: c.tx3),
          const SizedBox(height: 12),
          Text(_query.isNotEmpty ? 'لا سائق مطابق' : 'لا يوجد سائقون متاحون',
              style: NqType.h3.copyWith(color: c.tx2)),
          const SizedBox(height: 6),
          Text('أضِف سائقًا أو حرّر سائقًا من رحلة حالية',
              style: NqType.body.copyWith(color: c.tx3),
              textAlign: TextAlign.center),
        ],
      ));
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text('مؤهّلون ومتاحون · ${items.length}',
            style: NqType.labelStrong.copyWith(color: c.tx2),
            textAlign: TextAlign.right),
        const SizedBox(height: 10),
        for (final d in items) ...[
          _driverRow(c, d,
              selected: _selectedId == d.id,
              onTap: () => setState(() => _selectedId = d.id)),
          const SizedBox(height: 10),
        ],
      ],
    );
  }

  Widget _appBar(NqColors c) => Padding(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
        child: Row(
          children: [
            const Spacer(),
            Text('إسناد سائق', style: NqType.h3.copyWith(color: c.tx)),
            const SizedBox(width: 12),
            GestureDetector(
              onTap: () => Navigator.of(context).maybePop(),
              child: NqIcon(NqIcons.arrowRight, size: 22, color: c.tx),
            ),
          ],
        ),
      );

  Widget _contextBar(NqColors c, OrderDetail? order) => Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: c.hero,
          borderRadius: BorderRadius.circular(NqRadius.card),
        ),
        child: Row(
          children: [
            NqIcon(NqIcons.clipboardText, size: 22, color: NqFixed.heroAccent),
            const Spacer(),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Ltr(order?.orderNumber ?? '—',
                    style:
                        NqType.code(size: 14).copyWith(color: NqFixed.heroAccent)),
                const SizedBox(height: 2),
                Text(
                    order != null
                        ? '${order.route} · ${truckLabel(order.requiredTruckType)}'
                        : 'تفاصيل الطلب',
                    style: NqType.bodyStrong.copyWith(color: NqFixed.heroText)),
                const SizedBox(height: 2),
                Text(order != null ? fmtDate(order.pickupDate) : '',
                    style: NqType.caption
                        .copyWith(color: NqFixed.heroTextSecondary)),
              ],
            ),
          ],
        ),
      );

  Widget _searchField(NqColors c) => Container(
        height: 52,
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
                textAlign: TextAlign.right,
                style: NqType.body.copyWith(color: c.tx),
                cursorColor: c.mintS,
                decoration: InputDecoration(
                  isCollapsed: true,
                  border: InputBorder.none,
                  hintText: 'ابحث باسم السائق',
                  hintStyle: NqType.body.copyWith(color: c.tx3),
                ),
              ),
            ),
          ],
        ),
      );

  Widget _driverRow(NqColors c, DriverModel d,
      {bool selected = false, VoidCallback? onTap}) {
    final sub = d.totalTrips > 0
        ? '★ ${d.rating.toStringAsFixed(1)} · ${d.totalTrips} رحلة'
        : (d.licenseType != null ? 'رخصة ${d.licenseType}' : 'سائق جديد');
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: c.sf,
          borderRadius: BorderRadius.circular(NqRadius.card),
          border: Border.all(
              color: selected ? c.mintS : c.bd, width: selected ? 2 : 1),
        ),
        child: Row(
          children: [
            _radio(c, selected),
            const Spacer(),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(d.name, style: NqType.bodyStrong.copyWith(color: c.tx)),
                const SizedBox(height: 2),
                Text(sub, style: NqType.caption.copyWith(color: c.tx2)),
              ],
            ),
            const SizedBox(width: 12),
            Container(
              width: 44,
              height: 44,
              alignment: Alignment.center,
              decoration: BoxDecoration(color: c.sf2, shape: BoxShape.circle),
              child: Text(d.name.isNotEmpty ? d.name.substring(0, 1) : 'س',
                  style: NqType.h3.copyWith(color: c.tx2)),
            ),
          ],
        ),
      ),
    );
  }

  Widget _radio(NqColors c, bool selected) => Container(
        width: 26,
        height: 26,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: selected ? c.mintS : Colors.transparent,
          shape: BoxShape.circle,
          border: selected ? null : Border.all(color: c.bd, width: 2),
        ),
        child: selected
            ? NqIcon(NqIcons.check,
                size: 15, color: c.isDark ? c.onMint : Colors.white)
            : null,
      );

  Widget _footer(NqColors c, List<DriverModel> drivers) {
    DriverModel? selected;
    for (final d in drivers) {
      if (d.id == _selectedId) {
        selected = d;
        break;
      }
    }
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
      decoration: BoxDecoration(
        color: c.sf,
        border: Border(top: BorderSide(color: c.bd)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text('يصل للسائق إشعار فورًا · لا تظهر بياناته للعميل',
              style: NqType.caption.copyWith(color: c.tx2),
              textAlign: TextAlign.center),
          const SizedBox(height: 10),
          NqButton(
            label: selected != null
                ? 'تأكيد إسناد ${selected.name}'
                : 'اختر سائقًا',
            loading: _busy,
            locked: selected == null,
            onPressed: (selected == null || _busy)
                ? null
                : () => _confirm(selected!),
          ),
        ],
      ),
    );
  }

  Widget _pad(Widget child) =>
      Padding(padding: const EdgeInsets.symmetric(vertical: 40), child: Center(child: child));

  Widget _loader(NqColors c) => SizedBox(
        width: 30,
        height: 30,
        child: CircularProgressIndicator(strokeWidth: 2.5, color: c.mintTx),
      );

  Widget _errorState(NqColors c, String msg, VoidCallback onRetry) => Column(
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
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
              decoration: BoxDecoration(
                  color: c.mintBg,
                  borderRadius: BorderRadius.circular(NqRadius.pill)),
              child: Text('إعادة المحاولة',
                  style: NqType.labelStrong.copyWith(color: c.mintTx)),
            ),
          ),
        ],
      );
}
