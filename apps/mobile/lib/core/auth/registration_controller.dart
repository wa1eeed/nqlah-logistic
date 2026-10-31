import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'auth_repository.dart';

/// Accumulates the registration wizard's input across steps and builds the
/// `POST /auth/register` payload. Held in a [NotifierProvider] so every step
/// reads/patches the same draft.
@immutable
class RegistrationData {
  const RegistrationData({
    this.firstName = '',
    this.lastName = '',
    this.phone = '',
    this.countryCode = 'SA',
    this.email = '',
    this.password = '',
    this.companyNameAr = '',
    this.acceptedTerms = false,
    this.isCarrier = true,
    this.isIndividual = false,
    this.crNumber = '',
    this.vatNumber = '',
    this.vatRegistered = true,
    this.country = 'SA',
    this.region = 'الرياض',
    this.city = 'الرياض',
    this.nationality = 'SA',
    this.idType,
    this.planId,
    this.documents = const {},
    this.truckType,
    this.truckPlate = '',
    this.truckCapacity = '',
  });

  final String firstName;
  final String lastName;
  final String phone; // full international number, e.g. +966501234567
  final String countryCode; // ISO-3166 alpha-2 of the phone's country, e.g. SA
  final String email;
  final String password;
  final String companyNameAr;
  final bool acceptedTerms; // single consent → terms + privacy + transport

  final bool isCarrier; // true = ناقل (provider), false = عميل (customer)
  final bool isIndividual; // true = فرد, false = منشأة
  final String crNumber;
  final String vatNumber;
  final bool vatRegistered;
  final String country; // ISO-3166 alpha-2 of the company's location country
  final String region;
  final String city;
  final String nationality; // ISO-3166 alpha-2 (individual operator)
  final String? idType; // NATIONAL_ID | IQAMA | PASSPORT (individual operator)
  final String? planId;
  final Map<String, String> documents;

  // Optional "quick truck" captured during an individual carrier's signup.
  final String? truckType; // Prisma TruckType value, e.g. LARGE_FLATBED
  final String truckPlate;
  final String truckCapacity; // tons, kept as text until submit

  String get companyType => isCarrier ? 'CARRIER' : 'CLIENT';
  String get accountType => isIndividual ? 'INDIVIDUAL' : 'COMPANY';

  /// Whether the plan step applies (providers only, per the design flow).
  bool get needsPlanStep => isCarrier;

  /// Whether the optional quick-truck step applies (individual carriers only).
  bool get needsTruckStep => isCarrier && isIndividual;

  /// A complete, submittable quick-truck entry (all essentials present).
  bool get hasTruck =>
      (truckType != null && truckType!.isNotEmpty) &&
      truckPlate.trim().isNotEmpty &&
      (double.tryParse(truckCapacity.trim()) ?? 0) > 0;

  /// Wizard length (the footer "الخطوة n/N" denominator): credentials + account
  /// type + [plan] + [truck] + documents + OTP.
  int get totalSteps => 4 + (needsPlanStep ? 1 : 0) + (needsTruckStep ? 1 : 0);

  /// 1-based step number of the documents screen (shifts when earlier optional
  /// steps are present).
  int get docsStep => isCarrier ? (needsTruckStep ? 5 : 4) : 3;

  RegistrationData copyWith({
    String? firstName,
    String? lastName,
    String? phone,
    String? countryCode,
    String? email,
    String? password,
    String? companyNameAr,
    bool? acceptedTerms,
    bool? isCarrier,
    bool? isIndividual,
    String? crNumber,
    String? vatNumber,
    bool? vatRegistered,
    String? country,
    String? region,
    String? city,
    String? nationality,
    String? idType,
    String? planId,
    Map<String, String>? documents,
    String? truckType,
    String? truckPlate,
    String? truckCapacity,
  }) {
    return RegistrationData(
      firstName: firstName ?? this.firstName,
      lastName: lastName ?? this.lastName,
      phone: phone ?? this.phone,
      countryCode: countryCode ?? this.countryCode,
      email: email ?? this.email,
      password: password ?? this.password,
      companyNameAr: companyNameAr ?? this.companyNameAr,
      acceptedTerms: acceptedTerms ?? this.acceptedTerms,
      isCarrier: isCarrier ?? this.isCarrier,
      isIndividual: isIndividual ?? this.isIndividual,
      crNumber: crNumber ?? this.crNumber,
      vatNumber: vatNumber ?? this.vatNumber,
      vatRegistered: vatRegistered ?? this.vatRegistered,
      country: country ?? this.country,
      region: region ?? this.region,
      city: city ?? this.city,
      nationality: nationality ?? this.nationality,
      idType: idType ?? this.idType,
      planId: planId ?? this.planId,
      documents: documents ?? this.documents,
      truckType: truckType ?? this.truckType,
      truckPlate: truckPlate ?? this.truckPlate,
      truckCapacity: truckCapacity ?? this.truckCapacity,
    );
  }

  /// The `POST /auth/register` body. Optional fields are omitted when empty.
  Map<String, dynamic> toRegisterBody() {
    final body = <String, dynamic>{
      'phone': phone.trim(),
      'password': password,
      'firstName': firstName.trim(),
      'lastName': lastName.trim(),
      'companyType': companyType,
      'accountType': accountType,
      'companyNameAr': companyNameAr.trim(),
      'vatRegistered': vatRegistered,
      'country': country,
      'city': city,
      'region': region,
      'contactPhone': phone.trim(),
      'acceptedTerms': acceptedTerms,
      'acceptedPrivacy': acceptedTerms,
      'acceptedTransport': acceptedTerms,
    };
    final em = email.trim();
    if (em.isNotEmpty) body['email'] = em;
    if (crNumber.trim().isNotEmpty) body['crNumber'] = crNumber.trim();
    if (vatRegistered && vatNumber.trim().isNotEmpty) {
      body['vatNumber'] = vatNumber.trim();
    }
    // Nationality + id-type seed the individual operator's driver profile.
    if (isIndividual && isCarrier) {
      body['nationality'] = nationality;
      body['idType'] = idType ?? 'NATIONAL_ID';
    }
    if (planId != null) body['planId'] = planId;
    if (documents.isNotEmpty) body['documents'] = documents;
    // Optional quick truck (individual carriers only) — sent only when complete.
    if (needsTruckStep && hasTruck) {
      body['truck'] = {
        'type': truckType,
        'plateNumber': truckPlate.trim(),
        'capacity': double.parse(truckCapacity.trim()),
      };
    }
    return body;
  }
}

class RegistrationController extends Notifier<RegistrationData> {
  @override
  RegistrationData build() => const RegistrationData();

  void patch(RegistrationData Function(RegistrationData d) update) {
    state = update(state);
  }

  /// `POST /auth/register` — creates the account and triggers the phone OTP.
  /// Throws [ApiException] on failure.
  Future<void> submit() async {
    await ref.read(authRepositoryProvider).register(state.toRegisterBody());
  }

  void reset() => state = const RegistrationData();
}

final registrationControllerProvider =
    NotifierProvider<RegistrationController, RegistrationData>(
        RegistrationController.new);
