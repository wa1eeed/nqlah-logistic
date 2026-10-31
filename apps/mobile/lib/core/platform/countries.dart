/// A country for the phone-number + registration pickers: ISO-3166 alpha-2
/// code, Arabic + English name, international dial code, and a flag emoji.
class Country {
  const Country(this.code, this.nameAr, this.nameEn, this.dial, this.flag);
  final String code; // ISO alpha-2, e.g. "SA"
  final String nameAr;
  final String nameEn;
  final String dial; // e.g. "+966"
  final String flag; // emoji

  @override
  bool operator ==(Object other) => other is Country && other.code == code;
  @override
  int get hashCode => code.hashCode;
}

/// Default country when none is detected/selected.
const kDefaultCountryCode = 'SA';

/// A broad country list (dial codes) so the app can operate in any country.
/// Ordered GCC/Arab first, then the rest alphabetically by English name. The
/// admin can curate/extend the operating countries later (platform settings).
const List<Country> kCountries = [
  Country('SA', 'السعودية', 'Saudi Arabia', '+966', '🇸🇦'),
  Country('AE', 'الإمارات', 'United Arab Emirates', '+971', '🇦🇪'),
  Country('KW', 'الكويت', 'Kuwait', '+965', '🇰🇼'),
  Country('QA', 'قطر', 'Qatar', '+974', '🇶🇦'),
  Country('BH', 'البحرين', 'Bahrain', '+973', '🇧🇭'),
  Country('OM', 'عُمان', 'Oman', '+968', '🇴🇲'),
  Country('JO', 'الأردن', 'Jordan', '+962', '🇯🇴'),
  Country('EG', 'مصر', 'Egypt', '+20', '🇪🇬'),
  Country('IQ', 'العراق', 'Iraq', '+964', '🇮🇶'),
  Country('YE', 'اليمن', 'Yemen', '+967', '🇾🇪'),
  Country('LB', 'لبنان', 'Lebanon', '+961', '🇱🇧'),
  Country('SY', 'سوريا', 'Syria', '+963', '🇸🇾'),
  Country('PS', 'فلسطين', 'Palestine', '+970', '🇵🇸'),
  Country('SD', 'السودان', 'Sudan', '+249', '🇸🇩'),
  Country('LY', 'ليبيا', 'Libya', '+218', '🇱🇾'),
  Country('TN', 'تونس', 'Tunisia', '+216', '🇹🇳'),
  Country('DZ', 'الجزائر', 'Algeria', '+213', '🇩🇿'),
  Country('MA', 'المغرب', 'Morocco', '+212', '🇲🇦'),
  Country('MR', 'موريتانيا', 'Mauritania', '+222', '🇲🇷'),
  Country('SO', 'الصومال', 'Somalia', '+252', '🇸🇴'),
  Country('DJ', 'جيبوتي', 'Djibouti', '+253', '🇩🇯'),
  Country('KM', 'جزر القمر', 'Comoros', '+269', '🇰🇲'),
  Country('TR', 'تركيا', 'Turkey', '+90', '🇹🇷'),
  Country('PK', 'باكستان', 'Pakistan', '+92', '🇵🇰'),
  Country('IN', 'الهند', 'India', '+91', '🇮🇳'),
  Country('BD', 'بنغلاديش', 'Bangladesh', '+880', '🇧🇩'),
  Country('ID', 'إندونيسيا', 'Indonesia', '+62', '🇮🇩'),
  Country('MY', 'ماليزيا', 'Malaysia', '+60', '🇲🇾'),
  Country('PH', 'الفلبين', 'Philippines', '+63', '🇵🇭'),
  Country('LK', 'سريلانكا', 'Sri Lanka', '+94', '🇱🇰'),
  Country('NP', 'نيبال', 'Nepal', '+977', '🇳🇵'),
  Country('AF', 'أفغانستان', 'Afghanistan', '+93', '🇦🇫'),
  Country('IR', 'إيران', 'Iran', '+98', '🇮🇷'),
  Country('US', 'الولايات المتحدة', 'United States', '+1', '🇺🇸'),
  Country('GB', 'المملكة المتحدة', 'United Kingdom', '+44', '🇬🇧'),
  Country('FR', 'فرنسا', 'France', '+33', '🇫🇷'),
  Country('DE', 'ألمانيا', 'Germany', '+49', '🇩🇪'),
  Country('IT', 'إيطاليا', 'Italy', '+39', '🇮🇹'),
  Country('ES', 'إسبانيا', 'Spain', '+34', '🇪🇸'),
  Country('NL', 'هولندا', 'Netherlands', '+31', '🇳🇱'),
  Country('CN', 'الصين', 'China', '+86', '🇨🇳'),
  Country('JP', 'اليابان', 'Japan', '+81', '🇯🇵'),
  Country('KR', 'كوريا الجنوبية', 'South Korea', '+82', '🇰🇷'),
  Country('RU', 'روسيا', 'Russia', '+7', '🇷🇺'),
  Country('NG', 'نيجيريا', 'Nigeria', '+234', '🇳🇬'),
  Country('KE', 'كينيا', 'Kenya', '+254', '🇰🇪'),
  Country('ET', 'إثيوبيا', 'Ethiopia', '+251', '🇪🇹'),
  Country('ZA', 'جنوب أفريقيا', 'South Africa', '+27', '🇿🇦'),
  Country('BR', 'البرازيل', 'Brazil', '+55', '🇧🇷'),
  Country('CA', 'كندا', 'Canada', '+1', '🇨🇦'),
  Country('AU', 'أستراليا', 'Australia', '+61', '🇦🇺'),
];

/// Lookup by ISO code (case-insensitive); falls back to the default country.
Country countryByCode(String? code) {
  final c = (code ?? '').toUpperCase();
  for (final x in kCountries) {
    if (x.code == c) return x;
  }
  return kCountries.first; // SA
}
