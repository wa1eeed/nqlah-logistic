import 'package:flutter/material.dart';

import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';
import '../../core/widgets/ltr.dart';
import '../../core/widgets/nq_icon.dart';
import '../../design_system/button.dart';
import '../../design_system/status_chip.dart';
import '../../design_system/waybill_card.dart';

/// Customer home (handoff 1a + Addendum 01 §0: wallet button in the header).
class CustomerHomeScreen extends StatelessWidget {
  const CustomerHomeScreen({super.key, this.onNewOrder, this.onWallet});

  final VoidCallback? onNewOrder;
  final VoidCallback? onWallet;

  @override
  Widget build(BuildContext context) {
    final c = context.nq;
    return ListView(
      padding: EdgeInsets.zero,
      children: [
        Stack(
          clipBehavior: Clip.none,
          children: [
            _hero(context, c),
            Positioned(
              left: 16,
              right: 16,
              bottom: -38,
              child: _kpiStrip(c),
            ),
          ],
        ),
        const SizedBox(height: 38 + 20),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              _sectionHeader(c, 'شحنات نشطة', 'عرض الكل'),
              const SizedBox(height: 10),
              NqWaybillCard(
                code: 'NQ-24-08812',
                subtitle: 'مجمّع · رحلتان',
                status: NqStatus.inTransit,
                origin: const RoutePoint('الدمام', 'ميناء الملك عبدالعزيز'),
                destination: const RoutePoint('الرياض', 'الصناعية الثانية'),
                liveText: 'مباشر · آخر تحديث قبل 2 د',
                stopCounter: 'التوقف 2/3',
                truckType: 'تريلا سطحة',
                plate: '7342 KHD',
                containerNo: 'TGHU 771392-0',
                onTap: () {},
              ),
              const SizedBox(height: 14),
              _offersAlert(c),
              const SizedBox(height: 20),
              Text('أعد الطلب', style: NqType.h2.copyWith(color: c.tx)),
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(child: _reorderChip(c, 'الرياض ← الجبيل')),
                  const SizedBox(width: 10),
                  Expanded(child: _reorderChip(c, 'بريدة ← جدة')),
                ],
              ),
              const SizedBox(height: 24),
            ],
          ),
        ),
      ],
    );
  }

  Widget _hero(BuildContext context, NqColors c) {
    return Container(
      color: c.hero,
      padding: EdgeInsets.fromLTRB(
          16, MediaQuery.of(context).padding.top + 12, 16, 56),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              _avatar(c, 'ر'),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('مساء الخير',
                        style: NqType.caption
                            .copyWith(color: NqFixed.heroTextSecondary)),
                    Text('مصنع الرّواد للبلاستيك',
                        style: NqType.h3.copyWith(color: NqFixed.heroText)),
                  ],
                ),
              ),
              _headerBtn(c, NqIcons.wallet, dotColor: const Color(0xFFFBBF24), onTap: onWallet),
              const SizedBox(width: 8),
              _headerBtn(c, NqIcons.bell, dotColor: NqFixed.heroAccent),
            ],
          ),
          const SizedBox(height: 24),
          Text('إلى أين تتجه شحنتك اليوم؟',
              style: NqType.display.copyWith(color: NqFixed.heroText)),
          const SizedBox(height: 18),
          NqButton(
            label: 'طلب نقل جديد',
            icon: NqIcons.plus,
            size: NqButtonSize.hero,
            onPressed: onNewOrder ?? () {},
          ),
        ],
      ),
    );
  }

  Widget _avatar(NqColors c, String initial) => Container(
        width: 44,
        height: 44,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: NqFixed.heroFill2,
          borderRadius: BorderRadius.circular(NqRadius.input),
        ),
        child: Text(initial, style: NqType.h3.copyWith(color: NqFixed.heroText)),
      );

  Widget _headerBtn(NqColors c, String icon, {Color? dotColor, VoidCallback? onTap}) {
    return GestureDetector(
      onTap: onTap,
      child: SizedBox(
        width: 44,
        height: 44,
        child: Stack(
          children: [
            Container(
              width: 44,
              height: 44,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: NqFixed.heroFill2,
                borderRadius: BorderRadius.circular(NqRadius.input),
              ),
              child: NqIcon(icon, size: 22, color: NqFixed.heroText),
            ),
            if (dotColor != null)
              PositionedDirectional(
                top: 10,
                start: 10,
                child: Container(
                  width: 8,
                  height: 8,
                  decoration: BoxDecoration(
                    color: dotColor,
                    shape: BoxShape.circle,
                    border: Border.all(color: c.hero, width: 2),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _kpiStrip(NqColors c) {
    Widget col(String value, String label, Color valueColor) => Expanded(
          child: Column(
            children: [
              Ltr(value, style: NqType.numeric(22, FontWeight.w700).copyWith(color: valueColor)),
              const SizedBox(height: 2),
              Text(label,
                  style: NqType.caption.copyWith(color: c.tx2),
                  textAlign: TextAlign.center),
            ],
          ),
        );
    Widget divider() => Container(width: 1, height: 36, color: c.bd);
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 14),
      decoration: BoxDecoration(
        color: c.sf,
        borderRadius: BorderRadius.circular(NqRadius.cardOverlap),
        boxShadow: c.isDark
            ? null
            : [
                BoxShadow(
                    color: const Color(0x240A1A19),
                    blurRadius: 24,
                    offset: const Offset(0, 8),
                    spreadRadius: -12),
              ],
        border: c.isDark ? Border.all(color: c.bd) : null,
      ),
      child: Row(
        children: [
          col('4', 'شحنات نشطة', c.tx),
          divider(),
          col('2', 'بانتظار العروض', c.info),
          divider(),
          col('1', 'تحتاج إجراءك', c.warn),
        ],
      ),
    );
  }

  Widget _sectionHeader(NqColors c, String title, String action) {
    return Row(
      children: [
        Text(action, style: NqType.labelStrong.copyWith(color: c.mintTx)),
        const Spacer(),
        Text(title, style: NqType.h2.copyWith(color: c.tx)),
      ],
    );
  }

  Widget _offersAlert(NqColors c) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: c.warnBg,
        borderRadius: BorderRadius.circular(NqRadius.card),
      ),
      child: Row(
        children: [
          NqIcon(NqIcons.caretLeft, size: 18, color: c.tx3),
          const Spacer(),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text('3 عروض بانتظار قرارك',
                  style: NqType.bodyStrong.copyWith(color: c.tx)),
              const SizedBox(height: 2),
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text('تنتهي خلال 5h',
                      style: NqType.caption.copyWith(color: c.tx2)),
                  Text(' · جدة ← مكة · ',
                      style: NqType.caption.copyWith(color: c.tx2)),
                  Ltr('NQ-24-08840',
                      style: NqType.code(size: 12).copyWith(color: c.tx2)),
                ],
              ),
            ],
          ),
          const SizedBox(width: 12),
          Container(
            width: 44,
            height: 44,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: c.sf,
              borderRadius: BorderRadius.circular(NqRadius.input),
            ),
            child: NqIcon(NqIcons.handCoins, size: 22, color: c.warn),
          ),
        ],
      ),
    );
  }

  Widget _reorderChip(NqColors c, String route) {
    return Container(
      height: 44,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: c.sf,
        borderRadius: BorderRadius.circular(NqRadius.pill),
        border: Border.all(color: c.bd),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        mainAxisSize: MainAxisSize.min,
        children: [
          NqIcon(NqIcons.arrowCounterClockwise, size: 16, color: c.mintTx),
          const SizedBox(width: 8),
          Flexible(
            child: Text(route,
                style: NqType.label.copyWith(color: c.tx),
                overflow: TextOverflow.ellipsis),
          ),
        ],
      ),
    );
  }
}
