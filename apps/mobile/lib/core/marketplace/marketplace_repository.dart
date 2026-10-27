import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/api_client.dart';
import '../api/api_exception.dart';
import '../fleet/fleet_repository.dart' show truckTypeLabel;

num? _num(dynamic v) =>
    v == null ? null : (v is num ? v : num.tryParse(v.toString()));

/// A truck's company, as exposed to customers in the marketplace. No contact
/// details — those are revealed only after a direct request is accepted.
class ListingCompany {
  const ListingCompany({
    required this.id,
    required this.name,
    this.logo,
    this.city,
    this.region,
  });

  final String id;
  final String name;
  final String? logo;
  final String? city;
  final String? region;

  String get initial => name.isNotEmpty ? name.substring(0, 1) : 'ن';

  factory ListingCompany.fromJson(Map<String, dynamic> j) => ListingCompany(
        id: j['id'].toString(),
        name: (j['nameAr'] ?? j['name'] ?? 'مزوّد').toString(),
        logo: j['logo']?.toString(),
        city: j['city']?.toString(),
        region: j['region']?.toString(),
      );
}

/// One available-truck listing in the customer marketplace
/// (`GET /marketplace/trucks`).
class TruckListing {
  const TruckListing({
    required this.id,
    required this.truckId,
    required this.originCity,
    required this.originRegion,
    required this.company,
    this.destCity,
    this.destRegion,
    this.truckType,
    this.capacity,
    this.refrigerated = false,
    this.make,
    this.model,
    this.year,
    this.availableFrom,
    this.availableTo,
    this.pricePerTrip,
    this.notes,
  });

  final String id;
  final String truckId;
  final String originCity;
  final String originRegion;
  final String? destCity;
  final String? destRegion;
  final ListingCompany company;
  final String? truckType;
  final num? capacity;
  final bool refrigerated;
  final String? make;
  final String? model;
  final int? year;
  final DateTime? availableFrom;
  final DateTime? availableTo;
  final num? pricePerTrip;
  final String? notes;

  /// A listing with a fixed destination is a planned (directed) trip; one
  /// without is open to any destination.
  bool get isDirected => (destCity ?? '').isNotEmpty;
  String get truckTypeLabel2 => truckTypeLabel(truckType);
  String get makeModel => [make, model, year?.toString()]
      .where((p) => p != null && p.isNotEmpty)
      .join(' ');

  factory TruckListing.fromJson(Map<String, dynamic> j) {
    final truck = j['truck'] is Map ? Map<String, dynamic>.from(j['truck'] as Map) : const {};
    final company =
        j['company'] is Map ? Map<String, dynamic>.from(j['company'] as Map) : const {};
    DateTime? dt(dynamic v) => v == null ? null : DateTime.tryParse(v.toString());
    return TruckListing(
      id: j['id'].toString(),
      truckId: (j['truckId'] ?? truck['id'] ?? '').toString(),
      originCity: (j['originCity'] ?? '').toString(),
      originRegion: (j['originRegion'] ?? '').toString(),
      destCity: j['destCity']?.toString(),
      destRegion: j['destRegion']?.toString(),
      company: ListingCompany.fromJson(Map<String, dynamic>.from(company)),
      truckType: truck['type']?.toString(),
      capacity: _num(truck['capacity']),
      refrigerated: truck['hasRefrigeration'] == true,
      make: truck['make']?.toString(),
      model: truck['model']?.toString(),
      year: _num(truck['year'])?.toInt(),
      availableFrom: dt(j['availableFrom']),
      availableTo: dt(j['availableTo']),
      pricePerTrip: _num(j['pricePerTrip']),
      notes: j['notes']?.toString(),
    );
  }
}

/// The carrier's own published availability (`GET /fleet/availability`),
/// including the truck's plate + status so the fleet screen can show it.
class MyAvailability {
  const MyAvailability({
    required this.id,
    required this.truckId,
    required this.originCity,
    this.originRegion,
    this.destCity,
    this.pricePerTrip,
    this.plateNumber,
    this.truckStatus,
  });

