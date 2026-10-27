import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';
import '../../core/widgets/nq_icon.dart';
import '../../design_system/button.dart';

/// Electronic proof of delivery (handoff 1k): photos + recipient signature +
/// recipient OTP. Submit is gated until all three steps are complete.
class DriverEpodScreen extends StatelessWidget {
  const DriverEpodScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final c = context.nq;
    return Scaffold(
      backgroundColor: c.bg,
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _appBar(context, c),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
                children: [
                  _stepHeader(c, '1 · صور البضاعة', done: '2/2'),
                  const SizedBox(height: 10),
                  _photos(c),
                  const SizedBox(height: 18),
                  _stepHeader(c, '2 · توقيع المستلم', action: 'إعادة'),
                  const SizedBox(height: 10),
                  _signature(c),
                  const SizedBox(height: 18),
                  _stepHeader(c, '3 · رمز التحقق من المستلم'),
                  const SizedBox(height: 10),
                  _otp(c),
                  const SizedBox(height: 8),
                  Text('أُرسل الرمز إلى جوال المستلم المسجّل في الطلب',
                      style: NqType.caption.copyWith(color: c.tx2), textAlign: TextAlign.right),
                ],
              ),
            ),
            _footer(c),
          ],
        ),
      ),
    );
  }

  Widget _appBar(BuildContext context, NqColors c) => Padding(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
        child: Row(children: [
          GestureDetector(
            onTap: () => Navigator.of(context).maybePop(),
            child: NqIcon(NqIcons.arrowRight, size: 22, color: c.tx),
          ),
          const Spacer(),
          Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
            Text('إثبات التسليم', style: NqType.h3.copyWith(color: c.tx)),
            const SizedBox(height: 2),
            Text('التفريغ · مستودع الرّواد', style: NqType.caption.copyWith(color: c.tx2)),
          ]),
        ]),
      );

  Widget _stepHeader(NqColors c, String title, {String? done, String? action}) => Row(
        children: [
          if (done != null)
            Row(children: [
              NqIcon(NqIcons.check, size: 14, color: c.ok),
              const SizedBox(width: 4),
              Text(done, style: NqType.labelStrong.copyWith(color: c.ok)),
            ]),
          if (action != null)
            Row(children: [
              NqIcon(NqIcons.arrowCounterClockwise, size: 14, color: c.mintTx),
              const SizedBox(width: 4),
              Text(action, style: NqType.labelStrong.copyWith(color: c.mintTx)),
            ]),
          const Spacer(),
          Text(title, style: NqType.h3.copyWith(color: c.tx)),
        ],
      );

  Widget _photos(NqColors c) => Row(
        children: [
          Expanded(child: _photoTile(c, uploaded: true)),
          const SizedBox(width: 10),
          Expanded(child: _photoTile(c, uploading: true)),
          const SizedBox(width: 10),
          Expanded(child: _addTile(c)),
        ],
      );

  Widget _addTile(NqColors c) => AspectRatio(
        aspectRatio: 1,
        child: Container(
          alignment: Alignment.center,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(NqRadius.input),
            border: Border.all(color: c.mintS, width: 1.5),
          ),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            NqIcon(NqIcons.cameraPlus, size: 26, color: c.mintTx),
            const SizedBox(height: 6),
            Text('إضافة', style: NqType.labelStrong.copyWith(color: c.mintTx)),
          ]),
        ),
      );

  Widget _photoTile(NqColors c, {bool uploading = false, bool uploaded = false}) => AspectRatio(
        aspectRatio: 1,
        child: Stack(
          children: [
            Container(
              decoration: BoxDecoration(
                color: c.sf2,
                borderRadius: BorderRadius.circular(NqRadius.input),
              ),
              alignment: Alignment.center,
              child: Text('photo', style: NqType.caption.copyWith(color: c.tx3)),
            ),
            if (uploaded)
              PositionedDirectional(
                top: 6,
                end: 6,
                child: NqIcon(NqIcons.checkCircle, fill: true, size: 22, color: c.ok),
              ),
            if (uploading)
              PositionedDirectional(
                bottom: 0,
                start: 0,
                end: 0,
                child: ClipRRect(
                  borderRadius: const BorderRadius.vertical(bottom: Radius.circular(NqRadius.input)),
                  child: LinearProgressIndicator(value: 0.6, minHeight: 4, backgroundColor: Colors.transparent, color: c.mintS),
                ),
              ),
          ],
        ),
      );

  Widget _signature(NqColors c) => Container(
        height: 150,
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: c.sf,
          borderRadius: BorderRadius.circular(NqRadius.card),
          border: Border.all(color: c.bd),
        ),
        child: Column(
          children: [
            Expanded(
              child: Center(
                child: Text('Abu Nasser',
                    style: GoogleFonts.inter(fontSize: 34, fontStyle: FontStyle.italic, color: c.tx)),
              ),
            ),
            CustomPaint(size: const Size(double.infinity, 2), painter: _DashPainter(c.bd)),
          ],
        ),
      );

  Widget _otp(NqColors c) => Directionality(
        textDirection: TextDirection.ltr,
        child: Row(
          children: [
            _box(c, '4'),
            const SizedBox(width: 10),
            _box(c, '7'),
            const SizedBox(width: 10),
            _box(c, '', active: true),
            const SizedBox(width: 10),
            _box(c, ''),
          ],
        ),
      );

  Widget _box(NqColors c, String digit, {bool active = false}) => Expanded(
        child: AspectRatio(
          aspectRatio: 1.05,
          child: Container(
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: c.sf,
              borderRadius: BorderRadius.circular(NqRadius.input),
              border: Border.all(color: active ? c.mintS : c.bd, width: active ? 2 : 1),
              boxShadow: active ? [BoxShadow(color: c.mintBg, spreadRadius: 3)] : null,
            ),
            child: active
                ? Container(width: 2, height: 26, color: c.mintS)
                : Text(digit, style: NqType.numeric(24, FontWeight.w700).copyWith(color: c.tx)),
          ),
        ),
      );

  Widget _footer(NqColors c) => Container(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
        decoration: BoxDecoration(color: c.sf, border: Border(top: BorderSide(color: c.bd))),
        child: const NqButton(
          label: 'أكمل الرمز لإرسال الإثبات',
          size: NqButtonSize.driver,
          onPressed: null,
          locked: true,
        ),
      );
}

class _DashPainter extends CustomPainter {
  _DashPainter(this.color);
  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final p = Paint()
      ..color = color
      ..strokeWidth = 2;
    double x = 0;
    final y = size.height / 2;
    while (x < size.width) {
      canvas.drawLine(Offset(x, y), Offset(x + 6, y), p);
      x += 12;
    }
  }

  @override
  bool shouldRepaint(_DashPainter old) => old.color != color;
}
