/**
 * Server-driven feature flags.
 *
 * Each flag is declared here once (key, bilingual label/description, default).
 * The admin toggles them (stored as overrides under the `app.flags` setting),
 * and every client reads the effective values from `GET /settings/app` →
 * `flags[key]`, so a feature can be turned on/off platform-wide without an app
 * store update. Add a flag by appending to this list; remove one by deleting
 * its entry (stored overrides for unknown keys are ignored).
 */
export interface FeatureFlagDef {
  key: string;
  labelAr: string;
  labelEn: string;
  descAr: string;
  descEn: string;
  default: boolean;
}

export const FEATURE_FLAGS: readonly FeatureFlagDef[] = [
  {
    key: 'inAppChat',
    labelAr: 'المحادثة داخل التطبيق',
    labelEn: 'In-app chat',
    descAr: 'تفعيل المحادثة بين العميل والمزوّد والسائق.',
    descEn: 'Enable chat between client, carrier and driver.',
    default: true,
  },
  {
    key: 'liveTracking',
    labelAr: 'التتبّع المباشر',
    labelEn: 'Live tracking',
    descAr: 'عرض موقع السائق المباشر على الخريطة أثناء الرحلة.',
    descEn: "Show the driver's live location on the map during a trip.",
    default: true,
  },
  {
    key: 'promoBanner',
    labelAr: 'شريط العروض الترويجية',
    labelEn: 'Promo banner',
    descAr: 'إظهار شريط ترويجي في أعلى الشاشة الرئيسية.',
    descEn: 'Show a promotional banner at the top of the home screen.',
    default: false,
  },
  {
    key: 'guestBrowsing',
    labelAr: 'تصفّح الزائر',
    labelEn: 'Guest browsing',
    descAr: 'السماح بتصفّح الحمولات والناقلين قبل تسجيل الدخول.',
    descEn: 'Allow browsing loads and carriers before signing in.',
    default: true,
  },
];

export type FeatureFlags = Record<string, boolean>;

/** Effective values = stored overrides on top of each flag's default. */
export function resolveFlags(overrides: Record<string, unknown> | undefined): FeatureFlags {
  const out: FeatureFlags = {};
  for (const def of FEATURE_FLAGS) {
    const o = overrides?.[def.key];
    out[def.key] = typeof o === 'boolean' ? o : def.default;
  }
  return out;
}

/** Keep only known boolean overrides (drops unknown keys and non-booleans). */
export function sanitizeFlagOverrides(input: Record<string, unknown> | undefined): FeatureFlags {
  const known = new Set(FEATURE_FLAGS.map((f) => f.key));
  const out: FeatureFlags = {};
  for (const [k, v] of Object.entries(input ?? {})) {
    if (known.has(k) && typeof v === 'boolean') out[k] = v;
  }
  return out;
}
