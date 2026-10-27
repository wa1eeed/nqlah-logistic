import 'package:flutter/material.dart';

import '../core/theme/tokens.dart';
import '../core/theme/typography.dart';
import '../core/widgets/ltr.dart';
import 'pressable.dart';
import 'status_chip.dart';

/// Compact shipment list card (handoff 4g): code + status chip, a one-line
/// route, and a single status line (+ optional progress bar).
class NqShipmentCard extends StatelessWidget {
  const NqShipmentCard({
    super.key,
    required this.code,
    required this.status,
    required this.route,
    required this.statusLine,
    this.progress,
    this.progressColor,
    this.onTap,
  });

  final String code;
  final NqStatus status;
  final String route; // e.g. "الدمام ← الرياض"
  final Widget statusLine;
  final double? progress;
  final Color? progressColor;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final c = context.nq;
    return Pressable(
      enabled: onTap != null,
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: c.sf,
          borderRadius: BorderRadius.circular(NqRadius.card),
          border: Border.all(color: c.bd),
          boxShadow: c.isDark
              ? null
              : [
                  BoxShadow(
                      color: const Color(0x0D0A1A19),
                      blurRadius: 2,
                      offset: const Offset(0, 1)),
                  BoxShadow(
                      color: const Color(0x2E0A1A19),
                      blurRadius: 22,
                      offset: const Offset(0, 8),
                      spreadRadius: -14),
                ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                NqStatusChip(status),
                const Spacer(),
                Ltr(code, style: NqType.code(size: 14).copyWith(color: c.tx2)),
              ],
            ),
            const SizedBox(height: 10),
            Text(route,
                style: NqType.h2.copyWith(fontSize: 17, color: c.tx),
                textAlign: TextAlign.right),
            const SizedBox(height: 8),
            statusLine,
            if (progress != null) ...[
              const SizedBox(height: 8),
              ClipRRect(
                borderRadius: BorderRadius.circular(2),
                child: LinearProgressIndicator(
                  value: progress,
                  minHeight: 4,
                  backgroundColor: c.sf2,
                  color: progressColor ?? c.info,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
