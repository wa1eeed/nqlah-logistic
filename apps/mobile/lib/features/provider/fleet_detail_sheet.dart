import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/fleet/fleet_repository.dart';
import '../../core/marketplace/marketplace_repository.dart';
import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';
import '../../core/widgets/ltr.dart';
import '../../core/widgets/nq_icon.dart';
import 'truck_availability_sheet.dart';

/// Read-only detail browse for a fleet driver («تفاصيل السائق») — fields + the
/// provider note. Editing the note is done on the carrier web dashboard.
Future<void> showDriverDetailSheet(BuildContext context, DriverModel d) {
  return _showSheet(
    context,
    builder: (c) {
      final (statusLabel, statusColor) = _driverStatus(c, d.status);
      return _DetailBody(
        c: c,
        initial: d.name.isNotEmpty ? d.name.substring(0, 1) : 'س',
        title: d.name,
        subtitle: 'سائق',
        statusLabel: statusLabel,
        statusColor: statusColor,
        rows: [
          if ((d.phone ?? '').isNotEmpty)
            _Row('الجوال', d.phone!, ltr: true),
          if ((d.licenseType ?? '').isNotEmpty)
            _Row('نوع الرخصة', d.licenseType!),
          _Row('عدد الرحلات', '${d.totalTrips}'),
          if (d.rating > 0) _Row('التقييم', '★ ${d.rating.toStringAsFixed(1)}'),
        ],
        note: d.note,
      );
    },
  );
}

/// Read-only detail browse for a fleet truck («تفاصيل الشاحنة») — fields + the
/// provider note, with a shortcut to manage its marketplace availability.
Future<void> showTruckDetailSheet(
  BuildContext context,
  WidgetRef ref,
  TruckModel t,
  MyAvailability? availability,
) {
  return _showSheet(
    context,
    builder: (c) {
      final (statusLabel, statusColor) = _truckStatus(c, t.status);
      return _DetailBody(
        c: c,
        initial: 'ش',
        title: t.typeLabel,
        subtitle: t.makeModel.isNotEmpty ? t.makeModel : 'شاحنة',
        statusLabel: statusLabel,
        statusColor: statusColor,
        rows: [
          _Row('اللوحة', t.plateNumber, ltr: true),
          _Row('النوع', t.typeLabel),
          if (t.makeModel.isNotEmpty) _Row('الصنع/الموديل', t.makeModel),
          _Row('التوفّر في السوق', availability != null ? 'منشور' : 'غير منشور'),
        ],
        note: t.note,
        action: _SheetAction(
          label: availability != null ? 'إدارة التوفّر' : 'أعلن عن توفّر',
          icon: NqIcons.broadcast,
          onTap: () {
            Navigator.of(context).pop();
            showTruckAvailabilitySheet(context, ref, t, availability);
          },
        ),
      );
    },
  );
}

Future<void> _showSheet(BuildContext context,
    {required Widget Function(NqColors) builder}) {
  final c = context.nq;
  return showModalBottomSheet<void>(
    context: context,
    backgroundColor: c.sf,
    isScrollControlled: true,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(NqRadius.sheet)),
    ),
    builder: (_) => Directionality(
      textDirection: TextDirection.rtl,
      child: SafeArea(top: false, child: builder(c)),
    ),
  );
}

class _Row {
  const _Row(this.label, this.value, {this.ltr = false});
  final String label;
  final String value;
  final bool ltr;
}

class _SheetAction {
  const _SheetAction({required this.label, required this.icon, required this.onTap});
  final String label;
  final String icon;
  final VoidCallback onTap;
}

class _DetailBody extends StatelessWidget {
  const _DetailBody({
    required this.c,
    required this.initial,
    required this.title,
    required this.subtitle,
    required this.statusLabel,
    required this.statusColor,
    required this.rows,
    this.note,
    this.action,
  });

  final NqColors c;
  final String initial;
  final String title;
  final String subtitle;
  final String statusLabel;
  final Color statusColor;
  final List<_Row> rows;
  final String? note;
  final _SheetAction? action;

