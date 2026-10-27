import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/api_client.dart';
import '../api/api_exception.dart';

/// A chat message on an order thread (`GET/POST /orders/:id/messages`).
class ChatMessage {
  const ChatMessage({
    required this.id,
    required this.senderId,
    required this.body,
    this.senderCompanyId,
    this.createdAt,
  });

  final String id;
  final String senderId;
  final String? senderCompanyId;
  final String body;
  final DateTime? createdAt;

  /// Whether this message was sent by the viewing company.
  bool mine(String? myCompanyId, String? myUserId) =>
      (senderCompanyId != null && senderCompanyId == myCompanyId) ||
      (myCompanyId == null && senderId == myUserId);

  factory ChatMessage.fromJson(Map<String, dynamic> j) => ChatMessage(
        id: j['id'].toString(),
        senderId: (j['senderId'] ?? '').toString(),
        senderCompanyId: j['senderCompanyId']?.toString(),
        body: (j['body'] ?? '').toString(),
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

  Future<ChatMessage> send(String orderId, String body) async {
    try {
      final res = await _dio.post<dynamic>('/orders/$orderId/messages',
          data: {'body': body});
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
