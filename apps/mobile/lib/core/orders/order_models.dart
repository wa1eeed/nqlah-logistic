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
    this.priceMode = 'BIDDING',
    this.collectionMethod = 'ESCROW',
    this.clientName,
    this.createdAt,
    this.bids = const [],
    this.mode = 'OPEN',
    this.targetCarrierId,
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
  final String priceMode; // FIXED or BIDDING
  final String collectionMethod;
  final String? clientName;
  final DateTime? createdAt;
  final List<BidRef> bids; // lean bid refs (carrierId/status/amount)
  final String mode; // OPEN or DIRECT
  final String? targetCarrierId; // DIRECT: the pinned carrier company

  NqStatus get nqStatus => nqStatusFromApi(status);

  /// The status to show the customer: a DIRECT order still waiting on its
  /// pinned provider reads «بانتظار رد المزوّد» instead of the generic «منشور».
  NqStatus get displayStatus =>
      isAwaitingProvider ? NqStatus.awaitingProvider : nqStatus;

  ShipmentBucket get bucket => bucketFor(status);
  String get route => '$originCity ← $destinationCity';
  bool get isConsolidated => orderType.toUpperCase() == 'CONSOLIDATED';
  bool get isFixedPrice => priceMode.toUpperCase() == 'FIXED';
  bool get isDirect => mode.toUpperCase() == 'DIRECT';

  /// A DIRECT order still awaiting the pinned provider's response (not yet
  /// assigned) — drives the «بانتظار رد المزوّد» status on the customer side.
  bool get isAwaitingProvider =>
      isDirect &&
      (targetCarrierId ?? '').isNotEmpty &&
      (status.toUpperCase() == 'PUBLISHED' || status.toUpperCase() == 'BIDDING');

  /// True when this DIRECT order is pinned to [companyId] (the carrier viewing
  /// its marketplace) and still awaiting a response.
  bool isDirectTo(String? companyId) =>
      isDirect && companyId != null && targetCarrierId == companyId;

  /// The current carrier's own bid on this order, if any.
  BidRef? myBid(String? companyId) {
    if (companyId == null) return null;
    for (final b in bids) {
      if (b.carrierId == companyId) return b;
    }
    return null;
  }

  factory OrderSummary.fromJson(Map<String, dynamic> j) {
    final carrier = j['carrier'];
    final client = j['client'];
    final count = j['_count'];
    final rawBids = j['bids'];
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
      priceMode: (j['priceMode'] ?? 'BIDDING').toString(),
      collectionMethod: (j['collectionMethod'] ?? 'ESCROW').toString(),
      clientName: client is Map ? client['nameAr']?.toString() : null,
      createdAt: _date(j['createdAt']),
      mode: (j['mode'] ?? 'OPEN').toString(),
      targetCarrierId: j['targetCarrierId']?.toString(),
      bids: rawBids is List
          ? rawBids
              .whereType<Map>()
              .map((e) => BidRef.fromJson(Map<String, dynamic>.from(e)))
              .toList()
          : const [],
    );
  }
}

/// A lean bid reference from the orders list (`bids` subset).
class BidRef {
  BidRef({required this.id, required this.carrierId, required this.status, this.amount});
  final String id;
  final String carrierId;
  final String status;
  final num? amount;
  bool get isPending => status.toUpperCase() == 'PENDING';

  factory BidRef.fromJson(Map<String, dynamic> j) => BidRef(
        id: (j['id'] ?? '').toString(),
        carrierId: (j['carrierId'] ?? '').toString(),
        status: (j['status'] ?? 'PENDING').toString(),
        amount: _num(j['amount']),
      );
}

/// The contracted carrier on an order (for the party card + contact reveal).
class CarrierParty {
  CarrierParty({
    required this.nameAr,
    this.phone,
    this.city,
    this.region,
    this.codPayoutMethod = 'CASH',
    this.iban,
    this.bankName,
    this.bankAccountName,
  });
  final String nameAr;
  final String? phone;
  final String? city;
  final String? region;
  // COD collection: CASH (pay driver) or BANK_TRANSFER (to the carrier's IBAN).
  final String codPayoutMethod;
  final String? iban;
  final String? bankName;
  final String? bankAccountName;

