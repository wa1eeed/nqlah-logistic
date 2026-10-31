import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/marketplace/marketplace_repository.dart';
import '../../core/orders/order_draft_controller.dart';
import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';
import '../../core/widgets/ltr.dart';
import '../../core/widgets/nq_icon.dart';
import '../../design_system/button.dart';
import '../../design_system/party_card.dart';

/// Available-truck detail + direct request (Addendum-01 6b). Driven by a
/// [TruckListing] from the marketplace; the CTA opens the create-order wizard
/// pre-pinned to this provider (`mode=DIRECT`).
class TruckDetailScreen extends ConsumerWidget {
  const TruckDetailScreen({super.key, required this.listing});

  final TruckListing listing;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = context.nq;
    final t = listing;
    return Scaffold(
      backgroundColor: c.bg,
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _appBar(context, c),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
                children: [
                  NqPartyCard(
                    initial: t.company.initial,
                    name: t.company.name,
                    role: [t.company.city, t.company.region]
                        .where((p) => p != null && p.isNotEmpty)
                        .join(' · '),
                    showCall: false,
                    onChat: () => ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                          content: Text(
                              'تُفتح المحادثة مع المزوّد بعد إرسال الطلب المباشر.')),
                    ),
                    revealed: false,
                    phone: '+966 •• ••• ••••',
                    revealLabel: 'التواصل داخل التطبيق حتى قبول الطلب',
                  ),
                  const SizedBox(height: 14),
                  _availabilityCard(c),
                  if ((t.notes ?? '').isNotEmpty) ...[
                    const SizedBox(height: 14),
                    _notesCard(c),
                  ],
                  const SizedBox(height: 14),
                  _priceCard(c),
                ],
              ),
            ),
            _footer(context, ref, c),
          ],
        ),
      ),
    );
  }

  Widget _appBar(BuildContext context, NqColors c) {
    final t = listing;
    final sub = t.isDirected
        ? '${t.originCity} ← ${t.destCity}'
        : 'من ${t.originCity} · أي وجهة';
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
      child: Row(
        children: [
          NqIcon(NqIcons.shareNetwork, size: 22, color: c.tx),
          const Spacer(),
          Expanded(
            flex: 6,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(t.isDirected ? 'رحلة موجّهة متاحة' : 'شاحنة متاحة',
                    style: NqType.h3.copyWith(color: c.tx)),
                const SizedBox(height: 2),
                Text('$sub · ${_dateLabel(t.availableFrom)}',
                    style: NqType.caption.copyWith(color: c.tx2),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis),
              ],
            ),
          ),
          const SizedBox(width: 12),
          GestureDetector(
            onTap: () => context.pop(),
            child: NqIcon(NqIcons.arrowRight, size: 22, color: c.tx),
          ),
        ],
      ),
    );
  }

  Widget _availabilityCard(NqColors c) {
    final t = listing;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: c.sf,
        borderRadius: BorderRadius.circular(NqRadius.card),
        border: Border.all(color: c.bd),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: BoxDecoration(
                  color: c.mintBg,
                  borderRadius: BorderRadius.circular(NqRadius.pill),
                ),
                child: Row(mainAxisSize: MainAxisSize.min, children: [
                  NqIcon(t.isDirected ? NqIcons.arrowUDownLeft : NqIcons.truck,
                      size: 14, color: c.mintTx),
                  const SizedBox(width: 6),
                  Text(t.isDirected ? 'رحلة موجّهة' : 'متاحة الآن',
                      style: NqType.caption
                          .copyWith(color: c.mintTx, fontWeight: FontWeight.w700)),
                ]),
              ),
              const Spacer(),
              Text(_dateLabel(t.availableFrom),
                  style: NqType.caption.copyWith(color: c.tx2)),
            ],
          ),
          const SizedBox(height: 14),
          _route(c),
          const SizedBox(height: 16),
          _specTiles(c),
        ],
      ),
    );
  }

  Widget _route(NqColors c) {
    final t = listing;
    Widget place(String city, String sub, {bool dim = false}) => Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(city,
                  style: NqType.h2.copyWith(color: dim ? c.tx2 : c.tx),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis),
              Text(sub,
                  style: NqType.caption.copyWith(color: c.tx2),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis),
            ],
          ),
        );
    return Row(
      children: [
        place(t.originCity, t.originRegion.isNotEmpty ? t.originRegion : 'موقع الانطلاق'),
        const SizedBox(width: 10),
        SizedBox(
          width: 90,
          child: SizedBox(
            height: 30,
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
                  Container(
                    width: 30,
                    height: 30,
                    alignment: Alignment.center,
                    decoration:
                        BoxDecoration(color: c.mintBg, shape: BoxShape.circle),
                    child: Transform.flip(
                        flipX: true,
                        child: NqIcon(NqIcons.truck,
                            fill: true, size: 16, color: c.mintTx)),
                  ),
                  Expanded(child: _dash(c)),
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
        t.isDirected
            ? place(t.destCity!, t.destRegion ?? 'الوجهة')
            : place('أي وجهة', 'مرن', dim: true),
      ],
    );
  }

  Widget _dash(NqColors c) => CustomPaint(
      size: const Size(double.infinity, 2), painter: _DashPainter(c.bd));

  Widget _specTiles(NqColors c) {
    final t = listing;
    Widget tile(String label, String value, {bool ltr = false}) => Expanded(
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            decoration: BoxDecoration(
              color: c.sf2,
              borderRadius: BorderRadius.circular(NqRadius.input),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(label, style: NqType.caption.copyWith(color: c.tx2)),
                const SizedBox(height: 2),
                if (ltr)
                  Ltr(value,
                      style:
                          NqType.labelStrong.copyWith(color: c.tx, fontSize: 14))
                else
                  Text(value,
                      style:
                          NqType.labelStrong.copyWith(color: c.tx, fontSize: 14),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis),
              ],
            ),
          ),
        );
    final cap = t.capacity != null ? '${_fmtNum(t.capacity!)} t' : '—';
    return Column(
      children: [
        Row(children: [
          tile('متاحة من', _dateLabel(t.availableFrom)),
          const SizedBox(width: 10),
          tile('حتى', t.availableTo != null ? _dateLabel(t.availableTo) : 'غير محدّد'),
        ]),
        const SizedBox(height: 10),
        Row(children: [
          tile('الشاحنة', t.truckTypeLabel2),
          const SizedBox(width: 10),
          tile('الحمولة القصوى', cap, ltr: t.capacity != null),
        ]),
      ],
    );
  }

  Widget _notesCard(NqColors c) => Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: c.sf,
          borderRadius: BorderRadius.circular(NqRadius.card),
          border: Border.all(color: c.bd),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Text(listing.notes!,
                  style: NqType.caption.copyWith(color: c.tx, height: 1.6),
                  textAlign: TextAlign.right),
            ),
            const SizedBox(width: 10),
            NqIcon(NqIcons.notePencil, size: 16, color: c.info),
          ],
        ),
      );

  Widget _priceCard(NqColors c) {
    final t = listing;
    final hasPrice = t.pricePerTrip != null;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: c.sf,
        borderRadius: BorderRadius.circular(NqRadius.card),
        border: Border.all(color: c.bd),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              if (hasPrice) ...[
                Ltr(_fmtNum(t.pricePerTrip!),
                    style: NqType.price(size: 19).copyWith(color: c.tx)),
                const SizedBox(width: 3),
                Text('⃁', style: NqType.caption.copyWith(color: c.tx2)),
              ] else
                Text('السعر بعد الطلب',
                    style: NqType.bodyStrong.copyWith(color: c.tx)),
              const Spacer(),
              Flexible(
                child: Text(
                    hasPrice ? 'سعر تقديري من المزوّد' : 'يُحدَّد بعد تفاصيل الحمولة',
                    style: NqType.label.copyWith(color: c.tx2),
                    textAlign: TextAlign.left,
                    overflow: TextOverflow.ellipsis),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Text(
                  'يتحدّد السعر النهائي بعد إرسال تفاصيل الحمولة لهذا المزوّد.',
                  style: NqType.caption.copyWith(color: c.tx2, height: 1.6),
                  textAlign: TextAlign.right,
                ),
              ),
              const SizedBox(width: 10),
              NqIcon(NqIcons.info, size: 16, color: c.info),
            ],
          ),
        ],
      ),
    );
  }

  Widget _footer(BuildContext context, WidgetRef ref, NqColors c) => Container(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
        decoration: BoxDecoration(
          color: c.sf,
          border: Border(top: BorderSide(color: c.bd)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('ننشئ طلبًا مُعبّأ مسبقًا ويُرسل لهذا المزوّد مباشرة · يرد خلال 2 س',
                style: NqType.caption.copyWith(color: c.tx2),
                textAlign: TextAlign.center),
            const SizedBox(height: 10),
            NqButton(
              label: 'اطلب من هذا المزوّد',
              icon: NqIcons.paperPlaneTilt,
              onPressed: () {
                ref.read(orderDraftProvider.notifier).startDirect(
                      targetCarrierId: listing.company.id,
                      targetCarrierName: listing.company.name,
                      originCity: listing.originCity,
                      destinationCity: listing.destCity,
                      requiredTruckType: listing.truckType,
                    );
                context.push('/order');
              },
            ),
          ],
        ),
      );

  static String _fmtNum(num v) {
    final s = v.toStringAsFixed(v == v.roundToDouble() ? 0 : 1);
    final parts = s.split('.');
    final intPart = parts[0]
        .replaceAllMapped(RegExp(r'(\d)(?=(\d{3})+$)'), (m) => '${m[1]},');
    return parts.length > 1 ? '$intPart.${parts[1]}' : intPart;
  }

  static String _dateLabel(DateTime? dt) {
    if (dt == null) return 'الآن';
    const months = [
      '', 'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
      'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
    ];
    final now = DateTime.now();
    final f = dt.toLocal();
    final isToday = f.year == now.year && f.month == now.month && f.day == now.day;
    final hhmm =
        '${f.hour.toString().padLeft(2, '0')}:${f.minute.toString().padLeft(2, '0')}';
    if (isToday) return 'اليوم · $hhmm';
    return '${f.day} ${months[f.month]} · $hhmm';
  }
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
