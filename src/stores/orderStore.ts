/**
 * Fresh — Order Store (Zustand)
 * Manages order placement and retrieval via Supabase
 */

import { create } from 'zustand';
import { supabase } from '../api/supabase';
import { Order } from '../types';

interface OrderState {
  orders: Order[];
  isLoading: boolean;
  error: string | null;

  placeOrder: (params: {
    userId: string;
    customerName: string;
    items: { product_id: string; name: string; qty: number; price: number; image: any }[];
    total: number;
    address?: string;
    is_advance?: boolean;
    delivery_date?: string;
    delivery_slot?: string;
    couponCode?: string;
    discount?: number;
  }) => Promise<Order>;

  fetchOrders: (userId: string) => Promise<void>;
  clearOrders: () => void;
}

/** Generate a collision-resistant order number like ORD-LZQ4K-A9X3 */
function generateOrderNumber(): string {
  const ts = Date.now().toString(36).slice(-5);
  const rand = Math.random().toString(36).substring(2, 6);
  return `ORD-${ts}-${rand}`.toUpperCase();
}

export const useOrderStore = create<OrderState>((set, get) => ({
  orders: [],
  isLoading: false,
  error: null,

  placeOrder: async ({ userId, customerName, items, total, address, is_advance, delivery_date, delivery_slot, couponCode, discount }) => {
    if (!supabase) throw new Error('Supabase not configured');

    const orderNumber = generateOrderNumber();
    const itemsSummary = items
      .map((i) => `${i.name} ×${i.qty}`)
      .join(', ');

    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('orders')
      .insert({
        order_number: orderNumber,
        user_id: userId,
        customer_name: customerName,
        items: items.map(({ image, ...rest }) => rest),
        items_summary: itemsSummary,
        total,
        status: 'Placed',
        address: address || '',
        is_advance: is_advance || false,
        delivery_date: delivery_date || null,
        delivery_slot: delivery_slot || null,
        coupon_code: couponCode || null,
        discount: discount || 0,
        status_history: [{ status: 'Placed', timestamp: now }],
      })
      .select()
      .single();

    if (error) throw error;

    const newOrder = data as Order;

    // Create initial chat thread with a system message
    try {
      await supabase.from('chat_messages').insert({
        order_id: newOrder.id,
        sender: 'system',
        text: `Order ${orderNumber} placed! Total: ₹${total.toLocaleString()}. Our team will review and confirm shortly.`,
        type: 'text',
      });
    } catch (chatErr) {
      // Non-blocking — order was placed successfully even if chat init fails
      console.warn('Chat init failed:', chatErr);
    }

    // Prepend to local list
    set((s) => ({ orders: [newOrder, ...s.orders] }));

    return newOrder;
  },

  fetchOrders: async (userId) => {
    if (!supabase) return;

    set({ isLoading: true, error: null });

    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      set({ orders: (data || []) as Order[], isLoading: false });
    } catch (err: any) {
      set({ error: err.message || 'Failed to fetch orders', isLoading: false });
    }
  },

  clearOrders: () => set({ orders: [], error: null }),
}));
