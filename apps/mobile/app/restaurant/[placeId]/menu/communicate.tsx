import { useState, useRef } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import api from '../../../../src/services/api';
import { useAuthStore } from '../../../../src/store/auth.store';
import type { ChatMessage, ChatSender } from '@helpmytravel/shared';

export default function CommunicateScreen() {
  const { t } = useTranslation();
  const { user } = useAuthStore();

  const scrollViewRef = useRef<ScrollView>(null);
  const [sender, setSender] = useState<ChatSender>('customer');
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);

  const fromLanguage = sender === 'customer' ? (user?.language || 'en') : 'auto';
  const toLanguage = sender === 'customer' ? 'auto' : (user?.language || 'en');

  const handleTranslate = async () => {
    if (!inputText.trim()) return;
    setLoading(true);
    try {
      const res = await api.post('/translation/translate', {
        text: inputText,
        fromLanguage,
        toLanguage,
      });

      const msg: ChatMessage = {
        id: Date.now().toString(),
        sender,
        originalText: inputText,
        originalLanguage: res.data.fromLanguage,
        translatedText: res.data.translatedText,
        targetLanguage: res.data.toLanguage,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, msg]);
      setInputText('');
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (err: any) {
      Alert.alert(t('common.error'), err?.response?.data?.message || t('communicate.translationFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: t('communicate.title'),
          headerStyle: { backgroundColor: '#FFFFFF', elevation: 0, shadowOpacity: 0, borderBottomWidth: 0.5, borderBottomColor: '#EBEBEB' } as any,
          headerTintColor: '#222222',
          headerTitleStyle: { fontWeight: '600', fontSize: 17 },
        }}
      />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        {/* Toggle sender */}
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>{t('communicate.toggleSender')}</Text>
          <View style={styles.toggle}>
            <TouchableOpacity
              style={[styles.toggleOption, sender === 'customer' && styles.toggleActive]}
              onPress={() => setSender('customer')}
            >
              <Text style={[styles.toggleText, sender === 'customer' && styles.toggleTextActive]}>
                👤 {t('communicate.customer')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleOption, sender === 'staff' && styles.toggleStaffActive]}
              onPress={() => setSender('staff')}
            >
              <Text style={[styles.toggleText, sender === 'staff' && styles.toggleTextActive]}>
                🧑‍🍳 {t('communicate.staff')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Messages */}
        <ScrollView ref={scrollViewRef} style={styles.messages} contentContainerStyle={{ padding: 16, gap: 10 }}>
          {messages.length === 0 && (
            <View style={styles.emptyMessages}>
              <Ionicons name="chatbubbles-outline" size={48} color="#DDDDDD" />
              <Text style={styles.emptyText}>Start translating messages</Text>
            </View>
          )}
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
        </ScrollView>

        {/* Input area */}
        <View style={styles.inputArea}>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={inputText}
              onChangeText={setInputText}
              placeholder={
                sender === 'customer'
                  ? t('communicate.typeYourMessage')
                  : 'Type in local language...'
              }
              placeholderTextColor="#B0B0B0"
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={[styles.sendBtn, loading && { opacity: 0.6 }]}
              onPress={handleTranslate}
              disabled={loading || !inputText.trim()}
            >
              {loading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Ionicons name="language-outline" size={22} color="white" />
              )}
            </TouchableOpacity>
          </View>
          <Text style={styles.hint}>
            {sender === 'customer'
              ? `${t('communicate.youAreWriting')} → translates to local language`
              : `${t('communicate.staffIsWriting')} → translates to ${user?.language?.toUpperCase()}`}
          </Text>
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isCustomer = message.sender === 'customer';
  return (
    <View style={[bubbleStyles.container, isCustomer ? bubbleStyles.customerContainer : bubbleStyles.staffContainer]}>
      <View style={[bubbleStyles.bubble, isCustomer ? bubbleStyles.customerBubble : bubbleStyles.staffBubble]}>
        <Text style={[bubbleStyles.label, { color: isCustomer ? '#FF6B35' : '#667EEA' }]}>
          {isCustomer ? '👤 You' : '🧑‍🍳 Staff'}
        </Text>
        <Text style={bubbleStyles.originalText}>{message.originalText}</Text>
        <View style={bubbleStyles.divider} />
        <Text style={bubbleStyles.translatedLabel}>→ Translated</Text>
        <Text style={bubbleStyles.translatedText}>{message.translatedText}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  toggleRow: { backgroundColor: 'white', padding: 16, alignItems: 'center', gap: 8, borderBottomWidth: 0.5, borderBottomColor: '#EBEBEB' },
  toggleLabel: { fontSize: 12, color: '#717171', textTransform: 'uppercase', letterSpacing: 0.5 },
  toggle: { flexDirection: 'row', backgroundColor: '#F7F7F7', borderRadius: 24, padding: 4 },
  toggleOption: { flex: 1, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, alignItems: 'center' },
  toggleActive: { backgroundColor: '#FF6B35' },
  toggleStaffActive: { backgroundColor: '#667EEA' },
  toggleText: { fontSize: 13, fontWeight: '600', color: '#717171' },
  toggleTextActive: { color: 'white' },
  messages: { flex: 1 },
  emptyMessages: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { color: '#717171', fontSize: 14 },
  inputArea: { backgroundColor: 'white', padding: 12, gap: 6, borderTopWidth: 0.5, borderTopColor: '#EBEBEB' },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  input: {
    flex: 1, borderWidth: 1, borderColor: '#DDDDDD', borderRadius: 24,
    paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, maxHeight: 100, color: '#222222',
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#667EEA',
    justifyContent: 'center', alignItems: 'center',
  },
  hint: { fontSize: 11, color: '#B0B0B0', textAlign: 'center' },
});

const bubbleStyles = StyleSheet.create({
  container: { maxWidth: '90%' },
  customerContainer: { alignSelf: 'flex-end' },
  staffContainer: { alignSelf: 'flex-start' },
  bubble: {
    borderRadius: 18, padding: 12,
  },
  customerBubble: { backgroundColor: '#FFF5F2', borderWidth: 1, borderColor: '#FFE5D8' },
  staffBubble: { backgroundColor: '#F0F2FF', borderWidth: 1, borderColor: '#E0E5FF' },
  label: { fontSize: 11, fontWeight: '700', marginBottom: 4 },
  originalText: { fontSize: 14, color: '#222222' },
  divider: { height: 1, backgroundColor: '#EBEBEB', marginVertical: 8 },
  translatedLabel: { fontSize: 10, color: '#B0B0B0', marginBottom: 2 },
  translatedText: { fontSize: 14, color: '#444', fontStyle: 'italic' },
});
