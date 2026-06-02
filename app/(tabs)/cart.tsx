/**
 * Fresh — Cart / Basket Screen
 */

import { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, Image, TextInput, StyleSheet, ActivityIndicator, Animated, Platform } from 'react-native';
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
  const { appliedCoupon, discount, error: couponError, isValidating, applyCoupon, removeCoupon, recalculateDiscount, recordRedemption } = useCouponStore();
  const total = getTotal();
  const finalTotal = Math.max(0, total - discount);
  const count = getItemCount();
  const [placing, setPlacing] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [promoExpanded, setPromoExpanded] = useState(false);

  // Keep discount in sync whenever the cart subtotal changes
  useEffect(() => {
    recalculateDiscount(total);
  }, [total]);

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
        <Text style={[styles.emptyTitle, { color: d.text }]}>{t('cart.empty_title')}</Text>
        <Text style={[styles.emptyDesc, { color: d.textMuted }]}>{t('cart.empty_desc')}</Text>
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
      <ScrollView
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <Animated.View style={[styles.header, headerAnim]}>
          <Text style={[styles.headerTitle, { color: d.text }]}>{t('cart.title')}</Text>
          <Text style={[styles.headerSub, { color: d.textMuted }]}>{count} {count !== 1 ? t('cart.items') : t('cart.item')}</Text>
        </Animated.View>

        {/* Cart Items */}
        {items.map((item, idx) => (
          <Animated.View key={item.id} style={[itemAnims[idx] || {}]}>
          <View style={[styles.cartItem, { borderBottomColor: d.border }]}>
            <View style={[styles.cartItemImg, { backgroundColor: d.accentLight }]}>
              <Image source={item.image} style={styles.cartImg} resizeMode="contain" />
            </View>
            <View style={styles.cartItemInfo}>
              <Text style={[styles.cartItemName, { color: d.text }]}>{item.name}</Text>
              <Text style={[styles.cartItemVariety, { color: d.textMuted }]}>{item.variety || item.desc || ''}</Text>
            </View>
            <View style={styles.cartItemControls}>
              <Text style={[styles.cartItemPrice, { color: d.accent }]}>₹{(item.price * item.qty).toLocaleString()}</Text>
              <View style={styles.qtyRow}>
                <Pressable style={[styles.qtyBtn, { backgroundColor: d.accentLight, borderColor: d.border }]} onPress={() => updateQty(item.id, -1)}>
                  <Ionicons name="remove" size={16} color={d.accent} />
                </Pressable>
                <Text style={[styles.qtyText, { color: d.text }]}>{item.qty}</Text>
                <Pressable style={[styles.qtyBtn, { backgroundColor: d.accentLight, borderColor: d.border }]} onPress={() => updateQty(item.id, 1)}>
                  <Ionicons name="add" size={16} color={d.accent} />
                </Pressable>
              </View>
            </View>
          </View>
          </Animated.View>
        ))}

        {/* Delivery */}
        <Animated.View style={deliveryAnim}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: d.text }]}>Delivery Details</Text>
        </View>
        <View style={[styles.addressCard, styles.addressSelected, { backgroundColor: d.cardBg, borderColor: d.borderBright }]}>
          <Ionicons name="home" size={20} color={d.accent} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.addressLabel, { color: d.text }]}>Home</Text>
            <Text style={[styles.addressText, { color: d.textMuted }]}>42 Orchard Lane, Green Valley, CA 90210</Text>
          </View>
          <Ionicons name="checkmark-circle" size={20} color={d.accent} />
        </View>
        </Animated.View>

        {/* Promo Code */}
        <View style={styles.sectionHeader}>
          <Pressable
            style={styles.promoToggle}
            onPress={() => setPromoExpanded(!promoExpanded)}
          >
            <Ionicons name="pricetag-outline" size={18} color={d.accent} />
            <Text style={[styles.promoToggleText, { color: d.accent }]}>
              {appliedCoupon ? `${t('cart.discount')}: ${appliedCoupon.code}` : t('cart.promo_label')}
            </Text>
            <Ionicons name={promoExpanded ? 'chevron-up' : 'chevron-down'} size={16} color={d.textMuted} />
          </Pressable>
        </View>

        {promoExpanded && !appliedCoupon && (
          <View style={styles.promoRow}>
            <TextInput
              style={[styles.promoInput, { backgroundColor: d.inputBg, borderColor: d.inputBorder, color: d.text }]}
              placeholder={t('cart.promo_placeholder')}
              placeholderTextColor={d.textMuted}
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
            <View style={[styles.promoAppliedChip, { backgroundColor: d.accentLight, borderColor: d.border }]}>
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

        <View style={{ height: 240 }} />
      </ScrollView>

      {/* Fixed Summary */}
      <View style={[styles.summary, { backgroundColor: d.summaryBg, borderColor: d.border }]}>
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: d.textMuted }]}>{t('cart.subtotal')}</Text>
          <Text style={[styles.summaryValue, { color: d.textSecondary }]}>₹{total.toLocaleString()}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: d.textMuted }]}>{t('cart.delivery')}</Text>
          <Text style={[styles.summaryValue, { color: d.accent }]}>{t('cart.free')}</Text>
        </View>
        {discount > 0 && (
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: d.textMuted }]}>{t('cart.discount')} ({appliedCoupon?.code})</Text>
            <Text style={[styles.summaryValue, { color: '#43A047' }]}>-₹{discount.toLocaleString()}</Text>
          </View>
        )}
        <View style={[styles.totalRow, { borderTopColor: d.border }]}>
          <Text style={[styles.totalLabel, { color: d.text }]}>{t('cart.total')}</Text>
          <Text style={[styles.totalValue, { color: d.accent }]}>₹{finalTotal.toLocaleString()}</Text>
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
  container: {
    flex: 1,
    ...(Platform.OS === 'web' ? { height: '100vh' as any, maxHeight: '100vh' as any, overflow: 'hidden' as any } : {}),
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    ...(Platform.OS === 'web' ? { overflowY: 'auto' as any } : {}),
  },
  header: { padding: spacing['2xl'], paddingBottom: spacing.xl },
  headerTitle: { fontSize: 32, fontWeight: '700', letterSpacing: -0.8, marginBottom: 4 },
  headerSub: { fontSize: 14 },
  // Cart Item
  cartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.base,
    borderBottomWidth: 1,
    gap: spacing.base,
  },
  cartItemImg: {
    width: 56, height: 56, borderRadius: radius.sm,
    alignItems: 'center', justifyContent: 'center',
  },
  cartImg: { width: 44, height: 44 },
  cartItemInfo: { flex: 1 },
  cartItemName: { fontSize: 15, fontWeight: '600' },
  cartItemVariety: { fontSize: 12, marginTop: 2 },
  cartItemControls: { alignItems: 'flex-end', gap: 8 },
  cartItemPrice: { fontSize: 15, fontWeight: '700' },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  qtyBtn: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },
  qtyText: { fontSize: 14, fontWeight: '600', minWidth: 16, textAlign: 'center' },
  // Address
  sectionHeader: { paddingHorizontal: spacing.lg, marginTop: spacing.xl, marginBottom: spacing.base },
  sectionTitle: { fontSize: 18, fontWeight: '700' },
  addressCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.base,
    marginHorizontal: spacing.lg, padding: spacing.base,
    borderRadius: radius.md,
    borderWidth: 1.5,
  },
  addressSelected: {},
  addressLabel: { fontSize: 14, fontWeight: '600' },
  addressText: { fontSize: 12, marginTop: 2 },
  // Summary
  summary: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: spacing.lg, paddingBottom: 32,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderTopWidth: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.3, shadowRadius: 24, elevation: 16,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  summaryLabel: { fontSize: 14 },
  summaryValue: { fontSize: 14, fontWeight: '500' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, paddingTop: 12, marginTop: 4 },
  totalLabel: { fontSize: 16, fontWeight: '700' },
  totalValue: { fontSize: 18, fontWeight: '800' },
  checkoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#2E7D32', paddingVertical: 14,
    borderRadius: radius.full, marginTop: spacing.base,
    borderWidth: 1, borderColor: 'rgba(46, 125, 50, 0.18)',
  },
  checkoutText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  // Empty
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing['2xl'] },
  emptyTitle: { fontSize: 20, fontWeight: '700', marginTop: spacing.lg },
  emptyDesc: { fontSize: 14, marginTop: 4, marginBottom: spacing.xl },
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
  promoToggleText: { flex: 1, fontSize: 14, fontWeight: '600' },
  promoRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: spacing.lg, marginBottom: spacing.base,
  },
  promoInput: {
    flex: 1, height: 42, paddingHorizontal: 14,
    borderRadius: radius.sm,
    borderWidth: 1,
    fontSize: 14, fontWeight: '600',
    letterSpacing: 1,
  },
  promoApplyBtn: {
    height: 42, paddingHorizontal: 20,
    backgroundColor: '#2E7D32', borderRadius: radius.sm,
    alignItems: 'center', justifyContent: 'center',
  },
  promoApplyText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  promoError: {
    fontSize: 12, color: '#EF5350', marginHorizontal: spacing.lg,
    marginBottom: spacing.base,
  },
  promoAppliedRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginHorizontal: spacing.lg, marginBottom: spacing.base,
  },
  promoAppliedChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12, borderRadius: 100,
    borderWidth: 1,
  },
  promoAppliedCode: { fontSize: 12, fontWeight: '700', color: '#2E7D32' },
  promoAppliedSave: { fontSize: 11, color: '#43A047' },
  promoRemove: { fontSize: 12, fontWeight: '600', color: '#EF5350' },
});
