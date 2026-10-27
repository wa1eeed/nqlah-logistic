import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/api_client.dart';
import '../api/api_exception.dart';
import 'order_models.dart';

/// Wraps the `/orders` endpoints. Read methods used first (list/detail/
/// tracking); create/publish are ready for the create-order wizard.
class OrdersRepository {
  OrdersRepository(this._client);

  final ApiClient _client;
  Dio get _dio => _client.dio;

  /// `GET /orders` — the actor's orders. [mine] scopes to the caller's company.
  Future<List<OrderSummary>> list({
    bool mine = true,
    String? status,
    String? search,
    int page = 1,
    int limit = 50,
  }) async {
    try {
      final qp = <String, dynamic>{'mine': mine, 'page': page, 'limit': limit};
      if (status != null) qp['status'] = status;
      if (search != null && search.isNotEmpty) qp['search'] = search;
      final res = await _dio.get<Map<String, dynamic>>(
        '/orders',
        queryParameters: qp,
      );
      _ensureOk(res);
      final data = (res.data?['data'] as List?) ?? const [];
      return data
          .whereType<Map>()
          .map((e) => OrderSummary.fromJson(Map<String, dynamic>.from(e)))
          .toList();
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }

  /// `GET /orders/:id` — full order (scalars + bids/stops/legs).
  Future<Map<String, dynamic>> getById(String id) async {
    try {
      final res = await _dio.get<Map<String, dynamic>>('/orders/$id');
      _ensureOk(res);
      return res.data ?? const {};
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }

  /// `GET /orders/:id/tracking` — ordered tracking events.
  Future<List<Map<String, dynamic>>> tracking(String id) async {
    try {
      final res = await _dio.get<dynamic>('/orders/$id/tracking');
      _ensureOk(res);
      final data = res.data;
      final list = data is Map ? (data['data'] ?? data['events']) : data;
      return (list as List? ?? const [])
          .whereType<Map>()
          .map((e) => Map<String, dynamic>.from(e))
          .toList();
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }

  /// `POST /orders` — creates a DRAFT order, returns it.
  Future<Map<String, dynamic>> create(Map<String, dynamic> body) async {
    try {
      final res = await _dio.post<Map<String, dynamic>>('/orders', data: body);
      _ensureOk(res);
      return res.data ?? const {};
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }

  /// `GET /orders/:id/bids` — offers on an order, cheapest first.
  Future<List<BidModel>> bids(String orderId) async {
    try {
      final res = await _dio.get<dynamic>('/orders/$orderId/bids');
      _ensureOk(res);
      final data = res.data;
      final list = data is Map ? (data['data'] ?? data['bids']) : data;
      return (list as List? ?? const [])
          .whereType<Map>()
          .map((e) => BidModel.fromJson(Map<String, dynamic>.from(e)))
          .toList();
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }

  /// `POST /orders/:orderId/bids/:bidId/accept` — accept an offer (assigns the
  /// carrier to the order).
  Future<void> acceptBid(String orderId, String bidId) async {
    try {
      final res =
          await _dio.post('/orders/$orderId/bids/$bidId/accept');
      _ensureOk(res);
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }

  /// `POST /orders/:id/publish` — moves a draft to the marketplace.
  Future<Map<String, dynamic>> publish(String id) async {
    try {
      final res = await _dio.post<Map<String, dynamic>>('/orders/$id/publish');
      _ensureOk(res);
      return res.data ?? const {};
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
        type: DioExceptionType.badResponse,
      );
    }
  }
}

final ordersRepositoryProvider = Provider<OrdersRepository>((ref) {
  return OrdersRepository(ref.watch(apiClientProvider));
});

/// The customer's own shipments (`mine=true`). Auto-refreshes on `ref.refresh`.
final myShipmentsProvider = FutureProvider<List<OrderSummary>>((ref) {
  return ref.watch(ordersRepositoryProvider).list(mine: true);
});

/// One order's full detail by id (raw map).
final orderDetailProvider =
    FutureProvider.family<Map<String, dynamic>, String>((ref, id) {
  return ref.watch(ordersRepositoryProvider).getById(id);
});

/// One order's full detail by id, parsed into [OrderDetail].
final orderDetailModelProvider =
    FutureProvider.family<OrderDetail, String>((ref, id) async {
  final json = await ref.watch(ordersRepositoryProvider).getById(id);
  return OrderDetail.fromJson(json);
});

/// Offers on one order.
final orderBidsProvider =
    FutureProvider.family<List<BidModel>, String>((ref, id) {
  return ref.watch(ordersRepositoryProvider).bids(id);
});

/// The customer's order (if any) currently collecting offers — the most recent
/// PUBLISHED/BIDDING order that has at least one bid. Drives the offers tab.
final offersFocusOrderProvider = FutureProvider<OrderSummary?>((ref) async {
  final orders = await ref.watch(myShipmentsProvider.future);
  final candidates = orders.where((o) {
    final s = o.status.toUpperCase();
    return (s == 'PUBLISHED' || s == 'BIDDING') && o.bidsCount > 0;
  }).toList();
  return candidates.isEmpty ? null : candidates.first;
});
