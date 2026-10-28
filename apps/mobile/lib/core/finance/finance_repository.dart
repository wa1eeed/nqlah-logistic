import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/api_client.dart';
import '../api/api_exception.dart';

num? _num(dynamic v) =>
    v == null ? null : (v is num ? v : num.tryParse(v.toString()));

DateTime? _date(dynamic v) => v == null ? null : DateTime.tryParse(v.toString());

/// An invoice (`GET /invoices`). `status`: DRAFT/ISSUED/PAID/OVERDUE/CANCELLED.
class InvoiceModel {
  InvoiceModel({
    required this.id,
    required this.invoiceNumber,
    required this.status,
    required this.totalAmount,
    this.amount,
    this.vatAmount,
    this.issuerName,
    this.receiverName,
    this.orderNumber,
    this.dueDate,
    this.paidAt,
    this.createdAt,
  });

  final String id;
  final String invoiceNumber;
  final String status;
  final num totalAmount;
  final num? amount;
  final num? vatAmount;
  final String? issuerName;
  final String? receiverName;
  final String? orderNumber;
  final DateTime? dueDate;
  final DateTime? paidAt;
  final DateTime? createdAt;

  bool get isPaid => status.toUpperCase() == 'PAID';
  bool get isOverdue => status.toUpperCase() == 'OVERDUE';
  bool get isDue => !isPaid && status.toUpperCase() != 'CANCELLED';

  factory InvoiceModel.fromJson(Map<String, dynamic> j) {
    final issuer = j['issuer'];
    final receiver = j['receiver'];
    final order = j['order'];
    return InvoiceModel(
      id: j['id'].toString(),
      invoiceNumber: (j['invoiceNumber'] ?? j['id']).toString(),
      status: (j['status'] ?? 'ISSUED').toString(),
      totalAmount: _num(j['totalAmount']) ?? _num(j['amount']) ?? 0,
      amount: _num(j['amount']),
      vatAmount: _num(j['vatAmount']),
      issuerName: issuer is Map ? issuer['nameAr']?.toString() : null,
      receiverName: receiver is Map ? receiver['nameAr']?.toString() : null,
      orderNumber: order is Map ? order['orderNumber']?.toString() : null,
      dueDate: _date(j['dueDate']),
      paidAt: _date(j['paidAt']),
      createdAt: _date(j['createdAt']),
    );
  }
}

/// A payment (`GET /payments`). `status`: PENDING/HELD/RELEASED/REFUNDED/FAILED.
/// `collectionMethod`: ESCROW / COD / PREPAID_*.
class PaymentModel {
  PaymentModel({
    required this.id,
    required this.status,
    required this.collectionMethod,
    required this.totalAmount,
    this.carrierAmount,
    this.dueOnDelivery = 0,
    this.orderNumber,
    this.clientName,
    this.carrierName,
    this.collectedAt,
    this.releasedAt,
  });

  final String id;
  final String status;
  final String collectionMethod;
  final num totalAmount;
  final num? carrierAmount;
  final num dueOnDelivery;
  final String? orderNumber;
  final String? clientName;
  final String? carrierName;
  final DateTime? collectedAt;
  final DateTime? releasedAt;

  bool get isCod => collectionMethod.toUpperCase() == 'COD';
  bool get isReleased => status.toUpperCase() == 'RELEASED';
  bool get isHeld => status.toUpperCase() == 'HELD';

  /// A COD payment whose cash is still to be recorded as collected.
  bool get needsCodCollection => isCod && collectedAt == null && dueOnDelivery > 0;

  factory PaymentModel.fromJson(Map<String, dynamic> j) {
    final order = j['order'];
    final client = order is Map ? order['client'] : null;
    final carrier = order is Map ? order['carrier'] : null;
    return PaymentModel(
      id: j['id'].toString(),
      status: (j['status'] ?? 'PENDING').toString(),
      collectionMethod: (j['collectionMethod'] ?? 'ESCROW').toString(),
      totalAmount: _num(j['totalAmount']) ?? 0,
      carrierAmount: _num(j['carrierAmount']),
      dueOnDelivery: _num(j['dueOnDelivery']) ?? 0,
      orderNumber: order is Map ? order['orderNumber']?.toString() : null,
      clientName: client is Map ? client['nameAr']?.toString() : null,
      carrierName: carrier is Map ? carrier['nameAr']?.toString() : null,
      collectedAt: _date(j['collectedAt']),
      releasedAt: _date(j['releasedAt']),
    );
  }
}

class FinanceRepository {
  FinanceRepository(this._client);
  final ApiClient _client;
  Dio get _dio => _client.dio;

  void _ensureOk(Response res) {
    final code = res.statusCode ?? 0;
    if (code < 200 || code >= 300) {
      throw DioException(
          requestOptions: res.requestOptions,
          response: res,
          type: DioExceptionType.badResponse);
    }
  }

  /// `GET /invoices` — the company's invoices (issued or received).
  Future<List<InvoiceModel>> invoices() async {
    try {
      final res = await _dio.get<dynamic>('/invoices',
          queryParameters: {'page': 1, 'limit': 100});
      final code = res.statusCode ?? 0;
      if (code < 200 || code >= 300) {
        throw DioException(
            requestOptions: res.requestOptions,
            response: res,
            type: DioExceptionType.badResponse);
      }
      final data = res.data;
      final list = data is Map ? (data['data'] ?? data['items']) : data;
      return (list as List? ?? const [])
          .whereType<Map>()
          .map((e) => InvoiceModel.fromJson(Map<String, dynamic>.from(e)))
          .toList();
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }

  /// `GET /invoices/:id/pdf` — a short-lived URL to the ZATCA tax-invoice PDF.
  Future<String> invoicePdfUrl(String id) async {
    try {
      final res = await _dio.get<dynamic>('/invoices/$id/pdf');
      _ensureOk(res);
      final data = res.data;
      final url = data is Map ? (data['data']?['url'] ?? data['url']) : null;
      if (url == null) {
        throw DioException(
            requestOptions: res.requestOptions,
            response: res,
            type: DioExceptionType.badResponse);
      }
      return url.toString();
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }

  /// `GET /payments` — the company's payments (as client or carrier).
  Future<List<PaymentModel>> payments() async {
    try {
      final res = await _dio.get<dynamic>('/payments',
          queryParameters: {'page': 1, 'limit': 100});
      _ensureOk(res);
      final data = res.data;
      final list = data is Map ? (data['data'] ?? data['items']) : data;
      return (list as List? ?? const [])
          .whereType<Map>()
          .map((e) => PaymentModel.fromJson(Map<String, dynamic>.from(e)))
          .toList();
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }

  /// `POST /payments/:id/collect` — the carrier records a COD payment's cash as
  /// collected on delivery.
  Future<void> collect(String paymentId) async {
    try {
      final res = await _dio.post('/payments/$paymentId/collect');
      _ensureOk(res);
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }
}

final financeRepositoryProvider = Provider<FinanceRepository>((ref) {
  return FinanceRepository(ref.watch(apiClientProvider));
});

/// The company's invoices (provider receivables / customer payables).
final invoicesProvider = FutureProvider<List<InvoiceModel>>((ref) {
  return ref.watch(financeRepositoryProvider).invoices();
});

/// The company's payments (escrow / COD settlement state).
final paymentsProvider = FutureProvider<List<PaymentModel>>((ref) {
  return ref.watch(financeRepositoryProvider).payments();
});
