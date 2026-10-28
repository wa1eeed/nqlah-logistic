import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/notifications/notifications_repository.dart';
import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';
import '../../core/widgets/ltr.dart';
import '../../core/widgets/nq_icon.dart';
import '../../design_system/chip.dart';

/// In-app notifications (handoff 5b) — role-agnostic, wired to
/// `GET /notifications`. Tapping a notification marks it read and, when it
/// references an order, opens that order. Reached from the bell and the
/// driver's الإشعارات tab.
class NotificationsScreen extends ConsumerStatefulWidget {
  const NotificationsScreen({super.key, this.showBack = true});

  /// The bell route shows a back arrow; the tab mount does not.
  final bool showBack;

  @override
  ConsumerState<NotificationsScreen> createState() =>
      _NotificationsScreenState();
}

/// Filter categories mapped to notification-type prefixes.
enum _Filter { all, orders, offers, finance }

class _NotificationsScreenState extends ConsumerState<NotificationsScreen> {
  _Filter _filter = _Filter.all;

  bool _matches(String type) {
    final t = type.toUpperCase();
    switch (_filter) {
      case _Filter.all:
        return true;
      case _Filter.orders:
        return t.startsWith('ORDER') || t.startsWith('SHIPMENT');
      case _Filter.offers:
        return t.startsWith('BID');
      case _Filter.finance:
        return t.startsWith('PAYMENT');
    }
  }

  Future<void> _onTap(NotificationModel n) async {
    if (!n.isRead) {
      await ref.read(notificationsRepositoryProvider).markRead(n.id);
      ref.invalidate(notificationsProvider);
    }
    final orderId = n.orderId;
    if (orderId != null && mounted) context.push('/order-detail/$orderId');
  }

  Future<void> _readAll() async {
    await ref.read(notificationsRepositoryProvider).markAllRead();
    ref.invalidate(notificationsProvider);
  }

