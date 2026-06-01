/**
 * Fresh — Help & Support Screen
 * Standalone support chat with topic selection and order linking
 */

import { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, Pressable, FlatList, ScrollView,
  StyleSheet, KeyboardAvoidingView, Platform, Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius } from '../src/theme';
import { useAuthStore } from '../src/stores/authStore';
import { useOrderStore } from '../src/stores/orderStore';
import { ChatMessage, Order } from '../src/types';
import { supabase } from '../src/api/supabase';
import { useDynamic } from '../src/hooks/useDynamic';

type SupportTopic = {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  desc: string;
  color: string;
};

const TOPICS: SupportTopic[] = [
  {
    id: 'order',
    icon: 'receipt-outline',
    label: 'Order Issue',
    desc: 'Help with a specific order',
    color: colors.primary,
  },
  {
    id: 'delivery',
    icon: 'bicycle-outline',
    label: 'Delivery Help',
    desc: 'Track or reschedule delivery',
    color: '#E65100',
  },
  {
    id: 'product',
    icon: 'leaf-outline',
    label: 'Product Info',
    desc: 'Freshness, storage, availability',
    color: colors.secondary,
  },
  {
    id: 'feedback',
    icon: 'star-outline',
    label: 'Feedback',
    desc: 'Share your experience',
    color: '#6A1B9A',
  },
  {
    id: 'other',
    icon: 'chatbubble-ellipses-outline',
    label: 'Something Else',
    desc: 'General questions & help',
    color: '#00838F',
  },
];

type ScreenState = 'topics' | 'pick-order' | 'chat';

