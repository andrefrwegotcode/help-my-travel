import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, FlatList, Image,
} from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import api from '../../../../src/services/api';
import { useAuthStore } from '../../../../src/store/auth.store';
import { useOrderStore } from '../../../../src/store/order.store';
import type { MenuItem, MenuCategory } from '@helpmytravel/shared';

export default function MenuScreen() {
  const { placeId } = useLocalSearchParams<{ placeId: string }>();
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { addItem, removeItem, items: orderItems, totalItems } = useOrderStore();

  const [status, setStatus] = useState<'idle' | 'loading' | 'polling' | 'done' | 'error'>('idle');
  const [menu, setMenu] = useState<{ categories: MenuCategory[]; source: string } | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    loadMenu();
  }, []);

  const loadMenu = async () => {
    setStatus('loading');
    try {
      const res = await api.get(`/menu/${placeId}`, { params: { language: user?.language || 'en' } });

      if (res.data.cached || res.data.categories) {
        // Cached menu returned immediately
        setMenu(res.data);
        setStatus('done');
      } else if (res.data.jobId) {
        // Background job started — poll for completion
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
    const maxAttempts = 60; // 2 minutes max

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
          setTimeout(poll, 2000); // Poll every 2s
        }
      } catch {
        attempts++;
        setTimeout(poll, 3000);
      }
    };

    setTimeout(poll, 1000);
  };

  const getItemQuantity = (itemId: string) => {
    return orderItems.find((i) => i.menuItem.id === itemId)?.quantity || 0;
  };

  if (status === 'loading' || status === 'polling') {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text style={styles.loadingTitle}>{t('menu.discovering')}</Text>
        <Text style={styles.loadingSubtitle}>
          {status === 'polling' ? 'Searching the web for menu...' : 'Connecting...'}
        </Text>
      </View>
    );
  }

  if (status === 'error') {
    return (
      <>
        <Stack.Screen options={{ title: t('menu.title'), headerStyle: { backgroundColor: '#FF6B35' }, headerTintColor: 'white' }} />
        <View style={styles.centered}>
          <Ionicons name="restaurant-outline" size={64} color="#CCC" />
          <Text style={styles.errorTitle}>{t('menu.notFound')}</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadMenu}>
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
        <Stack.Screen options={{ title: t('menu.title'), headerStyle: { backgroundColor: '#FF6B35' }, headerTintColor: 'white' }} />
        <View style={styles.centered}>
          <Ionicons name="document-text-outline" size={64} color="#CCC" />
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
      <Stack.Screen options={{ title: t('menu.title'), headerStyle: { backgroundColor: '#FF6B35' }, headerTintColor: 'white' }} />
      <View style={styles.container}>
        {menu?.source && (
          <View style={styles.sourceBanner}>
            <Ionicons name="information-circle-outline" size={14} color="#667EEA" />
            <Text style={styles.sourceText}>{t(`menu.source.${menu.source}`)}</Text>
          </View>
        )}

        <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 100 }}>
          {menu?.categories?.map((category) => (
            <View key={category.name} style={styles.category}>
              <Text style={styles.categoryName}>{category.name}</Text>
              {category.items.map((item) => (
                <MenuItemCard
                  key={item.id}
                  item={item}
                  quantity={getItemQuantity(item.id)}
                  onAdd={() => addItem(item)}
                  onRemove={() => {
                    const q = getItemQuantity(item.id);
                    if (q > 0) useOrderStore.getState().updateQuantity(item.id, q - 1);
                  }}
                />
              ))}
            </View>
          ))}
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
    </>
  );
}

function MenuItemCard({
  item, quantity, onAdd, onRemove,
}: { item: MenuItem; quantity: number; onAdd: () => void; onRemove: () => void }) {
  const { t } = useTranslation();
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
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 16 },
  loadingTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A2E' },
  loadingSubtitle: { color: '#888', fontSize: 14, textAlign: 'center' },
  errorTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A2E', textAlign: 'center' },
  errorText: { color: '#888', fontSize: 14, textAlign: 'center', lineHeight: 20 },
  retryBtn: {
    backgroundColor: '#FF6B35', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12,
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  retryBtnText: { color: 'white', fontWeight: '700' },
  backBtn: { paddingHorizontal: 24, paddingVertical: 10 },
  backBtnText: { color: '#888', fontWeight: '600', fontSize: 14 },
  sourceBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#EEF2FF', padding: 10, paddingHorizontal: 16,
  },
  sourceText: { fontSize: 12, color: '#667EEA' },
  scroll: { flex: 1 },
  category: { padding: 16 },
  categoryName: { fontSize: 14, fontWeight: '800', color: '#FF6B35', letterSpacing: 1, marginBottom: 8, textTransform: 'uppercase' },
  orderBtn: {
    position: 'absolute', bottom: 20, left: 16, right: 16,
    backgroundColor: '#FF6B35', borderRadius: 16, padding: 16,
    flexDirection: 'row', alignItems: 'center',
    shadowColor: '#FF6B35', shadowOpacity: 0.4, shadowRadius: 12, elevation: 6,
  },
  orderBadge: {
    backgroundColor: 'white', borderRadius: 12, width: 24, height: 24,
    justifyContent: 'center', alignItems: 'center', marginRight: 8,
  },
  orderBadgeText: { color: '#FF6B35', fontWeight: '800', fontSize: 12 },
  orderBtnText: { flex: 1, color: 'white', fontSize: 16, fontWeight: '700' },
});

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: 'white', borderRadius: 14, padding: 14, marginBottom: 8,
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
  },
  image: { width: 60, height: 60, borderRadius: 8, backgroundColor: '#f0f0f0' },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: '700', color: '#1A1A2E' },
  original: { fontSize: 12, color: '#888', marginTop: 2 },
  desc: { fontSize: 13, color: '#666', marginTop: 4 },
  price: { fontSize: 14, fontWeight: '700', color: '#FF6B35', marginTop: 6 },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'center' },
  btn: {
    width: 32, height: 32, borderRadius: 8, borderWidth: 1.5, borderColor: '#E0E0E0',
    justifyContent: 'center', alignItems: 'center',
  },
  btnAdd: { backgroundColor: '#FF6B35', borderColor: '#FF6B35' },
  btnText: { fontSize: 16, fontWeight: '700', color: '#666' },
  qty: { fontSize: 15, fontWeight: '700', color: '#1A1A2E', minWidth: 20, textAlign: 'center' },
});
