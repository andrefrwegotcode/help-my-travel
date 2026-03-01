import { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, FlatList, Alert,
} from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import api from '../../../src/services/api';
import { useAuthStore } from '../../../src/store/auth.store';

export default function RestaurantScreen() {
  const { placeId } = useLocalSearchParams<{ placeId: string }>();
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'details'>('details');

  const { data: place, isLoading } = useQuery({
    queryKey: ['place', placeId, user?.language],
    queryFn: async () => {
      const res = await api.get(`/places/${placeId}`, { params: { language: user?.language } });
      return res.data;
    },
  });

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color="#FF6B35" size="large" />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: place?.name || 'Restaurant',
          headerStyle: {
            backgroundColor: '#FFFFFF',
            elevation: 0,
            shadowOpacity: 0,
            borderBottomWidth: 0.5,
            borderBottomColor: '#EBEBEB',
          } as any,
          headerTintColor: '#222222',
          headerTitleStyle: { fontWeight: '600', fontSize: 17 },
        }}
      />
      <View style={styles.container}>
        {/* Header info */}
        <View style={styles.header}>
          <Text style={styles.name}>{place?.name}</Text>
          <Text style={styles.address}>{place?.address}</Text>

          <View style={styles.metaRow}>
            {place?.rating && (
              <View style={styles.badge}>
                <Ionicons name="star" size={14} color="#FF6B35" />
                <Text style={styles.badgeText}>{place.rating}</Text>
              </View>
            )}
            {place?.openingHours && (
              <View style={[styles.badge, { borderColor: place.openingHours.openNow ? '#4CAF50' : '#F44336' }]}>
                <Text style={{ color: place.openingHours.openNow ? '#4CAF50' : '#F44336', fontSize: 12, fontWeight: '600' }}>
                  {place.openingHours.openNow ? t('restaurant.openNow') : t('restaurant.closed')}
                </Text>
              </View>
            )}
            {place?.phone && (
              <View style={styles.badge}>
                <Ionicons name="call-outline" size={12} color="#717171" />
                <Text style={styles.badgeText}>{place.phone}</Text>
              </View>
            )}
          </View>
        </View>

        {/* CTA: View Menu */}
        <TouchableOpacity
          style={styles.menuBtn}
          onPress={() => router.push(`/restaurant/${placeId}/menu`)}
        >
          <Ionicons name="restaurant-outline" size={20} color="white" />
          <Text style={styles.menuBtnText}>{t('restaurant.menu')}</Text>
          <Ionicons name="chevron-forward" size={18} color="white" />
        </TouchableOpacity>

        {/* QR Code + Photo Menu buttons */}
        <View style={styles.scanRow}>
          <TouchableOpacity
            style={styles.scanBtn}
            onPress={() => router.push(`/restaurant/${placeId}/scan-qr`)}
          >
            <Ionicons name="qr-code-outline" size={20} color="#FF6B35" />
            <Text style={styles.scanBtnText}>{t('restaurant.scanQr')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.scanBtn}
            onPress={() => router.push(`/restaurant/${placeId}/scan-photo`)}
          >
            <Ionicons name="camera-outline" size={20} color="#FF6B35" />
            <Text style={styles.scanBtnText}>{t('restaurant.scanPhoto')}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          <View style={styles.section}>
            {place?.website && (
              <View style={styles.detailRow}>
                <Ionicons name="globe-outline" size={16} color="#717171" />
                <Text style={styles.detailText}>{place.website}</Text>
              </View>
            )}
            {place?.openingHours?.weekdayText?.map((line: string, i: number) => (
              <Text key={i} style={styles.hoursText}>{line}</Text>
            ))}
          </View>
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { backgroundColor: 'white', padding: 20 },
  name: { fontSize: 26, fontWeight: '800', color: '#222222' },
  address: { fontSize: 14, color: '#717171', marginTop: 4 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: '#DDDDDD', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  badgeText: { fontSize: 12, color: '#717171' },
  menuBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#FF6B35', margin: 20, borderRadius: 8, padding: 18,
  },
  menuBtnText: { flex: 1, color: 'white', fontSize: 17, fontWeight: '700', marginLeft: 8 },
  scanRow: { flexDirection: 'row', gap: 10, marginHorizontal: 20, marginBottom: 12 },
  scanBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: 'white', borderWidth: 1, borderColor: '#FF6B35', borderRadius: 8, padding: 12,
  },
  scanBtnText: { color: '#FF6B35', fontWeight: '600', fontSize: 14 },
  content: { flex: 1, padding: 20 },
  section: { gap: 8 },
  detailRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  detailText: { color: '#444', fontSize: 14, flex: 1 },
  hoursText: { fontSize: 13, color: '#717171' },
});
