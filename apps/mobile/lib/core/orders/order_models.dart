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

/// The contracted carrier on an order (for the party card + contact reveal).
class CarrierParty {
  CarrierParty({required this.nameAr, this.phone, this.city, this.region});
  final String nameAr;
  final String? phone;
  final String? city;
  final String? region;

  factory CarrierParty.fromJson(Map<String, dynamic> j) => CarrierParty(
        nameAr: (j['nameAr'] ?? 'المزوّد').toString(),
        phone: j['contactPhone']?.toString(),
        city: j['city']?.toString(),
        region: j['region']?.toString(),
      );
}

/// One tracking event (`GET /orders/:id/tracking`, newest first).
class TrackingEventModel {
  TrackingEventModel({
    required this.status,
    required this.description,
    this.city,
    this.lat,
    this.lng,
    this.createdAt,
  });
  final String status;
  final String description;
  final String? city;
  final num? lat;
  final num? lng;
  final DateTime? createdAt;

  factory TrackingEventModel.fromJson(Map<String, dynamic> j) =>
      TrackingEventModel(
        status: (j['status'] ?? '').toString(),
        description: (j['description'] ?? '').toString(),
        city: j['city']?.toString(),
        lat: _num(j['lat']),
        lng: _num(j['lng']),
        createdAt: _date(j['createdAt']),
      );
}

/// Full order detail (`GET /orders/:id`) — scalars + carrier + tracking + price.
class OrderDetail {
  OrderDetail({
    required this.id,
    required this.orderNumber,
    required this.status,
    required this.orderType,
    this.truckCount,
    required this.originCity,
    required this.originRegion,
    required this.originAddress,
    required this.destinationCity,
    required this.destinationRegion,
    required this.destinationAddress,
    this.cargoType,
    this.cargoDescription,
    this.requiredTruckType,
    this.weight,
    this.pallets,
    this.pickupDate,
    this.deliveryDate,
    this.actualPickupAt,
    this.actualDeliveryAt,
    this.specialInstructions,
    this.bidsCount = 0,
    this.carrier,
    this.clientBudget,
    this.agreedPrice,
    this.carrierAmount,
    this.serviceVatAmount,
    this.commissionAmount,
    this.commissionVatAmount,
    this.clientTotalDue,
    this.tracking = const [],
  });

  final String id;
  final String orderNumber;
  final String status;
  final String orderType;
  final int? truckCount;
  final String originCity;
  final String originRegion;
  final String originAddress;
  final String destinationCity;
  final String destinationRegion;
  final String destinationAddress;
  final String? cargoType;
  final String? cargoDescription;
  final String? requiredTruckType;
  final num? weight;
  final int? pallets;
  final DateTime? pickupDate;
  final DateTime? deliveryDate;
  final DateTime? actualPickupAt;
  final DateTime? actualDeliveryAt;
  final String? specialInstructions;
  final int bidsCount;
  final CarrierParty? carrier;
  final num? clientBudget;
  final num? agreedPrice;
  final num? carrierAmount;
  final num? serviceVatAmount;
  final num? commissionAmount;
  final num? commissionVatAmount;
  final num? clientTotalDue;
  final List<TrackingEventModel> tracking;

  NqStatus get nqStatus => nqStatusFromApi(status);
  String get route => '$originCity ← $destinationCity';
  bool get isConsolidated => orderType.toUpperCase() == 'CONSOLIDATED';
  bool get hasCarrier => carrier != null;

