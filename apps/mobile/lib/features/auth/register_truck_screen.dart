import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/auth/registration_controller.dart';
import '../../core/fleet/fleet_repository.dart';
import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';
import '../../core/widgets/nq_icon.dart';
import '../../design_system/form_fields.dart';
import '../../design_system/option_picker.dart';
import '../../design_system/text_field.dart';
import 'wizard_scaffold.dart';

// Truck types offered in the quick add — a subset of the Prisma `TruckType`
// enum (kept in sync with the fleet CreateTruckDto). Labels come from the
// shared `truckTypeLabel` map so this screen matches the fleet UI.
const _quickTruckTypes = [
  'SMALL_FLATBED', 'MEDIUM_FLATBED', 'LARGE_FLATBED', 'REFRIGERATED',
  'CONTAINER_20', 'CONTAINER_40', 'TANKER', 'CURTAINSIDER', 'BOX_TRUCK', 'LOWBED',
];

/// Register step 4 (individual carriers only) — optional "quick truck" add
/// («إضافة سريعة»). Captures the essentials (type, plate, capacity) so a solo
/// carrier is ready to start right after signup. Fully skippable.
class RegisterTruckScreen extends ConsumerStatefulWidget {
  const RegisterTruckScreen({super.key, this.onNext});

  final VoidCallback? onNext;

  @override
  ConsumerState<RegisterTruckScreen> createState() =>
      _RegisterTruckScreenState();
}

class _RegisterTruckScreenState extends ConsumerState<RegisterTruckScreen> {
  late final TextEditingController _plate;
  late final TextEditingController _capacity;

  @override
  void initState() {
    super.initState();
    final d = ref.read(registrationControllerProvider);
    _plate = TextEditingController(text: d.truckPlate);
    _capacity = TextEditingController(text: d.truckCapacity);
  }

  @override
  void dispose() {
    _plate.dispose();
    _capacity.dispose();
    super.dispose();
  }

  Future<void> _pickType() async {
    final picked = await nqPickOption<String>(
      context,
      title: 'نوع الشاحنة',
      options: _quickTruckTypes,
      label: truckTypeLabel,
      searchHint: 'ابحث عن نوع',
    );
    if (picked != null) {
      ref
          .read(registrationControllerProvider.notifier)
          .patch((x) => x.copyWith(truckType: picked));
    }
  }

  void _skip() {
    // Clear any partial entry so nothing is sent, then continue.
    ref.read(registrationControllerProvider.notifier).patch(
          (x) => x.copyWith(truckType: '', truckPlate: '', truckCapacity: ''),
        );
    (widget.onNext ?? () {})();
  }

  @override
  Widget build(BuildContext context) {
    final c = context.nq;
    final notifier = ref.read(registrationControllerProvider.notifier);
    final d = ref.watch(registrationControllerProvider);

    final hasType = (d.truckType ?? '').isNotEmpty;
    final started =
        hasType || _plate.text.trim().isNotEmpty || _capacity.text.trim().isNotEmpty;
    // Once the user starts filling the truck, all essentials are required; an
    // untouched form can be skipped straight through.
    final complete = d.hasTruck;
    final capVal = double.tryParse(_capacity.text.trim());
    final capError = _capacity.text.trim().isNotEmpty && (capVal == null || capVal <= 0)
        ? 'أدخل حمولة صحيحة بالأطنان'
        : null;

    return WizardScaffold(
      step: 4,
      totalSteps: d.totalSteps,
      title: 'شاحنتك',
      subtitle: 'أضف شاحنتك الآن لتبدأ أسرع — أو تخطَّ هذه الخطوة',
      nextLabel: 'التالي: المستندات',
      nextIcon: NqIcons.arrowLeft,
      nextEnabled: !started || complete,
      onNext: widget.onNext ?? () {},
      footerLeading: GestureDetector(
        onTap: _skip,
        child: Text('أضفها لاحقًا',
            style: NqType.labelStrong.copyWith(color: c.tx2)),
      ),
      children: [
        NqDropdownField(
          label: 'نوع الشاحنة',
          value: hasType ? truckTypeLabel(d.truckType) : 'اختر النوع',
          onTap: _pickType,
        ),
        const SizedBox(height: 18),
        NqTextField(
          label: 'رقم اللوحة',
          controller: _plate,
          hint: 'أ ب ج 1234',
          valid: _plate.text.trim().isNotEmpty,
          onChanged: (v) {
            notifier.patch((x) => x.copyWith(truckPlate: v));
            setState(() {});
          },
        ),
        const SizedBox(height: 18),
        NqTextField(
          label: 'الحمولة (طن)',
          controller: _capacity,
          keyboardType: const TextInputType.numberWithOptions(decimal: true),
          valid: capVal != null && capVal > 0,
          error: capError,
          onChanged: (v) {
            notifier.patch((x) => x.copyWith(truckCapacity: v));
            setState(() {});
          },
        ),
        const SizedBox(height: 16),
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: c.infoBg,
            borderRadius: BorderRadius.circular(NqRadius.button),
          ),
          child: Row(
            children: [
              NqIcon(NqIcons.truck, size: 20, color: c.info),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  'يمكنك إضافة باقي بيانات الشاحنة وتفاصيلها لاحقًا من قسم الأسطول.',
                  style: NqType.caption.copyWith(color: c.tx2, height: 1.5),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
