import 'package:flutter/material.dart';

import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';
import '../../core/widgets/ltr.dart';
import '../../core/widgets/nq_icon.dart';

/// Video call (handoff 1o) — always dark. Remote video full-bleed, self-view,
/// call controls.
class VideoCallScreen extends StatelessWidget {
  const VideoCallScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final white = NqFixed.heroText;
    final sub = NqFixed.heroTextSecondary;
    return Scaffold(
      backgroundColor: NqFixed.callBg,
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topRight,
            end: Alignment.bottomLeft,
            colors: [Color(0xFF123F3B), Color(0xFF0B1413)],
          ),
        ),
        child: SafeArea(
          child: Stack(
            children: [
              Center(
                child: Text('remote video · carrier',
                    style: NqType.body.copyWith(color: sub)),
              ),
              Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _qualityPill(sub, white),
                    const Spacer(),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Row(mainAxisSize: MainAxisSize.min, children: [
                          NqIcon(NqIcons.sealCheck, fill: true, size: 18, color: NqFixed.heroAccent),
                          const SizedBox(width: 6),
                          Text('عبدالرحمن السبيعي', style: NqType.h2.copyWith(color: white)),
                        ]),
                        const SizedBox(height: 2),
                        Row(mainAxisSize: MainAxisSize.min, children: [
                          Ltr('04:12', style: NqType.numeric(14, FontWeight.w500).copyWith(color: sub)),
                          Text(' · شركة الأفق للنقل', style: NqType.caption.copyWith(color: sub)),
                        ]),
                      ],
                    ),
                  ],
                ),
              ),
              PositionedDirectional(
                top: 90,
                end: 16,
                child: Container(
                  width: 104,
                  height: 150,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: const Color(0x14FFFFFF),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: const Color(0x33FFFFFF)),
                  ),
                  child: Text('you', style: NqType.caption.copyWith(color: sub)),
                ),
              ),
              Align(
                alignment: Alignment.bottomCenter,
                child: Padding(
                  padding: const EdgeInsets.only(bottom: 34),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      _control(NqIcons.phoneDisconnect, 'إنهاء', bg: NqFixed.callEnd, fg: white, fill: true),
                      _control(NqIcons.videoCamera, 'الكاميرا', bg: const Color(0x24FFFFFF), fg: white),
                      _control(NqIcons.cameraRotate, 'تبديل', bg: const Color(0x24FFFFFF), fg: white),
                      _control(NqIcons.speakerHigh, 'السماعة', bg: const Color(0x24FFFFFF), fg: white),
                      _control(NqIcons.microphoneSlash, 'كتم', bg: Colors.white, fg: const Color(0xFF0E2F2C), fill: true, active: true),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _qualityPill(Color sub, Color white) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
        decoration: BoxDecoration(
          color: const Color(0x24FFFFFF),
          borderRadius: BorderRadius.circular(NqRadius.pill),
        ),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          NqIcon(NqIcons.cellSignalFull, fill: true, size: 14, color: NqFixed.heroAccent),
          const SizedBox(width: 6),
          Text('اتصال جيد', style: NqType.caption.copyWith(color: white)),
        ]),
      );

  Widget _control(String icon, String label, {required Color bg, required Color fg, bool fill = false, bool active = false}) => Padding(
        padding: const EdgeInsets.symmetric(horizontal: 7),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          Container(
            width: 56,
            height: 56,
            alignment: Alignment.center,
            decoration: BoxDecoration(color: bg, shape: BoxShape.circle),
            child: NqIcon(icon, fill: fill, size: 24, color: fg),
          ),
          const SizedBox(height: 6),
          Text(label, style: NqType.caption.copyWith(color: NqFixed.heroTextSecondary)),
        ]),
      );
}

/// Incoming in-app call (handoff 5g) — always dark.
class IncomingCallScreen extends StatelessWidget {
  const IncomingCallScreen({super.key, this.onAnswer, this.onDecline});

  final VoidCallback? onAnswer;
  final VoidCallback? onDecline;

