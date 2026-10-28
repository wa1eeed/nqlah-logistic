import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/chat/conversations_repository.dart';
import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';
import '../../core/widgets/ltr.dart';
import '../../core/widgets/nq_icon.dart';

/// Chat inbox (الرسائل) — wired to `GET /conversations`. One row per order the
/// user has an active thread on; tapping opens that order's chat.
class ConversationsScreen extends ConsumerWidget {
  const ConversationsScreen({super.key, this.showBack = false});

  final bool showBack;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = context.nq;
    final async = ref.watch(conversationsProvider);
    return Scaffold(
      backgroundColor: c.bg,
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _appBar(context, c),
            const SizedBox(height: 8),
            Expanded(
              child: async.when(
                loading: () =>
                    const Center(child: CircularProgressIndicator()),
                error: (e, _) => _errorState(c, ref),
                data: (items) {
                  if (items.isEmpty) return _emptyState(c);
                  return RefreshIndicator(
                    onRefresh: () async =>
                        ref.invalidate(conversationsProvider),
                    child: ListView.separated(
                      padding: EdgeInsets.zero,
                      itemCount: items.length,
                      separatorBuilder: (_, _) =>
                          Divider(height: 1, color: c.bd),
                      itemBuilder: (_, i) => _row(context, ref, c, items[i]),
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _appBar(BuildContext context, NqColors c) => Padding(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
        child: Row(
          children: [
            const Spacer(),
            Text('الرسائل', style: NqType.h3.copyWith(color: c.tx)),
            if (showBack) ...[
              const SizedBox(width: 12),
              GestureDetector(
                onTap: () => Navigator.of(context).maybePop(),
                child: NqIcon(NqIcons.arrowRight, size: 22, color: c.tx),
              ),
            ],
          ],
        ),
      );

  Widget _row(
      BuildContext context, WidgetRef ref, NqColors c, Conversation v) {
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: () async {
        await context.push('/chat/${v.orderId}', extra: v.counterpart);
        ref.invalidate(conversationsProvider); // refresh unread on return
      },
      child: Container(
        color: c.sf,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        child: Row(
          children: [
            if (v.unread > 0)
              Container(
                constraints: const BoxConstraints(minWidth: 22),
                height: 22,
                alignment: Alignment.center,
                padding: const EdgeInsets.symmetric(horizontal: 6),
                decoration: BoxDecoration(
                    color: c.mintS, borderRadius: BorderRadius.circular(11)),
                child: Ltr('${v.unread}',
                    style: NqType.caption.copyWith(
                        color: NqFixed.heroText, fontWeight: FontWeight.w700)),
              )
            else if (v.lastAt != null)
              Ltr(_time(v.lastAt!),
                  style:
                      NqType.numeric(12, FontWeight.w400).copyWith(color: c.tx3)),
            const Spacer(),
            Expanded(
              flex: 5,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: [
                      Flexible(
                        child: Text(v.counterpart,
                            style: NqType.bodyStrong.copyWith(color: c.tx),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            textAlign: TextAlign.right),
                      ),
                    ],
                  ),
                  const SizedBox(height: 3),
                  Text(
                      v.lastPreview != null && v.lastPreview!.isNotEmpty
                          ? v.lastPreview!
                          : v.route,
                      style: NqType.caption.copyWith(
                          color: v.unread > 0 ? c.tx : c.tx2),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      textAlign: TextAlign.right),
                  const SizedBox(height: 2),
                  Ltr(v.orderNumber,
                      style: NqType.code(size: 11).copyWith(color: c.tx3)),
                ],
              ),
            ),
            const SizedBox(width: 12),
            Container(
              width: 44,
              height: 44,
              alignment: Alignment.center,
              decoration: BoxDecoration(color: c.sf2, shape: BoxShape.circle),
              child: NqIcon(NqIcons.chats, size: 20, color: c.tx2),
            ),
          ],
        ),
      ),
    );
  }

  Widget _emptyState(NqColors c) => Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            NqIcon(NqIcons.chats, size: 32, color: c.tx3),
            const SizedBox(height: 12),
            Text('لا توجد محادثات',
                style: NqType.body.copyWith(color: c.tx2)),
          ],
        ),
      );

  Widget _errorState(NqColors c, WidgetRef ref) => Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            NqIcon(NqIcons.warningCircle, size: 28, color: c.tx2),
            const SizedBox(height: 12),
            Text('تعذّر تحميل المحادثات',
                style: NqType.body.copyWith(color: c.tx2)),
            const SizedBox(height: 12),
            TextButton(
              onPressed: () => ref.invalidate(conversationsProvider),
              child: Text('إعادة المحاولة',
                  style: NqType.labelStrong.copyWith(color: c.mintTx)),
            ),
          ],
        ),
      );

  static String _time(DateTime d) {
    final l = d.toLocal();
    final now = DateTime.now();
    if (l.year == now.year && l.month == now.month && l.day == now.day) {
      return '${l.hour.toString().padLeft(2, '0')}:${l.minute.toString().padLeft(2, '0')}';
    }
    return '${l.day.toString().padLeft(2, '0')}/${l.month.toString().padLeft(2, '0')}';
  }
}
