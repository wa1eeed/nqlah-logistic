import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/marketplace/marketplace_repository.dart';
import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';
import '../../core/widgets/nq_icon.dart';
import '../../design_system/availability_card.dart';
import '../../design_system/waybill_card.dart' show RoutePoint;

/// Available trucks — the Trucks tab (Addendum-01 6a). Customers browse
/// provider truck availability (directed / available-now) and open one to send
/// a direct request. Wired to `GET /marketplace/trucks`.
class CustomerTrucksScreen extends ConsumerStatefulWidget {
  const CustomerTrucksScreen({super.key});

  @override
  ConsumerState<CustomerTrucksScreen> createState() => _CustomerTrucksScreenState();
}

class _CustomerTrucksScreenState extends ConsumerState<CustomerTrucksScreen> {
  // A null city shows every listing; a value filters by origin city.
  String? _city;

  @override
  Widget build(BuildContext context) {
    final c = context.nq;
    final async = ref.watch(marketplaceTrucksProvider(_city));
    return SafeArea(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _appBar(c, async.valueOrNull?.length),
          const SizedBox(height: 14),
          Expanded(
            child: RefreshIndicator(
              onRefresh: () => ref.refresh(marketplaceTrucksProvider(_city).future),
              child: async.when(
                loading: () => const _CenterFill(child: CircularProgressIndicator()),
                error: (e, _) => _ErrorState(
                  message: '$e',
                  onRetry: () => ref.invalidate(marketplaceTrucksProvider(_city)),
                ),
                data: (listings) => listings.isEmpty
                    ? const _EmptyState()
                    : ListView.separated(
                        padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                        itemCount: listings.length,
                        separatorBuilder: (_, _) => const SizedBox(height: 14),
                        itemBuilder: (_, i) => _card(c, listings[i]),
                      ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _card(NqColors c, TruckListing t) {
    final meta = <MetaItem>[
      MetaItem(NqIcons.truckTrailer, t.truckTypeLabel2),
      if (t.capacity != null)
        MetaItem(NqIcons.scales, '${_fmtNum(t.capacity!)} t', ltr: true)
      else
        const MetaItem(NqIcons.truck, 'شاحنة'),
      if (t.refrigerated)
        const MetaItem(NqIcons.tag, 'مبرّدة')
      else if (t.makeModel.isNotEmpty)
        MetaItem(NqIcons.package, t.makeModel)
      else
        const MetaItem(NqIcons.package, 'شاحنة نقل'),
      MetaItem(NqIcons.mapPin, t.originRegion.isNotEmpty ? t.originRegion : t.originCity),
    ];
    return NqAvailabilityCard(
      isBackhaul: t.isDirected,
      date: _availabilityLabel(t),
      origin: RoutePoint(t.originCity, t.originRegion),
      destination: t.isDirected
          ? RoutePoint(t.destCity!, t.destRegion ?? '')
          : const RoutePoint('أي وجهة', 'مرن'),
      destDim: !t.isDirected,
      meta: meta,
      providerInitial: t.company.initial,
      providerName: t.company.name,
      providerMeta: [t.company.city, t.company.region]
          .where((p) => p != null && p.isNotEmpty)
          .join(' · '),
      price: t.pricePerTrip != null ? _fmtNum(t.pricePerTrip!) : null,
      priceNote: t.pricePerTrip == null ? 'السعر بعد الطلب' : null,
      onTap: () => context.push('/truck-detail', extra: t),
    );
  }

  Widget _appBar(NqColors c, int? count) => Padding(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
        child: Row(
          children: [
            const Spacer(),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text('الشاحنات المتاحة', style: NqType.h1.copyWith(color: c.tx)),
                const SizedBox(height: 2),
                Text(
                  count == null
                      ? 'الشاحنات المتاحة للطلب المباشر'
                      : '$count شاحنة متاحة الآن',
                  style: NqType.caption.copyWith(color: c.tx2),
                ),
              ],
            ),
          ],
        ),
      );

  static String _fmtNum(num v) {
    final s = v.toStringAsFixed(v == v.roundToDouble() ? 0 : 1);
    final parts = s.split('.');
    final intPart = parts[0].replaceAllMapped(
      RegExp(r'(\d)(?=(\d{3})+$)'),
      (m) => '${m[1]},',
    );
    return parts.length > 1 ? '$intPart.${parts[1]}' : intPart;
  }

  static String _availabilityLabel(TruckListing t) {
    final from = t.availableFrom;
    if (from == null) return 'متاحة الآن';
    const months = [
      '', 'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
      'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
    ];
    final now = DateTime.now();
    final f = from.toLocal();
    final isToday = f.year == now.year && f.month == now.month && f.day == now.day;
    if (isToday) return 'متاحة اليوم';
    return 'متاحة من ${f.day} ${months[f.month]}';
  }
}

class _CenterFill extends StatelessWidget {
  const _CenterFill({required this.child});
  final Widget child;
  @override
  Widget build(BuildContext context) => ListView(
        children: [
          SizedBox(
            height: MediaQuery.of(context).size.height * 0.6,
            child: Center(child: child),
          ),
        ],
      );
}

class _EmptyState extends StatelessWidget {
  const _EmptyState();
  @override
  Widget build(BuildContext context) {
    final c = context.nq;
    return _CenterFill(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          NqIcon(NqIcons.truck, size: 40, color: c.tx3),
          const SizedBox(height: 12),
          Text('لا توجد شاحنات متاحة حاليًا',
              style: NqType.bodyStrong.copyWith(color: c.tx)),
          const SizedBox(height: 4),
          Text('اسحب للتحديث · تظهر هنا الشاحنات الخاملة المنشورة',
              style: NqType.caption.copyWith(color: c.tx2),
              textAlign: TextAlign.center),
        ],
      ),
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
    return _CenterFill(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          NqIcon(NqIcons.warningCircle, size: 40, color: c.err),
          const SizedBox(height: 12),
          Text('تعذّر تحميل الشاحنات',
              style: NqType.bodyStrong.copyWith(color: c.tx)),
          const SizedBox(height: 12),
          TextButton(onPressed: onRetry, child: const Text('إعادة المحاولة')),
        ],
      ),
    );
  }
}
