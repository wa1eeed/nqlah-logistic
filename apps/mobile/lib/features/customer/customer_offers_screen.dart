import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';
import '../../core/widgets/ltr.dart';
import '../../core/widgets/nq_icon.dart';
import '../../design_system/chip.dart';
import '../../design_system/offer_card.dart';

/// Customer offers compare (handoff 4f): tender countdown, sort chips, and
/// offer cards with the best one highlighted.
class CustomerOffersScreen extends StatefulWidget {
  const CustomerOffersScreen({super.key});

  @override
  State<CustomerOffersScreen> createState() => _CustomerOffersScreenState();
}

class _CustomerOffersScreenState extends State<CustomerOffersScreen> {
  int _sort = 0;

  @override
  Widget build(BuildContext context) {
    final c = context.nq;
    return SafeArea(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _appBar(c),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
              children: [
                _countdownBanner(c),
                const SizedBox(height: 14),
                _sortChips(c),
                const SizedBox(height: 18),
                NqOfferCard(
                  initial: 'أ',
                  name: 'شركة الأفق للنقل',
                  rating: '4.8',
                  trips: 312,
                  price: '1,950',
                  date: 'الأربعاء 07:00',
                  best: true,
                  onAccept: () {},
                  onChat: () => context.push("/chat"),
                ),
                const SizedBox(height: 16),
                NqOfferCard(
                  initial: 'ط',
                  name: 'مؤسسة الطريق السريع',
                  rating: '4.6',
                  trips: 128,
                  price: '2,050',
                  date: 'الأربعاء 09:00',
                  onAccept: () {},
                  onChat: () => context.push("/chat"),
                ),
                const SizedBox(height: 16),
                NqOfferCard(
                  initial: 'خ',
                  name: 'خالد الحربي',
                  rating: '4.9',
                  trips: 87,
                  providerType: 'مزوّد فرد',
                  price: '2,100',
                  date: 'الأربعاء 06:30',
                  onAccept: () {},
                  onChat: () => context.push("/chat"),
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
            NqIcon(NqIcons.arrowRight, size: 22, color: c.tx),
            const Spacer(),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text('العروض · ', style: NqType.h3.copyWith(color: c.tx)),
                    Ltr('3', style: NqType.h3.copyWith(color: c.tx)),
                  ],
                ),
                const SizedBox(height: 2),
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text('جدة ← مكة · مناقصة',
                        style: NqType.caption.copyWith(color: c.tx2)),
                    Text(' · ', style: NqType.caption.copyWith(color: c.tx2)),
                    Ltr('NQ-24-08840',
                        style: NqType.code(size: 12).copyWith(color: c.tx2)),
                  ],
                ),
              ],
            ),
          ],
        ),
      );

  Widget _countdownBanner(NqColors c) => Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: c.warnBg,
          borderRadius: BorderRadius.circular(NqRadius.card),
        ),
        child: Row(
          children: [
            NqIcon(NqIcons.timer, size: 20, color: c.warn),
            const SizedBox(width: 12),
            Expanded(
              child: Text.rich(
                TextSpan(
                  style: NqType.label.copyWith(color: c.tx, height: 1.5),
                  children: [
                    const TextSpan(text: 'تنتهي المناقصة خلال '),
                    TextSpan(
                        text: '04:58:12',
                        style: NqType.numeric(13, FontWeight.w700)
                            .copyWith(color: c.warn)),
                    const TextSpan(text: '. يمكنك القبول الآن أو الانتظار.'),
                  ],
                ),
                textAlign: TextAlign.right,
              ),
            ),
          ],
        ),
      );

  Widget _sortChips(NqColors c) {
    const labels = ['الأقل سعرًا', 'الأعلى تقييمًا', 'الأسرع استلامًا'];
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: [
          for (var i = 0; i < labels.length; i++) ...[
            NqChip(
              label: labels[i],
              selected: _sort == i,
              onTap: () => setState(() => _sort = i),
            ),
            if (i < labels.length - 1) const SizedBox(width: 8),
          ],
        ],
      ),
    );
  }
}
