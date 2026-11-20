import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/auth/auth_controller.dart';
import '../../core/marketplace/marketplace_repository.dart';
import '../../core/orders/order_models.dart' show cargoLabel, truckLabel, relativeArabic;
import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';
import '../../core/widgets/currency_symbol.dart';
import '../../core/widgets/ltr.dart';
import '../../core/widgets/nq_icon.dart';
import '../../design_system/button.dart';

/// Detail bottom sheet for a marketplace load, reusing the load-detail design
/// (badge + order number, route, info tiles, price). Browse view: a guest gets
/// a "sign in to bid" CTA; an authenticated user browses (carriers bid from
/// their own Loads screen).
Future<void> showLoadMarketDetail(
    BuildContext context, WidgetRef ref, LoadListing load) {
  final c = context.nq;
  final isGuest = ref.read(authControllerProvider).user == null;
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    backgroundColor: c.bg,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
    ),
    builder: (_) => SafeArea(
      top: false,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 10, 16, 16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                    color: c.bd, borderRadius: BorderRadius.circular(2)),
              ),
            ),
            const SizedBox(height: 14),
            Row(
              children: [
                _badge(
                  c,
                  load.isFixedPrice ? 'سعر ثابت' : 'مناقصة',
                  load.isFixedPrice ? c.mintBg : c.infoBg,
                  load.isFixedPrice ? c.mintTx : c.info,
                ),
                const Spacer(),
                Text(load.orderNumber,
                    style: NqType.code(size: 14).copyWith(color: c.tx2)),
              ],
            ),
            const SizedBox(height: 16),
            _route(c, load),
            const SizedBox(height: 16),
            _tiles(c, load),
            const SizedBox(height: 14),
            _price(c, load),
            if (isGuest) ...[
              const SizedBox(height: 20),
              NqButton(
                label: 'سجّل الدخول لتقديم عرض',
                icon: NqIcons.handCoins,
                onPressed: () {
                  Navigator.of(context).pop();
                  context.push('/login');
                },
              ),
            ],
          ],
        ),
      ),
    ),
  );
}

Widget _badge(NqColors c, String label, Color bg, Color fg) => Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration:
          BoxDecoration(color: bg, borderRadius: BorderRadius.circular(NqRadius.pill)),
      child: Text(label,
          style: NqType.caption.copyWith(color: fg, fontWeight: FontWeight.w700)),
    );

Widget _route(NqColors c, LoadListing load) {
  Widget place(String city, String label) => Expanded(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(city,
                style: NqType.h2.copyWith(color: c.tx),
                maxLines: 1,
                overflow: TextOverflow.ellipsis),
            Text(label, style: NqType.caption.copyWith(color: c.tx2)),
          ],
        ),
      );
  return Row(
    children: [
      place(load.originCity, 'الاستلام'),
      NqIcon(NqIcons.arrowLeft, size: 20, color: c.tx3),
      const SizedBox(width: 10),
      place(load.destinationCity, 'التفريغ'),
    ],
  );
}

Widget _tiles(NqColors c, LoadListing load) {
  Widget tile(String label, String value) => Expanded(
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
              Text(value,
                  style:
                      NqType.labelStrong.copyWith(color: c.tx, fontSize: 14),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis),
            ],
          ),
        ),
      );
  return Column(
    children: [
      Row(children: [
        tile('الحمولة', cargoLabel(load.cargoType)),
        const SizedBox(width: 10),
        tile('الشاحنة المطلوبة', truckLabel(load.requiredTruckType)),
      ]),
      const SizedBox(height: 10),
      Row(children: [
        tile('العروض', load.bidsCount == 0 ? 'بلا عروض' : '${load.bidsCount}'),
        const SizedBox(width: 10),
        tile('نُشرت', relativeArabic(load.createdAt)),
      ]),
    ],
  );
}

Widget _price(NqColors c, LoadListing load) => Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: c.sf,
        borderRadius: BorderRadius.circular(NqRadius.card),
        border: Border.all(color: c.bd),
      ),
      child: Row(
        children: [
          if (load.clientBudget != null) ...[
            Ltr(load.clientBudget!.toStringAsFixed(0),
                style: NqType.price(size: 20).copyWith(color: c.tx)),
            const SizedBox(width: 3),
            CurrencySymbol(style: NqType.caption.copyWith(color: c.tx2)),
          ] else
            Text('مفتوح للعروض',
                style: NqType.bodyStrong.copyWith(color: c.mintTx)),
          const Spacer(),
          Text(
            load.clientBudget != null
                ? (load.isFixedPrice ? 'السعر الثابت للعميل' : 'ميزانية العميل')
                : 'قدّم عرضك',
            style: NqType.label.copyWith(color: c.tx2),
          ),
        ],
      ),
    );
