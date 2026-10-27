import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_exception.dart';
import '../../core/fleet/fleet_repository.dart';
import '../../core/marketplace/marketplace_repository.dart';
import '../../core/orders/order_draft_controller.dart'
    show saudiCities, regionForCity;
import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';
import '../../core/widgets/nq_icon.dart';
import '../../design_system/button.dart';

/// Opens the publish/unpublish-availability sheet for one fleet truck.
Future<void> showTruckAvailabilitySheet(
  BuildContext context,
  WidgetRef ref,
  TruckModel truck,
  MyAvailability? existing,
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
      child: _AvailabilitySheet(truck: truck, existing: existing),
    ),
  );
}

class _AvailabilitySheet extends ConsumerStatefulWidget {
  const _AvailabilitySheet({required this.truck, this.existing});

  final TruckModel truck;
  final MyAvailability? existing;

  @override
  ConsumerState<_AvailabilitySheet> createState() => _AvailabilitySheetState();
}

class _AvailabilitySheetState extends ConsumerState<_AvailabilitySheet> {
  late String _origin;
  String? _dest; // null = any destination
  final _price = TextEditingController();
  bool _busy = false;
  String? _error;

  bool get _isPublished => widget.existing != null;

  @override
  void initState() {
    super.initState();
    final ex = widget.existing;
    _origin = ex?.originCity.isNotEmpty == true
        ? ex!.originCity
        : (saudiCities.isNotEmpty ? saudiCities.first : 'الرياض');
    if (!saudiCities.contains(_origin)) _origin = saudiCities.first;
    _dest = (ex?.destCity ?? '').isNotEmpty ? ex!.destCity : null;
    if (ex?.pricePerTrip != null) {
      _price.text = ex!.pricePerTrip!
          .toStringAsFixed(ex.pricePerTrip! == ex.pricePerTrip!.roundToDouble() ? 0 : 2);
    }
  }

  @override
  void dispose() {
    _price.dispose();
    super.dispose();
  }

