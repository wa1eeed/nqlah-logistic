import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'orders_repository.dart';

/// (apiValue, arabicLabel) option, for chip/segment pickers.
typedef Opt = ({String value, String label});

const List<Opt> cargoOptions = [
  (value: 'GENERAL', label: 'بضائع عامة'),
  (value: 'FOOD', label: 'مواد غذائية'),
  (value: 'CONSTRUCTION', label: 'مواد بناء'),
  (value: 'ELECTRONICS', label: 'إلكترونيات'),
  (value: 'FURNITURE', label: 'أثاث'),
  (value: 'CHEMICALS', label: 'مواد كيميائية'),
  (value: 'AUTOMOTIVE', label: 'قطع ومركبات'),
  (value: 'MEDICAL', label: 'مستلزمات طبية'),
  (value: 'FRAGILE', label: 'قابلة للكسر'),
  (value: 'HAZARDOUS', label: 'مواد خطرة'),
];

const List<Opt> truckOptions = [
  (value: 'LARGE_FLATBED', label: 'تريلا سطحة'),
  (value: 'MEDIUM_FLATBED', label: 'سطحة متوسطة'),
  (value: 'SMALL_FLATBED', label: 'سطحة صغيرة'),
  (value: 'CURTAINSIDER', label: 'ستائرية'),
  (value: 'BOX_TRUCK', label: 'صندوقية'),
  (value: 'REFRIGERATED', label: 'مبرّدة'),
  (value: 'CONTAINER_20', label: 'حاوية 20'),
  (value: 'CONTAINER_40', label: 'حاوية 40'),
  (value: 'TANKER', label: 'صهريج'),
  (value: 'LOWBED', label: 'لوبد'),
];

const List<String> saudiRegions = [
  'الرياض', 'مكة المكرمة', 'المدينة المنورة', 'القصيم', 'الشرقية', 'عسير',
  'تبوك', 'حائل', 'الحدود الشمالية', 'جازان', 'نجران', 'الباحة', 'الجوف',
];

/// City → region lookup for the common cities (region is a free string on the
/// API, so an unknown city falls back to using the city as its region).
const Map<String, String> _cityRegion = {
  'الرياض': 'الرياض', 'الخرج': 'الرياض', 'الدوادمي': 'الرياض',
  'جدة': 'مكة المكرمة', 'مكة المكرمة': 'مكة المكرمة', 'الطائف': 'مكة المكرمة',
  'المدينة المنورة': 'المدينة المنورة', 'ينبع': 'المدينة المنورة',
  'بريدة': 'القصيم', 'عنيزة': 'القصيم',
  'الدمام': 'الشرقية', 'الخبر': 'الشرقية', 'الظهران': 'الشرقية',
  'الأحساء': 'الشرقية', 'الجبيل': 'الشرقية', 'القطيف': 'الشرقية',
  'حفر الباطن': 'الشرقية',
  'أبها': 'عسير', 'خميس مشيط': 'عسير',
  'تبوك': 'تبوك', 'حائل': 'حائل', 'عرعر': 'الحدود الشمالية',
  'جازان': 'جازان', 'نجران': 'نجران', 'الباحة': 'الباحة', 'سكاكا': 'الجوف',
};

List<String> get saudiCities => _cityRegion.keys.toList();

String regionForCity(String city) => _cityRegion[city] ?? city;

const List<Opt> pickupWindowOptions = [
  (value: 'MORNING', label: 'صباحًا'),
  (value: 'ALL_DAY', label: 'ظهرًا'),
  (value: 'EVENING', label: 'مساءً'),
  (value: 'ALL_DAY', label: 'مرن'),
];

/// Accumulates the create-order wizard's input and builds the `POST /orders`
/// body for a **single** order (handoff 1b/4a–4e; consolidated is a follow-up).
@immutable
class OrderDraft {
  const OrderDraft({
    this.single = true,
    this.cargoType = 'GENERAL',
    this.cargoDescription = '',
    this.weight,
    this.requiredTruckType = 'LARGE_FLATBED',
    this.originCity = 'الدمام',
    this.originAddress = '',
    this.destinationCity = 'الرياض',
    this.destinationAddress = '',
    this.pickupDate,
    this.pickupWindow = 'ALL_DAY',
    this.fixedPrice = true,
    this.openMarket = true,
    this.clientBudget,
    this.collectionMethod = 'ESCROW',
    this.consigneeName = '',
    this.consigneePhone = '',
    this.notes = '',
    this.targetCarrierId,
    this.targetCarrierName,
  });

  final bool single; // false = consolidated (visual only, not submitted yet)
  final String cargoType;
  final String cargoDescription;
  final num? weight;
  final String requiredTruckType;
  final String originCity;
  final String originAddress;
  final String destinationCity;
  final String destinationAddress;
  final DateTime? pickupDate;
  final String pickupWindow;
  final bool fixedPrice; // true = سعر ثابت, false = مناقصة
  final bool openMarket; // true = السوق المفتوح (OPEN), false = محدّدون
  final num? clientBudget;
  final String collectionMethod;
  final String consigneeName;
  final String consigneePhone;
  final String notes;

  /// When set, the order is addressed to one specific carrier company
  /// (`mode=DIRECT`) — used by the "اطلب من هذا المزوّد" flow from a truck
  /// listing. [targetCarrierName] is for display only.
  final String? targetCarrierId;
  final String? targetCarrierName;

  bool get isDirectTargeted => (targetCarrierId ?? '').isNotEmpty;

  String get originRegion => regionForCity(originCity);
  String get destinationRegion => regionForCity(destinationCity);

