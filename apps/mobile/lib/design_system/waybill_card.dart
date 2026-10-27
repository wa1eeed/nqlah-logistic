import 'package:flutter/material.dart';

import '../core/theme/tokens.dart';
import '../core/theme/typography.dart';
import '../core/widgets/ltr.dart';
import '../core/widgets/nq_icon.dart';
import 'pressable.dart';
import 'status_chip.dart';

/// A place on a route (city + area).
class RoutePoint {
  const RoutePoint(this.city, this.area);
  final String city;
  final String area;
}

/// The signature waybill card (handoff §6): header (code + status), a route
/// strip (origin dot → travelled → truck badge → dashed → destination ring),
/// a live line, a perforation divider, and a meta row.
class NqWaybillCard extends StatelessWidget {
  const NqWaybillCard({
    super.key,
    required this.code,
    required this.origin,
    required this.destination,
    required this.status,
    this.subtitle,
    this.liveText,
    this.stopCounter,
    this.truckType,
    this.plate,
    this.containerNo,
    this.onTap,
  });

  final String code;
  final String? subtitle; // e.g. "مجمّع · رحلتان"
  final RoutePoint origin;
  final RoutePoint destination;
  final NqStatus status;
  final String? liveText;
  final String? stopCounter;
  final String? truckType;
  final String? plate;
  final String? containerNo;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final c = context.nq;
    return Pressable(
      enabled: onTap != null,
      onTap: onTap,
      child: Container(
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
                      color: const Color(0x380A1A19),
                      blurRadius: 24,
                      offset: const Offset(0, 8),
                      spreadRadius: -14),
                ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 14, 16, 12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  _header(c),
                  const SizedBox(height: 14),
                  _RouteStrip(origin: origin, destination: destination),
                  if (liveText != null) ...[
                    const SizedBox(height: 12),
                    _liveLine(c),
                  ],
                ],
              ),
            ),
            if (truckType != null || containerNo != null) ...[
              const _Perforation(),
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 14),
                child: _meta(c),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _header(NqColors c) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        NqStatusChip(status),
        const Spacer(),
        Column(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Ltr(code, style: NqType.code(size: 14).copyWith(color: c.tx)),
            if (subtitle != null) ...[
              const SizedBox(height: 2),
              Text(subtitle!, style: NqType.caption.copyWith(color: c.tx3)),
            ],
          ],
        ),
      ],
    );
  }

  Widget _liveLine(NqColors c) {
    return Row(
      children: [
        NqIcon(NqIcons.broadcast, size: 16, color: c.mintTx),
        const SizedBox(width: 6),
        Expanded(
          child: Text(liveText!, style: NqType.label.copyWith(color: c.tx2)),
        ),
        if (stopCounter != null)
          Text(stopCounter!, style: NqType.label.copyWith(color: c.tx2)),
      ],
    );
  }

  Widget _meta(NqColors c) {
    return Row(
      children: [
        if (truckType != null) ...[
          NqIcon(NqIcons.truck, size: 16, color: c.tx2),
          const SizedBox(width: 6),
          Text(truckType!, style: NqType.label.copyWith(color: c.tx)),
          if (plate != null) ...[
            const SizedBox(width: 6),
            Ltr(plate!, style: NqType.code(size: 13).copyWith(color: c.tx)),
          ],
        ],
        const Spacer(),
        if (containerNo != null) ...[
          Ltr(containerNo!, style: NqType.code(size: 13).copyWith(color: c.tx)),
          const SizedBox(width: 6),
          NqIcon(NqIcons.shippingContainer, size: 16, color: c.tx2),
        ],
      ],
    );
  }
}

/// Origin (right) → destination (left) strip with a truck badge in the middle.
class _RouteStrip extends StatelessWidget {
  const _RouteStrip({required this.origin, required this.destination});
  final RoutePoint origin;
  final RoutePoint destination;

  @override
  Widget build(BuildContext context) {
    final c = context.nq;
    Widget place(RoutePoint p) => Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(p.city, style: NqType.h2.copyWith(color: c.tx)),
            Text(p.area, style: NqType.caption.copyWith(color: c.tx2)),
          ],
        );

    return Row(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        place(origin),
        const SizedBox(width: 10),
        Expanded(
          child: SizedBox(
            height: 30,
            child: Directionality(
              textDirection: TextDirection.ltr,
              // LTR: destination ring on the left, origin dot on the right.
              child: Row(
                children: [
                  _ring(c),
                  Expanded(child: _DashedLine(color: c.bd)),
                  _truckBadge(c),
                  Expanded(child: Container(height: 2, color: c.mintS)),
                  _dot(c),
                ],
              ),
            ),
          ),
        ),
        const SizedBox(width: 10),
        place(destination),
      ],
    );
  }

  Widget _dot(NqColors c) => Container(
        width: 10,
        height: 10,
        decoration: BoxDecoration(color: c.mint, shape: BoxShape.circle),
      );

  Widget _ring(NqColors c) => Container(
        width: 12,
        height: 12,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          border: Border.all(color: c.tx3, width: 2),
        ),
      );

  Widget _truckBadge(NqColors c) => Container(
        width: 30,
        height: 30,
        alignment: Alignment.center,
        decoration: BoxDecoration(color: c.mintBg, shape: BoxShape.circle),
        child: Transform.flip(
          flipX: true,
          child: NqIcon(NqIcons.truck, fill: true, size: 16, color: c.mintTx),
        ),
      );
}

class _DashedLine extends StatelessWidget {
  const _DashedLine({required this.color});
  final Color color;

  @override
  Widget build(BuildContext context) {
    return CustomPaint(
      size: const Size(double.infinity, 2),
      painter: _DashedLinePainter(color),
    );
  }
}

class _DashedLinePainter extends CustomPainter {
  _DashedLinePainter(this.color);
  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..strokeWidth = 2;
    const dash = 4.0;
    const gap = 4.0;
    double x = 0;
    final y = size.height / 2;
    while (x < size.width) {
      canvas.drawLine(Offset(x, y), Offset(x + dash, y), paint);
      x += dash + gap;
    }
  }

  @override
  bool shouldRepaint(_DashedLinePainter old) => old.color != color;
}

/// Full-bleed dashed divider with half-circle cutouts on both edges.
class _Perforation extends StatelessWidget {
  const _Perforation();

  @override
  Widget build(BuildContext context) {
    final c = context.nq;
    return SizedBox(
      height: 18,
      child: Stack(
        alignment: Alignment.center,
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 9),
            child: _DashedLine(color: c.bd),
          ),
          Align(
            alignment: Alignment.centerLeft,
            child: Transform.translate(
              offset: const Offset(-9, 0),
              child: _cut(c),
            ),
          ),
          Align(
            alignment: Alignment.centerRight,
            child: Transform.translate(
              offset: const Offset(9, 0),
              child: _cut(c),
            ),
          ),
        ],
      ),
    );
  }

  Widget _cut(NqColors c) => Container(
        width: 18,
        height: 18,
        decoration: BoxDecoration(
          color: c.bg,
          shape: BoxShape.circle,
          border: Border.all(color: c.bd),
        ),
      );
}
