import { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Linking, Modal, TextInput, Alert,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import api from '../../../src/services/api';
import { useAuthStore } from '../../../src/store/auth.store';
import type { Review } from '@helpmytravel/shared';

function StarRating({
  rating, size = 16, interactive, onRate,
}: {
  rating: number; size?: number; interactive?: boolean; onRate?: (n: number) => void;
}) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <TouchableOpacity key={i} disabled={!interactive} onPress={() => onRate?.(i)}>
          <Ionicons
            name={i <= Math.round(rating) ? 'star' : 'star-outline'}
            size={size}
            color="#FF6B35"
          />
        </TouchableOpacity>
      ))}
    </View>
  );
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export default function RestaurantScreen() {
  const { placeId } = useLocalSearchParams<{ placeId: string }>();
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');

  const { data: place, isLoading } = useQuery({
    queryKey: ['place', placeId, user?.language],
    queryFn: async () => {
      const res = await api.get(`/places/${placeId}`, { params: { language: user?.language } });
      return res.data;
    },
  });

  const { data: reviews = [] } = useQuery<Review[]>({
    queryKey: ['reviews', placeId],
    queryFn: async () => {
      const res = await api.get(`/reviews/${placeId}`);
      return res.data;
    },
    enabled: !!placeId,
  });

  const createReview = useMutation({
    mutationFn: async (data: { rating: number; comment?: string }) => {
      return api.post('/reviews', {
        placeId,
        placeName: place?.name || 'Restaurant',
        rating: data.rating,
        comment: data.comment || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews', placeId] });
      setShowReviewModal(false);
      setReviewRating(0);
      setReviewComment('');
      Alert.alert(t('restaurant.reviewSubmitted'));
    },
    onError: (err: any) => {
      Alert.alert(t('common.error'), err?.response?.data?.message || 'Failed to submit review');
    },
  });

  const handleSubmitReview = () => {
    if (reviewRating === 0) {
      Alert.alert(t('common.error'), 'Please select a rating');
      return;
    }
    createReview.mutate({ rating: reviewRating, comment: reviewComment });
  };

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
      <ScrollView style={styles.container}>
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
              <TouchableOpacity onPress={() => Linking.openURL(`tel:${place.phone}`)}>
                <View style={[styles.badge, { borderColor: '#FF6B35' }]}>
                  <Ionicons name="call-outline" size={12} color="#FF6B35" />
                  <Text style={[styles.badgeText, { color: '#FF6B35' }]}>{place.phone}</Text>
                </View>
              </TouchableOpacity>
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

        {/* Google Rating */}
        {place?.rating && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('restaurant.googleRating')}</Text>
            <View style={styles.ratingRow}>
              <Text style={styles.ratingNumber}>{place.rating}</Text>
              <StarRating rating={place.rating} size={20} />
            </View>
            {place.userRatingsTotal && (
              <Text style={styles.ratingSubtext}>
                {t('restaurant.basedOnReviews', { count: place.userRatingsTotal })}
              </Text>
            )}
          </View>
        )}

        {/* Website + Hours */}
        <View style={styles.section}>
          {place?.website && (
            <TouchableOpacity onPress={() => Linking.openURL(place.website)} style={styles.linkRow}>
              <Ionicons name="globe-outline" size={16} color="#FF6B35" />
              <Text style={styles.linkText} numberOfLines={1}>{place.website}</Text>
              <Ionicons name="open-outline" size={14} color="#FF6B35" />
            </TouchableOpacity>
          )}
          {place?.openingHours?.weekdayText?.length > 0 && (
            <View style={styles.hoursBlock}>
              {place.openingHours.weekdayText.map((line: string, i: number) => (
                <Text key={i} style={styles.hoursText}>{line}</Text>
              ))}
            </View>
          )}
        </View>

        {/* Community Reviews */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('restaurant.appReviews')}</Text>
            <TouchableOpacity onPress={() => setShowReviewModal(true)}>
              <Text style={styles.addReviewLink}>{t('restaurant.addReview')}</Text>
            </TouchableOpacity>
          </View>

          {reviews.length === 0 ? (
            <Text style={styles.noReviews}>{t('restaurant.noReviews')}</Text>
          ) : (
            reviews.map((review) => (
              <View key={review.id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <View style={styles.reviewUser}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>
                        {(review.user?.name || '?')[0].toUpperCase()}
                      </Text>
                    </View>
                    <Text style={styles.reviewName}>{review.user?.name || 'User'}</Text>
                  </View>
                  <Text style={styles.reviewDate}>{timeAgo(review.createdAt)}</Text>
                </View>
                <StarRating rating={review.rating} size={14} />
                {review.comment && (
                  <Text style={styles.reviewComment}>{review.comment}</Text>
                )}
              </View>
            ))
          )}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Review Modal */}
      <Modal visible={showReviewModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('restaurant.addReview')}</Text>

            <View style={styles.modalStars}>
              <StarRating rating={reviewRating} size={36} interactive onRate={setReviewRating} />
            </View>

            <TextInput
              style={styles.modalInput}
              value={reviewComment}
              onChangeText={setReviewComment}
              placeholder={t('restaurant.reviewPlaceholder')}
              placeholderTextColor="#B0B0B0"
              multiline
              maxLength={500}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => {
                  setShowReviewModal(false);
                  setReviewRating(0);
                  setReviewComment('');
                }}
              >
                <Text style={styles.modalCancelText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSubmitBtn, createReview.isPending && { opacity: 0.6 }]}
                onPress={handleSubmitReview}
                disabled={createReview.isPending}
              >
                <Text style={styles.modalSubmitText}>
                  {createReview.isPending ? t('common.loading') : t('restaurant.submitReview')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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

  section: {
    marginHorizontal: 20, marginTop: 16, backgroundColor: 'white',
    borderRadius: 12, borderWidth: 1, borderColor: '#EBEBEB', padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#222222', marginBottom: 8 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  ratingNumber: { fontSize: 32, fontWeight: '800', color: '#222222' },
  ratingSubtext: { fontSize: 13, color: '#717171', marginTop: 4 },

  linkRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: '#EBEBEB',
  },
  linkText: { flex: 1, fontSize: 14, color: '#FF6B35' },
  hoursBlock: { marginTop: 12, gap: 4 },
  hoursText: { fontSize: 13, color: '#717171' },

  addReviewLink: { fontSize: 14, fontWeight: '600', color: '#FF6B35' },
  noReviews: { fontSize: 14, color: '#717171', textAlign: 'center', paddingVertical: 20 },
  reviewCard: {
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#EBEBEB',
  },
  reviewHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6,
  },
  reviewUser: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  avatar: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: '#FF6B35',
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { color: 'white', fontSize: 12, fontWeight: '700' },
  reviewName: { fontSize: 14, fontWeight: '600', color: '#222222' },
  reviewDate: { fontSize: 12, color: '#B0B0B0' },
  reviewComment: { fontSize: 14, color: '#444', marginTop: 6, lineHeight: 20 },

  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 24, paddingBottom: 40,
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#222222', textAlign: 'center' },
  modalStars: { alignItems: 'center', marginVertical: 20 },
  modalInput: {
    borderWidth: 1, borderColor: '#DDDDDD', borderRadius: 8,
    padding: 14, fontSize: 14, color: '#222222', minHeight: 80,
    textAlignVertical: 'top',
  },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  modalCancelBtn: {
    flex: 1, borderWidth: 1, borderColor: '#DDDDDD', borderRadius: 8,
    padding: 14, alignItems: 'center',
  },
  modalCancelText: { fontSize: 16, fontWeight: '600', color: '#717171' },
  modalSubmitBtn: {
    flex: 1, backgroundColor: '#FF6B35', borderRadius: 8,
    padding: 14, alignItems: 'center',
  },
  modalSubmitText: { fontSize: 16, fontWeight: '700', color: 'white' },
});
