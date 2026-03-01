import { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, ScrollView, Platform,
} from 'react-native';
import MapView, { Marker, Callout, Circle } from 'react-native-maps';
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
        <Ionicons name="search" size={18} color="#B0B0B0" style={{ marginLeft: 16 }} />
        <TextInput
          style={styles.searchInput}
          placeholder={t('map.searchAddress')}
          placeholderTextColor="#B0B0B0"
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
              pinColor="#FF6B35"
            >
              <Callout
                tooltip
                onPress={() => router.push(`/restaurant/${place.placeId}`)}
              >
                <View style={styles.callout}>
                  <Text style={styles.calloutTitle} numberOfLines={1}>{place.name}</Text>
                  {place.address && (
                    <Text style={styles.calloutAddress} numberOfLines={2}>{place.address}</Text>
                  )}
                  {place.rating && (
                    <View style={styles.calloutRating}>
                      <Ionicons name="star" size={12} color="#FF6B35" />
                      <Text style={styles.calloutRatingText}>{place.rating}</Text>
                    </View>
                  )}
                  <Text style={styles.calloutCta}>{t('map.viewDetails')} →</Text>
                </View>
              </Callout>
            </Marker>
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
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'white', margin: 16, borderRadius: 24,
    paddingHorizontal: 4, shadowColor: '#000', shadowOpacity: 0.06,
    shadowRadius: 10, elevation: 3,
    borderWidth: 1, borderColor: '#EBEBEB',
  },
  searchInput: { flex: 1, paddingVertical: 12, paddingHorizontal: 10, fontSize: 14, color: '#222222' },
  locationBtn: { padding: 10, marginRight: 6 },
  radiusRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 8 },
  radiusChip: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    backgroundColor: 'white', borderWidth: 1, borderColor: '#DDDDDD',
  },
  radiusChipActive: { backgroundColor: '#FF6B35', borderColor: '#FF6B35' },
  radiusChipText: { fontSize: 12, fontWeight: '600', color: '#717171' },
  radiusChipTextActive: { color: 'white' },
  map: { flex: 1 },
  callout: {
    backgroundColor: 'white', borderRadius: 12, padding: 12, minWidth: 180, maxWidth: 250,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8, elevation: 5,
    borderWidth: 1, borderColor: '#EBEBEB',
  },
  calloutTitle: { fontSize: 15, fontWeight: '700', color: '#222222', marginBottom: 2 },
  calloutAddress: { fontSize: 12, color: '#717171', marginBottom: 6 },
  calloutRating: { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 6 },
  calloutRatingText: { fontSize: 12, color: '#717171', fontWeight: '600' },
  calloutCta: { fontSize: 13, fontWeight: '600', color: '#FF6B35' },
  mapPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  mapPlaceholderText: { color: '#717171', fontSize: 14 },
  loadingOverlay: {
    position: 'absolute', bottom: 20, left: '50%', transform: [{ translateX: -80 }],
    backgroundColor: 'white', borderRadius: 24, paddingHorizontal: 16, paddingVertical: 10,
    flexDirection: 'row', alignItems: 'center', gap: 8,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  loadingText: { color: '#717171', fontSize: 13 },
});
