import 'package:flutter/widgets.dart';

/// Wraps numerals, prices, codes, plates, phone numbers and container numbers
/// in an LTR-isolated run inside RTL Arabic text (handoff §4).
///
/// Usage: `Ltr('NQ-24-08812', style: NqType.code())`.
class Ltr extends StatelessWidget {
  const Ltr(this.text, {super.key, this.style, this.textAlign});

  final String text;
  final TextStyle? style;
  final TextAlign? textAlign;

  @override
  Widget build(BuildContext context) {
    return Directionality(
      textDirection: TextDirection.ltr,
      child: Text(text, style: style, textAlign: textAlign),
    );
  }
}
