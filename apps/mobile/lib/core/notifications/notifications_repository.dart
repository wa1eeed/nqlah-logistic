import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/api_client.dart';
import '../api/api_exception.dart';

/// One in-app notification (`GET /notifications`).
class NotificationModel {
  NotificationModel({
    required this.id,
    required this.type,
    required this.title,
    required this.body,
    required this.isRead,
    this.createdAt,
    this.data = const {},
  });

  final String id;
  final String type;
  final String title;
  final String body;
  final bool isRead;
  final DateTime? createdAt;
  final Map<String, dynamic> data;

  /// The order this notification refers to, when present in `data`.
  String? get orderId =>
      (data['orderId'] ?? data['orderID'] ?? data['order_id'])?.toString();

  factory NotificationModel.fromJson(Map<String, dynamic> j) => NotificationModel(
        id: j['id'].toString(),
        type: (j['type'] ?? 'SYSTEM').toString(),
        title: (j['titleAr'] ?? j['title'] ?? '').toString(),
        body: (j['bodyAr'] ?? j['body'] ?? '').toString(),
        isRead: j['isRead'] == true,
        createdAt: DateTime.tryParse((j['createdAt'] ?? '').toString()),
        data: j['data'] is Map
            ? Map<String, dynamic>.from(j['data'] as Map)
            : const {},
      );
}

/// A page of notifications plus the unread count.
class NotificationsPage {
  NotificationsPage({required this.items, required this.unread});
  final List<NotificationModel> items;
  final int unread;
}

class NotificationsRepository {
  NotificationsRepository(this._client);
  final ApiClient _client;
  Dio get _dio => _client.dio;

  /// `GET /notifications` — most recent first, with the unread count.
  Future<NotificationsPage> list() async {
    try {
      final res = await _dio.get<dynamic>('/notifications',
          queryParameters: {'page': 1, 'limit': 50});
      final data = res.data;
      final list = data is Map ? (data['data'] ?? data['items']) : data;
      final meta = data is Map && data['meta'] is Map ? data['meta'] as Map : const {};
      final unread = (meta['unread'] as num?)?.toInt() ??
          (data is Map ? (data['unread'] as num?)?.toInt() : null) ??
          0;
      final items = (list as List? ?? const [])
          .whereType<Map>()
          .map((e) => NotificationModel.fromJson(Map<String, dynamic>.from(e)))
          .toList();
      return NotificationsPage(items: items, unread: unread);
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }

  /// `PUT /notifications/read-all`.
  Future<void> markAllRead() async {
    try {
      await _dio.put<dynamic>('/notifications/read-all');
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }

  /// `PUT /notifications/:id/read`.
  Future<void> markRead(String id) async {
    try {
      await _dio.put<dynamic>('/notifications/$id/read');
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }

  /// `POST /notifications/devices` — register this device's push token so the
  /// backend can deliver via FCM/APNs. Best-effort; never throws.
  Future<void> registerDevice(String token, String platform) async {
    try {
      await _dio.post<dynamic>('/notifications/devices',
          data: {'token': token, 'platform': platform});
    } catch (_) {/* best-effort — push registration never blocks the app */}
  }

  /// `DELETE /notifications/devices/:token` — unregister on logout/refresh.
  Future<void> unregisterDevice(String token) async {
    try {
      await _dio.delete<dynamic>('/notifications/devices/$token');
    } catch (_) {/* best-effort */}
  }
}

final notificationsRepositoryProvider =
    Provider<NotificationsRepository>((ref) {
  return NotificationsRepository(ref.watch(apiClientProvider));
});

/// The signed-in user's notifications (refreshes on invalidation).
final notificationsProvider = FutureProvider<NotificationsPage>((ref) {
  return ref.watch(notificationsRepositoryProvider).list();
});
