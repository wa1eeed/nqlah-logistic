import 'package:flutter/material.dart';

import '../core/theme/tokens.dart';
import '../core/theme/typography.dart';
import '../core/widgets/ltr.dart';
import '../core/widgets/nq_icon.dart';
import 'availability_card.dart' show MetaItem;
import 'button.dart';
import 'pressable.dart';

/// A marketplace load card (handoff 1f). Fixed-price variant: pricing tag,
/// route strip, 2×2 meta grid, perforation, price + accept. Tender variant:
/// countdown, route, offers count + bid.
class NqLoadCard extends StatelessWidget {
  const NqLoadCard({
    super.key,
    required this.isTender,
    required this.originCity,
    required this.originArea,
    required this.destCity,
    required this.destDistance,
    this.postedAgo,
    this.countdown,
    this.midStop,
    this.meta = const [],
    this.price,
    this.offersText,
    this.myBidText,
    this.onAccept,
    this.onBid,
    this.hasBid = false,
    this.onTap,
  });

  final bool isTender;
  final String originCity;
  final String originArea;
  final String destCity;
  final String destDistance; // "398 km"
  final String? postedAgo; // fixed
  final String? countdown; // tender "05:42:10"
  final String? midStop; // "+1 توقف"
  final List<MetaItem> meta; // fixed, 4 items
  final String? price; // fixed "3,200"
  final String? offersText; // tender "7 عروض مقدّمة"
  /// The carrier's own bid line (e.g. «عرضك: 5,700 ر.س»), shown — stacked above
  /// [offersText] and shrink-to-fit — when they already bid.
  final String? myBidText;
  final VoidCallback? onAccept;
  final VoidCallback? onBid;
  /// True when the current carrier already has a bid on this tender — the CTA
  /// becomes a smaller «تعديل العرض» (edit) pill instead of «تقديم عرض».
  final bool hasBid;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final c = context.nq;
    return Pressable(
      enabled: onTap != null,
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(
          color: c.sf,
          borderRadius: BorderRadius.circular(NqRadius.card),
          border: Border.all(color: c.bd),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 14, 16, 12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  _topRow(c),
                  const SizedBox(height: 14),
                  _routeStrip(c),
                  if (!isTender && meta.isNotEmpty) ...[
                    const SizedBox(height: 14),
                    _metaGrid(c),
                  ],
                ],
              ),
            ),
            if (!isTender) ...[
              _perforation(c),
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
                child: Row(
                  children: [
                    Expanded(
                      child: NqButton(
                          label: 'قبول السعر', onPressed: onAccept ?? () {}),
                    ),
                    const SizedBox(width: 14),
                    Flexible(
                      child: Row(mainAxisSize: MainAxisSize.min, children: [
                        Flexible(
                          child: FittedBox(
                            fit: BoxFit.scaleDown,
                            alignment: AlignmentDirectional.centerEnd,
                            child: Ltr(price ?? '',
                                style: NqType.price(size: 22).copyWith(color: c.tx)),
                          ),
                        ),
                        const SizedBox(width: 3),
                        Text('ر.س', style: NqType.caption.copyWith(color: c.tx2)),
                      ]),
                    ),
                  ],
                ),
              ),
            ] else
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                child: Row(
                  children: [
                    if (hasBid)
                      // Already bid → a smaller, mint-toned «تعديل العرض» pill.
                      GestureDetector(
                        onTap: onBid,
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                          decoration: BoxDecoration(
                            color: c.mintBg,
                            borderRadius: BorderRadius.circular(NqRadius.pill),
                            border: Border.all(color: c.mint),
                          ),
                          child: Row(mainAxisSize: MainAxisSize.min, children: [
                            NqIcon(NqIcons.notePencil, size: 15, color: c.mintTx),
                            const SizedBox(width: 6),
                            Text('تعديل العرض',
                                style: NqType.labelStrong.copyWith(color: c.mintTx)),
                          ]),
                        ),
                      )
                    else
                      NqButton(
                        label: 'تقديم عرض',
                        icon: NqIcons.gavel,
                        variant: NqButtonVariant.secondary,
                        expand: false,
                        onPressed: onBid ?? () {},
                      ),
                    const SizedBox(width: 8),
                    // Offer + count, stacked and shrink-to-fit so a long «عرضك»
                    // line never collides with the CTA or overflows the row.
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          if (myBidText != null && myBidText!.isNotEmpty)
                            FittedBox(
                              fit: BoxFit.scaleDown,
                              alignment: AlignmentDirectional.centerEnd,
                              child: Text(myBidText!,
                                  style: NqType.caption
                                      .copyWith(color: c.mintTx, fontWeight: FontWeight.w600),
                                  maxLines: 1),
                            ),
                          if (offersText != null && offersText!.isNotEmpty)
                            Text(offersText!,
                                style: NqType.caption.copyWith(color: c.tx2),
                                textAlign: TextAlign.end,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _topRow(NqColors c) {
    final tagBg = isTender ? c.infoBg : c.mintBg;
    final tagFg = isTender ? c.info : c.mintTx;
    return Row(
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
          decoration: BoxDecoration(
            color: tagBg,
            borderRadius: BorderRadius.circular(NqRadius.pill),
          ),
          child: Row(mainAxisSize: MainAxisSize.min, children: [
            NqIcon(isTender ? NqIcons.gavel : NqIcons.tag, size: 14, color: tagFg),
            const SizedBox(width: 6),
            Text(isTender ? 'مناقصة' : 'سعر ثابت',
                style: NqType.caption
                    .copyWith(color: tagFg, fontWeight: FontWeight.w700)),
          ]),
        ),
        const Spacer(),
        if (isTender && countdown != null)
          Row(children: [
            NqIcon(NqIcons.timer, size: 16, color: c.warn),
            const SizedBox(width: 6),
            Ltr(countdown!,
                style: NqType.numeric(13, FontWeight.w700).copyWith(color: c.warn)),
          ])
        else if (postedAgo != null)
          Text(postedAgo!, style: NqType.caption.copyWith(color: c.tx2)),
      ],
    );
  }

  Widget _routeStrip(NqColors c) {
    Widget place(String city, String sub, {bool ltrSub = false}) => Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(city, style: NqType.h2.copyWith(color: c.tx)),
            ltrSub
                ? Ltr(sub, style: NqType.caption.copyWith(color: c.tx2))
                : Text(sub, style: NqType.caption.copyWith(color: c.tx2)),
          ],
        );
    return Row(
      children: [
        place(originCity, originArea),
        const SizedBox(width: 10),
        Expanded(
          child: SizedBox(
            height: 24,
            child: Directionality(
              textDirection: TextDirection.ltr,
              child: Row(
                children: [
                  Container(
                      width: 12,
                      height: 12,
                      decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          border: Border.all(color: c.tx3, width: 2))),
                  Expanded(child: _dash(c)),
                  if (midStop != null) ...[
                    Container(
                      padding:
                          const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: c.sf2,
                        borderRadius: BorderRadius.circular(NqRadius.pill),
                      ),
                      child: Text(midStop!,
                          style: NqType.caption.copyWith(color: c.tx2)),
                    ),
                    Expanded(child: _dash(c)),
                  ],
                  Container(
                      width: 10,
                      height: 10,
                      decoration:
                          BoxDecoration(color: c.mint, shape: BoxShape.circle)),
                ],
              ),
            ),
          ),
        ),
        const SizedBox(width: 10),
        place(destCity, destDistance, ltrSub: true),
      ],
    );
  }

  Widget _dash(NqColors c) =>
      CustomPaint(size: const Size(double.infinity, 2), painter: _DashPainter(c.bd));

  Widget _metaGrid(NqColors c) {
    Widget cell(MetaItem m) => Row(
          children: [
            NqIcon(m.icon, size: 16, color: c.tx2),
            const SizedBox(width: 6),
            Expanded(
              child: m.ltr
                  ? Align(
                      alignment: Alignment.centerRight,
                      child: Ltr(m.text, style: NqType.label.copyWith(color: c.tx2)))
                  : Text(m.text,
                      style: NqType.label.copyWith(color: c.tx2),
                      textAlign: TextAlign.right,
                      overflow: TextOverflow.ellipsis),
            ),
          ],
        );
    return Column(
      children: [
        Row(children: [
          Expanded(child: cell(meta[0])),
          const SizedBox(width: 12),
          Expanded(child: cell(meta[1])),
        ]),
        const SizedBox(height: 10),
        Row(children: [
          Expanded(child: cell(meta[2])),
          const SizedBox(width: 12),
          Expanded(child: cell(meta[3])),
        ]),
      ],
    );
  }

  Widget _perforation(NqColors c) => SizedBox(
        height: 18,
        child: Stack(
          alignment: Alignment.center,
          children: [
            Padding(
                padding: const EdgeInsets.symmetric(horizontal: 9),
                child: _dash(c)),
            Align(
                alignment: Alignment.centerLeft,
                child: Transform.translate(
                    offset: const Offset(-9, 0), child: _cut(c))),
            Align(
                alignment: Alignment.centerRight,
                child: Transform.translate(
                    offset: const Offset(9, 0), child: _cut(c))),
          ],
        ),
      );

  Widget _cut(NqColors c) => Container(
      width: 18,
      height: 18,
      decoration: BoxDecoration(
          color: c.bg, shape: BoxShape.circle, border: Border.all(color: c.bd)));
}

class _DashPainter extends CustomPainter {
  _DashPainter(this.color);
  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final p = Paint()
      ..color = color
      ..strokeWidth = 2;
    double x = 0;
    final y = size.height / 2;
    while (x < size.width) {
      canvas.drawLine(Offset(x, y), Offset(x + 4, y), p);
      x += 8;
    }
  }

  @override
  bool shouldRepaint(_DashPainter old) => old.color != color;
}
