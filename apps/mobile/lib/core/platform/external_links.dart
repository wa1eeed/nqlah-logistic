import 'package:url_launcher/url_launcher.dart';

/// Thin wrappers around device integrations (maps, phone, WhatsApp, email) so
/// screens don't each hand-roll `launchUrl`. Support-channel values are
/// overridable at build time via `--dart-define` and default to placeholders
/// that must be confirmed before launch.
class ExternalLinks {
  ExternalLinks._();

  /// Support phone (also used for WhatsApp). Saudi unified number format.
  static const String supportPhone = String.fromEnvironment(
    'NQ_SUPPORT_PHONE',
    defaultValue: '+966920000000',
  );

  static const String supportEmail = String.fromEnvironment(
    'NQ_SUPPORT_EMAIL',
    defaultValue: 'support@nqlah.sa',
  );

  /// Opens the native maps app with a search for [query] (an address, a place
  /// name, or "lat,lng"). Uses a geo URL that iOS/Android/web all resolve to
  /// their default maps provider.
  static Future<bool> openMaps(String query) {
    final q = Uri.encodeComponent(query.trim());
    if (q.isEmpty) return Future.value(false);
    return _launch('https://www.google.com/maps/search/?api=1&query=$q');
  }

  /// Opens directions to [lat],[lng] in the native maps app.
  static Future<bool> openDirections(num lat, num lng) => _launch(
      'https://www.google.com/maps/dir/?api=1&destination=$lat,$lng');

  /// Opens a WhatsApp chat with support (falls back to a dial intent).
  static Future<bool> contactSupportWhatsApp() async {
    final digits = supportPhone.replaceAll(RegExp(r'[^0-9]'), '');
    if (await _launch('https://wa.me/$digits')) return true;
    return dial(supportPhone);
  }

  static Future<bool> dial(String phone) =>
      _launch('tel:${phone.replaceAll(' ', '')}');

  static Future<bool> emailSupport({String? subject}) {
    final q = subject == null ? '' : '?subject=${Uri.encodeComponent(subject)}';
    return _launch('mailto:$supportEmail$q');
  }

  static Future<bool> _launch(String url) async {
    final uri = Uri.parse(url);
    if (!await canLaunchUrl(uri)) return false;
    return launchUrl(uri, mode: LaunchMode.externalApplication);
  }
}
