import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';
import '../../core/widgets/nq_icon.dart';
import '../../design_system/availability_card.dart';
import '../../design_system/chip.dart';
import '../../design_system/waybill_card.dart' show RoutePoint;

/// Available trucks — the Trucks tab (Addendum-01 6a). Customers browse
/// provider truck availability (backhaul / available-now) and open one to send
/// a direct request.
class CustomerTrucksScreen extends StatefulWidget {
  const CustomerTrucksScreen({super.key});

  @override
  State<CustomerTrucksScreen> createState() => _CustomerTrucksScreenState();
}

class _CustomerTrucksScreenState extends State<CustomerTrucksScreen> {
  final _filters = {0: true, 1: true, 2: false};

  @override
  Widget build(BuildContext context) {
    final c = context.nq;
    return SafeArea(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _appBar(c),
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
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
              children: [
                NqAvailabilityCard(
                  isBackhaul: true,
                  date: 'الأربعاء 29/10 · 14:00',
                  origin: const RoutePoint('الرياض', 'السلي'),
                  destination: const RoutePoint('الدمام', 'وجهة الشاحنة'),
                  meta: const [
                    MetaItem(NqIcons.truckTrailer, 'تريلا سطحة'),
                    MetaItem(NqIcons.scales, '24 t', ltr: true),
                    MetaItem(NqIcons.ruler, '13.6 m', ltr: true),
                    MetaItem(NqIcons.path, '11 رحلة على المسار'),
                  ],
                  providerInitial: 'أ',
                  providerName: 'شركة الأفق للنقل',
                  providerMeta: '★ 4.8 · 312 رحلة',
                  price: '1,650',
                  onTap: () => context.push('/truck-detail'),
                ),
                const SizedBox(height: 14),
                NqAvailabilityCard(
                  isBackhaul: false,
                  date: 'اليوم · حتى 22:00',
                  origin: const RoutePoint('الرياض', 'الصناعية الثانية'),
                  destination: const RoutePoint('أي وجهة', 'مرن'),
                  destDim: true,
                  meta: const [
                    MetaItem(NqIcons.truckTrailer, 'تريلا سطحة'),
                    MetaItem(NqIcons.scales, '25 t', ltr: true),
                    MetaItem(NqIcons.userCircle, 'مزوّد فرد'),
                    MetaItem(NqIcons.path, '4 رحلات على المسار'),
                  ],
                  providerInitial: 'خ',
                  providerName: 'خالد الحربي',
                  providerMeta: '★ 4.9 · 87 رحلة',
                  priceNote: 'السعر بعد الطلب',
                  onTap: () => context.push('/truck-detail'),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _appBar(NqColors c) => Padding(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
        child: Row(
          children: [
            _filterButton(c),
            const Spacer(),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text('الشاحنات المتاحة', style: NqType.h1.copyWith(color: c.tx)),
                const SizedBox(height: 2),
                Text('18 شاحنة تناسب بحثك',
                    style: NqType.caption.copyWith(color: c.tx2)),
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
                        color: c.onMint, fontWeight: FontWeight.w700, fontSize: 11)),
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
          cell('من', 'الرياض', NqIcons.mapPin, c.mintS),
          Container(width: 1, height: 40, color: c.bd),
          cell('إلى', 'الدمام', NqIcons.flagCheckered, c.err),
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
              onTap: () => setState(() => _filters[i] = !(_filters[i] ?? false)),
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
}
