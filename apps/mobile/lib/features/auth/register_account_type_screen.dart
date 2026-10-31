import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/auth/registration_controller.dart';
import '../../core/fleet/fleet_repository.dart';
import '../../core/platform/countries.dart';
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
/// "not VAT-registered" toggle; a country → region → city cascade; and, for an
/// individual carrier, an optional quick-add truck to speed their readiness.
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
  // Free-text fallbacks when a country/region has no admin-defined children.
  late final TextEditingController _region;
  late final TextEditingController _city;
  // Quick-add truck.
  late final TextEditingController _plate;
  late final TextEditingController _capacity;

  @override
  void initState() {
    super.initState();
    final d = ref.read(registrationControllerProvider);
    _cr = TextEditingController(text: d.crNumber);
    _vat = TextEditingController(text: d.vatNumber);
    _region = TextEditingController(text: d.region);
    _city = TextEditingController(text: d.city);
    _plate = TextEditingController(text: d.truckPlate);
    _capacity = TextEditingController(text: d.truckCapacity);

    // Seed the company's location country from the (geo-resolved) phone country
    // the first time this step opens, while the SA defaults are untouched. A
    // non-SA country clears the SA region/city defaults so the user re-picks.
    final untouched =
        d.locationCountry == 'SA' && d.region == 'الرياض' && d.city == 'الرياض';
    if (untouched && d.countryCode != 'SA') {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        _region.clear();
        _city.clear();
        ref.read(registrationControllerProvider.notifier).patch(
            (x) => x.copyWith(locationCountry: d.countryCode, region: '', city: ''));
      });
    }
  }

  @override
  void dispose() {
    _cr.dispose();
    _vat.dispose();
    _region.dispose();
    _city.dispose();
    _plate.dispose();
    _capacity.dispose();
    super.dispose();
  }

  RegistrationController get _notifier =>
      ref.read(registrationControllerProvider.notifier);

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
      _notifier.patch((x) => x.copyWith(nationality: picked.code));
    }
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
    if (picked == null) return;
    // Changing the country resets the dependent region + city.
    _region.clear();
    _city.clear();
    _notifier
        .patch((x) => x.copyWith(locationCountry: picked.code, region: '', city: ''));
  }

  Future<void> _pickRegion(List<LocRegion> regions) async {
    final picked = await nqPickOption<LocRegion>(
      context,
      title: 'المنطقة',
      options: regions,
      label: (x) => x.nameAr,
      searchHint: 'ابحث عن منطقة',
    );
    if (picked == null) return;
    // Changing the region resets the dependent city.
    _city.clear();
    _notifier.patch((x) => x.copyWith(region: picked.nameAr, city: ''));
  }

  Future<void> _pickCity(List<LocCity> cities) async {
    final picked = await nqPickOption<LocCity>(
      context,
      title: 'المدينة',
      options: cities,
      label: (x) => x.nameAr,
      searchHint: 'ابحث عن مدينة',
    );
    if (picked == null) return;
    _notifier.patch((x) => x.copyWith(city: picked.nameAr));
  }

  Future<void> _pickTruckType() async {
    final picked = await nqPickOption<String>(
      context,
      title: 'نوع الشاحنة',
      options: kTruckTypeValues,
      label: truckTypeLabel,
      searchHint: 'ابحث عن نوع',
    );
    if (picked != null) {
      _notifier.patch((x) => x.copyWith(truckType: picked));
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = context.nq;
    final d = ref.watch(registrationControllerProvider);
    final locs = ref.watch(locationsProvider);
    final data = locs.asData?.value ?? LocationsData.empty;

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
                    _notifier.patch((x) => x.copyWith(isCarrier: false)),
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
                    _notifier.patch((x) => x.copyWith(isCarrier: true)),
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        NqSegmented(
          options: const ['منشأة', 'فرد'],
          index: d.isIndividual ? 1 : 0,
          onChanged: (i) =>
              _notifier.patch((x) => x.copyWith(isIndividual: i == 1)),
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
              _notifier.patch((x) => x.copyWith(crNumber: v));
              setState(() {});
            },
          ),
          const SizedBox(height: 18),
        ],
        // Nationality + ID type for a sole-operator (individual) carrier.
        if (d.isIndividualCarrier) ...[
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
                _notifier.patch((x) => x.copyWith(idType: kIdTypes[i].value)),
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
            _notifier.patch((x) => x.copyWith(vatNumber: v));
            setState(() {});
          },
        ),
        const SizedBox(height: 16),
        NqCheckbox(
          value: notVat,
          onChanged: (v) => _notifier.patch((x) => x.copyWith(vatRegistered: !v)),
          label: 'المنشأة غير مسجّلة في ضريبة القيمة المضافة',
        ),
        const SizedBox(height: 20),
        // Country → Region → City cascade (each dependent on the previous).
        _CountryField(
          country: countryByCode(d.locationCountry),
          onTap: _pickCountry,
        ),
        const SizedBox(height: 16),
        _locationRow(c, d, data),
        // Quick-add truck — individual carrier only (optional & skippable).
        if (d.isIndividualCarrier) ...[
          const SizedBox(height: 24),
          _quickTruck(c, d),
        ],
      ],
    );
  }

  /// The region + city row. Each is a searchable dropdown when the admin dataset
  /// defines options for the parent, otherwise a free-text fallback so a country
  /// with no regions/cities never blocks registration.
  Widget _locationRow(NqColors c, RegistrationData d, LocationsData data) {
    final regions = data.regionsFor(d.locationCountry);
    final hasRegions = regions.isNotEmpty;
    final cities = data.citiesFor(d.locationCountry, d.region);
    final hasCities = cities.isNotEmpty;

    final Widget regionField = hasRegions
        ? NqDropdownField(
            label: 'المنطقة',
            value: d.region.isEmpty ? 'اختر المنطقة' : d.region,
            onTap: () => _pickRegion(regions),
          )
        : NqTextField(
            label: 'المنطقة',
            controller: _region,
            onChanged: (v) => _notifier.patch((x) => x.copyWith(region: v)),
          );

    final Widget cityField;
    if (hasRegions && d.region.isEmpty) {
      // A region must be chosen first before its cities are known.
      cityField = NqDropdownField(
        label: 'المدينة',
        value: 'اختر المنطقة أولاً',
        onTap: null,
      );
    } else if (hasCities) {
      cityField = NqDropdownField(
        label: 'المدينة',
        value: d.city.isEmpty ? 'اختر المدينة' : d.city,
        onTap: () => _pickCity(cities),
      );
    } else {
      cityField = NqTextField(
        label: 'المدينة',
        controller: _city,
        hint: hasRegions ? 'لا مدن مُعرّفة — اكتب المدينة' : 'أدخل المدينة',
        onChanged: (v) => _notifier.patch((x) => x.copyWith(city: v)),
      );
    }

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(child: regionField),
        const SizedBox(width: 14),
        Expanded(child: cityField),
      ],
    );
  }

  Widget _quickTruck(NqColors c, RegistrationData d) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: c.sf,
        borderRadius: BorderRadius.circular(NqRadius.cardOverlap),
        border: Border.all(color: c.bd),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              NqIcon(NqIcons.truck, size: 20, color: c.tx2),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('أضف شاحنتك الآن',
                        style: NqType.labelStrong.copyWith(color: c.tx)),
                    const SizedBox(height: 2),
                    Text('اختياري — يمكنك تخطّيها وإضافتها لاحقًا',
                        style: NqType.caption.copyWith(color: c.tx3)),
                  ],
                ),
              ),
              Switch.adaptive(
                value: d.addTruck,
                onChanged: (v) => _notifier.patch((x) => x.copyWith(addTruck: v)),
              ),
            ],
          ),
          if (d.addTruck) ...[
            const SizedBox(height: 16),
            NqDropdownField(
              label: 'نوع الشاحنة',
              value: d.truckType == null
                  ? 'اختر النوع'
                  : truckTypeLabel(d.truckType),
              onTap: _pickTruckType,
            ),
            const SizedBox(height: 14),
            NqTextField(
              label: 'رقم اللوحة',
              controller: _plate,
              onChanged: (v) => _notifier.patch((x) => x.copyWith(truckPlate: v)),
            ),
            const SizedBox(height: 14),
            NqTextField(
              label: 'الحمولة (طن)',
              controller: _capacity,
              keyboardType:
                  const TextInputType.numberWithOptions(decimal: true),
              onChanged: (v) =>
                  _notifier.patch((x) => x.copyWith(truckCapacity: v)),
            ),
          ],
        ],
      ),
    );
  }
}

/// The country selector shown first in the cascade: a flag + Arabic name with a
/// caret, opening the searchable all-countries picker.
class _CountryField extends StatelessWidget {
  const _CountryField({required this.country, required this.onTap});

  final Country country;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final c = context.nq;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text('الدولة', style: NqType.labelStrong.copyWith(color: c.tx)),
        const SizedBox(height: 6),
        GestureDetector(
          onTap: onTap,
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
              Text('${country.flag}  ${country.nameAr}',
                  style: NqType.body.copyWith(color: c.tx, fontSize: 16)),
            ]),
          ),
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
