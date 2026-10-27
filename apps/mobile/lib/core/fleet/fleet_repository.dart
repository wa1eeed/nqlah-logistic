import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/api_client.dart';
import '../api/api_exception.dart';

num? _num(dynamic v) =>
    v == null ? null : (v is num ? v : num.tryParse(v.toString()));

/// A driver in the carrier's fleet (`GET /fleet/drivers*`).
class DriverModel {
  DriverModel({
    required this.id,
    required this.name,
    this.phone,
    this.rating = 0,
    this.totalTrips = 0,
    this.status = 'AVAILABLE',
    this.licenseType,
  });

  final String id;
  final String name;
  final String? phone;
  final num rating;
  final int totalTrips;
  final String status;
  final String? licenseType;

  factory DriverModel.fromJson(Map<String, dynamic> j) {
    final user = j['user'];
    final first = user is Map ? (user['firstName']?.toString() ?? '') : '';
    final last = user is Map ? (user['lastName']?.toString() ?? '') : '';
    final name = [first, last].where((p) => p.isNotEmpty).join(' ').trim();
    return DriverModel(
      id: j['id'].toString(),
      name: name.isNotEmpty ? name : 'سائق',
      phone: user is Map ? user['phone']?.toString() : null,
      rating: _num(j['rating']) ?? 0,
      totalTrips: _num(j['totalTrips'])?.toInt() ?? 0,
      status: (j['status'] ?? 'AVAILABLE').toString(),
      licenseType: j['licenseType']?.toString(),
    );
  }
}

class FleetRepository {
  FleetRepository(this._client);
  final ApiClient _client;
  Dio get _dio => _client.dio;

  /// `GET /fleet/drivers/available` — eligible + available drivers.
  Future<List<DriverModel>> availableDrivers() async {
    try {
      final res = await _dio.get<dynamic>('/fleet/drivers/available');
      _ensureOk(res);
      final data = res.data;
      final list = data is Map ? (data['data'] ?? data['drivers']) : data;
      return (list as List? ?? const [])
          .whereType<Map>()
          .map((e) => DriverModel.fromJson(Map<String, dynamic>.from(e)))
          .toList();
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

final fleetRepositoryProvider = Provider<FleetRepository>((ref) {
  return FleetRepository(ref.watch(apiClientProvider));
});

/// The carrier's currently-available drivers (for assignment).
final availableDriversProvider = FutureProvider<List<DriverModel>>((ref) {
  return ref.watch(fleetRepositoryProvider).availableDrivers();
});
