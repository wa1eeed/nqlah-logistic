import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/orders/order_draft_controller.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/theme/typography.dart';
import '../../../core/widgets/nq_icon.dart';
import '../../../design_system/text_field.dart';
import '../../../design_system/upload_row.dart';
import 'order_wizard_scaffold.dart';

/// Create-order step 5/6 — consignee & documents (handoff 4d). Consignee name
/// and phone are wired to the delivery stop; documents are a visual follow-up.
class OrderStep5Consignee extends ConsumerStatefulWidget {
  const OrderStep5Consignee({super.key, this.onNext});

  final VoidCallback? onNext;

  @override
  ConsumerState<OrderStep5Consignee> createState() =>
      _OrderStep5ConsigneeState();
}

class _OrderStep5ConsigneeState extends ConsumerState<OrderStep5Consignee> {
  late final TextEditingController _name;
  late final TextEditingController _phone;
  late final TextEditingController _notes;

  @override
  void initState() {
    super.initState();
    final d = ref.read(orderDraftProvider);
    _name = TextEditingController(text: d.consigneeName);
    _phone = TextEditingController(text: d.consigneePhone);
    _notes = TextEditingController(text: d.notes);
  }

  @override
  void dispose() {
    _name.dispose();
    _phone.dispose();
    _notes.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final c = context.nq;
    final n = ref.read(orderDraftProvider.notifier);
    final d = ref.watch(orderDraftProvider);
    return OrderWizardScaffold(
      step: 5,
      stepName: 'المستلم والمستندات',
      nextLabel: 'المراجعة',
      title: 'بيانات المستلم والمستندات',
      showPrev: true,
      onNext: widget.onNext,
      children: [
        _consigneeCard(c, n, d),
        const SizedBox(height: 18),
        Text('المستندات', style: NqType.h2.copyWith(color: c.tx)),
        const SizedBox(height: 10),
        const NqUploadRow(
          title: 'بوليصة الشحن (اختياري)',
          state: NqUploadState.optionalEmpty,
          meta: 'اختياري',
        ),
        const SizedBox(height: 10),
        const NqUploadRow(
          title: 'قائمة التعبئة (اختياري)',
          state: NqUploadState.optionalEmpty,
          meta: 'اختياري',
        ),
        const SizedBox(height: 18),
        Text('ملاحظات', style: NqType.h2.copyWith(color: c.tx)),
        const SizedBox(height: 10),
        _notesField(c, n),
      ],
    );
  }

  Widget _consigneeCard(NqColors c, OrderDraftController n, OrderDraft d) =>
      Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: c.sf,
          borderRadius: BorderRadius.circular(NqRadius.card),
          border: Border.all(color: c.bd),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text('جهة الاتصال عند التفريغ · ${d.destinationCity}',
                style: NqType.h3.copyWith(color: c.tx),
                textAlign: TextAlign.right),
            const SizedBox(height: 14),
            Row(
              children: [
                Expanded(
                  child: NqTextField(
                    label: 'الاسم',
                    hint: 'أبو ناصر',
                    controller: _name,
                    onChanged: (v) =>
                        n.patch((x) => x.copyWith(consigneeName: v)),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: NqTextField(
                    label: 'الجوال',
                    phone: true,
                    controller: _phone,
                    onChanged: (v) =>
                        n.patch((x) => x.copyWith(consigneePhone: v)),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                NqIcon(NqIcons.info, size: 14, color: c.tx3),
                const SizedBox(width: 6),
                Expanded(
                  child: Text('يصله رمز التحقق لتأكيد إثبات التسليم',
                      style: NqType.caption.copyWith(color: c.tx2),
                      textAlign: TextAlign.right),
                ),
              ],
            ),
          ],
        ),
      );

  Widget _notesField(NqColors c, OrderDraftController n) => Container(
        height: 88,
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: c.sf,
          borderRadius: BorderRadius.circular(NqRadius.input),
          border: Border.all(color: c.bd),
        ),
        child: TextField(
          controller: _notes,
          maxLines: null,
          expands: true,
          textAlignVertical: TextAlignVertical.top,
          onChanged: (v) => n.patch((x) => x.copyWith(notes: v)),
          style: NqType.body.copyWith(color: c.tx),
          cursorColor: c.mintS,
          decoration: InputDecoration(
            isCollapsed: true,
            border: InputBorder.none,
            hintText: 'تعليمات للمزوّد (اختياري)',
            hintStyle: NqType.body.copyWith(color: c.tx3),
          ),
        ),
      );
}
