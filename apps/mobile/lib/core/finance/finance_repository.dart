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

class FinanceRepository {
  FinanceRepository(this._client);
  final ApiClient _client;
  Dio get _dio => _client.dio;

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
}

final financeRepositoryProvider = Provider<FinanceRepository>((ref) {
  return FinanceRepository(ref.watch(apiClientProvider));
});

/// The company's invoices (provider receivables / customer payables).
final invoicesProvider = FutureProvider<List<InvoiceModel>>((ref) {
  return ref.watch(financeRepositoryProvider).invoices();
});
