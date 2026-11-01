import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_exception.dart';
import '../../core/driver/driver_repository.dart';
import '../../core/orders/order_models.dart';
import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';
import '../../core/widgets/ltr.dart';
import '../../core/widgets/nq_icon.dart';
import '../../design_system/button.dart';
import '../../design_system/segmented.dart';

/// Employed-driver home — my trips (handoff 5a), wired to `GET /driver/jobs` +
/// `GET /driver/me`. Execution-only: no prices, no customer identity.
class DriverMyTripsScreen extends ConsumerStatefulWidget {
  const DriverMyTripsScreen({super.key, this.onAcknowledge, this.onOpenTrip});

  final void Function(String orderId)? onAcknowledge;
  final void Function(String orderId)? onOpenTrip;

  @override
  ConsumerState<DriverMyTripsScreen> createState() =>
      _DriverMyTripsScreenState();
}

class _DriverMyTripsScreenState extends ConsumerState<DriverMyTripsScreen> {
  int _seg = 0; // 0 new, 1 upcoming, 2 done
  bool _dutyBusy = false;

  /// Toggle «متفرّغ» (AVAILABLE) ↔ «منتهي الدوام» (OFF_DUTY). The server rejects
  /// the change mid-trip, so the pill is non-interactive while ON_TRIP.
  Future<void> _toggleDuty(DriverMe? me) async {
    if (_dutyBusy) return;
    final cur = (me?.status.toUpperCase() ?? 'OFF_DUTY');
    if (cur == 'ON_TRIP') return;
    final next = cur == 'AVAILABLE' ? 'OFF_DUTY' : 'AVAILABLE';
    setState(() => _dutyBusy = true);
    final messenger = ScaffoldMessenger.of(context);
    try {
      await ref.read(driverRepositoryProvider).setDuty(next);
      ref.invalidate(driverMeProvider);
    } on ApiException catch (e) {
      messenger.showSnackBar(SnackBar(content: Text(e.message)));
    } catch (_) {
      messenger.showSnackBar(const SnackBar(content: Text('تعذّر تغيير حالة الدوام.')));
    } finally {
      if (mounted) setState(() => _dutyBusy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = context.nq;
    final me = ref.watch(driverMeProvider).valueOrNull;
    final jobsAsync = ref.watch(driverJobsProvider);
    return SafeArea(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
            child: _header(c, me),
          ),
          const SizedBox(height: 16),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: NqSegmented(
              options: const ['جديدة', 'قادمة', 'مكتملة'],
              counts: _segCounts(jobsAsync.valueOrNull),
              // جديدة + قادمة are in-progress trips → red badge.
              dangerCounts: const {0, 1},
              index: _seg,
              onChanged: (i) => setState(() => _seg = i),
            ),
          ),
          const SizedBox(height: 14),
          Expanded(
            child: RefreshIndicator(
              onRefresh: () async {
                ref.invalidate(driverJobsProvider);
                ref.invalidate(driverMeProvider);
                await ref.read(driverJobsProvider.future);
              },
              color: c.mintTx,
              child: jobsAsync.when(
                loading: () => _centered(_loader(c)),
                error: (e, _) => _centered(_errorState(
                    c,
                    e is ApiException ? e.message : 'تعذّر تحميل الرحلات.',
                    () => ref.invalidate(driverJobsProvider))),
                data: (jobs) => _list(c, jobs),
              ),
            ),
          ),
        ],
      ),
    );
  }

  List<DriverJob> _bucket(List<DriverJob> jobs, int seg) {
    switch (seg) {
      case 0: // جديدة — assigned, awaiting acknowledge
        return jobs.where((j) => j.status.toUpperCase() == 'ASSIGNED').toList();
      case 1: // قادمة — confirmed / in transit
        return jobs
            .where((j) => const ['CONFIRMED', 'IN_TRANSIT']
                .contains(j.status.toUpperCase()))
            .toList();
      default: // مكتملة
        return jobs
            .where((j) => const ['DELIVERED', 'COMPLETED']
                .contains(j.status.toUpperCase()))
            .toList();
    }
  }

  List<int?> _segCounts(List<DriverJob>? jobs) {
    if (jobs == null) return const [null, null, null];
    return [for (var i = 0; i < 3; i++) _bucket(jobs, i).length];
  }

  Widget _list(NqColors c, List<DriverJob> jobs) {
    final items = _bucket(jobs, _seg);
    if (items.isEmpty) {
      return _centered(Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          NqIcon(NqIcons.path, size: 40, color: c.tx3),
          const SizedBox(height: 12),
          Text(
              _seg == 0
                  ? 'لا تكاليف جديدة'
                  : (_seg == 1 ? 'لا رحلات قادمة' : 'لا رحلات مكتملة'),
              style: NqType.h3.copyWith(color: c.tx2)),
        ],
      ));
    }
    return ListView.separated(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
      itemCount: items.length,
      separatorBuilder: (_, _) => const SizedBox(height: 12),
      itemBuilder: (_, i) =>
          _seg == 0 ? _newCard(c, items[i]) : _tripCard(c, items[i]),
    );
  }

  Widget _header(NqColors c, DriverMe? me) {
    final name = me?.name ?? 'السائق';
    final status = me?.status.toUpperCase() ?? 'OFF_DUTY';
    final onTrip = status == 'ON_TRIP';
    final available = status == 'AVAILABLE';
    final dotColor = onTrip ? c.info : (available ? c.ok : c.tx3);
    final bg = onTrip ? c.infoBg : (available ? c.okBg : c.sf2);
    final label = onTrip ? 'في رحلة' : (available ? 'متاح' : 'غير متاح');
    return Row(
      children: [
        GestureDetector(
          behavior: HitTestBehavior.opaque,
          onTap: onTrip ? null : () => _toggleDuty(me),
          child: Container(
            height: 32,
            padding: const EdgeInsets.symmetric(horizontal: 12),
            alignment: Alignment.center,
            decoration: BoxDecoration(
                color: bg, borderRadius: BorderRadius.circular(NqRadius.pill)),
            child: Row(mainAxisSize: MainAxisSize.min, children: [
              if (_dutyBusy)
                SizedBox(
                    width: 11,
                    height: 11,
                    child: CircularProgressIndicator(strokeWidth: 2, color: dotColor))
              else
                Container(
                    width: 7,
                    height: 7,
                    decoration: BoxDecoration(color: dotColor, shape: BoxShape.circle)),
              const SizedBox(width: 6),
              Text(label,
                  style: NqType.caption.copyWith(
                      color: onTrip ? c.info : (available ? c.ok : c.tx2),
                      fontWeight: FontWeight.w700)),
              if (!onTrip) ...[
                const SizedBox(width: 5),
                NqIcon(NqIcons.caretDown, size: 11, color: available ? c.ok : c.tx3),
              ],
            ]),
          ),
        ),
        const Spacer(),
        Text(name, style: NqType.h2.copyWith(color: c.tx)),
        const SizedBox(width: 12),
        Container(
          width: 52,
          height: 52,
          alignment: Alignment.center,
          decoration: BoxDecoration(color: c.hero, shape: BoxShape.circle),
          child: Text(name.isNotEmpty ? name.substring(0, 1) : 'س',
              style: NqType.h1.copyWith(color: NqFixed.heroText)),
        ),
      ],
    );
  }

  Widget _newCard(NqColors c, DriverJob j) => Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: c.sf,
          borderRadius: BorderRadius.circular(NqRadius.cardOverlap),
          border: Border.all(color: c.mintS, width: 2),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(children: [
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: BoxDecoration(
                    color: c.mintBg,
                    borderRadius: BorderRadius.circular(NqRadius.pill)),
                child: Row(mainAxisSize: MainAxisSize.min, children: [
                  NqIcon(NqIcons.bell, size: 14, color: c.mintTx),
                  const SizedBox(width: 6),
                  Text('تكليف جديد',
                      style: NqType.caption.copyWith(
                          color: c.mintTx, fontWeight: FontWeight.w700)),
                ]),
              ),
              const Spacer(),
              Ltr(j.orderNumber,
                  style: NqType.code(size: 14).copyWith(color: c.tx2)),
            ]),
            const SizedBox(height: 12),
            Text(j.route,
                style: NqType.driverTitle.copyWith(color: c.tx),
                textAlign: TextAlign.right),
            const SizedBox(height: 10),
            _detail(c, NqIcons.calendarBlank, fmtDate(j.pickupDate)),
            if (j.cargoDescription != null && j.cargoDescription!.isNotEmpty)
              _detail(c, NqIcons.package, j.cargoDescription!),
            _detail(c, NqIcons.mapPin,
                j.stopsCount > 0 ? '${j.stopsCount} توقفات' : 'استلام + تفريغ'),
            const SizedBox(height: 14),
            NqButton(
              label: 'استلام التكليف',
              icon: NqIcons.checkCircle,
              size: NqButtonSize.driver,
              onPressed: () => (widget.onAcknowledge ?? (_) {})(j.id),
            ),
            const SizedBox(height: 10),
            Text('أسندها لك مكتب الشركة · للاستفسار اتصل بالمكتب',
                style: NqType.caption.copyWith(color: c.tx2),
                textAlign: TextAlign.center),
          ],
        ),
      );

  Widget _tripCard(NqColors c, DriverJob j) {
    final inTransit = j.status.toUpperCase() == 'IN_TRANSIT';
    return GestureDetector(
      onTap: () => (widget.onOpenTrip ?? (_) {})(j.id),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: c.sf,
          borderRadius: BorderRadius.circular(NqRadius.card),
          border: Border.all(color: c.bd),
        ),
        child: Row(children: [
          Container(
            height: 28,
            padding: const EdgeInsets.symmetric(horizontal: 10),
            alignment: Alignment.center,
            decoration: BoxDecoration(
                color: inTransit ? c.infoBg : c.mintBg,
                borderRadius: BorderRadius.circular(NqRadius.pill)),
            child: Text(inTransit ? 'جارية' : 'مؤكّد',
                style: NqType.caption.copyWith(
                    color: inTransit ? c.info : c.mintTx,
                    fontWeight: FontWeight.w700)),
          ),
          const Spacer(),
          Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
            Text(j.route, style: NqType.h3.copyWith(color: c.tx)),
            const SizedBox(height: 2),
            Text(
                j.stopsCount > 0 ? '${j.stopsCount} توقفات' : 'استلام + تفريغ',
                style: NqType.caption.copyWith(color: c.tx2)),
          ]),
          const SizedBox(width: 12),
          Container(
            width: 64,
            padding: const EdgeInsets.symmetric(vertical: 8),
            decoration: BoxDecoration(
                color: c.sf2, borderRadius: BorderRadius.circular(NqRadius.button)),
            child: Column(children: [
              Ltr(fmtDate(j.pickupDate),
                  style: NqType.caption.copyWith(color: c.tx2)),
            ]),
          ),
        ]),
      ),
    );
  }

  Widget _detail(NqColors c, String icon, String text) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 4),
        child: Row(children: [
          const Spacer(),
          Flexible(
            child: Text(text,
                style: NqType.body.copyWith(color: c.tx),
                textAlign: TextAlign.right,
                overflow: TextOverflow.ellipsis),
          ),
          const SizedBox(width: 8),
          NqIcon(icon, size: 18, color: c.tx2),
        ]),
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
