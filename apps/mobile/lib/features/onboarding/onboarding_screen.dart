import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/i18n/locale_controller.dart';
import '../../core/onboarding/first_run_controller.dart';
import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';
import '../../core/widgets/nq_icon.dart';
import '../../design_system/button.dart';

class _Slide {
  const _Slide(this.icon, this.titleKey, this.bodyKey);
  final String icon;
  final String titleKey;
  final String bodyKey;
}

/// A large brand-tinted medallion (same language as the empty-state medallion):
/// a soft mint field with an inner tile, carrying the icon in the brand colour.
class _Medallion extends StatelessWidget {
  const _Medallion({required this.icon});
  final String icon;

  @override
  Widget build(BuildContext context) {
    final c = context.nq;
    return Container(
      width: 96,
      height: 96,
      decoration: BoxDecoration(
        color: c.mint.withValues(alpha: 0.05),
        borderRadius: BorderRadius.circular(28),
        border: Border.all(color: c.mint.withValues(alpha: 0.10)),
      ),
      alignment: Alignment.center,
      child: Container(
        width: 64,
        height: 64,
        decoration: BoxDecoration(
          color: c.mint.withValues(alpha: 0.10),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: c.mint.withValues(alpha: 0.15)),
        ),
        alignment: Alignment.center,
        child: NqIcon(icon, size: 34, color: c.mintTx),
      ),
    );
  }
}

const List<_Slide> _slides = [
  _Slide(NqIcons.truck, 'onboarding.s1.title', 'onboarding.s1.body'),
  _Slide(NqIcons.handCoins, 'onboarding.s2.title', 'onboarding.s2.body'),
  _Slide(NqIcons.userCircle, 'onboarding.s3.title', 'onboarding.s3.body'),
];

/// First-run step 2: a short, skippable intro. Finishing (or skipping) marks
/// the first-run flow complete and drops the visitor into the app shell.
class OnboardingScreen extends ConsumerStatefulWidget {
  const OnboardingScreen({super.key});

  @override
  ConsumerState<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends ConsumerState<OnboardingScreen> {
  final _pc = PageController();
  int _page = 0;

  @override
  void dispose() {
    _pc.dispose();
    super.dispose();
  }

  Future<void> _finish() async {
    await ref.read(firstRunProvider.notifier).complete();
    if (mounted) context.go('/app');
  }

  void _next() {
    if (_page >= _slides.length - 1) {
      _finish();
      return;
    }
    _pc.nextPage(
        duration: const Duration(milliseconds: 280), curve: Curves.easeOut);
  }

  @override
  Widget build(BuildContext context) {
    final c = context.nq;
    final s = ref.watch(stringsProvider);
    final isLast = _page == _slides.length - 1;

    return Scaffold(
      backgroundColor: c.bg,
      body: SafeArea(
        child: Column(
          children: [
            Align(
              alignment: AlignmentDirectional.centerEnd,
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: NqSpace.x2),
                child: TextButton(
                  onPressed: _finish,
                  child: Text(s('onboarding.skip'),
                      style: NqType.label.copyWith(color: c.tx2)),
                ),
              ),
            ),
            Expanded(
              child: PageView.builder(
                controller: _pc,
                onPageChanged: (i) => setState(() => _page = i),
                itemCount: _slides.length,
                itemBuilder: (_, i) {
                  final sl = _slides[i];
                  return Padding(
                    padding: const EdgeInsets.symmetric(horizontal: NqSpace.x6),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        _Medallion(icon: sl.icon),
                        const SizedBox(height: NqSpace.x5),
                        Text(s(sl.titleKey),
                            textAlign: TextAlign.center,
                            style: NqType.h1.copyWith(color: c.tx)),
                        const SizedBox(height: NqSpace.x3),
                        Text(s(sl.bodyKey),
                            textAlign: TextAlign.center,
                            style: NqType.body
                                .copyWith(color: c.tx2, height: 1.5)),
                      ],
                    ),
                  );
                },
              ),
            ),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                for (var i = 0; i < _slides.length; i++)
                  AnimatedContainer(
                    duration: const Duration(milliseconds: 220),
                    margin: const EdgeInsets.symmetric(horizontal: 3),
                    width: i == _page ? 20 : 7,
                    height: 7,
                    decoration: BoxDecoration(
                      color: i == _page ? c.mint : c.bd,
                      borderRadius: BorderRadius.circular(99),
                    ),
                  ),
              ],
            ),
            Padding(
              padding: const EdgeInsets.all(NqSpace.gutter),
              child: NqButton(
                label: isLast ? s('onboarding.start') : s('onboarding.next'),
                onPressed: _next,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
