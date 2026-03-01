import { useState } from 'react';
import {
  View, Text, StyleSheet, KeyboardAvoidingView, Platform, Alert, ScrollView,
} from 'react-native';
import { router, Link } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../src/store/auth.store';
import { Logo } from '../../src/components/Logo';
import { Input } from '../../src/components/Input';
import { Button } from '../../src/components/Button';
import { colors } from '../../src/theme/colors';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterScreen() {
  const { t } = useTranslation();
  const { register } = useAuthStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});

  const clearError = (field: string) => {
    if (errors[field]) setErrors(e => ({ ...e, [field]: undefined }));
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) {
      newErrors.name = t('validation.required', { field: t('auth.name') });
    }
    if (!email.trim()) {
      newErrors.email = t('validation.required', { field: t('auth.email') });
    } else if (!EMAIL_REGEX.test(email)) {
      newErrors.email = t('validation.invalidEmail');
    }
    if (!password) {
      newErrors.password = t('validation.required', { field: t('auth.password') });
    } else if (password.length < 8) {
      newErrors.password = t('validation.minLength', { field: t('auth.password'), min: 8 });
    }
    if (!confirmPassword) {
      newErrors.confirmPassword = t('validation.required', { field: t('auth.confirmPassword') });
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = t('validation.passwordMismatch');
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await register({ name: name.trim(), email: email.trim(), password });
      router.replace('/(tabs)/map');
    } catch (err: any) {
      Alert.alert(t('common.error'), err?.response?.data?.message || t('auth.registerFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Logo size="small" showText dark />
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>{t('auth.createAccount')}</Text>

          <Input
            label={t('auth.name')}
            icon="person-outline"
            value={name}
            onChangeText={(v) => { setName(v); clearError('name'); }}
            placeholder="John Doe"
            error={errors.name}
          />

          <Input
            label={t('auth.email')}
            icon="mail-outline"
            value={email}
            onChangeText={(v) => { setEmail(v); clearError('email'); }}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            error={errors.email}
          />

          <Input
            label={t('auth.password')}
            icon="lock-closed-outline"
            value={password}
            onChangeText={(v) => { setPassword(v); clearError('password'); }}
            placeholder={t('validation.minLength', { field: t('auth.password'), min: 8 })}
            isPassword
            error={errors.password}
          />

          <Input
            label={t('auth.confirmPassword')}
            icon="lock-closed-outline"
            value={confirmPassword}
            onChangeText={(v) => { setConfirmPassword(v); clearError('confirmPassword'); }}
            placeholder="••••••••"
            isPassword
            error={errors.confirmPassword}
          />

          <Button title={loading ? t('common.loading') : t('auth.register')} onPress={handleRegister} loading={loading} />

          <View style={styles.footer}>
            <Text style={styles.footerText}>{t('auth.hasAccount')} </Text>
            <Link href="/auth/login" style={styles.footerLink}>{t('auth.login')}</Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  header: { alignItems: 'center', marginBottom: 32 },
  card: { padding: 24 },
  title: { fontSize: 26, fontWeight: '800', color: '#222222', marginBottom: 16 },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  footerText: { color: colors.textSecondary, fontSize: 14 },
  footerLink: { color: colors.primary, fontSize: 14, fontWeight: '600' },
});
