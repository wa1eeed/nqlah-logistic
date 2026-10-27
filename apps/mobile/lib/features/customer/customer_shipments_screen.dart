import 'package:flutter/material.dart';

import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';
import '../../core/widgets/nq_icon.dart';
import '../../design_system/segmented.dart';
import '../../design_system/shipment_card.dart';
import '../../design_system/status_chip.dart';

/// Customer "my shipments" (handoff 4g): segmented (active/drafts/completed),
/// search, and compact shipment cards.
class CustomerShipmentsScreen extends StatefulWidget {
  const CustomerShipmentsScreen({super.key});

  @override
  State<CustomerShipmentsScreen> createState() =>
      _CustomerShipmentsScreenState();
}

class _CustomerShipmentsScreenState extends State<CustomerShipmentsScreen> {
  int _seg = 0;

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
                _filterButton(c),
                const Spacer(),
                Text('شحناتي', style: NqType.h1.copyWith(color: c.tx)),
              ],
            ),
          ),
          const SizedBox(height: 16),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: NqSegmented(
              options: const ['نشطة 4', 'مسودات 1', 'مكتملة 28'],
              index: _seg,
              onChanged: (i) => setState(() => _seg = i),
            ),
          ),
          const SizedBox(height: 12),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: _searchField(c),
          ),
          const SizedBox(height: 12),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
              children: [
                NqShipmentCard(
                  code: 'NQ-24-08812',
                  status: NqStatus.inTransit,
                  route: 'الدمام ← الرياض',
                  progress: 0.75,
                  progressColor: c.info,
                  statusLine: _line(c, NqIcons.broadcast, c.mintTx,
                      'التوقف 2/3 · الوصول 14:20'),
                  onTap: () {},
                ),
                const SizedBox(height: 10),
                NqShipmentCard(
                  code: 'NQ-24-08840',
                  status: NqStatus.tender,
                  route: 'جدة ← مكة',
                  statusLine: _richLine(c, NqIcons.handCoins, c.warn, [
                    TextSpan(
                        text: '3 عروض',
                        style: NqType.labelStrong.copyWith(color: c.warn)),
                    TextSpan(
                        text: ' · تنتهي خلال 5h',
                        style: NqType.label.copyWith(color: c.tx2)),
                  ]),
                  onTap: () {},
                ),
                const SizedBox(height: 10),
                NqShipmentCard(
                  code: 'NQ-24-08856',
                  status: NqStatus.assigned,
                  route: 'الدمام ← الرياض',
                  statusLine: _line(c, NqIcons.steeringWheel, c.tx2,
                      'تم إسناد سائق · الأربعاء 07:00'),
                  onTap: () {},
                ),
                const SizedBox(height: 10),
                NqShipmentCard(
                  code: 'NQ-24-08790',
                  status: NqStatus.containerReturnPending,
                  route: 'الجبيل ← الرياض',
                  statusLine: _line(c, NqIcons.package, c.tx2,
                      'تم تسليم البضاعة · الحاوية لم تُرجع بعد'),
                  onTap: () {},
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _filterButton(NqColors c) => Container(
        width: 44,
        height: 44,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: c.hero,
          borderRadius: BorderRadius.circular(NqRadius.input),
        ),
        child: NqIcon(NqIcons.slidersHorizontal,
            size: 20, color: NqFixed.heroText),
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
            Text('رقم الطلب، مدينة، حاوية',
                style: NqType.body.copyWith(color: c.tx3)),
          ],
        ),
      );

  Widget _line(NqColors c, String icon, Color iconColor, String text) => Row(
        children: [
          NqIcon(icon, size: 16, color: iconColor),
          const SizedBox(width: 6),
          Expanded(
            child: Text(text,
                style: NqType.label.copyWith(color: c.tx2),
                textAlign: TextAlign.right),
          ),
        ],
      );

  Widget _richLine(
          NqColors c, String icon, Color iconColor, List<TextSpan> spans) =>
      Row(
        children: [
          NqIcon(icon, size: 16, color: iconColor),
          const SizedBox(width: 6),
          Expanded(
            child: Text.rich(TextSpan(children: spans),
                textAlign: TextAlign.right),
          ),
        ],
      );
}
