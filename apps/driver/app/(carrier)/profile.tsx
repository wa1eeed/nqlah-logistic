import { Alert, ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/lib/auth';
import { Button } from '@/components/ui/Button';
import { COLORS, FONTS, RADIUS, SHADOW } from '@/constants/theme';
import { useState } from 'react';

export default function CarrierProfileScreen() {
  const { user, logout } = useAuthStore();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = () => {
    Alert.alert('تسجيل الخروج', 'هل تريد تسجيل الخروج؟', [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'خروج', style: 'destructive',
        onPress: async () => {
          setLoggingOut(true);
          await logout();
          setLoggingOut(false);
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.firstName?.[0] ?? ''}{user?.lastName?.[0] ?? ''}
            </Text>
          </View>
          <Text style={styles.name}>{user?.firstName} {user?.lastName}</Text>
          <Text style={styles.phone}>{user?.phone}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>ناقل فرد</Text>
          </View>
        </View>

        {/* Info */}
        <View style={styles.card}>
          <InfoRow label="رقم الجوال" value={user?.phone ?? '—'} />
          <InfoRow label="البريد الإلكتروني" value={user?.email ?? '—'} />
          <InfoRow label="الدور" value="ناقل فرد (Carrier)" />
        </View>

        {/* Actions */}
        <View style={styles.card}>
          <Pressable style={styles.actionRow}>
            <Text style={styles.actionIcon}>🏢</Text>
            <Text style={styles.actionLabel}>معلومات الشركة</Text>
            <Text style={styles.chevron}>‹</Text>
          </Pressable>
          <Pressable style={styles.actionRow}>
            <Text style={styles.actionIcon}>📄</Text>
            <Text style={styles.actionLabel}>الوثائق والتراخيص</Text>
            <Text style={styles.chevron}>‹</Text>
          </Pressable>
          <Pressable style={styles.actionRow}>
            <Text style={styles.actionIcon}>🔔</Text>
            <Text style={styles.actionLabel}>الإشعارات</Text>
            <Text style={styles.chevron}>‹</Text>
          </Pressable>
          <Pressable style={styles.actionRow}>
            <Text style={styles.actionIcon}>🔒</Text>
            <Text style={styles.actionLabel}>تغيير كلمة المرور</Text>
            <Text style={styles.chevron}>‹</Text>
          </Pressable>
          <Pressable style={styles.actionRow}>
            <Text style={styles.actionIcon}>📞</Text>
            <Text style={styles.actionLabel}>الدعم الفني</Text>
            <Text style={styles.chevron}>‹</Text>
          </Pressable>
        </View>

        <Button label="تسجيل الخروج" onPress={handleLogout} variant="danger" loading={loggingOut} />

        <Text style={styles.version}>نقلة · v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={iStyles.row}>
      <Text style={iStyles.label}>{label}</Text>
      <Text style={iStyles.value}>{value}</Text>
    </View>
  );
}

const iStyles = StyleSheet.create({
  row: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight,
  },
  label: { fontFamily: FONTS.regular, fontSize: 14, color: COLORS.textMuted },
  value: { fontFamily: FONTS.medium, fontSize: 14, color: COLORS.text, textAlign: 'right', flex: 1, marginLeft: 8 },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 20, gap: 16, paddingBottom: 40 },
  avatarSection: { alignItems: 'center', gap: 8, paddingVertical: 20 },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { fontFamily: FONTS.bold, fontSize: 28, color: COLORS.white },
  name: { fontFamily: FONTS.bold, fontSize: 20, color: COLORS.text },
  phone: { fontFamily: FONTS.regular, fontSize: 14, color: COLORS.textMuted },
  roleBadge: {
    backgroundColor: COLORS.primaryLight, borderRadius: RADIUS.full,
    paddingHorizontal: 16, paddingVertical: 4,
  },
  roleText: { fontFamily: FONTS.semiBold, fontSize: 12, color: COLORS.primary },
  card: { backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg, padding: 16, ...SHADOW.sm },
  actionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight,
  },
  actionIcon: { fontSize: 20 },
  actionLabel: { fontFamily: FONTS.medium, fontSize: 14, color: COLORS.text, flex: 1 },
  chevron: {
    fontFamily: FONTS.regular, fontSize: 20, color: COLORS.textMuted,
    transform: [{ rotate: '180deg' }],
  },
  version: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.textMuted, textAlign: 'center', marginTop: 8 },
});
