import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/orders/order_draft_controller.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/theme/typography.dart';
import '../../../core/widgets/nq_icon.dart';
import '../../../design_system/chip.dart';
import '../../../design_system/segmented.dart';
import '../../../design_system/text_field.dart';
import 'order_validation.dart';
import 'order_wizard_scaffold.dart';

/// Create-order step 1/6 — cargo (handoff 1b). Single order collects cargo
/// type/description/weight/truck type; consolidated stays a visual preview
/// (multi-leg create is a follow-up).
class OrderStep1Cargo extends ConsumerStatefulWidget {
  const OrderStep1Cargo({super.key, this.onNext});

  final VoidCallback? onNext;

  @override
  ConsumerState<OrderStep1Cargo> createState() => _OrderStep1CargoState();
}

class _OrderStep1CargoState extends ConsumerState<OrderStep1Cargo> {
  late final TextEditingController _desc;
  late final TextEditingController _weight;
  final _descKey = GlobalKey();
  final _weightKey = GlobalKey();
  String? _descErr;
  String? _weightErr;

  @override
  void initState() {
    super.initState();
    final d = ref.read(orderDraftProvider);
    _desc = TextEditingController(text: d.cargoDescription);
    _weight = TextEditingController(text: d.weight?.toString() ?? '');
  }

  @override
  void dispose() {
    _desc.dispose();
    _weight.dispose();
    super.dispose();
  }

  Future<void> _next() async {
    final d = ref.read(orderDraftProvider);
    if (!d.single) {
      await ensureStepComplete(context, [MissingField('اختر «شحنة واحدة» للمتابعة', _descKey)]);
      return;
    }
    setState(() {
      _descErr = d.cargoDescription.trim().isEmpty ? 'أدخل وصف الحمولة' : null;
      _weightErr = (d.weight ?? 0) < 1 ? 'أدخل وزنًا صحيحًا (1 طن فأكثر)' : null;
    });
    final missing = <MissingField>[
      if (_descErr != null) MissingField('وصف الحمولة', _descKey),
      if (_weightErr != null) MissingField('الوزن (طن)', _weightKey),
    ];
    if (await ensureStepComplete(context, missing)) widget.onNext?.call();
  }

  @override
  Widget build(BuildContext context) {
    final c = context.nq;
    final notifier = ref.read(orderDraftProvider.notifier);
    final d = ref.watch(orderDraftProvider);
    return OrderWizardScaffold(
      step: 1,
      stepName: 'الحمولة',
      nextLabel: 'المسار',
      title: 'ما نوع الطلب؟',
      onNext: _next,
      children: [
        NqSegmented(
          options: const ['مجمّع', 'شحنة واحدة'],
          index: d.single ? 1 : 0,
          onChanged: (i) => notifier.patch((x) => x.copyWith(single: i == 1)),
          height: 52,
        ),
        const SizedBox(height: 16),
        if (d.single) ..._singleInputs(c, notifier, d) else ..._consolidatedPreview(c),
      ],
    );
  }

  List<Widget> _singleInputs(NqColors c, OrderDraftController n, OrderDraft d) {
    return [
      _label(c, 'نوع الشاحنة'),
      const SizedBox(height: 8),
      _chipRow(
        truckOptions,
        d.requiredTruckType,
        (v) => n.patch((x) => x.copyWith(requiredTruckType: v)),
      ),
      const SizedBox(height: 18),
      _label(c, 'نوع الحمولة'),
      const SizedBox(height: 8),
      _chipRow(
        cargoOptions,
        d.cargoType,
        (v) => n.patch((x) => x.copyWith(cargoType: v)),
      ),
      const SizedBox(height: 18),
      NqTextField(
        key: _descKey,
        label: 'وصف الحمولة',
        controller: _desc,
        hint: 'مثال: 18 طبلية مواد غذائية معبّأة',
        error: _descErr,
        onChanged: (v) {
          n.patch((x) => x.copyWith(cargoDescription: v));
          if (_descErr != null) setState(() => _descErr = null);
        },
      ),
      const SizedBox(height: 18),
      NqTextField(
        key: _weightKey,
        label: 'الوزن (طن)',
        controller: _weight,
        keyboardType: const TextInputType.numberWithOptions(decimal: true),
        textAlign: TextAlign.right,
        error: _weightErr,
        onChanged: (v) {
          n.patch((x) => x.copyWith(weight: num.tryParse(v.trim())));
          if (_weightErr != null) setState(() => _weightErr = null);
        },
      ),
    ];
  }

  List<Widget> _consolidatedPreview(NqColors c) {
    return [
      Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: c.infoBg,
          borderRadius: BorderRadius.circular(NqRadius.button),
        ),
        child: Row(
          children: [
            NqIcon(NqIcons.info, size: 20, color: c.info),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                  'الطلب المجمّع (عدة رحلات) قيد التطوير. اختر «شحنة واحدة» للنشر الآن.',
                  style: NqType.caption.copyWith(color: c.tx2, height: 1.5),
                  textAlign: TextAlign.right),
            ),
          ],
        ),
      ),
      const SizedBox(height: 14),
      _previewCard(c, '1', 'تريلا سطحة · الرياض', 'مع إرجاع حاوية'),
      const SizedBox(height: 10),
      _previewCard(c, '2', 'مبرّدة · جدة', 'بدون توقفات'),
    ];
  }

  Widget _previewCard(NqColors c, String n, String title, String sub) => Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: c.sf,
          borderRadius: BorderRadius.circular(NqRadius.card),
          border: Border.all(color: c.bd),
        ),
        child: Row(
          children: [
            Container(
              width: 28,
              height: 28,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                  color: c.sf2, borderRadius: BorderRadius.circular(8)),
              child: Text(n, style: NqType.labelStrong.copyWith(color: c.tx2)),
            ),
            const Spacer(),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(title, style: NqType.h3.copyWith(color: c.tx)),
                const SizedBox(height: 2),
                Text(sub, style: NqType.caption.copyWith(color: c.tx2)),
              ],
            ),
          ],
        ),
      );

  Widget _chipRow(List<Opt> opts, String selected, ValueChanged<String> onPick) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      reverse: true,
      child: Row(
        children: [
          for (var i = 0; i < opts.length; i++) ...[
            NqChip(
              label: opts[i].label,
              selected: opts[i].value == selected,
              onTap: () => onPick(opts[i].value),
            ),
            if (i < opts.length - 1) const SizedBox(width: 8),
          ],
        ],
      ),
    );
  }

  Widget _label(NqColors c, String t) =>
      Text(t, style: NqType.labelStrong.copyWith(color: c.tx2));
}
