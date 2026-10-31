import 'package:flutter/widgets.dart';

/// Supported app languages. Arabic is the default; Urdu (ur) is RTL like
/// Arabic, English is LTR. Add a language by adding its enum value, a
/// `Locale`, its RTL-ness, a display name, and its column in [_catalog].
enum AppLang { ar, en, ur }

extension AppLangX on AppLang {
  Locale get locale => switch (this) {
        AppLang.ar => const Locale('ar', 'SA'),
        AppLang.en => const Locale('en'),
        AppLang.ur => const Locale('ur'),
      };

  /// Arabic and Urdu read right-to-left.
  TextDirection get direction =>
      this == AppLang.en ? TextDirection.ltr : TextDirection.rtl;

  /// The language's own endonym (shown in the picker).
  String get nativeName => switch (this) {
        AppLang.ar => 'العربية',
        AppLang.en => 'English',
        AppLang.ur => 'اردو',
      };

  /// Persistence token / API language code.
  String get code => name;

  static AppLang fromCode(String? code) =>
      AppLang.values.firstWhere((l) => l.name == code, orElse: () => AppLang.ar);
}

/// Translation lookup. `s('nav.home')` returns the string for the active
/// language, falling back to Arabic (then the key itself) when a value is
/// missing — so a partially-translated screen never shows a blank.
class S {
  const S(this.lang);
  final AppLang lang;

  String call(String key) {
    final row = _catalog[key];
    if (row == null) return key;
    return row[lang] ?? row[AppLang.ar] ?? key;
  }
}

