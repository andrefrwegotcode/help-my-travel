import { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  TextInput, ActivityIndicator, RefreshControl,
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

  const [refreshing, setRefreshing] = useState(false);

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
          <Ionicons name="search" size={18} color="#B0B0B0" style={{ marginLeft: 4 }} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('map.searchAddress')}
            placeholderTextColor="#B0B0B0"
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
          <Ionicons name="restaurant-outline" size={64} color="#DDDDDD" />
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
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => { setRefreshing(true); await refetch(); setRefreshing(false); }}
            colors={['#FF6B35']}
            tintColor="#FF6B35"
          />
        }
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
            <Ionicons name="chevron-forward" size={20} color="#DDDDDD" />
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
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  searchContainer: { backgroundColor: 'white', padding: 16, gap: 10 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderColor: '#EBEBEB', borderRadius: 24,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1, paddingVertical: 10, fontSize: 14, color: '#222222',
  },
  locBtn: { padding: 10 },
  radiusRow: { flexDirection: 'row', gap: 8 },
  chip: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#F7F7F7', borderWidth: 1, borderColor: '#DDDDDD',
  },
  chipActive: { backgroundColor: '#FF6B35', borderColor: '#FF6B35' },
  chipText: { fontSize: 12, fontWeight: '600', color: '#717171' },
  chipTextActive: { color: 'white' },
  card: {
    paddingVertical: 16, flexDirection: 'row', alignItems: 'center',
    borderBottomWidth: 1, borderBottomColor: '#EBEBEB',
  },
  cardContent: { flex: 1 },
  cardName: { fontSize: 16, fontWeight: '600', color: '#222222' },
  cardAddress: { fontSize: 13, color: '#717171', marginTop: 2 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ratingText: { fontSize: 13, fontWeight: '600', color: '#FF6B35' },
  distanceText: { fontSize: 12, color: '#717171' },
  openBadge: { fontSize: 12, fontWeight: '600' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 16 },
  loadingText: { color: '#717171', fontSize: 14 },
  emptyText: { color: '#717171', fontSize: 15, textAlign: 'center' },
  locButton: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FF6B35', borderRadius: 8, paddingHorizontal: 20, paddingVertical: 12,
  },
  locButtonText: { color: 'white', fontWeight: '600' },
});
