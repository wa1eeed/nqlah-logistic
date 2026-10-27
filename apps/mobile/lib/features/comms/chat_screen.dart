import 'package:flutter/material.dart';

import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';
import '../../core/widgets/ltr.dart';
import '../../core/widgets/nq_icon.dart';

/// In-app chat (handoff 1n). Before acceptance: in-app only, phone numbers
/// masked. Text + voice notes + attachments; voice/video call entry points.
class ChatScreen extends StatelessWidget {
  const ChatScreen({super.key, this.onCall, this.onVideo});

  final VoidCallback? onCall;
  final VoidCallback? onVideo;

  @override
  Widget build(BuildContext context) {
    final c = context.nq;
    return Scaffold(
      backgroundColor: c.bg,
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _header(context, c),
            Divider(color: c.bd, height: 1),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 16),
                children: [
                  _lockBanner(c),
                  const SizedBox(height: 14),
                  _offerContext(c),
                  const SizedBox(height: 18),
                  Center(child: Text('اليوم', style: NqType.caption.copyWith(color: c.tx3))),
                  const SizedBox(height: 14),
                  _outgoing(c, 'هل الحمولة على طبليات؟ ونحتاج نعرف وقت التحميل بالضبط.', '10:24'),
                  const SizedBox(height: 12),
                  _voiceNote(c, '0:18'),
                  const SizedBox(height: 12),
                  _imageBubble(c, 'صورة الطبليات من المستودع'),
                ],
              ),
            ),
            _recordingComposer(c),
          ],
        ),
      ),
    );
  }

  Widget _header(BuildContext context, NqColors c) => Padding(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 10),
        child: Row(
          children: [
            GestureDetector(
              onTap: () => Navigator.of(context).maybePop(),
              child: NqIcon(NqIcons.arrowRight, size: 22, color: c.tx),
            ),
            const SizedBox(width: 12),
            Container(
              width: 44,
              height: 44,
              alignment: Alignment.center,
              decoration: BoxDecoration(color: c.hero, borderRadius: BorderRadius.circular(NqRadius.input)),
              child: Text('أ', style: NqType.h3.copyWith(color: NqFixed.heroText)),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Row(mainAxisAlignment: MainAxisAlignment.end, children: [
                    NqIcon(NqIcons.sealCheck, fill: true, size: 15, color: c.mintTx),
                    const SizedBox(width: 6),
                    Flexible(child: Text('شركة الأفق للنقل', style: NqType.h3.copyWith(color: c.tx), overflow: TextOverflow.ellipsis)),
                  ]),
                  const SizedBox(height: 2),
                  Text('★ 4.8 · متصل الآن', style: NqType.caption.copyWith(color: c.tx2)),
                ],
              ),
            ),
            const SizedBox(width: 12),
            GestureDetector(onTap: onCall, child: NqIcon(NqIcons.phone, size: 24, color: c.mintTx)),
            const SizedBox(width: 16),
            GestureDetector(onTap: onVideo, child: NqIcon(NqIcons.videoCamera, size: 24, color: c.mintTx)),
          ],
        ),
      );

  Widget _lockBanner(NqColors c) => Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(color: c.sf2, borderRadius: BorderRadius.circular(NqRadius.button)),
        child: Row(children: [
          NqIcon(NqIcons.lockSimple, size: 18, color: c.tx3),
          const SizedBox(width: 12),
          Expanded(
            child: Text('التواصل داخل التطبيق فقط. تظهر أرقام الجوال بعد قبول العرض.',
                style: NqType.caption.copyWith(color: c.tx2, height: 1.5), textAlign: TextAlign.right),
          ),
        ]),
      );

  Widget _offerContext(NqColors c) => Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: c.sf,
          borderRadius: BorderRadius.circular(NqRadius.button),
          border: Border.all(color: c.bd),
        ),
        child: Row(children: [
          Ltr('1,950', style: NqType.price(size: 16).copyWith(color: c.tx)),
          const Spacer(),
          Row(children: [
            Text('عرض على ', style: NqType.label.copyWith(color: c.tx2)),
            Ltr('NQ-24-08840', style: NqType.code(size: 13).copyWith(color: c.tx2)),
          ]),
          const SizedBox(width: 10),
          NqIcon(NqIcons.handCoins, size: 18, color: c.mintTx),
        ]),
      );

  Widget _outgoing(NqColors c, String text, String time) => Align(
        alignment: Alignment.centerRight,
        child: ConstraintsBubble(
          child: Container(
            padding: const EdgeInsets.fromLTRB(14, 12, 14, 10),
            decoration: BoxDecoration(
              color: c.hero,
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(16),
                topRight: Radius.circular(16),
                bottomLeft: Radius.circular(16),
                bottomRight: Radius.circular(4),
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(text, style: NqType.body.copyWith(color: NqFixed.heroText, height: 1.5), textAlign: TextAlign.right),
                const SizedBox(height: 6),
                Row(mainAxisSize: MainAxisSize.min, children: [
                  NqIcon(NqIcons.checks, size: 14, color: NqFixed.heroAccent),
                  const SizedBox(width: 6),
                  Ltr(time, style: NqType.caption.copyWith(color: NqFixed.heroTextSecondary)),
                ]),
              ],
            ),
          ),
        ),
      );

  Widget _voiceNote(NqColors c, String duration) => Align(
        alignment: Alignment.centerLeft,
        child: ConstraintsBubble(
          child: Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: c.sf,
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(16),
                topRight: Radius.circular(16),
                bottomRight: Radius.circular(16),
                bottomLeft: Radius.circular(4),
              ),
              border: Border.all(color: c.bd),
            ),
            child: Row(mainAxisSize: MainAxisSize.min, children: [
              Container(
                width: 36,
                height: 36,
                alignment: Alignment.center,
                decoration: BoxDecoration(color: c.mint, shape: BoxShape.circle),
                child: NqIcon(NqIcons.play, fill: true, size: 16, color: c.onMint),
              ),
              const SizedBox(width: 10),
              _Waveform(color: c.mintS, playedColor: c.bd, width: 120),
              const SizedBox(width: 10),
              Ltr(duration, style: NqType.caption.copyWith(color: c.tx2)),
            ]),
          ),
        ),
      );

  Widget _imageBubble(NqColors c, String caption) => Align(
        alignment: Alignment.centerLeft,
        child: ConstraintsBubble(
          child: Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: c.sf,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: c.bd),
            ),
            child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              Container(
                height: 150,
                width: 200,
                alignment: Alignment.center,
                decoration: BoxDecoration(color: c.sf2, borderRadius: BorderRadius.circular(NqRadius.input)),
                child: Text('cargo photo', style: NqType.caption.copyWith(color: c.tx3)),
              ),
              const SizedBox(height: 8),
              Text(caption, style: NqType.caption.copyWith(color: c.tx2), textAlign: TextAlign.right),
            ]),
          ),
        ),
      );

  Widget _recordingComposer(NqColors c) => Container(
        padding: const EdgeInsets.fromLTRB(16, 10, 16, 16),
        decoration: BoxDecoration(color: c.sf, border: Border(top: BorderSide(color: c.bd))),
        child: Row(children: [
          Container(
            width: 56,
            height: 56,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: c.mint,
              shape: BoxShape.circle,
              boxShadow: [BoxShadow(color: c.mintBg, spreadRadius: 6)],
            ),
            child: NqIcon(NqIcons.microphone, fill: true, size: 24, color: c.onMint),
          ),
          const SizedBox(width: 12),
          Expanded(child: _Waveform(color: c.err, playedColor: c.errBg, width: double.infinity)),
          const SizedBox(width: 10),
          Row(children: [
            NqIcon(NqIcons.caretDoubleRight, size: 14, color: c.tx3),
            const SizedBox(width: 4),
            Text('اسحب للإلغاء', style: NqType.caption.copyWith(color: c.tx3)),
          ]),
          const SizedBox(width: 10),
          Ltr('0:14', style: NqType.numeric(14, FontWeight.w600).copyWith(color: c.tx)),
          const SizedBox(width: 8),
          Container(width: 10, height: 10, decoration: BoxDecoration(color: c.err, shape: BoxShape.circle)),
        ]),
      );
}

/// Caps bubble width to ~78% of the screen.
class ConstraintsBubble extends StatelessWidget {
  const ConstraintsBubble({super.key, required this.child});
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final w = MediaQuery.of(context).size.width * 0.78;
    return ConstrainedBox(constraints: BoxConstraints(maxWidth: w), child: child);
  }
}

class _Waveform extends StatelessWidget {
  const _Waveform({required this.color, required this.playedColor, required this.width});
  final Color color;
  final Color playedColor;
  final double width;

  static const _heights = [8, 16, 22, 14, 26, 10, 18, 24, 12, 20, 14, 8, 22, 16, 26, 10, 18, 12, 20, 14, 24, 8, 16, 22];

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: width == double.infinity ? null : width,
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          for (var i = 0; i < _heights.length; i++) ...[
            Container(
              width: 3,
              height: _heights[i].toDouble(),
              decoration: BoxDecoration(
                color: i < _heights.length * 0.45 ? color : playedColor,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            if (i < _heights.length - 1) const SizedBox(width: 2),
          ],
        ],
      ),
    );
  }
}