  final String id;
  final String truckId;
  final String originCity;
  final String? originRegion;
  final String? destCity;
  final num? pricePerTrip;
  final String? plateNumber;
  final String? truckStatus;

  factory MyAvailability.fromJson(Map<String, dynamic> j) {
    final truck = j['truck'] is Map ? Map<String, dynamic>.from(j['truck'] as Map) : const {};
    return MyAvailability(
      id: j['id'].toString(),
      truckId: (j['truckId'] ?? truck['id'] ?? '').toString(),
      originCity: (j['originCity'] ?? '').toString(),
      originRegion: j['originRegion']?.toString(),
      destCity: j['destCity']?.toString(),
      pricePerTrip: _num(j['pricePerTrip']),
      plateNumber: truck['plateNumber']?.toString(),
      truckStatus: truck['status']?.toString(),
    );
  }
}

/// Wraps the truck-availability marketplace endpoints.
class MarketplaceRepository {
  MarketplaceRepository(this._client);

  final ApiClient _client;
  Dio get _dio => _client.dio;

  List<T> _listOf<T>(dynamic data, T Function(Map<String, dynamic>) from) {
    final list = data is List ? data : (data is Map ? (data['data'] as List? ?? const []) : const []);
    return list
        .whereType<Map>()
        .map((e) => from(Map<String, dynamic>.from(e)))
        .toList();
  }

  /// `GET /marketplace/trucks` — customer-facing list of available trucks.
  Future<List<TruckListing>> listAvailable({String? city}) async {
    try {
      final qp = <String, dynamic>{};
      if (city != null && city.isNotEmpty) qp['city'] = city;
      final res = await _dio.get<dynamic>('/marketplace/trucks', queryParameters: qp);
      _ensureOk(res);
      return _listOf(res.data, TruckListing.fromJson);
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }

  /// `GET /fleet/availability` — the carrier's own active listings.
  Future<List<MyAvailability>> mine() async {
    try {
      final res = await _dio.get<dynamic>('/fleet/availability');
      _ensureOk(res);
      return _listOf(res.data, MyAvailability.fromJson);
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }

  /// `POST /fleet/trucks/:id/availability` — publish a truck to the marketplace.
  Future<void> publish(
    String truckId, {
    required String originCity,
    required String originRegion,
    String? destCity,
    String? destRegion,
    num? pricePerTrip,
    String? notes,
  }) async {
    try {
      final body = <String, dynamic>{
        'originCity': originCity,
        'originRegion': originRegion,
      };
      if (destCity != null && destCity.isNotEmpty) {
        body['destCity'] = destCity;
        if (destRegion != null && destRegion.isNotEmpty) body['destRegion'] = destRegion;
      }
      if (pricePerTrip != null) body['pricePerTrip'] = pricePerTrip;
      if (notes != null && notes.trim().isNotEmpty) body['notes'] = notes.trim();
      final res = await _dio.post('/fleet/trucks/$truckId/availability', data: body);
      _ensureOk(res);
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }

  /// `DELETE /fleet/trucks/:id/availability` — unpublish a truck.
  Future<void> unpublish(String truckId) async {
    try {
      final res = await _dio.delete('/fleet/trucks/$truckId/availability');
      _ensureOk(res);
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

final marketplaceRepositoryProvider = Provider<MarketplaceRepository>((ref) {
  return MarketplaceRepository(ref.watch(apiClientProvider));
});

/// The customer marketplace of available trucks. Optional [city] filters by
/// origin; `null`/empty lists everything.
final marketplaceTrucksProvider =
    FutureProvider.family<List<TruckListing>, String?>((ref, city) {
  return ref.watch(marketplaceRepositoryProvider).listAvailable(city: city);
});

/// The carrier's own published availability (for the fleet screen).
final myAvailabilityProvider = FutureProvider<List<MyAvailability>>((ref) {
  return ref.watch(marketplaceRepositoryProvider).mine();
});
