import '../../design_system/status_chip.dart';

/// Maps the API's `OrderStatus` string to the design-system [NqStatus].
NqStatus nqStatusFromApi(String? s) {
  switch ((s ?? '').toUpperCase()) {
    case 'DRAFT':
      return NqStatus.draft;
    case 'PUBLISHED':
      return NqStatus.published;
    case 'BIDDING':
      return NqStatus.tender;
    case 'ASSIGNED':
      return NqStatus.assigned;
    case 'CONFIRMED':
      return NqStatus.confirmed;
    case 'IN_TRANSIT':
      return NqStatus.inTransit;
    case 'DELIVERED':
      return NqStatus.delivered;
    case 'COMPLETED':
      return NqStatus.completed;
    case 'CANCELLED':
      return NqStatus.cancelled;
    case 'DISPUTED':
      return NqStatus.disputed;
    default:
      return NqStatus.published;
  }
}

/// Which "my shipments" segment a status belongs to (handoff 4g).
enum ShipmentBucket { active, drafts, completed }

ShipmentBucket bucketFor(String? status) {
  switch ((status ?? '').toUpperCase()) {
    case 'DRAFT':
      return ShipmentBucket.drafts;
    case 'COMPLETED':
    case 'CANCELLED':
      return ShipmentBucket.completed;
    default:
      return ShipmentBucket.active;
  }
}

const _cargoLabels = <String, String>{
  'GENERAL': 'بضائع عامة',
  'FOOD': 'مواد غذائية',
  'CHEMICALS': 'مواد كيميائية',
  'ELECTRONICS': 'إلكترونيات',
  'FURNITURE': 'أثاث',
  'CONSTRUCTION': 'مواد بناء',
  'AUTOMOTIVE': 'قطع ومركبات',
  'MEDICAL': 'مستلزمات طبية',
  'HAZARDOUS': 'مواد خطرة',
  'FRAGILE': 'بضائع قابلة للكسر',
};

const _truckLabels = <String, String>{
  'SMALL_FLATBED': 'سطحة صغيرة',
  'MEDIUM_FLATBED': 'سطحة متوسطة',
  'LARGE_FLATBED': 'سطحة كبيرة',
  'REFRIGERATED': 'مبرّدة',
  'CONTAINER_20': 'حاوية 20 قدم',
  'CONTAINER_40': 'حاوية 40 قدم',
  'TANKER': 'صهريج',
  'CURTAINSIDER': 'ستائرية',
  'BOX_TRUCK': 'صندوقية',
  'LOWBED': 'لوبد',
};

String cargoLabel(String? v) => _cargoLabels[(v ?? '').toUpperCase()] ?? 'بضائع';
String truckLabel(String? v) => _truckLabels[(v ?? '').toUpperCase()] ?? 'شاحنة';

num? _num(dynamic v) {
  if (v == null) return null;
  if (v is num) return v;
  return num.tryParse(v.toString());
}

DateTime? _date(dynamic v) {
  if (v == null) return null;
  return DateTime.tryParse(v.toString());
}

/// A customer's order as returned by `GET /orders` (list row). The detail
/// endpoint returns the same scalars plus full relations.
class OrderSummary {
  OrderSummary({
    required this.id,
    required this.orderNumber,
    required this.status,
    required this.originCity,
    required this.destinationCity,
    this.cargoType,
    this.requiredTruckType,
    this.weight,
    this.pickupDate,
    this.clientBudget,
    this.agreedPrice,
    this.bidsCount = 0,
    this.carrierName,
    this.orderType = 'SINGLE',
    this.truckCount,
  });

  final String id;
  final String orderNumber;
  final String status; // raw API status
  final String originCity;
  final String destinationCity;
  final String? cargoType;
  final String? requiredTruckType;
  final num? weight;
  final DateTime? pickupDate;
  final num? clientBudget;
  final num? agreedPrice;
  final int bidsCount;
  final String? carrierName;
  final String orderType;
  final int? truckCount;

  NqStatus get nqStatus => nqStatusFromApi(status);
  ShipmentBucket get bucket => bucketFor(status);
  String get route => '$originCity ← $destinationCity';
  bool get isConsolidated => orderType.toUpperCase() == 'CONSOLIDATED';

  factory OrderSummary.fromJson(Map<String, dynamic> j) {
    final carrier = j['carrier'];
    final count = j['_count'];
    return OrderSummary(
      id: j['id'].toString(),
      orderNumber: (j['orderNumber'] ?? j['id']).toString(),
      status: (j['status'] ?? 'PUBLISHED').toString(),
      originCity: (j['originCity'] ?? '—').toString(),
      destinationCity: (j['destinationCity'] ?? '—').toString(),
      cargoType: j['cargoType']?.toString(),
      requiredTruckType: j['requiredTruckType']?.toString(),
      weight: _num(j['weight']),
      pickupDate: _date(j['pickupDate']),
      clientBudget: _num(j['clientBudget']),
      agreedPrice: _num(j['agreedPrice']),
      bidsCount: (count is Map ? _num(count['bids'])?.toInt() : null) ?? 0,
      carrierName: carrier is Map ? carrier['nameAr']?.toString() : null,
      orderType: (j['orderType'] ?? 'SINGLE').toString(),
      truckCount: _num(j['truckCount'])?.toInt(),
    );
  }
}