  @override
  Widget build(BuildContext context) {
    final white = NqFixed.heroText;
    final sub = NqFixed.heroTextSecondary;
    return Scaffold(
      backgroundColor: NqFixed.callBg,
      body: Container(
        decoration: const BoxDecoration(
          gradient: RadialGradient(
            center: Alignment.topCenter,
            radius: 1.1,
            colors: [Color(0xFF123F3B), Color(0xFF0B1413)],
          ),
        ),
        child: SafeArea(
          child: Column(
            children: [
              const SizedBox(height: 28),
              Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                Text('مكالمة صوتية واردة · داخل التطبيق', style: NqType.label.copyWith(color: sub)),
                const SizedBox(width: 8),
                NqIcon(NqIcons.phone, size: 16, color: sub),
              ]),
              const SizedBox(height: 44),
              _avatar(),
              const SizedBox(height: 28),
              Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                NqIcon(NqIcons.sealCheck, fill: true, size: 22, color: NqFixed.heroAccent),
                const SizedBox(width: 8),
                Text('عبدالرحمن السبيعي', style: NqType.display.copyWith(fontSize: 26, color: white)),
              ]),
              const SizedBox(height: 8),
              Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                Ltr('NQ-24-08812', style: NqType.code(size: 14).copyWith(color: sub)),
                Text(' شركة الأفق للنقل · بخصوص ', style: NqType.body.copyWith(color: sub)),
              ]),
              const SizedBox(height: 14),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                decoration: BoxDecoration(color: const Color(0x14FFFFFF), borderRadius: BorderRadius.circular(NqRadius.pill)),
                child: Row(mainAxisSize: MainAxisSize.min, children: [
                  Text('الرقم غير ظاهر · مكالمة عبر نقلة', style: NqType.caption.copyWith(color: sub)),
                  const SizedBox(width: 6),
                  NqIcon(NqIcons.lockSimple, size: 14, color: sub),
                ]),
              ),
              const Spacer(),
              Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                _quickReply('رد برسالة', NqIcons.chatCenteredDots),
                const SizedBox(width: 12),
                _quickReply('سأعاود الاتصال', null),
              ]),
              const SizedBox(height: 28),
              Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                _bigBtn('رفض', NqIcons.phoneDisconnect, const Color(0xFFDC2626), onDecline),
                const SizedBox(width: 64),
                _bigBtn('رد', NqIcons.phone, const Color(0xFF22C55E), onAnswer),
              ]),
              const SizedBox(height: 32),
            ],
          ),
        ),
      ),
    );
  }

  Widget _avatar() => SizedBox(
        width: 168,
        height: 168,
        child: Stack(
          alignment: Alignment.center,
          children: [
            Container(width: 168, height: 168, decoration: BoxDecoration(shape: BoxShape.circle, border: Border.all(color: const Color(0x2E1FE0C0)))),
            Container(width: 136, height: 136, decoration: BoxDecoration(shape: BoxShape.circle, border: Border.all(color: const Color(0x591FE0C0)))),
            Container(
              width: 108,
              height: 108,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: const Color(0xFF0E2F2C),
                borderRadius: BorderRadius.circular(32),
                border: Border.all(color: NqFixed.heroAccent, width: 2),
              ),
              child: Text('أ', style: NqType.display.copyWith(fontSize: 44, color: NqFixed.heroText)),
            ),
          ],
        ),
      );

  Widget _quickReply(String label, String? icon) => Container(
        height: 36,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        decoration: BoxDecoration(color: const Color(0x14FFFFFF), borderRadius: BorderRadius.circular(NqRadius.pill)),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          Text(label, style: NqType.label.copyWith(color: NqFixed.heroText)),
          if (icon != null) ...[
            const SizedBox(width: 6),
            NqIcon(icon, size: 16, color: NqFixed.heroTextSecondary),
          ],
        ]),
      );

  Widget _bigBtn(String label, String icon, Color color, VoidCallback? onTap) => Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          GestureDetector(
            onTap: onTap,
            child: Container(
              width: 72,
              height: 72,
              alignment: Alignment.center,
              decoration: BoxDecoration(color: color, shape: BoxShape.circle),
              child: NqIcon(icon, fill: true, size: 28, color: Colors.white),
            ),
          ),
          const SizedBox(height: 10),
          Text(label, style: NqType.label.copyWith(color: NqFixed.heroText)),
        ],
      );
}
