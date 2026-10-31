import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/auth/registration_controller.dart';
import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';
import '../../core/widgets/nq_icon.dart';
import '../../design_system/form_fields.dart';
import '../../design_system/segmented.dart';
import '../../design_system/text_field.dart';
import 'wizard_scaffold.dart';

const _regions = [
  'الرياض', 'مكة المكرمة', 'المدينة المنورة', 'القصيم', 'الشرقية', 'عسير',
  'تبوك', 'حائل', 'الحدود الشمالية', 'جازان', 'نجران', 'الباحة', 'الجوف',
];
const _cities = [
  'الرياض', 'جدة', 'مكة المكرمة', 'المدينة المنورة', 'الدمام', 'الخبر',
  'الظهران', 'الأحساء', 'الطائف', 'بريدة', 'عنيزة', 'تبوك', 'أبها',
  'خميس مشيط', 'حائل', 'نجران', 'جازان', 'الجبيل', 'ينبع', 'عرعر', 'سكاكا',
];

/// Register step 2 — account type (handoff 1l). Carrier (= Provider) vs
/// Customer; Company vs Individual; CR + VAT (15-digit) with a
/// "not VAT-registered" toggle; region + city.
class RegisterAccountTypeScreen extends ConsumerStatefulWidget {
  const RegisterAccountTypeScreen({super.key, this.onNext});

  final VoidCallback? onNext;

  @override
  ConsumerState<RegisterAccountTypeScreen> createState() =>
      _RegisterAccountTypeScreenState();
}

class _RegisterAccountTypeScreenState
    extends ConsumerState<RegisterAccountTypeScreen> {
  late final TextEditingController _cr;
  late final TextEditingController _vat;

  @override
  void initState() {
    super.initState();
    final d = ref.read(registrationControllerProvider);
    _cr = TextEditingController(text: d.crNumber);
    _vat = TextEditingController(text: d.vatNumber);
  }

  @override
  void dispose() {
    _cr.dispose();
    _vat.dispose();
    super.dispose();
  }

  void _pick(String title, List<String> options, ValueChanged<String> onPick) {
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
              child: Text(title,
                  style: NqType.h3.copyWith(color: c.tx),
                  textAlign: TextAlign.center),
            ),
            for (final o in options)
              ListTile(
                title: Text(o,
                    style: NqType.body.copyWith(color: c.tx),
                    textAlign: TextAlign.right),
                onTap: () {
                  onPick(o);
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
    final notifier = ref.read(registrationControllerProvider.notifier);
    final d = ref.watch(registrationControllerProvider);
    final notVat = !d.vatRegistered;
    final vatLen = _vat.text.trim().length;
    final vatError = !notVat && vatLen > 0 && vatLen != 15
        ? 'يجب أن يتكوّن الرقم الضريبي من 15 رقمًا'
        : null;

    return WizardScaffold(
      step: 2,
      totalSteps: d.isCarrier ? 5 : 4,
      nextLabel: d.isCarrier ? 'التالي: اختيار الباقة' : 'التالي: المستندات',
      nextIcon: NqIcons.arrowLeft,
      title: 'إنشاء حساب',
      subtitle: 'اختر كيف ستستخدم نقلة',
      onNext: widget.onNext ?? () {},
      children: [
        Row(
          children: [
            Expanded(
              child: _TypeCard(
                title: 'عميل',
                subtitle: 'أشحن بضائع',
                icon: NqIcons.package,
                selected: !d.isCarrier,
                onTap: () =>
                    notifier.patch((x) => x.copyWith(isCarrier: false)),
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: _TypeCard(
                title: 'ناقل',
                subtitle: 'أنقل الحمولات',
                icon: NqIcons.truck,
                selected: d.isCarrier,
                onTap: () =>
                    notifier.patch((x) => x.copyWith(isCarrier: true)),
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        NqSegmented(
          options: const ['منشأة', 'فرد'],
          index: d.isIndividual ? 1 : 0,
          onChanged: (i) =>
              notifier.patch((x) => x.copyWith(isIndividual: i == 1)),
          height: 52,
        ),
        const SizedBox(height: 20),
        // Commercial Registration applies to an establishment («منشأة») only —
        // hidden for individuals.
        if (!d.isIndividual) ...[
          NqTextField(
            label: 'رقم السجل التجاري',
            controller: _cr,
            keyboardType: TextInputType.number,
            valid: _cr.text.trim().length == 10,
            onChanged: (v) {
              notifier.patch((x) => x.copyWith(crNumber: v));
              setState(() {});
            },
          ),
          const SizedBox(height: 18),
        ],
        NqTextField(
          label: 'الرقم الضريبي',
          controller: _vat,
          keyboardType: TextInputType.number,
          counter: notVat ? null : '$vatLen/15',
          error: vatError,
          onChanged: (v) {
            notifier.patch((x) => x.copyWith(vatNumber: v));
            setState(() {});
          },
        ),
        const SizedBox(height: 16),
        NqCheckbox(
          value: notVat,
          onChanged: (v) =>
              notifier.patch((x) => x.copyWith(vatRegistered: !v)),
          label: 'المنشأة غير مسجّلة في ضريبة القيمة المضافة',
        ),
        const SizedBox(height: 20),
        Row(
          children: [
            Expanded(
              child: NqDropdownField(
                label: 'المنطقة',
                value: d.region,
                onTap: () => _pick('المنطقة', _regions,
                    (v) => notifier.patch((x) => x.copyWith(region: v))),
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: NqDropdownField(
                label: 'المدينة',
                value: d.city,
                onTap: () => _pick('المدينة', _cities,
                    (v) => notifier.patch((x) => x.copyWith(city: v))),
              ),
            ),
          ],
        ),
      ],
    );
  }
}

class _TypeCard extends StatelessWidget {
  const _TypeCard({
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.selected,
    required this.onTap,
  });

  final String title;
  final String subtitle;
  final String icon;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final c = context.nq;
    return GestureDetector(
      onTap: onTap,
      child: Container(
        height: 136,
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: selected ? c.mintBg : c.sf,
          borderRadius: BorderRadius.circular(NqRadius.cardOverlap),
          border: Border.all(
            color: selected ? c.mintS : c.bd,
            width: selected ? 2 : 1,
          ),
        ),
        child: Stack(
          children: [
            PositionedDirectional(
              top: 0,
              start: 0,
              child: Container(
                width: 48,
                height: 48,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: selected ? c.hero : c.sf2,
                  borderRadius: BorderRadius.circular(NqRadius.input),
                ),
                child: NqIcon(icon,
                    fill: true,
                    size: 24,
                    color: selected ? NqFixed.heroText : c.tx3),
              ),
            ),
            if (selected)
              PositionedDirectional(
                top: 2,
                end: 0,
                child: Container(
                  width: 24,
                  height: 24,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: c.mintS,
                    borderRadius: BorderRadius.circular(NqRadius.pill),
                  ),
                  child: NqIcon(NqIcons.check,
                      size: 14, color: c.isDark ? c.onMint : Colors.white),
                ),
              ),
            Align(
              alignment: AlignmentDirectional.bottomStart,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(title, style: NqType.h2.copyWith(color: c.tx)),
                  const SizedBox(height: 2),
                  Text(subtitle, style: NqType.caption.copyWith(color: c.tx2)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
