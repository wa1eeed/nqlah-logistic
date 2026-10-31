import 'package:flutter/material.dart';

import '../core/platform/countries.dart';
import '../core/theme/tokens.dart';
import '../core/theme/typography.dart';
import '../core/widgets/nq_icon.dart';
import 'option_picker.dart';

/// Phone input with a searchable country-code selector. Replaces the old
/// hard-coded «+966» prefix so the app can be used from any country. The flag +
/// dial code tap opens a searchable country picker; the number is entered LTR.
class NqPhoneField extends StatefulWidget {
  const NqPhoneField({
    super.key,
    this.label,
    required this.controller,
    required this.country,
    required this.onCountryChanged,
    this.error,
    this.hint,
    this.onChanged,
  });

  final String? label;
  final TextEditingController controller;
  final Country country;
  final ValueChanged<Country> onCountryChanged;
  final String? error;
  final String? hint;
  final ValueChanged<String>? onChanged;

  @override
  State<NqPhoneField> createState() => _NqPhoneFieldState();
}

class _NqPhoneFieldState extends State<NqPhoneField> {
  final _focus = FocusNode();

  @override
  void initState() {
    super.initState();
    _focus.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _focus.dispose();
    super.dispose();
  }

  Future<void> _pickCountry() async {
    final picked = await nqPickOption<Country>(
      context,
      title: 'اختر الدولة',
      options: kCountries,
      label: (x) => '${x.flag}  ${x.nameAr}',
      subtitle: (x) => '${x.nameEn} · ${x.dial}',
      searchHint: 'ابحث عن دولة',
    );
    if (picked != null) widget.onCountryChanged(picked);
  }

  @override
  Widget build(BuildContext context) {
    final c = context.nq;
    final hasError = widget.error != null;
    final focused = _focus.hasFocus;
    final borderColor = hasError
        ? c.err
        : focused
            ? c.mintS
            : c.bd;
    final borderWidth = hasError ? 1.5 : (focused ? 2.0 : 1.0);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (widget.label != null) ...[
          Text(widget.label!, style: NqType.labelStrong.copyWith(color: c.tx)),
          const SizedBox(height: 6),
        ],
        AnimatedContainer(
          duration: NqMotion.toggle,
          height: NqLayout.input,
          padding: const EdgeInsets.symmetric(horizontal: 12),
          decoration: BoxDecoration(
            color: c.sf,
            borderRadius: BorderRadius.circular(NqRadius.input),
            border: Border.all(color: borderColor, width: borderWidth),
            boxShadow: focused && !hasError
                ? [BoxShadow(color: c.mintBg, spreadRadius: 3, blurRadius: 0)]
                : null,
          ),
          child: Directionality(
            textDirection: TextDirection.ltr,
            child: Row(
              children: [
                // Country selector (flag + dial + caret).
                GestureDetector(
                  onTap: _pickCountry,
                  behavior: HitTestBehavior.opaque,
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(widget.country.flag, style: const TextStyle(fontSize: 18)),
                      const SizedBox(width: 6),
                      Text(widget.country.dial,
                          style: NqType.numeric(16, FontWeight.w600).copyWith(color: c.tx)),
                      const SizedBox(width: 2),
                      NqIcon(NqIcons.caretDown, size: 14, color: c.tx3),
                    ],
                  ),
                ),
                const SizedBox(width: 10),
                Container(width: 1, height: 22, color: c.bd),
                const SizedBox(width: 12),
                Expanded(
                  child: TextField(
                    controller: widget.controller,
                    focusNode: _focus,
                    keyboardType: TextInputType.phone,
                    onChanged: widget.onChanged,
                    textAlign: TextAlign.left,
                    textDirection: TextDirection.ltr,
                    style: NqType.numeric(16, FontWeight.w600).copyWith(color: c.tx),
                    cursorColor: c.mintS,
                    decoration: InputDecoration(
                      isCollapsed: true,
                      border: InputBorder.none,
                      hintText: widget.hint ?? '5XXXXXXXX',
                      hintStyle: NqType.body.copyWith(color: c.tx3, fontSize: 16),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
        if (hasError) ...[
          const SizedBox(height: 6),
          Row(children: [
            NqIcon(NqIcons.warningCircle, size: 14, color: c.err),
            const SizedBox(width: 6),
            Expanded(child: Text(widget.error!, style: NqType.caption.copyWith(color: c.err))),
          ]),
        ],
      ],
    );
  }
}