  Future<void> _publish() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final price = num.tryParse(_price.text.trim());
      await ref.read(marketplaceRepositoryProvider).publish(
            widget.truck.id,
            originCity: _origin,
            originRegion: regionForCity(_origin),
            destCity: _dest,
            destRegion: _dest != null ? regionForCity(_dest!) : null,
            pricePerTrip: price,
          );
      ref.invalidate(myAvailabilityProvider);
      if (mounted) Navigator.of(context).pop();
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } catch (_) {
      setState(() => _error = 'تعذّر نشر الشاحنة. حاول مجددًا.');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _unpublish() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ref.read(marketplaceRepositoryProvider).unpublish(widget.truck.id);
      ref.invalidate(myAvailabilityProvider);
      if (mounted) Navigator.of(context).pop();
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } catch (_) {
      setState(() => _error = 'تعذّر إلغاء النشر. حاول مجددًا.');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = context.nq;
    final t = widget.truck;
    final isBusy = t.status.toUpperCase() != 'AVAILABLE';
    return SafeArea(
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
            const SizedBox(height: 16),
            Text(_isPublished ? 'تعديل التوفّر' : 'نشر الشاحنة في السوق',
                style: NqType.h2.copyWith(color: c.tx), textAlign: TextAlign.right),
            const SizedBox(height: 4),
            Text('${t.typeLabel} · ${t.plateNumber}',
                style: NqType.caption.copyWith(color: c.tx2),
                textAlign: TextAlign.right),
            const SizedBox(height: 18),
            _label(c, 'المدينة المتاحة منها'),
            const SizedBox(height: 6),
            _cityDropdown(
              c,
              value: _origin,
              hint: 'اختر المدينة',
              onChanged: (v) => setState(() => _origin = v ?? _origin),
            ),
            const SizedBox(height: 14),
            _label(c, 'الوجهة (اختياري)'),
            const SizedBox(height: 6),
            _cityDropdown(
              c,
              value: _dest,
              hint: 'أي وجهة',
              allowNone: true,
              onChanged: (v) => setState(() => _dest = v),
            ),
            const SizedBox(height: 14),
            _label(c, 'السعر التقديري للرحلة (اختياري)'),
            const SizedBox(height: 6),
            _priceField(c),
            if (isBusy) ...[
              const SizedBox(height: 14),
              _hint(
                c,
                'الشاحنة ${_truckStatusLabel(t.status)} حاليًا — لن تظهر للعملاء حتى تعود متاحة، لكن سيُحفظ النشر.',
              ),
            ],
            if (_error != null) ...[
              const SizedBox(height: 14),
              _hint(c, _error!, error: true),
            ],
            const SizedBox(height: 20),
            NqButton(
              label: _busy
                  ? '...'
                  : (_isPublished ? 'تحديث النشر' : 'نشر في السوق'),
              icon: NqIcons.broadcast,
              onPressed: _busy ? null : _publish,
            ),
            if (_isPublished) ...[
              const SizedBox(height: 10),
              TextButton(
                onPressed: _busy ? null : _unpublish,
                child: Text('إلغاء النشر',
                    style: NqType.labelStrong.copyWith(color: c.err)),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _label(NqColors c, String text) => Text(text,
      style: NqType.label.copyWith(color: c.tx2), textAlign: TextAlign.right);

  Widget _cityDropdown(
    NqColors c, {
    required String? value,
    required String hint,
    required ValueChanged<String?> onChanged,
    bool allowNone = false,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14),
      decoration: BoxDecoration(
        color: c.sf,
        borderRadius: BorderRadius.circular(NqRadius.input),
        border: Border.all(color: c.bd),
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<String?>(
          value: value,
          isExpanded: true,
          hint: Text(hint, style: NqType.body.copyWith(color: c.tx3)),
          icon: NqIcon(NqIcons.caretDown, size: 16, color: c.tx2),
          dropdownColor: c.sf,
          borderRadius: BorderRadius.circular(NqRadius.card),
          style: NqType.body.copyWith(color: c.tx),
          items: [
            if (allowNone)
              DropdownMenuItem<String?>(
                value: null,
                child: Text('أي وجهة', style: NqType.body.copyWith(color: c.tx)),
              ),
            for (final city in saudiCities)
              DropdownMenuItem<String?>(
                value: city,
                child: Text(city,
                    textAlign: TextAlign.right,
                    style: NqType.body.copyWith(color: c.tx)),
              ),
          ],
          onChanged: onChanged,
        ),
      ),
    );
  }

  Widget _priceField(NqColors c) => Container(
        height: 50,
        padding: const EdgeInsets.symmetric(horizontal: 14),
        decoration: BoxDecoration(
          color: c.sf,
          borderRadius: BorderRadius.circular(NqRadius.input),
          border: Border.all(color: c.bd),
        ),
        child: Row(
          children: [
            Text('ر.س', style: NqType.caption.copyWith(color: c.tx2)),
            const SizedBox(width: 10),
            Expanded(
              child: TextField(
                controller: _price,
                keyboardType: TextInputType.number,
                textAlign: TextAlign.right,
                style: NqType.body.copyWith(color: c.tx),
                cursorColor: c.mintS,
                decoration: InputDecoration(
                  isCollapsed: true,
                  border: InputBorder.none,
                  hintText: 'مثال: 1500',
                  hintStyle: NqType.body.copyWith(color: c.tx3),
                ),
              ),
            ),
          ],
        ),
      );

  Widget _hint(NqColors c, String text, {bool error = false}) {
    final color = error ? c.err : c.info;
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.10),
        borderRadius: BorderRadius.circular(NqRadius.input),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Text(text,
                style: NqType.caption.copyWith(color: c.tx, height: 1.6),
                textAlign: TextAlign.right),
          ),
          const SizedBox(width: 8),
          NqIcon(error ? NqIcons.warningCircle : NqIcons.info,
              size: 16, color: color),
        ],
      ),
    );
  }

  String _truckStatusLabel(String s) {
    switch (s.toUpperCase()) {
      case 'ON_TRIP':
        return 'في رحلة';
      case 'MAINTENANCE':
        return 'في الصيانة';
      case 'OUT_OF_SERVICE':
        return 'متوقفة';
      default:
        return 'غير متاحة';
    }
  }
}
