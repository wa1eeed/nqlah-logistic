export const COLORS = {
  primary:      '#0A7EA4',
  primaryDark:  '#0369A1',
  primaryLight: '#E0F2FE',

  success:      '#16A34A',
  successLight: '#DCFCE7',
  warning:      '#D97706',
  warningLight: '#FEF3C7',
  danger:       '#DC2626',
  dangerLight:  '#FEE2E2',
  info:         '#2563EB',
  infoLight:    '#DBEAFE',

  white:        '#FFFFFF',
  bg:           '#F8FAFC',
  bgCard:       '#FFFFFF',

  text:         '#0F172A',
  textSecondary:'#475569',
  textMuted:    '#94A3B8',
  textInverse:  '#FFFFFF',

  border:       '#E2E8F0',
  borderLight:  '#F1F5F9',
  overlay:      'rgba(0,0,0,0.45)',
};

export const FONTS = {
  regular:   'Cairo_400Regular',
  medium:    'Cairo_500Medium',
  semiBold:  'Cairo_600SemiBold',
  bold:      'Cairo_700Bold',
};

export const RADIUS = { sm: 8, md: 12, lg: 16, xl: 24, full: 9999 };

export const SHADOW = {
  sm: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2,  elevation: 1 },
  md: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8,  elevation: 3 },
  lg: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 16, elevation: 6 },
};

export const STATUS_LABEL: Record<string, string> = {
  DRAFT:      'مسودة',
  PUBLISHED:  'منشور',
  BIDDING:    'قيد المزايدة',
  ASSIGNED:   'مُسند',
  CONFIRMED:  'مؤكَّد',
  IN_TRANSIT: 'في الطريق',
  DELIVERED:  'تم التسليم',
  COMPLETED:  'مكتمل',
  CANCELLED:  'ملغى',
  DISPUTED:   'متنازع عليه',
};

export const STATUS_COLOR: Record<string, { bg: string; text: string }> = {
  DRAFT:      { bg: COLORS.borderLight,  text: COLORS.textMuted },
  PUBLISHED:  { bg: COLORS.infoLight,    text: COLORS.info },
  BIDDING:    { bg: COLORS.warningLight, text: COLORS.warning },
  ASSIGNED:   { bg: COLORS.primaryLight, text: COLORS.primary },
  CONFIRMED:  { bg: COLORS.primaryLight, text: COLORS.primaryDark },
  IN_TRANSIT: { bg: COLORS.warningLight, text: COLORS.warning },
  DELIVERED:  { bg: COLORS.successLight, text: COLORS.success },
  COMPLETED:  { bg: COLORS.successLight, text: COLORS.success },
  CANCELLED:  { bg: COLORS.dangerLight,  text: COLORS.danger },
  DISPUTED:   { bg: COLORS.dangerLight,  text: COLORS.danger },
};