export default function SupportScreen() {
  const d = useDynamic();

  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const orders = useOrderStore((s) => s.orders);
  const fetchOrders = useOrderStore((s) => s.fetchOrders);

  const [screen, setScreen] = useState<ScreenState>('topics');
  const [selectedTopic, setSelectedTopic] = useState<SupportTopic | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const flatListRef = useRef<FlatList>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (user?.id) fetchOrders(user.id);
  }, [user?.id]);

  // Animate transitions
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [screen]);

  // If we have an order selected, fetch chat messages for it
  useEffect(() => {
    if (screen !== 'chat' || !selectedOrder || !supabase) return;

    const fetchMessages = async () => {
      const { data } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('order_id', selectedOrder.id)
        .order('created_at', { ascending: true });
      if (data) setMessages(data);
    };
    fetchMessages();

    // Real-time subscription
    const channel = supabase
      .channel(`support-${selectedOrder.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `order_id=eq.${selectedOrder.id}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as ChatMessage]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [screen, selectedOrder]);

  // Auto scroll
  useEffect(() => {
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages]);

  const handleTopicPress = (topic: SupportTopic) => {
    setSelectedTopic(topic);
    fadeAnim.setValue(0);

    if (topic.id === 'order' || topic.id === 'delivery') {
      // Show order picker
      setScreen('pick-order');
    } else {
      // Go straight to chat with a welcome message
      setMessages([
        {
          id: 'welcome',
          order_id: '',
          sender: 'system',
          text: `You selected: ${topic.label}. How can we help you today?`,
          type: 'text',
          created_at: new Date().toISOString(),
        },
      ]);
      setScreen('chat');
    }
  };

  const handleOrderPick = (order: Order) => {
    setSelectedOrder(order);
    fadeAnim.setValue(0);
    setScreen('chat');
  };

  const handleSkipOrderPick = () => {
    setSelectedOrder(null);
    fadeAnim.setValue(0);
    setMessages([
      {
        id: 'welcome',
        order_id: '',
        sender: 'system',
        text: `You selected: ${selectedTopic?.label}. Describe your issue and we'll help!`,
        type: 'text',
        created_at: new Date().toISOString(),
      },
    ]);
    setScreen('chat');
  };

  const handleBack = () => {
    fadeAnim.setValue(0);
    if (screen === 'chat' && (selectedTopic?.id === 'order' || selectedTopic?.id === 'delivery')) {
      setScreen('pick-order');
    } else if (screen === 'chat' || screen === 'pick-order') {
      setScreen('topics');
    } else {
      router.back();
    }
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || !user) return;
    setInput('');

    const sender = user.role === 'admin' ? 'admin' : 'user';

    // Optimistic
    const tempMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      order_id: selectedOrder?.id || '',
      sender,
      text,
      type: 'text',
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempMsg]);

    // If we have a selected order, save to Supabase
    if (selectedOrder && supabase) {
      try {
        await supabase.from('chat_messages').insert({
          order_id: selectedOrder.id,
          sender,
          text,
          type: 'text',
        });
      } catch (err) {
        console.error('Support send error:', err);
      }
    }
    // For general topics (no order), messages stay local for now
  };

  const formatTime = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleTimeString('en-US', {
        hour: 'numeric', minute: '2-digit',
      });
    } catch { return ''; }
  };

  // ── Header ──
  const renderHeader = () => (
    <View style={styles.header}>
      <Pressable style={styles.backBtn} onPress={screen === 'topics' ? () => router.back() : handleBack}>
        <Ionicons name="arrow-back" size={22} color={d.text} />
      </Pressable>
      <View style={styles.headerInfo}>
        <Text style={[styles.headerTitle, d.s.text]}>
          {screen === 'topics' ? 'Help & Support' :
           screen === 'pick-order' ? 'Select an Order' :
           selectedOrder ? `Order ${selectedOrder.order_number}` :
           selectedTopic?.label || 'Support Chat'}
        </Text>
        <Text style={styles.headerStatus}>
          {screen === 'topics' ? 'We\'re here to help' :
           screen === 'pick-order' ? 'Choose the order you need help with' :
           'Active'}
        </Text>
      </View>
      <View style={styles.headerAvatar}>
        <Ionicons name="headset" size={22} color="#FFFFFF" />
      </View>
    </View>
  );

  // ── Topics Screen ──
  const renderTopics = () => (
    <Animated.View style={[styles.topicsContainer, { opacity: fadeAnim }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.topicsScroll}>
        {/* Greeting */}
        <View style={styles.greeting}>
          <Text style={styles.greetingEmoji}>👋</Text>
          <Text style={styles.greetingTitle}>
            Hi{user?.name ? `, ${user.name.split(' ')[0]}` : ''}!
          </Text>
          <Text style={styles.greetingDesc}>
            What can we help you with today?
          </Text>
        </View>

        {/* Topics Grid */}
        <View style={styles.topicsGrid}>
          {TOPICS.map((topic) => (
            <Pressable
              key={topic.id}
              style={styles.topicCard}
              onPress={() => handleTopicPress(topic)}
            >
              <View style={[styles.topicIcon, { backgroundColor: `${topic.color}15` }]}>
                <Ionicons name={topic.icon as any} size={24} color={topic.color} />
              </View>
              <Text style={styles.topicLabel}>{topic.label}</Text>
              <Text style={styles.topicDesc}>{topic.desc}</Text>
            </Pressable>
          ))}
        </View>

        {/* Quick tip */}
        <View style={styles.tipCard}>
          <Ionicons name="bulb-outline" size={18} color="#43A047" />
          <Text style={styles.tipText}>
            For order-specific help, select "Order Issue" and pick the order — we'll pull up all the details.
          </Text>
        </View>
      </ScrollView>
    </Animated.View>
  );

  // ── Order Picker ──
  const renderOrderPicker = () => (
    <Animated.View style={[styles.orderPickerContainer, { opacity: fadeAnim }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.orderPickerScroll}>
        {orders.length === 0 ? (
          <View style={styles.noOrders}>
            <Ionicons name="receipt-outline" size={48} color="rgba(27, 60, 18, 0.25)" />
            <Text style={styles.noOrdersTitle}>No orders yet</Text>
            <Text style={styles.noOrdersDesc}>You can still describe your issue below</Text>
          </View>
        ) : (
          orders.map((order) => (
            <Pressable
              key={order.id}
              style={styles.orderPickCard}
              onPress={() => handleOrderPick(order)}
            >
              <View style={[
                styles.orderPickIcon,
                order.status === 'Delivered' ? styles.orderPickDone : styles.orderPickActive,
              ]}>
                <Ionicons
                  name={order.status === 'Delivered' ? 'checkmark-circle' : 'time'}
                  size={20}
                  color={order.status === 'Delivered' ? colors.secondary : colors.warning}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.orderPickId}>{order.order_number}</Text>
                <Text style={styles.orderPickMeta}>
                  {order.status} · ₹{order.total?.toLocaleString()} · {
                    new Date(order.created_at).toLocaleDateString('en-IN', {
                      day: 'numeric', month: 'short',
                    })
                  }
                </Text>
                {order.items_summary && (
                  <Text style={styles.orderPickItems} numberOfLines={1}>
                    {order.items_summary}
                  </Text>
                )}
              </View>
              <Ionicons name="chevron-forward" size={18} color="rgba(129,199,132,0.25)" />
            </Pressable>
          ))
        )}

        {/* Skip option */}
        <Pressable style={styles.skipBtn} onPress={handleSkipOrderPick}>
          <Text style={styles.skipBtnText}>Not about a specific order</Text>
          <Ionicons name="arrow-forward" size={16} color="#2E7D32" />
        </Pressable>
      </ScrollView>
    </Animated.View>
  );

  // ── Chat Screen ──
  const renderChat = () => (
    <Animated.View style={[styles.chatContainer, { opacity: fadeAnim }]}>
      {/* Order context card */}
      {selectedOrder && (
        <View style={styles.contextCard}>
          <Ionicons name="receipt" size={16} color="#2E7D32" />
          <Text style={styles.contextText}>
            {selectedOrder.order_number} · {selectedOrder.status} · ₹{selectedOrder.total?.toLocaleString()}
          </Text>
        </View>
      )}

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={({ item }) => {
          if (item.sender === 'system') {
            return (
              <View style={styles.systemMsg}>
                <Text style={styles.systemMsgText}>{item.text}</Text>
              </View>
            );
          }
          const isAdmin = item.sender === 'admin';
          return (
            <View style={[styles.msgBubble, isAdmin ? styles.adminBubble : styles.userBubble]}>
              <Text style={[styles.msgText, isAdmin ? styles.adminText : styles.userText]}>
                {item.text}
              </Text>
              <Text style={[styles.msgTime, isAdmin && styles.adminTime]}>
                {formatTime(item.created_at)}
              </Text>
            </View>
          );
        }}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
      />

      {/* Input */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.inputField}
          placeholder="Describe your issue..."
          placeholderTextColor={'rgba(27, 60, 18, 0.3)'}
          value={input}
          onChangeText={setInput}
          onSubmitEditing={sendMessage}
          returnKeyType="send"
        />
        <Pressable style={styles.sendBtn} onPress={sendMessage}>
          <Ionicons name="send" size={20} color="#FFFFFF" />
        </Pressable>
      </View>
    </Animated.View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {renderHeader()}
      {screen === 'topics' && renderTopics()}
      {screen === 'pick-order' && renderOrderPicker()}
      {screen === 'chat' && renderChat()}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7F5' },

  // ── Header ──
  header: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.base,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.base,
    paddingTop: 48, backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderBottomWidth: 1, borderBottomColor: 'rgba(46, 125, 50, 0.08)',
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(46, 125, 50, 0.06)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(46, 125, 50, 0.10)',
  },
  headerInfo: { flex: 1 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#1B3C12' },
  headerStatus: { fontSize: 12, color: 'rgba(27, 60, 18, 0.5)', marginTop: 2 },
  headerAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(46, 125, 50, 0.10)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(46, 125, 50, 0.18)',
  },

  // ── Topics ──
  topicsContainer: { flex: 1 },
  topicsScroll: { padding: spacing.lg },
  greeting: { alignItems: 'center', marginBottom: spacing['2xl'], paddingTop: spacing.lg },
  greetingEmoji: { fontSize: 40, marginBottom: spacing.base },
  greetingTitle: { fontSize: 24, fontWeight: '700', letterSpacing: -0.5, color: '#1B3C12' },
  greetingDesc: { fontSize: 14, color: 'rgba(27, 60, 18, 0.5)', marginTop: 4 },
  topicsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: spacing.base,
  },
  topicCard: {
    width: '48%',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 16, padding: spacing.lg,
    borderWidth: 1, borderColor: 'rgba(46, 125, 50, 0.12)',
  },
  topicIcon: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.base,
  },
  topicLabel: { fontSize: 14, fontWeight: '600', marginBottom: 2, color: '#2E4A26' },
  topicDesc: { fontSize: 11, color: 'rgba(27, 60, 18, 0.5)', lineHeight: 15 },
  tipCard: {
    flexDirection: 'row', gap: spacing.base, alignItems: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.7)', borderRadius: radius.md,
    padding: spacing.lg, marginTop: spacing['2xl'],
    borderWidth: 1, borderColor: 'rgba(46, 125, 50, 0.08)',
  },
  tipText: { flex: 1, fontSize: 12, color: 'rgba(27, 60, 18, 0.55)', lineHeight: 17 },

  // ── Order Picker ──
  orderPickerContainer: { flex: 1 },
  orderPickerScroll: { padding: spacing.lg },
  orderPickCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.base,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 16, padding: spacing.lg,
    marginBottom: spacing.base,
    borderWidth: 1, borderColor: 'rgba(46, 125, 50, 0.12)',
  },
  orderPickIcon: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  orderPickActive: { backgroundColor: 'rgba(245, 124, 0, 0.08)' },
  orderPickDone: { backgroundColor: 'rgba(46, 125, 50, 0.08)' },
  orderPickId: { fontSize: 15, fontWeight: '600', color: '#2E4A26' },
  orderPickMeta: { fontSize: 12, color: 'rgba(27, 60, 18, 0.5)', marginTop: 2 },
  orderPickItems: { fontSize: 11, color: 'rgba(27, 60, 18, 0.55)', marginTop: 2 },
  noOrders: { alignItems: 'center', paddingVertical: spacing['4xl'] },
  noOrdersTitle: { fontSize: 16, fontWeight: '600', marginTop: spacing.base, color: '#1B3C12' },
  noOrdersDesc: { fontSize: 13, color: 'rgba(27, 60, 18, 0.5)', marginTop: 4 },
  skipBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: spacing.lg, marginTop: spacing.base,
  },
  skipBtnText: { fontSize: 14, fontWeight: '500', color: '#2E7D32' },

  // ── Chat ──
  chatContainer: { flex: 1 },
  contextCard: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: spacing.lg, marginTop: spacing.sm,
    paddingVertical: 8, paddingHorizontal: spacing.base,
    backgroundColor: 'rgba(46, 125, 50, 0.06)',
    borderRadius: radius.sm,
    borderWidth: 1, borderColor: 'rgba(46, 125, 50, 0.10)',
  },
  contextText: { fontSize: 12, color: '#2E7D32', fontWeight: '500' },
  messagesList: { padding: spacing.lg, paddingBottom: 8 },
  systemMsg: { alignItems: 'center', marginVertical: spacing.sm },
  systemMsgText: { fontSize: 12, color: 'rgba(27, 60, 18, 0.5)', fontStyle: 'italic', textAlign: 'center' },
  msgBubble: {
    maxWidth: '80%', marginBottom: spacing.sm,
    borderRadius: radius.md, padding: spacing.base,
  },
  adminBubble: { alignSelf: 'flex-start', backgroundColor: 'rgba(255, 255, 255, 0.7)', borderWidth: 1, borderColor: 'rgba(46, 125, 50, 0.10)' },
  userBubble: { alignSelf: 'flex-end', backgroundColor: '#2E7D32', borderWidth: 1, borderColor: 'rgba(46, 125, 50, 0.18)' },
  msgText: { fontSize: 14, lineHeight: 20 },
  adminText: { color: '#2E4A26' },
  userText: { color: '#FFFFFF' },
  msgTime: { fontSize: 10, color: 'rgba(27, 60, 18, 0.35)', marginTop: 4, alignSelf: 'flex-end' },
  adminTime: { color: 'rgba(27, 60, 18, 0.35)' },
  inputBar: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.base,
    paddingBottom: 24, backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderTopWidth: 1, borderTopColor: 'rgba(46, 125, 50, 0.08)',
  },
  inputField: {
    flex: 1, backgroundColor: 'rgba(46, 125, 50, 0.05)', borderRadius: radius.full,
    paddingHorizontal: spacing.lg, paddingVertical: 12, fontSize: 15,
    color: '#2E4A26', borderWidth: 1, borderColor: 'rgba(46, 125, 50, 0.08)',
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#2E7D32', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(46, 125, 50, 0.18)',
  },
});
