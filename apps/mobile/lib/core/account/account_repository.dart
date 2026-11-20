import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/api_client.dart';
import '../api/api_exception.dart';

/// A pending order blocking account deletion.
class DeletionOrderBlocker {
  DeletionOrderBlocker(this.orderNumber, this.status, this.route);
  final String orderNumber;
  final String status;
  final String route;
  factory DeletionOrderBlocker.fromJson(Map<String, dynamic> j) =>
      DeletionOrderBlocker(
          (j['orderNumber'] ?? '').toString(),
          (j['status'] ?? '').toString(),
          (j['route'] ?? '').toString());
}

/// An unpaid invoice blocking account deletion.
class DeletionDueBlocker {
  DeletionDueBlocker(this.invoiceNumber, this.status, this.totalAmount);
  final String invoiceNumber;
  final String status;
  final String totalAmount;
  factory DeletionDueBlocker.fromJson(Map<String, dynamic> j) =>
      DeletionDueBlocker(
          (j['invoiceNumber'] ?? '').toString(),
          (j['status'] ?? '').toString(),
          (j['totalAmount'] ?? '').toString());
}

/// Current account-deletion state + what (if anything) blocks it.
class DeletionOverview {
  DeletionOverview({
    required this.scheduled,
    required this.canDelete,
    required this.graceDays,
    required this.scheduledAt,
    required this.orders,
    required this.dues,
  });

  final bool scheduled;
  final bool canDelete;
  final int graceDays;
  final DateTime? scheduledAt;
  final List<DeletionOrderBlocker> orders;
  final List<DeletionDueBlocker> dues;

  bool get hasBlockers => orders.isNotEmpty || dues.isNotEmpty;

  factory DeletionOverview.fromJson(Map<String, dynamic> j) {
    final b = (j['blockers'] is Map)
        ? Map<String, dynamic>.from(j['blockers'] as Map)
        : const <String, dynamic>{};
    return DeletionOverview(
      scheduled: (j['status'] ?? 'none').toString() == 'scheduled',
      canDelete: j['canDelete'] == true,
      graceDays: (j['graceDays'] is num) ? (j['graceDays'] as num).toInt() : 30,
      scheduledAt: DateTime.tryParse((j['scheduledAt'] ?? '').toString()),
      orders: ((b['orders'] as List?) ?? const [])
          .whereType<Map>()
          .map((e) => DeletionOrderBlocker.fromJson(Map<String, dynamic>.from(e)))
          .toList(),
      dues: ((b['dues'] as List?) ?? const [])
          .whereType<Map>()
          .map((e) => DeletionDueBlocker.fromJson(Map<String, dynamic>.from(e)))
          .toList(),
    );
  }
}

class AccountRepository {
  AccountRepository(this._client);
  final ApiClient _client;
  Dio get _dio => _client.dio;

  /// `GET /account/deletion` — status + canDelete + blockers.
  Future<DeletionOverview> deletionOverview() async {
    try {
      final res = await _dio.get<dynamic>('/account/deletion');
      return DeletionOverview.fromJson(Map<String, dynamic>.from(res.data as Map));
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }

  /// `POST /account/deletion` — request deletion (throws with blockers if any).
  Future<void> requestDeletion() async {
    try {
      await _dio.post<dynamic>('/account/deletion');
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }

  /// `DELETE /account/deletion` — cancel within the grace window.
  Future<void> cancelDeletion() async {
    try {
      await _dio.delete<dynamic>('/account/deletion');
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }
}

final accountRepositoryProvider = Provider<AccountRepository>((ref) {
  return AccountRepository(ref.watch(apiClientProvider));
});

/// The deletion overview for the signed-in user (refetch with `invalidate`).
final deletionOverviewProvider = FutureProvider<DeletionOverview>((ref) {
  return ref.watch(accountRepositoryProvider).deletionOverview();
});
