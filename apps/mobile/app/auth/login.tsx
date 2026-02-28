import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
} from 'react-native';
import { router, Link } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../src/store/auth.store';

export default function LoginScreen() {
  const { t } = useTranslation();
  const { login } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert(t('common.error'), 'Please fill in all fields.');
      return;
    }
    setLoading(true);
    try {
      await login({ email, password });
      router.replace('/(tabs)/map');
    } catch (err: any) {
      Alert.alert(t('common.error'), err?.response?.data?.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Logo area */}
        <View style={styles.header}>
          <View style={styles.logoPin}>
            <Text style={styles.logoPinText}>🍽️</Text>
          </View>
          <Text style={styles.appName}>Help My Travel</Text>
          <Text style={styles.tagline}>Menus translated. Everywhere.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>{t('auth.welcomeBack')}</Text>

          <Text style={styles.label}>{t('auth.email')}</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.label}>{t('auth.password')}</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            secureTextEntry
          />

          <Link href="/auth/forgot-password" style={styles.forgotLink}>
            {t('auth.forgotPassword')}
          </Link>

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={styles.btnText}>
              {loading ? t('common.loading') : t('auth.login')}
            </Text>
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Google OAuth button — redirect to API */}
          <TouchableOpacity style={styles.googleBtn}>
            <Text style={styles.googleBtnText}>🔵 {t('auth.signInWithGoogle')}</Text>
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>{t('auth.noAccount')} </Text>
            <Link href="/auth/register" style={styles.footerLink}>
              {t('auth.register')}
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FF6B35' },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  header: { alignItems: 'center', marginBottom: 32 },
  logoPin: {
    width: 80, height: 80, borderRadius: 20,
    backgroundColor: 'white', justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, elevation: 5,
  },
  logoPinText: { fontSize: 40 },
  appName: { color: 'white', fontSize: 28, fontWeight: '800', marginTop: 12, letterSpacing: -0.5 },
  tagline: { color: 'rgba(255,255,255,0.75)', fontSize: 13, letterSpacing: 1, marginTop: 4 },
  card: {
    backgroundColor: 'white', borderRadius: 24, padding: 24,
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 20, elevation: 5,
  },
  title: { fontSize: 22, fontWeight: '700', color: '#1A1A2E', marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '600', color: '#666', marginBottom: 6, marginTop: 12 },
  input: {
    borderWidth: 1.5, borderColor: '#E0E0E0', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#1A1A2E',
  },
  forgotLink: { color: '#FF6B35', fontSize: 13, textAlign: 'right', marginTop: 8 },
  btn: {
    backgroundColor: '#FF6B35', borderRadius: 12, paddingVertical: 15,
    alignItems: 'center', marginTop: 20,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: 'white', fontSize: 16, fontWeight: '700' },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 16 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E0E0E0' },
  dividerText: { marginHorizontal: 12, color: '#999', fontSize: 13 },
  googleBtn: {
    borderWidth: 1.5, borderColor: '#E0E0E0', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center',
  },
  googleBtnText: { fontSize: 15, fontWeight: '600', color: '#1A1A2E' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  footerText: { color: '#666', fontSize: 14 },
  footerLink: { color: '#FF6B35', fontSize: 14, fontWeight: '700' },
});
