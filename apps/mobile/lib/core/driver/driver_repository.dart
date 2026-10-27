import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/api_client.dart';
import '../api/api_exception.dart';

DateTime? _date(dynamic v) => v == null ? null : DateTime.tryParse(v.toString());

/// One trip assigned to the acting driver (`GET /driver/jobs`). Execution-only:
/// no price, no customer identity surfaced in the UI.
class DriverJob {
  DriverJob({
    required this.id,
    required this.orderNumber,
    required this.status,
    required this.originCity,
    required this.destinationCity,
    this.cargoDescription,
    this.pickupDate,
    this.deliveryDate,
    this.stopsCount = 0,
  });

  final String id;
  final String orderNumber;
  final String status;
  final String originCity;
  final String destinationCity;
  final String? cargoDescription;
  final DateTime? pickupDate;
  final DateTime? deliveryDate;
  final int stopsCount;

  String get route => '$originCity ← $destinationCity';

  factory DriverJob.fromJson(Map<String, dynamic> j) {
    final stops = j['stops'];
    return DriverJob(
      id: j['id'].toString(),
      orderNumber: (j['orderNumber'] ?? j['id']).toString(),
      status: (j['status'] ?? 'ASSIGNED').toString(),
      originCity: (j['originCity'] ?? '—').toString(),
      destinationCity: (j['destinationCity'] ?? '—').toString(),
      cargoDescription: j['cargoDescription']?.toString(),
      pickupDate: _date(j['pickupDate']),
      deliveryDate: _date(j['deliveryDate']),
      stopsCount: stops is List ? stops.length : 0,
    );
  }
}

/// The acting driver's own profile (`GET /driver/me`).
class DriverMe {
  DriverMe({required this.name, this.status = 'OFF_DUTY'});
  final String name;
  final String status;

  factory DriverMe.fromJson(Map<String, dynamic> j) {
    final user = j['user'];
    final f = user is Map ? (user['firstName']?.toString() ?? '') : '';
    final l = user is Map ? (user['lastName']?.toString() ?? '') : '';
    final n = [f, l].where((p) => p.isNotEmpty).join(' ').trim();
    return DriverMe(
      name: n.isNotEmpty ? n : 'السائق',
      status: (j['status'] ?? 'OFF_DUTY').toString(),
    );
  }
}

class DriverRepository {
  DriverRepository(this._client);
  final ApiClient _client;
  Dio get _dio => _client.dio;

  Future<List<DriverJob>> jobs() async {
    try {
      final res = await _dio.get<dynamic>('/driver/jobs');
      _ensureOk(res);
      final data = res.data;
      final list = data is Map ? (data['data'] ?? data['jobs']) : data;
      return (list as List? ?? const [])
          .whereType<Map>()
          .map((e) => DriverJob.fromJson(Map<String, dynamic>.from(e)))
          .toList();
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }

  Future<DriverMe> me() async {
    try {
      final res = await _dio.get<Map<String, dynamic>>('/driver/me');
      _ensureOk(res);
      return DriverMe.fromJson(res.data ?? const {});
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

final driverRepositoryProvider = Provider<DriverRepository>((ref) {
  return DriverRepository(ref.watch(apiClientProvider));
});

final driverJobsProvider = FutureProvider<List<DriverJob>>((ref) {
  return ref.watch(driverRepositoryProvider).jobs();
});

final driverMeProvider = FutureProvider<DriverMe>((ref) {
  return ref.watch(driverRepositoryProvider).me();
});
