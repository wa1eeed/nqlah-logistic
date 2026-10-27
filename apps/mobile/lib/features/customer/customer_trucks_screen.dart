import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/marketplace/marketplace_repository.dart';
import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';
import '../../core/widgets/nq_icon.dart';
import '../../design_system/availability_card.dart';
import '../../design_system/chip.dart';
import '../../design_system/waybill_card.dart' show RoutePoint;

/// Available trucks — the Trucks tab (Addendum-01 6a). Customers browse
/// provider truck availability and open one to send a direct request. Chrome
/// (filter button, route selector, chips, sort row) matches the 6a design; the
/// card list is wired to `GET /marketplace/trucks`.
class CustomerTrucksScreen extends ConsumerStatefulWidget {
  const CustomerTrucksScreen({super.key});

  @override
  ConsumerState<CustomerTrucksScreen> createState() =>
      _CustomerTrucksScreenState();
}

class _CustomerTrucksScreenState extends ConsumerState<CustomerTrucksScreen> {
  final _filters = {0: true, 1: true, 2: false};
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
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: _routeSelector(c),
          ),
          const SizedBox(height: 12),
          _filterChips(c),
          const SizedBox(height: 12),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: _sortRow(c),
          ),
          const SizedBox(height: 14),
          Expanded(
            child: RefreshIndicator(
              onRefresh: () =>
                  ref.refresh(marketplaceTrucksProvider(_city).future),
              child: async.when(
                loading: () =>
                    const _CenterFill(child: CircularProgressIndicator()),
                error: (e, _) => _ErrorState(
                  message: '$e',
                  onRetry: () =>
                      ref.invalidate(marketplaceTrucksProvider(_city)),
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
        const MetaItem(NqIcons.userCircle, 'مزوّد'),
      MetaItem(NqIcons.path,
          t.originRegion.isNotEmpty ? t.originRegion : t.originCity),
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
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _filterButton(c),
            const Spacer(),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text('الشاحنات المتاحة', style: NqType.h1.copyWith(color: c.tx)),
                const SizedBox(height: 2),
                Text(
                  count == null
                      ? 'الشاحنات المتاحة للطلب المباشر'
                      : '$count شاحنة تناسب بحثك',
                  style: NqType.caption.copyWith(color: c.tx2),
                ),
              ],
            ),
          ],
        ),
      );

  Widget _filterButton(NqColors c) => SizedBox(
        width: 48,
        height: 48,
        child: Stack(
          clipBehavior: Clip.none,
          children: [
            Container(
              width: 48,
              height: 48,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: c.hero,
                borderRadius: BorderRadius.circular(NqRadius.input),
              ),
              child: NqIcon(NqIcons.slidersHorizontal,
                  size: 20, color: NqFixed.heroText),
            ),
            PositionedDirectional(
              top: -4,
              start: -4,
              child: Container(
                width: 20,
                height: 20,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: c.mint,
                  shape: BoxShape.circle,
                  border: Border.all(color: c.bg, width: 2),
                ),
                child: Text('2',
                    style: NqType.caption.copyWith(
                        color: c.onMint,
                        fontWeight: FontWeight.w700,
                        fontSize: 11)),
              ),
            ),
          ],
        ),
      );

  Widget _routeSelector(NqColors c) {
    Widget cell(String label, String value, String icon, Color iconColor) =>
        Expanded(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(label, style: NqType.caption.copyWith(color: c.tx2)),
                const SizedBox(height: 2),
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(value, style: NqType.bodyStrong.copyWith(color: c.tx)),
                    const SizedBox(width: 6),
                    NqIcon(icon, fill: true, size: 16, color: iconColor),
                  ],
                ),
              ],
            ),
          ),
        );
    return Container(
      decoration: BoxDecoration(
        color: c.sf,
        borderRadius: BorderRadius.circular(NqRadius.button),
        border: Border.all(color: c.bd),
      ),
      child: Row(
        children: [
          cell('من', _city ?? 'كل المدن', NqIcons.mapPin, c.mintS),
          Container(width: 1, height: 40, color: c.bd),
          cell('إلى', 'أي وجهة', NqIcons.flagCheckered, c.err),
        ],
      ),
    );
  }

  Widget _filterChips(NqColors c) {
    const labels = ['هذا الأسبوع', 'تريلا سطحة', 'رحلات العودة فقط'];
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Row(
        children: [
          for (var i = 0; i < labels.length; i++) ...[
            NqChip(
              label: labels[i],
              selected: _filters[i] ?? false,
              onTap: () =>
                  setState(() => _filters[i] = !(_filters[i] ?? false)),
            ),
            if (i < labels.length - 1) const SizedBox(width: 8),
          ],
        ],
      ),
    );
  }

  Widget _sortRow(NqColors c) => Row(
        children: [
          Row(
            children: [
              NqIcon(NqIcons.mapTrifold, size: 16, color: c.mintTx),
              const SizedBox(width: 6),
              Text('عرض على الخريطة',
                  style: NqType.labelStrong.copyWith(color: c.mintTx)),
            ],
          ),
          const Spacer(),
          Text('الأقرب موعدًا أولًا', style: NqType.label.copyWith(color: c.tx2)),
        ],
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
    final isToday =
        f.year == now.year && f.month == now.month && f.day == now.day;
    final hhmm =
        '${f.hour.toString().padLeft(2, '0')}:${f.minute.toString().padLeft(2, '0')}';
    if (isToday) return 'اليوم · $hhmm';
    return '${f.day} ${months[f.month]} · $hhmm';
  }
}

class _CenterFill extends StatelessWidget {
  const _CenterFill({required this.child});
  final Widget child;
  @override
  Widget build(BuildContext context) => ListView(
        children: [
          SizedBox(
            height: MediaQuery.of(context).size.height * 0.5,
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
          Text('لا توجد شاحنات متاحة لهذا المسار',
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
