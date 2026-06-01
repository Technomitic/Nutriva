/**
 * Fresh — Order Detail Screen
 * Shows full order info including all products, status tracking with timestamps, and actions
 */

import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator,
  Alert, Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius } from '../../src/theme';
import { ORDER_STATUSES, Order, OrderItem, StatusHistoryEntry } from '../../src/types';
import { useAuthStore } from '../../src/stores/authStore';
import { useCartStore } from '../../src/stores/cartStore';
import { useUIStore } from '../../src/stores/uiStore';
import { supabase } from '../../src/api/supabase';
import { products as localProducts } from '../../src/data/products';
import { useDynamic } from '../../src/hooks/useDynamic';

export default function OrderDetailScreen() {
  const d = useDynamic();

  const router = useRouter();
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const user = useAuthStore((s) => s.user);
  const addItem = useCartStore((s) => s.addItem);
  const showToast = useUIStore((s) => s.showToast);
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!orderId || !supabase) return;

    const fetchOrder = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (!error && data) {
        setOrder(data as Order);
      }
      setLoading(false);
    };

    fetchOrder();

    // Realtime subscription for status updates
    const channel = supabase
      .channel(`order-detail-${orderId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'orders',
        filter: `id=eq.${orderId}`,
      }, (payload) => {
        setOrder((prev) => prev ? { ...prev, ...payload.new } as Order : null);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [orderId]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading order...</Text>
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.outline} />
        <Text style={styles.loadingText}>Order not found</Text>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const currentStatusIdx = ORDER_STATUSES.indexOf(order.status);
  const isDelivered = order.status === 'Delivered';
  const isCancelled = order.status === 'Cancelled';
  const canCancel = !isDelivered && !isCancelled && order.status !== 'Out for Delivery';
  const items: OrderItem[] = Array.isArray(order.items) ? order.items : [];
  const statusHistory: StatusHistoryEntry[] = Array.isArray(order.status_history) ? order.status_history : [];

  /** Get timestamp for a given status from history */
  const getStatusTimestamp = (status: string): string | null => {
    const entry = statusHistory.find((h) => h.status === status);
    if (!entry) return null;
    try {
      return new Date(entry.timestamp).toLocaleDateString('en-IN', {
        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
      });
    } catch { return null; }
  };

  const handleReorder = () => {
    items.forEach((item) => {
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

  const handleCancelOrder = async () => {
    const doCancel = async () => {
      setCancelling(true);
      try {
        if (!supabase) return;
        const { data, error } = await supabase
          .from('orders')
          .update({ status: 'Cancelled', updated_at: new Date().toISOString() })
          .eq('id', order.id)
          .select();
        if (error) throw error;

        if (!data || data.length === 0) {
          throw new Error('Permission denied. Please make sure the RLS policy allows users to update their own orders.');
        }

        try {
          await supabase.from('chat_messages').insert({
            order_id: order.id,
            sender: 'system',
            text: `Order ${order.order_number} has been cancelled by the customer.`,
            type: 'text',
          });
        } catch {}

        try {
          await supabase.from('notifications').insert({
            user_id: null,
            title: `${order.order_number} — Cancelled`,
            body: `${order.customer_name} cancelled their order (₹${order.total?.toLocaleString()})`,
            type: 'order',
            icon: 'close-circle',
          });
        } catch {}

        setOrder((prev) => prev ? { ...prev, status: 'Cancelled' as any } : null);
      } catch (err: any) {
        if (Platform.OS === 'web') {
          window.alert('Failed to cancel order: ' + (err?.message || 'Unknown error'));
        } else {
          Alert.alert('Error', 'Failed to cancel order. Please try again.');
        }
      } finally {
        setCancelling(false);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to cancel this order? This cannot be undone.')) {
        doCancel();
      }
    } else {
      Alert.alert(
        'Cancel Order',
        'Are you sure you want to cancel this order? This cannot be undone.',
        [
          { text: 'No, Keep It', style: 'cancel' },
          { text: 'Yes, Cancel', style: 'destructive', onPress: doCancel },
        ]
      );
    }
  };

  return (
    <View style={[styles.container, d.s.screenBg]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.headerBack} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={d.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, d.s.text]}>Order {order.order_number}</Text>
          <Text style={[styles.headerSub, d.s.textMuted]}>
            {new Date(order.created_at).toLocaleDateString('en-IN', {
              day: 'numeric', month: 'long', year: 'numeric',
            })}
          </Text>
        </View>
        <View style={[styles.statusChip, isDelivered && styles.statusChipDelivered, isCancelled && styles.statusChipCancelled]}>
          <Text style={[styles.statusChipText, isDelivered && styles.statusChipTextDelivered, isCancelled && styles.statusChipTextCancelled]}>
            {order.status}
          </Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>
        {/* Order Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Order Number</Text>
            <Text style={styles.summaryValue}>{order.order_number}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Customer</Text>
            <Text style={styles.summaryValue}>{order.customer_name}</Text>
          </View>
          {order.address ? (
            <>
              <View style={styles.divider} />
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Address</Text>
                <Text style={[styles.summaryValue, { flex: 1, textAlign: 'right' }]} numberOfLines={2}>{order.address}</Text>
              </View>
            </>
          ) : null}
          <View style={styles.divider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total</Text>
            <Text style={styles.totalValue}>₹{order.total?.toLocaleString()}</Text>
          </View>
          {(order.discount && order.discount > 0) ? (
            <>
              <View style={styles.divider} />
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Discount ({order.coupon_code})</Text>
                <Text style={[styles.summaryValue, { color: '#43A047' }]}>-₹{order.discount?.toLocaleString()}</Text>
              </View>
            </>
          ) : null}
        </View>

        {/* Products */}
        <Text style={[styles.sectionTitle, d.s.text]}>
          Products ({items.length} item{items.length !== 1 ? 's' : ''})
        </Text>

        <View style={styles.productsCard}>
          {items.length === 0 ? (
            <View style={styles.emptyProducts}>
              <Ionicons name="basket-outline" size={32} color={colors.outline} />
              <Text style={styles.emptyProductsText}>No item details available</Text>
            </View>
          ) : (
            items.map((item, index) => (
              <View key={`${item.product_id}-${index}`}>
                <View style={styles.productRow}>
                  <View style={styles.productIcon}>
                    <Text style={styles.productEmoji}>🍎</Text>
                  </View>
                  <View style={styles.productInfo}>
                    <Text style={[styles.productName, { color: d.text }]}>{item.name}</Text>
                    <Text style={styles.productMeta}>
                      ₹{item.price?.toLocaleString()} × {item.qty}
                    </Text>
                  </View>
                  <Text style={styles.productTotal}>
                    ₹{(item.price * item.qty)?.toLocaleString()}
                  </Text>
                </View>
                {index < items.length - 1 && <View style={styles.divider} />}
              </View>
            ))
          )}

          {/* Total at the bottom */}
          {items.length > 0 && (
            <>
              <View style={styles.totalDivider} />
              <View style={styles.productTotalRow}>
                <Text style={styles.productTotalLabel}>Order Total</Text>
                <Text style={styles.productTotalAmount}>₹{order.total?.toLocaleString()}</Text>
              </View>
            </>
          )}
        </View>

        {/* Tracking */}
        <Text style={[styles.sectionTitle, d.s.text]}>Order Tracking</Text>

        {isCancelled ? (
          <View style={styles.cancelledCard}>
            <View style={styles.cancelledIconWrap}>
              <Ionicons name="close-circle" size={48} color="#C62828" />
            </View>
            <Text style={styles.cancelledTitle}>Order Cancelled</Text>
            <Text style={styles.cancelledDesc}>
              This order was cancelled on{' '}
              {new Date(order.updated_at).toLocaleDateString('en-IN', {
                day: 'numeric', month: 'long', year: 'numeric',
              })}
            </Text>
          </View>
        ) : (
          <View style={styles.trackingCard}>
            {ORDER_STATUSES.map((status, i) => {
              const isDone = i < currentStatusIdx;
              const isActive = i === currentStatusIdx;
              const timestamp = getStatusTimestamp(status);
              return (
                <View key={status} style={styles.trackingStep}>
                  <View style={styles.trackingDotCol}>
                    <View
                      style={[
                        styles.trackingDot,
                        isDone && styles.trackingDotDone,
                        isActive && styles.trackingDotActive,
                      ]}
                    >
                      {isDone && <Ionicons name="checkmark" size={10} color="#fff" />}
                      {isActive && <View style={styles.trackingDotPulse} />}
                    </View>
                    {i < ORDER_STATUSES.length - 1 && (
                      <View
                        style={[
                          styles.trackingLine,
                          isDone && styles.trackingLineDone,
                        ]}
                      />
                    )}
                  </View>
                  <View style={styles.trackingTextCol}>
                    <Text
                      style={[
                        styles.trackingLabel,
                        (isDone || isActive) && styles.trackingLabelActive,
                      ]}
                    >
                      {status}
                    </Text>
                    {timestamp && (isDone || isActive) && (
                      <Text style={styles.trackingTimestamp}>{timestamp}</Text>
                    )}
                    {isActive && !timestamp && (
                      <Text style={styles.trackingActiveHint}>Current Status</Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Actions */}
        <View style={styles.actionsRow}>
          <Pressable
            style={styles.actionBtn}
            onPress={() => router.push(`/chat/${orderId}`)}
          >
            <Ionicons name="chatbubble" size={18} color="#fff" />
            <Text style={styles.actionBtnText}>Chat with Support</Text>
          </Pressable>

          {isDelivered && items.length > 0 && (
            <Pressable style={styles.reorderBtn} onPress={handleReorder}>
              <Ionicons name="refresh" size={18} color="#2E7D32" />
              <Text style={styles.reorderBtnText}>Reorder Items</Text>
            </Pressable>
          )}

          {canCancel && (
            <Pressable
              style={styles.cancelBtn}
              onPress={handleCancelOrder}
              disabled={cancelling}
            >
              {cancelling ? (
                <ActivityIndicator size="small" color="#C62828" />
              ) : (
                <Ionicons name="close-circle-outline" size={18} color="#C62828" />
              )}
              <Text style={styles.cancelBtnText}>
                {cancelling ? 'Cancelling...' : 'Cancel Order'}
              </Text>
            </Pressable>
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7F5' },
  loadingContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#F5F7F5', gap: 12,
  },
  loadingText: { fontSize: 14, color: 'rgba(27, 60, 18, 0.5)' },
  backBtn: {
    backgroundColor: '#2E7D32', paddingVertical: 12, paddingHorizontal: 24,
    borderRadius: radius.full, marginTop: 12,
  },
  backBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingTop: 56, paddingHorizontal: spacing.lg, paddingBottom: spacing.lg,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderBottomWidth: 1, borderBottomColor: 'rgba(46,125,50,0.08)',
  },
  headerBack: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(46,125,50,0.06)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#1B3C12', letterSpacing: -0.5 },
  headerSub: { fontSize: 12, color: 'rgba(27,60,18,0.5)', marginTop: 2 },
  statusChip: {
    backgroundColor: 'rgba(245,124,0,0.12)', paddingVertical: 4, paddingHorizontal: 10,
    borderRadius: radius.full,
  },
  statusChipDelivered: { backgroundColor: 'rgba(46,125,50,0.12)' },
  statusChipCancelled: { backgroundColor: 'rgba(198,40,40,0.12)' },
  statusChipText: { fontSize: 11, fontWeight: '700', color: '#F57C00', letterSpacing: 0.3 },
  statusChipTextDelivered: { color: '#2E7D32' },
  statusChipTextCancelled: { color: '#C62828' },

  scroll: { flex: 1, padding: spacing.lg },

  // Summary Card
  summaryCard: {
    backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: 18,
    padding: spacing.lg, marginBottom: spacing.xl,
    borderWidth: 1, borderColor: 'rgba(46,125,50,0.08)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06, shadowRadius: 12, elevation: 2,
  },
  summaryRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 8,
  },
  summaryLabel: { fontSize: 13, color: 'rgba(27,60,18,0.5)', fontWeight: '500' },
  summaryValue: { fontSize: 14, fontWeight: '600', color: '#2E4A26' },
  totalValue: { fontSize: 18, fontWeight: '800', color: '#2E7D32' },
  divider: {
    height: 1, backgroundColor: 'rgba(46,125,50,0.06)', marginVertical: 2,
  },

  // Section Title
  sectionTitle: {
    fontSize: 18, fontWeight: '700', color: '#1B3C12', letterSpacing: -0.3,
    marginBottom: spacing.base,
  },

  // Products Card
  productsCard: {
    backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: 18,
    padding: spacing.lg, marginBottom: spacing.xl,
    borderWidth: 1, borderColor: 'rgba(46,125,50,0.08)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06, shadowRadius: 12, elevation: 2,
  },
  emptyProducts: { alignItems: 'center', paddingVertical: spacing.xl },
  emptyProductsText: { fontSize: 13, color: 'rgba(27,60,18,0.4)', marginTop: 8 },
  productRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10,
  },
  productIcon: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: 'rgba(46,125,50,0.06)',
    alignItems: 'center', justifyContent: 'center',
  },
  productEmoji: { fontSize: 20 },
  productInfo: { flex: 1 },
  productName: { fontSize: 15, fontWeight: '600', color: '#2E4A26' },
  productMeta: { fontSize: 12, color: 'rgba(27,60,18,0.5)', marginTop: 2 },
  productTotal: { fontSize: 15, fontWeight: '700', color: '#2E7D32' },
  totalDivider: {
    height: 2, backgroundColor: 'rgba(46,125,50,0.1)', marginTop: 8,
  },
  productTotalRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 12,
  },
  productTotalLabel: { fontSize: 15, fontWeight: '700', color: '#1B3C12' },
  productTotalAmount: { fontSize: 20, fontWeight: '800', color: '#2E7D32' },

  // Tracking
  trackingCard: {
    backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: 18,
    padding: spacing.lg, marginBottom: spacing.xl,
    borderWidth: 1, borderColor: 'rgba(46,125,50,0.08)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06, shadowRadius: 12, elevation: 2,
  },
  trackingStep: { flexDirection: 'row', alignItems: 'flex-start' },
  trackingDotCol: { alignItems: 'center', width: 24 },
  trackingDot: {
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: 'rgba(46,125,50,0.06)', borderWidth: 2,
    borderColor: 'rgba(129,199,132,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  trackingDotDone: { backgroundColor: '#43A047', borderColor: '#43A047' },
  trackingDotActive: { backgroundColor: '#2E7D32', borderColor: '#2E7D32' },
  trackingDotPulse: {
    width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff',
  },
  trackingLine: {
    width: 2, height: 28, backgroundColor: 'rgba(46,125,50,0.06)',
  },
  trackingLineDone: { backgroundColor: '#43A047' },
  trackingTextCol: { flex: 1, paddingLeft: 10, paddingBottom: 14 },
  trackingLabel: { fontSize: 14, color: 'rgba(27,60,18,0.35)', fontWeight: '500' },
  trackingLabelActive: { color: '#2E4A26', fontWeight: '700' },
  trackingActiveHint: { fontSize: 11, color: '#43A047', marginTop: 2, fontWeight: '500' },
  trackingTimestamp: { fontSize: 11, color: 'rgba(27,60,18,0.45)', marginTop: 2, fontWeight: '400' },

  // Cancelled card
  cancelledCard: {
    backgroundColor: 'rgba(198,40,40,0.04)', borderRadius: 18,
    padding: spacing.xl, marginBottom: spacing.xl, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(198,40,40,0.12)',
  },
  cancelledIconWrap: { marginBottom: 12 },
  cancelledTitle: { fontSize: 20, fontWeight: '800', color: '#C62828', marginBottom: 4 },
  cancelledDesc: { fontSize: 13, color: 'rgba(198,40,40,0.6)', textAlign: 'center', lineHeight: 18 },

  // Actions
  actionsRow: { marginBottom: spacing.xl, gap: 12 },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#2E7D32', paddingVertical: 14,
    borderRadius: radius.full,
    shadowColor: '#2E7D32', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 3,
  },
  actionBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  reorderBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: 'rgba(46,125,50,0.06)', paddingVertical: 14,
    borderRadius: radius.full, borderWidth: 1, borderColor: 'rgba(46,125,50,0.2)',
  },
  reorderBtnText: { color: '#2E7D32', fontSize: 15, fontWeight: '700' },
  cancelBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: 'rgba(198,40,40,0.06)', paddingVertical: 14,
    borderRadius: radius.full, borderWidth: 1, borderColor: 'rgba(198,40,40,0.2)',
  },
  cancelBtnText: { color: '#C62828', fontSize: 15, fontWeight: '700' },
});