  /// Required fields present for a single-order POST.
  bool get isValid =>
      single &&
      cargoDescription.trim().isNotEmpty &&
      (weight ?? 0) >= 1 &&
      originAddress.trim().isNotEmpty &&
      destinationAddress.trim().isNotEmpty &&
      pickupDate != null;

  OrderDraft copyWith({
    bool? single,
    String? cargoType,
    String? cargoDescription,
    num? weight,
    String? requiredTruckType,
    String? originCity,
    String? originAddress,
    String? destinationCity,
    String? destinationAddress,
    DateTime? pickupDate,
    String? pickupWindow,
    bool? fixedPrice,
    bool? openMarket,
    num? clientBudget,
    String? collectionMethod,
    String? consigneeName,
    String? consigneePhone,
    String? notes,
    String? targetCarrierId,
    String? targetCarrierName,
  }) {
    return OrderDraft(
      single: single ?? this.single,
      cargoType: cargoType ?? this.cargoType,
      cargoDescription: cargoDescription ?? this.cargoDescription,
      weight: weight ?? this.weight,
      requiredTruckType: requiredTruckType ?? this.requiredTruckType,
      originCity: originCity ?? this.originCity,
      originAddress: originAddress ?? this.originAddress,
      destinationCity: destinationCity ?? this.destinationCity,
      destinationAddress: destinationAddress ?? this.destinationAddress,
      pickupDate: pickupDate ?? this.pickupDate,
      pickupWindow: pickupWindow ?? this.pickupWindow,
      fixedPrice: fixedPrice ?? this.fixedPrice,
      openMarket: openMarket ?? this.openMarket,
      clientBudget: clientBudget ?? this.clientBudget,
      collectionMethod: collectionMethod ?? this.collectionMethod,
      consigneeName: consigneeName ?? this.consigneeName,
      consigneePhone: consigneePhone ?? this.consigneePhone,
      notes: notes ?? this.notes,
      targetCarrierId: targetCarrierId ?? this.targetCarrierId,
      targetCarrierName: targetCarrierName ?? this.targetCarrierName,
    );
  }

  Map<String, dynamic> toCreateBody() {
    final body = <String, dynamic>{
      'cargoType': cargoType,
      'cargoDescription': cargoDescription.trim(),
      'weight': weight,
      'requiredTruckType': requiredTruckType,
      'mode': (openMarket && !isDirectTargeted) ? 'OPEN' : 'DIRECT',
      'originCity': originCity,
      'originRegion': originRegion,
      'originAddress': originAddress.trim(),
      'destinationCity': destinationCity,
      'destinationRegion': destinationRegion,
      'destinationAddress': destinationAddress.trim(),
      'pickupDate': pickupDate!.toUtc().toIso8601String(),
      'pickupWindow': pickupWindow,
      'collectionMethod': collectionMethod,
      'orderType': 'SINGLE',
    };
    // Pricing: «سعر ثابت» sends `agreedPriceUpfront` (the backend treats this as
    // a FIXED price — carriers accept it, or a DIRECT order auto-assigns);
    // «مناقصة» sends `clientBudget` as a budget hint so carriers bid.
    if (clientBudget != null) {
      body[fixedPrice ? 'agreedPriceUpfront' : 'clientBudget'] = clientBudget;
    }
    if (isDirectTargeted) body['targetCarrierId'] = targetCarrierId;
    if (notes.trim().isNotEmpty) body['notes'] = notes.trim();
    final cn = consigneeName.trim();
    final cp = consigneePhone.trim();
    if (cn.isNotEmpty || cp.isNotEmpty) {
      body['stops'] = [
        {
          'type': 'PICKUP',
          'city': originCity,
          'region': originRegion,
          'address': originAddress.trim(),
        },
        {
          'type': 'DELIVERY',
          'city': destinationCity,
          'region': destinationRegion,
          'address': destinationAddress.trim(),
          if (cn.isNotEmpty) 'contactName': cn,
          if (cp.isNotEmpty) 'contactPhone': cp,
        },
      ];
    }
    return body;
  }
}

class OrderDraftController extends Notifier<OrderDraft> {
  @override
  OrderDraft build() => const OrderDraft();

  void patch(OrderDraft Function(OrderDraft d) update) => state = update(state);

  void reset() => state = const OrderDraft();

  /// Starts a fresh draft addressed to one specific carrier (the "اطلب من هذا
  /// المزوّد" flow from a truck listing). Prefills the route and truck type and
  /// pins the order to [targetCarrierId] as a DIRECT order.
  void startDirect({
    required String targetCarrierId,
    String? targetCarrierName,
    String? originCity,
    String? destinationCity,
    String? requiredTruckType,
  }) {
    state = OrderDraft(
      openMarket: false,
      targetCarrierId: targetCarrierId,
      targetCarrierName: targetCarrierName,
      originCity: originCity ?? const OrderDraft().originCity,
      destinationCity: destinationCity ?? const OrderDraft().destinationCity,
      requiredTruckType: requiredTruckType ?? const OrderDraft().requiredTruckType,
    );
  }

  /// `POST /orders` (DRAFT) then `POST /orders/:id/publish`. Returns the
  /// published order's id. Throws [ApiException] on failure.
  Future<String> submitAndPublish() async {
    final repo = ref.read(ordersRepositoryProvider);
    final created = await repo.create(state.toCreateBody());
    final id = created['id']?.toString();
    if (id == null) {
      throw StateError('create returned no id');
    }
    await repo.publish(id);
    return id;
  }
}

final orderDraftProvider =
    NotifierProvider<OrderDraftController, OrderDraft>(OrderDraftController.new);
