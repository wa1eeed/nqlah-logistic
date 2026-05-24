import { RefreshControl, ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Linking } from 'react-native';
import { fetcher } from '@/lib/api';
import { useAuthStore } from '@/lib/auth';
import { OrderCard, type Order } from '@/components/OrderCard';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { COLORS, FONTS, SHADOW, RADIUS } from '@/constants/theme';
import { MOCK_ORDERS } from '@/lib/mockData';

type OrdersResponse = Order[] | { items?: Order[] };

const ACTIVE_STATUSES = ['ASSIGNED', 'CONFIRMED', 'IN_TRANSIT', 'DELIVERED'];

function getInitials(firstName?: string, lastName?: string): string {
  const f = firstName?.[0] ?? '';
  const l = lastName?.[0] ?? '';
  return (f + l).toUpperCase() || 'NA';
}

function openInMaps(city: string, address?: string) {
  const query = encodeURIComponent(address ? `${address}، ${city}` : city);
  const url = `https://www.google.com/maps/search/?api=1&query=${query}`;
  Linking.openURL(url).catch(() => {});
}

export default function DriverHomeScreen() {
  const { user } = useAuthStore();

  const { data, isLoading, refetch, isRefetching } = useQuery<Order[]>({
    queryKey: ['driver-orders'],
    queryFn: async () => {
      if (__DEV__) return MOCK_ORDERS as unknown as Order[];
      const res = await fetcher<OrdersResponse>('/orders?mine=true&limit=20');
      return Array.isArray(res) ? res : (res as any).items ?? [];
    },
  });

  const orders = data ?? [];
  const active = orders.filter((o) => ACTIVE_STATUSES.includes(o.status));
  const inTransit = active.filter((o) => o.status === 'IN_TRANSIT');
  const history = orders.filter((o) => !ACTIVE_STATUSES.includes(o.status)).slice(0, 10);

  if (isLoading) return <LoadingScreen label="جارٍ تحميل طلباتك..." />;

  const initials = getInitials(user?.firstName, user?.lastName);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View>
            <Text style={styles.greeting}>مرحباً، {user?.firstName}</Text>
            <Text style={styles.role}>سائق معتمد</Text>
          </View>
        </View>
        <View style={styles.availablePill}>
          <View style={styles.availableDot} />
          <Text style={styles.availableText}>متاح</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Active IN_TRANSIT banner with Maps button */}
        {inTransit.map((o) => {
          // Find latest tracking event
          const events = (o as any).trackingEvents ?? [];
          const latestEvent = events[events.length - 1];
          return (
            <View key={o.id} style={styles.transitBanner}>
              <View style={styles.transitBannerTop}>
                <View style={styles.transitBannerLeft}>
                  <Ionicons name="car" size={20} color={COLORS.textInverse} />
                  <Text style={styles.transitLabel}>في الطريق</Text>
                </View>
                <Text style={styles.transitOrderNum}>{o.orderNumber}</Text>
              </View>

              <View style={styles.transitRoute}>
                <View style={styles.transitCity}>
                  <Ionicons name="location" size={14} color="rgba(255,255,255,0.8)" />
                  <Text style={styles.transitCityText}>{(o as any).originCity}</Text>
                </View>
                <View style={styles.transitArrow}>
                  <View style={styles.transitArrowLine} />
                  <Ionicons name="arrow-back" size={14} color="rgba(255,255,255,0.6)" />
                </View>
                <View style={styles.transitCity}>
                  <Ionicons name="flag" size={14} color="rgba(255,255,255,0.8)" />
                  <Text style={styles.transitCityText}>{(o as any).destinationCity}</Text>
                </View>
              </View>

              {latestEvent && (
                <Text style={styles.transitLatestEvent} numberOfLines={1}>
                  {latestEvent.event}
                </Text>
              )}

              {/* Open in Google Maps */}
              <Pressable
                style={styles.mapsButton}
                onPress={() => openInMaps(
                  (o as any).destinationCity,
                  (o as any).destinationAddress,
                )}
              >
                <Ionicons name="map" size={15} color={COLORS.primary} />
                <Text style={styles.mapsButtonText}>فتح في خرائط Google</Text>
                <Ionicons name="open-outline" size={13} color={COLORS.primary} />
              </Pressable>
            </View>
          );
        })}

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: COLORS.primaryLight }]}>
              <Ionicons name="flash" size={16} color={COLORS.primary} />
            </View>
            <Text style={[styles.statNum, { color: COLORS.primary }]}>{active.length}</Text>
            <Text style={styles.statLabel}>نشطة</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: COLORS.warningLight }]}>
              <Ionicons name="car" size={16} color={COLORS.warning} />
            </View>
            <Text style={[styles.statNum, { color: COLORS.warning }]}>{inTransit.length}</Text>
            <Text style={styles.statLabel}>في الطريق</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: COLORS.successLight }]}>
              <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
            </View>
            <Text style={[styles.statNum, { color: COLORS.success }]}>{history.length}</Text>
            <Text style={styles.statLabel}>مكتملة</Text>
          </View>
        </View>

        {/* Active orders (non-transit) */}
        {active.filter((o) => o.status !== 'IN_TRANSIT').length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="cube" size={15} color={COLORS.primary} />
              <Text style={styles.sectionTitle}>الطلبات النشطة</Text>
              <View style={styles.sectionBadge}>
                <Text style={styles.sectionBadgeText}>
                  {active.filter((o) => o.status !== 'IN_TRANSIT').length}
                </Text>
              </View>
            </View>
            {active
              .filter((o) => o.status !== 'IN_TRANSIT')
              .map((o) => (
                <OrderCard key={o.id} order={o} href={`/(driver)/order/${o.id}`} />
              ))}
          </View>
        )}

        {/* Empty state */}
        {active.length === 0 && (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="cube-outline" size={44} color={COLORS.textMuted} />
            </View>
            <Text style={styles.emptyTitle}>لا يوجد طلب نشط</Text>
            <Text style={styles.emptyHint}>سيظهر هنا الطلب عند إسناده إليك من الناقل</Text>
          </View>
        )}

        {/* History */}
        {history.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="time-outline" size={15} color={COLORS.textMuted} />
              <Text style={styles.sectionTitle}>الطلبات السابقة</Text>
            </View>
            {history.map((o) => (
              <OrderCard key={o.id} order={o} href={`/(driver)/order/${o.id}`} />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORS.primary,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  avatarText: { fontFamily: FONTS.bold, fontSize: 15, color: COLORS.textInverse },
  greeting: { fontFamily: FONTS.bold, fontSize: 17, color: COLORS.textInverse },
  role: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 1,
  },
  availablePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: RADIUS.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  availableDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#4ADE80' },
  availableText: { fontFamily: FONTS.semiBold, fontSize: 12, color: COLORS.textInverse },

  scroll: { flex: 1 },
  content: { padding: 16, gap: 14, paddingBottom: 32 },

  // In-transit banner
  transitBanner: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    padding: 16,
    gap: 10,
    ...SHADOW.md,
  },
  transitBannerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  transitBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  transitLabel: {
    fontFamily: FONTS.semiBold,
    fontSize: 13,
    color: COLORS.textInverse,
  },
  transitOrderNum: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
  },
  transitRoute: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  transitCity: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 },
  transitCityText: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: COLORS.textInverse,
    flex: 1,
  },
  transitArrow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 4,
  },
  transitArrowLine: { width: 16, height: 1, backgroundColor: 'rgba(255,255,255,0.4)' },
  transitLatestEvent: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  mapsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.md,
    paddingVertical: 10,
    marginTop: 2,
  },
  mapsButtonText: {
    fontFamily: FONTS.semiBold,
    fontSize: 13,
    color: COLORS.primary,
  },

  // Stats
  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    padding: 14,
    alignItems: 'center',
    gap: 5,
    ...SHADOW.sm,
  },
  statIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statNum: { fontFamily: FONTS.bold, fontSize: 20 },
  statLabel: {
    fontFamily: FONTS.regular,
    fontSize: 10,
    color: COLORS.textMuted,
    textAlign: 'center',
  },

  // Sections
  section: { gap: 4 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  sectionTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    color: COLORS.textSecondary,
    flex: 1,
  },
  sectionBadge: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: RADIUS.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  sectionBadgeText: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    color: COLORS.primary,
  },

  // Empty
  emptyCard: {
    alignItems: 'center',
    gap: 10,
    padding: 44,
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.xl,
    ...SHADOW.sm,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: { fontFamily: FONTS.bold, fontSize: 17, color: COLORS.text },
  emptyHint: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
});
