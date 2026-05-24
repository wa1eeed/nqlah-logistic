import { useState } from 'react';
import {
  Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView,
  StyleSheet, Text, TextInput, View,
} from 'react-native';
import { Link } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useAuthStore } from '@/lib/auth';
import { apiError } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { COLORS, FONTS, RADIUS, SHADOW } from '@/constants/theme';

export default function LoginScreen() {
  const { login } = useAuthStore();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!phone.trim() || !password) {
      Alert.alert('تنبيه', 'أدخل رقم الجوال وكلمة المرور');
      return;
    }
    setLoading(true);
    try {
      await login(phone.trim(), password);
    } catch (err) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('فشل تسجيل الدخول', apiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoBox}>
            <Text style={styles.logoText}>ن</Text>
          </View>
          <Text style={styles.appName}>نقلة</Text>
          <Text style={styles.subtitle}>منصة النقل اللوجستي</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.title}>تسجيل الدخول</Text>
          <Text style={styles.hint}>للسائقين والناقلين</Text>

          <View style={styles.fields}>
            {/* Phone */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>رقم الجوال</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="05xxxxxxxx"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="phone-pad"
                textContentType="telephoneNumber"
                autoComplete="tel"
                textAlign="right"
                returnKeyType="next"
              />
            </View>

            {/* Password */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>كلمة المرور</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  placeholderTextColor={COLORS.textMuted}
                  secureTextEntry={!showPassword}
                  textContentType="password"
                  autoComplete="password"
                  textAlign="right"
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                />
                <Pressable onPress={() => setShowPassword((v) => !v)} style={styles.eyeBtn}>
                  <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁'}</Text>
                </Pressable>
              </View>
            </View>
          </View>

          <Button label="دخول" onPress={handleLogin} loading={loading} style={styles.loginBtn} />

          <Link href="/(auth)/register" asChild>
            <Pressable style={styles.registerLink}>
              <Text style={styles.registerText}>
                ناقل فرد؟ <Text style={styles.registerCta}>أنشئ حساباً</Text>
              </Text>
            </Pressable>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    backgroundColor: COLORS.bg,
    paddingHorizontal: 20,
    paddingVertical: 48,
    justifyContent: 'center',
    gap: 32,
  },
  header: { alignItems: 'center', gap: 8 },
  logoBox: {
    width: 72, height: 72, borderRadius: RADIUS.xl,
    backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center',
    ...SHADOW.md,
  },
  logoText: { fontFamily: FONTS.bold, fontSize: 32, color: COLORS.white },
  appName: { fontFamily: FONTS.bold, fontSize: 28, color: COLORS.text },
  subtitle: { fontFamily: FONTS.regular, fontSize: 14, color: COLORS.textMuted },

  card: {
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.xl,
    padding: 24, gap: 16, ...SHADOW.lg,
  },
  title: { fontFamily: FONTS.bold, fontSize: 20, color: COLORS.text, textAlign: 'center' },
  hint: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.textMuted, textAlign: 'center', marginTop: -8 },

  fields: { gap: 16 },
  fieldGroup: { gap: 6 },
  label: { fontFamily: FONTS.medium, fontSize: 14, color: COLORS.text },
  input: {
    height: 50, backgroundColor: COLORS.bg, borderRadius: RADIUS.md,
    borderWidth: 1.5, borderColor: COLORS.border,
    paddingHorizontal: 14, fontFamily: FONTS.regular, fontSize: 15, color: COLORS.text,
  },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eyeBtn: { padding: 8 },
  eyeIcon: { fontSize: 18 },

  loginBtn: { marginTop: 4 },
  registerLink: { alignItems: 'center', paddingVertical: 8 },
  registerText: { fontFamily: FONTS.regular, fontSize: 14, color: COLORS.textMuted },
  registerCta: { fontFamily: FONTS.semiBold, color: COLORS.primary },
});
