import 'package:flutter/material.dart';

import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';
import '../../core/widgets/nq_icon.dart';
import '../../design_system/availability_card.dart' show MetaItem;
import '../../design_system/load_card.dart';

/// Provider available loads / marketplace (handoff 1f).
class ProviderLoadsScreen extends StatelessWidget {
  const ProviderLoadsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final c = context.nq;
    return SafeArea(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
            child: Row(
              children: [
                Text('24 حمولة', style: NqType.label.copyWith(color: c.tx2)),
                const Spacer(),
                Text('الأحمال المتاحة', style: NqType.h1.copyWith(color: c.tx)),
              ],
            ),
          ),
          const SizedBox(height: 14),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              children: [
                _filterButton(c),
                const SizedBox(width: 12),
                Expanded(child: _searchField(c)),
              ],
            ),
          ),
          const SizedBox(height: 12),
          SizedBox(
            height: 36,
            child: ListView(
              scrollDirection: Axis.horizontal,
              reverse: true,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              children: [
                _activeChip(c, 'تريلا سطحة'),
                const SizedBox(width: 8),
                _activeChip(c, 'من الدمام'),
                const SizedBox(width: 8),
                _activeChip(c, 'هذا الأسبوع'),
                const SizedBox(width: 8),
                _clearAll(c),
              ],
            ),
          ),
          const SizedBox(height: 12),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
              children: [
                NqLoadCard(
                  isTender: false,
                  postedAgo: 'نُشر قبل 12 د',
                  originCity: 'الدمام',
                  originArea: 'الميناء',
                  destCity: 'الرياض',
                  destDistance: '398 km',
                  midStop: '+1 توقف',
                  meta: const [
                    MetaItem(NqIcons.package, 'حديد تسليح · 24 t'),
                    MetaItem(NqIcons.calendarBlank, 'الأربعاء 07:00 · 29/10'),
                    MetaItem(NqIcons.truck, 'تريلا سطحة'),
                    MetaItem(NqIcons.handCoins, 'الدفع عند التسليم'),
                  ],
                  price: '3,200',
                  onAccept: () {},
                  onTap: () {},
                ),
                const SizedBox(height: 16),
                NqLoadCard(
                  isTender: true,
                  countdown: '05:42:10',
                  originCity: 'الجبيل',
                  originArea: 'الصناعية',
                  destCity: 'جدة',
                  destDistance: '1,312 km',
                  offersText: '7 عروض مقدّمة',
                  onBid: () {},
                  onTap: () {},
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

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
                child: Text('3',
                    style: NqType.caption.copyWith(
                        color: c.onMint, fontWeight: FontWeight.w700, fontSize: 11)),
              ),
            ),
          ],
        ),
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
              child: Text('مدينة، رقم الطلب، حاوية',
                  style: NqType.body.copyWith(color: c.tx3),
                  textAlign: TextAlign.right),
            ),
          ],
        ),
      );

  Widget _activeChip(NqColors c, String label) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 12),
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: c.mintBg,
          borderRadius: BorderRadius.circular(NqRadius.pill),
        ),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          Text(label,
              style: NqType.label
                  .copyWith(color: c.mintTx, fontWeight: FontWeight.w700)),
          const SizedBox(width: 6),
          NqIcon(NqIcons.x, size: 13, color: c.mintTx),
        ]),
      );

  Widget _clearAll(NqColors c) => Container(
        alignment: Alignment.center,
        child: Text('مسح الكل',
            style: NqType.labelStrong.copyWith(color: c.mintTx)),
      );
}
