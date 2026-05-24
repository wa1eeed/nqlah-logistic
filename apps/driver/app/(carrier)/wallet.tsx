import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { fetcher } from '@/lib/api';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { COLORS, FONTS, RADIUS, SHADOW } from '@/constants/theme';

type WalletSummary = {
  balance: number;
  pendingPayout: number;
  totalEarned: number;
  transactions?: {
    id: string;
    type: 'CREDIT' | 'DEBIT' | 'COMMISSION';
    amount: number;
    description?: string;
    createdAt: string;
  }[];
};

const TX_ICON: Record<string, string> = {
  CREDIT: '⬆️',
  DEBIT: '⬇️',
  COMMISSION: '💸',
};

export default function WalletScreen() {
  const { data: wallet, isLoading, refetch, isRefetching } = useQuery<WalletSummary>({
    queryKey: ['carrier-wallet'],
    queryFn: () => fetcher('/wallet'),
    retry: false,
  });

  if (isLoading) return <LoadingScreen label="جارٍ تحميل المحفظة..." />;

  const balance = wallet?.balance ?? 0;
  const pending = wallet?.pendingPayout ?? 0;
  const total = wallet?.totalEarned ?? 0;
  const txs = wallet?.transactions ?? [];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>المحفظة</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Balance card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>الرصيد المتاح</Text>
          <Text style={styles.balanceAmount}>{balance.toLocaleString('ar-SA')} ر.س</Text>

          <View style={styles.divider} />

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{pending.toLocaleString('ar-SA')} ر.س</Text>
              <Text style={styles.statLabel}>قيد الصرف</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{total.toLocaleString('ar-SA')} ر.س</Text>
              <Text style={styles.statLabel}>إجمالي الأرباح</Text>
            </View>
          </View>
        </View>

        {/* Coming soon notice */}
        {!wallet && (
          <View style={styles.noticeCard}>
            <Text style={{ fontSize: 36, textAlign: 'center' }}>🚧</Text>
            <Text style={styles.noticeTitle}>قريباً</Text>
            <Text style={styles.noticeText}>
              ميزة المحفظة قيد التطوير. ستتمكن قريباً من متابعة أرباحك وسحب مستحقاتك مباشرةً من هنا.
            </Text>
          </View>
        )}

        {/* Transactions */}
        {txs.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>آخر المعاملات</Text>
            {txs.map((tx) => (
              <View key={tx.id} style={styles.txRow}>
                <Text style={styles.txIcon}>{TX_ICON[tx.type] ?? '💳'}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.txDesc}>{tx.description ?? tx.type}</Text>
                  <Text style={styles.txDate}>
                    {new Date(tx.createdAt).toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </Text>
                </View>
                <Text style={[styles.txAmount, tx.type === 'DEBIT' || tx.type === 'COMMISSION' ? styles.txDebit : styles.txCredit]}>
                  {tx.type === 'DEBIT' || tx.type === 'COMMISSION' ? '-' : '+'}{tx.amount.toLocaleString('ar-SA')} ر.س
                </Text>
              </View>
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
    paddingHorizontal: 20, paddingVertical: 16,
    backgroundColor: COLORS.bgCard, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  title: { fontFamily: FONTS.bold, fontSize: 18, color: COLORS.text },
  content: { padding: 16, gap: 16, paddingBottom: 32 },

  balanceCard: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.xl,
    padding: 24, gap: 0, ...SHADOW.md,
  },
  balanceLabel: { fontFamily: FONTS.regular, fontSize: 14, color: 'rgba(255,255,255,0.8)' },
  balanceAmount: { fontFamily: FONTS.bold, fontSize: 36, color: COLORS.white, marginTop: 4 },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginVertical: 20 },
  statsRow: { flexDirection: 'row', alignItems: 'center' },
  statItem: { flex: 1, alignItems: 'center', gap: 4 },
  statDivider: { width: 1, height: 36, backgroundColor: 'rgba(255,255,255,0.2)' },
  statValue: { fontFamily: FONTS.bold, fontSize: 16, color: COLORS.white },
  statLabel: { fontFamily: FONTS.regular, fontSize: 12, color: 'rgba(255,255,255,0.7)' },

  noticeCard: {
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.xl,
    padding: 32, gap: 8, alignItems: 'center', ...SHADOW.sm,
  },
  noticeTitle: { fontFamily: FONTS.bold, fontSize: 18, color: COLORS.text, marginTop: 8 },
  noticeText: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.textMuted, textAlign: 'center', lineHeight: 22 },

  card: { backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg, padding: 16, gap: 0, ...SHADOW.sm },
  cardTitle: { fontFamily: FONTS.semiBold, fontSize: 14, color: COLORS.textSecondary, marginBottom: 12 },

  txRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight,
  },
  txIcon: { fontSize: 20 },
  txDesc: { fontFamily: FONTS.medium, fontSize: 13, color: COLORS.text },
  txDate: { fontFamily: FONTS.regular, fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  txAmount: { fontFamily: FONTS.bold, fontSize: 14 },
  txCredit: { color: COLORS.success },
  txDebit: { color: COLORS.danger },
});
