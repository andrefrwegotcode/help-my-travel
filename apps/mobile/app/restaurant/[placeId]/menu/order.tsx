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

const headerOpts = {
  headerStyle: { backgroundColor: '#FFFFFF', elevation: 0, shadowOpacity: 0, borderBottomWidth: 0.5, borderBottomColor: '#EBEBEB' } as any,
  headerTintColor: '#222222',
  headerTitleStyle: { fontWeight: '600' as const, fontSize: 17 },
};

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
        items: items.map((i) => ({
          menuItem: {
            id: i.menuItem.id,
            name: i.menuItem.name,
            nameOriginal: i.menuItem.nameOriginal || i.menuItem.name,
            description: i.menuItem.description || undefined,
            price: i.menuItem.price || undefined,
            priceValue: i.menuItem.priceValue || undefined,
            currency: i.menuItem.currency || undefined,
          },
          quantity: i.quantity,
        })),
        tableNumber: tableNumber || undefined,
        notes: notes || undefined,
      });
      setOrderText(res.data.orderText);
    } catch (err: any) {
      const message = err?.response?.data?.message;
      const details = Array.isArray(message) ? message.join(', ') : message;
      Alert.alert(t('common.error'), details || 'Failed to generate order.');
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
      <Stack.Screen options={{ title: t('order.title'), ...headerOpts }} />
      <ScrollView style={styles.container} contentContainerStyle={{ padding: 20, paddingBottom: 32 }}>

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
            placeholder="e.g. 5" placeholderTextColor="#B0B0B0"
          />
          <Text style={[styles.label, { marginTop: 12 }]}>{t('order.notes')}</Text>
          <TextInput
            style={[styles.input, { height: 80 }]}
            value={notes} onChangeText={setNotes}
            placeholder="e.g. No gluten, extra spicy..." placeholderTextColor="#B0B0B0"
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
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  section: {
    backgroundColor: 'white', borderRadius: 12, padding: 16, marginBottom: 16,
    borderWidth: 1, borderColor: '#EBEBEB',
  },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#222222', marginBottom: 12 },
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderColor: '#EBEBEB' },
  itemName: { flex: 1, fontSize: 14, color: '#222222' },
  itemQty: { fontSize: 14, fontWeight: '700', color: '#717171', marginRight: 8 },
  itemPrice: { fontSize: 14, fontWeight: '700', color: '#FF6B35' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTopWidth: 2, borderColor: '#EBEBEB' },
  totalLabel: { fontSize: 16, fontWeight: '700', color: '#222222' },
  totalValue: { fontSize: 18, fontWeight: '800', color: '#FF6B35' },
  label: { fontSize: 12, fontWeight: '500', color: '#717171', marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: '#DDDDDD', borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: '#222222',
  },
  generateBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#FF6B35', borderRadius: 8, padding: 18,
  },
  generateBtnText: { color: 'white', fontSize: 16, fontWeight: '700' },
  orderTextBox: {
    backgroundColor: 'white', borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: '#EBEBEB',
  },
  orderTextLabel: { fontSize: 13, fontWeight: '700', color: '#667EEA', marginBottom: 8, textTransform: 'uppercase' },
  orderText: { fontSize: 15, color: '#222222', lineHeight: 22, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  orderActions: { flexDirection: 'row', gap: 8, marginTop: 16 },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 1, borderColor: '#FF6B35', borderRadius: 8, paddingVertical: 10,
  },
  actionBtnText: { color: '#FF6B35', fontWeight: '600', fontSize: 13 },
});
