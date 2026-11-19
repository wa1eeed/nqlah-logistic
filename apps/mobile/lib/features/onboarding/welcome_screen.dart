import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/i18n/app_strings.dart';
import '../../core/i18n/locale_controller.dart';
import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';

/// First-run step 1: pick the app language. Choosing a language applies it
/// app-wide (locale + direction, persisted) and continues to the onboarding
/// slides. Reachable only until the first-run flow is completed.
class WelcomeScreen extends ConsumerWidget {
  const WelcomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = context.nq;
    final s = ref.watch(stringsProvider);
    final current = ref.watch(localeControllerProvider);

    return Scaffold(
      backgroundColor: c.bg,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: NqSpace.gutter),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Spacer(flex: 2),
              Text('نقلة',
                  textAlign: TextAlign.center,
                  style: NqType.display.copyWith(color: c.mintTx)),
              const SizedBox(height: NqSpace.x7),
              Text(s('welcome.title'),
                  textAlign: TextAlign.center,
                  style: NqType.h1.copyWith(color: c.tx)),
              const SizedBox(height: NqSpace.x2),
              Text(s('welcome.subtitle'),
                  textAlign: TextAlign.center,
                  style: NqType.body.copyWith(color: c.tx3)),
              const SizedBox(height: NqSpace.x6),
              for (final lang in AppLang.values)
                Padding(
                  padding: const EdgeInsets.only(bottom: NqSpace.x3),
                  child: _LangCard(
                    label: lang.nativeName,
                    selected: lang == current,
                    onTap: () {
                      ref.read(localeControllerProvider.notifier).set(lang);
                      context.go('/onboarding');
                    },
                  ),
                ),
              const Spacer(flex: 3),
            ],
          ),
        ),
      ),
    );
  }
}

class _LangCard extends StatelessWidget {
  const _LangCard({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final c = context.nq;
    return Material(
      color: selected ? c.mintBg : c.sf,
      borderRadius: BorderRadius.circular(NqRadius.card),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(NqRadius.card),
        child: Container(
          height: 56,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(NqRadius.card),
            border: Border.all(
              color: selected ? c.mint : c.bd,
              width: selected ? 1.5 : 1,
            ),
          ),
          child: Text(
            label,
            style: NqType.bodyStrong.copyWith(
              color: selected ? c.mintTx : c.tx,
            ),
          ),
        ),
      ),
    );
  }
}
