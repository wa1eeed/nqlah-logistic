import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/api_exception.dart';
import '../../core/fleet/fleet_repository.dart';
import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';
import '../../core/widgets/ltr.dart';
import '../../core/widgets/nq_icon.dart';

/// إدارة الصيانة — fleet-wide maintenance entry point. Lists the provider's
/// trucks; tapping one opens its maintenance schedule + log
/// (`/maintenance/:truckId`). Wired to `GET /fleet/trucks`.
class ProviderMaintenanceHubScreen extends ConsumerWidget {
  const ProviderMaintenanceHubScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = context.nq;
    final async = ref.watch(fleetTrucksProvider);
    return Scaffold(
      backgroundColor: c.bg,
      appBar: AppBar(
        backgroundColor: c.bg,
        elevation: 0,
        centerTitle: true,
        title: Text('إدارة الصيانة', style: NqType.h2.copyWith(color: c.tx)),
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
        error: (e, _) => Center(
          child: Text(e is ApiException ? e.message : 'تعذّر تحميل الأسطول.',
              style: NqType.body.copyWith(color: c.tx2)),
        ),
        data: (trucks) => trucks.isEmpty
            ? _empty(c)
            : RefreshIndicator(
                onRefresh: () => ref.refresh(fleetTrucksProvider.future),
                child: ListView.separated(
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
                  itemCount: trucks.length,
                  separatorBuilder: (_, _) => const SizedBox(height: 10),
                  itemBuilder: (_, i) => _truckRow(context, c, trucks[i]),
                ),
              ),
      ),
    );
  }

  Widget _empty(NqColors c) => Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            NqIcon(NqIcons.wrench, size: 40, color: c.tx3),
            const SizedBox(height: 12),
            Text('لا توجد شاحنات بعد',
                style: NqType.h2.copyWith(color: c.tx)),
            const SizedBox(height: 6),
            Text('أضف شاحنة إلى أسطولك لإدارة صيانتها.',
                style: NqType.body.copyWith(color: c.tx2), textAlign: TextAlign.center),
          ],
        ),
      );

  Widget _truckRow(BuildContext context, NqColors c, TruckModel t) {
    final inMaint = t.status.toUpperCase() == 'MAINTENANCE';
    return GestureDetector(
      onTap: () => context.push('/maintenance/${t.id}'),
      behavior: HitTestBehavior.opaque,
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: c.sf,
          borderRadius: BorderRadius.circular(NqRadius.card),
          border: Border.all(color: c.bd),
        ),
        child: Row(
          children: [
            NqIcon(NqIcons.caretLeft, size: 16, color: c.tx3),
            if (inMaint)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                margin: const EdgeInsets.only(left: 8),
                decoration: BoxDecoration(
                  color: c.warn.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(NqRadius.pill),
                ),
                child: Text('في الصيانة',
                    style: NqType.label.copyWith(color: c.warn)),
              ),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Ltr(t.plateNumber,
                      style: NqType.labelStrong.copyWith(color: c.tx)),
                  const SizedBox(height: 2),
                  Text([t.typeLabel, if (t.makeModel.isNotEmpty) t.makeModel].join(' · '),
                      style: NqType.caption.copyWith(color: c.tx2),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      textAlign: TextAlign.right),
                ],
              ),
            ),
            const SizedBox(width: 12),
            Container(
              width: 44,
              height: 44,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: c.sf2,
                borderRadius: BorderRadius.circular(NqRadius.input),
              ),
              child: NqIcon(NqIcons.wrench, size: 20, color: c.mintTx),
            ),
          ],
        ),
      ),
    );
  }
}
