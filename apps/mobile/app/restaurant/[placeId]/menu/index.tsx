import { useEffect, useState, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Image, TextInput, Modal,
} from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import api from '../../../../src/services/api';
import { useAuthStore } from '../../../../src/store/auth.store';
import { useOrderStore } from '../../../../src/store/order.store';
import { SUPPORTED_LANGUAGES } from '@helpmytravel/shared';
import type { MenuItem, MenuCategory } from '@helpmytravel/shared';

const headerOpts = {
  headerStyle: { backgroundColor: '#FFFFFF', elevation: 0, shadowOpacity: 0, borderBottomWidth: 0.5, borderBottomColor: '#EBEBEB' } as any,
  headerTintColor: '#222222',
  headerTitleStyle: { fontWeight: '600' as const, fontSize: 17 },
};

export default function MenuScreen() {
  const { placeId } = useLocalSearchParams<{ placeId: string }>();
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { addItem, items: orderItems, totalItems } = useOrderStore();

  const [status, setStatus] = useState<'idle' | 'loading' | 'polling' | 'done' | 'error'>('idle');
  const [menu, setMenu] = useState<{ categories: MenuCategory[]; source: string } | null>(null);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [menuLanguage, setMenuLanguage] = useState(user?.language || 'en');
  const [showLangPicker, setShowLangPicker] = useState(false);

  useEffect(() => {
    loadMenu(menuLanguage);
  }, []);

  const loadMenu = async (language: string) => {
    setStatus('loading');
    setMenu(null);
    try {
      const res = await api.get(`/menu/${placeId}`, { params: { language } });

      if (res.data.cached || res.data.categories) {
        setMenu(res.data);
        setStatus('done');
      } else if (res.data.jobId) {
        setStatus('polling');
        pollJobStatus(res.data.jobId);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load menu.');
      setStatus('error');
    }
  };

  const pollJobStatus = async (jobId: string) => {
    let attempts = 0;
    const maxAttempts = 60;

    const poll = async () => {
      if (attempts >= maxAttempts) {
        setError('Menu discovery timed out. Please try again.');
        setStatus('error');
        return;
      }

      try {
        const res = await api.get(`/menu/status/${jobId}`);
        if (res.data.status === 'completed' && res.data.menu) {
          setMenu(res.data.menu);
          setStatus('done');
        } else if (res.data.status === 'failed') {
          setError('Could not find menu for this restaurant.');
          setStatus('error');
        } else {
          attempts++;
          setTimeout(poll, 2000);
        }
      } catch {
        attempts++;
        setTimeout(poll, 3000);
      }
    };

    setTimeout(poll, 1000);
  };

  const handleLanguageChange = (code: string) => {
    setMenuLanguage(code);
    setShowLangPicker(false);
    loadMenu(code);
  };

  const getItemQuantity = (itemId: string) => {
    return orderItems.find((i) => i.menuItem.id === itemId)?.quantity || 0;
  };

  const currentLang = SUPPORTED_LANGUAGES.find((l) => l.code === menuLanguage);

  const filteredCategories = useMemo(() => {
    if (!menu?.categories) return [];
    if (!searchQuery.trim()) return menu.categories;

    const q = searchQuery.toLowerCase();
    return menu.categories
      .map((cat) => ({
        ...cat,
        items: cat.items.filter(
          (item) =>
            item.name.toLowerCase().includes(q) ||
            (item.nameOriginal && item.nameOriginal.toLowerCase().includes(q)) ||
            (item.description && item.description.toLowerCase().includes(q)),
        ),
      }))
      .filter((cat) => cat.items.length > 0);
  }, [menu?.categories, searchQuery]);

  if (status === 'loading' || status === 'polling') {
    return (
      <>
        <Stack.Screen options={{ title: t('menu.title'), ...headerOpts }} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#FF6B35" />
          <Text style={styles.loadingTitle}>{t('menu.discovering')}</Text>
          <Text style={styles.loadingSubtitle}>
            {status === 'polling' ? 'Searching the web for menu...' : 'Connecting...'}
          </Text>
        </View>
      </>
    );
  }

  if (status === 'error') {
    return (
      <>
        <Stack.Screen options={{ title: t('menu.title'), ...headerOpts }} />
        <View style={styles.centered}>
          <Ionicons name="restaurant-outline" size={64} color="#DDDDDD" />
          <Text style={styles.errorTitle}>{t('menu.notFound')}</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => loadMenu(menuLanguage)}>
            <Ionicons name="refresh" size={18} color="white" />
            <Text style={styles.retryBtnText}>{t('common.retry')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>{t('common.back')}</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  if (status === 'done' && (!menu || !menu.categories || menu.categories.length === 0)) {
    return (
      <>
        <Stack.Screen options={{ title: t('menu.title'), ...headerOpts }} />
        <View style={styles.centered}>
          <Ionicons name="document-text-outline" size={64} color="#DDDDDD" />
          <Text style={styles.errorTitle}>{t('menu.empty')}</Text>
          <Text style={styles.errorText}>{t('menu.emptyDescription')}</Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>{t('common.back')}</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: t('menu.title'), ...headerOpts }} />
      <View style={styles.container}>
        {menu?.source && (
          <View style={styles.sourceBanner}>
            <Ionicons name="information-circle-outline" size={14} color="#667EEA" />
            <Text style={styles.sourceText}>{t(`menu.source.${menu.source}`)}</Text>
          </View>
        )}

        {/* Search + Language bar */}
        <View style={styles.toolbar}>
          <View style={styles.searchRow}>
            <Ionicons name="search-outline" size={18} color="#717171" />
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={t('menu.searchPlaceholder')}
              placeholderTextColor="#B0B0B0"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color="#B0B0B0" />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity style={styles.langBtn} onPress={() => setShowLangPicker(true)}>
            <Text style={styles.langFlag}>{currentLang?.flag}</Text>
            <Ionicons name="chevron-down" size={14} color="#717171" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 100 }}>
          {filteredCategories.length === 0 && searchQuery.trim() ? (
            <View style={styles.noResults}>
              <Ionicons name="search-outline" size={40} color="#DDDDDD" />
              <Text style={styles.noResultsText}>{t('menu.noItems')}</Text>
            </View>
          ) : (
            filteredCategories.map((category) => {
              const isDailyMenu = /men[úu]\s*(del\s*d[ií]a|di[aá]rio|diario|of the day)/i.test(category.name);
              return (
                <View key={category.name} style={styles.category}>
                  {isDailyMenu ? (
                    <View style={styles.dailyMenuHeader}>
                      <Ionicons name="calendar-outline" size={18} color="white" />
                      <Text style={styles.dailyMenuTitle}>{category.name}</Text>
                      {category.items[0]?.price && (
                        <View style={styles.dailyMenuPriceBadge}>
                          <Text style={styles.dailyMenuPrice}>
                            {category.items[0].price.replace(/\s*\(.*\)/, '')}
                          </Text>
                        </View>
                      )}
                    </View>
                  ) : (
                    <Text style={styles.categoryName}>{category.name}</Text>
                  )}
                  {category.items.map((item) => (
                    <MenuItemCard
                      key={item.id}
                      item={item}
                      quantity={getItemQuantity(item.id)}
                      isDailyMenu={isDailyMenu}
                      onAdd={() => addItem(item)}
                      onRemove={() => {
                        const q = getItemQuantity(item.id);
                        if (q > 0) useOrderStore.getState().updateQuantity(item.id, q - 1);
                      }}
                    />
                  ))}
                </View>
              );
            })
          )}
        </ScrollView>

        {/* Floating order button */}
        {totalItems() > 0 && (
          <TouchableOpacity
            style={styles.orderBtn}
            onPress={() => router.push(`/restaurant/${placeId}/menu/order`)}
          >
            <View style={styles.orderBadge}>
              <Text style={styles.orderBadgeText}>{totalItems()}</Text>
            </View>
            <Text style={styles.orderBtnText}>{t('order.generate')}</Text>
            <Ionicons name="chevron-forward" size={20} color="white" />
          </TouchableOpacity>
        )}
      </View>

      {/* Language Picker Modal */}
      <Modal visible={showLangPicker} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('menu.changeLanguage')}</Text>
              <TouchableOpacity onPress={() => setShowLangPicker(false)}>
                <Ionicons name="close" size={24} color="#222222" />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 400 }}>
              {SUPPORTED_LANGUAGES.map((lang) => (
                <TouchableOpacity
                  key={lang.code}
                  style={styles.langOption}
                  onPress={() => handleLanguageChange(lang.code)}
                >
                  <Text style={styles.langOptionFlag}>{lang.flag}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.langOptionName}>{lang.nativeName}</Text>
                    <Text style={styles.langOptionSub}>{lang.name}</Text>
                  </View>
                  {menuLanguage === lang.code && (
                    <Ionicons name="checkmark-circle" size={22} color="#FF6B35" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

function MenuItemCard({
  item, quantity, isDailyMenu, onAdd, onRemove,
}: { item: MenuItem; quantity: number; isDailyMenu?: boolean; onAdd: () => void; onRemove: () => void }) {
  const { t } = useTranslation();

  // For daily menu items, show course badge + simplified layout
  if (isDailyMenu) {
    // Extract course info from description (e.g., "Primer plato", "Segundo plato", "Postre")
    const courseMatch = item.description?.match(/^(primer|segundo|tercer|postre|dessert|first|second|third|bebida|drink|starter|main|sobremesa)/i);
    const courseName = courseMatch ? courseMatch[0] : null;
    const descWithoutCourse = courseName
      ? item.description?.replace(new RegExp(`^${courseName}[^a-zA-ZáéíóúÁÉÍÓÚñÑ]*`, 'i'), '').trim()
      : item.description;

    return (
      <View style={cardStyles.dailyCard}>
        <View style={cardStyles.info}>
          {courseName && (
            <View style={cardStyles.courseBadge}>
              <Text style={cardStyles.courseBadgeText}>{courseName.charAt(0).toUpperCase() + courseName.slice(1)}</Text>
            </View>
          )}
          <Text style={cardStyles.name}>{item.name}</Text>
          {item.nameOriginal !== item.name && (
            <Text style={cardStyles.original}>{item.nameOriginal}</Text>
          )}
          {descWithoutCourse ? (
            <Text style={cardStyles.desc} numberOfLines={2}>{descWithoutCourse}</Text>
          ) : null}
        </View>
        <View style={cardStyles.controls}>
          {quantity > 0 ? (
            <>
              <TouchableOpacity style={cardStyles.btn} onPress={onRemove}>
                <Text style={cardStyles.btnText}>−</Text>
              </TouchableOpacity>
              <Text style={cardStyles.qty}>{quantity}</Text>
              <TouchableOpacity style={[cardStyles.btn, cardStyles.btnAdd]} onPress={onAdd}>
                <Text style={[cardStyles.btnText, { color: 'white' }]}>+</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity style={[cardStyles.btn, cardStyles.btnAdd, { paddingHorizontal: 12 }]} onPress={onAdd}>
              <Ionicons name="add" size={18} color="white" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={cardStyles.card}>
      {item.imageUrl && (
        <Image source={{ uri: item.imageUrl }} style={cardStyles.image} />
      )}
      <View style={cardStyles.info}>
        <Text style={cardStyles.name}>{item.name}</Text>
        {item.nameOriginal !== item.name && (
          <Text style={cardStyles.original}>{item.nameOriginal}</Text>
        )}
        {item.description && (
          <Text style={cardStyles.desc} numberOfLines={2}>{item.description}</Text>
        )}
        {item.price && <Text style={cardStyles.price}>{item.price}</Text>}
      </View>

      <View style={cardStyles.controls}>
        {quantity > 0 ? (
          <>
            <TouchableOpacity style={cardStyles.btn} onPress={onRemove}>
              <Text style={cardStyles.btnText}>−</Text>
            </TouchableOpacity>
            <Text style={cardStyles.qty}>{quantity}</Text>
            <TouchableOpacity style={[cardStyles.btn, cardStyles.btnAdd]} onPress={onAdd}>
              <Text style={[cardStyles.btnText, { color: 'white' }]}>+</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity style={[cardStyles.btn, cardStyles.btnAdd, { paddingHorizontal: 16 }]} onPress={onAdd}>
            <Text style={[cardStyles.btnText, { color: 'white' }]}>{t('menu.addToOrder')}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 16 },
  loadingTitle: { fontSize: 18, fontWeight: '700', color: '#222222' },
  loadingSubtitle: { color: '#717171', fontSize: 14, textAlign: 'center' },
  errorTitle: { fontSize: 18, fontWeight: '700', color: '#222222', textAlign: 'center' },
  errorText: { color: '#717171', fontSize: 14, textAlign: 'center', lineHeight: 20 },
  retryBtn: {
    backgroundColor: '#FF6B35', borderRadius: 8, paddingHorizontal: 24, paddingVertical: 12,
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  retryBtnText: { color: 'white', fontWeight: '700' },
  backBtn: { paddingHorizontal: 24, paddingVertical: 10 },
  backBtnText: { color: '#717171', fontWeight: '600', fontSize: 14 },
  sourceBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#EEF2FF', padding: 10, paddingHorizontal: 16,
  },
  sourceText: { fontSize: 12, color: '#667EEA' },
  toolbar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#EBEBEB',
  },
  searchRow: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#F7F7F7', borderRadius: 24, paddingHorizontal: 14, height: 40,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#222222', paddingVertical: 0 },
  langBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: '#EBEBEB', borderRadius: 20,
    paddingHorizontal: 10, height: 40,
  },
  langFlag: { fontSize: 20 },
  scroll: { flex: 1 },
  category: { padding: 20 },
  categoryName: { fontSize: 13, fontWeight: '800', color: '#FF6B35', letterSpacing: 1.5, marginBottom: 12, textTransform: 'uppercase' },
  dailyMenuHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FF6B35', borderRadius: 12, padding: 14, marginBottom: 12,
  },
  dailyMenuTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: 'white' },
  dailyMenuPriceBadge: {
    backgroundColor: 'white', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 4,
  },
  dailyMenuPrice: { fontSize: 15, fontWeight: '800', color: '#FF6B35' },
  noResults: { alignItems: 'center', paddingTop: 60, gap: 12 },
  noResultsText: { fontSize: 14, color: '#717171' },
  orderBtn: {
    position: 'absolute', bottom: 20, left: 16, right: 16,
    backgroundColor: '#FF6B35', borderRadius: 8, padding: 16,
    flexDirection: 'row', alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 12, elevation: 6,
  },
  orderBadge: {
    backgroundColor: 'white', borderRadius: 12, width: 24, height: 24,
    justifyContent: 'center', alignItems: 'center', marginRight: 8,
  },
  orderBadgeText: { color: '#FF6B35', fontWeight: '800', fontSize: 12 },
  orderBtnText: { flex: 1, color: 'white', fontSize: 16, fontWeight: '700' },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#222222' },
  langOption: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#EBEBEB',
  },
  langOptionFlag: { fontSize: 24 },
  langOptionName: { fontSize: 16, fontWeight: '500', color: '#222222' },
  langOptionSub: { fontSize: 12, color: '#717171' },
});

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: 'white', borderRadius: 12, padding: 16, marginBottom: 12,
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    borderBottomWidth: 1, borderBottomColor: '#EBEBEB',
  },
  dailyCard: {
    backgroundColor: '#FFF8F5', borderRadius: 10, padding: 14, marginBottom: 8,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderLeftWidth: 3, borderLeftColor: '#FF6B35',
  },
  courseBadge: {
    backgroundColor: '#FF6B35', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3,
    alignSelf: 'flex-start', marginBottom: 4,
  },
  courseBadgeText: { fontSize: 10, fontWeight: '700', color: 'white', textTransform: 'uppercase' },
  image: { width: 72, height: 72, borderRadius: 10, backgroundColor: '#F7F7F7' },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: '600', color: '#222222' },
  original: { fontSize: 12, color: '#B0B0B0', marginTop: 2 },
  desc: { fontSize: 13, color: '#717171', marginTop: 4 },
  price: { fontSize: 14, fontWeight: '700', color: '#FF6B35', marginTop: 6 },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'center' },
  btn: {
    width: 36, height: 36, borderRadius: 20, borderWidth: 1, borderColor: '#DDDDDD',
    justifyContent: 'center', alignItems: 'center',
  },
  btnAdd: { backgroundColor: '#FF6B35', borderColor: '#FF6B35' },
  btnText: { fontSize: 16, fontWeight: '700', color: '#717171' },
  qty: { fontSize: 15, fontWeight: '700', color: '#222222', minWidth: 20, textAlign: 'center' },
});
