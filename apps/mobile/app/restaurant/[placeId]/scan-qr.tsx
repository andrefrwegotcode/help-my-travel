import { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import api from '../../../src/services/api';
import { useAuthStore } from '../../../src/store/auth.store';

const headerOpts = {
  headerStyle: { backgroundColor: '#FFFFFF', elevation: 0, shadowOpacity: 0, borderBottomWidth: 0.5, borderBottomColor: '#EBEBEB' } as any,
  headerTintColor: '#222222',
  headerTitleStyle: { fontWeight: '600' as const, fontSize: 17 },
};

export default function ScanQrScreen() {
  const { placeId } = useLocalSearchParams<{ placeId: string }>();
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [permission, requestPermission] = useCameraPermissions();
  const [status, setStatus] = useState<'scanning' | 'loading' | 'polling'>('scanning');
  const [scannedUrl, setScannedUrl] = useState<string | null>(null);
  const scannedRef = useRef(false);

  const handleBarcodeScanned = async ({ data }: { data: string }) => {
    if (scannedRef.current) return;

    if (!data.startsWith('http://') && !data.startsWith('https://')) {
      Alert.alert(t('common.error'), t('menu.invalidQr'));
      return;
    }

    scannedRef.current = true;
    setScannedUrl(data);
    setStatus('loading');

    try {
      const res = await api.post('/menu/scan-url', {
        url: data,
        placeId,
        language: user?.language || 'en',
      });

      if (res.data.jobId) {
        setStatus('polling');
        pollJobStatus(res.data.jobId);
      }
    } catch (err: any) {
      Alert.alert(t('common.error'), err?.response?.data?.message || 'Failed to scan QR code');
      scannedRef.current = false;
      setStatus('scanning');
    }
  };

  const pollJobStatus = async (jobId: string) => {
    let attempts = 0;
    const poll = async () => {
      if (attempts >= 60) {
        Alert.alert(t('common.error'), 'Timed out. Please try again.');
        setStatus('scanning');
        scannedRef.current = false;
        return;
      }
      try {
        const res = await api.get(`/menu/status/${jobId}`);
        if (res.data.status === 'completed') {
          router.replace(`/restaurant/${placeId}/menu`);
        } else if (res.data.status === 'failed') {
          Alert.alert(t('common.error'), res.data.error || 'Could not extract menu from QR code.');
          setStatus('scanning');
          scannedRef.current = false;
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

  if (!permission) {
    return <View style={styles.centered}><ActivityIndicator color="#FF6B35" /></View>;
  }

  if (!permission.granted) {
    return (
      <>
        <Stack.Screen options={{ title: t('restaurant.scanQr'), ...headerOpts }} />
        <View style={styles.centered}>
          <Ionicons name="camera-outline" size={64} color="#DDDDDD" />
          <Text style={styles.permText}>Camera permission is needed to scan QR codes</Text>
          <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
            <Text style={styles.permBtnText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: t('restaurant.scanQr'), ...headerOpts }} />
      <View style={styles.container}>
        {status === 'scanning' ? (
          <>
            <CameraView
              style={styles.camera}
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={handleBarcodeScanned}
            />
            <View style={styles.overlay}>
              <View style={styles.scanFrame} />
              <Text style={styles.hintText}>{t('menu.pointCamera')}</Text>
            </View>
          </>
        ) : (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#FF6B35" />
            <Text style={styles.loadingTitle}>{t('menu.qrDetected')}</Text>
            {scannedUrl && <Text style={styles.urlText} numberOfLines={2}>{scannedUrl}</Text>}
          </View>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 16, backgroundColor: '#FFFFFF' },
  camera: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center', alignItems: 'center',
  },
  scanFrame: {
    width: 250, height: 250, borderWidth: 2, borderColor: '#FF6B35',
    borderRadius: 20, backgroundColor: 'transparent',
  },
  hintText: { color: 'white', fontSize: 16, fontWeight: '600', marginTop: 24, textAlign: 'center' },
  loadingTitle: { fontSize: 16, fontWeight: '700', color: '#222222', textAlign: 'center' },
  urlText: { fontSize: 12, color: '#717171', textAlign: 'center' },
  permText: { fontSize: 16, color: '#717171', textAlign: 'center' },
  permBtn: { backgroundColor: '#FF6B35', borderRadius: 8, paddingHorizontal: 24, paddingVertical: 12 },
  permBtnText: { color: 'white', fontWeight: '700', fontSize: 16 },
});
