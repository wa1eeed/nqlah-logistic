import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';

import '../../core/api/api_exception.dart';
import '../../core/orders/order_models.dart';
import '../../core/orders/orders_repository.dart';
import '../../core/platform/format.dart';
import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';
import '../../core/uploads/uploads_repository.dart';
import '../../core/widgets/ltr.dart';
import '../../core/widgets/nq_icon.dart';
import '../../design_system/button.dart';

/// Cash-on-delivery payment instructions for the client. Shows how to pay per
/// the carrier's choice — cash to the driver, or a bank transfer to the
/// carrier's IBAN with an attached transfer proof.
class CodInstructionsCard extends ConsumerStatefulWidget {
  const CodInstructionsCard({super.key, required this.order});

  final OrderDetail order;

  @override
  ConsumerState<CodInstructionsCard> createState() => _CodInstructionsCardState();
}

class _CodInstructionsCardState extends ConsumerState<CodInstructionsCard> {
  bool _busy = false;

  OrderDetail get o => widget.order;

  Future<void> _attachProof() async {
    if (_busy) return;
    final messenger = ScaffoldMessenger.of(context);
    try {
      final picked = await ImagePicker()
          .pickImage(source: ImageSource.gallery, imageQuality: 85);
      if (picked == null) return;
      setState(() => _busy = true);
      final bytes = await picked.readAsBytes();
      final media = await ref.read(uploadsRepositoryProvider).upload(
            bytes: bytes,
            filename: picked.name,
            contentType: 'image/jpeg',
            folder: 'cod-proofs',
          );
      await ref.read(ordersRepositoryProvider).attachCodProof(o.id, media.key);
      ref.invalidate(orderDetailModelProvider(o.id));
      if (mounted) {
        messenger.showSnackBar(
            const SnackBar(content: Text('تم إرفاق إثبات التحويل.')));
      }
    } on ApiException catch (e) {
      if (mounted) messenger.showSnackBar(SnackBar(content: Text(e.message)));
    } catch (_) {
      if (mounted) {
        messenger.showSnackBar(
            const SnackBar(content: Text('تعذّر إرفاق الإثبات. حاول مجددًا.')));
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = context.nq;
    final carrier = o.carrier;
    final bank = (carrier?.codPayoutMethod ?? 'CASH') == 'BANK_TRANSFER';
    final amount = o.dueOnDelivery ?? o.clientTotalDue ?? o.agreedPrice;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: c.warnBg,
        borderRadius: BorderRadius.circular(NqRadius.card),
        border: Border.all(color: c.warn.withValues(alpha: 0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(children: [
            NqIcon(NqIcons.handCoins, size: 20, color: c.warn),
            const SizedBox(width: 10),
            Text('الدفع عند التسليم',
                style: NqType.h3.copyWith(color: c.tx)),
            const Spacer(),
            if (amount != null)
              Row(children: [
                Ltr(money(amount, decimals: 0),
                    style: NqType.price(size: 18).copyWith(color: c.tx)),
                const SizedBox(width: 3),
                Text('ر.س', style: NqType.caption.copyWith(color: c.tx2)),
              ]),
          ]),
          const SizedBox(height: 12),
          if (!bank) ...[
            Text('ادفع المبلغ نقدًا للسائق عند استلام الشحنة.',
                style: NqType.body.copyWith(color: c.tx2, height: 1.5),
                textAlign: TextAlign.right),
          ] else ...[
            Text('حوّل المبلغ إلى حساب المزوّد البنكي ثم أرفق إيصال التحويل:',
                style: NqType.body.copyWith(color: c.tx2, height: 1.5),
                textAlign: TextAlign.right),
            const SizedBox(height: 12),
            _bankRow(c, 'المزوّد', carrier?.nameAr ?? '—'),
            if ((carrier?.bankName ?? '').isNotEmpty)
              _bankRow(c, 'البنك', carrier!.bankName!),
            if ((carrier?.bankAccountName ?? '').isNotEmpty)
              _bankRow(c, 'اسم الحساب', carrier!.bankAccountName!),
            if ((carrier?.iban ?? '').isNotEmpty)
              _ibanRow(c, carrier!.iban!),
            const SizedBox(height: 14),
            if (o.codProofUrl != null && o.codProofUrl!.isNotEmpty)
              Row(children: [
                NqIcon(NqIcons.checkCircle, fill: true, size: 18, color: c.ok),
                const SizedBox(width: 8),
                Text('تم إرفاق إثبات التحويل',
                    style: NqType.bodyStrong.copyWith(color: c.ok)),
                const Spacer(),
                GestureDetector(
                  onTap: _busy ? null : _attachProof,
                  child: Text('استبدال',
                      style: NqType.labelStrong.copyWith(color: c.mintTx)),
                ),
              ])
            else
              NqButton(
                label: 'إرفاق إثبات التحويل',
                icon: NqIcons.cameraPlus,
                variant: NqButtonVariant.secondary,
                loading: _busy,
                onPressed: _busy ? null : _attachProof,
              ),
          ],
        ],
      ),
    );
  }

  Widget _bankRow(NqColors c, String label, String value) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 4),
        child: Row(children: [
          Expanded(
            child: Text(value,
                style: NqType.bodyStrong.copyWith(color: c.tx),
                textAlign: TextAlign.right),
          ),
          const SizedBox(width: 12),
          Text(label, style: NqType.caption.copyWith(color: c.tx2)),
        ]),
      );

  Widget _ibanRow(NqColors c, String iban) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 4),
        child: Row(children: [
          GestureDetector(
            onTap: () {
              Clipboard.setData(ClipboardData(text: iban));
              ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('تم نسخ الآيبان.')));
            },
            child: NqIcon(NqIcons.clipboardText, size: 16, color: c.mintTx),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Ltr(iban,
                style: NqType.code(size: 13).copyWith(color: c.tx),
                textAlign: TextAlign.left),
          ),
          const SizedBox(width: 12),
          Text('الآيبان', style: NqType.caption.copyWith(color: c.tx2)),
        ]),
      );
}
