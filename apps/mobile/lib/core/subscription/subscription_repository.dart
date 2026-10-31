import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/api_client.dart';
import '../api/api_exception.dart';

num? _num(dynamic v) => v is num ? v : (v is String ? num.tryParse(v) : null);

/// A plan module (an add-on capability bundled in a plan).
class PlanModule {
  PlanModule({required this.key, required this.name, this.price = 0});
  final String key;
  final String name;
  final num price;
  factory PlanModule.fromJson(Map<String, dynamic> j) => PlanModule(
        key: (j['key'] ?? '').toString(),
        name: (j['name'] ?? '').toString(),
        price: _num(j['price']) ?? 0,
      );
}

/// A subscription plan (tier + price + included truck limit + modules).
class PlanModel {
  PlanModel({
    required this.id,
    required this.name,
    this.nameEn,
    this.tier,
    this.isFree = false,
    this.basePrice = 0,
    this.price = 0,
    this.includedTruckLimit,
    this.modules = const [],
  });
  final String id;
  final String name;
  final String? nameEn;
  final String? tier;
  final bool isFree;
  final num basePrice;
  final num price;
  final int? includedTruckLimit;
  final List<PlanModule> modules;

  factory PlanModel.fromJson(Map<String, dynamic> j) => PlanModel(
        id: j['id'].toString(),
        name: (j['name'] ?? '').toString(),
        nameEn: j['nameEn']?.toString(),
        tier: j['tier']?.toString(),
        isFree: j['isFree'] == true,
        basePrice: _num(j['basePrice']) ?? 0,
        // `price` may be a scalar or an object { monthly, yearly, modulesTotal }.
        price: j['price'] is Map
            ? (_num((j['price'] as Map)['monthly']) ?? 0)
            : (_num(j['price']) ?? _num(j['basePrice']) ?? 0),
        includedTruckLimit: _num(j['includedTruckLimit'])?.toInt(),
        modules: (j['modules'] as List? ?? const [])
            .whereType<Map>()
            .map((e) => PlanModule.fromJson(Map<String, dynamic>.from(e)))
            .toList(),
      );
}

/// The company's current subscription (membership) + its plan.
class SubscriptionModel {
  SubscriptionModel({
    required this.id,
    required this.status,
    required this.billingCycle,
    this.priceSnapshot = 0,
    this.currentPeriodEnd,
    this.cancelAtPeriodEnd = false,
    this.trialEndsAt,
    this.plan,
  });
  final String id;
  final String status; // TRIALING | ACTIVE | PAST_DUE | CANCELLED | EXPIRED
  final String billingCycle; // MONTHLY | YEARLY
  final num priceSnapshot;
  final DateTime? currentPeriodEnd;
  final bool cancelAtPeriodEnd;
  final DateTime? trialEndsAt;
  final PlanModel? plan;

  bool get isActive => status == 'ACTIVE' || status == 'TRIALING';

  factory SubscriptionModel.fromJson(Map<String, dynamic> j) => SubscriptionModel(
        id: (j['id'] ?? '').toString(),
        status: (j['status'] ?? 'ACTIVE').toString(),
        billingCycle: (j['billingCycle'] ?? 'MONTHLY').toString(),
        priceSnapshot: _num(j['priceSnapshot']) ?? 0,
        currentPeriodEnd: DateTime.tryParse((j['currentPeriodEnd'] ?? '').toString()),
        cancelAtPeriodEnd: j['cancelAtPeriodEnd'] == true,
        trialEndsAt: DateTime.tryParse((j['trialEndsAt'] ?? '').toString()),
        plan: j['plan'] is Map
            ? PlanModel.fromJson(Map<String, dynamic>.from(j['plan'] as Map))
            : null,
      );
}

class SubscriptionRepository {
  SubscriptionRepository(this._client);
  final ApiClient _client;
  Dio get _dio => _client.dio;

  /// `GET /policies/subscription/mine` — the company's current subscription,
  /// or null when none exists.
  Future<SubscriptionModel?> mine() async {
    try {
      final res = await _dio.get<dynamic>('/policies/subscription/mine');
      final d = res.data;
      if (d is Map && d.isNotEmpty) {
        return SubscriptionModel.fromJson(Map<String, dynamic>.from(d));
      }
      return null;
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }

  /// `GET /policies/plans/public` — the published plans a provider can pick.
  Future<List<PlanModel>> publicPlans() async {
    try {
      final res = await _dio.get<dynamic>('/policies/plans/public');
      final d = res.data;
      final list = d is Map ? (d['data'] ?? d['items']) : d;
      return (list as List? ?? const [])
          .whereType<Map>()
          .map((e) => PlanModel.fromJson(Map<String, dynamic>.from(e)))
          .toList();
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }

  /// `POST /policies/subscription/subscribe`.
  Future<void> subscribe(String planId, {String billingCycle = 'MONTHLY'}) async {
    try {
      await _dio.post<dynamic>('/policies/subscription/subscribe',
          data: {'planId': planId, 'billingCycle': billingCycle});
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }

  /// `POST /policies/subscription/cancel` (at period end by default).
  Future<void> cancel({bool immediate = false}) async {
    try {
      await _dio.post<dynamic>('/policies/subscription/cancel',
          data: {'immediate': immediate});
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }
}

final subscriptionRepositoryProvider = Provider<SubscriptionRepository>((ref) {
  return SubscriptionRepository(ref.watch(apiClientProvider));
});

/// The signed-in provider's current subscription (null when none).
final mySubscriptionProvider = FutureProvider<SubscriptionModel?>((ref) {
  return ref.watch(subscriptionRepositoryProvider).mine();
});
