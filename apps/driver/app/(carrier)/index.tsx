import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { fetcher } from '@/lib/api';
import { useAuthStore } from '@/lib/auth';
import { OrderCard, type Order } from '@/components/OrderCard';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { COLORS, FONTS, RADIUS, SHADOW } from '@/constants/theme';
import { MOCK_ORDERS } from '@/lib/mockData';

function getInitials(firstName?: string, lastName?: string): string {
  const f = firstName?.[0] ?? '';
  const l = lastName?.[0] ?? '';
  return (f + l).toUpperCase() || 'NA';
}

export default function CarrierHomeScreen() {
  const { user } = useAuthStore();

  const { data: myOrders, isLoading, refetch, isRefetching } = useQuery<Order[]>({
    queryKey: ['carrier-my-orders'],
    queryFn: async () => {
      if (__DEV__) return MOCK_ORDERS as unknown as Order[];
      const res = await fetcher<any>('/orders?mine=true&limit=10');
      return Array.isArray(res) ? res : res?.items ?? [];
    },
  });

  const orders = myOrders ?? [];
  const active = orders.filter((o) => ['ASSIGNED', 'CONFIRMED', 'IN_TRANSIT'].includes(o.status));
  const completed = orders.filter((o) => o.status === 'COMPLETED').length;
  const delivered = orders.filter((o) => o.status === 'DELIVERED').length;
  const totalDone = completed + delivered;

  if (isLoading) return <LoadingScreen label="جارٍ التحميل..." />;

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
            <Text style={styles.role}>ناقل فرد</Text>
          </View>
        </View>
        <View style={styles.notifBtn}>
          <Ionicons name="notifications-outline" size={22} color={COLORS.textSecondary} />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={COLORS.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, styles.statCardActive]}>
            <View style={[styles.statIcon, { backgroundColor: COLORS.primaryLight }]}>
              <Ionicons name="flash" size={18} color={COLORS.primary} />
            </View>
            <Text style={[styles.statNum, { color: COLORS.primary }]}>{active.length}</Text>
            <Text style={styles.statLabel}>نشطة</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: COLORS.successLight }]}>
              <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
            </View>
            <Text style={[styles.statNum, { color: COLORS.success }]}>{totalDone}</Text>
            <Text style={styles.statLabel}>مكتملة</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: COLORS.infoLight }]}>
              <Ionicons name="layers" size={18} color={COLORS.info} />
            </View>
            <Text style={[styles.statNum, { color: COLORS.info }]}>{orders.length}</Text>
            <Text style={styles.statLabel}>إجمالي</Text>
          </View>
        </View>

        {/* Active Orders Section */}
        {active.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="car" size={16} color={COLORS.primary} />
              <Text style={styles.sectionTitle}>الطلبات النشطة</Text>
              <View style={styles.sectionBadge}>
                <Text style={styles.sectionBadgeText}>{active.length}</Text>
              </View>
            </View>
            {active.map((o) => (
              <OrderCard key={o.id} order={o} href={`/(carrier)/order/${o.id}`} />
            ))}
          </View>
        )}

        {/* Recent Completed */}
        {totalDone > 0 && active.length === 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="time-outline" size={16} color={COLORS.textMuted} />
              <Text style={styles.sectionTitle}>الطلبات السابقة</Text>
            </View>
            {orders
              .filter((o) => ['COMPLETED', 'DELIVERED'].includes(o.status))
              .slice(0, 5)
              .map((o) => (
                <OrderCard key={o.id} order={o} href={`/(carrier)/order/${o.id}`} />
              ))}
          </View>
        )}

        {/* Empty State */}
        {active.length === 0 && totalDone === 0 && (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="cube-outline" size={48} color={COLORS.textMuted} />
            </View>
            <Text style={styles.emptyTitle}>لا يوجد طلب نشط</Text>
            <Text style={styles.emptyHint}>استعرض الفرص المتاحة وتقدّم بعروضك</Text>
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
  notifBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  content: { padding: 16, gap: 16, paddingBottom: 32 },

  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    padding: 14,
    alignItems: 'center',
    gap: 6,
    ...SHADOW.sm,
  },
  statCardActive: {
    borderWidth: 1,
    borderColor: COLORS.primaryLight,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statNum: { fontFamily: FONTS.bold, fontSize: 22 },
  statLabel: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: COLORS.textMuted,
    textAlign: 'center',
  },

  section: { gap: 4 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
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

  emptyCard: {
    alignItems: 'center',
    gap: 10,
    padding: 48,
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.xl,
    ...SHADOW.sm,
    marginTop: 8,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
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
