/**
 * Fresh — Cart / Basket Screen
 */

import { useState } from 'react';
import { View, Text, ScrollView, Pressable, Image, TextInput, StyleSheet, ActivityIndicator, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius } from '../../src/theme';
import { useCartStore } from '../../src/stores/cartStore';
import { useUIStore } from '../../src/stores/uiStore';
import { useAuthStore } from '../../src/stores/authStore';
import { useOrderStore } from '../../src/stores/orderStore';
import { useCouponStore } from '../../src/stores/couponStore';
import { useStaggerEntrance, useHeroEntrance, useCardEntrance3D } from '../../src/utils/animations';
import { useDynamic } from '../../src/hooks/useDynamic';
import { useT } from '../../src/i18n';

export default function CartScreen() {
  const router = useRouter();
  const { items, updateQty, removeItem, getTotal, getItemCount, clear } = useCartStore();
  const showToast = useUIStore((s) => s.showToast);
  const user = useAuthStore((s) => s.user);
  const placeOrder = useOrderStore((s) => s.placeOrder);
  const { appliedCoupon, discount, error: couponError, isValidating, applyCoupon, removeCoupon, recordRedemption } = useCouponStore();
  const total = getTotal();
  const finalTotal = Math.max(0, total - discount);
  const count = getItemCount();
  const [placing, setPlacing] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [promoExpanded, setPromoExpanded] = useState(false);

  // Animations
  const headerAnim = useHeroEntrance();
  const itemAnims = useStaggerEntrance(items.length, 80);
  const deliveryAnim = useCardEntrance3D(300);

  const handleCheckout = async () => {
    if (!user) {
      showToast('Please sign in first');
      router.push('/(auth)/login');
      return;
    }
    if (items.length === 0) return;

    setPlacing(true);
    try {
      const newOrder = await placeOrder({
        userId: user.id,
        customerName: user.name,
        items: items.map((i) => ({
          product_id: i.id,
          name: i.name,
          qty: i.qty,
          price: i.price,
          image: i.image,
        })),
        total: finalTotal,
        address: user.address || '42 Orchard Lane, Green Valley',
        couponCode: appliedCoupon?.code,
        discount: discount,
      });

      // Record coupon redemption if used
      if (appliedCoupon && newOrder) {
        await recordRedemption(user.id, newOrder.id);
      }

      clear();
      removeCoupon();
      showToast('Order placed! 🎉');
      router.push('/(tabs)/orders');
    } catch (err: any) {
      showToast(err.message || 'Failed to place order');
    } finally {
      setPlacing(false);
    }
  };

  const d = useDynamic();
  const t = useT();

  if (items.length === 0) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: d.bg }]}>
        <Ionicons name="basket-outline" size={64} color={d.textMuted} />
        <Text style={styles.emptyTitle}>{t('cart.empty_title')}</Text>
        <Text style={styles.emptyDesc}>{t('cart.empty_desc')}</Text>
        <Pressable
          style={styles.browseBtn}
          onPress={() => router.push('/(tabs)')}
        >
          <Text style={styles.browseBtnText}>{t('cart.browse')}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: d.bg }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Animated.View style={[styles.header, headerAnim]}>
          <Text style={[styles.headerTitle, { color: d.text }]}>{t('cart.title')}</Text>
          <Text style={[styles.headerSub, { color: d.textMuted }]}>{count} {count !== 1 ? t('cart.items') : t('cart.item')}</Text>
        </Animated.View>

        {/* Cart Items */}
        {items.map((item, idx) => (
          <Animated.View key={item.id} style={[itemAnims[idx] || {}]}>
          <View style={styles.cartItem}>
            <View style={styles.cartItemImg}>
              <Image source={item.image} style={styles.cartImg} resizeMode="contain" />
            </View>
            <View style={styles.cartItemInfo}>
              <Text style={styles.cartItemName}>{item.name}</Text>
              <Text style={styles.cartItemVariety}>{item.variety || item.desc || ''}</Text>
            </View>
            <View style={styles.cartItemControls}>
              <Text style={styles.cartItemPrice}>₹{(item.price * item.qty).toLocaleString()}</Text>
              <View style={styles.qtyRow}>
                <Pressable style={styles.qtyBtn} onPress={() => updateQty(item.id, -1)}>
                  <Ionicons name="remove" size={16} color={colors.primary} />
                </Pressable>
                <Text style={styles.qtyText}>{item.qty}</Text>
                <Pressable style={styles.qtyBtn} onPress={() => updateQty(item.id, 1)}>
                  <Ionicons name="add" size={16} color={colors.primary} />
                </Pressable>
              </View>
            </View>
          </View>
          </Animated.View>
        ))}

        {/* Delivery */}
        <Animated.View style={deliveryAnim}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Delivery Details</Text>
        </View>
        <View style={[styles.addressCard, styles.addressSelected]}>
          <Ionicons name="home" size={20} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.addressLabel}>Home</Text>
            <Text style={styles.addressText}>42 Orchard Lane, Green Valley, CA 90210</Text>
          </View>
          <Ionicons name="checkmark-circle" size={20} color={colors.secondary} />
        </View>
        </Animated.View>

        {/* Promo Code */}
        <View style={styles.sectionHeader}>
          <Pressable
            style={styles.promoToggle}
            onPress={() => setPromoExpanded(!promoExpanded)}
          >
            <Ionicons name="pricetag-outline" size={18} color="#2E7D32" />
            <Text style={styles.promoToggleText}>
              {appliedCoupon ? `${t('cart.discount')}: ${appliedCoupon.code}` : t('cart.promo_label')}
            </Text>
            <Ionicons name={promoExpanded ? 'chevron-up' : 'chevron-down'} size={16} color="rgba(27,60,18,0.4)" />
          </Pressable>
        </View>

        {promoExpanded && !appliedCoupon && (
          <View style={styles.promoRow}>
            <TextInput
              style={styles.promoInput}
              placeholder={t('cart.promo_placeholder')}
              placeholderTextColor="rgba(27,60,18,0.3)"
              value={promoCode}
              onChangeText={setPromoCode}
              autoCapitalize="characters"
            />
            <Pressable
              style={[styles.promoApplyBtn, isValidating && { opacity: 0.6 }]}
              onPress={async () => {
                if (!user) return;
                const ok = await applyCoupon(promoCode, total, user.id);
                if (ok) setPromoExpanded(false);
              }}
              disabled={isValidating || !promoCode.trim()}
            >
              {isValidating ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.promoApplyText}>{t('cart.promo_apply')}</Text>
              )}
            </Pressable>
          </View>
        )}

        {couponError && promoExpanded && (
          <Text style={styles.promoError}>{couponError}</Text>
        )}

        {appliedCoupon && (
          <View style={styles.promoAppliedRow}>
            <View style={styles.promoAppliedChip}>
              <Ionicons name="checkmark-circle" size={14} color="#43A047" />
              <Text style={styles.promoAppliedCode}>{appliedCoupon.code}</Text>
              <Text style={styles.promoAppliedSave}>
                {t('cart.saves')} ₹{discount.toLocaleString()}
              </Text>
            </View>
            <Pressable onPress={removeCoupon}>
              <Text style={styles.promoRemove}>{t('cart.promo_remove')}</Text>
            </Pressable>
          </View>
        )}

        <View style={{ height: 160 }} />
      </ScrollView>

      {/* Fixed Summary */}
      <View style={styles.summary}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>{t('cart.subtotal')}</Text>
          <Text style={styles.summaryValue}>₹{total.toLocaleString()}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>{t('cart.delivery')}</Text>
          <Text style={[styles.summaryValue, { color: colors.secondary }]}>{t('cart.free')}</Text>
        </View>
        {discount > 0 && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t('cart.discount')} ({appliedCoupon?.code})</Text>
            <Text style={[styles.summaryValue, { color: '#43A047' }]}>-₹{discount.toLocaleString()}</Text>
          </View>
        )}
        <View style={[styles.summaryRow, styles.totalRow]}>
          <Text style={styles.totalLabel}>{t('cart.total')}</Text>
          <Text style={styles.totalValue}>₹{finalTotal.toLocaleString()}</Text>
        </View>
        <Pressable
          style={[styles.checkoutBtn, placing && { opacity: 0.7 }]}
          onPress={handleCheckout}
          disabled={placing}
        >
          {placing ? (
            <ActivityIndicator color={colors.onPrimary} />
          ) : (
            <>
              <Text style={styles.checkoutText}>{t('cart.place_order')}</Text>
              <Ionicons name="arrow-forward" size={18} color={colors.onPrimary} />
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7F5' },
  header: { padding: spacing['2xl'], paddingBottom: spacing.xl },
  headerTitle: { fontSize: 32, fontWeight: '700', letterSpacing: -0.8, marginBottom: 4, color: '#1B3C12' },
  headerSub: { fontSize: 14, color: 'rgba(27, 60, 18, 0.5)' },
  // Cart Item
  cartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(46, 125, 50, 0.06)',
    gap: spacing.base,
  },
  cartItemImg: {
    width: 56, height: 56, borderRadius: radius.sm,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center', justifyContent: 'center',
  },
  cartImg: { width: 44, height: 44 },
  cartItemInfo: { flex: 1 },
  cartItemName: { fontSize: 15, fontWeight: '600', color: '#2E4A26' },
  cartItemVariety: { fontSize: 12, color: 'rgba(27, 60, 18, 0.5)', marginTop: 2 },
  cartItemControls: { alignItems: 'flex-end', gap: 8 },
  cartItemPrice: { fontSize: 15, fontWeight: '700', color: '#2E7D32' },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  qtyBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(46, 125, 50, 0.06)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(46, 125, 50, 0.08)',
  },
  qtyText: { fontSize: 14, fontWeight: '600', minWidth: 16, textAlign: 'center', color: '#2E4A26' },
  // Address
  sectionHeader: { paddingHorizontal: spacing.lg, marginTop: spacing.xl, marginBottom: spacing.base },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1B3C12' },
  addressCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.base,
    marginHorizontal: spacing.lg, padding: spacing.base,
    borderRadius: radius.md, backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderWidth: 1.5, borderColor: 'rgba(46, 125, 50, 0.08)',
  },
  addressSelected: { borderColor: 'rgba(46, 125, 50, 0.22)' },
  addressLabel: { fontSize: 14, fontWeight: '600', color: '#2E4A26' },
  addressText: { fontSize: 12, color: 'rgba(27, 60, 18, 0.5)', marginTop: 2 },
  // Summary
  summary: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: spacing.lg, paddingBottom: 32,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderTopWidth: 1, borderColor: 'rgba(129, 199, 132, 0.2)',
    shadowColor: '#000', shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.3, shadowRadius: 24, elevation: 16,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  summaryLabel: { fontSize: 14, color: 'rgba(27, 60, 18, 0.5)' },
  summaryValue: { fontSize: 14, fontWeight: '500', color: '#2E4A26' },
  totalRow: { borderTopWidth: 1, borderTopColor: 'rgba(46, 125, 50, 0.08)', paddingTop: 12, marginTop: 4 },
  totalLabel: { fontSize: 16, fontWeight: '700', color: '#1B3C12' },
  totalValue: { fontSize: 18, fontWeight: '800', color: '#2E7D32' },
  checkoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#2E7D32', paddingVertical: 14,
    borderRadius: radius.full, marginTop: spacing.base,
    borderWidth: 1, borderColor: 'rgba(46, 125, 50, 0.18)',
  },
  checkoutText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  // Empty
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing['2xl'], backgroundColor: '#F5F7F5' },
  emptyTitle: { fontSize: 20, fontWeight: '700', marginTop: spacing.lg, color: '#1B3C12' },
  emptyDesc: { fontSize: 14, color: 'rgba(27, 60, 18, 0.5)', marginTop: 4, marginBottom: spacing.xl },
  browseBtn: {
    backgroundColor: '#2E7D32', paddingVertical: 14, paddingHorizontal: 24,
    borderRadius: radius.full, borderWidth: 1, borderColor: 'rgba(46, 125, 50, 0.18)',
  },
  browseBtnText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },
  // Promo Code
  promoToggle: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 8,
  },
  promoToggleText: { flex: 1, fontSize: 14, fontWeight: '600', color: '#2E7D32' },
  promoRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: spacing.lg, marginBottom: spacing.base,
  },
  promoInput: {
    flex: 1, height: 42, paddingHorizontal: 14,
    backgroundColor: 'rgba(46,125,50,0.06)', borderRadius: radius.sm,
    borderWidth: 1, borderColor: 'rgba(46,125,50,0.12)',
    fontSize: 14, fontWeight: '600', color: '#2E4A26',
    letterSpacing: 1,
  },
  promoApplyBtn: {
    height: 42, paddingHorizontal: 20,
    backgroundColor: '#2E7D32', borderRadius: radius.sm,
    alignItems: 'center', justifyContent: 'center',
  },
  promoApplyText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  promoError: {
    fontSize: 12, color: '#C62828', marginHorizontal: spacing.lg,
    marginBottom: spacing.base,
  },
  promoAppliedRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginHorizontal: spacing.lg, marginBottom: spacing.base,
  },
  promoAppliedChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(46,125,50,0.08)', paddingVertical: 6,
    paddingHorizontal: 12, borderRadius: 100,
    borderWidth: 1, borderColor: 'rgba(46,125,50,0.15)',
  },
  promoAppliedCode: { fontSize: 12, fontWeight: '700', color: '#2E7D32' },
  promoAppliedSave: { fontSize: 11, color: '#43A047' },
  promoRemove: { fontSize: 12, fontWeight: '600', color: '#C62828' },
});
