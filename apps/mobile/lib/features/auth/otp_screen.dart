import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';
import '../../core/widgets/nq_icon.dart';
import '../../design_system/button.dart';

/// OTP verification (handoff 5d). Six boxes (the API issues 6-digit codes),
/// LTR, auto-advance, live resend countdown. Reusable: [onVerify] runs the
/// server check (returns an error message, or null on success → [onSuccess]);
/// [onResend] re-requests the code.
class OtpScreen extends StatefulWidget {
  const OtpScreen({
    super.key,
    this.phone = '+966 55 482 1930',
    this.onVerify,
    this.onResend,
    this.onSuccess,
    this.onEdit,
    this.resendSeconds = 60,
  });

  /// Shown in the subtitle. For display only.
  final String phone;

  /// Runs the server-side check; returns an error message or null on success.
  /// When null, the CTA just calls [onSuccess] (stub mode).
  final Future<String?> Function(String code)? onVerify;

  /// Re-requests the OTP. When null, the resend affordance is hidden.
  final Future<void> Function()? onResend;

  final VoidCallback? onSuccess;
  final VoidCallback? onEdit;
  final int resendSeconds;

  @override
  State<OtpScreen> createState() => _OtpScreenState();
}

class _OtpScreenState extends State<OtpScreen> {
  static const _n = 6;
  final _controllers = List.generate(_n, (_) => TextEditingController());
  final _focuses = List.generate(_n, (_) => FocusNode());

  Timer? _timer;
  int _remaining = 0;
  bool _busy = false;
  String? _error;

  String get _code => _controllers.map((c) => c.text).join();
  bool get _complete => _code.length == _n;

  @override
  void initState() {
    super.initState();
    _startCountdown();
  }

  void _startCountdown() {
    _timer?.cancel();
    setState(() => _remaining = widget.resendSeconds);
    _timer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (_remaining <= 1) {
        t.cancel();
        setState(() => _remaining = 0);
      } else {
        setState(() => _remaining--);
      }
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    for (final c in _controllers) {
      c.dispose();
    }
    for (final f in _focuses) {
      f.dispose();
    }
    super.dispose();
  }

  void _onChanged(int i, String v) {
    if (v.length > 1) {
      // Handle paste of the whole code.
      final digits = v.replaceAll(RegExp(r'\D'), '');
      for (var k = 0; k < _n; k++) {
        _controllers[k].text = k < digits.length ? digits[k] : '';
      }
      final last = (digits.length - 1).clamp(0, _n - 1);
      _focuses[last].requestFocus();
      setState(() => _error = null);
      return;
    }
    if (v.isNotEmpty && i < _n - 1) _focuses[i + 1].requestFocus();
    if (v.isEmpty && i > 0) _focuses[i - 1].requestFocus();
    setState(() => _error = null);
  }

  Future<void> _verify() async {
    if (!_complete || _busy) return;
    final verify = widget.onVerify;
    if (verify == null) {
      (widget.onSuccess ?? () {})();
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    final err = await verify(_code);
    if (!mounted) return;
    setState(() => _busy = false);
    if (err == null) {
      (widget.onSuccess ?? () {})();
    } else {
      setState(() {
        _error = err;
        for (final c in _controllers) {
          c.clear();
        }
      });
      _focuses.first.requestFocus();
    }
  }

  Future<void> _resend() async {
    if (_remaining > 0 || widget.onResend == null) return;
    try {
      await widget.onResend!();
    } catch (_) {
      // ignore; the countdown restart gives the user another try
    }
    if (mounted) _startCountdown();
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
                    // Render the number in its own LTR box so it always reads
                    // left-to-right in the RTL sentence, even with spaces.
                    WidgetSpan(
                      alignment: PlaceholderAlignment.middle,
                      child: Directionality(
                        textDirection: TextDirection.ltr,
                        child: Text(
                          widget.phone,
                          style: NqType.numeric(15, FontWeight.w600)
                              .copyWith(color: c.tx),
                        ),
                      ),
                    ),
                    if (widget.onEdit != null) const TextSpan(text: '  '),
                  ],
                ),
              ),
              const SizedBox(height: 28),
              Directionality(
                textDirection: TextDirection.ltr,
                child: Row(
                  children: [
                    for (var i = 0; i < _n; i++) ...[
                      Expanded(child: _box(c, i)),
                      if (i < _n - 1) const SizedBox(width: 8),
                    ],
                  ],
                ),
              ),
              if (_error != null) ...[
                const SizedBox(height: 16),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    NqIcon(NqIcons.warningCircle, size: 14, color: c.err),
                    const SizedBox(width: 6),
                    Flexible(
                      child: Text(_error!,
                          style: NqType.caption.copyWith(color: c.err),
                          textAlign: TextAlign.center),
                    ),
                  ],
                ),
              ],
              const SizedBox(height: 24),
              Center(child: _resendLine(c)),
              const Spacer(),
              NqButton(
                label: 'تحقق',
                loading: _busy,
                onPressed: _complete && !_busy ? _verify : null,
                locked: !_complete,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _resendLine(NqColors c) {
    if (widget.onResend == null) return const SizedBox.shrink();
    if (_remaining > 0) {
      final m = _remaining ~/ 60;
      final s = (_remaining % 60).toString().padLeft(2, '0');
      return Text.rich(
        TextSpan(
          style: NqType.body.copyWith(color: c.tx2),
          children: [
            const TextSpan(text: 'إعادة الإرسال خلال '),
            TextSpan(
              text: '$m:$s',
              style: NqType.numeric(15, FontWeight.w600).copyWith(color: c.tx),
            ),
          ],
        ),
      );
    }
    return GestureDetector(
      onTap: _resend,
      child: Text('إعادة إرسال الرمز',
          style: NqType.labelStrong.copyWith(color: c.mintTx)),
    );
  }

  Widget _box(NqColors c, int i) {
    final filled = _controllers[i].text.isNotEmpty;
    final hasError = _error != null;
    return SizedBox(
      height: 58,
      child: TextField(
        controller: _controllers[i],
        focusNode: _focuses[i],
        onChanged: (v) => _onChanged(i, v),
        onTap: () => setState(() {}),
        textAlign: TextAlign.center,
        keyboardType: TextInputType.number,
        maxLength: i == 0 ? _n : 1, // first box accepts a pasted full code
        inputFormatters: [FilteringTextInputFormatter.digitsOnly],
        style: NqType.numeric(22, FontWeight.w700).copyWith(color: c.tx),
        cursorColor: c.mintS,
        decoration: InputDecoration(
          counterText: '',
          filled: true,
          fillColor: c.sf,
          contentPadding: EdgeInsets.zero,
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(NqRadius.input),
            borderSide: BorderSide(
                color: hasError ? c.err : (filled ? c.mintS : c.bd)),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(NqRadius.input),
            borderSide:
                BorderSide(color: hasError ? c.err : c.mintS, width: 2),
          ),
        ),
      ),
    );
  }
}
