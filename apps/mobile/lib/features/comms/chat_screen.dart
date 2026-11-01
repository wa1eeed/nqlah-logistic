import 'dart:async';
import 'dart:typed_data';

import 'package:audioplayers/audioplayers.dart';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import 'package:path_provider/path_provider.dart';
import 'package:record/record.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:video_player/video_player.dart';

import '../../core/api/api_exception.dart';
import '../../core/auth/auth_controller.dart';
import '../../core/chat/chat_repository.dart';
import '../../core/realtime/realtime_service.dart';
import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';
import '../../core/uploads/uploads_repository.dart';
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
  });

  final String orderId;
  final String? partyName;

  @override
  ConsumerState<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends ConsumerState<ChatScreen> {
  final _input = TextEditingController();
  final _scroll = ScrollController();
  Timer? _poll;
  StreamSubscription? _chatSub;
  bool _sending = false;

  final _recorder = AudioRecorder();
  bool _recording = false;
  DateTime? _recordStart;
  Timer? _recordTicker;
  Duration _recordElapsed = Duration.zero;

  @override
  void initState() {
    super.initState();
    _input.addListener(() => setState(() {}));
    // Real-time: subscribe to the order room and refresh on each live message.
    final rt = ref.read(realtimeServiceProvider);
    rt.subscribeOrder(widget.orderId);
    _chatSub = rt.onChat.listen((e) {
      if (mounted && e.orderId == widget.orderId) {
        ref.invalidate(chatMessagesProvider(widget.orderId));
      }
    });
    // A slow safety refresh in case the socket drops.
    _poll = Timer.periodic(const Duration(seconds: 25), (_) {
      if (mounted && !_recording) {
        ref.invalidate(chatMessagesProvider(widget.orderId));
      }
    });
  }

  @override
  void dispose() {
    _poll?.cancel();
    _chatSub?.cancel();
    ref.read(realtimeServiceProvider).unsubscribeOrder(widget.orderId);
    _recordTicker?.cancel();
    _recorder.dispose();
    _input.dispose();
    _scroll.dispose();
    super.dispose();
  }

  Future<void> _startRecording() async {
    try {
      if (!await _recorder.hasPermission()) {
        _snack('يلزم إذن الميكروفون لتسجيل رسالة صوتية.');
        return;
      }
      String path = '';
      if (!kIsWeb) {
        final dir = await getTemporaryDirectory();
        path = '${dir.path}/vn_${DateTime.now().millisecondsSinceEpoch}.m4a';
      }
      await _recorder.start(
        const RecordConfig(encoder: AudioEncoder.aacLc),
        path: path,
      );
      _recordStart = DateTime.now();
      _recordElapsed = Duration.zero;
      _recordTicker = Timer.periodic(const Duration(seconds: 1), (_) {
        if (mounted && _recordStart != null) {
          setState(() => _recordElapsed = DateTime.now().difference(_recordStart!));
        }
      });
      setState(() => _recording = true);
    } catch (_) {
      _snack('تعذّر بدء التسجيل.');
    }
  }

  Future<void> _cancelRecording() async {
    _recordTicker?.cancel();
    try {
      await _recorder.stop();
    } catch (_) {}
    if (mounted) setState(() => _recording = false);
  }

  Future<void> _stopRecordingAndSend() async {
    _recordTicker?.cancel();
    final startedAt = _recordStart;
    setState(() => _recording = false);
    try {
      final resultPath = await _recorder.stop();
      if (resultPath == null || resultPath.isEmpty) return;
      final bytes = await XFile(resultPath).readAsBytes();
      final ms = startedAt == null
          ? null
          : DateTime.now().difference(startedAt).inMilliseconds;
      await _uploadAndSend(
        kind: 'AUDIO',
        bytes: bytes,
        filename: 'voice_${DateTime.now().millisecondsSinceEpoch}.m4a',
        mime: 'audio/mp4',
        durationMs: ms,
      );
    } catch (_) {
      _snack('تعذّر إرسال الرسالة الصوتية.');
    }
  }

  Future<void> _send() async {
    final text = _input.text.trim();
    if (text.isEmpty || _sending) return;
    setState(() => _sending = true);
    final messenger = ScaffoldMessenger.of(context);
    try {
      await ref
          .read(chatRepositoryProvider)
          .send(widget.orderId, kind: 'TEXT', body: text);
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

  void _openAttachSheet() {
    final c = context.nq;
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: c.bg,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (_) => SafeArea(
        top: false,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(height: 10),
            Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                    color: c.bd, borderRadius: BorderRadius.circular(2))),
            const SizedBox(height: 8),
            _attachTile(c, NqIcons.cameraPlus, 'صورة', () {
              Navigator.of(context).pop();
              _pickImage(ImageSource.gallery);
            }),
            _attachTile(c, NqIcons.videoCamera, 'فيديو', () {
              Navigator.of(context).pop();
              _pickVideo();
            }),
            _attachTile(c, NqIcons.fileText, 'ملف', () {
              Navigator.of(context).pop();
              _pickFile();
            }),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
  }

  Widget _attachTile(NqColors c, String icon, String label, VoidCallback onTap) =>
      ListTile(
        onTap: onTap,
        trailing: Container(
          width: 40,
          height: 40,
          alignment: Alignment.center,
          decoration: BoxDecoration(color: c.mintBg, shape: BoxShape.circle),
          child: NqIcon(icon, size: 20, color: c.mintTx),
        ),
        title: Text(label,
            style: NqType.bodyStrong.copyWith(color: c.tx),
            textAlign: TextAlign.right),
      );

  Future<void> _pickImage(ImageSource source) async {
    try {
      final x = await ImagePicker().pickImage(source: source, imageQuality: 85);
      if (x == null) return;
      final bytes = await x.readAsBytes();
      await _uploadAndSend(
          kind: 'IMAGE',
          bytes: bytes,
          filename: x.name,
          mime: x.mimeType ?? 'image/jpeg');
    } catch (_) {
      _snack('تعذّر اختيار الصورة.');
    }
  }

  Future<void> _pickVideo() async {
    try {
      final x = await ImagePicker().pickVideo(source: ImageSource.gallery);
      if (x == null) return;
      final bytes = await x.readAsBytes();
      await _uploadAndSend(
          kind: 'VIDEO',
          bytes: bytes,
          filename: x.name,
          mime: x.mimeType ?? 'video/mp4');
    } catch (_) {
      _snack('تعذّر اختيار الفيديو.');
    }
  }

  Future<void> _pickFile() async {
    try {
      final res = await FilePicker.pickFiles();
      if (res.isEmpty) return;
      final f = res.first;
      final bytes = await f.readAsBytes();
      await _uploadAndSend(
        kind: 'FILE',
        bytes: bytes,
        filename: f.name,
        mime: _mimeForExt(f.extension),
      );
    } catch (_) {
      _snack('تعذّر اختيار الملف.');
    }
  }

  Future<void> _uploadAndSend({
    required String kind,
    required Uint8List bytes,
    required String filename,
    required String mime,
    int? durationMs,
  }) async {
    if (_sending) return;
    setState(() => _sending = true);
    try {
      final media = await ref.read(uploadsRepositoryProvider).upload(
            bytes: bytes,
            filename: filename,
            contentType: mime,
          );
      await ref.read(chatRepositoryProvider).send(
            widget.orderId,
            kind: kind,
            mediaKey: media.key,
            mediaName: media.name,
            mediaMime: media.mime,
            mediaSize: media.size,
            durationMs: durationMs,
          );
      ref.invalidate(chatMessagesProvider(widget.orderId));
    } on ApiException catch (e) {
      _snack(e.message);
    } catch (_) {
      _snack('تعذّر إرسال المرفق. حاول مجددًا.');
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  void _snack(String msg) {
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
    }
  }

  static String _mimeForExt(String? ext) {
    switch ((ext ?? '').toLowerCase()) {
      case 'pdf':
        return 'application/pdf';
      case 'doc':
        return 'application/msword';
      case 'docx':
        return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      case 'xlsx':
        return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      case 'txt':
        return 'text/plain';
      case 'png':
        return 'image/png';
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      default:
        return 'application/octet-stream';
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
              _bubbleContent(c, m, mine),
              if (m.body.isNotEmpty && !m.isText) ...[
                const SizedBox(height: 6),
                Text(m.body,
                    style: NqType.body.copyWith(
                        color: mine ? NqFixed.heroText : c.tx, height: 1.5),
                    textAlign: TextAlign.right),
              ],
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

  Widget _bubbleContent(NqColors c, ChatMessage m, bool mine) {
    final fg = mine ? NqFixed.heroText : c.tx;
    if (m.isText) {
      return Text(m.body,
          style: NqType.body.copyWith(color: fg, height: 1.5),
          textAlign: TextAlign.right);
    }
    if (m.isImage && m.mediaUrl != null) {
      return GestureDetector(
        onTap: () => _openMedia(m.mediaUrl!),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(12),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxHeight: 220, maxWidth: 240),
            child: Image.network(
              m.mediaUrl!,
              fit: BoxFit.cover,
              loadingBuilder: (ctx, child, p) => p == null
                  ? child
                  : Container(
                      width: 200,
                      height: 150,
                      alignment: Alignment.center,
                      color: c.sf2,
                      child: CircularProgressIndicator(
                          strokeWidth: 2.5, color: c.mintTx)),
              errorBuilder: (ctx, _, _) => _mediaCard(
                  c, m, mine, NqIcons.cameraPlus, m.mediaName ?? 'صورة'),
            ),
          ),
        ),
      );
    }
    if (m.isAudio && m.mediaUrl != null) {
      return _VoiceBubble(
          url: m.mediaUrl!, durationMs: m.durationMs, mine: mine);
    }
    if (m.isVideo && m.mediaUrl != null) {
      return _mediaCard(c, m, mine, NqIcons.play, m.mediaName ?? 'فيديو',
          onTap: () => _playVideo(m.mediaUrl!));
    }
    final (icon, label) = switch (m.kind) {
      'VIDEO' => (NqIcons.play, m.mediaName ?? 'فيديو'),
      'AUDIO' => (NqIcons.microphone, 'رسالة صوتية'),
      _ => (NqIcons.fileText, m.mediaName ?? 'ملف'),
    };
    return _mediaCard(c, m, mine, icon, label);
  }

  void _playVideo(String url) {
    showDialog<void>(
      context: context,
      barrierColor: Colors.black87,
      builder: (_) => _VideoPlayerDialog(url: url),
    );
  }

  Widget _mediaCard(
      NqColors c, ChatMessage m, bool mine, String icon, String label,
      {VoidCallback? onTap}) {
    final fg = mine ? NqFixed.heroText : c.tx;
    final fg2 = mine ? NqFixed.heroTextSecondary : c.tx2;
    final sub = m.mediaSize != null ? _fmtSize(m.mediaSize!) : '';
    return GestureDetector(
      onTap: onTap ?? (m.mediaUrl != null ? () => _openMedia(m.mediaUrl!) : null),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 42,
            height: 42,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: mine ? NqFixed.heroFill2 : c.sf2,
              borderRadius: BorderRadius.circular(NqRadius.input),
            ),
            child: NqIcon(icon,
                fill: true, size: 20, color: mine ? NqFixed.heroAccent : c.mintTx),
          ),
          const SizedBox(width: 10),
          Flexible(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(label,
                    style: NqType.bodyStrong.copyWith(color: fg),
                    overflow: TextOverflow.ellipsis),
                if (sub.isNotEmpty)
                  Ltr(sub, style: NqType.caption.copyWith(color: fg2)),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _openMedia(String url) async {
    final uri = Uri.tryParse(url);
    if (uri == null) return;
    if (!await launchUrl(uri, mode: LaunchMode.externalApplication)) {
      _snack('تعذّر فتح المرفق.');
    }
  }

  static String _fmtSize(int bytes) {
    if (bytes < 1024) return '$bytes B';
    if (bytes < 1024 * 1024) return '${(bytes / 1024).toStringAsFixed(0)} KB';
    return '${(bytes / 1024 / 1024).toStringAsFixed(1)} MB';
  }

  Widget _composer(NqColors c) {
    if (_recording) return _recordingBar(c);
    final hasText = _input.text.trim().isNotEmpty;
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 10, 16, 16),
      decoration:
          BoxDecoration(color: c.sf, border: Border(top: BorderSide(color: c.bd))),
      child: Row(
        children: [
          GestureDetector(
            onTap: _sending
                ? null
                : (hasText ? _send : _startRecording),
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
                  : NqIcon(hasText ? NqIcons.paperPlaneTilt : NqIcons.microphone,
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
                    const SizedBox(width: 8),
                    GestureDetector(
                      onTap: _sending ? null : _openAttachSheet,
                      child: NqIcon(NqIcons.plusCircle, size: 24, color: c.tx3),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      );
  }

  Widget _recordingBar(NqColors c) {
    final s = _recordElapsed.inSeconds;
    final time = '${(s ~/ 60).toString().padLeft(2, '0')}:${(s % 60).toString().padLeft(2, '0')}';
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 10, 16, 16),
      decoration:
          BoxDecoration(color: c.sf, border: Border(top: BorderSide(color: c.bd))),
      child: Row(
        children: [
          GestureDetector(
            onTap: _stopRecordingAndSend,
            child: Container(
              width: 48,
              height: 48,
              alignment: Alignment.center,
              decoration: BoxDecoration(color: c.mint, shape: BoxShape.circle),
              child: NqIcon(NqIcons.paperPlaneTilt,
                  fill: true, size: 20, color: c.onMint),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Container(
              height: 48,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              decoration: BoxDecoration(
                color: c.errBg,
                borderRadius: BorderRadius.circular(NqRadius.input),
              ),
              child: Row(
                children: [
                  Container(
                      width: 10,
                      height: 10,
                      decoration: BoxDecoration(color: c.err, shape: BoxShape.circle)),
                  const SizedBox(width: 10),
                  Ltr(time, style: NqType.numeric(14, FontWeight.w600).copyWith(color: c.tx)),
                  const Spacer(),
                  Text('جارٍ التسجيل…', style: NqType.caption.copyWith(color: c.tx2)),
                ],
              ),
            ),
          ),
          const SizedBox(width: 12),
          GestureDetector(
            onTap: _cancelRecording,
            child: NqIcon(NqIcons.trash, size: 22, color: c.err),
          ),
        ],
      ),
    );
  }

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

/// A modal video player for a chat VIDEO message.
class _VideoPlayerDialog extends StatefulWidget {
  const _VideoPlayerDialog({required this.url});
  final String url;

  @override
  State<_VideoPlayerDialog> createState() => _VideoPlayerDialogState();
}

class _VideoPlayerDialogState extends State<_VideoPlayerDialog> {
  late final VideoPlayerController _controller;
  bool _ready = false;
  bool _failed = false;

  @override
  void initState() {
    super.initState();
    _controller = VideoPlayerController.networkUrl(Uri.parse(widget.url))
      ..initialize().then((_) {
        if (mounted) {
          setState(() => _ready = true);
          _controller.play();
        }
      }).catchError((_) {
        if (mounted) setState(() => _failed = true);
      });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: Colors.transparent,
      insetPadding: const EdgeInsets.all(16),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (_failed)
            const Padding(
              padding: EdgeInsets.all(24),
              child: Text('تعذّر تشغيل الفيديو.',
                  style: TextStyle(color: Colors.white)),
            )
          else if (_ready)
            GestureDetector(
              onTap: () => setState(() =>
                  _controller.value.isPlaying ? _controller.pause() : _controller.play()),
              child: AspectRatio(
                aspectRatio: _controller.value.aspectRatio == 0
                    ? 16 / 9
                    : _controller.value.aspectRatio,
                child: Stack(
                  alignment: Alignment.center,
                  children: [
                    VideoPlayer(_controller),
                    VideoProgressIndicator(_controller, allowScrubbing: true),
                  ],
                ),
              ),
            )
          else
            const Padding(
              padding: EdgeInsets.all(40),
              child: CircularProgressIndicator(color: Colors.white),
            ),
          const SizedBox(height: 12),
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('إغلاق', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }
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

/// A voice-note bubble: play/pause + progress + duration, backed by its own
/// [AudioPlayer].
class _VoiceBubble extends StatefulWidget {
  const _VoiceBubble({required this.url, required this.mine, this.durationMs});
  final String url;
  final bool mine;
  final int? durationMs;

  @override
  State<_VoiceBubble> createState() => _VoiceBubbleState();
}

class _VoiceBubbleState extends State<_VoiceBubble> {
  final _player = AudioPlayer();
  bool _playing = false;
  Duration _pos = Duration.zero;
  Duration _total = Duration.zero;
  late final List<StreamSubscription> _subs;

  @override
  void initState() {
    super.initState();
    if (widget.durationMs != null) {
      _total = Duration(milliseconds: widget.durationMs!);
    }
    _subs = [
      _player.onPlayerStateChanged.listen((s) {
        if (mounted) setState(() => _playing = s == PlayerState.playing);
      }),
      _player.onDurationChanged.listen((d) {
        if (mounted && d > Duration.zero) setState(() => _total = d);
      }),
      _player.onPositionChanged.listen((p) {
        if (mounted) setState(() => _pos = p);
      }),
      _player.onPlayerComplete.listen((_) {
        if (mounted) {
          setState(() {
            _playing = false;
            _pos = Duration.zero;
          });
        }
      }),
    ];
  }

  @override
  void dispose() {
    for (final s in _subs) {
      s.cancel();
    }
    _player.dispose();
    super.dispose();
  }

  Future<void> _toggle() async {
    if (_playing) {
      await _player.pause();
    } else {
      await _player.play(UrlSource(widget.url));
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = context.nq;
    final fg2 = widget.mine ? NqFixed.heroTextSecondary : c.tx2;
    final ctrlColor = widget.mine ? NqFixed.heroAccent : c.onMint;
    final progress = _total.inMilliseconds == 0
        ? 0.0
        : (_pos.inMilliseconds / _total.inMilliseconds).clamp(0.0, 1.0);
    final shown = _playing || _pos > Duration.zero ? _pos : _total;
    final s = shown.inSeconds;
    final time = '${(s ~/ 60).toString().padLeft(2, '0')}:${(s % 60).toString().padLeft(2, '0')}';
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        GestureDetector(
          onTap: _toggle,
          child: Container(
            width: 40,
            height: 40,
            alignment: Alignment.center,
            decoration: BoxDecoration(
                color: widget.mine ? NqFixed.heroFill2 : c.mint,
                shape: BoxShape.circle),
            child: _playing
                ? Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(width: 3, height: 14, color: ctrlColor),
                      const SizedBox(width: 3),
                      Container(width: 3, height: 14, color: ctrlColor),
                    ],
                  )
                : NqIcon(NqIcons.play, fill: true, size: 18, color: ctrlColor),
          ),
        ),
        const SizedBox(width: 10),
        SizedBox(
          width: 120,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(3),
                child: LinearProgressIndicator(
                  value: progress,
                  minHeight: 4,
                  backgroundColor: widget.mine ? NqFixed.heroFill1 : c.sf2,
                  color: widget.mine ? NqFixed.heroAccent : c.mintS,
                ),
              ),
              const SizedBox(height: 6),
              Ltr(time, style: NqType.caption.copyWith(color: fg2)),
            ],
          ),
        ),
      ],
    );
  }
}
