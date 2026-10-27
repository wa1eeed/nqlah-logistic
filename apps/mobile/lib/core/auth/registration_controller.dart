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
    this.email = '',
    this.password = '',
    this.companyNameAr = '',
    this.acceptedTerms = false,
    this.isCarrier = true,
    this.isIndividual = false,
    this.crNumber = '',
    this.vatNumber = '',
    this.vatRegistered = true,
    this.region = 'الرياض',
    this.city = 'الرياض',
    this.planId,
  });

  final String firstName;
  final String lastName;
  final String phone; // local Saudi digits (e.g. 5XXXXXXXX)
  final String email;
  final String password;
  final String companyNameAr;
  final bool acceptedTerms; // single consent → terms + privacy + transport

  final bool isCarrier; // true = ناقل (provider), false = عميل (customer)
  final bool isIndividual; // true = فرد, false = منشأة
  final String crNumber;
  final String vatNumber;
  final bool vatRegistered;
  final String region;
  final String city;
  final String? planId;

  String get companyType => isCarrier ? 'CARRIER' : 'CLIENT';
  String get accountType => isIndividual ? 'INDIVIDUAL' : 'COMPANY';

  /// Whether the plan step applies (providers only, per the design flow).
  bool get needsPlanStep => isCarrier;

  RegistrationData copyWith({
    String? firstName,
    String? lastName,
    String? phone,
    String? email,
    String? password,
    String? companyNameAr,
    bool? acceptedTerms,
    bool? isCarrier,
    bool? isIndividual,
    String? crNumber,
    String? vatNumber,
    bool? vatRegistered,
    String? region,
    String? city,
    String? planId,
  }) {
    return RegistrationData(
      firstName: firstName ?? this.firstName,
      lastName: lastName ?? this.lastName,
      phone: phone ?? this.phone,
      email: email ?? this.email,
      password: password ?? this.password,
      companyNameAr: companyNameAr ?? this.companyNameAr,
      acceptedTerms: acceptedTerms ?? this.acceptedTerms,
      isCarrier: isCarrier ?? this.isCarrier,
      isIndividual: isIndividual ?? this.isIndividual,
      crNumber: crNumber ?? this.crNumber,
      vatNumber: vatNumber ?? this.vatNumber,
      vatRegistered: vatRegistered ?? this.vatRegistered,
      region: region ?? this.region,
      city: city ?? this.city,
      planId: planId ?? this.planId,
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
    if (planId != null) body['planId'] = planId;
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
