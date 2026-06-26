/**
 * Fresh — Orders Screen
 * Fetches real orders from Supabase and displays tracking + history
 */

import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius } from '../../src/theme';
import { ORDER_STATUSES } from '../../src/types';
import { useAuthStore } from '../../src/stores/authStore';
import { useOrderStore } from '../../src/stores/orderStore';
import { useCartStore } from '../../src/stores/cartStore';
import { useUIStore } from '../../src/stores/uiStore';
import { useRouter } from 'expo-router';
import { useHeroEntrance, useCardEntrance3D, useStaggerEntrance } from '../../src/utils/animations';
import { supabase } from '../../src/api/supabase';
import { products as localProducts } from '../../src/data/products';
import { useDynamic } from '../../src/hooks/useDynamic';
import { useT } from '../../src/i18n';
import { SEOHead } from '../../src/components/ui/SEOHead';
import { PAGE_SEO } from '../../src/config/seo';

export default function OrdersScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { orders, isLoading, fetchOrders } = useOrderStore();
  const addItem = useCartStore((s) => s.addItem);
  const showToast = useUIStore((s) => s.showToast);
  const [unreadChatOrderIds, setUnreadChatOrderIds] = useState<Set<string>>(new Set());
  const d = useDynamic();
  const t = useT();

  const handleBuyAgain = (order: any) => {
    const items = Array.isArray(order.items) ? order.items : [];
    items.forEach((item: any) => {
      const local = localProducts.find((p) => p.id === item.product_id);
      addItem({
        id: item.product_id,
        name: item.name,
        price: item.price,
        image: local?.image || localProducts[0].image,
        variety: local?.variety,
        unit: local?.unit,
      }, item.qty);
    });
    showToast('Items added to basket! 🔄');
    router.push('/(tabs)/cart');
  };

  // Animations — MUST be called before any early return
  const headerAnim = useHeroEntrance();
  const activeAnim = useCardEntrance3D(200);
  const orderAnims = useStaggerEntrance(20, 100); // fixed count; hooks can't be conditional

  useEffect(() => {
    if (user?.id) {
      fetchOrders(user.id);
    }
  }, [user?.id]);

  // Track unread chat messages for each order
  useEffect(() => {
    if (!user?.id || !supabase || orders.length === 0) return;

    const sender = user.role === 'admin' ? 'admin' : 'user';

    const checkUnread = async () => {
      const orderIds = orders.map((o) => o.id);
      const unread = new Set<string>();

      // Fetch latest message for each order in one query
      const { data } = await supabase
        .from('chat_messages')
        .select('order_id, sender, created_at')
        .in('order_id', orderIds)
        .order('created_at', { ascending: false });

      if (data) {
        // Group by order_id, check if the latest message is from the other party
        const seen = new Set<string>();
        for (const msg of data) {
          if (!seen.has(msg.order_id)) {
            seen.add(msg.order_id);
            if (msg.sender !== sender && msg.sender !== 'system') {
              unread.add(msg.order_id);
            }
          }
        }
      }
      setUnreadChatOrderIds(unread);
    };

    checkUnread();

    // Real-time subscription for new chat messages
    const channel = supabase
      .channel('orders-chat-badge')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
      }, (payload) => {
        const msg = payload.new as any;
        if (msg.sender !== sender && msg.sender !== 'system') {
          setUnreadChatOrderIds((prev) => new Set([...prev, msg.order_id]));
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id, user?.role, orders.length]);

  // Not signed in
  if (!isAuthenticated || !user) {
    return (
      <View style={[styles.emptyFull, { backgroundColor: d.bg }]}>
        <Ionicons name="receipt-outline" size={64} color={d.textMuted} />
        <Text style={[styles.emptyTitle, { color: d.text }]}>{t('orders.sign_in_desc')}</Text>
        <Text style={[styles.emptyDesc, { color: d.textMuted }]}>{t('orders.no_orders_desc')}</Text>
        <Pressable
          style={styles.signInBtn}
          onPress={() => router.push('/(auth)/login')}
        >
          <Text style={styles.signInBtnText}>{t('orders.sign_in')}</Text>
        </Pressable>
      </View>
    );
  }

  const activeOrder = orders.find((o) => o.status !== 'Delivered' && o.status !== 'Cancelled');
  const pastOrders = orders.filter((o) => o.status === 'Delivered');
  const cancelledOrders = orders.filter((o) => o.status === 'Cancelled');
  const pendingOrders = orders.filter(
    (o) => o.status !== 'Delivered' && o.status !== 'Cancelled' && o.id !== activeOrder?.id
  );

  return (
    <ScrollView style={[styles.container, { backgroundColor: d.bg }]} showsVerticalScrollIndicator={false}>
      <SEOHead {...PAGE_SEO.orders} />
      <Animated.View style={[styles.header, headerAnim]}>
        <Text style={[styles.headerTitle, { color: d.text }]}>{t('orders.title')}</Text>
        <Text style={[styles.headerSub, { color: d.textMuted }]}>{t('orders.subtitle')}</Text>
      </Animated.View>

      {/* Loading */}
      {isLoading && orders.length === 0 && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: d.textMuted }]}>{t('orders.loading')}</Text>
        </View>
      )}

      {/* Active Order */}
      {activeOrder && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: d.text }]}>{t('orders.active_order')}</Text>
            <View style={[styles.liveBadge, activeOrder.status === 'Cancelled' && styles.liveBadgeCancelled]}>
              <Text style={[styles.liveBadgeText, activeOrder.status === 'Cancelled' && styles.liveBadgeTextCancelled]}>{activeOrder.status.toUpperCase()}</Text>
            </View>
          </View>

          <Pressable onPress={() => router.push(`/order/${activeOrder.id}`)}>
          <View style={[styles.trackingCard, { backgroundColor: d.cardBg, borderColor: d.border }]}>
            <View style={styles.trackingTop}>
              <View>
                <Text style={[styles.orderId, { color: d.text }]}>{t('orders.order')} {activeOrder.order_number}</Text>
                <Text style={[styles.orderAmount, { color: d.textMuted }]}>₹{activeOrder.total?.toLocaleString()}</Text>
              </View>
              <View style={styles.orderDate}>
                <Ionicons name="time-outline" size={14} color={colors.outline} />
                <Text style={[styles.orderDateText, { color: d.textMuted }]}>
                  {new Date(activeOrder.created_at).toLocaleDateString('en-IN', {
                    day: 'numeric', month: 'short',
                  })}
                </Text>
              </View>
            </View>

            {/* Items summary */}
            {activeOrder.items_summary && (
              <Text style={[styles.itemsSummary, { color: d.textMuted, borderBottomColor: d.border }]}>{activeOrder.items_summary}</Text>
            )}

            {/* Vertical Tracking */}
            <View style={styles.trackingSteps}>
              {ORDER_STATUSES.map((status, i) => {
                const currentIdx = ORDER_STATUSES.indexOf(activeOrder.status);
                const isDone = i < currentIdx;
                const isActive = i === currentIdx;
                return (
                  <View key={status} style={styles.trackingStep}>
                    <View style={styles.trackingDotCol}>
                      <View
                        style={[
                          styles.trackingDot,
                          isDone && styles.trackingDotDone,
                          isActive && styles.trackingDotActive,
                        ]}
                      />
                      {i < ORDER_STATUSES.length - 1 && (
                        <View
                          style={[
                            styles.trackingLine,
                            isDone && styles.trackingLineDone,
                          ]}
                        />
                      )}
                    </View>
                    <Text
                      style={[
                        styles.trackingLabel,
                        (isDone || isActive) && styles.trackingLabelActive,
                      ]}
                    >
                      {status}
                    </Text>
                  </View>
                );
              })}
            </View>

            {/* Chat button — bottom right */}
            <View style={styles.trackingBottom}>
              <Pressable
                style={styles.chatBtn}
                onPress={() => {
                  setUnreadChatOrderIds((prev) => {
                    const next = new Set(prev);
                    next.delete(activeOrder.id);
                    return next;
                  });
                  router.push(`/chat/${activeOrder.id}`);
                }}
              >
                <Ionicons name="chatbubble" size={14} color={colors.onPrimary} />
                <Text style={styles.chatBtnText}>{t('orders.chat')}</Text>
                {unreadChatOrderIds.has(activeOrder.id) && (
                  <View style={styles.chatBadge} />
                )}
              </Pressable>
            </View>
          </View>
          </Pressable>
        </View>
      )}

      {/* Other Pending Orders */}
      {pendingOrders.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: d.text }]}>{t('orders.pending')}</Text>
          </View>
          {pendingOrders.map((order) => (
            <Pressable key={order.id} onPress={() => router.push(`/order/${order.id}`)}>
            <View style={[styles.orderItem, { borderBottomColor: d.border }]}>
              <View style={[styles.orderIcon, { backgroundColor: d.cardBg }]}>
                <Ionicons name="time" size={20} color={colors.warning} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.orderItemId, { color: d.text }]}>{t('orders.order')} {order.order_number}</Text>
                <Text style={[styles.orderItemStatus, { color: d.textMuted }]}>{order.status}</Text>
              </View>
              <Pressable
                style={styles.chatBtnSmall}
                onPress={() => {
                  setUnreadChatOrderIds((prev) => {
                    const next = new Set(prev);
                    next.delete(order.id);
                    return next;
                  });
                  router.push(`/chat/${order.id}`);
                }}
              >
                <Ionicons name="chatbubble" size={14} color={colors.primary} />
                {unreadChatOrderIds.has(order.id) && (
                  <View style={styles.chatBadgeSmall} />
                )}
              </Pressable>
              <Text style={[styles.orderItemAmount, { color: d.accent }]}>₹{order.total?.toLocaleString()}</Text>
              <Ionicons name="chevron-forward" size={16} color={d.textMuted} />
            </View>
            </Pressable>
          ))}
        </View>
      )}

      {/* Past / History */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: d.text }]}>{t('orders.recent')}</Text>
        </View>

        {!isLoading && orders.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="receipt-outline" size={48} color={colors.outline} />
            <Text style={[styles.emptyTitle, { color: d.text }]}>{t('orders.no_orders')}</Text>
            <Text style={[styles.emptyDesc, { color: d.textMuted }]}>{t('orders.no_orders_desc')}</Text>
          </View>
        ) : (
          orders.map((order) => (
            <Pressable key={order.id} onPress={() => router.push(`/order/${order.id}`)}>
            <View style={[styles.orderItem, { borderBottomColor: d.border }]}>
              <View
                style={[
                  styles.orderIcon,
                  order.status === 'Delivered'
                    ? styles.orderIconSuccess
                    : order.status === 'Cancelled'
                    ? styles.orderIconCancelled
                    : styles.orderIconPending,
                ]}
              >
                <Ionicons
                  name={order.status === 'Delivered' ? 'checkmark-circle' : order.status === 'Cancelled' ? 'close-circle' : 'time'}
                  size={20}
                  color={order.status === 'Delivered' ? colors.secondary : order.status === 'Cancelled' ? '#C62828' : colors.warning}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.orderItemId, { color: d.text }]}>{t('orders.order')} {order.order_number}</Text>
                <Text style={[styles.orderItemStatus, { color: d.textMuted }]}>
                  {order.status} · {new Date(order.created_at).toLocaleDateString('en-IN', {
                    day: 'numeric', month: 'short', year: 'numeric',
                  })}
                </Text>
              </View>
              <Text style={[styles.orderItemAmount, { color: d.accent }]}>₹{order.total?.toLocaleString()}</Text>
              {order.status === 'Delivered' && (
                <Pressable
                  style={styles.buyAgainBtn}
                  onPress={(e) => {
                    e.stopPropagation?.();
                    handleBuyAgain(order);
                  }}
                >
                  <Ionicons name="refresh" size={14} color="#2E7D32" />
                  <Text style={styles.buyAgainText}>{t('orders.buy_again')}</Text>
                </Pressable>
              )}
              <Ionicons name="chevron-forward" size={16} color={colors.outline} />
            </View>
            </Pressable>
          ))
        )}
      </View>

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: spacing['2xl'], paddingBottom: spacing.xl },
  headerTitle: { fontSize: 32, fontWeight: '700', letterSpacing: -0.8, marginBottom: 4 },
  headerSub: { fontSize: 14 },
  // Loading
  loadingContainer: { alignItems: 'center', paddingVertical: spacing['4xl'] },
  loadingText: { fontSize: 14, marginTop: spacing.base },
  // Section
  section: { paddingHorizontal: spacing.lg, marginBottom: spacing['2xl'] },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  sectionTitle: { fontSize: 22, fontWeight: '700', letterSpacing: -0.5 },
  liveBadge: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)', paddingVertical: 4, paddingHorizontal: 10,
    borderRadius: radius.full, borderWidth: 1, borderColor: 'rgba(46, 125, 50, 0.18)',
  },
  liveBadgeText: { fontSize: 10, fontWeight: '700', color: '#43A047', letterSpacing: 0.5 },
  liveBadgeCancelled: { backgroundColor: 'rgba(198, 40, 40, 0.15)', borderColor: 'rgba(198, 40, 40, 0.2)' },
  liveBadgeTextCancelled: { color: '#C62828' },
  // Tracking Card
  trackingCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)', borderRadius: 18,
    padding: spacing.lg, borderWidth: 1, borderColor: 'rgba(46, 125, 50, 0.12)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2, shadowRadius: 16, elevation: 4,
  },
  trackingTop: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    marginBottom: spacing.base,
  },
  trackingBottom: {
    flexDirection: 'row', justifyContent: 'flex-end',
    marginTop: spacing.base, paddingTop: spacing.base,
    borderTopWidth: 1, borderTopColor: 'rgba(46, 125, 50, 0.06)',
  },
  orderId: { fontSize: 16, fontWeight: '700' },
  orderAmount: { fontSize: 14, marginTop: 2 },
  orderDate: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  orderDateText: { fontSize: 12 },
  itemsSummary: {
    fontSize: 13, color: 'rgba(27, 60, 18, 0.55)', lineHeight: 18,
    marginBottom: spacing.lg, paddingBottom: spacing.base,
    borderBottomWidth: 1, borderBottomColor: 'rgba(46, 125, 50, 0.06)',
  },
  // Tracking Steps (Vertical)
  trackingSteps: { paddingLeft: 4 },
  trackingStep: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  trackingDotCol: { alignItems: 'center' },
  trackingDot: {
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: 'rgba(46, 125, 50, 0.06)', borderWidth: 2,
    borderColor: 'rgba(129, 199, 132, 0.2)',
  },
  trackingDotDone: { backgroundColor: '#43A047', borderColor: '#43A047' },
  trackingDotActive: { backgroundColor: '#2E7D32', borderColor: '#2E7D32' },
  trackingLine: { width: 2, height: 28, backgroundColor: 'rgba(46, 125, 50, 0.06)' },
  trackingLineDone: { backgroundColor: '#43A047' },
  trackingLabel: { fontSize: 13, color: 'rgba(150, 170, 150, 0.6)', paddingTop: 0 },
  trackingLabelActive: { fontWeight: '600' },
  // Orders list
  empty: { alignItems: 'center', paddingVertical: spacing['4xl'] },
  emptyFull: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing['2xl'] },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginTop: spacing.base },
  emptyDesc: { fontSize: 13, marginTop: 4 },
  signInBtn: {
    backgroundColor: '#2E7D32', paddingVertical: 14, paddingHorizontal: 24,
    borderRadius: radius.full, marginTop: spacing.xl,
    borderWidth: 1, borderColor: 'rgba(46, 125, 50, 0.18)',
  },
  signInBtnText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },
  orderItem: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.base,
    paddingVertical: spacing.base, borderBottomWidth: 1,
    borderBottomColor: 'rgba(46, 125, 50, 0.06)',
  },
  orderIcon: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  orderIconSuccess: { backgroundColor: 'rgba(46, 125, 50, 0.15)' },
  orderIconPending: { backgroundColor: 'rgba(245, 124, 0, 0.08)' },
  orderIconCancelled: { backgroundColor: 'rgba(198, 40, 40, 0.08)' },
  orderItemId: { fontSize: 14, fontWeight: '600' },
  orderItemStatus: { fontSize: 12, marginTop: 2 },
  orderItemAmount: { fontSize: 15, fontWeight: '700' },
  // Chat button
  chatBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#2E7D32', paddingVertical: 6, paddingHorizontal: 14,
    borderRadius: radius.full, borderWidth: 1, borderColor: 'rgba(46, 125, 50, 0.18)',
    overflow: 'visible' as any,
  },
  chatBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
  chatBadge: {
    position: 'absolute' as any, top: -4, right: -4,
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: '#EF5350', borderWidth: 2, borderColor: '#2E7D32',
  },
  chatBtnSmall: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(46, 125, 50, 0.15)',
    alignItems: 'center', justifyContent: 'center',
    overflow: 'visible' as any,
  },
  chatBadgeSmall: {
    position: 'absolute' as any, top: -2, right: -2,
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: '#EF5350', borderWidth: 2, borderColor: '#F5F7F5',
  },
  buyAgainBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingVertical: 4, paddingHorizontal: 10,
    borderRadius: 100, backgroundColor: 'rgba(46, 125, 50, 0.15)',
    borderWidth: 1, borderColor: 'rgba(46,125,50,0.15)',
  },
  buyAgainText: { fontSize: 11, fontWeight: '600', color: '#2E7D32' },
});
