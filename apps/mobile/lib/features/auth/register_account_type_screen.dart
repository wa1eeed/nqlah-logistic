import 'package:flutter/material.dart';

import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';
import '../../core/widgets/nq_icon.dart';
import '../../design_system/form_fields.dart';
import '../../design_system/segmented.dart';
import '../../design_system/text_field.dart';
import 'wizard_scaffold.dart';

/// Register step 1/4 — account type (handoff 1l). Carrier (= Provider) vs
/// Customer; Company vs Individual; CR + VAT (15-digit) with a
/// "not VAT-registered" toggle; region + city.
class RegisterAccountTypeScreen extends StatefulWidget {
  const RegisterAccountTypeScreen({super.key, this.onNext});

  final VoidCallback? onNext;

  @override
  State<RegisterAccountTypeScreen> createState() =>
      _RegisterAccountTypeScreenState();
}

class _RegisterAccountTypeScreenState extends State<RegisterAccountTypeScreen> {
  bool _isCarrier = true; // true = ناقل (provider), false = عميل
  int _entityType = 0; // 0 = منشأة, 1 = فرد
  bool _notVatRegistered = false;

  @override
  Widget build(BuildContext context) {
    return WizardScaffold(
      step: 1,
      totalSteps: 4,
      nextLabel: 'التالي: اختيار الباقة',
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
                selected: !_isCarrier,
                onTap: () => setState(() => _isCarrier = false),
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: _TypeCard(
                title: 'ناقل',
                subtitle: 'أنقل الحمولات',
                icon: NqIcons.truck,
                selected: _isCarrier,
                onTap: () => setState(() => _isCarrier = true),
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        NqSegmented(
          options: const ['منشأة', 'فرد'],
          index: _entityType,
          onChanged: (i) => setState(() => _entityType = i),
          height: 52,
        ),
        const SizedBox(height: 20),
        const NqTextField(
          label: 'رقم السجل التجاري',
          valid: true,
          keyboardType: TextInputType.number,
        ),
        const SizedBox(height: 18),
        NqTextField(
          label: 'الرقم الضريبي',
          keyboardType: TextInputType.number,
          counter: _notVatRegistered ? null : '11/15',
          error: _notVatRegistered
              ? null
              : 'يجب أن يتكوّن الرقم الضريبي من 15 رقمًا',
        ),
        const SizedBox(height: 16),
        NqCheckbox(
          value: _notVatRegistered,
          onChanged: (v) => setState(() => _notVatRegistered = v),
          label: 'المنشأة غير مسجّلة في ضريبة القيمة المضافة',
        ),
        const SizedBox(height: 20),
        Row(
          children: [
            const Expanded(
              child: NqDropdownField(label: 'المنطقة', value: 'الشرقية'),
            ),
            const SizedBox(width: 14),
            const Expanded(
              child: NqDropdownField(label: 'المدينة', value: 'الدمام'),
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
            // icon tile at the start (right in RTL)
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