  @override
  Widget build(BuildContext context) {
    final c = context.nq;
    final async = ref.watch(notificationsProvider);
    return Scaffold(
      backgroundColor: c.bg,
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _appBar(c, async.valueOrNull?.unread ?? 0),
            const SizedBox(height: 16),
            _filterChips(c),
            const SizedBox(height: 12),
            Expanded(
              child: async.when(
                loading: () =>
                    const Center(child: CircularProgressIndicator()),
                error: (e, _) => _errorState(c),
                data: (page) {
                  final items =
                      page.items.where((n) => _matches(n.type)).toList();
                  if (items.isEmpty) return _emptyState(c);
                  return RefreshIndicator(
                    onRefresh: () async =>
                        ref.invalidate(notificationsProvider),
                    child: ListView(
                      padding: EdgeInsets.zero,
                      children: _grouped(c, items),
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

  /// Build day-grouped sections (اليوم / أمس / older date).
  List<Widget> _grouped(NqColors c, List<NotificationModel> items) {
    final now = DateTime.now();
    String bucket(DateTime? d) {
      if (d == null) return '';
      final day = DateTime(d.year, d.month, d.day);
      final today = DateTime(now.year, now.month, now.day);
      final diff = today.difference(day).inDays;
      if (diff <= 0) return 'اليوم';
      if (diff == 1) return 'أمس';
      return '${d.day.toString().padLeft(2, '0')}/${d.month.toString().padLeft(2, '0')}/${d.year}';
    }

    final widgets = <Widget>[];
    String? current;
    for (final n in items) {
      final b = bucket(n.createdAt);
      if (b != current) {
        current = b;
        widgets.add(_groupHeader(c, b));
      }
      widgets.add(_row(c, n));
    }
    return widgets;
  }

  Widget _appBar(NqColors c, int unread) => Padding(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
        child: Row(
          children: [
            GestureDetector(
              onTap: unread > 0 ? _readAll : null,
              child: Text('قراءة الكل',
                  style: NqType.labelStrong
                      .copyWith(color: unread > 0 ? c.mintTx : c.tx3)),
            ),
            const Spacer(),
            Text('الإشعارات', style: NqType.h3.copyWith(color: c.tx)),
            if (widget.showBack) ...[
              const SizedBox(width: 12),
              GestureDetector(
                onTap: () => Navigator.of(context).maybePop(),
                child: NqIcon(NqIcons.arrowRight, size: 22, color: c.tx),
              ),
            ],
          ],
        ),
      );

  Widget _filterChips(NqColors c) {
    const labels = ['الكل', 'الطلبات', 'العروض', 'المالية'];
    const filters = [_Filter.all, _Filter.orders, _Filter.offers, _Filter.finance];
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Row(
        children: [
          for (var i = 0; i < labels.length; i++) ...[
            NqChip(
              label: labels[i],
              selected: _filter == filters[i],
              onTap: () => setState(() => _filter = filters[i]),
            ),
            if (i < labels.length - 1) const SizedBox(width: 8),
          ],
        ],
      ),
    );
  }

  Widget _groupHeader(NqColors c, String label) => Padding(
        padding: const EdgeInsets.fromLTRB(16, 10, 16, 8),
        child: Text(label,
            style: NqType.labelStrong.copyWith(color: c.tx2),
            textAlign: TextAlign.right),
      );

  Widget _row(NqColors c, NotificationModel n) {
    final (tileBg, tileFg) = _toneColors(c, n.type);
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: () => _onTap(n),
      child: Container(
        color: n.isRead ? c.sf : c.mintBg,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Ltr(_time(n.createdAt),
                    style: NqType.numeric(12, FontWeight.w400)
                        .copyWith(color: c.tx3)),
                if (!n.isRead) ...[
                  const SizedBox(height: 6),
                  Container(
                      width: 8,
                      height: 8,
                      decoration: BoxDecoration(
                          color: c.mintS, shape: BoxShape.circle)),
                ],
              ],
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(n.title,
                      style: NqType.bodyStrong.copyWith(color: c.tx),
                      textAlign: TextAlign.right),
                  if (n.body.isNotEmpty) ...[
                    const SizedBox(height: 3),
                    Text(n.body,
                        style: NqType.caption.copyWith(color: c.tx2, height: 1.5),
                        textAlign: TextAlign.right),
                  ],
                ],
              ),
            ),
            const SizedBox(width: 12),
            Container(
              width: 40,
              height: 40,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: tileBg,
                borderRadius: BorderRadius.circular(NqRadius.input),
              ),
              child: NqIcon(_icon(n.type), size: 20, color: tileFg),
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
            NqIcon(NqIcons.bell, size: 32, color: c.tx3),
            const SizedBox(height: 12),
            Text('لا توجد إشعارات',
                style: NqType.body.copyWith(color: c.tx2)),
          ],
        ),
      );

  Widget _errorState(NqColors c) => Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            NqIcon(NqIcons.warningCircle, size: 28, color: c.tx2),
            const SizedBox(height: 12),
            Text('تعذّر تحميل الإشعارات',
                style: NqType.body.copyWith(color: c.tx2)),
            const SizedBox(height: 12),
            TextButton(
              onPressed: () => ref.invalidate(notificationsProvider),
              child: Text('إعادة المحاولة',
                  style: NqType.labelStrong.copyWith(color: c.mintTx)),
            ),
          ],
        ),
      );

  static String _time(DateTime? d) {
    if (d == null) return '';
    final l = d.toLocal();
    return '${l.hour.toString().padLeft(2, '0')}:${l.minute.toString().padLeft(2, '0')}';
  }

  static String _icon(String type) {
    final t = type.toUpperCase();
    if (t.startsWith('BID')) return NqIcons.handCoins;
    if (t == 'SHIPMENT_STARTED') return NqIcons.truck;
    if (t == 'SHIPMENT_DELIVERED') return NqIcons.signature;
    if (t == 'ORDER_ASSIGNED') return NqIcons.steeringWheel;
    if (t.startsWith('ORDER')) return NqIcons.package;
    if (t.startsWith('PAYMENT')) return NqIcons.checkSquare;
    if (t.startsWith('KYC')) return NqIcons.shieldCheck;
    if (t.startsWith('DISPUTE')) return NqIcons.warningCircle;
    return NqIcons.bell;
  }

  (Color, Color) _toneColors(NqColors c, String type) {
    final t = type.toUpperCase();
    if (t.startsWith('BID')) return (c.warnBg, c.warn);
    if (t == 'SHIPMENT_STARTED') return (c.infoBg, c.info);
    if (t == 'ORDER_ASSIGNED') return (c.mintBg, c.mintTx);
    if (t.startsWith('PAYMENT') || t == 'SHIPMENT_DELIVERED') {
      return (c.okBg, c.ok);
    }
    if (t.startsWith('DISPUTE') || t == 'KYC_REJECTED') return (c.errBg, c.err);
    if (t.startsWith('KYC')) return (c.okBg, c.ok);
    return (c.infoBg, c.info);
  }
}