  @override
  Widget build(BuildContext context) {
    return Padding(
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
          const SizedBox(height: 16),
          Row(
            children: [
              Container(
                width: 52,
                height: 52,
                alignment: Alignment.center,
                decoration: BoxDecoration(color: c.sf2, shape: BoxShape.circle),
                child: Text(initial, style: NqType.h2.copyWith(color: c.tx2)),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title,
                        style: NqType.h2.copyWith(color: c.tx),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis),
                    const SizedBox(height: 2),
                    Text(subtitle,
                        style: NqType.caption.copyWith(color: c.tx2),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis),
                  ],
                ),
              ),
              _statusPill(c, statusLabel, statusColor),
            ],
          ),
          const SizedBox(height: 16),
          Container(
            decoration: BoxDecoration(
              color: c.sf2,
              borderRadius: BorderRadius.circular(NqRadius.card),
            ),
            padding: const EdgeInsets.symmetric(horizontal: 14),
            child: Column(
              children: [
                for (var i = 0; i < rows.length; i++) ...[
                  if (i > 0) Divider(color: c.bd, height: 1),
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    child: Row(
                      children: [
                        Text(rows[i].label,
                            style: NqType.caption.copyWith(color: c.tx2)),
                        const Spacer(),
                        rows[i].ltr
                            ? Ltr(rows[i].value,
                                style: NqType.code(size: 13).copyWith(color: c.tx))
                            : Text(rows[i].value,
                                style: NqType.bodyStrong.copyWith(color: c.tx)),
                      ],
                    ),
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(height: 14),
          _noteCard(c, note),
          if (action != null) ...[
            const SizedBox(height: 14),
            GestureDetector(
              onTap: action!.onTap,
              child: Container(
                height: 48,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: c.mint,
                  borderRadius: BorderRadius.circular(NqRadius.button),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    NqIcon(action!.icon, size: 18, color: c.onMint),
                    const SizedBox(width: 8),
                    Text(action!.label,
                        style: NqType.labelStrong.copyWith(color: c.onMint)),
                  ],
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _noteCard(NqColors c, String? note) {
    final has = (note ?? '').trim().isNotEmpty;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
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
              NqIcon(NqIcons.notePencil, size: 16, color: c.tx2),
              const SizedBox(width: 6),
              Text('ملاحظة',
                  style: NqType.labelStrong.copyWith(color: c.tx)),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            has ? note!.trim() : 'لا توجد ملاحظة.',
            style: NqType.body.copyWith(color: has ? c.tx : c.tx3),
            textAlign: TextAlign.right,
          ),
        ],
      ),
    );
  }
}

Widget _statusPill(NqColors c, String label, Color color) => Container(
      height: 26,
      padding: const EdgeInsets.symmetric(horizontal: 10),
      decoration: BoxDecoration(
          color: color.withValues(alpha: 0.14),
          borderRadius: BorderRadius.circular(NqRadius.pill)),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        Container(
            width: 7,
            height: 7,
            decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
        const SizedBox(width: 6),
        Text(label,
            style:
                NqType.caption.copyWith(color: color, fontWeight: FontWeight.w700)),
      ]),
    );

(String, Color) _driverStatus(NqColors c, String s) {
  switch (s.toUpperCase()) {
    case 'AVAILABLE':
      return ('متاح', c.ok);
    case 'ON_TRIP':
      return ('في رحلة', c.info);
    case 'OFF_DUTY':
      return ('خارج الدوام', c.tx2);
    default:
      return (s, c.tx2);
  }
}

(String, Color) _truckStatus(NqColors c, String s) {
  switch (s.toUpperCase()) {
    case 'AVAILABLE':
      return ('متاحة', c.ok);
    case 'ON_TRIP':
      return ('في رحلة', c.info);
    case 'MAINTENANCE':
      return ('صيانة', c.warn);
    case 'OUT_OF_SERVICE':
      return ('متوقفة', c.err);
    default:
      return (s, c.tx2);
  }
}
