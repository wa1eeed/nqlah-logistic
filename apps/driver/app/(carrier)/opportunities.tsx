import { RefreshControl, ScrollView, StyleSheet, Text, View, Pressable, TextInput, Modal, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import * as Haptics from 'expo-haptics';
import { fetcher, apiError } from '@/lib/api';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/Button';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { COLORS, FONTS, RADIUS, SHADOW, STATUS_LABEL, STATUS_COLOR } from '@/constants/theme';

type Order = {
  id: string;
  orderNumber: string;
  status: string;
  originCity: string;
  destinationCity: string;
  originAddress?: string;
  destinationAddress?: string;
  scheduledAt?: string;
  totalPrice: number;
  weight?: number;
  cargoDescription?: string;
  bids?: { id: string; price: number; carrierId: string }[];
};

type BidPayload = { price: number; notes?: string };

export default function OpportunitiesScreen() {
  const queryClient = useQueryClient();
  const [bidModal, setBidModal] = useState<{ open: boolean; order: Order | null }>({ open: false, order: null });
  const [bidPrice, setBidPrice] = useState('');
  const [bidNotes, setBidNotes] = useState('');
  const [error, setError] = useState('');

  const { data: orders, isLoading, refetch, isRefetching } = useQuery<Order[]>({
    queryKey: ['carrier-opportunities'],
    queryFn: async () => {
      const res = await fetcher<any>('/orders?status=PENDING&limit=30');
      return Array.isArray(res) ? res : res?.items ?? [];
    },
    refetchInterval: 30_000,
  });

  const bidMutation = useMutation({
    mutationFn: (payload: BidPayload) =>
      fetcher(`/orders/${bidModal.order?.id}/bid`, { method: 'POST', data: payload }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['carrier-opportunities'] });
      closeBidModal();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (err) => {
      setError(apiError(err));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    },
  });

  const openBidModal = (order: Order) => {
    setBidModal({ open: true, order });
    setBidPrice(String(order.totalPrice));
    setBidNotes('');
    setError('');
  };

  const closeBidModal = () => {
    setBidModal({ open: false, order: null });
    setBidPrice('');
    setBidNotes('');
    setError('');
  };

  const submitBid = () => {
    const price = Number(bidPrice);
    if (!price || price <= 0) { setError('أدخل سعراً صحيحاً'); return; }
    bidMutation.mutate({ price, notes: bidNotes || undefined });
  };

  if (isLoading) return <LoadingScreen label="جارٍ تحميل الفرص..." />;

  const list = orders ?? [];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>الفرص المتاحة</Text>
        <Text style={styles.count}>{list.length} طلب</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {list.length === 0 && (
          <View style={styles.emptyCard}>
            <Text style={{ fontSize: 48 }}>🔍</Text>
            <Text style={styles.emptyTitle}>لا توجد فرص حالياً</Text>
            <Text style={styles.emptyHint}>اسحب للأسفل لتحديث القائمة</Text>
          </View>
        )}

        {list.map((order) => (
          <Pressable key={order.id} style={styles.card} onPress={() => openBidModal(order)}>
            <View style={styles.cardTop}>
              <Text style={styles.orderNum}>{order.orderNumber}</Text>
              <StatusBadge status={order.status} />
            </View>

            <View style={styles.routeRow}>
              <View style={styles.cityPill}>
                <Text style={styles.cityText}>{order.originCity}</Text>
              </View>
              <Text style={styles.arrow}>←</Text>
              <View style={styles.cityPill}>
                <Text style={styles.cityText}>{order.destinationCity}</Text>
              </View>
            </View>

            {order.cargoDescription && (
              <Text style={styles.cargo} numberOfLines={1}>{order.cargoDescription}</Text>
            )}

            <View style={styles.cardBottom}>
              <View style={styles.meta}>
                {order.weight && <Text style={styles.metaText}>⚖️ {order.weight} كغ</Text>}
                {order.scheduledAt && (
                  <Text style={styles.metaText}>
                    📅 {new Date(order.scheduledAt).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' })}
                  </Text>
                )}
              </View>
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>السعر المقترح</Text>
                <Text style={styles.price}>{order.totalPrice.toLocaleString('ar-SA')} ر.س</Text>
              </View>
            </View>

            <View style={styles.bidBtn}>
              <Text style={styles.bidBtnText}>تقديم عرض ←</Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>

      {/* Bid Modal */}
      <Modal visible={bidModal.open} transparent animationType="slide" onRequestClose={closeBidModal}>
        <Pressable style={styles.overlay} onPress={closeBidModal} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.sheetTitle}>تقديم عرض سعر</Text>

          {bidModal.order && (
            <View style={styles.orderSummary}>
              <Text style={styles.summaryText}>
                {bidModal.order.originCity} ← {bidModal.order.destinationCity}
              </Text>
              <Text style={styles.summaryNum}>{bidModal.order.orderNumber}</Text>
            </View>
          )}

          <View style={styles.field}>
            <Text style={styles.label}>سعرك (ر.س) *</Text>
            <TextInput
              style={styles.input}
              value={bidPrice}
              onChangeText={setBidPrice}
              keyboardType="numeric"
              placeholder="0.00"
              placeholderTextColor={COLORS.textMuted}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>ملاحظات (اختياري)</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              value={bidNotes}
              onChangeText={setBidNotes}
              multiline
              numberOfLines={3}
              placeholder="أي معلومات إضافية تريد إرسالها..."
              placeholderTextColor={COLORS.textMuted}
              textAlignVertical="top"
            />
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <View style={styles.sheetActions}>
            <Button label="إرسال العرض" onPress={submitBid} loading={bidMutation.isPending} />
            <Button label="إلغاء" onPress={closeBidModal} variant="outline" />
          </View>
        </View>
      </Modal>
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
  title: { fontFamily: FONTS.bold, fontSize: 18, color: COLORS.text },
  count: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.textMuted },
  content: { padding: 16, gap: 12, paddingBottom: 32 },

  emptyCard: {
    alignItems: 'center', gap: 8, padding: 40, marginTop: 40,
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.xl, ...SHADOW.sm,
  },
  emptyTitle: { fontFamily: FONTS.bold, fontSize: 18, color: COLORS.text },
  emptyHint: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.textMuted, textAlign: 'center' },

  card: {
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg,
    padding: 16, gap: 10, ...SHADOW.sm,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderNum: { fontFamily: FONTS.semiBold, fontSize: 13, color: COLORS.textMuted },

  routeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cityPill: {
    flex: 1, backgroundColor: COLORS.bg, borderRadius: RADIUS.sm,
    paddingHorizontal: 10, paddingVertical: 6, alignItems: 'center',
  },
  cityText: { fontFamily: FONTS.semiBold, fontSize: 13, color: COLORS.text },
  arrow: { fontFamily: FONTS.bold, fontSize: 18, color: COLORS.textMuted },

  cargo: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.textSecondary },

  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  meta: { gap: 4 },
  metaText: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.textMuted },
  priceRow: { alignItems: 'flex-end' },
  priceLabel: { fontFamily: FONTS.regular, fontSize: 11, color: COLORS.textMuted },
  price: { fontFamily: FONTS.bold, fontSize: 16, color: COLORS.primary },

  bidBtn: {
    backgroundColor: COLORS.primaryLight, borderRadius: RADIUS.sm,
    paddingVertical: 8, alignItems: 'center',
  },
  bidBtnText: { fontFamily: FONTS.semiBold, fontSize: 13, color: COLORS.primary },

  // Modal
  overlay: { flex: 1, backgroundColor: COLORS.overlay },
  sheet: {
    backgroundColor: COLORS.bgCard, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl,
    padding: 24, gap: 16, paddingBottom: 40,
  },
  handle: { width: 40, height: 4, backgroundColor: COLORS.border, borderRadius: 2, alignSelf: 'center', marginBottom: 4 },
  sheetTitle: { fontFamily: FONTS.bold, fontSize: 18, color: COLORS.text, textAlign: 'center' },

  orderSummary: {
    backgroundColor: COLORS.bg, borderRadius: RADIUS.md, padding: 12,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  summaryText: { fontFamily: FONTS.semiBold, fontSize: 14, color: COLORS.text },
  summaryNum: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.textMuted },

  field: { gap: 6 },
  label: { fontFamily: FONTS.semiBold, fontSize: 13, color: COLORS.textSecondary },
  input: {
    backgroundColor: COLORS.bg, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: 14, paddingVertical: 12,
    fontFamily: FONTS.regular, fontSize: 15, color: COLORS.text,
    textAlign: 'right',
  },
  textarea: { height: 80, paddingTop: 12 },
  errorText: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.danger, textAlign: 'center' },
  sheetActions: { gap: 8, marginTop: 4 },
});
