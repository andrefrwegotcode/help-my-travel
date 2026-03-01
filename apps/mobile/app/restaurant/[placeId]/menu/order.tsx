import { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Alert, Platform,
} from 'react-native';
import * as ExpoClipboard from 'expo-clipboard';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import api from '../../../../src/services/api';
import { useOrderStore } from '../../../../src/store/order.store';
import { useAuthStore } from '../../../../src/store/auth.store';
import { useQuery } from '@tanstack/react-query';

export default function OrderScreen() {
  const { placeId } = useLocalSearchParams<{ placeId: string }>();
  const { t } = useTranslation();
  const { items, clearOrder, totalPrice } = useOrderStore();
  const { user } = useAuthStore();
  const [tableNumber, setTableNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [orderText, setOrderText] = useState('');
  const [loading, setLoading] = useState(false);

  const { data: place } = useQuery({
    queryKey: ['place', placeId],
    queryFn: async () => (await api.get(`/places/${placeId}`)).data,
  });

  const generateOrder = async () => {
    if (items.length === 0) {
      Alert.alert('Empty order', 'Please add items to your order first.');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/order/generate', {
        placeId,
        placeName: place?.name || 'Restaurant',
        placeLanguage: place?.language || user?.language || 'en',
        items: items.map((i) => ({ menuItem: i.menuItem, quantity: i.quantity })),
        tableNumber: tableNumber || undefined,
        notes: notes || undefined,
      });
      setOrderText(res.data.orderText);
    } catch (err: any) {
      Alert.alert(t('common.error'), err?.response?.data?.message || 'Failed to generate order.');
    } finally {
      setLoading(false);
    }
  };

  const copyOrder = async () => {
    await ExpoClipboard.setStringAsync(orderText);
    Alert.alert(t('order.orderCopied'));
  };

  return (
    <>
      <Stack.Screen options={{ title: t('order.title'), headerStyle: { backgroundColor: '#FF6B35' }, headerTintColor: 'white' }} />
      <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>

        {/* Order items summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Selection</Text>
          {items.map((item) => (
            <View key={item.menuItem.id} style={styles.itemRow}>
              <Text style={styles.itemName}>{item.menuItem.name}</Text>
              <Text style={styles.itemQty}>×{item.quantity}</Text>
              {item.menuItem.price && (
                <Text style={styles.itemPrice}>
                  {item.menuItem.currency}{((item.menuItem.priceValue || 0) * item.quantity).toFixed(2)}
                </Text>
              )}
            </View>
          ))}
          {totalPrice() > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>{t('order.total')}</Text>
              <Text style={styles.totalValue}>{totalPrice().toFixed(2)}</Text>
            </View>
          )}
        </View>

        {/* Optional fields */}
        <View style={styles.section}>
          <Text style={styles.label}>{t('order.tableNumber')}</Text>
          <TextInput
            style={styles.input} value={tableNumber} onChangeText={setTableNumber}
            placeholder="e.g. 5"
          />
          <Text style={[styles.label, { marginTop: 12 }]}>{t('order.notes')}</Text>
          <TextInput
            style={[styles.input, { height: 80 }]}
            value={notes} onChangeText={setNotes}
            placeholder="e.g. No gluten, extra spicy..."
            multiline
          />
        </View>

        {/* Generated order text */}
        {orderText ? (
          <View style={styles.orderTextBox}>
            <Text style={styles.orderTextLabel}>{t('order.generatedOrder')}</Text>
            <Text style={styles.orderText}>{orderText}</Text>
            <View style={styles.orderActions}>
              <TouchableOpacity style={styles.actionBtn} onPress={copyOrder}>
                <Ionicons name="copy-outline" size={16} color="#FF6B35" />
                <Text style={styles.actionBtnText}>{t('order.copyOrder')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#667EEA', borderColor: '#667EEA' }]}
                onPress={() => router.push(`/restaurant/${placeId}/menu/communicate`)}
              >
                <Ionicons name="chatbubbles-outline" size={16} color="white" />
                <Text style={[styles.actionBtnText, { color: 'white' }]}>
                  {t('order.communicateWithStaff')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.generateBtn, loading && { opacity: 0.6 }]}
            onPress={generateOrder}
            disabled={loading}
          >
            <Ionicons name="document-text-outline" size={20} color="white" />
            <Text style={styles.generateBtnText}>
              {loading ? t('common.loading') : t('order.generate')}
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  section: { backgroundColor: 'white', borderRadius: 16, padding: 16, marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A2E', marginBottom: 12 },
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderColor: '#F5F5F5' },
  itemName: { flex: 1, fontSize: 14, color: '#333' },
  itemQty: { fontSize: 14, fontWeight: '700', color: '#666', marginRight: 8 },
  itemPrice: { fontSize: 14, fontWeight: '700', color: '#FF6B35' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTopWidth: 2, borderColor: '#F5F5F5' },
  totalLabel: { fontSize: 16, fontWeight: '700', color: '#1A1A2E' },
  totalValue: { fontSize: 18, fontWeight: '800', color: '#FF6B35' },
  label: { fontSize: 13, fontWeight: '600', color: '#666', marginBottom: 6 },
  input: {
    borderWidth: 1.5, borderColor: '#E0E0E0', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 14,
  },
  generateBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#FF6B35', borderRadius: 16, padding: 18,
  },
  generateBtnText: { color: 'white', fontSize: 16, fontWeight: '700' },
  orderTextBox: { backgroundColor: 'white', borderRadius: 16, padding: 16 },
  orderTextLabel: { fontSize: 13, fontWeight: '700', color: '#667EEA', marginBottom: 8, textTransform: 'uppercase' },
  orderText: { fontSize: 15, color: '#1A1A2E', lineHeight: 22, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  orderActions: { flexDirection: 'row', gap: 8, marginTop: 16 },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 1.5, borderColor: '#FF6B35', borderRadius: 10, paddingVertical: 10,
  },
  actionBtnText: { color: '#FF6B35', fontWeight: '600', fontSize: 13 },
});

