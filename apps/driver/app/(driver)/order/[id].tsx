import { useState } from 'react';
import {
  Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'react-native';
import { api, apiError, fetcher } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { COLORS, FONTS, RADIUS, SHADOW } from '@/constants/theme';
import type { Order } from '@/components/OrderCard';

type FullOrder = Order & {
  cargoType?: string;
  weight?: number;
  pallets?: number;
  requiresRefrigeration?: boolean;
  requiresInsurance?: boolean;
  specialInstructions?: string;
  carrierAmount?: number | null;
  commission?: number | null;
  trackingEvents?: Array<{ id: string; status: string; description: string; createdAt: string }>;
};

const STEP_MAP: Record<string, 1 | 2 | 3> = {
  ASSIGNED:   1, CONFIRMED: 1,
  IN_TRANSIT: 2,
  DELIVERED:  3, COMPLETED: 3,
};

export default function DriverOrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router  = useRouter();
  const qc      = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [deliveryPhoto, setDeliveryPhoto] = useState<string | null>(null);

  const { data: order, isLoading } = useQuery<FullOrder>({
    queryKey: ['order', id],
    queryFn: () => fetcher<FullOrder>(`/orders/${id}`),
    enabled: !!id,
    refetchInterval: 20_000,
  });

  const refetch = () => qc.invalidateQueries({ queryKey: ['order', id] });

  const doAction = async (action: () => Promise<void>, successMsg: string) => {
    setLoading(true);
    try {
      await action();
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await refetch();
      Alert.alert('تم', successMsg);
    } catch (err) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('خطأ', apiError(err));
    } finally {
      setLoading(false);
    }
  };

  const confirmPickup = () => doAction(
    () => api.post(`/orders/${id}/confirm`, {}),
    'تم تأكيد الاستلام — الطلب أصبح مؤكَّداً',
  );

  const startTrip = () => doAction(
    () => api.post(`/orders/${id}/tracking`, { status: 'PICKED_UP', description: 'بدأت الرحلة — الشحنة في الطريق' }),
    'تم تسجيل بداية الرحلة',
  );

  const pickDeliveryPhoto = async () => {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsEditing: false,
    });
    if (!result.canceled) setDeliveryPhoto(result.assets[0].uri);
  };

  const confirmDelivery = () => doAction(
    () => api.post(`/orders/${id}/deliver`, {}),
    'تم تسجيل التسليم — بانتظار تأكيد العميل لتحرير المبلغ',
  );

  if (isLoading || !order) return <LoadingScreen label="جارٍ تحميل الطلب..." />;

  const step = STEP_MAP[order.status] ?? 1;
  const price = order.agreedPrice ?? order.clientBudget;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backArrow}>→</Text>
        </Pressable>
        <Text style={styles.orderNum}>{order.orderNumber}</Text>
        <StatusBadge status={order.status} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Progress bar */}
        <View style={styles.progressCard}>
          {[
            { s: 1 as const, label: 'الاستلام',   emoji: '📍' },
            { s: 2 as const, label: 'في الطريق',  emoji: '🚚' },
            { s: 3 as const, label: 'التسليم',    emoji: '✅' },
          ].map((item, idx, arr) => (
            <View key={item.s} style={styles.stepRow}>
              <View style={[styles.stepCircle, step >= item.s && styles.stepActive]}>
                <Text style={{ fontSize: 16 }}>{item.emoji}</Text>
              </View>
              <Text style={[styles.stepLabel, step >= item.s && styles.stepLabelActive]}>{item.label}</Text>
              {idx < arr.length - 1 && (
                <View style={[styles.stepLine, step > item.s && styles.stepLineActive]} />
              )}
            </View>
          ))}
        </View>

        {/* Route */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>المسار</Text>
          <View style={styles.routeRow}>
            <View style={styles.routePoint}>
              <View style={[styles.dot, { backgroundColor: COLORS.primary }]} />
              <View>
                <Text style={styles.cityText}>{order.originCity}</Text>
                <Text style={styles.addressText} numberOfLines={1}>{order.originAddress}</Text>
              </View>
            </View>
            <View style={styles.routeLine} />
            <View style={styles.routePoint}>
              <View style={[styles.dot, { backgroundColor: COLORS.success }]} />
              <View>
                <Text style={styles.cityText}>{order.destinationCity}</Text>
                <Text style={styles.addressText} numberOfLines={1}>{order.destinationAddress}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Cargo */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>تفاصيل الشحنة</Text>
          <DataRow label="الوصف"   value={order.cargoDescription ?? '—'} />
          <DataRow label="الوزن"   value={`${order.weight ?? '—'} كجم`} />
          <DataRow label="الشاحنة" value={order.requiredTruckType ?? order.cargoType ?? '—'} />
          {order.requiresRefrigeration && <DataRow label="تبريد" value="مطلوب ❄️" />}
          {order.requiresInsurance    && <DataRow label="تأمين" value="مطلوب 🛡" />}
          {order.specialInstructions  && <DataRow label="ملاحظات" value={order.specialInstructions} />}
        </View>

        {/* Financial */}
        {price != null && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>المالية</Text>
            <DataRow label="المبلغ المتفق"    value={`${price.toLocaleString('en-US')} ر.س`} highlight />
            {order.commission   != null && <DataRow label="عمولة المنصة (8%)" value={`${order.commission.toLocaleString('en-US')} ر.س`} />}
            {order.carrierAmount != null && <DataRow label="صافي مستحقّك"     value={`${order.carrierAmount.toLocaleString('en-US')} ر.س`} highlight />}
          </View>
        )}

        {/* Tracking log */}
        {(order.trackingEvents?.length ?? 0) > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>سجل التتبع</Text>
            {order.trackingEvents!.map((ev) => (
              <View key={ev.id} style={styles.trackRow}>
                <View style={styles.trackDot} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.trackDesc}>{ev.description}</Text>
                  <Text style={styles.trackTime}>
                    {new Date(ev.createdAt).toLocaleString('ar-SA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Action buttons */}
      {order.status === 'ASSIGNED' && (
        <View style={styles.actions}>
          <Button label="✅ تأكيد الاستلام" onPress={confirmPickup} loading={loading} />
        </View>
      )}
      {order.status === 'CONFIRMED' && (
        <View style={styles.actions}>
          <Button label="🚚 بدأت الرحلة" onPress={startTrip} loading={loading} variant="success" />
        </View>
      )}
      {order.status === 'IN_TRANSIT' && (
        <View style={styles.actions}>
          <Button label="📦 تأكيد التسليم" onPress={() => setShowDeliveryModal(true)} variant="success" />
        </View>
      )}
      {order.status === 'DELIVERED' && (
        <View style={[styles.actions, { backgroundColor: COLORS.successLight }]}>
          <Text style={styles.deliveredMsg}>✅ تم التسليم — بانتظار تأكيد العميل لتحرير {order.carrierAmount?.toLocaleString('en-US') ?? '...'} ر.س</Text>
        </View>
      )}
      {order.status === 'COMPLETED' && (
        <View style={[styles.actions, { backgroundColor: COLORS.successLight }]}>
          <Text style={styles.deliveredMsg}>🎉 مكتمل — تم تحويل المبلغ إليك</Text>
        </View>
      )}

      {/* Delivery confirmation modal */}
      <Modal visible={showDeliveryModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>تأكيد التسليم</Text>
            <Text style={styles.modalHint}>تأكّد قبل الإرسال:</Text>
            <View style={styles.checklist}>
              {['توقيع المستلم على بوليصة التسليم', 'لا يوجد ضرر ظاهر على الشحنة', 'تم التفريغ الكامل'].map((item) => (
                <Text key={item} style={styles.checkItem}>✓ {item}</Text>
              ))}
            </View>
            {/* Photo capture */}
            <Pressable onPress={pickDeliveryPhoto} style={styles.photoBtn}>
              {deliveryPhoto
                ? <Image source={{ uri: deliveryPhoto }} style={styles.photo} />
                : <>
                    <Text style={styles.photoIcon}>📷</Text>
                    <Text style={styles.photoLabel}>التقط صورة إثبات التسليم (اختياري)</Text>
                  </>
              }
            </Pressable>
            <View style={styles.modalBtns}>
              <Button label="إلغاء" onPress={() => setShowDeliveryModal(false)} variant="outline" style={{ flex: 1 }} />
              <Button
                label="تأكيد التسليم"
                onPress={async () => {
                  setShowDeliveryModal(false);
                  await confirmDelivery();
                }}
                loading={loading}
                variant="success"
                style={{ flex: 2 }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function DataRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={dStyles.row}>
      <Text style={dStyles.label}>{label}</Text>
      <Text style={[dStyles.value, highlight && dStyles.highlight]}>{value}</Text>
    </View>
  );
}
const dStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  label: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.textMuted },
  value: { fontFamily: FONTS.medium, fontSize: 13, color: COLORS.text, maxWidth: '60%', textAlign: 'right' },
  highlight: { fontFamily: FONTS.bold, color: COLORS.primary },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  topBar: {
    flexDirection: 'row', alignItems: 'center', gap: 12, justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: COLORS.bgCard, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  backBtn: { padding: 4 },
  backArrow: { fontFamily: FONTS.bold, fontSize: 20, color: COLORS.primary },
  orderNum: { fontFamily: FONTS.semiBold, fontSize: 14, color: COLORS.textSecondary, flex: 1, textAlign: 'center' },

  scroll: { flex: 1 },
  content: { padding: 16, gap: 12, paddingBottom: 20 },

  progressCard: {
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg, padding: 20,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', ...SHADOW.sm,
  },
  stepRow: { alignItems: 'center', gap: 4 },
  stepCircle: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: COLORS.borderLight, justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: COLORS.border,
  },
  stepActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  stepLabel: { fontFamily: FONTS.regular, fontSize: 10, color: COLORS.textMuted },
  stepLabelActive: { fontFamily: FONTS.semiBold, color: COLORS.primary },
  stepLine: { flex: 1, height: 2, backgroundColor: COLORS.border, marginHorizontal: 4, minWidth: 24 },
  stepLineActive: { backgroundColor: COLORS.primary },

  card: { backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg, padding: 16, gap: 4, ...SHADOW.sm },
  cardTitle: { fontFamily: FONTS.semiBold, fontSize: 14, color: COLORS.textSecondary, marginBottom: 8 },

  routeRow: { gap: 8 },
  routePoint: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 4, flexShrink: 0 },
  routeLine: { width: 2, height: 20, backgroundColor: COLORS.border, marginStart: 4 },
  cityText: { fontFamily: FONTS.semiBold, fontSize: 15, color: COLORS.text },
  addressText: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.textMuted },

  trackRow: { flexDirection: 'row', gap: 10, paddingVertical: 6 },
  trackDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary, marginTop: 4, flexShrink: 0 },
  trackDesc: { fontFamily: FONTS.medium, fontSize: 13, color: COLORS.text },
  trackTime: { fontFamily: FONTS.regular, fontSize: 11, color: COLORS.textMuted, marginTop: 2 },

  actions: {
    padding: 16, backgroundColor: COLORS.bgCard,
    borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  deliveredMsg: { fontFamily: FONTS.semiBold, fontSize: 14, color: COLORS.success, textAlign: 'center', padding: 8 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: COLORS.overlay, justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: COLORS.bgCard, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl,
    padding: 24, gap: 12,
  },
  modalTitle: { fontFamily: FONTS.bold, fontSize: 18, color: COLORS.text, textAlign: 'center' },
  modalHint: { fontFamily: FONTS.medium, fontSize: 13, color: COLORS.textSecondary },
  checklist: { gap: 6 },
  checkItem: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.text, paddingStart: 8 },
  photoBtn: {
    borderRadius: RADIUS.md, borderWidth: 2, borderStyle: 'dashed', borderColor: COLORS.border,
    padding: 16, alignItems: 'center', gap: 8, backgroundColor: COLORS.bg,
  },
  photoIcon: { fontSize: 32 },
  photoLabel: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.textMuted, textAlign: 'center' },
  photo: { width: '100%', height: 160, borderRadius: RADIUS.md, resizeMode: 'cover' },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 4 },
});