/// The string catalog: `key → { lang → text }`. Keep keys namespaced
/// (`nav.*`, `account.*`, `lang.*`, `common.*`). To translate a new screen,
/// add its keys here with ar/en/ur and swap its literals for `s('...')`.
const Map<String, Map<AppLang, String>> _catalog = {
  // ── Bottom navigation ──────────────────────────────────────────────
  'nav.home': {AppLang.ar: 'الرئيسية', AppLang.en: 'Home', AppLang.ur: 'ہوم'},
  'nav.trucks': {AppLang.ar: 'الشاحنات', AppLang.en: 'Trucks', AppLang.ur: 'ٹرک'},
  'nav.myShipments': {AppLang.ar: 'شحناتي', AppLang.en: 'Shipments', AppLang.ur: 'میری شپمنٹس'},
  'nav.offers': {AppLang.ar: 'العروض', AppLang.en: 'Offers', AppLang.ur: 'آفرز'},
  'nav.account': {AppLang.ar: 'حسابي', AppLang.en: 'Account', AppLang.ur: 'اکاؤنٹ'},
  'nav.myTrips': {AppLang.ar: 'رحلاتي', AppLang.en: 'My Trips', AppLang.ur: 'میرے سفر'},
  'nav.messages': {AppLang.ar: 'الرسائل', AppLang.en: 'Messages', AppLang.ur: 'پیغامات'},
  'nav.loads': {AppLang.ar: 'الأحمال', AppLang.en: 'Loads', AppLang.ur: 'لوڈز'},
  'nav.operations': {AppLang.ar: 'عملياتي', AppLang.en: 'Operations', AppLang.ur: 'آپریشنز'},
  'nav.assignments': {AppLang.ar: 'التكليفات', AppLang.en: 'Assignments', AppLang.ur: 'تفویضات'},
  'nav.fleet': {AppLang.ar: 'الأسطول', AppLang.en: 'Fleet', AppLang.ur: 'فلیٹ'},
  'nav.finance': {AppLang.ar: 'المالية', AppLang.en: 'Finance', AppLang.ur: 'مالیات'},
  'nav.notifications': {AppLang.ar: 'الإشعارات', AppLang.en: 'Alerts', AppLang.ur: 'اطلاعات'},

  // ── Account screen ─────────────────────────────────────────────────
  'account.title': {AppLang.ar: 'حسابي', AppLang.en: 'Account', AppLang.ur: 'میرا اکاؤنٹ'},
  'account.membership': {AppLang.ar: 'عضويتي والاشتراك', AppLang.en: 'Membership & subscription', AppLang.ur: 'رکنیت اور سبسکرپشن'},
  'account.maintenance': {AppLang.ar: 'إدارة الصيانة', AppLang.en: 'Maintenance', AppLang.ur: 'مینٹیننس'},
  'account.cod': {AppLang.ar: 'الدفع عند التسليم', AppLang.en: 'Cash on delivery', AppLang.ur: 'ادائیگی بر تسلیم'},
  'account.notifications': {AppLang.ar: 'الإشعارات', AppLang.en: 'Notifications', AppLang.ur: 'اطلاعات'},
  'account.users': {AppLang.ar: 'المستخدمون والصلاحيات', AppLang.en: 'Users & permissions', AppLang.ur: 'صارفین اور اجازتیں'},
  'account.docs': {AppLang.ar: 'مستندات المنشأة', AppLang.en: 'Company documents', AppLang.ur: 'کمپنی دستاویزات'},
  'account.fleet': {AppLang.ar: 'الأسطول', AppLang.en: 'Fleet', AppLang.ur: 'فلیٹ'},
  'account.myTrips': {AppLang.ar: 'رحلاتي', AppLang.en: 'My Trips', AppLang.ur: 'میرے سفر'},
  'account.language': {AppLang.ar: 'اللغة', AppLang.en: 'Language', AppLang.ur: 'زبان'},
  'account.appearance': {AppLang.ar: 'المظهر', AppLang.en: 'Appearance', AppLang.ur: 'ظاہری شکل'},
  'account.appearanceAuto': {AppLang.ar: 'تلقائي', AppLang.en: 'Automatic', AppLang.ur: 'خودکار'},
  'account.help': {AppLang.ar: 'المساعدة والدعم', AppLang.en: 'Help & support', AppLang.ur: 'مدد اور سپورٹ'},
  'account.signOut': {AppLang.ar: 'تسجيل الخروج', AppLang.en: 'Sign out', AppLang.ur: 'سائن آؤٹ'},
  'account.signOutTitle': {AppLang.ar: 'تسجيل الخروج', AppLang.en: 'Sign out', AppLang.ur: 'سائن آؤٹ'},
  'account.signOutBody': {AppLang.ar: 'هل تريد تسجيل الخروج من حسابك؟', AppLang.en: 'Sign out of your account?', AppLang.ur: 'کیا آپ اپنے اکاؤنٹ سے سائن آؤٹ کرنا چاہتے ہیں؟'},
  'account.exit': {AppLang.ar: 'خروج', AppLang.en: 'Sign out', AppLang.ur: 'باہر'},
  'account.defaultName': {AppLang.ar: 'حسابي', AppLang.en: 'My account', AppLang.ur: 'میرا اکاؤنٹ'},
  'role.driver': {AppLang.ar: 'سائق', AppLang.en: 'Driver', AppLang.ur: 'ڈرائیور'},
  'role.carrier': {AppLang.ar: 'مزوّد نقل', AppLang.en: 'Carrier', AppLang.ur: 'کیریئر'},
  'role.client': {AppLang.ar: 'عميل', AppLang.en: 'Client', AppLang.ur: 'کلائنٹ'},
  'role.user': {AppLang.ar: 'مستخدم', AppLang.en: 'User', AppLang.ur: 'صارف'},

  // ── Language picker ────────────────────────────────────────────────
  'lang.choose': {AppLang.ar: 'اختر اللغة', AppLang.en: 'Choose language', AppLang.ur: 'زبان منتخب کریں'},

  // ── Common actions ─────────────────────────────────────────────────
  'common.cancel': {AppLang.ar: 'إلغاء', AppLang.en: 'Cancel', AppLang.ur: 'منسوخ'},
  'common.save': {AppLang.ar: 'حفظ', AppLang.en: 'Save', AppLang.ur: 'محفوظ کریں'},
  'common.retry': {AppLang.ar: 'إعادة المحاولة', AppLang.en: 'Retry', AppLang.ur: 'دوبارہ کوشش'},
  'common.done': {AppLang.ar: 'تم', AppLang.en: 'Done', AppLang.ur: 'ہو گیا'},
};
