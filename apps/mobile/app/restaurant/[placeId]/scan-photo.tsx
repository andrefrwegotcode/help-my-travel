import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Image,
} from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import api from '../../../src/services/api';
import { useAuthStore } from '../../../src/store/auth.store';

export default function ScanPhotoScreen() {
  const { placeId } = useLocalSearchParams<{ placeId: string }>();
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [status, setStatus] = useState<'idle' | 'uploading' | 'polling'>('idle');
  const [imageUri, setImageUri] = useState<string | null>(null);

  const pickImage = async (useCamera: boolean) => {
    let result: ImagePicker.ImagePickerResult;

    if (useCamera) {
      const { status: camStatus } = await ImagePicker.requestCameraPermissionsAsync();
      if (camStatus !== 'granted') {
        Alert.alert(t('common.error'), 'Camera permission is required');
        return;
      }
      result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        base64: false,
      });
    } else {
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        base64: false,
      });
    }

    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    setImageUri(asset.uri);
    setStatus('uploading');

    try {
      const formData = new FormData();
      formData.append('photo', {
        uri: asset.uri,
        type: asset.mimeType || 'image/jpeg',
        name: 'menu-photo.jpg',
      } as any);
      formData.append('placeId', placeId!);
      formData.append('language', user?.language || 'en');

      const res = await api.post('/menu/scan-photo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data.jobId) {
        setStatus('polling');
        pollJobStatus(res.data.jobId);
      }
    } catch (err: any) {
      Alert.alert(t('common.error'), err?.response?.data?.message || 'Failed to process photo');
      setStatus('idle');
    }
  };

  const pollJobStatus = async (jobId: string) => {
    let attempts = 0;
    const poll = async () => {
      if (attempts >= 60) {
        Alert.alert(t('common.error'), 'Timed out. Please try again.');
        setStatus('idle');
        return;
      }
      try {
        const res = await api.get(`/menu/status/${jobId}`);
        if (res.data.status === 'completed') {
          router.replace(`/restaurant/${placeId}/menu`);
        } else if (res.data.status === 'failed') {
          Alert.alert(t('common.error'), res.data.error || 'Could not extract menu from photo.');
          setStatus('idle');
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

  return (
    <>
      <Stack.Screen options={{ title: t('restaurant.scanPhoto'), headerStyle: { backgroundColor: '#FF6B35' }, headerTintColor: 'white' }} />
      <View style={styles.container}>
        {status === 'idle' && (
          <>
            <View style={styles.iconArea}>
              <Ionicons name="document-text-outline" size={80} color="#FF6B35" />
              <Text style={styles.title}>{t('restaurant.scanPhoto')}</Text>
              <Text style={styles.subtitle}>{t('menu.photoDescription')}</Text>
            </View>

            <View style={styles.btnArea}>
              <TouchableOpacity style={styles.primaryBtn} onPress={() => pickImage(true)}>
                <Ionicons name="camera" size={22} color="white" />
                <Text style={styles.primaryBtnText}>{t('menu.takePhoto')}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.outlineBtn} onPress={() => pickImage(false)}>
                <Ionicons name="images-outline" size={22} color="#FF6B35" />
                <Text style={styles.outlineBtnText}>{t('menu.chooseFromGallery')}</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {(status === 'uploading' || status === 'polling') && (
          <View style={styles.loadingArea}>
            {imageUri && <Image source={{ uri: imageUri }} style={styles.preview} />}
            <ActivityIndicator size="large" color="#FF6B35" style={{ marginTop: 24 }} />
            <Text style={styles.loadingText}>{t('menu.processingPhoto')}</Text>
            <Text style={styles.subText}>
              {status === 'uploading' ? 'Uploading...' : 'Extracting and translating menu items...'}
            </Text>
          </View>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  iconArea: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  title: { fontSize: 22, fontWeight: '800', color: '#1A1A2E', marginTop: 16 },
  subtitle: { fontSize: 14, color: '#888', textAlign: 'center', marginTop: 8, lineHeight: 20 },
  btnArea: { padding: 24, gap: 12 },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: '#FF6B35', borderRadius: 14, padding: 16,
  },
  primaryBtnText: { color: 'white', fontSize: 17, fontWeight: '700' },
  outlineBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: 'white', borderWidth: 1.5, borderColor: '#FF6B35', borderRadius: 14, padding: 16,
  },
  outlineBtnText: { color: '#FF6B35', fontSize: 17, fontWeight: '700' },
  loadingArea: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  preview: { width: 200, height: 280, borderRadius: 12, backgroundColor: '#e0e0e0' },
  loadingText: { fontSize: 18, fontWeight: '700', color: '#1A1A2E', marginTop: 12 },
  subText: { fontSize: 14, color: '#888', textAlign: 'center', marginTop: 4 },
});
