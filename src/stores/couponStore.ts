/**
 * Nutriva — Coupon Store (Zustand)
 * Validates and applies promo codes at checkout
 */

import { create } from 'zustand';
import { supabase } from '../api/supabase';
import { Coupon } from '../types';

interface CouponState {
  appliedCoupon: Coupon | null;
  discount: number;
  error: string | null;
  isValidating: boolean;

  applyCoupon: (code: string, orderTotal: number, userId: string) => Promise<boolean>;
  removeCoupon: () => void;
  recordRedemption: (userId: string, orderId: string) => Promise<void>;
}

export const useCouponStore = create<CouponState>((set, get) => ({
  appliedCoupon: null,
  discount: 0,
  error: null,
  isValidating: false,

  applyCoupon: async (code, orderTotal, userId) => {
    if (!supabase) {
      set({ error: 'Service unavailable' });
      return false;
    }

    set({ isValidating: true, error: null });

    try {
      // Fetch coupon by code
      const { data: coupon, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', code.toUpperCase().trim())
        .eq('active', true)
        .single();

      if (error || !coupon) {
        set({ error: 'Invalid or expired coupon code', isValidating: false });
        return false;
      }

      // Check validity period
      const now = new Date();
      if (coupon.valid_until && new Date(coupon.valid_until) < now) {
        set({ error: 'This coupon has expired', isValidating: false });
        return false;
      }

      // Check max uses
      if (coupon.max_uses > 0 && coupon.used_count >= coupon.max_uses) {
        set({ error: 'This coupon has reached its usage limit', isValidating: false });
        return false;
      }

      // Check minimum order
      if (orderTotal < coupon.min_order) {
        set({
          error: `Minimum order ₹${coupon.min_order} required for this coupon`,
          isValidating: false,
        });
        return false;
      }

      // Check if user already redeemed
      const { data: existing } = await supabase
        .from('coupon_redemptions')
        .select('id')
        .eq('coupon_id', coupon.id)
        .eq('user_id', userId)
        .maybeSingle();

      if (existing) {
        set({ error: 'You have already used this coupon', isValidating: false });
        return false;
      }

      // Calculate discount
      let discount = 0;
      if (coupon.type === 'percent') {
        discount = Math.round((orderTotal * coupon.value) / 100);
        if (coupon.max_discount > 0) {
          discount = Math.min(discount, coupon.max_discount);
        }
      } else {
        discount = coupon.value;
      }

      // Don't let discount exceed order total
      discount = Math.min(discount, orderTotal);

      set({
        appliedCoupon: coupon as Coupon,
        discount,
        error: null,
        isValidating: false,
      });
      return true;
    } catch (err: any) {
      set({ error: err.message || 'Failed to validate coupon', isValidating: false });
      return false;
    }
  },

  removeCoupon: () => set({ appliedCoupon: null, discount: 0, error: null }),

  recordRedemption: async (userId, orderId) => {
    const coupon = get().appliedCoupon;
    if (!coupon || !supabase) return;

    try {
      // Insert redemption record
      await supabase.from('coupon_redemptions').insert({
        coupon_id: coupon.id,
        user_id: userId,
        order_id: orderId,
      });

      // Increment used_count
      await supabase
        .from('coupons')
        .update({ used_count: coupon.used_count + 1 })
        .eq('id', coupon.id);
    } catch {}

    // Reset after recording
    set({ appliedCoupon: null, discount: 0 });
  },
}));
