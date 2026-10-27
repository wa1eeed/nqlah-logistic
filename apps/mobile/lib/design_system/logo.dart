import 'package:flutter/widgets.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../core/theme/tokens.dart';
import '../core/theme/typography.dart';

/// The NQLAH logo mark (placeholder from the handoff — replace when the real
/// logo arrives). On hero/teal panels use [onDark].
class NqLogoMark extends StatelessWidget {
  const NqLogoMark({super.key, this.size = 44, this.onDark = false});

  final double size;
  final bool onDark;

  @override
  Widget build(BuildContext context) {
    return SvgPicture.asset(
      onDark ? 'assets/logo/logo-mark-on-dark.svg' : 'assets/logo/logo-mark.svg',
      width: size,
      height: size,
    );
  }
}

/// Logo mark + «نقلة» wordmark, as used on the login hero (handoff 2c).
class NqLogoLockup extends StatelessWidget {
  const NqLogoLockup({super.key, this.markSize = 44, this.onDark = true});

  final double markSize;
  final bool onDark;

  @override
  Widget build(BuildContext context) {
    final color = onDark ? NqFixed.heroText : context.nq.tx;
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text('نقلة', style: NqType.h1.copyWith(color: color)),
        const SizedBox(width: 10),
        NqLogoMark(size: markSize, onDark: onDark),
      ],
    );
  }
}
