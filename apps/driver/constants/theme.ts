export const COLORS = {
  primary:       '#1B6CA8',
  primaryDark:   '#134E7A',
  primaryLight:  '#EBF4FF',

  success:       '#16A34A',
  successLight:  '#DCFCE7',
  warning:       '#D97706',
  warningLight:  '#FEF3C7',
  danger:        '#DC2626',
  dangerLight:   '#FEE2E2',
  info:          '#0284C7',
  infoLight:     '#E0F2FE',

  white:         '#FFFFFF',
  bg:            '#F1F5F9',
  bgCard:        '#FFFFFF',

  text:          '#0F172A',
  textSecondary: '#334155',
  textMuted:     '#64748B',
  textInverse:   '#FFFFFF',

  border:        '#E2E8F0',
  borderLight:   '#F1F5F9',
  overlay:       'rgba(15,23,42,0.6)',
};

export const FONTS = {
  regular:  'Cairo_400Regular',
  medium:   'Cairo_500Medium',
  semiBold: 'Cairo_600SemiBold',
  bold:     'Cairo_700Bold',
};

export const RADIUS = { sm: 8, md: 12, lg: 16, xl: 24, full: 9999 };

export const SHADOW = {
  sm: { shadowColor: '#0F172A', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3,  elevation: 2 },
  md: { shadowColor: '#0F172A', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.09, shadowRadius: 8,  elevation: 4 },
  lg: { shadowColor: '#0F172A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.13, shadowRadius: 16, elevation: 8 },
};

export const STATUS_LABEL: Record<string, string> = {
  DRAFT:      'مسودة',
  PUBLISHED:  'منشور',
  BIDDING:    'قيد المزايدة',
  PENDING:    'في الانتظار',
  ASSIGNED:   'مُسند',
  CONFIRMED:  'مؤكَّد',
  IN_TRANSIT: 'في الطريق',
  DELIVERED:  'تم التسليم',
  COMPLETED:  'مكتمل',
  CANCELLED:  'ملغى',
  DISPUTED:   'متنازع عليه',
};

export const STATUS_COLOR: Record<string, { bg: string; text: string }> = {
  DRAFT:      { bg: COLORS.borderLight,   text: COLORS.textMuted },
  PUBLISHED:  { bg: COLORS.infoLight,     text: COLORS.info },
  BIDDING:    { bg: COLORS.warningLight,  text: COLORS.warning },
  PENDING:    { bg: '#FEF3C7',            text: '#92400E' },
  ASSIGNED:   { bg: COLORS.primaryLight,  text: COLORS.primary },
  CONFIRMED:  { bg: COLORS.primaryLight,  text: COLORS.primaryDark },
  IN_TRANSIT: { bg: COLORS.warningLight,  text: COLORS.warning },
  DELIVERED:  { bg: COLORS.successLight,  text: COLORS.success },
  COMPLETED:  { bg: COLORS.successLight,  text: COLORS.success },
  CANCELLED:  { bg: COLORS.dangerLight,   text: COLORS.danger },
  DISPUTED:   { bg: COLORS.dangerLight,   text: COLORS.danger },
};
