import { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  TextInput, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/services/api';
import { useAuthStore } from '../../src/store/auth.store';
import { RADIUS_OPTIONS } from '@helpmytravel/shared';
import type { RadiusOption } from '@helpmytravel/shared';

export default function ListScreen() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [addressInput, setAddressInput] = useState('');
  const [radius, setRadius] = useState<RadiusOption>(5);
  const [searchParams, setSearchParams] = useState<{ lat?: number; lng?: number; address?: string } | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['places', 'nearby', searchParams, radius, user?.language],
    queryFn: async () => {
      if (!searchParams) return null;
      const endpoint = searchParams.address ? '/places/search' : '/places/nearby';
      const res = await api.get(endpoint, {
        params: { ...searchParams, radius, language: user?.language || 'en' },
      });
      return res.data;
    },
    enabled: !!searchParams,
  });

  const searchCurrentLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return;
    const loc = await Location.getCurrentPositionAsync({});
    setSearchParams({ lat: loc.coords.latitude, lng: loc.coords.longitude });
  };

  const searchByAddress = () => {
    if (!addressInput.trim()) return;
    setSearchParams({ address: addressInput });
  };

  return (
    <View style={styles.container}>
      {/* Search bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <TextInput
            style={styles.searchInput}
            placeholder={t('map.searchAddress')}
            value={addressInput}
            onChangeText={setAddressInput}
            onSubmitEditing={searchByAddress}
          />
          <TouchableOpacity onPress={searchCurrentLocation} style={styles.locBtn}>
            <Ionicons name="locate" size={20} color="#FF6B35" />
          </TouchableOpacity>
        </View>
        {/* Radius chips */}
        <View style={styles.radiusRow}>
          {RADIUS_OPTIONS.map((r) => (
            <TouchableOpacity
              key={r}
              style={[styles.chip, radius === r && styles.chipActive]}
              onPress={() => setRadius(r)}
            >
              <Text style={[styles.chipText, radius === r && styles.chipTextActive]}>
                {r}km
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {isLoading && (
        <View style={styles.center}>
          <ActivityIndicator color="#FF6B35" size="large" />
          <Text style={styles.loadingText}>{t('map.searchingNearby')}</Text>
        </View>
      )}

      {!searchParams && !isLoading && (
        <View style={styles.center}>
          <Ionicons name="restaurant-outline" size={64} color="#CCC" />
          <Text style={styles.emptyText}>{t('map.useMyLocation')}</Text>
          <TouchableOpacity style={styles.locButton} onPress={searchCurrentLocation}>
            <Ionicons name="locate" size={18} color="white" />
            <Text style={styles.locButtonText}>{t('map.useMyLocation')}</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={data?.places || []}
        keyExtractor={(item) => item.placeId}
        contentContainerStyle={{ padding: 12, gap: 12 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push(`/restaurant/${item.placeId}`)}
          >
            <View style={styles.cardContent}>
              <Text style={styles.cardName}>{item.name}</Text>
              <Text style={styles.cardAddress} numberOfLines={1}>{item.address}</Text>
              <View style={styles.cardMeta}>
                {item.rating && (
                  <View style={styles.ratingBadge}>
                    <Ionicons name="star" size={12} color="#FF6B35" />
                    <Text style={styles.ratingText}>{item.rating}</Text>
                  </View>
                )}
                {item.distance && (
                  <Text style={styles.distanceText}>
                    {item.distance < 1000
                      ? `${item.distance}m`
                      : `${(item.distance / 1000).toFixed(1)}km`}
                  </Text>
                )}
                {item.openNow !== null && (
                  <Text style={[styles.openBadge, { color: item.openNow ? '#4CAF50' : '#F44336' }]}>
                    {item.openNow ? t('restaurant.openNow') : t('restaurant.closed')}
                  </Text>
                )}
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#CCC" />
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          data && !isLoading ? (
            <View style={styles.center}>
              <Text style={styles.emptyText}>{t('map.noRestaurants')}</Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  searchContainer: { backgroundColor: 'white', padding: 12, gap: 8 },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  searchInput: {
    flex: 1, borderWidth: 1.5, borderColor: '#E0E0E0', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 14,
  },
  locBtn: { padding: 10 },
  radiusRow: { flexDirection: 'row', gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    backgroundColor: '#F5F5F5', borderWidth: 1, borderColor: '#E0E0E0',
  },
  chipActive: { backgroundColor: '#FF6B35', borderColor: '#FF6B35' },
  chipText: { fontSize: 12, fontWeight: '600', color: '#666' },
  chipTextActive: { color: 'white' },
  card: {
    backgroundColor: 'white', borderRadius: 14, padding: 16,
    flexDirection: 'row', alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  cardContent: { flex: 1 },
  cardName: { fontSize: 16, fontWeight: '700', color: '#1A1A2E' },
  cardAddress: { fontSize: 13, color: '#888', marginTop: 2 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ratingText: { fontSize: 13, fontWeight: '600', color: '#FF6B35' },
  distanceText: { fontSize: 12, color: '#888' },
  openBadge: { fontSize: 12, fontWeight: '600' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 16 },
  loadingText: { color: '#888', fontSize: 14 },
  emptyText: { color: '#888', fontSize: 15, textAlign: 'center' },
  locButton: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FF6B35', borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12,
  },
  locButtonText: { color: 'white', fontWeight: '600' },
});
