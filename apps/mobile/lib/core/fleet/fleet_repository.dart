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
    this.userId,
    this.phone,
    this.rating = 0,
    this.totalTrips = 0,
    this.status = 'AVAILABLE',
    this.licenseType,
    this.note,
  });

  final String id;
  final String name;
  final String? userId; // the backing user (to spot the owner's own profile)
  final String? phone;
  final num rating;
  final int totalTrips;
  final String status;
  final String? licenseType;
  final String? note; // free-text provider note («ملاحظة»)

  factory DriverModel.fromJson(Map<String, dynamic> j) {
    final user = j['user'];
    final first = user is Map ? (user['firstName']?.toString() ?? '') : '';
    final last = user is Map ? (user['lastName']?.toString() ?? '') : '';
    final name = [first, last].where((p) => p.isNotEmpty).join(' ').trim();
    return DriverModel(
      id: j['id'].toString(),
      name: name.isNotEmpty ? name : 'سائق',
      userId: (j['userId'] ?? (user is Map ? user['id'] : null))?.toString(),
      phone: user is Map ? user['phone']?.toString() : null,
      rating: _num(j['rating']) ?? 0,
      totalTrips: _num(j['totalTrips'])?.toInt() ?? 0,
      status: (j['status'] ?? 'AVAILABLE').toString(),
      licenseType: j['licenseType']?.toString(),
      note: j['note']?.toString(),
    );
  }
}

const _truckTypeLabels = <String, String>{
  'SMALL_FLATBED': 'سطحة صغيرة',
  'MEDIUM_FLATBED': 'سطحة متوسطة',
  'LARGE_FLATBED': 'تريلا سطحة',
  'REFRIGERATED': 'مبرّدة',
  'CONTAINER_20': 'حاوية 20',
  'CONTAINER_40': 'حاوية 40',
  'TANKER': 'صهريج',
  'CURTAINSIDER': 'ستائرية',
  'BOX_TRUCK': 'صندوقية',
  'LOWBED': 'لوبد',
};

String truckTypeLabel(String? v) =>
    _truckTypeLabels[(v ?? '').toUpperCase()] ?? 'شاحنة';

/// A truck in the carrier's fleet (`GET /fleet/trucks`).
class TruckModel {
  TruckModel({
    required this.id,
    required this.plateNumber,
    required this.type,
    required this.status,
    this.make,
    this.model,
    this.year,
    this.note,
  });

  final String id;
  final String plateNumber;
  final String type;
  final String status; // AVAILABLE / ON_TRIP / MAINTENANCE / OUT_OF_SERVICE
  final String? make;
  final String? model;
  final int? year;
  final String? note; // free-text provider note («ملاحظة»)

  String get typeLabel => truckTypeLabel(type);
  String get makeModel => [make, model, year?.toString()]
      .where((p) => p != null && p.isNotEmpty)
      .join(' ');

  factory TruckModel.fromJson(Map<String, dynamic> j) => TruckModel(
        id: j['id'].toString(),
        plateNumber: (j['plateNumber'] ?? '—').toString(),
        type: (j['type'] ?? '').toString(),
        status: (j['status'] ?? 'AVAILABLE').toString(),
        make: j['make']?.toString(),
        model: j['model']?.toString(),
        year: _num(j['year'])?.toInt(),
        note: j['note']?.toString(),
      );
}

class FleetRepository {
  FleetRepository(this._client);
  final ApiClient _client;
  Dio get _dio => _client.dio;

  Future<List<T>> _listOf<T>(
      String path, T Function(Map<String, dynamic>) parse) async {
    try {
      final res = await _dio.get<dynamic>(path,
          queryParameters: {'page': 1, 'limit': 100});
      _ensureOk(res);
      final data = res.data;
      final list = data is Map ? (data['data'] ?? data['items']) : data;
      return (list as List? ?? const [])
          .whereType<Map>()
          .map((e) => parse(Map<String, dynamic>.from(e)))
          .toList();
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }

  /// `POST /fleet/drivers/invite` — invite a driver to the carrier's fleet.
  /// Returns the server payload (may include a generated temporary password).
  Future<Map<String, dynamic>> inviteDriver(Map<String, dynamic> body) async {
    try {
      final res =
          await _dio.post<Map<String, dynamic>>('/fleet/drivers/invite', data: body);
      _ensureOk(res);
      return res.data ?? const {};
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }

  /// `GET /fleet/trucks` — the carrier's trucks.
  Future<List<TruckModel>> trucks() => _listOf('/fleet/trucks', TruckModel.fromJson);

  /// `GET /fleet/drivers` — the carrier's drivers (all).
  Future<List<DriverModel>> drivers() =>
      _listOf('/fleet/drivers', DriverModel.fromJson);

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

/// The carrier's full driver roster.
final fleetDriversProvider = FutureProvider<List<DriverModel>>((ref) {
  return ref.watch(fleetRepositoryProvider).drivers();
});

/// The carrier's trucks.
final fleetTrucksProvider = FutureProvider<List<TruckModel>>((ref) {
  return ref.watch(fleetRepositoryProvider).trucks();
});
