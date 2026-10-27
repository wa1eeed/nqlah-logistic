import '../session/identity.dart';

/// The authenticated user as returned by the API (`user` field of the token
/// response, and `GET /users/me`).
class AuthUser {
  const AuthUser({
    required this.id,
    required this.role,
    this.phone,
    this.email,
    this.firstName,
    this.lastName,
    this.companyId,
  });

  final String id;
  final String role; // platform UserRole (CLIENT_ADMIN, CARRIER_USER, DRIVER…)
  final String? phone;
  final String? email;
  final String? firstName;
  final String? lastName;
  final String? companyId;

  String get fullName =>
      [firstName, lastName].where((p) => p != null && p.isNotEmpty).join(' ').trim();

  /// Maps the platform [role] onto the app's shell identity (handoff §1).
  /// `CLIENT_*` → customer, `CARRIER_*` → provider, `DRIVER` → employed driver.
  /// Platform admins (`SUPER_ADMIN`/`ADMIN`) use the operations web console, not
  /// this app; they fall back to the customer shell here.
  NqIdentity get identity {
    final r = role.toUpperCase();
    if (r == 'DRIVER') return NqIdentity.employedDriver;
    if (r.startsWith('CARRIER')) return NqIdentity.provider;
    return NqIdentity.customer;
  }

  factory AuthUser.fromJson(Map<String, dynamic> json) => AuthUser(
        id: json['id'] as String,
        role: (json['role'] ?? 'CLIENT_USER').toString(),
        phone: json['phone'] as String?,
        email: json['email'] as String?,
        firstName: json['firstName'] as String?,
        lastName: json['lastName'] as String?,
        companyId: json['companyId'] as String?,
      );
}

/// Result of a successful authentication: tokens + the user.
class AuthSession {
  const AuthSession({
    required this.accessToken,
    required this.refreshToken,
    required this.user,
  });

  final String accessToken;
  final String refreshToken;
  final AuthUser user;

  factory AuthSession.fromJson(Map<String, dynamic> json) => AuthSession(
        accessToken: json['accessToken'] as String,
        refreshToken: json['refreshToken'] as String,
        user: AuthUser.fromJson(Map<String, dynamic>.from(json['user'] as Map)),
      );
}
