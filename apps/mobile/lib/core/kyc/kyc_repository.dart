import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/api_client.dart';
import '../api/api_exception.dart';

/// One verification document as the server tracks it.
class KycDoc {
  const KycDoc({
    required this.id,
    required this.type,
    required this.status,
    this.notes,
  });

  final String id;
  final String type; // CR, VAT, transportLicense, nationalAddress, signatoryId…
  final String status; // PENDING | APPROVED | REJECTED
  final String? notes;

  factory KycDoc.fromJson(Map<String, dynamic> j) => KycDoc(
        id: (j['id'] ?? '').toString(),
        type: (j['type'] ?? '').toString(),
        status: (j['status'] ?? 'PENDING').toString(),
        notes: j['notes']?.toString(),
      );
}

/// Company verification documents (KYC), submitted after login.
/// `GET/POST /companies/:id/kyc` — the object key (from a presigned upload) is
/// sent as `fileUrl`.
class KycRepository {
  KycRepository(this._client);
  final ApiClient _client;
  Dio get _dio => _client.dio;

  Future<List<KycDoc>> list(String companyId) async {
    try {
      final res = await _dio.get<dynamic>('/companies/$companyId/kyc');
      final data = res.data;
      final rows = data is List ? data : const [];
      return rows
          .whereType<Map>()
          .map((e) => KycDoc.fromJson(Map<String, dynamic>.from(e)))
          .toList();
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }

  Future<void> submit(
    String companyId, {
    required String type,
    required String fileUrl,
    String? notes,
  }) async {
    try {
      await _dio.post<dynamic>('/companies/$companyId/kyc', data: {
        'type': type,
        'fileUrl': fileUrl,
        'notes': ?notes,
      });
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }
}

final kycRepositoryProvider = Provider<KycRepository>((ref) {
  return KycRepository(ref.watch(apiClientProvider));
});
