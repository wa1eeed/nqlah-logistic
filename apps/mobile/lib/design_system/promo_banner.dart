import 'package:flutter/material.dart';

import '../core/theme/tokens.dart';
import '../core/theme/typography.dart';
import '../core/widgets/nq_icon.dart';

/// A dismissible promotional banner for the home screen, shown only when the
/// `promoBanner` feature flag is on (toggled server-side from the admin). Purely
/// additive — it never gates existing content.
class PromoBanner extends StatefulWidget {
  const PromoBanner({super.key});

  @override
  State<PromoBanner> createState() => _PromoBannerState();
}

class _PromoBannerState extends State<PromoBanner> {
  bool _dismissed = false;

  @override
  Widget build(BuildContext context) {
    if (_dismissed) return const SizedBox.shrink();
    final c = context.nq;
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 0, 16, 16),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: c.mintBg,
        borderRadius: BorderRadius.circular(NqRadius.card),
        border: Border.all(color: c.mint.withValues(alpha: 0.18)),
      ),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: c.mint.withValues(alpha: 0.14),
              borderRadius: BorderRadius.circular(12),
            ),
            child: NqIcon(NqIcons.megaphone, size: 22, color: c.mintTx),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('عروض وخصومات حصرية',
                    style: NqType.labelStrong.copyWith(color: c.tx)),
                const SizedBox(height: 2),
                Text('تابع أحدث العروض على شحناتك داخل التطبيق.',
                    style: NqType.caption.copyWith(color: c.tx2)),
              ],
            ),
          ),
          GestureDetector(
            behavior: HitTestBehavior.opaque,
            onTap: () => setState(() => _dismissed = true),
            child: Padding(
              padding: const EdgeInsets.all(4),
              child: NqIcon(NqIcons.x, size: 16, color: c.tx3),
            ),
          ),
        ],
      ),
    );
  }
}