  factory OrderDetail.fromJson(Map<String, dynamic> j) {
    final carrier = j['carrier'];
    final count = j['_count'];
    final bids = j['bids'];
    final te = j['trackingEvents'];
    final bidsCount = (count is Map ? _num(count['bids'])?.toInt() : null) ??
        (bids is List ? bids.length : 0);
    return OrderDetail(
      id: j['id'].toString(),
      orderNumber: (j['orderNumber'] ?? j['id']).toString(),
      status: (j['status'] ?? 'PUBLISHED').toString(),
      orderType: (j['orderType'] ?? 'SINGLE').toString(),
      truckCount: _num(j['truckCount'])?.toInt(),
      originCity: (j['originCity'] ?? '—').toString(),
      originRegion: (j['originRegion'] ?? '').toString(),
      originAddress: (j['originAddress'] ?? '').toString(),
      destinationCity: (j['destinationCity'] ?? '—').toString(),
      destinationRegion: (j['destinationRegion'] ?? '').toString(),
      destinationAddress: (j['destinationAddress'] ?? '').toString(),
      cargoType: j['cargoType']?.toString(),
      cargoDescription: j['cargoDescription']?.toString(),
      requiredTruckType: j['requiredTruckType']?.toString(),
      weight: _num(j['weight']),
      pallets: _num(j['pallets'])?.toInt(),
      pickupDate: _date(j['pickupDate']),
      deliveryDate: _date(j['deliveryDate']),
      actualPickupAt: _date(j['actualPickupAt']),
      actualDeliveryAt: _date(j['actualDeliveryAt']),
      specialInstructions: j['specialInstructions']?.toString(),
      bidsCount: bidsCount,
      carrier: carrier is Map
          ? CarrierParty.fromJson(Map<String, dynamic>.from(carrier))
          : null,
      clientBudget: _num(j['clientBudget']),
      agreedPrice: _num(j['agreedPrice']),
      carrierAmount: _num(j['carrierAmount']),
      serviceVatAmount: _num(j['serviceVatAmount']),
      commissionAmount: _num(j['commissionAmount']),
      commissionVatAmount: _num(j['commissionVatAmount']),
      clientTotalDue: _num(j['clientTotalDue']),
      tracking: te is List
          ? te
              .whereType<Map>()
              .map((e) => TrackingEventModel.fromJson(Map<String, dynamic>.from(e)))
              .toList()
          : const [],
    );
  }
}

String _two(int n) => n.toString().padLeft(2, '0');

/// Formats a DateTime as "d/M/yyyy · HH:mm" inside an LTR run.
String fmtDateTime(DateTime? d) {
  if (d == null) return '—';
  return '${d.day}/${d.month}/${d.year} · ${_two(d.hour)}:${_two(d.minute)}';
}

/// Formats a DateTime as "HH:mm".
String fmtTime(DateTime? d) => d == null ? '—' : '${_two(d.hour)}:${_two(d.minute)}';

String fmtDate(DateTime? d) {
  if (d == null) return '—';
  return '${d.day}/${d.month}/${d.year}';
}

/// "منذ س دقيقة/ساعة/يوم" relative label for a tracking timestamp.
String relativeArabic(DateTime? d) {
  if (d == null) return '';
  final diff = DateTime.now().difference(d);
  if (diff.inMinutes < 1) return 'الآن';
  if (diff.inMinutes < 60) return 'قبل ${diff.inMinutes} د';
  if (diff.inHours < 24) return 'قبل ${diff.inHours} س';
  return 'قبل ${diff.inDays} يوم';
}

/// A bid/offer on an order (`GET /orders/:id/bids`, cheapest first).
class BidModel {
  BidModel({
    required this.id,
    required this.carrierId,
    required this.carrierName,
    required this.amount,
    required this.status,
    this.proposedPickupDate,
    this.proposedDeliveryDate,
    this.notes,
  });

  final String id;
  final String carrierId;
  final String carrierName;
  final num? amount;
  final String status; // PENDING / ACCEPTED / REJECTED / WITHDRAWN / EXPIRED
  final DateTime? proposedPickupDate;
  final DateTime? proposedDeliveryDate;
  final String? notes;

  bool get isPending => status.toUpperCase() == 'PENDING';
  bool get isAccepted => status.toUpperCase() == 'ACCEPTED';

  factory BidModel.fromJson(Map<String, dynamic> j) {
    final carrier = j['carrier'];
    return BidModel(
      id: j['id'].toString(),
      carrierId: (j['carrierId'] ?? (carrier is Map ? carrier['id'] : '')).toString(),
      carrierName:
          carrier is Map ? (carrier['nameAr']?.toString() ?? 'مزوّد') : 'مزوّد',
      amount: _num(j['amount']),
      status: (j['status'] ?? 'PENDING').toString(),
      proposedPickupDate: _date(j['proposedPickupDate']),
      proposedDeliveryDate: _date(j['proposedDeliveryDate']),
      notes: j['notes']?.toString(),
    );
  }
}
