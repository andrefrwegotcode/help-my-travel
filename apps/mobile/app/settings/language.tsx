import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/auth.store';
import { SUPPORTED_LANGUAGES } from '@helpmytravel/shared';

export default function LanguageScreen() {
  const { t, i18n } = useTranslation();
  const { user, updateLanguage } = useAuthStore();

  const handleSelect = async (code: string) => {
    await i18n.changeLanguage(code);
    await updateLanguage(code);
    router.back();
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>{t('settings.selectLanguage')}</Text>
      {SUPPORTED_LANGUAGES.map((lang) => (
        <TouchableOpacity
          key={lang.code}
          style={styles.option}
          onPress={() => handleSelect(lang.code)}
        >
          <Text style={styles.flag}>{lang.flag}</Text>
          <View style={styles.langInfo}>
            <Text style={styles.nativeName}>{lang.nativeName}</Text>
            <Text style={styles.langName}>{lang.name}</Text>
          </View>
          {user?.language === lang.code && (
            <Ionicons name="checkmark-circle" size={24} color="#FF6B35" />
          )}
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  title: { fontSize: 12, fontWeight: '700', color: '#717171', padding: 16, textTransform: 'uppercase', letterSpacing: 0.5 },
  option: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'white', paddingHorizontal: 20, paddingVertical: 18,
    borderBottomWidth: 1, borderColor: '#EBEBEB',
  },
  flag: { fontSize: 28 },
  langInfo: { flex: 1 },
  nativeName: { fontSize: 16, fontWeight: '500', color: '#222222' },
  langName: { fontSize: 13, color: '#717171' },
});
