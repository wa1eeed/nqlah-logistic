import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/marketplace/marketplace_repository.dart';
import '../../core/orders/order_models.dart' show cargoLabel, truckLabel;
import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';
import '../../core/widgets/currency_symbol.dart';
import '../../core/widgets/nq_icon.dart';
import '../../design_system/empty_state.dart';

/// The public available-loads marketplace (`GET /marketplace/loads`) — open
/// loads any carrier can bid on, browsable by guests, clients and carriers.
/// Browse-only: route, cargo, required truck type, budget and offer count.
class LoadsMarketScreen extends ConsumerWidget {
  const LoadsMarketScreen({super.key, this.showBack = false});

  final bool showBack;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = context.nq;
    final async = ref.watch(marketplaceLoadsProvider(null));

    return Scaffold(
      backgroundColor: c.bg,
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
              child: Row(
                children: [
                  if (showBack) ...[
                    GestureDetector(
                      behavior: HitTestBehavior.opaque,
                      onTap: () => Navigator.of(context).maybePop(),
                      child: NqIcon(NqIcons.arrowRight, size: 22, color: c.tx),
                    ),
                    const SizedBox(width: 12),
                  ],
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('الحمولات المتاحة',
                            style: NqType.h2.copyWith(color: c.tx)),
                        Text('حمولات منشورة في السوق بانتظار عروض الناقلين',
                            style: NqType.caption.copyWith(color: c.tx2)),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            Expanded(
              child: async.when(
                loading: () =>
                    const Center(child: CircularProgressIndicator()),
                error: (e, _) => const NqEmptyState(
                  icon: NqIcons.warningCircle,
                  title: 'تعذّر تحميل الحمولات',
                  message: 'اسحب للأسفل للتحديث',
                ),
                data: (loads) {
                  if (loads.isEmpty) {
                    return const NqEmptyState(
                      icon: NqIcons.package,
                      title: 'لا توجد حمولات متاحة',
                      message: 'تظهر هنا الحمولات المنشورة في السوق',
                    );
                  }
                  return RefreshIndicator(
                    color: c.mintTx,
                    onRefresh: () async =>
                        ref.invalidate(marketplaceLoadsProvider(null)),
                    child: ListView.separated(
                      padding: const EdgeInsets.fromLTRB(16, 4, 16, 16),
                      itemCount: loads.length,
                      separatorBuilder: (_, _) => const SizedBox(height: 12),
                      itemBuilder: (_, i) => _LoadCard(load: loads[i]),
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _LoadCard extends StatelessWidget {
  const _LoadCard({required this.load});

  final LoadListing load;

  @override
  Widget build(BuildContext context) {
    final c = context.nq;
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: c.sf,
        borderRadius: BorderRadius.circular(NqRadius.card),
        border: Border.all(color: c.bd),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Route
          Row(
            children: [
              NqIcon(NqIcons.mapPin, size: 16, color: c.mintTx),
              const SizedBox(width: 6),
              Flexible(
                child: Text(
                  '${load.originCity} ← ${load.destinationCity}',
                  style: NqType.bodyStrong.copyWith(color: c.tx),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              _chip(c, NqIcons.package, cargoLabel(load.cargoType)),
              _chip(c, NqIcons.truck, truckLabel(load.requiredTruckType)),
              _chip(
                c,
                NqIcons.handCoins,
                load.bidsCount == 0
                    ? 'بلا عروض'
                    : '${load.bidsCount} عرض',
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Text(
                load.isFixedPrice ? 'سعر ثابت' : 'ميزانية تقديرية',
                style: NqType.caption.copyWith(color: c.tx2),
              ),
              const Spacer(),
              if (load.clientBudget != null) ...[
                Text(
                  load.clientBudget!.toStringAsFixed(0),
                  style: NqType.numeric(16, FontWeight.w700).copyWith(color: c.tx),
                  textDirection: TextDirection.ltr,
                ),
                const SizedBox(width: 3),
                CurrencySymbol(style: NqType.caption.copyWith(color: c.tx2)),
              ] else
                Text('مفتوح للعروض',
                    style: NqType.labelStrong.copyWith(color: c.mintTx)),
            ],
          ),
        ],
      ),
    );
  }

  Widget _chip(NqColors c, String icon, String label) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: c.sf2,
          borderRadius: BorderRadius.circular(NqRadius.pill),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            NqIcon(icon, size: 14, color: c.tx2),
            const SizedBox(width: 5),
            Text(label, style: NqType.caption.copyWith(color: c.tx2)),
          ],
        ),
      );
}
