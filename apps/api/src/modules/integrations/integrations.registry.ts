/**
 * Integration Hub catalog (source of truth, in code). Each domain lists its
 * available providers and the config fields each needs. The admin-managed state
 * (active provider, enabled, config values, health) lives in the `Integration`
 * table; this file is the schema that drives the admin console and validation.
 *
 * To onboard a NEW external integration: add a domain here (or a provider to an
 * existing domain) with its config fields, implement the connector/adapter, and
 * it appears in the admin console automatically.
 */

export interface ConfigField {
  key: string; // stored in Integration.config and read by the connector
  labelAr: string;
  labelEn: string;
  secret: boolean; // stored encrypted + masked in responses
  envKey?: string; // env var used as a fallback when no DB value is set
  required?: boolean;
  placeholder?: string;
}

export interface ProviderSpec {
  id: string;
  labelAr: string;
  labelEn: string;
  /** Config fields specific to this provider (merged with the domain's shared fields). */
  fields?: ConfigField[];
  /** Whether a working adapter is implemented (vs. planned / falls back). */
  implemented: boolean;
}

export interface IntegrationSpec {
  domain: string;
  labelAr: string;
  labelEn: string;
  descAr: string;
  icon: string; // UI hint
  category: 'payments' | 'messaging' | 'storage' | 'other';
  providerEnvKey: string; // env var that selects the provider
  defaultProvider: string;
  prodForbiddenProviders?: string[]; // providers invalid in production (e.g. dev stubs)
  providers: ProviderSpec[];
}

