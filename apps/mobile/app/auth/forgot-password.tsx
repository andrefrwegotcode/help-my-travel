import { useState } from 'react';
import {
  View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/services/api';
import { Input } from '../../src/components/Input';
import { Button } from '../../src/components/Button';
import { colors } from '../../src/theme/colors';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const validate = () => {
    if (!email.trim()) {
      setError(t('validation.required', { field: t('auth.email') }));
      return false;
    }
    if (!EMAIL_REGEX.test(email)) {
      setError(t('validation.invalidEmail'));
      return false;
    }
    setError(undefined);
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email: email.trim() });
      setSent(true);
    } catch {
      setSent(true); // Don't reveal if email exists
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <View style={styles.successIcon}>
            <Ionicons name="mail-outline" size={40} color={colors.success} />
          </View>
          <Text style={styles.title}>{t('auth.checkEmail')}</Text>
          <Text style={styles.desc}>{t('auth.resetEmailSent')}</Text>
          <Button title={t('auth.backToLogin')} onPress={() => router.back()} />
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <Ionicons name="key-outline" size={32} color={colors.primary} />
          </View>
          <Text style={styles.title}>{t('auth.resetPassword')}</Text>
          <Text style={styles.desc}>{t('auth.resetDescription')}</Text>

          <Input
            label={t('auth.email')}
            icon="mail-outline"
            value={email}
            onChangeText={(v) => { setEmail(v); if (error) setError(undefined); }}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            error={error}
          />

          <Button
            title={loading ? t('common.loading') : t('auth.sendResetLink')}
            onPress={handleSubmit}
            loading={loading}
          />

          <Button
            title={t('common.back')}
            onPress={() => router.back()}
            variant="ghost"
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.primary, justifyContent: 'center', padding: 20 },
  scroll: { flexGrow: 1, justifyContent: 'center' },
  card: { backgroundColor: colors.white, borderRadius: 24, padding: 24 },
  iconCircle: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: '#FFF3E0',
    justifyContent: 'center', alignItems: 'center',
    alignSelf: 'center', marginBottom: 16,
  },
  successIcon: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center', alignItems: 'center',
    alignSelf: 'center', marginBottom: 16,
  },
  title: { fontSize: 22, fontWeight: '700', color: colors.navy, marginBottom: 8, textAlign: 'center' },
  desc: { color: colors.textSecondary, fontSize: 14, marginBottom: 8, textAlign: 'center', lineHeight: 20 },
});
