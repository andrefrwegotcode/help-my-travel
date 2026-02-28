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
  const [activeTab, setActiveTab] = useState<'details' | 'reviews' | 'photos'>('details');

  const { data: place, isLoading } = useQuery({
    queryKey: ['place', placeId, user?.language],
    queryFn: async () => {
      const res = await api.get(`/places/${placeId}`, { params: { language: user?.language } });
      return res.data;
    },
  });

  const { data: reviews } = useQuery({
    queryKey: ['reviews', placeId],
    queryFn: async () => (await api.get(`/reviews/${placeId}`)).data,
    enabled: activeTab === 'reviews',
  });

  const { data: photos } = useQuery({
    queryKey: ['photos', placeId],
    queryFn: async () => (await api.get(`/photos/${placeId}`)).data,
    enabled: activeTab === 'photos',
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
          headerStyle: { backgroundColor: '#FF6B35' },
          headerTintColor: 'white',
          headerTitleStyle: { fontWeight: '700' },
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
                <Ionicons name="call-outline" size={12} color="#666" />
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

        {/* Tabs */}
        <View style={styles.tabs}>
          {(['details', 'reviews', 'photos'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {t(`restaurant.${tab}`)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView style={styles.content}>
          {activeTab === 'details' && (
            <View style={styles.section}>
              {place?.website && (
                <View style={styles.detailRow}>
                  <Ionicons name="globe-outline" size={16} color="#666" />
                  <Text style={styles.detailText}>{place.website}</Text>
                </View>
              )}
              {place?.openingHours?.weekdayText?.map((line: string, i: number) => (
                <Text key={i} style={styles.hoursText}>{line}</Text>
              ))}
            </View>
          )}

          {activeTab === 'reviews' && (
            <View>
              <TouchableOpacity
                style={styles.addReviewBtn}
                onPress={() => router.push(`/restaurant/${placeId}/review`)}
              >
                <Ionicons name="star-outline" size={18} color="#FF6B35" />
                <Text style={styles.addReviewText}>{t('restaurant.addReview')}</Text>
              </TouchableOpacity>
              {reviews?.map((review: any) => (
                <View key={review.id} style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <Text style={styles.reviewUser}>{review.user.name || 'Anonymous'}</Text>
                    <View style={styles.stars}>
                      {Array.from({ length: review.rating }).map((_, i) => (
                        <Ionicons key={i} name="star" size={12} color="#FF6B35" />
                      ))}
                    </View>
                  </View>
                  {review.comment && <Text style={styles.reviewComment}>{review.comment}</Text>}
                </View>
              ))}
            </View>
          )}

          {activeTab === 'photos' && (
            <View>
              <TouchableOpacity
                style={styles.addReviewBtn}
                onPress={() => router.push(`/restaurant/${placeId}/photos`)}
              >
                <Ionicons name="camera-outline" size={18} color="#FF6B35" />
                <Text style={styles.addReviewText}>{t('restaurant.uploadPhotos')}</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { backgroundColor: 'white', padding: 16 },
  name: { fontSize: 22, fontWeight: '800', color: '#1A1A2E' },
  address: { fontSize: 14, color: '#666', marginTop: 4 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  badgeText: { fontSize: 12, color: '#666' },
  menuBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#FF6B35', margin: 16, borderRadius: 16, padding: 16,
  },
  menuBtnText: { flex: 1, color: 'white', fontSize: 17, fontWeight: '700', marginLeft: 8 },
  tabs: { flexDirection: 'row', backgroundColor: 'white', borderBottomWidth: 1, borderColor: '#F0F0F0' },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2.5, borderBottomColor: '#FF6B35' },
  tabText: { fontSize: 14, color: '#888' },
  tabTextActive: { color: '#FF6B35', fontWeight: '700' },
  content: { flex: 1, padding: 16 },
  section: { gap: 8 },
  detailRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  detailText: { color: '#444', fontSize: 14, flex: 1 },
  hoursText: { fontSize: 13, color: '#555' },
  addReviewBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'white', borderRadius: 12, padding: 14, marginBottom: 12,
    borderWidth: 1.5, borderColor: '#FFE5D8',
  },
  addReviewText: { color: '#FF6B35', fontWeight: '600', fontSize: 14 },
  reviewCard: { backgroundColor: 'white', borderRadius: 12, padding: 14, marginBottom: 8 },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reviewUser: { fontWeight: '700', color: '#1A1A2E' },
  stars: { flexDirection: 'row', gap: 2 },
  reviewComment: { color: '#555', fontSize: 13, marginTop: 6 },
});