  factory CarrierParty.fromJson(Map<String, dynamic> j) => CarrierParty(
        nameAr: (j['nameAr'] ?? 'المزوّد').toString(),
        phone: j['contactPhone']?.toString(),
        city: j['city']?.toString(),
        region: j['region']?.toString(),
        codPayoutMethod: (j['codPayoutMethod'] ?? 'CASH').toString(),
        iban: j['iban']?.toString(),
        bankName: j['bankName']?.toString(),
        bankAccountName: j['bankAccountName']?.toString(),
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
    this.client,
    this.driverName,
    this.driverPhone,
    this.clientBudget,
    this.agreedPrice,
    this.carrierAmount,
    this.serviceVatAmount,
    this.commissionAmount,
    this.commissionVatAmount,
    this.clientTotalDue,
    this.collectionMethod = 'ESCROW',
    this.dueOnDelivery,
    this.codProofUrl,
    this.tracking = const [],
    this.mode = 'OPEN',
    this.targetCarrierId,
    this.originLat,
    this.originLng,
    this.destinationLat,
    this.destinationLng,
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
  final CarrierParty? client; // the customer who posted (for the provider view)
  final String? driverName;
  final String? driverPhone;
  final num? clientBudget;
  final num? agreedPrice;
  final num? carrierAmount;
  final num? serviceVatAmount;
  final num? commissionAmount;
  final num? commissionVatAmount;
  final num? clientTotalDue;
  final String collectionMethod; // ESCROW | PREPAID_WALLET | PREPAID_GATEWAY | COD
  final num? dueOnDelivery; // amount to collect on delivery (COD)
  final String? codProofUrl; // client's attached bank-transfer proof (COD)
  bool get isCod => collectionMethod.toUpperCase() == 'COD';
  final List<TrackingEventModel> tracking;
  final String mode; // OPEN or DIRECT
  final String? targetCarrierId;
  final double? originLat;
  final double? originLng;
  final double? destinationLat;
  final double? destinationLng;

  bool get hasRouteCoords =>
      originLat != null && originLng != null && destinationLat != null && destinationLng != null;

  NqStatus get nqStatus => nqStatusFromApi(status);

  /// A DIRECT order still awaiting its pinned provider shows «بانتظار رد المزوّد».
  bool get isAwaitingProvider =>
      mode.toUpperCase() == 'DIRECT' &&
      (targetCarrierId ?? '').isNotEmpty &&
      (status.toUpperCase() == 'PUBLISHED' || status.toUpperCase() == 'BIDDING');
  NqStatus get displayStatus =>
      isAwaitingProvider ? NqStatus.awaitingProvider : nqStatus;

  String get route => '$originCity ← $destinationCity';
  bool get isConsolidated => orderType.toUpperCase() == 'CONSOLIDATED';
  bool get hasCarrier => carrier != null;

  factory OrderDetail.fromJson(Map<String, dynamic> j) {
    final carrier = j['carrier'];
    final client = j['client'];
    final count = j['_count'];
    final bids = j['bids'];
    final te = j['trackingEvents'];
    final drivers = j['orderDrivers'];
    final bidsCount = (count is Map ? _num(count['bids'])?.toInt() : null) ??
        (bids is List ? bids.length : 0);
    String? driverName;
    String? driverPhone;
    if (drivers is List && drivers.isNotEmpty) {
      final first = drivers.first;
      final u = first is Map ? first['driver'] : null;
      final user = u is Map ? u['user'] : null;
      if (user is Map) {
        final f = user['firstName']?.toString() ?? '';
        final l = user['lastName']?.toString() ?? '';
        final n = [f, l].where((p) => p.isNotEmpty).join(' ').trim();
        driverName = n.isNotEmpty ? n : null;
        driverPhone = user['phone']?.toString();
      }
    }
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
      client: client is Map
          ? CarrierParty.fromJson(Map<String, dynamic>.from(client))
          : null,
      driverName: driverName,
      driverPhone: driverPhone,
      clientBudget: _num(j['clientBudget']),
      agreedPrice: _num(j['agreedPrice']),
      carrierAmount: _num(j['carrierAmount']),
      serviceVatAmount: _num(j['serviceVatAmount']),
      commissionAmount: _num(j['commissionAmount']),
      commissionVatAmount: _num(j['commissionVatAmount']),
      clientTotalDue: _num(j['clientTotalDue']),
      collectionMethod: (j['collectionMethod'] ?? 'ESCROW').toString(),
      dueOnDelivery: j['payment'] is Map ? _num((j['payment'] as Map)['dueOnDelivery']) : null,
      codProofUrl: j['payment'] is Map ? (j['payment'] as Map)['codProofUrl']?.toString() : null,
      tracking: te is List
          ? te
              .whereType<Map>()
              .map((e) => TrackingEventModel.fromJson(Map<String, dynamic>.from(e)))
              .toList()
          : const [],
      mode: (j['mode'] ?? 'OPEN').toString(),
      targetCarrierId: j['targetCarrierId']?.toString(),
      originLat: _num(j['originLat'])?.toDouble(),
      originLng: _num(j['originLng'])?.toDouble(),
      destinationLat: _num(j['destinationLat'])?.toDouble(),
      destinationLng: _num(j['destinationLng'])?.toDouble(),
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
