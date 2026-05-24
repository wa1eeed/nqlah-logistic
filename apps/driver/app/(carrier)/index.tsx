import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { fetcher } from '@/lib/api';
import { useAuthStore } from '@/lib/auth';
import { OrderCard, type Order } from '@/components/OrderCard';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { COLORS, FONTS, RADIUS, SHADOW } from '@/constants/theme';

export default function CarrierHomeScreen() {
  const { user } = useAuthStore();

  const { data: myOrders, isLoading, refetch, isRefetching } = useQuery<Order[]>({
    queryKey: ['carrier-my-orders'],
    queryFn: async () => {
      const res = await fetcher<any>('/orders?mine=true&limit=10');
      return Array.isArray(res) ? res : res?.items ?? [];
    },
  });

  const active = (myOrders ?? []).filter((o) => ['ASSIGNED', 'CONFIRMED', 'IN_TRANSIT'].includes(o.status));
  const completed = (myOrders ?? []).filter((o) => o.status === 'COMPLETED').length;

  if (isLoading) return <LoadingScreen label="جارٍ التحميل..." />;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>مرحباً، {user?.firstName} 👋</Text>
          <Text style={styles.role}>ناقل فرد</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNum}>{active.length}</Text>
            <Text style={styles.statLabel}>نشطة</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNum}>{completed}</Text>
            <Text style={styles.statLabel}>مكتملة</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNum}>{(myOrders ?? []).length}</Text>
            <Text style={styles.statLabel}>إجمالي</Text>
          </View>
        </View>

        {/* Active orders */}
        {active.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🚚 الطلبات النشطة</Text>
            {active.map((o) => (
              <OrderCard key={o.id} order={o} href={`/(carrier)/order/${o.id}`} />
            ))}
          </View>
        )}

        {active.length === 0 && (
          <View style={styles.emptyCard}>
            <Text style={{ fontSize: 48 }}>📭</Text>
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
    padding: 20, backgroundColor: COLORS.bgCard,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  greeting: { fontFamily: FONTS.bold, fontSize: 18, color: COLORS.text },
  role: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  content: { padding: 16, gap: 16, paddingBottom: 32 },
  statsRow: { flexDirection: 'row', gap: 12 },
  statCard: {
    flex: 1, backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg,
    padding: 16, alignItems: 'center', ...SHADOW.sm,
  },
  statNum: { fontFamily: FONTS.bold, fontSize: 24, color: COLORS.primary },
  statLabel: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  section: { gap: 4 },
  sectionTitle: { fontFamily: FONTS.semiBold, fontSize: 14, color: COLORS.textSecondary, marginBottom: 8 },
  emptyCard: {
    alignItems: 'center', gap: 8, padding: 40,
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.xl, ...SHADOW.sm,
  },
  emptyTitle: { fontFamily: FONTS.bold, fontSize: 18, color: COLORS.text },
  emptyHint: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.textMuted, textAlign: 'center' },
});
