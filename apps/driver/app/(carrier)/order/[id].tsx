import { Alert, ScrollView, StyleSheet, Text, View, Pressable, Modal, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import * as Haptics from 'expo-haptics';
import { fetcher, apiError } from '@/lib/api';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/Button';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { COLORS, FONTS, RADIUS, SHADOW, STATUS_LABEL } from '@/constants/theme';

type TrackingEvent = { id: string; event: string; notes?: string; createdAt: string };
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
  commissionAmount?: number;
  weight?: number;
  cargoDescription?: string;
  trackingEvents?: TrackingEvent[];
  bids?: { id: string; price: number; notes?: string; status: string; carrierId: string }[];
};

const EVENT_LABEL: Record<string, string> = {
  PICKED_UP: 'تم الاستلام',
  IN_TRANSIT: 'في الطريق',
  DELIVERED: 'تم التوصيل',
  COMPLETED: 'مكتمل',
  ISSUE_REPORTED: 'تم الإبلاغ عن مشكلة',
};

export default function CarrierOrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [confirmModal, setConfirmModal] = useState(false);
  const [delivering, setDelivering] = useState(false);

  const { data: order, isLoading } = useQuery<Order>({
    queryKey: ['carrier-order', id],
    queryFn: () => fetcher(`/orders/${id}`),
    refetchInterval: 15_000,
  });

  const confirmMutation = useMutation({
    mutationFn: () => fetcher(`/orders/${id}/confirm`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['carrier-order', id] });
      queryClient.invalidateQueries({ queryKey: ['carrier-my-orders'] });
      setConfirmModal(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (err) => {
      Alert.alert('خطأ', apiError(err));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    },
  });

  const trackingMutation = useMutation({
    mutationFn: (event: string) =>
      fetcher(`/orders/${id}/tracking`, { method: 'POST', data: { event } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['carrier-order', id] });
      queryClient.invalidateQueries({ queryKey: ['carrier-my-orders'] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (err) => {
      Alert.alert('خطأ', apiError(err));
    },
  });

  const deliverMutation = useMutation({
    mutationFn: () => fetcher(`/orders/${id}/deliver`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['carrier-order', id] });
      queryClient.invalidateQueries({ queryKey: ['carrier-my-orders'] });
      setDelivering(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('تم!', 'تم تأكيد التسليم بنجاح.');
    },
    onError: (err) => {
      Alert.alert('خطأ', apiError(err));
      setDelivering(false);
    },
  });

  if (isLoading || !order) return <LoadingScreen label="جارٍ التحميل..." />;

  const myBid = order.bids?.find((b) => b.status === 'ACCEPTED') ?? order.bids?.[0];
  const showActions = ['ASSIGNED', 'CONFIRMED', 'IN_TRANSIT'].includes(order.status);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.back}>→</Text>
        </Pressable>
        <Text style={styles.headerTitle}>{order.orderNumber}</Text>
        <StatusBadge status={order.status} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Route */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>مسار الشحنة</Text>
          <View style={styles.routeContainer}>
            <View style={styles.routePoint}>
              <View style={[styles.dot, { backgroundColor: COLORS.success }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.routeCity}>{order.originCity}</Text>
                {order.originAddress && <Text style={styles.routeAddr}>{order.originAddress}</Text>}
              </View>
            </View>
            <View style={styles.routeLine} />
            <View style={styles.routePoint}>
              <View style={[styles.dot, { backgroundColor: COLORS.danger }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.routeCity}>{order.destinationCity}</Text>
                {order.destinationAddress && <Text style={styles.routeAddr}>{order.destinationAddress}</Text>}
              </View>
            </View>
          </View>
          {order.scheduledAt && (
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>موعد الاستلام</Text>
              <Text style={styles.metaValue}>
                {new Date(order.scheduledAt).toLocaleString('ar-SA', {
                  year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                })}
              </Text>
            </View>
          )}
        </View>

        {/* Cargo */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>تفاصيل الشحنة</Text>
          {order.cargoDescription && (
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>الوصف</Text>
              <Text style={styles.metaValue}>{order.cargoDescription}</Text>
            </View>
          )}
          {order.weight && (
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>الوزن</Text>
              <Text style={styles.metaValue}>{order.weight} كغ</Text>
            </View>
          )}
        </View>

        {/* Financial */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>المالية</Text>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>قيمة الطلب</Text>
            <Text style={[styles.metaValue, styles.priceText]}>
              {order.totalPrice.toLocaleString('ar-SA')} ر.س
            </Text>
          </View>
          {order.commissionAmount != null && (
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>عمولة المنصة</Text>
              <Text style={styles.metaValue}>{order.commissionAmount.toLocaleString('ar-SA')} ر.س</Text>
            </View>
          )}
          {myBid && (
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>سعر عرضك</Text>
              <Text style={[styles.metaValue, { color: COLORS.success }]}>
                {myBid.price.toLocaleString('ar-SA')} ر.س
              </Text>
            </View>
          )}
        </View>

        {/* Tracking */}
        {order.trackingEvents && order.trackingEvents.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>مسار التتبع</Text>
            {[...order.trackingEvents].reverse().map((ev) => (
              <View key={ev.id} style={styles.eventRow}>
                <View style={styles.eventDot} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.eventLabel}>{EVENT_LABEL[ev.event] ?? ev.event}</Text>
                  {ev.notes && <Text style={styles.eventNotes}>{ev.notes}</Text>}
                  <Text style={styles.eventDate}>
                    {new Date(ev.createdAt).toLocaleString('ar-SA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Action buttons */}
        {showActions && (
          <View style={styles.actions}>
            {order.status === 'ASSIGNED' && (
              <Button label="تأكيد الاستلام" onPress={() => setConfirmModal(true)} />
            )}
            {order.status === 'CONFIRMED' && (
              <Button
                label="بدأت الرحلة"
                variant="success"
                onPress={() => {
                  Alert.alert('بدء الرحلة', 'هل بدأت فعلاً في نقل الشحنة؟', [
                    { text: 'إلغاء', style: 'cancel' },
                    { text: 'نعم، ابدأ', onPress: () => trackingMutation.mutate('PICKED_UP') },
                  ]);
                }}
                loading={trackingMutation.isPending}
              />
            )}
            {order.status === 'IN_TRANSIT' && (
              <Button
                label="تأكيد التسليم"
                variant="success"
                onPress={() => {
                  Alert.alert('تأكيد التسليم', 'هل تم تسليم الشحنة للعميل؟', [
                    { text: 'إلغاء', style: 'cancel' },
                    { text: 'نعم، تم التسليم', onPress: () => { setDelivering(true); deliverMutation.mutate(); } },
                  ]);
                }}
                loading={delivering}
              />
            )}
          </View>
        )}
      </ScrollView>

      {/* Confirm pickup modal */}
      <Modal visible={confirmModal} transparent animationType="fade" onRequestClose={() => setConfirmModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={{ fontSize: 40, textAlign: 'center' }}>✅</Text>
            <Text style={styles.modalTitle}>تأكيد استلام الشحنة</Text>
            <Text style={styles.modalBody}>
              بالضغط على تأكيد، أنت تُقر باستلام الشحنة وستصبح مسؤولاً عنها.
            </Text>
            <View style={{ gap: 8 }}>
              <Button label="تأكيد الاستلام" onPress={() => confirmMutation.mutate()} loading={confirmMutation.isPending} />
              <Button label="إلغاء" variant="outline" onPress={() => setConfirmModal(false)} />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: COLORS.bgCard, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  back: { fontFamily: FONTS.bold, fontSize: 22, color: COLORS.primary },
  headerTitle: { flex: 1, fontFamily: FONTS.bold, fontSize: 16, color: COLORS.text },
  content: { padding: 16, gap: 12, paddingBottom: 32 },

  card: { backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg, padding: 16, gap: 12, ...SHADOW.sm },
  cardTitle: { fontFamily: FONTS.semiBold, fontSize: 14, color: COLORS.textSecondary, marginBottom: 4 },

  routeContainer: { gap: 0 },
  routePoint: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 8 },
  dot: { width: 12, height: 12, borderRadius: 6, marginTop: 3 },
  routeLine: { width: 2, height: 16, backgroundColor: COLORS.border, marginLeft: 5 },
  routeCity: { fontFamily: FONTS.semiBold, fontSize: 15, color: COLORS.text },
  routeAddr: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.textMuted, marginTop: 2 },

  metaRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight,
  },
  metaLabel: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.textMuted },
  metaValue: { fontFamily: FONTS.medium, fontSize: 13, color: COLORS.text, textAlign: 'right', flex: 1, marginLeft: 8 },
  priceText: { fontFamily: FONTS.bold, fontSize: 16, color: COLORS.primary },

  eventRow: { flexDirection: 'row', gap: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  eventDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary, marginTop: 5 },
  eventLabel: { fontFamily: FONTS.semiBold, fontSize: 13, color: COLORS.text },
  eventNotes: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  eventDate: { fontFamily: FONTS.regular, fontSize: 11, color: COLORS.textMuted, marginTop: 2 },

  actions: { gap: 8, marginTop: 4 },

  modalOverlay: { flex: 1, backgroundColor: COLORS.overlay, justifyContent: 'center', padding: 32 },
  modalBox: {
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.xl, padding: 24,
    gap: 12, ...SHADOW.lg,
  },
  modalTitle: { fontFamily: FONTS.bold, fontSize: 18, color: COLORS.text, textAlign: 'center' },
  modalBody: { fontFamily: FONTS.regular, fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22 },
});