export const INTEGRATIONS: IntegrationSpec[] = [
  {
    domain: 'payments',
    labelAr: 'المدفوعات',
    labelEn: 'Payments',
    descAr: 'بوابة الدفع والتحصيل (شحن/استرداد).',
    icon: 'credit-card',
    category: 'payments',
    providerEnvKey: 'PAYMENT_PROVIDER',
    defaultProvider: 'mock',
    prodForbiddenProviders: ['mock'],
    providers: [
      { id: 'mock', labelAr: 'محاكاة (تطوير)', labelEn: 'Mock (dev)', implemented: true },
      { id: 'moyasar', labelAr: 'ميسر', labelEn: 'Moyasar', implemented: false,
        fields: [{ key: 'MOYASAR_API_KEY', labelAr: 'مفتاح API', labelEn: 'API Key', secret: true, envKey: 'MOYASAR_API_KEY', required: true }] },
      { id: 'tap', labelAr: 'تاب', labelEn: 'Tap', implemented: false,
        fields: [{ key: 'TAP_API_KEY', labelAr: 'مفتاح API', labelEn: 'API Key', secret: true, envKey: 'TAP_API_KEY', required: true }] },
    ],
  },
  {
    domain: 'sms',
    labelAr: 'الرسائل النصية (OTP)',
    labelEn: 'SMS / OTP',
    descAr: 'إرسال رموز التحقق والتنبيهات عبر مزود رسائل سعودي.',
    icon: 'message',
    category: 'messaging',
    providerEnvKey: 'SMS_PROVIDER',
    defaultProvider: 'console',
    prodForbiddenProviders: ['console'],
    providers: [
      { id: 'console', labelAr: 'سجل (تطوير)', labelEn: 'Console (dev)', implemented: true },
      { id: 'unifonic', labelAr: 'يونيفونيك', labelEn: 'Unifonic', implemented: false,
        fields: [
          { key: 'UNIFONIC_APP_SID', labelAr: 'App SID', labelEn: 'App SID', secret: true, envKey: 'UNIFONIC_APP_SID', required: true },
          { key: 'UNIFONIC_SENDER', labelAr: 'اسم المرسل', labelEn: 'Sender', secret: false, envKey: 'UNIFONIC_SENDER' },
        ] },
      { id: 'msegat', labelAr: 'مسِجات', labelEn: 'mSegat', implemented: false,
        fields: [
          { key: 'MSEGAT_USERNAME', labelAr: 'اسم المستخدم', labelEn: 'Username', secret: false, envKey: 'MSEGAT_USERNAME', required: true },
          { key: 'MSEGAT_API_KEY', labelAr: 'مفتاح API', labelEn: 'API Key', secret: true, envKey: 'MSEGAT_API_KEY', required: true },
          { key: 'MSEGAT_SENDER', labelAr: 'اسم المرسل', labelEn: 'Sender', secret: false, envKey: 'MSEGAT_USERSENDER' },
        ] },
    ],
  },
  {
    domain: 'otp',
    labelAr: 'رموز التحقق (OTP)',
    labelEn: 'OTP Verification',
    descAr: 'مزوّد توليد والتحقق من رموز التحقق (Authentica). للبيئة التجريبية رمز ثابت قابل للتعديل.',
    icon: 'shield',
    category: 'messaging',
    providerEnvKey: 'OTP_PROVIDER',
    defaultProvider: 'local',
    prodForbiddenProviders: ['local'],
    providers: [
      // Dev/self-managed: random code in Redis, delivered via the SMS connector.
      { id: 'local', labelAr: 'محلي (تطوير)', labelEn: 'Local (dev)', implemented: true },
      // Authentica — managed OTP (generate + send + verify). No vendor sandbox:
      // `mode=test` simulates at our layer with a fixed, editable test code;
      // `mode=live` calls the real API. Production always runs live.
      { id: 'authentica', labelAr: 'Authentica', labelEn: 'Authentica', implemented: true,
        fields: [
          { key: 'AUTHENTICA_API_KEY', labelAr: 'مفتاح API', labelEn: 'API Key', secret: true, envKey: 'AUTHENTICA_API_KEY', required: true },
          { key: 'AUTHENTICA_MODE', labelAr: 'الوضع (test/live)', labelEn: 'Mode (test/live)', secret: false, envKey: 'AUTHENTICA_MODE', placeholder: 'test | live' },
          { key: 'AUTHENTICA_TEST_OTP', labelAr: 'رمز الوضع التجريبي', labelEn: 'Test OTP code', secret: false, envKey: 'AUTHENTICA_TEST_OTP', placeholder: '123456' },
          { key: 'AUTHENTICA_CHANNEL', labelAr: 'القناة', labelEn: 'Channel', secret: false, envKey: 'AUTHENTICA_CHANNEL', placeholder: 'sms | whatsapp | email' },
          { key: 'AUTHENTICA_TEMPLATE_ID', labelAr: 'معرّف القالب', labelEn: 'Template ID', secret: false, envKey: 'AUTHENTICA_TEMPLATE_ID', placeholder: '1' },
          { key: 'AUTHENTICA_FALLBACK_EMAIL', labelAr: 'بريد بديل (اختياري)', labelEn: 'Fallback email (optional)', secret: false, envKey: 'AUTHENTICA_FALLBACK_EMAIL' },
        ] },
    ],
  },
  {
    domain: 'email',
    labelAr: 'البريد الإلكتروني',
    labelEn: 'Email',
    descAr: 'رسائل المعاملات (ترحيب، تحقق، إيصالات).',
    icon: 'mail',
    category: 'messaging',
    providerEnvKey: 'EMAIL_PROVIDER',
    defaultProvider: 'console',
    providers: [
      { id: 'console', labelAr: 'سجل (تطوير)', labelEn: 'Console (dev)', implemented: true },
      { id: 'resend', labelAr: 'Resend', labelEn: 'Resend', implemented: true,
        fields: [
          { key: 'RESEND_API_KEY', labelAr: 'مفتاح API', labelEn: 'API Key', secret: true, envKey: 'RESEND_API_KEY', required: true },
          { key: 'EMAIL_FROM', labelAr: 'المُرسِل', labelEn: 'From', secret: false, envKey: 'EMAIL_FROM', placeholder: 'NQLAH <no-reply@nqlah.sa>' },
        ] },
    ],
  },
  {
    domain: 'storage',
    labelAr: 'التخزين',
    labelEn: 'Storage',
    descAr: 'تخزين الملفات (مستندات، وسائط الشات، فواتير) عبر متجر كائنات.',
    icon: 'database',
    category: 'storage',
    providerEnvKey: 'STORAGE_PROVIDER',
    defaultProvider: 'minio',
    providers: [
      { id: 'minio', labelAr: 'MinIO / S3', labelEn: 'MinIO / S3', implemented: true,
        fields: [
          { key: 'MINIO_ENDPOINT', labelAr: 'العنوان', labelEn: 'Endpoint', secret: false, envKey: 'MINIO_ENDPOINT' },
          { key: 'MINIO_BUCKET', labelAr: 'الحاوية', labelEn: 'Bucket', secret: false, envKey: 'MINIO_BUCKET' },
          { key: 'MINIO_ROOT_USER', labelAr: 'مفتاح الوصول', labelEn: 'Access Key', secret: true, envKey: 'MINIO_ROOT_USER' },
          { key: 'MINIO_ROOT_PASSWORD', labelAr: 'المفتاح السري', labelEn: 'Secret Key', secret: true, envKey: 'MINIO_ROOT_PASSWORD' },
        ] },
      { id: 'r2', labelAr: 'Cloudflare R2', labelEn: 'Cloudflare R2', implemented: true,
        fields: [
          { key: 'R2_ENDPOINT', labelAr: 'العنوان (S3 endpoint)', labelEn: 'S3 Endpoint', secret: false, envKey: 'R2_ENDPOINT' },
          { key: 'R2_BUCKET', labelAr: 'الحاوية', labelEn: 'Bucket', secret: false, envKey: 'R2_BUCKET' },
          { key: 'R2_ACCESS_KEY', labelAr: 'مفتاح الوصول', labelEn: 'Access Key', secret: true, envKey: 'R2_ACCESS_KEY' },
          { key: 'R2_SECRET_KEY', labelAr: 'المفتاح السري', labelEn: 'Secret Key', secret: true, envKey: 'R2_SECRET_KEY' },
          { key: 'R2_PUBLIC_URL', labelAr: 'النطاق العام (للأصول العامة)', labelEn: 'Public URL (public assets)', secret: false, envKey: 'R2_PUBLIC_URL' },
        ] },
    ],
  },
  {
    domain: 'push',
    labelAr: 'الإشعارات الفورية',
    labelEn: 'Push Notifications',
    descAr: 'إشعارات التطبيق عبر FCM (أندرويد) و APNs (iOS).',
    icon: 'bell',
    category: 'messaging',
    providerEnvKey: 'PUSH_PROVIDER',
    defaultProvider: 'console',
    providers: [
      { id: 'console', labelAr: 'سجل (تطوير)', labelEn: 'Console (dev)', implemented: true },
      { id: 'fcm', labelAr: 'FCM / APNs', labelEn: 'FCM / APNs', implemented: true,
        fields: [
          { key: 'FCM_PROJECT_ID', labelAr: 'معرّف المشروع', labelEn: 'Project ID', secret: false, required: true, placeholder: 'my-firebase-project' },
          { key: 'FCM_SERVICE_ACCOUNT', labelAr: 'حساب الخدمة (JSON)', labelEn: 'Service Account (JSON)', secret: true, required: true, placeholder: '{ "type": "service_account", ... }' },
        ] },
    ],
  },
  {
    domain: 'maps',
    labelAr: 'الخرائط والتتبّع',
    labelEn: 'Maps & Tracking',
    descAr: 'مزوّد الخرائط للتتبّع الحي (MapLibre/OSM مجاناً، أو Google/Mapbox بمفتاح).',
    icon: 'map',
    category: 'other',
    providerEnvKey: 'MAPS_PROVIDER',
    defaultProvider: 'maplibre',
    providers: [
      // Free, no key — raster OSM tiles. Served to clients via GET /config/maps.
      { id: 'maplibre', labelAr: 'MapLibre / OSM (مجاني)', labelEn: 'MapLibre / OSM (free)', implemented: true,
        fields: [
          { key: 'MAPS_TILE_URL', labelAr: 'رابط البلاطات', labelEn: 'Tile URL', secret: false, envKey: 'MAPS_TILE_URL', placeholder: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png' },
          { key: 'MAPS_ATTRIBUTION', labelAr: 'حقوق الإسناد', labelEn: 'Attribution', secret: false, envKey: 'MAPS_ATTRIBUTION', placeholder: '© OpenStreetMap contributors' },
        ] },
      // Raster tiles via Mapbox token (works with the same tile renderer).
      { id: 'mapbox', labelAr: 'Mapbox', labelEn: 'Mapbox', implemented: true,
        fields: [
          { key: 'MAPBOX_TOKEN', labelAr: 'التوكن', labelEn: 'Token', secret: true, envKey: 'MAPBOX_TOKEN', required: true },
          { key: 'MAPBOX_STYLE', labelAr: 'النمط', labelEn: 'Style', secret: false, envKey: 'MAPBOX_STYLE', placeholder: 'mapbox/streets-v12' },
        ] },
      // Google Maps uses its own SDKs (JS API + google_maps_flutter); wired as a
      // later upgrade once a key is provided.
      { id: 'google', labelAr: 'Google Maps', labelEn: 'Google Maps', implemented: false,
        fields: [
          { key: 'GOOGLE_MAPS_API_KEY', labelAr: 'مفتاح API', labelEn: 'API Key', secret: true, envKey: 'GOOGLE_MAPS_API_KEY', required: true },
        ] },
    ],
  },
];

export const INTEGRATION_DOMAINS = INTEGRATIONS.map((i) => i.domain);

export function specFor(domain: string): IntegrationSpec | undefined {
  return INTEGRATIONS.find((i) => i.domain === domain);
}

/** All config fields for a domain's provider (domain is flat here — fields live on providers). */
export function fieldsFor(domain: string, provider: string): ConfigField[] {
  const spec = specFor(domain);
  const prov = spec?.providers.find((p) => p.id === provider);
  return prov?.fields ?? [];
}
