import 'package:flutter/material.dart';

import '../core/theme/tokens.dart';
import '../core/theme/typography.dart';
import '../core/widgets/nq_icon.dart';

/// Text field (handoff §6): H 52, R12, 1 border `bd`, bg `sf`. Label above
/// 13/700. Focus → 2 border `mintS` + 4 ring `mintBg`. Error → 1.5 `err` +
/// message. Valid → `check-circle` `ok`.
class NqTextField extends StatefulWidget {
  const NqTextField({
    super.key,
    this.label,
    this.hint,
    this.controller,
    this.obscure = false,
    this.phone = false,
    this.keyboardType,
    this.error,
    this.valid = false,
    this.onChanged,
    this.textAlign,
    this.maxLength,
    this.counter,
  });

  final String? label;
  final String? hint;
  final TextEditingController? controller;
  final bool obscure;
  final bool phone;
  final TextInputType? keyboardType;
  final String? error;
  final bool valid;
  final ValueChanged<String>? onChanged;
  final TextAlign? textAlign;
  final int? maxLength;
  final String? counter; // e.g. "11/15", shown at the end (err if error)

  @override
  State<NqTextField> createState() => _NqTextFieldState();
}

class _NqTextFieldState extends State<NqTextField> {
  final _focus = FocusNode();
  late bool _obscured = widget.obscure;

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

  @override
  Widget build(BuildContext context) {
    final c = context.nq;
    final focused = _focus.hasFocus;
    final hasError = widget.error != null;

    Color borderColor;
    double borderWidth;
    if (hasError) {
      borderColor = c.err;
      borderWidth = 1.5;
    } else if (focused) {
      borderColor = c.mintS;
      borderWidth = 2;
    } else {
      borderColor = c.bd;
      borderWidth = 1;
    }

    final field = TextField(
      controller: widget.controller,
      focusNode: _focus,
      obscureText: _obscured,
      keyboardType:
          widget.keyboardType ?? (widget.phone ? TextInputType.phone : null),
      onChanged: widget.onChanged,
      maxLength: widget.maxLength,
      textAlign: widget.textAlign ?? (widget.phone ? TextAlign.left : TextAlign.right),
      textDirection: widget.phone ? TextDirection.ltr : null,
      style: (widget.phone ? NqType.numeric(16, FontWeight.w600) : NqType.body)
          .copyWith(color: c.tx, fontSize: 16),
      cursorColor: c.mintS,
      decoration: InputDecoration(
        isCollapsed: true,
        counterText: '',
        border: InputBorder.none,
        hintText: widget.hint,
        hintStyle: NqType.body.copyWith(color: c.tx3, fontSize: 16),
      ),
    );

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (widget.label != null) ...[
          Text(widget.label!,
              style: NqType.labelStrong.copyWith(color: c.tx)),
          const SizedBox(height: 6),
        ],
        AnimatedContainer(
          duration: NqMotion.toggle,
          height: NqLayout.input,
          padding: const EdgeInsets.symmetric(horizontal: 14),
          decoration: BoxDecoration(
            color: c.sf,
            borderRadius: BorderRadius.circular(NqRadius.input),
            border: Border.all(color: borderColor, width: borderWidth),
            boxShadow: focused && !hasError
                ? [BoxShadow(color: c.mintBg, spreadRadius: 3, blurRadius: 0)]
                : null,
          ),
          child: widget.phone
              // Phone field is laid out LTR: +966 prefix on the left.
              ? Directionality(
                  textDirection: TextDirection.ltr,
                  child: Row(
                    children: [
                      Text('+966',
                          style: NqType.numeric(16, FontWeight.w600)
                              .copyWith(color: c.tx2)),
                      const SizedBox(width: 10),
                      Container(width: 1, height: 22, color: c.bd),
                      const SizedBox(width: 12),
                      Expanded(child: field),
                    ],
                  ),
                )
              : Row(
                  children: [
                    if (widget.counter != null) ...[
                      Text(widget.counter!,
                          style: NqType.numeric(12, FontWeight.w500)
                              .copyWith(color: hasError ? c.err : c.tx3)),
                      const SizedBox(width: 10),
                    ],
                    Expanded(child: field),
                    if (widget.valid && !hasError) ...[
                      const SizedBox(width: 10),
                      NqIcon(NqIcons.checkCircle,
                          fill: true, size: 20, color: c.ok),
                    ],
                    // Password eye sits at the end (visual left in RTL).
                    if (widget.obscure) ...[
                      const SizedBox(width: 10),
                      GestureDetector(
                        onTap: () => setState(() => _obscured = !_obscured),
                        child: NqIcon(NqIcons.eye, size: 20, color: c.tx3),
                      ),
                    ],
                  ],
                ),
        ),
        if (hasError) ...[
          const SizedBox(height: 6),
          Row(
            children: [
              NqIcon(NqIcons.warningCircle, size: 14, color: c.err),
              const SizedBox(width: 6),
              Expanded(
                child: Text(widget.error!,
                    style: NqType.caption.copyWith(color: c.err)),
              ),
            ],
          ),
        ],
      ],
    );
  }
}
