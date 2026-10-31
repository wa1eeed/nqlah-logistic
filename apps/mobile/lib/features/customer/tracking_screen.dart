import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_exception.dart';
import '../../core/orders/order_models.dart';
import '../../core/orders/orders_repository.dart';
import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';
import '../../core/widgets/ltr.dart';
import '../../core/widgets/nq_icon.dart';
import '../../design_system/party_card.dart';
import '../../design_system/status_chip.dart';
import 'live_tracking_map.dart';

/// Live tracking (handoff 1d): full-bleed styled map + freshness pill + a
/// bottom sheet with the next stop, status, progress and the provider row.
/// The map itself is a styled placeholder until a real maps SDK is wired; the
/// sheet and freshness are driven by `GET /orders/:id` (incl. tracking events).
class TrackingScreen extends ConsumerWidget {
  const TrackingScreen({super.key, required this.orderId});

  final String orderId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = context.nq;
    final async = ref.watch(orderDetailModelProvider(orderId));
    return Scaffold(
      backgroundColor: c.map,
      body: Stack(
        children: [
          Positioned.fill(
            child: async.maybeWhen(
              data: (o) => LiveTrackingMap(order: o),
              orElse: () => ColoredBox(color: c.map),
            ),
          ),
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  _circleBtn(context, c, NqIcons.arrowRight,
                      onTap: () => Navigator.of(context).maybePop()),
                  const Spacer(),
                  async.maybeWhen(
                    data: (o) => _freshnessPill(c, o),
                    orElse: () => const SizedBox.shrink(),
                  ),
                  const Spacer(),
                  _circleBtn(context, c, NqIcons.listBullets),
                ],
              ),
            ),
          ),
          Align(
            alignment: Alignment.bottomCenter,
            child: async.when(
              loading: () => _sheetShell(
                context,
                c,
                Center(
                  child: SizedBox(
                    width: 26,
                    height: 26,
                    child: CircularProgressIndicator(
                        strokeWidth: 2.5, color: c.mintTx),
                  ),
                ),
              ),
              error: (e, _) => _sheetShell(
                context,
                c,
                Text(
                  e is ApiException ? e.message : 'تعذّر تحميل التتبّع.',
                  style: NqType.body.copyWith(color: c.tx2),
                  textAlign: TextAlign.center,
                ),
              ),
              data: (o) => _sheet(context, c, o),
            ),
          ),
        ],
      ),
    );
  }

  Widget _circleBtn(BuildContext context, NqColors c, String icon,
          {VoidCallback? onTap}) =>
      GestureDetector(
        onTap: onTap,
        child: Container(
          width: 44,
          height: 44,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: c.sf,
            borderRadius: BorderRadius.circular(NqRadius.input),
            boxShadow: [
              BoxShadow(
                  color: const Color(0x1F0A1A19),
                  blurRadius: 12,
                  offset: const Offset(0, 4)),
            ],
          ),
          child: NqIcon(icon, size: 20, color: c.tx),
        ),
      );

  Widget _freshnessPill(NqColors c, OrderDetail o) {
    final last = o.tracking.isNotEmpty ? o.tracking.first.createdAt : null;
    final label = last != null ? relativeArabic(last) : 'لا تحديثات بعد';
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
      decoration: BoxDecoration(
        color: c.sf,
        borderRadius: BorderRadius.circular(NqRadius.pill),
        boxShadow: [
          BoxShadow(
              color: const Color(0x1F0A1A19),
              blurRadius: 12,
              offset: const Offset(0, 4)),
        ],
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(label, style: NqType.label.copyWith(color: c.tx2)),
          const SizedBox(width: 8),
          Container(
              width: 7,
              height: 7,
              decoration: BoxDecoration(
                  color: last != null ? c.ok : c.tx3, shape: BoxShape.circle)),
        ],
      ),
    );
  }

  double _progressFor(NqStatus s) => switch (s) {
        NqStatus.delivered || NqStatus.completed => 1.0,
        NqStatus.inTransit => 0.55,
        NqStatus.assigned || NqStatus.confirmed => 0.1,
        _ => 0.0,
      };

  Widget _sheetShell(BuildContext context, NqColors c, Widget child) =>
      Container(
        width: double.infinity,
        padding: EdgeInsets.fromLTRB(
            16, 10, 16, 16 + MediaQuery.of(context).padding.bottom),
        decoration: BoxDecoration(
          color: c.sf,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
          boxShadow: [
            BoxShadow(
                color: const Color(0x40000000),
                blurRadius: 30,
                offset: const Offset(0, -10),
                spreadRadius: -12),
          ],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Center(
              child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                      color: c.bd, borderRadius: BorderRadius.circular(2))),
            ),
            const SizedBox(height: 16),
            SizedBox(height: 80, child: child),
          ],
        ),
      );

  Widget _sheet(BuildContext context, NqColors c, OrderDetail o) {
    final latest = o.tracking.isNotEmpty ? o.tracking.first : null;
    final statusText = latest?.description.isNotEmpty == true
        ? latest!.description
        : 'الحالة: ${o.nqStatus.name}';
    final eta = o.actualDeliveryAt != null
        ? fmtTime(o.actualDeliveryAt)
        : fmtTime(o.deliveryDate);
    return Container(
      width: double.infinity,
      padding: EdgeInsets.fromLTRB(
          16, 10, 16, 16 + MediaQuery.of(context).padding.bottom),
      decoration: BoxDecoration(
        color: c.sf,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
        boxShadow: [
          BoxShadow(
              color: const Color(0x40000000),
              blurRadius: 30,
              offset: const Offset(0, -10),
              spreadRadius: -12),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Center(
            child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                    color: c.bd, borderRadius: BorderRadius.circular(2))),
          ),
          const SizedBox(height: 14),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('الوصول المتوقع',
                      style: NqType.caption.copyWith(color: c.tx2)),
                  Ltr(eta,
                      style: NqType.numeric(20, FontWeight.w700)
                          .copyWith(color: c.tx)),
                ],
              ),
              const Spacer(),
              Flexible(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text('الوجهة',
                        style: NqType.caption.copyWith(color: c.tx2)),
                    Text('التفريغ · ${o.destinationCity}',
                        style: NqType.h2.copyWith(fontSize: 20, color: c.tx),
                        textAlign: TextAlign.right),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              NqStatusChip(o.nqStatus),
              const SizedBox(width: 10),
              Expanded(
                child: Text(statusText,
                    style: NqType.caption.copyWith(color: c.tx2),
                    textAlign: TextAlign.right,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis),
              ),
            ],
          ),
          const SizedBox(height: 14),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: _progressFor(o.nqStatus),
              minHeight: 8,
              backgroundColor: c.sf2,
              color: c.mintS,
            ),
          ),
          if (o.carrier != null) ...[
            const SizedBox(height: 14),
            Divider(color: c.bd, height: 1),
            const SizedBox(height: 14),
            NqPartyCard(
              initial: o.carrier!.nameAr.isNotEmpty
                  ? o.carrier!.nameAr.substring(0, 1)
                  : 'م',
              name: o.carrier!.nameAr,
              role: 'المزوّد · ينسّق مع السائق',
              phone: o.carrier!.phone,
              revealed: o.carrier!.phone != null,
              callFilled: true,
            ),
          ],
        ],
      ),
    );
  }
}

