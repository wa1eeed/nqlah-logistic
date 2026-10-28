import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_exception.dart';
import '../../core/fleet/maintenance_repository.dart';
import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';
import '../../core/widgets/nq_icon.dart';
import '../../design_system/button.dart';
import '../../design_system/chip.dart';
import '../../design_system/text_field.dart';

/// Maintenance types → (Arabic label, whether it carries a renewed expiry).
const _types = <({String id, String label, bool dated})>[
  (id: 'OIL_CHANGE', label: 'تغيير الزيت والفلاتر', dated: false),
  (id: 'BRAKES', label: 'الفرامل', dated: false),
  (id: 'TIRES', label: 'الإطارات', dated: false),
  (id: 'INSPECTION', label: 'الفحص الفني', dated: true),
  (id: 'INSURANCE', label: 'التأمين', dated: true),
  (id: 'REPAIR', label: 'إصلاح', dated: false),
  (id: 'OTHER', label: 'أخرى', dated: false),
];

/// Opens the "تسجيل صيانة" sheet for a truck. On success it logs the event and
/// refreshes [truckMaintenanceProvider].
Future<void> showMaintenanceLogSheet(
  BuildContext context,
  WidgetRef ref,
  TruckMaintenance truck,
) {
  final c = context.nq;
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    backgroundColor: c.bg,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
    ),
    builder: (_) => Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: _LogSheet(truck: truck),
    ),
  );
}

class _LogSheet extends ConsumerStatefulWidget {
  const _LogSheet({required this.truck});
  final TruckMaintenance truck;

  @override
  ConsumerState<_LogSheet> createState() => _LogSheetState();
}

class _LogSheetState extends ConsumerState<_LogSheet> {
  String _type = 'OIL_CHANGE';
  final _title = TextEditingController(text: _types.first.label);
  final _cost = TextEditingController();
  final _odo = TextEditingController();
  final _workshop = TextEditingController();
  DateTime _performedAt = DateTime.now();
  DateTime? _nextDue;
  bool _busy = false;
  String? _error;

  bool get _dated => _types.firstWhere((t) => t.id == _type).dated;

  @override
  void initState() {
    super.initState();
    if (widget.truck.odometerKm != null) {
      _odo.text = widget.truck.odometerKm.toString();
    }
  }

  @override
  void dispose() {
    _title.dispose();
    _cost.dispose();
    _odo.dispose();
    _workshop.dispose();
    super.dispose();
  }

  void _selectType(String id) {
    setState(() {
      _type = id;
      final label = _types.firstWhere((t) => t.id == id).label;
      // Keep the title in sync unless the user typed a custom one.
      if (_types.any((t) => t.label == _title.text)) _title.text = label;
      if (!_dated) _nextDue = null;
    });
  }

  Future<void> _pickDate({required bool next}) async {
    final now = DateTime.now();
    final res = await showDatePicker(
      context: context,
      initialDate: next ? (_nextDue ?? now) : _performedAt,
      firstDate: DateTime(now.year - 5),
      lastDate: DateTime(now.year + 6),
    );
    if (res != null) {
      setState(() => next ? _nextDue = res : _performedAt = res);
    }
  }

  Future<void> _submit() async {
    if (_title.text.trim().length < 2) {
      setState(() => _error = 'أدخل وصف الصيانة');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    final body = <String, dynamic>{
      'type': _type,
      'title': _title.text.trim(),
      'performedAt': _performedAt.toIso8601String(),
    };
    final cost = num.tryParse(_cost.text.trim());
    final odo = int.tryParse(_odo.text.trim());
    if (cost != null) body['cost'] = cost;
    if (odo != null) body['odometerKm'] = odo;
    if (_workshop.text.trim().isNotEmpty) body['workshop'] = _workshop.text.trim();
    if (_dated && _nextDue != null) body['nextDueDate'] = _nextDue!.toIso8601String();
    try {
      await ref
          .read(maintenanceRepositoryProvider)
          .log(widget.truck.truckId, body);
      ref.invalidate(truckMaintenanceProvider(widget.truck.truckId));
      if (mounted) Navigator.of(context).pop();
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } catch (_) {
      if (mounted) setState(() => _error = 'تعذّر تسجيل الصيانة. حاول مجددًا.');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = context.nq;
    return SafeArea(
      top: false,
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 20),
        child: Column(
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
            Text('تسجيل صيانة',
                style: NqType.h2.copyWith(color: c.tx),
                textAlign: TextAlign.right),
            const SizedBox(height: 16),
            if (_error != null) ...[
              _errorBanner(c, _error!),
              const SizedBox(height: 14),
            ],
            _label(c, 'النوع'),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              alignment: WrapAlignment.end,
              textDirection: TextDirection.rtl,
              children: [
                for (final t in _types)
                  NqChip(
                    label: t.label,
                    selected: _type == t.id,
                    onTap: () => _selectType(t.id),
                  ),
              ],
            ),
            const SizedBox(height: 16),
            NqTextField(
              label: 'الوصف',
              controller: _title,
              textAlign: TextAlign.right,
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: NqTextField(
                    label: 'التكلفة (ر.س)',
                    controller: _cost,
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    textAlign: TextAlign.right,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: NqTextField(
                    label: 'العدّاد (km)',
                    controller: _odo,
                    keyboardType: TextInputType.number,
                    textAlign: TextAlign.right,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            NqTextField(
              label: 'الورشة',
              controller: _workshop,
              textAlign: TextAlign.right,
            ),
            const SizedBox(height: 12),
            _dateField(c, 'تاريخ التنفيذ', _performedAt, () => _pickDate(next: false)),
            if (_dated) ...[
              const SizedBox(height: 12),
              _dateField(c, 'تنتهي الصلاحية في', _nextDue,
                  () => _pickDate(next: true)),
            ],
            const SizedBox(height: 20),
            NqButton(
              label: _busy ? 'جارٍ الحفظ…' : 'حفظ',
              icon: NqIcons.wrench,
              loading: _busy,
              onPressed: _busy ? null : _submit,
            ),
          ],
        ),
      ),
    );
  }

  Widget _label(NqColors c, String t) => Text(t,
      style: NqType.labelStrong.copyWith(color: c.tx2),
      textAlign: TextAlign.right);

  Widget _dateField(NqColors c, String label, DateTime? value, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _label(c, label),
          const SizedBox(height: 8),
          Container(
            height: 52,
            padding: const EdgeInsets.symmetric(horizontal: 14),
            decoration: BoxDecoration(
              color: c.sf,
              borderRadius: BorderRadius.circular(NqRadius.input),
              border: Border.all(color: c.bd),
            ),
            child: Row(
              children: [
                NqIcon(NqIcons.calendarBlank, size: 18, color: c.tx2),
                const Spacer(),
                Text(
                    value != null
                        ? '${value.day.toString().padLeft(2, '0')}/${value.month.toString().padLeft(2, '0')}/${value.year}'
                        : 'اختر التاريخ',
                    style: NqType.body.copyWith(
                        color: value != null ? c.tx : c.tx2)),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _errorBanner(NqColors c, String msg) => Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: c.errBg,
          borderRadius: BorderRadius.circular(NqRadius.button),
        ),
        child: Row(
          children: [
            NqIcon(NqIcons.warningCircle, size: 18, color: c.err),
            const SizedBox(width: 12),
            Expanded(
              child: Text(msg,
                  style: NqType.caption.copyWith(color: c.err, height: 1.5),
                  textAlign: TextAlign.right),
            ),
          ],
        ),
      );
}
