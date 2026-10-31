import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../theme/tokens.dart';
import '../theme/typography.dart';
import '../widgets/nq_icon.dart';
import 'app_strings.dart';
import 'locale_controller.dart';

/// Bottom-sheet language chooser («اختر اللغة»). Switching is applied app-wide
/// immediately (locale + direction) and persisted.
Future<void> showLanguagePicker(BuildContext context, WidgetRef ref) {
  final c = context.nq;
  final s = ref.read(stringsProvider);
  final current = ref.read(localeControllerProvider);
  return showModalBottomSheet<void>(
    context: context,
    backgroundColor: c.sf,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(NqRadius.sheet)),
    ),
    builder: (_) => Directionality(
      textDirection: current.direction,
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 10, 16, 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                      color: c.bd, borderRadius: BorderRadius.circular(2)),
                ),
              ),
              const SizedBox(height: 14),
              Text(s('lang.choose'),
                  style: NqType.h2.copyWith(color: c.tx),
                  textAlign: TextAlign.center),
              const SizedBox(height: 14),
              for (final lang in AppLang.values)
                _LangRow(
                  label: lang.nativeName,
                  selected: lang == current,
                  onTap: () {
                    ref.read(localeControllerProvider.notifier).set(lang);
                    Navigator.of(context).pop();
                  },
                ),
            ],
          ),
        ),
      ),
    ),
  );
}

class _LangRow extends StatelessWidget {
  const _LangRow({required this.label, required this.selected, required this.onTap});
  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final c = context.nq;
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        decoration: BoxDecoration(
          color: selected ? c.mintBg : c.sf2,
          borderRadius: BorderRadius.circular(NqRadius.card),
          border: Border.all(color: selected ? c.mintS : c.bd),
        ),
        child: Row(
          children: [
            Text(label,
                style: NqType.bodyStrong
                    .copyWith(color: selected ? c.mintTx : c.tx)),
            const Spacer(),
            if (selected) NqIcon(NqIcons.checkCircle, fill: true, size: 20, color: c.mintTx),
          ],
        ),
      ),
    );
  }
}
