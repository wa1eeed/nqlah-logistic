import 'package:flutter/material.dart';

import '../../../core/theme/tokens.dart';
import '../../../core/theme/typography.dart';
import '../../../core/widgets/nq_icon.dart';
import '../../../design_system/text_field.dart';
import '../../../design_system/upload_row.dart';
import 'order_wizard_scaffold.dart';

/// Create-order step 5/6 — consignee & documents (handoff 4d).
class OrderStep5Consignee extends StatelessWidget {
  const OrderStep5Consignee({super.key, this.onNext});

  final VoidCallback? onNext;

  @override
  Widget build(BuildContext context) {
    final c = context.nq;
    return OrderWizardScaffold(
      step: 5,
      stepName: 'المستلم والمستندات',
      nextLabel: 'المراجعة',
      title: 'بيانات المستلم والمستندات',
      showPrev: true,
      onNext: onNext,
      children: [
        _consigneeCard(c),
        const SizedBox(height: 18),
        Text('المستندات', style: NqType.h2.copyWith(color: c.tx)),
        const SizedBox(height: 10),
        const NqUploadRow(
          title: 'بوليصة الشحن',
          state: NqUploadState.uploaded,
          meta: 'waybill.pdf · 210 KB',
        ),
        const SizedBox(height: 10),
        const NqUploadRow(
          title: 'قائمة التعبئة',
          state: NqUploadState.uploaded,
          meta: 'packing-list.pdf · 96 KB',
        ),
        const SizedBox(height: 10),
        const NqUploadRow(
          title: 'مستند إضافي (اختياري)',
          state: NqUploadState.optionalEmpty,
          meta: 'اختياري',
        ),
        const SizedBox(height: 18),
        Text('ملاحظات', style: NqType.h2.copyWith(color: c.tx)),
        const SizedBox(height: 10),
        _notes(c),
      ],
    );
  }

  Widget _consigneeCard(NqColors c) => Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: c.sf,
          borderRadius: BorderRadius.circular(NqRadius.card),
          border: Border.all(color: c.bd),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text('جهة الاتصال عند التفريغ · الرياض',
                style: NqType.h3.copyWith(color: c.tx), textAlign: TextAlign.right),
            const SizedBox(height: 14),
            Row(
              children: const [
                Expanded(child: NqTextField(label: 'الاسم', hint: 'أبو ناصر')),
                SizedBox(width: 12),
                Expanded(child: NqTextField(label: 'الجوال', phone: true)),
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

  Widget _notes(NqColors c) => Container(
        height: 88,
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: c.sf,
          borderRadius: BorderRadius.circular(NqRadius.input),
          border: Border.all(color: c.bd),
        ),
        child: TextField(
          maxLines: null,
          expands: true,
          textAlignVertical: TextAlignVertical.top,
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
