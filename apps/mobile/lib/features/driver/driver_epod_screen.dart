import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../core/api/api_exception.dart';
import '../../core/driver/driver_repository.dart';
import '../../core/orders/orders_repository.dart';
import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';
import '../../core/widgets/nq_icon.dart';
import '../../design_system/button.dart';
import '../../design_system/confirm_dialog.dart';

/// Electronic proof of delivery (handoff 1k). Photos + signature + recipient
/// OTP are the design's capture steps (upload + a POD-verify backend are
/// follow-ups); the delivery itself is confirmed via `POST /orders/:id/tracking`
/// status DELIVERED, which moves the order to DELIVERED.
class DriverEpodScreen extends ConsumerStatefulWidget {
  const DriverEpodScreen({super.key, required this.orderId, this.onDone});

  final String orderId;
  final VoidCallback? onDone;

  @override
  ConsumerState<DriverEpodScreen> createState() => _DriverEpodScreenState();
}

class _DriverEpodScreenState extends ConsumerState<DriverEpodScreen> {
  final _note = TextEditingController();
  bool _busy = false;

  @override
  void dispose() {
    _note.dispose();
    super.dispose();
  }

  Future<void> _confirm() async {
    final messenger = ScaffoldMessenger.of(context);
    final nav = Navigator.of(context);
    if (!await nqConfirm(context,
        title: 'تأكيد التسليم',
        message: 'سيتم تسجيل الشحنة كـ«تم التسليم» نهائياً وإشعار العميل لتأكيد الاستلام '
            'وبدء تحرير المستحقات. لا يمكن التراجع عن هذا الإجراء.',
        confirmLabel: 'تأكيد التسليم')) {
      return;
    }
    setState(() => _busy = true);
    try {
      await ref.read(ordersRepositoryProvider).addTracking(
            widget.orderId,
            status: 'DELIVERED',
            description: 'تم التسليم وإثبات الاستلام',
            notes: _note.text,
          );
      ref.invalidate(driverJobsProvider);
      ref.invalidate(orderDetailModelProvider(widget.orderId));
      if (mounted) {
        messenger.showSnackBar(
            const SnackBar(content: Text('تم تأكيد التسليم بنجاح.')));
        (widget.onDone ?? () {})();
        nav.maybePop();
      }
    } on ApiException catch (e) {
      if (mounted) messenger.showSnackBar(SnackBar(content: Text(e.message)));
    } catch (_) {
      if (mounted) {
        messenger.showSnackBar(
            const SnackBar(content: Text('تعذّر تأكيد التسليم. حاول مجددًا.')));
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = context.nq;
    return Scaffold(
      backgroundColor: c.bg,
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _appBar(context, c),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
                children: [
                  _stepHeader(c, '1 · صور البضاعة'),
                  const SizedBox(height: 10),
                  _photos(c),
                  const SizedBox(height: 18),
                  _stepHeader(c, '2 · توقيع المستلم'),
                  const SizedBox(height: 10),
                  _signature(c),
                  const SizedBox(height: 18),
                  _stepHeader(c, '3 · ملاحظة التسليم (اختياري)'),
                  const SizedBox(height: 10),
                  _noteField(c),
                  const SizedBox(height: 10),
                  Text(
                      'التقاط الصور والتوقيع ورمز المستلم قيد التطوير؛ يُسجَّل التسليم الآن مباشرة.',
                      style: NqType.caption.copyWith(color: c.tx3),
                      textAlign: TextAlign.right),
                ],
              ),
            ),
            _footer(c),
          ],
        ),
      ),
    );
  }

  Widget _appBar(BuildContext context, NqColors c) => Padding(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
        child: Row(children: [
          GestureDetector(
            onTap: () => Navigator.of(context).maybePop(),
            child: NqIcon(NqIcons.arrowRight, size: 22, color: c.tx),
          ),
          const Spacer(),
          Text('إثبات التسليم', style: NqType.h3.copyWith(color: c.tx)),
        ]),
      );

  Widget _stepHeader(NqColors c, String title) => Row(
        children: [
          const Spacer(),
          Text(title, style: NqType.h3.copyWith(color: c.tx)),
        ],
      );

  Widget _photos(NqColors c) => Row(
        children: [
          Expanded(child: _addTile(c)),
          const SizedBox(width: 10),
          const Expanded(child: SizedBox()),
          const SizedBox(width: 10),
          const Expanded(child: SizedBox()),
        ],
      );

  Widget _addTile(NqColors c) => AspectRatio(
        aspectRatio: 1,
        child: Container(
          alignment: Alignment.center,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(NqRadius.input),
            border: Border.all(color: c.bd, width: 1.5),
          ),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            NqIcon(NqIcons.cameraPlus, size: 26, color: c.tx3),
            const SizedBox(height: 6),
            Text('إضافة', style: NqType.labelStrong.copyWith(color: c.tx3)),
          ]),
        ),
      );

  Widget _signature(NqColors c) => Container(
        height: 130,
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: c.sf,
          borderRadius: BorderRadius.circular(NqRadius.card),
          border: Border.all(color: c.bd),
        ),
        child: Center(
          child: Text('منطقة التوقيع',
              style: GoogleFonts.inter(fontSize: 18, color: c.tx3)),
        ),
      );

  Widget _noteField(NqColors c) => Container(
        height: 80,
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: c.sf,
          borderRadius: BorderRadius.circular(NqRadius.input),
          border: Border.all(color: c.bd),
        ),
        child: TextField(
          controller: _note,
          maxLines: null,
          expands: true,
          textAlignVertical: TextAlignVertical.top,
          textAlign: TextAlign.right,
          style: NqType.body.copyWith(color: c.tx),
          cursorColor: c.mintS,
          decoration: InputDecoration(
            isCollapsed: true,
            border: InputBorder.none,
            hintText: 'اسم المستلم أو ملاحظة…',
            hintStyle: NqType.body.copyWith(color: c.tx3),
          ),
        ),
      );

  Widget _footer(NqColors c) => Container(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
        decoration: BoxDecoration(
            color: c.sf, border: Border(top: BorderSide(color: c.bd))),
        child: NqButton(
          label: 'تأكيد التسليم',
          icon: NqIcons.checkCircle,
          size: NqButtonSize.driver,
          loading: _busy,
          onPressed: _busy ? null : _confirm,
        ),
      );
}
