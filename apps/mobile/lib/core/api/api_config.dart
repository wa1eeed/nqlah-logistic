/// API endpoint configuration.
///
/// The base URL already includes the NestJS global prefix (`/api`). Override it
/// at build/run time for local development against a dev server, e.g.:
///
/// ```
/// flutter run --dart-define=NQ_API_BASE=http://10.0.2.2:4000/api   # Android emulator
/// flutter run --dart-define=NQ_API_BASE=http://127.0.0.1:4000/api  # iOS sim / web
/// ```
///
/// Defaults to the hosted staging environment.
class ApiConfig {
  ApiConfig._();

  static const String baseUrl = String.fromEnvironment(
    'NQ_API_BASE',
    defaultValue: 'https://nqlah.nx.sa/api',
  );

  static const Duration connectTimeout = Duration(seconds: 20);
  static const Duration receiveTimeout = Duration(seconds: 30);
}
