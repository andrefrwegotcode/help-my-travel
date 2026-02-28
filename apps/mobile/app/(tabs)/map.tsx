import { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, ScrollView, Platform,
} from 'react-native';
import MapView, { Marker, Circle } from 'react-native-maps';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/services/api';
import { useAuthStore } from '../../src/store/auth.store';
import { RADIUS_OPTIONS } from '@helpmytravel/shared';
import type { RadiusOption } from '@helpmytravel/shared';

export default function MapScreen() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const mapRef = useRef<MapView>(null);

  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [addressInput, setAddressInput] = useState('');
  const [searchCenter, setSearchCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [radius, setRadius] = useState<RadiusOption>(5);

  // Get current location on mount
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        const coords = { lat: loc.coords.latitude, lng: loc.coords.longitude };
        setLocation(coords);
        setSearchCenter(coords);
      }
    })();
  }, []);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['places', 'nearby', searchCenter, radius, user?.language],
    queryFn: async () => {
      if (!searchCenter) return null;
      const res = await api.get('/places/nearby', {
        params: { lat: searchCenter.lat, lng: searchCenter.lng, radius, language: user?.language || 'en' },
      });
      return res.data;
    },
    enabled: !!searchCenter,
  });

  const searchByAddress = async () => {
    if (!addressInput.trim()) return;
    const res = await api.get('/places/search', {
      params: { address: addressInput, radius, language: user?.language },
    });
    setSearchCenter(res.data.searchCenter);
    mapRef.current?.animateToRegion({
      latitude: res.data.searchCenter.lat,
      longitude: res.data.searchCenter.lng,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    });
  };

  const useMyLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission denied', 'Location permission is required.');
      return;
    }
    const loc = await Location.getCurrentPositionAsync({});
    const coords = { lat: loc.coords.latitude, lng: loc.coords.longitude };
    setSearchCenter(coords);
    mapRef.current?.animateToRegion({
      latitude: coords.lat,
      longitude: coords.lng,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    });
  };

  return (
    <View style={styles.container}>
      {/* Search bar */}
      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          placeholder={t('map.searchAddress')}
          value={addressInput}
          onChangeText={setAddressInput}
          onSubmitEditing={searchByAddress}
          returnKeyType="search"
        />
        <TouchableOpacity onPress={useMyLocation} style={styles.locationBtn}>
          <Ionicons name="locate" size={22} color="#FF6B35" />
        </TouchableOpacity>
      </View>

      {/* Radius selector */}
      <View style={styles.radiusRow}>
        {RADIUS_OPTIONS.map((r) => (
          <TouchableOpacity
            key={r}
            style={[styles.radiusChip, radius === r && styles.radiusChipActive]}
            onPress={() => setRadius(r)}
          >
            <Text style={[styles.radiusChipText, radius === r && styles.radiusChipTextActive]}>
              {r} {t('map.km')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Map */}
      {searchCenter ? (
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={{
            latitude: searchCenter.lat,
            longitude: searchCenter.lng,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
        >
          {/* Search radius circle */}
          <Circle
            center={{ latitude: searchCenter.lat, longitude: searchCenter.lng }}
            radius={radius * 1000}
            fillColor="rgba(255,107,53,0.08)"
            strokeColor="rgba(255,107,53,0.3)"
            strokeWidth={1.5}
          />

          {/* Restaurant markers */}
          {data?.places?.map((place: any) => (
            <Marker
              key={place.placeId}
              coordinate={{ latitude: place.location.lat, longitude: place.location.lng }}
              title={place.name}
              description={place.address}
              pinColor="#FF6B35"
              onCalloutPress={() => router.push(`/restaurant/${place.placeId}`)}
            />
          ))}

          {/* User location */}
          {location && (
            <Marker
              coordinate={{ latitude: location.lat, longitude: location.lng }}
              pinColor="#667EEA"
              title="You are here"
            />
          )}
        </MapView>
      ) : (
        <View style={styles.mapPlaceholder}>
          <ActivityIndicator color="#FF6B35" size="large" />
          <Text style={styles.mapPlaceholderText}>Getting your location...</Text>
        </View>
      )}

      {/* Loading overlay */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator color="#FF6B35" />
          <Text style={styles.loadingText}>{t('map.searchingNearby')}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'white', margin: 12, borderRadius: 14,
    paddingHorizontal: 14, shadowColor: '#000', shadowOpacity: 0.08,
    shadowRadius: 6, elevation: 3,
  },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 15, color: '#1A1A2E' },
  locationBtn: { padding: 8 },
  radiusRow: { flexDirection: 'row', paddingHorizontal: 12, gap: 8, marginBottom: 8 },
  radiusChip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    backgroundColor: 'white', borderWidth: 1.5, borderColor: '#E0E0E0',
  },
  radiusChipActive: { backgroundColor: '#FF6B35', borderColor: '#FF6B35' },
  radiusChipText: { fontSize: 13, fontWeight: '600', color: '#666' },
  radiusChipTextActive: { color: 'white' },
  map: { flex: 1 },
  mapPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  mapPlaceholderText: { color: '#666', fontSize: 14 },
  loadingOverlay: {
    position: 'absolute', bottom: 20, left: '50%', transform: [{ translateX: -80 }],
    backgroundColor: 'white', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10,
    flexDirection: 'row', alignItems: 'center', gap: 8,
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, elevation: 4,
  },
  loadingText: { color: '#666', fontSize: 13 },
});
