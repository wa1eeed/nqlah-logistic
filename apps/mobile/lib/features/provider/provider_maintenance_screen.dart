import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/fleet/fleet_repository.dart' show truckTypeLabel;
import '../../core/fleet/maintenance_repository.dart';
import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';
import '../../core/widgets/ltr.dart';
import '../../core/widgets/nq_icon.dart';
import '../../design_system/button.dart';
import 'maintenance_log_sheet.dart';

/// Truck detail + maintenance (handoff 3g, paid add-on «إدارة صيانة الأسطول»).
/// Wired to `GET /fleet/trucks/:id/maintenance`; "تسجيل صيانة" logs an event
/// via `POST …/maintenance` and the view refreshes.
class ProviderMaintenanceScreen extends ConsumerWidget {
  const ProviderMaintenanceScreen({super.key, required this.truckId});

  final String truckId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = context.nq;
    final async = ref.watch(truckMaintenanceProvider(truckId));
    return Scaffold(
      backgroundColor: c.bg,
      body: SafeArea(
        child: async.when(
          loading: () => _withChrome(context, c, null,
              const Center(child: CircularProgressIndicator())),
          error: (e, _) => _withChrome(
              context, c, null, _errorState(context, ref, c)),
          data: (m) => Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              _appBar(context, c, m),
              Expanded(
                child: RefreshIndicator(
                  onRefresh: () async =>
                      ref.invalidate(truckMaintenanceProvider(truckId)),
                  child: ListView(
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
                    children: [
                      _heroCard(c, m),
                      const SizedBox(height: 18),
                      _scheduleHeader(context, ref, c, m),
                      const SizedBox(height: 10),
                      _scheduleCard(c, m),
                      const SizedBox(height: 18),
                      Text('آخر الصيانات',
                          style: NqType.h2.copyWith(color: c.tx)),
                      const SizedBox(height: 10),
                      if (m.records.isEmpty)
                        _emptyRecords(c)
                      else
                        for (final r in m.records) ...[
                          _recordCard(c, r),
                          const SizedBox(height: 10),
                        ],
                    ],
                  ),
                ),
              ),
              _footer(context, ref, c, m),
            ],
          ),
        ),
      ),
    );
  }

  Widget _withChrome(BuildContext context, NqColors c, TruckMaintenance? m,
          Widget body) =>
      Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [_appBar(context, c, m), Expanded(child: body)],
      );

  Widget _errorState(BuildContext context, WidgetRef ref, NqColors c) => Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            NqIcon(NqIcons.warningCircle, size: 28, color: c.tx2),
            const SizedBox(height: 12),
            Text('تعذّر تحميل بيانات الصيانة',
                style: NqType.body.copyWith(color: c.tx2)),
            const SizedBox(height: 12),
            TextButton(
              onPressed: () => ref.invalidate(truckMaintenanceProvider(truckId)),
              child: Text('إعادة المحاولة',
                  style: NqType.labelStrong.copyWith(color: c.mintTx)),
            ),
          ],
        ),
      );

  Widget _appBar(BuildContext context, NqColors c, TruckMaintenance? m) =>
      Padding(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
        child: Row(
          children: [
            NqIcon(NqIcons.dotsThree, size: 22, color: c.tx),
            const Spacer(),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Ltr(m?.plateNumber ?? '—',
                    style: NqType.code(size: 16).copyWith(color: c.tx)),
                const SizedBox(height: 2),
                Text(
                    m == null
                        ? '…'
                        : [truckTypeLabel(m.type), m.makeModel]
                            .where((s) => s.isNotEmpty)
                            .join(' · '),
                    style: NqType.caption.copyWith(color: c.tx2)),
              ],
            ),
            const SizedBox(width: 12),
            GestureDetector(
              onTap: () => Navigator.of(context).maybePop(),
              child: NqIcon(NqIcons.arrowRight, size: 22, color: c.tx),
            ),
          ],
        ),
      );

  Widget _heroCard(NqColors c, TruckMaintenance m) {
    final progress = m.serviceProgress;
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: c.hero,
        borderRadius: BorderRadius.circular(NqRadius.cardOverlap),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Row(
            children: [
              if (m.driverName != null)
                Text('السائق: ${m.driverName}',
                    style: NqType.caption
                        .copyWith(color: NqFixed.heroTextSecondary)),
              const Spacer(),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: NqFixed.heroFill2,
                  borderRadius: BorderRadius.circular(NqRadius.pill),
                ),
                child: Row(mainAxisSize: MainAxisSize.min, children: [
                  Text('إدارة صيانة الأسطول',
                      style: NqType.caption.copyWith(
                          color: NqFixed.heroText, fontWeight: FontWeight.w700)),
                  const SizedBox(width: 6),
                  NqIcon(NqIcons.wrench, size: 14, color: NqFixed.heroAccent),
                ]),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Text('عدّاد المسافة',
              style: NqType.caption.copyWith(color: NqFixed.heroTextSecondary)),
          const SizedBox(height: 2),
          Row(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              Ltr(m.odometerKm != null ? _grouped(m.odometerKm!) : '—',
                  style:
                      NqType.price(size: 26).copyWith(color: NqFixed.heroText)),
              const SizedBox(width: 4),
              Text('km',
                  style: NqType.h3.copyWith(color: NqFixed.heroTextSecondary)),
            ],
          ),
          if (m.kmToService != null) ...[
            const SizedBox(height: 10),
            Row(
              children: [
                Ltr('${_grouped(m.kmToService!)} km',
                    style: NqType.numeric(15, FontWeight.w700)
                        .copyWith(color: const Color(0xFFFBBF24))),
                const Spacer(),
                Text('الصيانة القادمة بعد',
                    style: NqType.caption
                        .copyWith(color: NqFixed.heroTextSecondary)),
              ],
            ),
            if (progress != null) ...[
              const SizedBox(height: 8),
              ClipRRect(
                borderRadius: BorderRadius.circular(3),
                child: LinearProgressIndicator(
                  value: progress,
                  minHeight: 6,
                  backgroundColor: const Color(0x1FFFFFFF),
                  color: const Color(0xFFFBBF24),
                ),
              ),
            ],
          ],
        ],
      ),
    );
  }

  Widget _scheduleHeader(
          BuildContext context, WidgetRef ref, NqColors c, TruckMaintenance m) =>
      Row(
        children: [
          GestureDetector(
            onTap: () => showMaintenanceLogSheet(context, ref, m),
            child: Text('إضافة بند',
                style: NqType.labelStrong.copyWith(color: c.mintTx)),
          ),
          const Spacer(),
          Text('جدول الصيانة', style: NqType.h2.copyWith(color: c.tx)),
        ],
      );

  Widget _scheduleCard(NqColors c, TruckMaintenance m) {
    final items = <Widget>[];
    void add(Widget w) {
      if (items.isNotEmpty) items.add(_divider(c));
      items.add(w);
    }

    // Oil & filters
    final oilChip = m.kmToService != null ? 'بعد ${_grouped(m.kmToService!)} km' : 'غير محدد';
    final oilWarn = m.kmToService != null && m.kmToService! < 2000;
    add(_item(c, NqIcons.drop, 'تغيير الزيت والفلاتر',
        'كل ${_grouped(m.oilIntervalKm)} km', oilChip,
        warn: oilWarn, ok: m.kmToService != null && !oilWarn));

    // Periodic inspection
    add(_expiryItem(c, NqIcons.clipboardText, 'الفحص الفني الدوري',
        m.inspectionExpiry, dateFmt: _dmy));

    // Insurance
    add(_expiryItem(c, NqIcons.shieldCheck, 'التأمين', m.insuranceExpiry,
        dateFmt: _my));

    // Tires
    final tiresOk = m.tiresChangedAt != null;
    add(_item(c, NqIcons.gauge, 'الإطارات',
        tiresOk ? 'آخر تغيير ${_my(m.tiresChangedAt!)}' : 'غير مُسجّل',
        tiresOk ? 'سليمة' : '—',
        ok: tiresOk));

    return Container(
      decoration: BoxDecoration(
        color: c.sf,
        borderRadius: BorderRadius.circular(NqRadius.card),
        border: Border.all(color: c.bd),
      ),
      child: Column(children: items),
    );
  }

  /// A schedule row driven by an expiry date (chip = days remaining / منتهٍ).
  Widget _expiryItem(NqColors c, String icon, String title, DateTime? expiry,
      {required String Function(DateTime) dateFmt}) {
    if (expiry == null) {
      return _item(c, icon, title, 'غير مُسجّل', '—');
    }
    final days = expiry.difference(DateTime.now()).inDays;
    final bool warn = days < 30;
    final String chip;
    if (days < 0) {
      chip = 'منتهٍ';
    } else if (days <= 30) {
      chip = 'خلال $days يومًا';
    } else {
      chip = 'ساري';
    }
    return _item(c, icon, title, 'ينتهي ${dateFmt(expiry)}', chip,
        warn: warn, ok: !warn);
  }

  Widget _divider(NqColors c) => Padding(
      padding: const EdgeInsets.symmetric(horizontal: 14),
      child: Divider(color: c.bd, height: 1));

  Widget _item(NqColors c, String icon, String title, String sub, String chip,
      {bool warn = false, bool ok = false}) {
    final Color chipFg = warn ? c.warn : (ok ? c.ok : c.tx2);
    final Color chipBg = warn ? c.warnBg : (ok ? c.okBg : c.sf2);
    final Color iconFg = warn ? c.warn : (ok ? c.ok : c.tx2);
    final Color iconBg = warn ? c.warnBg : (ok ? c.okBg : c.sf2);
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
      child: Row(
        children: [
          Container(
            height: 28,
            padding: const EdgeInsets.symmetric(horizontal: 10),
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: chipBg,
              borderRadius: BorderRadius.circular(NqRadius.pill),
            ),
            child: Row(mainAxisSize: MainAxisSize.min, children: [
              if (warn || ok) ...[
                NqIcon(warn ? NqIcons.warningCircle : NqIcons.checkCircle,
                    size: 14, color: chipFg),
                const SizedBox(width: 6),
              ],
              Ltr(chip,
                  style: NqType.caption
                      .copyWith(color: chipFg, fontWeight: FontWeight.w700)),
            ]),
          ),
          const Spacer(),
          Flexible(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(title,
                    style: NqType.bodyStrong.copyWith(color: c.tx),
                    textAlign: TextAlign.right),
                const SizedBox(height: 2),
                Text(sub,
                    style: NqType.caption.copyWith(color: c.tx2),
                    textAlign: TextAlign.right),
              ],
            ),
          ),
          const SizedBox(width: 12),
          Container(
            width: 40,
            height: 40,
            alignment: Alignment.center,
            decoration: BoxDecoration(
                color: iconBg, borderRadius: BorderRadius.circular(NqRadius.input)),
            child: NqIcon(icon, size: 20, color: iconFg),
          ),
        ],
      ),
    );
  }

  Widget _recordCard(NqColors c, MaintenanceRecord r) => Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: c.sf,
          borderRadius: BorderRadius.circular(NqRadius.card),
          border: Border.all(color: c.bd),
        ),
        child: Row(
          children: [
            if (r.cost != null)
              Row(children: [
                Ltr(_grouped(r.cost!.round()),
                    style: NqType.price(size: 16).copyWith(color: c.tx)),
                const SizedBox(width: 3),
                Text('ر.س', style: NqType.caption.copyWith(color: c.tx2)),
              ]),
            const Spacer(),
            Flexible(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(r.title,
                      style: NqType.h3.copyWith(color: c.tx),
                      textAlign: TextAlign.right),
                  const SizedBox(height: 2),
                  Text(
                      [
                        if (r.performedAt != null) _dmy(r.performedAt!),
                        if (r.workshop != null && r.workshop!.isNotEmpty)
                          r.workshop,
                      ].join(' · '),
                      style: NqType.caption.copyWith(color: c.tx2),
                      textAlign: TextAlign.right),
                ],
              ),
            ),
            const SizedBox(width: 12),
            Container(
              width: 40,
              height: 40,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                  color: c.sf2,
                  borderRadius: BorderRadius.circular(NqRadius.input)),
              child: NqIcon(NqIcons.wrench, size: 20, color: c.tx2),
            ),
          ],
        ),
      );

  Widget _emptyRecords(NqColors c) => Container(
        padding: const EdgeInsets.symmetric(vertical: 28),
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: c.sf,
          borderRadius: BorderRadius.circular(NqRadius.card),
          border: Border.all(color: c.bd),
        ),
        child: Column(
          children: [
            NqIcon(NqIcons.wrench, size: 26, color: c.tx2),
            const SizedBox(height: 10),
            Text('لا توجد صيانات مُسجّلة بعد',
                style: NqType.caption.copyWith(color: c.tx2)),
          ],
        ),
      );

  Widget _footer(
          BuildContext context, WidgetRef ref, NqColors c, TruckMaintenance m) =>
      Container(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
        decoration: BoxDecoration(
          color: c.sf,
          border: Border(top: BorderSide(color: c.bd)),
        ),
        child: NqButton(
            label: 'تسجيل صيانة',
            icon: NqIcons.wrench,
            onPressed: () => showMaintenanceLogSheet(context, ref, m)),
      );
}

/// 184320 → "184,320".
String _grouped(int n) {
  final s = n.abs().toString();
  final buf = StringBuffer(n < 0 ? '-' : '');
  for (var i = 0; i < s.length; i++) {
    if (i > 0 && (s.length - i) % 3 == 0) buf.write(',');
    buf.write(s[i]);
  }
  return buf.toString();
}

String _two(int n) => n.toString().padLeft(2, '0');
String _dmy(DateTime d) => '${_two(d.day)}/${_two(d.month)}/${d.year}';
String _my(DateTime d) => '${_two(d.month)}/${d.year}';
