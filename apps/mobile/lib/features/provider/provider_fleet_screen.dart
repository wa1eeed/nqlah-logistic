import 'package:flutter/material.dart';

import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';
import '../../core/widgets/nq_icon.dart';
import '../../design_system/segmented.dart';

/// Provider fleet — drivers view (handoff 3e). (Trucks + التوفّر segments and
/// the add-driver form land with the rest of fleet/availability.)
class ProviderFleetScreen extends StatefulWidget {
  const ProviderFleetScreen({super.key, this.onAddDriver, this.onManagePlan});

  final VoidCallback? onAddDriver;
  final VoidCallback? onManagePlan;

  @override
  State<ProviderFleetScreen> createState() => _ProviderFleetScreenState();
}

enum _St { available, onTrip, docAlert, invited }

class _DriverRow {
  const _DriverRow(this.initial, this.name, this.sub, this.state, {this.docText});
  final String initial;
  final String name;
  final String sub;
  final _St state;
  final String? docText;
}

class _ProviderFleetScreenState extends State<ProviderFleetScreen> {
  int _seg = 1; // 0 = trucks, 1 = drivers

  static const _drivers = [
    _DriverRow('ف', 'فهد العتيبي', 'تريلا سطحة · 7342 KHD', _St.available),
    _DriverRow('س', 'سالم القحطاني', 'ستارة · NQ-24-08799', _St.onTrip),
    _DriverRow('م', 'محمد الشهري', 'تريلا سطحة · 2918 RSA', _St.docAlert,
        docText: 'الرخصة · 12 يومًا'),
    _DriverRow('ع', 'عبدالله الدوسري', 'في رحلة حتى 31/10', _St.onTrip),
    _DriverRow('ن', 'نواف المطيري', '+966 50 331 8842', _St.invited),
  ];

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
                GestureDetector(
                  onTap: widget.onAddDriver,
                  child: Container(
                    width: 44,
                    height: 44,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: c.mint,
                      borderRadius: BorderRadius.circular(NqRadius.input),
                    ),
                    child: NqIcon(NqIcons.userPlus, size: 20, color: c.onMint),
                  ),
                ),
                const Spacer(),
                Text('الأسطول', style: NqType.h1.copyWith(color: c.tx)),
              ],
            ),
          ),
          const SizedBox(height: 16),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: NqSegmented(
              options: const ['الشاحنات 14', 'السائقون 11'],
              index: _seg,
              onChanged: (i) => setState(() => _seg = i),
            ),
          ),
          const SizedBox(height: 14),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
              children: [
                _summaryCard(c),
                const SizedBox(height: 14),
                _searchField(c),
                const SizedBox(height: 14),
                _driverList(c),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _summaryCard(NqColors c) => Container(
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
                GestureDetector(
                  onTap: widget.onManagePlan,
                  child: Text('إدارة الباقة',
                      style: NqType.labelStrong.copyWith(color: c.mintTx)),
                ),
                const Spacer(),
                Text('باقة احترافي · 14 شاحنة مفعّلة',
                    style: NqType.bodyStrong.copyWith(color: c.tx)),
              ],
            ),
            const SizedBox(height: 14),
            Row(
              children: [
                _counter(c, '5', 'متاح', c.ok),
                _counter(c, '6', 'في رحلة', c.info),
                _counter(c, '1', 'تنبيه وثائق', c.warn),
                _counter(c, '1', 'دعوة معلّقة', c.tx2),
              ],
            ),
          ],
        ),
      );

  Widget _counter(NqColors c, String value, String label, Color color) => Expanded(
        child: Column(
          children: [
            Text(value, style: NqType.numeric(20, FontWeight.w700).copyWith(color: color)),
            const SizedBox(height: 2),
            Text(label,
                style: NqType.caption.copyWith(color: c.tx2),
                textAlign: TextAlign.center),
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
            const Spacer(),
            Text('ابحث باسم السائق أو اللوحة',
                style: NqType.body.copyWith(color: c.tx3)),
          ],
        ),
      );

  Widget _driverList(NqColors c) => Container(
        decoration: BoxDecoration(
          color: c.sf,
          borderRadius: BorderRadius.circular(NqRadius.card),
          border: Border.all(color: c.bd),
        ),
        child: Column(
          children: [
            for (var i = 0; i < _drivers.length; i++) ...[
              _row(c, _drivers[i]),
              if (i < _drivers.length - 1)
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 14),
                  child: Divider(color: c.bd, height: 1),
                ),
            ],
          ],
        ),
      );

  Widget _row(NqColors c, _DriverRow d) => Padding(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
        child: Row(
          children: [
            _status(c, d),
            const Spacer(),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(d.name, style: NqType.bodyStrong.copyWith(color: c.tx, fontSize: 16)),
                const SizedBox(height: 2),
                Text(d.sub, style: NqType.caption.copyWith(color: c.tx2)),
              ],
            ),
            const SizedBox(width: 12),
            Container(
              width: 44,
              height: 44,
              alignment: Alignment.center,
              decoration: BoxDecoration(color: c.sf2, shape: BoxShape.circle),
              child: Text(d.initial, style: NqType.h3.copyWith(color: c.tx2)),
            ),
          ],
        ),
      );

  Widget _status(NqColors c, _DriverRow d) {
    if (d.state == _St.docAlert) {
      return Container(
        height: 26,
        padding: const EdgeInsets.symmetric(horizontal: 10),
        decoration: BoxDecoration(
          color: c.warnBg,
          borderRadius: BorderRadius.circular(NqRadius.pill),
        ),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          NqIcon(NqIcons.warningCircle, size: 14, color: c.warn),
          const SizedBox(width: 6),
          Text(d.docText ?? '',
              style: NqType.caption.copyWith(color: c.warn, fontWeight: FontWeight.w700)),
        ]),
      );
    }
    final (label, color, bg) = switch (d.state) {
      _St.available => ('متاح', c.ok, c.okBg),
      _St.onTrip => ('في رحلة', c.info, c.infoBg),
      _St.invited => ('دعوة معلّقة', c.tx2, c.sf2),
      _St.docAlert => ('', c.warn, c.warnBg),
    };
    return Container(
      height: 26,
      padding: const EdgeInsets.symmetric(horizontal: 10),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(NqRadius.pill)),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        Container(width: 7, height: 7, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
        const SizedBox(width: 6),
        Text(label, style: NqType.caption.copyWith(color: color, fontWeight: FontWeight.w700)),
      ]),
    );
  }
}
