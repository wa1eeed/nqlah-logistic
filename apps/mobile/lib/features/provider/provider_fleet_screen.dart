import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_exception.dart';
import '../../core/fleet/fleet_repository.dart';
import '../../core/marketplace/marketplace_repository.dart';
import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';
import '../../core/widgets/ltr.dart';
import '../../core/widgets/nq_icon.dart';
import '../../design_system/segmented.dart';
import 'truck_availability_sheet.dart';

/// Provider fleet (handoff 3e/3f) — trucks + drivers segments, wired to
/// `GET /fleet/trucks` and `GET /fleet/drivers`.
class ProviderFleetScreen extends ConsumerStatefulWidget {
  const ProviderFleetScreen({super.key, this.onAddDriver, this.onManagePlan});

  final VoidCallback? onAddDriver;
  final VoidCallback? onManagePlan;

  @override
  ConsumerState<ProviderFleetScreen> createState() =>
      _ProviderFleetScreenState();
}

class _ProviderFleetScreenState extends ConsumerState<ProviderFleetScreen> {
  int _seg = 1; // 0 = trucks, 1 = drivers
  final _search = TextEditingController();
  String _query = '';

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final c = context.nq;
    final trucks = ref.watch(fleetTrucksProvider);
    final drivers = ref.watch(fleetDriversProvider);
    final published = <String, MyAvailability>{
      for (final a in ref.watch(myAvailabilityProvider).valueOrNull ?? const [])
        a.truckId: a,
    };
    final truckCount = trucks.valueOrNull?.length;
    final driverCount = drivers.valueOrNull?.length;
    return SafeArea(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
            child: Row(
              children: [
                GestureDetector(
                  onTap: widget.onAddDriver,
                  child: Container(
                    width: 44,
                    height: 44,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: c.mint,
                      borderRadius: BorderRadius.circular(NqRadius.input),
                    ),
                    child: NqIcon(NqIcons.userPlus, size: 20, color: c.onMint),
                  ),
                ),
                const Spacer(),
                Text('الأسطول', style: NqType.h1.copyWith(color: c.tx)),
              ],
            ),
          ),
          const SizedBox(height: 16),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: NqSegmented(
              options: [
                'الشاحنات${truckCount != null ? ' $truckCount' : ''}',
                'السائقون${driverCount != null ? ' $driverCount' : ''}',
              ],
              index: _seg,
              onChanged: (i) => setState(() => _seg = i),
            ),
          ),
          const SizedBox(height: 14),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: _searchField(c),
          ),
          const SizedBox(height: 14),
          Expanded(
            child: _seg == 0
                ? _trucksView(c, trucks, published)
                : _driversView(c, drivers),
          ),
        ],
      ),
    );
  }

  Widget _driversView(NqColors c, AsyncValue<List<DriverModel>> async) {
    return RefreshIndicator(
      onRefresh: () => ref.refresh(fleetDriversProvider.future),
      color: c.mintTx,
      child: async.when(
        loading: () => _centered(_loader(c)),
        error: (e, _) => _centered(_errorState(
            c,
            e is ApiException ? e.message : 'تعذّر تحميل السائقين.',
            () => ref.invalidate(fleetDriversProvider))),
        data: (drivers) {
          final items = _query.isEmpty
              ? drivers
              : drivers.where((d) => d.name.contains(_query)).toList();
          if (items.isEmpty) return _centered(_empty(c, 'لا سائقون'));
          return ListView.separated(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
            itemCount: items.length,
            separatorBuilder: (_, _) => const SizedBox(height: 10),
            itemBuilder: (_, i) => _driverRow(c, items[i]),
          );
        },
      ),
    );
  }

  Widget _trucksView(NqColors c, AsyncValue<List<TruckModel>> async,
      Map<String, MyAvailability> published) {
    return RefreshIndicator(
      onRefresh: () {
        ref.invalidate(myAvailabilityProvider);
        return ref.refresh(fleetTrucksProvider.future);
      },
      color: c.mintTx,
      child: async.when(
        loading: () => _centered(_loader(c)),
        error: (e, _) => _centered(_errorState(
            c,
            e is ApiException ? e.message : 'تعذّر تحميل الشاحنات.',
            () => ref.invalidate(fleetTrucksProvider))),
        data: (trucks) {
          final items = _query.isEmpty
              ? trucks
              : trucks
                  .where((t) =>
                      t.plateNumber.contains(_query) ||
                      t.typeLabel.contains(_query))
                  .toList();
          if (items.isEmpty) return _centered(_empty(c, 'لا شاحنات'));
          return ListView.separated(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
            itemCount: items.length,
            separatorBuilder: (_, _) => const SizedBox(height: 10),
            itemBuilder: (_, i) =>
                _truckRow(c, items[i], published[items[i].id]),
          );
        },
      ),
    );
  }

  Widget _driverRow(NqColors c, DriverModel d) {
    final sub = d.totalTrips > 0
        ? '★ ${d.rating.toStringAsFixed(1)} · ${d.totalTrips} رحلة'
        : (d.phone ?? (d.licenseType != null ? 'رخصة ${d.licenseType}' : 'سائق'));
    return _rowCard(
      c,
      name: d.name,
      sub: sub,
      initial: d.name.isNotEmpty ? d.name.substring(0, 1) : 'س',
      status: _driverStatus(d.status),
    );
  }

  Widget _truckRow(NqColors c, TruckModel t, MyAvailability? availability) =>
      _rowCard(
        c,
        name: t.typeLabel,
        sub: t.makeModel.isNotEmpty ? t.makeModel : 'شاحنة',
        plate: t.plateNumber,
        initial: 'ش',
        status: _truckStatus(t.status),
        published: availability != null,
        onTap: () =>
            showTruckAvailabilitySheet(context, ref, t, availability),
      );

  Widget _rowCard(NqColors c,
      {required String name,
      required String sub,
      String? plate,
      required String initial,
      required (String, Color) status,
      bool published = false,
      VoidCallback? onTap}) {
    final card = Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
      decoration: BoxDecoration(
        color: c.sf,
        borderRadius: BorderRadius.circular(NqRadius.card),
        border: Border.all(color: published ? c.mint : c.bd),
      ),
      child: Row(
        children: [
          _statusPill(c, status.$1, status.$2),
          if (published) ...[
            const SizedBox(width: 8),
            _publishedPill(c),
          ],
          const Spacer(),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(name,
                  style: NqType.bodyStrong.copyWith(color: c.tx, fontSize: 16)),
              const SizedBox(height: 2),
              if (plate != null)
                Ltr(plate, style: NqType.code(size: 12).copyWith(color: c.tx2))
              else
                Text(sub, style: NqType.caption.copyWith(color: c.tx2)),
            ],
          ),
          const SizedBox(width: 12),
          Container(
            width: 44,
            height: 44,
            alignment: Alignment.center,
            decoration: BoxDecoration(color: c.sf2, shape: BoxShape.circle),
            child: Text(initial, style: NqType.h3.copyWith(color: c.tx2)),
          ),
        ],
      ),
    );
    if (onTap == null) return card;
    return GestureDetector(onTap: onTap, child: card);
  }

  Widget _publishedPill(NqColors c) => Container(
        height: 26,
        padding: const EdgeInsets.symmetric(horizontal: 10),
        decoration: BoxDecoration(
            color: c.mintBg, borderRadius: BorderRadius.circular(NqRadius.pill)),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          NqIcon(NqIcons.broadcast, size: 12, color: c.mintTx),
          const SizedBox(width: 5),
          Text('في السوق',
              style: NqType.caption
                  .copyWith(color: c.mintTx, fontWeight: FontWeight.w700)),
        ]),
      );

  (String, Color) _driverStatus(String s) {
    final c = context.nq;
    switch (s.toUpperCase()) {
      case 'AVAILABLE':
        return ('متاح', c.ok);
      case 'ON_TRIP':
        return ('في رحلة', c.info);
      case 'OFF_DUTY':
        return ('خارج الدوام', c.tx2);
      default:
        return (s, c.tx2);
    }
  }

  (String, Color) _truckStatus(String s) {
    final c = context.nq;
    switch (s.toUpperCase()) {
      case 'AVAILABLE':
        return ('متاحة', c.ok);
      case 'ON_TRIP':
        return ('في رحلة', c.info);
      case 'MAINTENANCE':
        return ('صيانة', c.warn);
      case 'OUT_OF_SERVICE':
        return ('متوقفة', c.err);
      default:
        return (s, c.tx2);
    }
  }

  Widget _statusPill(NqColors c, String label, Color color) => Container(
        height: 26,
        padding: const EdgeInsets.symmetric(horizontal: 10),
        decoration: BoxDecoration(
            color: color.withValues(alpha: 0.14),
            borderRadius: BorderRadius.circular(NqRadius.pill)),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          Container(
              width: 7,
              height: 7,
              decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
          const SizedBox(width: 6),
          Text(label,
              style: NqType.caption
                  .copyWith(color: color, fontWeight: FontWeight.w700)),
        ]),
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
                textAlign: TextAlign.right,
                style: NqType.body.copyWith(color: c.tx),
                cursorColor: c.mintS,
                decoration: InputDecoration(
                  isCollapsed: true,
                  border: InputBorder.none,
                  hintText: 'ابحث باسم السائق أو اللوحة',
                  hintStyle: NqType.body.copyWith(color: c.tx3),
                ),
              ),
            ),
          ],
        ),
      );

  Widget _centered(Widget child) => ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        children: [SizedBox(height: 420, child: Center(child: child))],
      );

  Widget _loader(NqColors c) => SizedBox(
        width: 30,
        height: 30,
        child: CircularProgressIndicator(strokeWidth: 2.5, color: c.mintTx),
      );

  Widget _empty(NqColors c, String msg) => Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          NqIcon(NqIcons.truck, size: 40, color: c.tx3),
          const SizedBox(height: 12),
          Text(msg, style: NqType.h3.copyWith(color: c.tx2)),
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
                    borderRadius: BorderRadius.circular(NqRadius.pill)),
                child: Text('إعادة المحاولة',
                    style: NqType.labelStrong.copyWith(color: c.mintTx)),
              ),
            ),
          ],
        ),
      );
}
