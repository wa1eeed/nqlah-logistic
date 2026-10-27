import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/api_client.dart';
import '../api/api_exception.dart';

/// A chat message on an order thread (`GET/POST /orders/:id/messages`).
/// [kind] is TEXT / IMAGE / VIDEO / AUDIO / FILE; media messages carry a
/// short-lived signed [mediaUrl] (direct from the store).
class ChatMessage {
  const ChatMessage({
    required this.id,
    required this.senderId,
    required this.body,
    this.kind = 'TEXT',
    this.senderCompanyId,
    this.createdAt,
    this.mediaUrl,
    this.mediaName,
    this.mediaMime,
    this.mediaSize,
    this.durationMs,
  });

  final String id;
  final String senderId;
  final String? senderCompanyId;
  final String kind;
  final String body;
  final String? mediaUrl;
  final String? mediaName;
  final String? mediaMime;
  final int? mediaSize;
  final int? durationMs;
  final DateTime? createdAt;

  bool get isText => kind == 'TEXT';
  bool get isImage => kind == 'IMAGE';
  bool get isVideo => kind == 'VIDEO';
  bool get isAudio => kind == 'AUDIO';
  bool get isFile => kind == 'FILE';

  /// Whether this message was sent by the viewing company.
  bool mine(String? myCompanyId, String? myUserId) =>
      (senderCompanyId != null && senderCompanyId == myCompanyId) ||
      (myCompanyId == null && senderId == myUserId);

  factory ChatMessage.fromJson(Map<String, dynamic> j) => ChatMessage(
        id: j['id'].toString(),
        senderId: (j['senderId'] ?? '').toString(),
        senderCompanyId: j['senderCompanyId']?.toString(),
        kind: (j['kind'] ?? 'TEXT').toString(),
        body: (j['body'] ?? '').toString(),
        mediaUrl: j['mediaUrl']?.toString(),
        mediaName: j['mediaName']?.toString(),
        mediaMime: j['mediaMime']?.toString(),
        mediaSize: j['mediaSize'] is num ? (j['mediaSize'] as num).toInt() : null,
        durationMs:
            j['durationMs'] is num ? (j['durationMs'] as num).toInt() : null,
        createdAt: j['createdAt'] == null
            ? null
            : DateTime.tryParse(j['createdAt'].toString()),
      );
}

class ChatRepository {
  ChatRepository(this._client);
  final ApiClient _client;
  Dio get _dio => _client.dio;

  Future<List<ChatMessage>> messages(String orderId) async {
    try {
      final res = await _dio.get<dynamic>('/orders/$orderId/messages');
      _ensureOk(res);
      final data = res.data;
      final list = data is List ? data : (data is Map ? (data['data'] as List? ?? const []) : const []);
      return list
          .whereType<Map>()
          .map((e) => ChatMessage.fromJson(Map<String, dynamic>.from(e)))
          .toList();
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }

  Future<ChatMessage> send(
    String orderId, {
    String kind = 'TEXT',
    String body = '',
    String? mediaKey,
    String? mediaName,
    String? mediaMime,
    int? mediaSize,
    int? durationMs,
  }) async {
    try {
      final data = <String, dynamic>{'kind': kind, 'body': body};
      if (mediaKey != null) data['mediaKey'] = mediaKey;
      if (mediaName != null) data['mediaName'] = mediaName;
      if (mediaMime != null) data['mediaMime'] = mediaMime;
      if (mediaSize != null) data['mediaSize'] = mediaSize;
      if (durationMs != null) data['durationMs'] = durationMs;
      final res = await _dio.post<dynamic>('/orders/$orderId/messages', data: data);
      _ensureOk(res);
      final raw = res.data;
      final m = raw is Map && raw['data'] is Map ? raw['data'] : raw;
      return ChatMessage.fromJson(Map<String, dynamic>.from(m as Map));
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }

  void _ensureOk(Response res) {
    final code = res.statusCode ?? 0;
    if (code < 200 || code >= 300) {
      throw DioException(
          requestOptions: res.requestOptions,
          response: res,
          type: DioExceptionType.badResponse);
    }
  }
}

final chatRepositoryProvider = Provider<ChatRepository>((ref) {
  return ChatRepository(ref.watch(apiClientProvider));
});

/// The messages for one order thread.
final chatMessagesProvider =
    FutureProvider.family<List<ChatMessage>, String>((ref, orderId) {
  return ref.watch(chatRepositoryProvider).messages(orderId);
});
