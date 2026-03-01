import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/auth.store';
import { SUPPORTED_LANGUAGES } from '@helpmytravel/shared';

export default function ProfileScreen() {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    Alert.alert(t('auth.logout'), 'Are you sure you want to sign out?', [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('auth.logout'), style: 'destructive', onPress: async () => {
        await logout();
        router.replace('/auth/login');
      }},
    ]);
  };

  const currentLanguage = SUPPORTED_LANGUAGES.find((l) => l.code === user?.language);

  return (
    <ScrollView style={styles.container}>
      {/* Avatar */}
      <View style={styles.avatarSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.name?.charAt(0)?.toUpperCase() || '?'}
          </Text>
        </View>
        <Text style={styles.name}>{user?.name || 'User'}</Text>
        <Text style={styles.email}>{user?.email}</Text>
      </View>

      {/* Menu items */}
      <View style={styles.section}>
        <MenuItem
          icon="language-outline"
          label={t('profile.language')}
          value={`${currentLanguage?.flag} ${currentLanguage?.nativeName}`}
          onPress={() => router.push('/settings/language')}
        />
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color="#F7567C" />
        <Text style={styles.logoutText}>{t('auth.logout')}</Text>
      </TouchableOpacity>

      <Text style={styles.version}>{t('profile.version')} 1.0.0</Text>
    </ScrollView>
  );
}

function MenuItem({ icon, label, value, onPress }: any) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <View style={styles.menuItemLeft}>
        <Ionicons name={icon} size={22} color="#FF6B35" />
        <Text style={styles.menuItemLabel}>{label}</Text>
      </View>
      <View style={styles.menuItemRight}>
        {value && <Text style={styles.menuItemValue}>{value}</Text>}
        <Ionicons name="chevron-forward" size={18} color="#CCC" />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  avatarSection: { alignItems: 'center', padding: 32, backgroundColor: 'white' },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#FF6B35', justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { fontSize: 32, fontWeight: '700', color: 'white' },
  name: { fontSize: 20, fontWeight: '700', color: '#1A1A2E', marginTop: 12 },
  email: { fontSize: 14, color: '#888', marginTop: 4 },
  section: { backgroundColor: 'white', borderRadius: 16, margin: 16, overflow: 'hidden' },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, borderBottomWidth: 1, borderBottomColor: '#F5F5F5',
  },
  menuItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuItemLabel: { fontSize: 15, color: '#1A1A2E' },
  menuItemRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  menuItemValue: { fontSize: 14, color: '#888' },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, margin: 16, padding: 16,
    backgroundColor: 'white', borderRadius: 16, borderWidth: 1.5, borderColor: '#FFE5EE',
  },
  logoutText: { color: '#F7567C', fontSize: 15, fontWeight: '600' },
  version: { textAlign: 'center', color: '#CCC', fontSize: 12, marginBottom: 32 },
});
