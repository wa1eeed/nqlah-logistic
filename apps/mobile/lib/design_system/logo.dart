import 'dart:convert';
import 'dart:typed_data';

import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../core/branding/branding_config.dart';
import '../core/theme/tokens.dart';
import '../core/theme/typography.dart';

/// The NQLAH logo mark. Renders the logo configured from the admin console
/// (`GET /settings/platform`, light/dark variant) when one is set; otherwise
/// the built-in SVG mark. On hero/teal panels pass [onDark].
class NqLogoMark extends ConsumerWidget {
  const NqLogoMark({super.key, this.size = 44, this.onDark = false});

  final double size;
  final bool onDark;

  Widget _builtIn() => SvgPicture.asset(
        onDark ? 'assets/logo/logo-mark-on-dark.svg' : 'assets/logo/logo-mark.svg',
        width: size,
        height: size,
      );

  /// Decode a `data:...;base64,...` URL to bytes (for in-line logos), else null.
  Uint8List? _dataUrlBytes(String url) {
    if (!url.startsWith('data:')) return null;
    final comma = url.indexOf(',');
    if (comma < 0 || !url.substring(0, comma).contains('base64')) return null;
    try {
      return base64Decode(url.substring(comma + 1));
    } catch (_) {
      return null;
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final url = ref.watch(brandingConfigProvider).maybeWhen(
          data: (b) => b.logoFor(onDark: onDark),
          orElse: () => '',
        );
    if (url.isEmpty) return _builtIn();

    final bytes = _dataUrlBytes(url);
    if (bytes != null) {
      return Image.memory(bytes, width: size, height: size,
          fit: BoxFit.contain, errorBuilder: (_, _, _) => _builtIn());
    }
    return Image.network(url, width: size, height: size, fit: BoxFit.contain,
        errorBuilder: (_, _, _) => _builtIn(),
        loadingBuilder: (_, child, p) => p == null ? child : _builtIn());
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
