import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Alert, ScrollView,
} from 'react-native';
import { router, Link } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../src/store/auth.store';

export default function RegisterScreen() {
  const { t } = useTranslation();
  const { register } = useAuthStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name || !email || !password) {
      Alert.alert(t('common.error'), 'Please fill in all fields.');
      return;
    }
    if (password.length < 8) {
      Alert.alert(t('common.error'), 'Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    try {
      await register({ name, email, password });
      router.replace('/(tabs)/map');
    } catch (err: any) {
      Alert.alert(t('common.error'), err?.response?.data?.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.appName}>Help My Travel</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>{t('auth.createAccount')}</Text>

          <Text style={styles.label}>{t('auth.name')}</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="John Doe" />

          <Text style={styles.label}>{t('auth.email')}</Text>
          <TextInput
            style={styles.input} value={email} onChangeText={setEmail}
            placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none"
          />

          <Text style={styles.label}>{t('auth.password')}</Text>
          <TextInput
            style={styles.input} value={password} onChangeText={setPassword}
            placeholder="Min. 8 characters" secureTextEntry
          />

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            <Text style={styles.btnText}>
              {loading ? t('common.loading') : t('auth.register')}
            </Text>
          </TouchableOpacity>

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
  container: { flex: 1, backgroundColor: '#FF6B35' },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  header: { alignItems: 'center', marginBottom: 24 },
  appName: { color: 'white', fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
  card: { backgroundColor: 'white', borderRadius: 24, padding: 24 },
  title: { fontSize: 22, fontWeight: '700', color: '#1A1A2E', marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#666', marginBottom: 6, marginTop: 12 },
  input: {
    borderWidth: 1.5, borderColor: '#E0E0E0', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#1A1A2E',
  },
  btn: { backgroundColor: '#FF6B35', borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 20 },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: 'white', fontSize: 16, fontWeight: '700' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  footerText: { color: '#666', fontSize: 14 },
  footerLink: { color: '#FF6B35', fontSize: 14, fontWeight: '700' },
});
