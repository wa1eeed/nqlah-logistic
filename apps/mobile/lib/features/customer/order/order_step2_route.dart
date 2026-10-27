import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/marketplace/marketplace_repository.dart';
import '../../../core/orders/order_draft_controller.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/theme/typography.dart';
import '../../../core/widgets/nq_icon.dart';
import '../../../design_system/text_field.dart';
import '../../shell/app_shell.dart' show requestedShellTabProvider;
import 'order_wizard_scaffold.dart';

/// Create-order step 2/6 — route & stops (handoff 4a). Single-order origin and
/// destination (city + address); the mini-map and multi-stop editing are a
/// visual/follow-up track.
class OrderStep2Route extends ConsumerStatefulWidget {
  const OrderStep2Route({super.key, this.onNext});

  final VoidCallback? onNext;

  @override
  ConsumerState<OrderStep2Route> createState() => _OrderStep2RouteState();
}

class _OrderStep2RouteState extends ConsumerState<OrderStep2Route> {
  late final TextEditingController _originAddr;
  late final TextEditingController _destAddr;

  @override
  void initState() {
    super.initState();
    final d = ref.read(orderDraftProvider);
    _originAddr = TextEditingController(text: d.originAddress);
    _destAddr = TextEditingController(text: d.destinationAddress);
  }

  @override
  void dispose() {
    _originAddr.dispose();
    _destAddr.dispose();
    super.dispose();
  }

  void _pickCity(ValueChanged<String> onPick) {
    final c = context.nq;
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: c.sf,
      showDragHandle: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => SafeArea(
        child: ListView(
          shrinkWrap: true,
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
          children: [
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 8),
              child: Text('اختر المدينة',
                  style: NqType.h3.copyWith(color: c.tx),
                  textAlign: TextAlign.center),
            ),
            for (final city in saudiCities)
              ListTile(
                title: Text(city,
                    style: NqType.body.copyWith(color: c.tx),
                    textAlign: TextAlign.right),
                subtitle: Text(regionForCity(city),
                    style: NqType.caption.copyWith(color: c.tx3),
                    textAlign: TextAlign.right),
                onTap: () {
                  onPick(city);
                  Navigator.of(context).maybePop();
                },
              ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final c = context.nq;
    final n = ref.read(orderDraftProvider.notifier);
    final d = ref.watch(orderDraftProvider);
    return OrderWizardScaffold(
      step: 2,
      stepName: 'المسار',
      nextLabel: 'الجدولة',
      title: 'حدّد مسار الرحلة',
      showPrev: true,
      onNext: widget.onNext,
      children: [
        _miniMap(c),
        const SizedBox(height: 16),
        _endpoint(
          c,
          icon: NqIcons.mapPin,
          iconColor: c.mintS,
          title: 'الاستلام',
          city: d.originCity,
          onCity: () =>
              _pickCity((v) => n.patch((x) => x.copyWith(originCity: v))),
          addrController: _originAddr,
          onAddr: (v) => n.patch((x) => x.copyWith(originAddress: v)),
        ),
        const SizedBox(height: 14),
        _endpoint(
          c,
          icon: NqIcons.flagCheckered,
          iconColor: c.err,
          title: 'التفريغ',
          city: d.destinationCity,
          onCity: () =>
              _pickCity((v) => n.patch((x) => x.copyWith(destinationCity: v))),
          addrController: _destAddr,
          onAddr: (v) => n.patch((x) => x.copyWith(destinationAddress: v)),
        ),
        _availableTrucksBanner(c, d.originCity),
      ],
    );
  }

  /// Info banner (Addendum §0): once the route is known, surface the count of
  /// trucks available from the origin city with a link to the Trucks tab (6a).
  Widget _availableTrucksBanner(NqColors c, String originCity) {
    final count =
        ref.watch(marketplaceTrucksProvider(originCity)).valueOrNull?.length ?? 0;
    if (count == 0) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.only(top: 14),
      child: GestureDetector(
        onTap: () {
          ref.read(requestedShellTabProvider.notifier).state = 1;
          context.go('/app');
        },
        behavior: HitTestBehavior.opaque,
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: c.mintBg,
            borderRadius: BorderRadius.circular(NqRadius.card),
            border: Border.all(color: c.mint.withValues(alpha: 0.5)),
          ),
          child: Row(
            children: [
              NqIcon(NqIcons.caretLeft, size: 18, color: c.mintTx),
              const Spacer(),
              Flexible(
                child: Text('$count شاحنة متاحة على هذا المسار — تصفّحها',
                    style: NqType.bodyStrong.copyWith(color: c.tx),
                    textAlign: TextAlign.right,
                    overflow: TextOverflow.ellipsis),
              ),
              const SizedBox(width: 10),
              NqIcon(NqIcons.truck, size: 18, color: c.mintTx),
            ],
          ),
        ),
      ),
    );
  }

  Widget _endpoint(
    NqColors c, {
    required String icon,
    required Color iconColor,
    required String title,
    required String city,
    required VoidCallback onCity,
    required TextEditingController addrController,
    required ValueChanged<String> onAddr,
  }) {
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
              NqIcon(icon, fill: true, size: 20, color: iconColor),
              const Spacer(),
              Text(title, style: NqType.h3.copyWith(color: c.tx)),
            ],
          ),
          const SizedBox(height: 12),
          GestureDetector(
            onTap: onCity,
            child: Container(
              height: NqLayout.input,
              padding: const EdgeInsets.symmetric(horizontal: 14),
              decoration: BoxDecoration(
                color: c.sf2,
                borderRadius: BorderRadius.circular(NqRadius.input),
              ),
              child: Row(
                children: [
                  NqIcon(NqIcons.caretDown, size: 16, color: c.tx3),
                  const Spacer(),
                  Text(city, style: NqType.body.copyWith(color: c.tx)),
                  const SizedBox(width: 8),
                  Text('المدينة', style: NqType.label.copyWith(color: c.tx2)),
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),
          NqTextField(
            hint: 'العنوان التفصيلي (حي، شارع، مَعلم)',
            controller: addrController,
            onChanged: onAddr,
          ),
        ],
      ),
    );
  }

  Widget _miniMap(NqColors c) => ClipRRect(
        borderRadius: BorderRadius.circular(NqRadius.card),
        child: Container(
          height: 120,
          color: c.map,
          child: Stack(
            children: [
              Center(
                child: Container(
                    height: 4,
                    color: c.mintS,
                    margin: const EdgeInsets.symmetric(horizontal: 40)),
              ),
              PositionedDirectional(top: 54, start: 36, child: _dot(c.mintS, 18)),
              PositionedDirectional(top: 52, end: 36, child: _dot(c.err, 20)),
            ],
          ),
        ),
      );

  Widget _dot(Color color, double size) => Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          color: color,
          shape: BoxShape.circle,
          border: Border.all(color: Colors.white, width: 3),
        ),
      );
}
