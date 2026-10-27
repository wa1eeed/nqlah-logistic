import 'package:flutter/material.dart';

import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';
import '../../core/widgets/nq_icon.dart';
import '../../design_system/button.dart';

/// Driver assignment (handoff 1h). Single-select an eligible & available driver
/// for an order; the driver's data is never shown to the customer.
class DriverAssignmentScreen extends StatefulWidget {
  const DriverAssignmentScreen({super.key, this.onConfirm});

  final VoidCallback? onConfirm;

  @override
  State<DriverAssignmentScreen> createState() => _DriverAssignmentScreenState();
}

class _Driver {
  const _Driver(this.initial, this.name, this.sub, {this.available = true});
  final String initial;
  final String name;
  final String sub;
  final bool available;
}

class _DriverAssignmentScreenState extends State<DriverAssignmentScreen> {
  int _selected = 0;

  static const _available = [
    _Driver('ف', 'فهد العتيبي', 'تريلا سطحة · 7342 KHD · في الدمام'),
    _Driver('م', 'محمد الشهري', 'تريلا سطحة · 2918 RSA · الجبيل'),
    _Driver('س', 'سالم القحطاني', 'ستارة · 5530 BNA · الدمام'),
  ];
  static const _unavailable = [
    _Driver('ع', 'عبدالله الدوسري', 'في رحلة حتى 31/10', available: false),
  ];

  @override
  Widget build(BuildContext context) {
    final c = context.nq;
    return Scaffold(
      backgroundColor: c.bg,
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _appBar(c),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
                children: [
                  _contextBar(c),
                  const SizedBox(height: 14),
                  _searchField(c),
                  const SizedBox(height: 18),
                  _sectionLabel(c, 'مؤهّلون ومتاحون · 3'),
                  const SizedBox(height: 10),
                  for (var i = 0; i < _available.length; i++) ...[
                    _driverRow(c, _available[i], selected: _selected == i,
                        onTap: () => setState(() => _selected = i)),
                    const SizedBox(height: 10),
                  ],
                  const SizedBox(height: 8),
                  _sectionLabel(c, 'غير متاحين · 2'),
                  const SizedBox(height: 10),
                  for (final d in _unavailable) _driverRow(c, d),
                ],
              ),
            ),
            _footer(c),
          ],
        ),
      ),
    );
  }

  Widget _appBar(NqColors c) => Padding(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
        child: Row(
          children: [
            const Spacer(),
            Text('إسناد سائق', style: NqType.h3.copyWith(color: c.tx)),
            const SizedBox(width: 12),
            GestureDetector(
              onTap: () => Navigator.of(context).maybePop(),
              child: NqIcon(NqIcons.arrowRight, size: 22, color: c.tx),
            ),
          ],
        ),
      );

  Widget _contextBar(NqColors c) => Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: c.hero,
          borderRadius: BorderRadius.circular(NqRadius.card),
        ),
        child: Row(
          children: [
            NqIcon(NqIcons.clipboardText, size: 22, color: NqFixed.heroAccent),
            const Spacer(),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text('NQ-24-08856 · L1',
                    style: NqType.code(size: 14).copyWith(color: NqFixed.heroAccent)),
                const SizedBox(height: 2),
                Text('الدمام ← الرياض · تريلا سطحة',
                    style: NqType.bodyStrong.copyWith(color: NqFixed.heroText)),
                const SizedBox(height: 2),
                Text('الأربعاء 07:00',
                    style: NqType.caption.copyWith(color: NqFixed.heroTextSecondary)),
              ],
            ),
          ],
        ),
      );

  Widget _searchField(NqColors c) => Container(
        height: 52,
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

  Widget _sectionLabel(NqColors c, String t) =>
      Text(t, style: NqType.labelStrong.copyWith(color: c.tx2), textAlign: TextAlign.right);

  Widget _driverRow(NqColors c, _Driver d, {bool selected = false, VoidCallback? onTap}) {
    final content = Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: c.sf,
        borderRadius: BorderRadius.circular(NqRadius.card),
        border: Border.all(
            color: selected ? c.mintS : c.bd, width: selected ? 2 : 1),
      ),
      child: Row(
        children: [
          d.available ? _radio(c, selected) : _prohibit(c),
          const Spacer(),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(d.name, style: NqType.bodyStrong.copyWith(color: c.tx)),
              const SizedBox(height: 2),
              if (d.available)
                Text(d.sub, style: NqType.caption.copyWith(color: c.tx2))
              else
                Row(mainAxisSize: MainAxisSize.min, children: [
                  Text(d.sub, style: NqType.caption.copyWith(color: c.tx2)),
                  const SizedBox(width: 6),
                  NqIcon(NqIcons.truck, size: 14, color: c.tx3),
                ]),
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
    final wrapped = d.available
        ? GestureDetector(onTap: onTap, child: content)
        : Opacity(opacity: 0.6, child: content);
    return wrapped;
  }

  Widget _radio(NqColors c, bool selected) => Container(
        width: 26,
        height: 26,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: selected ? c.mintS : Colors.transparent,
          shape: BoxShape.circle,
          border: selected ? null : Border.all(color: c.bd, width: 2),
        ),
        child: selected
            ? NqIcon(NqIcons.check, size: 15, color: c.isDark ? c.onMint : Colors.white)
            : null,
      );

  Widget _prohibit(NqColors c) =>
      NqIcon(NqIcons.prohibit, size: 26, color: c.tx3);

  Widget _footer(NqColors c) => Container(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
        decoration: BoxDecoration(
          color: c.sf,
          border: Border(top: BorderSide(color: c.bd)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('يصل للسائق إشعار فورًا · لا تظهر بياناته للعميل',
                style: NqType.caption.copyWith(color: c.tx2),
                textAlign: TextAlign.center),
            const SizedBox(height: 10),
            NqButton(
              label: 'تأكيد إسناد ${_available[_selected].name}',
              onPressed: widget.onConfirm ?? () {},
            ),
          ],
        ),
      );
}
