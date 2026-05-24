import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { fetcher } from '@/lib/api';
import { useAuthStore } from '@/lib/auth';
import { OrderCard, type Order } from '@/components/OrderCard';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { COLORS, FONTS, SHADOW, RADIUS } from '@/constants/theme';

type OrdersResponse = Order[] | { items?: Order[] };

const ACTIVE = ['ASSIGNED', 'CONFIRMED', 'IN_TRANSIT', 'DELIVERED'];

export default function DriverHomeScreen() {
  const { user } = useAuthStore();

  const { data, isLoading, refetch, isRefetching } = useQuery<Order[]>({
    queryKey: ['driver-orders'],
    queryFn: async () => {
      const res = await fetcher<OrdersResponse>('/orders?mine=true&limit=20');
      return Array.isArray(res) ? res : (res as any).items ?? [];
    },
  });

  const orders = data ?? [];
  const active = orders.filter((o) => ACTIVE.includes(o.status));
  const history = orders.filter((o) => !ACTIVE.includes(o.status)).slice(0, 10);

  if (isLoading) return <LoadingScreen label="جارٍ تحميل طلباتك..." />;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>مرحباً، {user?.firstName} 👋</Text>
          <Text style={styles.role}>سائق معتمد</Text>
        </View>
        <View style={styles.statusPill}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>متاح</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Active order banner */}
        {active.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🚚 الطلبات النشطة ({active.length})</Text>
            {active.map((o) => (
              <OrderCard key={o.id} order={o} href={`/(driver)/order/${o.id}`} />
            ))}
          </View>
        )}

        {active.length === 0 && (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>📭</Text>
            <Text style={styles.emptyTitle}>لا يوجد طلب نشط</Text>
            <Text style={styles.emptyHint}>سيظهر هنا الطلب عند إسناده إليك من الناقل</Text>
          </View>
        )}

        {/* History */}
        {history.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📋 السابقة</Text>
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
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16,
    backgroundColor: COLORS.bgCard, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  greeting: { fontFamily: FONTS.bold, fontSize: 18, color: COLORS.text },
  role: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.successLight, borderRadius: RADIUS.full,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.success },
  statusText: { fontFamily: FONTS.semiBold, fontSize: 12, color: COLORS.success },

  scroll: { flex: 1 },
  content: { padding: 16, gap: 8, paddingBottom: 32 },

  section: { gap: 4 },
  sectionTitle: { fontFamily: FONTS.semiBold, fontSize: 14, color: COLORS.textSecondary, marginBottom: 8, marginTop: 4 },

  emptyCard: {
    alignItems: 'center', gap: 8, padding: 40,
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.xl, ...SHADOW.sm,
    marginTop: 20,
  },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontFamily: FONTS.bold, fontSize: 18, color: COLORS.text },
  emptyHint: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.textMuted, textAlign: 'center' },
});
