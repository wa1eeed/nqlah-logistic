import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/auth/registration_controller.dart';
import '../../core/platform/countries.dart';
import '../../core/platform/geo.dart';
import '../../core/platform/id_types.dart';
import '../../core/platform/locations.dart';
import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';
import '../../core/widgets/nq_icon.dart';
import '../../design_system/form_fields.dart';
import '../../design_system/option_picker.dart';
import '../../design_system/segmented.dart';
import '../../design_system/text_field.dart';
import 'wizard_scaffold.dart';

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
  // Backing controllers for the free-text region/city fallback (countries with
  // no admin-defined regions/cities).
  late final TextEditingController _regionText;
  late final TextEditingController _cityText;
  // Whether the user has explicitly chosen a location country yet (gates the
  // geo-IP default so we don't override a manual pick).
  bool _countryPicked = false;

  @override
  void initState() {
    super.initState();
    final d = ref.read(registrationControllerProvider);
    _cr = TextEditingController(text: d.crNumber);
    _vat = TextEditingController(text: d.vatNumber);
    _regionText = TextEditingController(text: d.region);
    _cityText = TextEditingController(text: d.city);
    // Default the location country to the IP-detected one (falls back to SA).
    ref.read(geoCountryProvider.future).then((geo) {
      if (!mounted || _countryPicked) return;
      if (ref.read(registrationControllerProvider).country == kDefaultCountryCode &&
          geo.code != kDefaultCountryCode) {
        ref
            .read(registrationControllerProvider.notifier)
            .patch((x) => x.copyWith(country: geo.code));
      }
    });
  }

  @override
  void dispose() {
    _cr.dispose();
    _vat.dispose();
    _regionText.dispose();
    _cityText.dispose();
    super.dispose();
  }

  Future<void> _pickCountry() async {
    final picked = await nqPickOption<Country>(
      context,
      title: 'الدولة',
      options: kCountries,
      label: (x) => '${x.flag}  ${x.nameAr}',
      subtitle: (x) => x.nameEn,
      searchHint: 'ابحث عن دولة',
    );
    if (picked != null) {
      _countryPicked = true;
      // Changing the country invalidates the dependent region + city.
      _regionText.clear();
      _cityText.clear();
      ref.read(registrationControllerProvider.notifier).patch(
            (x) => x.copyWith(country: picked.code, region: '', city: ''),
          );
    }
  }

  Future<void> _pickRegion(List<LocationRegion> regions) async {
    final picked = await nqPickOption<LocationRegion>(
      context,
      title: 'المنطقة',
      options: regions,
      label: (x) => x.nameAr,
      subtitle: (x) => x.nameEn,
      searchHint: 'ابحث عن منطقة',
    );
    if (picked != null) {
      _cityText.clear();
      // Selecting a region resets the city.
      ref.read(registrationControllerProvider.notifier).patch(
            (x) => x.copyWith(region: picked.nameAr, city: ''),
          );
    }
  }

  Future<void> _pickCity(List<LocationCity> cities) async {
    final picked = await nqPickOption<LocationCity>(
      context,
      title: 'المدينة',
      options: cities,
      label: (x) => x.nameAr,
      subtitle: (x) => x.nameEn,
      searchHint: 'ابحث عن مدينة',
    );
    if (picked != null) {
      ref
          .read(registrationControllerProvider.notifier)
          .patch((x) => x.copyWith(city: picked.nameAr));
    }
  }

  Future<void> _pickNationality() async {
    final picked = await nqPickOption<Country>(
      context,
      title: 'الجنسية',
      options: kCountries,
      label: (x) => '${x.flag}  ${x.nameAr}',
      subtitle: (x) => x.nameEn,
      searchHint: 'ابحث عن دولة',
    );
    if (picked != null) {
      ref
          .read(registrationControllerProvider.notifier)
          .patch((x) => x.copyWith(nationality: picked.code));
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = context.nq;
    final notifier = ref.read(registrationControllerProvider.notifier);
    final d = ref.watch(registrationControllerProvider);
    final locs = ref.watch(locationsProvider).valueOrNull ?? LocationsData.empty;
    final notVat = !d.vatRegistered;
    final vatLen = _vat.text.trim().length;
    final vatError = !notVat && vatLen > 0 && vatLen != 15
        ? 'يجب أن يتكوّن الرقم الضريبي من 15 رقمًا'
        : null;

    return WizardScaffold(
      step: 2,
      totalSteps: d.totalSteps,
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
        // Nationality + ID type for a sole-operator (individual) carrier.
        if (d.isIndividual && d.isCarrier) ...[
          Text('الجنسية', style: NqType.labelStrong.copyWith(color: c.tx2)),
          const SizedBox(height: 6),
          GestureDetector(
            onTap: _pickNationality,
            child: Container(
              height: NqLayout.input,
              padding: const EdgeInsets.symmetric(horizontal: 14),
              decoration: BoxDecoration(
                color: c.sf,
                borderRadius: BorderRadius.circular(NqRadius.input),
                border: Border.all(color: c.bd),
              ),
              child: Row(children: [
                NqIcon(NqIcons.caretDown, size: 16, color: c.tx3),
                const Spacer(),
                Builder(builder: (_) {
                  final nat = countryByCode(d.nationality);
                  return Text('${nat.flag}  ${nat.nameAr}',
                      style: NqType.body.copyWith(color: c.tx, fontSize: 16));
                }),
              ]),
            ),
          ),
          const SizedBox(height: 16),
          Text('نوع الهوية', style: NqType.labelStrong.copyWith(color: c.tx2)),
          const SizedBox(height: 6),
          NqSegmented(
            options: [for (final t in kIdTypes) t.label],
            index: kIdTypes.indexWhere((t) => t.value == d.idType).clamp(0, kIdTypes.length - 1),
            onChanged: (i) =>
                notifier.patch((x) => x.copyWith(idType: kIdTypes[i].value)),
            height: 46,
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
        // Country → Region → City cascade. Country first (searchable, all
        // countries), then region, then city — each dependent on the previous
        // and sourced from the admin-managed dataset (GET /settings/locations).
        NqDropdownField(
          label: 'الدولة',
          value:
              '${countryByCode(d.country).flag}  ${locs.byCode(d.country)?.nameAr ?? countryByCode(d.country).nameAr}',
          onTap: _pickCountry,
        ),
        const SizedBox(height: 16),
        ..._locationFields(c, d, locs, notifier),
      ],
    );
  }

  /// Region + city fields for the selected country. Falls back to free text
  /// when the dataset defines no regions/cities, so registration is never
  /// blocked for a country that isn't curated yet.
  List<Widget> _locationFields(
    NqColors c,
    RegistrationData d,
    LocationsData locs,
    RegistrationController notifier,
  ) {
    final regions = locs.regionsFor(d.country);

    // No admin-defined regions for this country → free-text region + city.
    if (regions.isEmpty) {
      return [
        Row(
          children: [
            Expanded(
              child: NqTextField(
                label: 'المنطقة',
                controller: _regionText,
                onChanged: (v) => notifier.patch((x) => x.copyWith(region: v)),
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: NqTextField(
                label: 'المدينة',
                controller: _cityText,
                onChanged: (v) => notifier.patch((x) => x.copyWith(city: v)),
              ),
            ),
          ],
        ),
      ];
    }

    final cities = locs.citiesFor(d.country, d.region);
    final regionChosen = d.region.trim().isNotEmpty;

    return [
      Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: NqDropdownField(
              label: 'المنطقة',
              value: regionChosen ? d.region : 'اختر المنطقة',
              onTap: () => _pickRegion(regions),
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: !regionChosen
                // City depends on a region being chosen first.
                ? NqDropdownField(
                    label: 'المدينة',
                    value: 'اختر المنطقة أولاً',
                    onTap: () {},
                  )
                : cities.isEmpty
                    // Region has no curated cities → free text (don't block).
                    ? NqTextField(
                        label: 'المدينة',
                        controller: _cityText,
                        hint: 'اكتب المدينة',
                        onChanged: (v) =>
                            notifier.patch((x) => x.copyWith(city: v)),
                      )
                    : NqDropdownField(
                        label: 'المدينة',
                        value: d.city.trim().isEmpty ? 'اختر المدينة' : d.city,
                        onTap: () => _pickCity(cities),
                      ),
          ),
        ],
      ),
    ];
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
