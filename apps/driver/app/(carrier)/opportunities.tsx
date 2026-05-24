import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
  TextInput,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { fetcher, apiError } from '@/lib/api';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/Button';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { COLORS, FONTS, RADIUS, SHADOW } from '@/constants/theme';
import { MOCK_OPPORTUNITIES } from '@/lib/mockData';

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
  clientBudget?: number | null;
  weight?: number;
  cargoDescription?: string;
  requiredTruckType?: string;
  bids?: { id: string; price: number; carrierId: string }[];
};

type BidPayload = { price: number; notes?: string };

function cargoIcon(description?: string): React.ComponentProps<typeof Ionicons>['name'] {
  if (!description) return 'cube-outline';
  if (description.includes('إلكترون') || description.includes('حاسب') || description.includes('شاش')) return 'laptop-outline';
  if (description.includes('طب') || description.includes('صيدل')) return 'medkit-outline';
  if (description.includes('بناء') || description.includes('حديد') || description.includes('إسمنت') || description.includes('بلاط')) return 'construct-outline';
  if (description.includes('أثاث') || description.includes('ديكور')) return 'home-outline';
  if (description.includes('غذا') || description.includes('عطور') || description.includes('توابل')) return 'nutrition-outline';
  if (description.includes('ملابس') || description.includes('أقمشة')) return 'shirt-outline';
  return 'cube-outline';
}

