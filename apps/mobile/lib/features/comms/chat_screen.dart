import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_exception.dart';
import '../../core/auth/auth_controller.dart';
import '../../core/chat/chat_repository.dart';
import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';
import '../../core/widgets/ltr.dart';
import '../../core/widgets/nq_icon.dart';

/// In-app chat (handoff 1n), wired to `GET/POST /orders/:id/messages`. Before
/// acceptance: in-app only, phone numbers masked. Text messages; the thread
/// refreshes periodically while open. (Voice notes / attachments need an upload
/// backend — a separate track.)
class ChatScreen extends ConsumerStatefulWidget {
  const ChatScreen({
    super.key,
    required this.orderId,
    this.partyName,
    this.onCall,
    this.onVideo,
  });

  final String orderId;
  final String? partyName;
  final VoidCallback? onCall;
  final VoidCallback? onVideo;

  @override
  ConsumerState<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends ConsumerState<ChatScreen> {
  final _input = TextEditingController();
  final _scroll = ScrollController();
  Timer? _poll;
  bool _sending = false;

  @override
  void initState() {
    super.initState();
    // Light polling keeps the thread fresh while open.
    _poll = Timer.periodic(const Duration(seconds: 4), (_) {
      if (mounted) ref.invalidate(chatMessagesProvider(widget.orderId));
    });
  }

  @override
  void dispose() {
    _poll?.cancel();
    _input.dispose();
    _scroll.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    final text = _input.text.trim();
    if (text.isEmpty || _sending) return;
    setState(() => _sending = true);
    final messenger = ScaffoldMessenger.of(context);
    try {
      await ref.read(chatRepositoryProvider).send(widget.orderId, text);
      _input.clear();
      ref.invalidate(chatMessagesProvider(widget.orderId));
    } on ApiException catch (e) {
      messenger.showSnackBar(SnackBar(content: Text(e.message)));
    } catch (_) {
      messenger.showSnackBar(
          const SnackBar(content: Text('تعذّر إرسال الرسالة. حاول مجددًا.')));
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = context.nq;
    final user = ref.watch(authControllerProvider).user;
    final async = ref.watch(chatMessagesProvider(widget.orderId));
    return Scaffold(
      backgroundColor: c.bg,
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _header(context, c),
            Divider(color: c.bd, height: 1),
            Expanded(
              child: async.when(
                loading: () => Center(
                    child: CircularProgressIndicator(
                        strokeWidth: 2.5, color: c.mintTx)),
                error: (e, _) => _errorState(
                    c,
                    e is ApiException ? e.message : 'تعذّر تحميل المحادثة.'),
                data: (msgs) => ListView(
                  controller: _scroll,
                  padding: const EdgeInsets.fromLTRB(16, 16, 16, 16),
                  children: [
                    _lockBanner(c),
                    const SizedBox(height: 18),
                    if (msgs.isEmpty)
                      Center(
                          child: Text('ابدأ المحادثة',
                              style: NqType.caption.copyWith(color: c.tx3)))
                    else
                      for (final m in msgs) ...[
                        _bubble(c, m,
                            m.mine(user?.companyId, user?.id)),
                        const SizedBox(height: 12),
                      ],
                  ],
                ),
              ),
            ),
            _composer(c),
          ],
        ),
      ),
    );
  }

  Widget _header(BuildContext context, NqColors c) {
    final name = widget.partyName ?? 'المحادثة';
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 10),
      child: Row(
        children: [
          GestureDetector(
            onTap: () => Navigator.of(context).maybePop(),
            child: NqIcon(NqIcons.arrowRight, size: 22, color: c.tx),
          ),
          const SizedBox(width: 12),
          Container(
            width: 44,
            height: 44,
            alignment: Alignment.center,
            decoration: BoxDecoration(
                color: c.hero,
                borderRadius: BorderRadius.circular(NqRadius.input)),
            child: Text(name.isNotEmpty ? name.substring(0, 1) : 'م',
                style: NqType.h3.copyWith(color: NqFixed.heroText)),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(name,
                    style: NqType.h3.copyWith(color: c.tx),
                    overflow: TextOverflow.ellipsis),
                const SizedBox(height: 2),
                Text('التواصل داخل التطبيق',
                    style: NqType.caption.copyWith(color: c.tx2)),
              ],
            ),
          ),
          if (widget.onCall != null) ...[
            const SizedBox(width: 12),
            GestureDetector(
                onTap: widget.onCall,
                child: NqIcon(NqIcons.phone, size: 24, color: c.mintTx)),
          ],
          if (widget.onVideo != null) ...[
            const SizedBox(width: 16),
            GestureDetector(
                onTap: widget.onVideo,
                child: NqIcon(NqIcons.videoCamera, size: 24, color: c.mintTx)),
          ],
        ],
      ),
    );
  }

  Widget _lockBanner(NqColors c) => Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
            color: c.sf2, borderRadius: BorderRadius.circular(NqRadius.button)),
        child: Row(children: [
          NqIcon(NqIcons.lockSimple, size: 18, color: c.tx3),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
                'التواصل داخل التطبيق فقط. تظهر أرقام الجوال بعد قبول العرض.',
                style: NqType.caption.copyWith(color: c.tx2, height: 1.5),
                textAlign: TextAlign.right),
          ),
        ]),
      );

  Widget _bubble(NqColors c, ChatMessage m, bool mine) {
    final time = m.createdAt == null
        ? ''
        : '${m.createdAt!.toLocal().hour.toString().padLeft(2, '0')}:${m.createdAt!.toLocal().minute.toString().padLeft(2, '0')}';
    return Align(
      alignment: mine ? Alignment.centerRight : Alignment.centerLeft,
      child: _ConstraintsBubble(
        child: Container(
          padding: const EdgeInsets.fromLTRB(14, 12, 14, 10),
          decoration: BoxDecoration(
            color: mine ? c.hero : c.sf,
            border: mine ? null : Border.all(color: c.bd),
            borderRadius: BorderRadius.only(
              topLeft: const Radius.circular(16),
              topRight: const Radius.circular(16),
              bottomLeft: Radius.circular(mine ? 16 : 4),
              bottomRight: Radius.circular(mine ? 4 : 16),
            ),
          ),
          child: Column(
            crossAxisAlignment:
                mine ? CrossAxisAlignment.end : CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(m.body,
                  style: NqType.body.copyWith(
                      color: mine ? NqFixed.heroText : c.tx, height: 1.5),
                  textAlign: TextAlign.right),
              if (time.isNotEmpty) ...[
                const SizedBox(height: 6),
                Ltr(time,
                    style: NqType.caption.copyWith(
                        color: mine ? NqFixed.heroTextSecondary : c.tx2)),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _composer(NqColors c) => Container(
        padding: const EdgeInsets.fromLTRB(16, 10, 16, 16),
        decoration:
            BoxDecoration(color: c.sf, border: Border(top: BorderSide(color: c.bd))),
        child: Row(
          children: [
            GestureDetector(
              onTap: _sending ? null : _send,
              child: Container(
                width: 48,
                height: 48,
                alignment: Alignment.center,
                decoration: BoxDecoration(color: c.mint, shape: BoxShape.circle),
                child: _sending
                    ? SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                            strokeWidth: 2.5, color: c.onMint),
                      )
                    : NqIcon(NqIcons.paperPlaneTilt,
                        fill: true, size: 20, color: c.onMint),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Container(
                constraints: const BoxConstraints(minHeight: 48),
                padding: const EdgeInsets.symmetric(horizontal: 16),
                decoration: BoxDecoration(
                  color: c.bg,
                  borderRadius: BorderRadius.circular(NqRadius.input),
                  border: Border.all(color: c.bd),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _input,
                        textAlign: TextAlign.right,
                        minLines: 1,
                        maxLines: 4,
                        textInputAction: TextInputAction.send,
                        onSubmitted: (_) => _send(),
                        style: NqType.body.copyWith(color: c.tx),
                        cursorColor: c.mintS,
                        decoration: InputDecoration(
                          isCollapsed: true,
                          border: InputBorder.none,
                          hintText: 'اكتب رسالة…',
                          hintStyle: NqType.body.copyWith(color: c.tx3),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      );

  Widget _errorState(NqColors c, String msg) => Center(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              NqIcon(NqIcons.warningCircle, size: 40, color: c.err),
              const SizedBox(height: 12),
              Text(msg,
                  style: NqType.body.copyWith(color: c.tx2),
                  textAlign: TextAlign.center),
              const SizedBox(height: 16),
              TextButton(
                onPressed: () =>
                    ref.invalidate(chatMessagesProvider(widget.orderId)),
                child: const Text('إعادة المحاولة'),
              ),
            ],
          ),
        ),
      );
}

/// Caps bubble width to ~78% of the screen.
class _ConstraintsBubble extends StatelessWidget {
  const _ConstraintsBubble({required this.child});
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final w = MediaQuery.of(context).size.width * 0.78;
    return ConstrainedBox(constraints: BoxConstraints(maxWidth: w), child: child);
  }
}
