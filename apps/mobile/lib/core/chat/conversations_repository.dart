import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/api_client.dart';
import '../api/api_exception.dart';

/// One chat thread in the inbox (`GET /conversations`).
class Conversation {
  Conversation({
    required this.orderId,
    required this.orderNumber,
    required this.route,
    required this.counterpart,
    this.lastPreview,
    this.lastAt,
    this.unread = 0,
  });

  final String orderId;
  final String orderNumber;
  final String route;
  final String counterpart;
  final String? lastPreview;
  final DateTime? lastAt;
  final int unread;

  factory Conversation.fromJson(Map<String, dynamic> j) {
    final last = j['lastMessage'];
    return Conversation(
      orderId: j['orderId'].toString(),
      orderNumber: (j['orderNumber'] ?? '').toString(),
      route: (j['route'] ?? '').toString(),
      counterpart: (j['counterpart'] ?? '').toString(),
      lastPreview: last is Map ? last['preview']?.toString() : null,
      lastAt: last is Map
          ? DateTime.tryParse((last['createdAt'] ?? '').toString())
          : null,
      unread: (j['unread'] as num?)?.toInt() ?? 0,
    );
  }
}

class ConversationsRepository {
  ConversationsRepository(this._client);
  final ApiClient _client;
  Dio get _dio => _client.dio;

  /// `GET /conversations` — the user's threads, most recent first.
  Future<List<Conversation>> list() async {
    try {
      final res = await _dio.get<dynamic>('/conversations');
      final data = res.data;
      final list = data is Map ? (data['data'] ?? data['items']) : data;
      return (list as List? ?? const [])
          .whereType<Map>()
          .map((e) => Conversation.fromJson(Map<String, dynamic>.from(e)))
          .toList();
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }
}

final conversationsRepositoryProvider =
    Provider<ConversationsRepository>((ref) {
  return ConversationsRepository(ref.watch(apiClientProvider));
});

/// The signed-in user's chat inbox (refreshes on invalidation).
final conversationsProvider =
    FutureProvider<List<Conversation>>((ref) {
  return ref.watch(conversationsRepositoryProvider).list();
});
