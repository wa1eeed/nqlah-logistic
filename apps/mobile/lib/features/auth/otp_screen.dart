import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';
import '../../core/widgets/nq_icon.dart';
import '../../design_system/button.dart';

/// OTP login / verification (handoff 5d). 4 boxes, LTR, auto-advance, resend
/// timer; CTA enabled only when all 4 digits are entered.
class OtpScreen extends StatefulWidget {
  const OtpScreen({super.key, this.phone = '+966 55 482 1930', this.onVerify});

  final String phone;
  final VoidCallback? onVerify;

  @override
  State<OtpScreen> createState() => _OtpScreenState();
}

class _OtpScreenState extends State<OtpScreen> {
  final _controllers = List.generate(4, (_) => TextEditingController());
  final _focuses = List.generate(4, (_) => FocusNode());

  String get _code => _controllers.map((c) => c.text).join();
  bool get _complete => _code.length == 4;

  @override
  void dispose() {
    for (final c in _controllers) {
      c.dispose();
    }
    for (final f in _focuses) {
      f.dispose();
    }
    super.dispose();
  }

  void _onChanged(int i, String v) {
    if (v.isNotEmpty && i < 3) _focuses[i + 1].requestFocus();
    if (v.isEmpty && i > 0) _focuses[i - 1].requestFocus();
    setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    final c = context.nq;
    return Scaffold(
      backgroundColor: c.bg,
      appBar: AppBar(
        backgroundColor: c.bg,
        leading: IconButton(
          icon: NqIcon(NqIcons.arrowRight, size: 22, color: c.tx),
          onPressed: () => Navigator.of(context).maybePop(),
        ),
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(24, 8, 24, 24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text('أدخل رمز التحقق',
                  style: NqType.display.copyWith(fontSize: 26, color: c.tx)),
              const SizedBox(height: 10),
              Text.rich(
                TextSpan(
                  style: NqType.body.copyWith(color: c.tx2, height: 1.6),
                  children: [
                    const TextSpan(text: 'أرسلنا رمزًا إلى '),
                    TextSpan(
                      text: widget.phone,
                      style: NqType.numeric(15, FontWeight.w600)
                          .copyWith(color: c.tx),
                    ),
                    const TextSpan(text: '  '),
                    TextSpan(
                      text: 'تعديل',
                      style: NqType.labelStrong.copyWith(color: c.mintTx),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 28),
              Directionality(
                textDirection: TextDirection.ltr,
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    for (var i = 0; i < 4; i++) ...[
                      _box(c, i),
                      if (i < 3) const SizedBox(width: 12),
                    ],
                  ],
                ),
              ),
              const SizedBox(height: 24),
              Center(
                child: Text.rich(
                  TextSpan(
                    style: NqType.body.copyWith(color: c.tx2),
                    children: [
                      const TextSpan(text: 'إعادة الإرسال خلال '),
                      TextSpan(
                        text: '0:42',
                        style: NqType.numeric(15, FontWeight.w600)
                            .copyWith(color: c.tx),
                      ),
                      const TextSpan(text: '   ·   '),
                      TextSpan(
                        text: 'عبر واتساب',
                        style: NqType.labelStrong.copyWith(color: c.tx3),
                      ),
                    ],
                  ),
                ),
              ),
              const Spacer(),
              NqButton(
                label: 'تحقق',
                onPressed: _complete ? (widget.onVerify ?? () {}) : null,
                locked: !_complete,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _box(NqColors c, int i) {
    final filled = _controllers[i].text.isNotEmpty;
    return SizedBox(
      width: 62,
      height: 62,
      child: TextField(
        controller: _controllers[i],
        focusNode: _focuses[i],
        onChanged: (v) => _onChanged(i, v),
        onTap: () => setState(() {}),
        textAlign: TextAlign.center,
        keyboardType: TextInputType.number,
        maxLength: 1,
        inputFormatters: [FilteringTextInputFormatter.digitsOnly],
        style: NqType.numeric(24, FontWeight.w700).copyWith(color: c.tx),
        cursorColor: c.mintS,
        decoration: InputDecoration(
          counterText: '',
          filled: true,
          fillColor: c.sf,
          contentPadding: EdgeInsets.zero,
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(NqRadius.input),
            borderSide: BorderSide(color: filled ? c.mintS : c.bd),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(NqRadius.input),
            borderSide: BorderSide(color: c.mintS, width: 2),
          ),
        ),
      ),
    );
  }
}
