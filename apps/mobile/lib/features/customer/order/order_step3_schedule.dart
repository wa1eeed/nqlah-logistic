import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/orders/order_draft_controller.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/theme/typography.dart';
import '../../../core/widgets/ltr.dart';
import 'order_validation.dart';
import 'order_wizard_scaffold.dart';

const _arWeekdays = {
  1: 'الإثنين', 2: 'الثلاثاء', 3: 'الأربعاء', 4: 'الخميس',
  5: 'الجمعة', 6: 'السبت', 7: 'الأحد',
};

/// Create-order step 3/6 — schedule (handoff 4b). Real upcoming days wired to
/// `pickupDate`; pickup window wired to `pickupWindow`.
class OrderStep3Schedule extends ConsumerStatefulWidget {
  const OrderStep3Schedule({super.key, this.onNext});

  final VoidCallback? onNext;

  @override
  ConsumerState<OrderStep3Schedule> createState() => _OrderStep3ScheduleState();
}

class _OrderStep3ScheduleState extends ConsumerState<OrderStep3Schedule> {
  late final List<DateTime> _days;
  final _dayKey = GlobalKey();

  Future<void> _next() async {
    final d = ref.read(orderDraftProvider);
    final missing = <MissingField>[
      if (d.pickupDate == null) MissingField('تاريخ الاستلام', _dayKey),
    ];
    if (await ensureStepComplete(context, missing)) widget.onNext?.call();
  }

  @override
  void initState() {
    super.initState();
    final today = DateTime.now();
    final base = DateTime(today.year, today.month, today.day);
    _days = List.generate(10, (i) => base.add(Duration(days: i)));
    // Default the pickup date to tomorrow if unset.
    final d = ref.read(orderDraftProvider);
    if (d.pickupDate == null) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        ref.read(orderDraftProvider.notifier).patch(
            (x) => x.copyWith(pickupDate: _days.length > 1 ? _days[1] : _days[0]));
      });
    }
  }

  bool _sameDay(DateTime? a, DateTime b) =>
      a != null && a.year == b.year && a.month == b.month && a.day == b.day;

  @override
  Widget build(BuildContext context) {
    final c = context.nq;
    final n = ref.read(orderDraftProvider.notifier);
    final d = ref.watch(orderDraftProvider);
    return OrderWizardScaffold(
      step: 3,
      stepName: 'الجدولة',
      nextLabel: 'التسعير',
      title: 'متى تريد الاستلام؟',
      showPrev: true,
      onNext: _next,
      children: [
        _label(c, 'اليوم'),
        const SizedBox(height: 10),
        SizedBox(
          key: _dayKey,
          height: 72,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            reverse: true,
            itemCount: _days.length,
            separatorBuilder: (_, _) => const SizedBox(width: 8),
            itemBuilder: (_, i) => _dayTile(c, n, d, _days[i]),
          ),
        ),
        const SizedBox(height: 22),
        _label(c, 'نافذة الاستلام'),
        const SizedBox(height: 10),
        GridView.count(
          crossAxisCount: 2,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          crossAxisSpacing: 10,
          mainAxisSpacing: 10,
          childAspectRatio: 2.8,
          children: [
            for (var i = 0; i < pickupWindowOptions.length; i++)
              _windowTile(c, n, d, i),
          ],
        ),
      ],
    );
  }

  Widget _label(NqColors c, String t) =>
      Text(t, style: NqType.labelStrong.copyWith(color: c.tx));

  Widget _dayTile(NqColors c, OrderDraftController n, OrderDraft d, DateTime day) {
    final sel = _sameDay(d.pickupDate, day);
    return GestureDetector(
      onTap: () => n.patch((x) => x.copyWith(pickupDate: day)),
      child: Container(
        width: 56,
        decoration: BoxDecoration(
          color: sel ? c.hero : c.sf,
          borderRadius: BorderRadius.circular(NqRadius.button),
          border: sel ? null : Border.all(color: c.bd),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Ltr('${day.day}',
                style: NqType.numeric(20, FontWeight.w700)
                    .copyWith(color: sel ? NqFixed.heroText : c.tx)),
            const SizedBox(height: 2),
            Text(_arWeekdays[day.weekday] ?? '',
                style: NqType.caption.copyWith(
                    color: sel ? NqFixed.heroTextSecondary : c.tx2)),
          ],
        ),
      ),
    );
  }

  Widget _windowTile(NqColors c, OrderDraftController n, OrderDraft d, int i) {
    final opt = pickupWindowOptions[i];
    final sel = d.pickupWindow == opt.value;
    return GestureDetector(
      onTap: () => n.patch((x) => x.copyWith(pickupWindow: opt.value)),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14),
        alignment: AlignmentDirectional.centerEnd,
        decoration: BoxDecoration(
          color: sel ? c.mintBg : c.sf,
          borderRadius: BorderRadius.circular(NqRadius.button),
          border: Border.all(color: sel ? c.mintS : c.bd, width: sel ? 2 : 1),
        ),
        child: Text(opt.label, style: NqType.bodyStrong.copyWith(color: c.tx)),
      ),
    );
  }
}