export default function OpportunitiesScreen() {
  const queryClient = useQueryClient();
  const [bidModal, setBidModal] = useState<{ open: boolean; order: Order | null }>({
    open: false,
    order: null,
  });
  const [bidPrice, setBidPrice] = useState('');
  const [bidNotes, setBidNotes] = useState('');
  const [error, setError] = useState('');

  const { data: orders, isLoading, refetch, isRefetching } = useQuery<Order[]>({
    queryKey: ['carrier-opportunities'],
    queryFn: async () => {
      if (__DEV__) return MOCK_OPPORTUNITIES as unknown as Order[];
      const res = await fetcher<any>('/orders?status=PENDING&limit=30');
      return Array.isArray(res) ? res : res?.items ?? [];
    },
    refetchInterval: __DEV__ ? false : 30_000,
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
    setBidPrice(String(order.clientBudget ?? order.totalPrice));
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
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>الفرص المتاحة</Text>
          <Text style={styles.subtitle}>اختر وقدّم عرض سعر</Text>
        </View>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{list.length}</Text>
          <Text style={styles.countLabel}>فرصة</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        {list.length === 0 && (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="search-outline" size={44} color={COLORS.textMuted} />
            </View>
            <Text style={styles.emptyTitle}>لا توجد فرص حالياً</Text>
            <Text style={styles.emptyHint}>اسحب للأسفل لتحديث القائمة</Text>
          </View>
        )}

        {list.map((order) => {
          const budget = order.clientBudget ?? order.totalPrice;
          const icon = cargoIcon(order.cargoDescription);
          const bidCount = order.bids?.length ?? 0;
          const scheduledDate = order.scheduledAt
            ? new Date(order.scheduledAt).toLocaleDateString('ar-SA', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              })
            : null;

          return (
            <Pressable
              key={order.id}
              style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
              onPress={() => openBidModal(order)}
            >
              {/* Card Header */}
              <View style={styles.cardHeader}>
                <View style={styles.orderNumRow}>
                  <Text style={styles.orderNum}>{order.orderNumber}</Text>
                  {bidCount > 0 && (
                    <View style={styles.bidsChip}>
                      <Ionicons name="people" size={11} color={COLORS.warning} />
                      <Text style={styles.bidsChipText}>{bidCount} عروض</Text>
                    </View>
                  )}
                </View>
                <StatusBadge status={order.status} />
              </View>

              {/* Route */}
              <View style={styles.routeContainer}>
                <View style={styles.routeEndpoint}>
                  <View style={[styles.routeDot, { backgroundColor: COLORS.primary }]} />
                  <View style={styles.routeTextBlock}>
                    <Text style={styles.routeLabel}>من</Text>
                    <Text style={styles.routeCity}>{order.originCity}</Text>
                    {order.originAddress && (
                      <Text style={styles.routeAddress} numberOfLines={1}>
                        {order.originAddress}
                      </Text>
                    )}
                  </View>
                </View>

                <View style={styles.routeConnector}>
                  <View style={styles.routeConnectorLine} />
                  <Ionicons name="arrow-back" size={14} color={COLORS.textMuted} />
                  <View style={styles.routeConnectorLine} />
                </View>

                <View style={styles.routeEndpoint}>
                  <View style={[styles.routeDot, { backgroundColor: COLORS.success }]} />
                  <View style={styles.routeTextBlock}>
                    <Text style={styles.routeLabel}>إلى</Text>
                    <Text style={styles.routeCity}>{order.destinationCity}</Text>
                    {order.destinationAddress && (
                      <Text style={styles.routeAddress} numberOfLines={1}>
                        {order.destinationAddress}
                      </Text>
                    )}
                  </View>
                </View>
              </View>

              {/* Cargo Info */}
              {order.cargoDescription && (
                <View style={styles.cargoRow}>
                  <Ionicons name={icon} size={15} color={COLORS.textMuted} />
                  <Text style={styles.cargoText} numberOfLines={1}>
                    {order.cargoDescription}
                  </Text>
                  {order.requiredTruckType && (
                    <View style={styles.truckChip}>
                      <Text style={styles.truckChipText}>{order.requiredTruckType}</Text>
                    </View>
                  )}
                </View>
              )}

              {/* Meta & Price */}
              <View style={styles.cardFooter}>
                <View style={styles.metaGroup}>
                  {order.weight && (
                    <View style={styles.metaItem}>
                      <Ionicons name="scale-outline" size={13} color={COLORS.textMuted} />
                      <Text style={styles.metaText}>{order.weight.toLocaleString('ar')} كغ</Text>
                    </View>
                  )}
                  {scheduledDate && (
                    <View style={styles.metaItem}>
                      <Ionicons name="calendar-outline" size={13} color={COLORS.textMuted} />
                      <Text style={styles.metaText}>{scheduledDate}</Text>
                    </View>
                  )}
                </View>
                <View style={styles.priceBlock}>
                  <Text style={styles.priceLabel}>الميزانية</Text>
                  <Text style={styles.price}>
                    {budget.toLocaleString('ar-SA')}
                    <Text style={styles.priceCurrency}> ر.س</Text>
                  </Text>
                </View>
              </View>

              {/* CTA */}
              <View style={styles.ctaRow}>
                <Ionicons name="send" size={14} color={COLORS.primary} />
                <Text style={styles.ctaText}>تقديم عرض سعر</Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Bid Modal */}
      <Modal
        visible={bidModal.open}
        transparent
        animationType="slide"
        onRequestClose={closeBidModal}
      >
        <Pressable style={styles.overlay} onPress={closeBidModal} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.sheetTitle}>تقديم عرض سعر</Text>

          {bidModal.order && (
            <View style={styles.orderSummary}>
              <View style={styles.summaryRoute}>
                <Text style={styles.summaryCity}>{bidModal.order.originCity}</Text>
                <Ionicons name="arrow-back" size={14} color={COLORS.textMuted} />
                <Text style={styles.summaryCity}>{bidModal.order.destinationCity}</Text>
              </View>
              <Text style={styles.summaryNum}>{bidModal.order.orderNumber}</Text>
            </View>
          )}

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>سعرك (ر.س) *</Text>
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
            <Text style={styles.fieldLabel}>ملاحظات (اختياري)</Text>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORS.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: { fontFamily: FONTS.bold, fontSize: 18, color: COLORS.text },
  subtitle: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  countBadge: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: RADIUS.lg,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: 'center',
  },
  countText: { fontFamily: FONTS.bold, fontSize: 20, color: COLORS.primary },
  countLabel: { fontFamily: FONTS.regular, fontSize: 10, color: COLORS.primary },

  content: { padding: 16, gap: 12, paddingBottom: 32 },

  emptyCard: {
    alignItems: 'center',
    gap: 10,
    padding: 48,
    marginTop: 40,
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
  },

  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    padding: 16,
    gap: 12,
    ...SHADOW.md,
  },
  cardPressed: { opacity: 0.92 },

  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderNumRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  orderNum: { fontFamily: FONTS.semiBold, fontSize: 12, color: COLORS.textMuted },
  bidsChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: COLORS.warningLight,
    borderRadius: RADIUS.full,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  bidsChipText: { fontFamily: FONTS.medium, fontSize: 10, color: COLORS.warning },

  routeContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: COLORS.bg,
    borderRadius: RADIUS.md,
    padding: 12,
  },
  routeEndpoint: { flex: 1, flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  routeDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  routeTextBlock: { flex: 1, gap: 1 },
  routeLabel: { fontFamily: FONTS.regular, fontSize: 10, color: COLORS.textMuted },
  routeCity: { fontFamily: FONTS.bold, fontSize: 15, color: COLORS.text },
  routeAddress: { fontFamily: FONTS.regular, fontSize: 11, color: COLORS.textMuted },

  routeConnector: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingTop: 14,
    width: 32,
  },
  routeConnectorLine: { flex: 1, width: 1, backgroundColor: COLORS.border, maxHeight: 10 },

  cargoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  cargoText: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  truckChip: {
    backgroundColor: COLORS.infoLight,
    borderRadius: RADIUS.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  truckChipText: { fontFamily: FONTS.medium, fontSize: 10, color: COLORS.info },

  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    paddingTop: 10,
  },
  metaGroup: { gap: 5 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.textMuted },
  priceBlock: { alignItems: 'flex-end' },
  priceLabel: { fontFamily: FONTS.regular, fontSize: 11, color: COLORS.textMuted },
  price: { fontFamily: FONTS.bold, fontSize: 18, color: COLORS.primary },
  priceCurrency: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.textMuted },

  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.primaryLight,
    borderRadius: RADIUS.md,
    paddingVertical: 9,
  },
  ctaText: { fontFamily: FONTS.semiBold, fontSize: 13, color: COLORS.primary },

  // Modal
  overlay: { flex: 1, backgroundColor: COLORS.overlay },
  sheet: {
    backgroundColor: COLORS.bgCard,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: 24,
    gap: 16,
    paddingBottom: 40,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 4,
  },
  sheetTitle: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: COLORS.text,
    textAlign: 'center',
  },
  orderSummary: {
    backgroundColor: COLORS.bg,
    borderRadius: RADIUS.md,
    padding: 14,
    gap: 6,
  },
  summaryRoute: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  summaryCity: { fontFamily: FONTS.semiBold, fontSize: 14, color: COLORS.text },
  summaryNum: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.textMuted },
  field: { gap: 6 },
  fieldLabel: { fontFamily: FONTS.semiBold, fontSize: 13, color: COLORS.textSecondary },
  input: {
    backgroundColor: COLORS.bg,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: FONTS.regular,
    fontSize: 15,
    color: COLORS.text,
    textAlign: 'right',
  },
  textarea: { height: 80, paddingTop: 12 },
  errorText: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.danger,
    textAlign: 'center',
  },
  sheetActions: { gap: 8, marginTop: 4 },
});
