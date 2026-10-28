import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/api_client.dart';
import '../api/api_exception.dart';

/// A logged maintenance event («آخر الصيانات»).
class MaintenanceRecord {
  MaintenanceRecord({
    required this.id,
    required this.type,
    required this.title,
    this.cost,
    this.odometerKm,
    this.workshop,
    this.notes,
    this.performedAt,
  });

  final String id;
  final String type;
  final String title;
  final num? cost;
  final int? odometerKm;
  final String? workshop;
  final String? notes;
  final DateTime? performedAt;

  factory MaintenanceRecord.fromJson(Map<String, dynamic> j) => MaintenanceRecord(
        id: j['id'].toString(),
        type: (j['type'] ?? 'OTHER').toString(),
        title: (j['title'] ?? '').toString(),
        cost: j['cost'] is num ? j['cost'] as num : null,
        odometerKm: (j['odometerKm'] as num?)?.toInt(),
        workshop: j['workshop']?.toString(),
        notes: j['notes']?.toString(),
        performedAt: _date(j['performedAt']),
      );
}

/// A truck's maintenance schedule (with derived fields) plus its event log.
class TruckMaintenance {
  TruckMaintenance({
    required this.truckId,
    required this.plateNumber,
    this.make,
    this.model,
    this.year,
    required this.type,
    this.driverName,
    this.odometerKm,
    required this.oilIntervalKm,
    this.lastServiceKm,
    this.nextServiceKm,
    this.kmToService,
    this.inspectionExpiry,
    this.insuranceExpiry,
    this.tiresChangedAt,
    required this.records,
  });

  final String truckId;
  final String plateNumber;
  final String? make;
  final String? model;
  final int? year;
  final String type;
  final String? driverName;
  final int? odometerKm;
  final int oilIntervalKm;
  final int? lastServiceKm;
  final int? nextServiceKm;
  final int? kmToService;
  final DateTime? inspectionExpiry;
  final DateTime? insuranceExpiry;
  final DateTime? tiresChangedAt;
  final List<MaintenanceRecord> records;

  String get makeModel => [make, model, year?.toString()]
      .whereType<String>()
      .where((p) => p.isNotEmpty)
      .join(' ');

  /// Progress through the current oil-change interval (0..1).
  double? get serviceProgress {
    if (odometerKm == null || lastServiceKm == null || oilIntervalKm <= 0) {
      return null;
    }
    final done = (odometerKm! - lastServiceKm!) / oilIntervalKm;
    return done.clamp(0.0, 1.0);
  }

  factory TruckMaintenance.fromJson(Map<String, dynamic> j) => TruckMaintenance(
        truckId: j['truckId'].toString(),
        plateNumber: (j['plateNumber'] ?? '—').toString(),
        make: j['make']?.toString(),
        model: j['model']?.toString(),
        year: (j['year'] as num?)?.toInt(),
        type: (j['type'] ?? '').toString(),
        driverName: j['driverName']?.toString(),
        odometerKm: (j['odometerKm'] as num?)?.toInt(),
        oilIntervalKm: (j['oilIntervalKm'] as num?)?.toInt() ?? 15000,
        lastServiceKm: (j['lastServiceKm'] as num?)?.toInt(),
        nextServiceKm: (j['nextServiceKm'] as num?)?.toInt(),
        kmToService: (j['kmToService'] as num?)?.toInt(),
        inspectionExpiry: _date(j['inspectionExpiry']),
        insuranceExpiry: _date(j['insuranceExpiry']),
        tiresChangedAt: _date(j['tiresChangedAt']),
        records: ((j['records'] as List?) ?? const [])
            .whereType<Map>()
            .map((e) => MaintenanceRecord.fromJson(Map<String, dynamic>.from(e)))
            .toList(),
      );
}

class MaintenanceRepository {
  MaintenanceRepository(this._client);
  final ApiClient _client;
  Dio get _dio => _client.dio;

  /// `GET /fleet/trucks/:id/maintenance`.
  Future<TruckMaintenance> get(String truckId) async {
    try {
      final res = await _dio.get<dynamic>('/fleet/trucks/$truckId/maintenance');
      final data = res.data is Map ? (res.data['data'] ?? res.data) : res.data;
      return TruckMaintenance.fromJson(Map<String, dynamic>.from(data as Map));
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }

  /// `POST /fleet/trucks/:id/maintenance` — log an event.
  Future<void> log(String truckId, Map<String, dynamic> body) async {
    try {
      await _dio.post<dynamic>('/fleet/trucks/$truckId/maintenance', data: body);
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }

  /// `PATCH /fleet/trucks/:id/maintenance/schedule`.
  Future<void> updateSchedule(String truckId, Map<String, dynamic> body) async {
    try {
      await _dio.patch<dynamic>(
          '/fleet/trucks/$truckId/maintenance/schedule', data: body);
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }
}

DateTime? _date(dynamic v) {
  if (v == null) return null;
  return DateTime.tryParse(v.toString());
}

final maintenanceRepositoryProvider = Provider<MaintenanceRepository>((ref) {
  return MaintenanceRepository(ref.watch(apiClientProvider));
});

/// A truck's maintenance data (refreshes on invalidation after logging).
final truckMaintenanceProvider =
    FutureProvider.family<TruckMaintenance, String>((ref, truckId) {
  return ref.watch(maintenanceRepositoryProvider).get(truckId);
});
