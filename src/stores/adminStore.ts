/**
 * Fresh — Admin Store (Zustand)
 * Manages all admin-facing Supabase operations:
 *  - Orders (all users), status updates
 *  - Products CRUD
 *  - Customers list
 *  - Delivery boys
 *  - KPI computation
 */

import { create } from 'zustand';
import { supabase } from '../api/supabase';
import { Order, Profile, Product, DeliveryBoy } from '../types';

export interface AdminKPIs {
  totalRevenue: number;
  orderCount: number;
  customerCount: number;
  todayOrders: number;
  pendingOrders: number;
}

interface AdminState {
  // Data
  allOrders: Order[];
  customers: Profile[];
  products: Product[];
  deliveryBoys: DeliveryBoy[];
  kpis: AdminKPIs;

  // UI
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchAllOrders: () => Promise<void>;
  updateOrderStatus: (orderId: string, status: string, orderNumber: string) => Promise<void>;
  fetchCustomers: () => Promise<void>;
  fetchProducts: () => Promise<void>;
  toggleProductActive: (productId: string, active: boolean) => Promise<void>;
  updateProductPrice: (productId: string, price: number) => Promise<void>;
  updateProductStock: (productId: string, stock: number) => Promise<void>;
  addProduct: (product: Partial<Product>) => Promise<void>;
  updateProduct: (productId: string, updates: Partial<Product>) => Promise<void>;
  deleteProduct: (productId: string) => Promise<void>;
  setProductHero: (productId: string) => Promise<void>;
  setProductEditorsPick: (productId: string) => Promise<void>;
  fetchDeliveryBoys: () => Promise<void>;
  addDeliveryBoy: (boy: Partial<DeliveryBoy>) => Promise<void>;
  updateDeliveryBoy: (id: string, updates: Partial<DeliveryBoy>) => Promise<void>;
  deleteDeliveryBoy: (id: string) => Promise<void>;
  updateDeliveryBoyStatus: (id: string, status: string) => Promise<void>;
  assignDeliveryBoy: (orderId: string, boyId: string, boyName: string) => Promise<void>;
  unassignDeliveryBoy: (orderId: string) => Promise<void>;
  computeKPIs: () => void;
  loadAll: () => Promise<void>;

  // Analytics
  getRevenueByDay: (days?: number) => { date: string; revenue: number }[];
  getTopProducts: (limit?: number) => { name: string; count: number; revenue: number }[];
  getOrdersByStatus: () => { status: string; count: number }[];
}

export const useAdminStore = create<AdminState>((set, get) => ({
  allOrders: [],
  customers: [],
  products: [],
  deliveryBoys: [],
  kpis: { totalRevenue: 0, orderCount: 0, customerCount: 0, todayOrders: 0, pendingOrders: 0 },
  isLoading: false,
  error: null,

  // ── Load everything ──
  loadAll: async () => {
    set({ isLoading: true, error: null });
    try {
      await Promise.all([
        get().fetchAllOrders(),
        get().fetchCustomers(),
        get().fetchProducts(),
        get().fetchDeliveryBoys(),
      ]);
      get().computeKPIs();
    } catch (err: any) {
      set({ error: err.message || 'Failed to load admin data' });
    } finally {
      set({ isLoading: false });
    }
  },

  // ── Orders ──
  fetchAllOrders: async () => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    set({ allOrders: (data || []) as Order[] });
  },

  updateOrderStatus: async (orderId, status, orderNumber) => {
    if (!supabase) return;
    const now = new Date().toISOString();

    // Fetch current status_history to append
    const { data: current } = await supabase
      .from('orders')
      .select('status_history')
      .eq('id', orderId)
      .single();

    const history = Array.isArray(current?.status_history) ? current.status_history : [];
    history.push({ status, timestamp: now });

    const { error } = await supabase
      .from('orders')
      .update({
        status,
        updated_at: now,
        status_history: history,
      })
      .eq('id', orderId);
    if (error) throw error;

    // Insert system chat message about the status change
    try {
      await supabase.from('chat_messages').insert({
        order_id: orderId,
        sender: 'system',
        text: `Order ${orderNumber} status updated to: ${status}`,
        type: 'text',
      });
    } catch {}

    // Update local state
    set((s) => ({
      allOrders: s.allOrders.map((o) =>
        o.id === orderId ? { ...o, status: status as any, status_history: history } : o
      ),
    }));
  },

  // ── Customers ──
  fetchCustomers: async () => {
    if (!supabase) return;
    const { data: profileData, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;

    // Fetch all orders to compute real stats per customer
    const { data: orderData } = await supabase
      .from('orders')
      .select('user_id, total, status');

    const orderStats: Record<string, { count: number; spent: number }> = {};
    (orderData || []).forEach((o: any) => {
      // Skip cancelled orders from customer stats
      if (o.status === 'Cancelled') return;
      if (!orderStats[o.user_id]) {
        orderStats[o.user_id] = { count: 0, spent: 0 };
      }
      orderStats[o.user_id].count += 1;
      orderStats[o.user_id].spent += (o.total || 0);
    });

    // Merge stats into profiles
    const customers = (profileData || []).map((p: any) => ({
      ...p,
      total_orders: orderStats[p.id]?.count || 0,
      total_spent: orderStats[p.id]?.spent || 0,
    })) as Profile[];

    set({ customers });
  },

  // ── Products ──
  fetchProducts: async () => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('name', { ascending: true });
    if (error) throw error;
    set({ products: (data || []) as Product[] });
  },

  toggleProductActive: async (productId, active) => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from('products')
      .update({ active })
      .eq('id', productId)
      .select();
    if (error) throw error;
    if (!data || data.length === 0) {
      throw new Error('Failed to update product visibility. Check RLS policies.');
    }
    set((s) => ({
      products: s.products.map((p) =>
        p.id === productId ? { ...p, active } : p
      ),
    }));
  },

  updateProductPrice: async (productId, price) => {
    if (!supabase) return;
    const { error } = await supabase
      .from('products')
      .update({ price })
      .eq('id', productId);
    if (error) throw error;
    set((s) => ({
      products: s.products.map((p) =>
        p.id === productId ? { ...p, price } : p
      ),
    }));
  },

  updateProductStock: async (productId, stock) => {
    if (!supabase) return;
    const { error } = await supabase
      .from('products')
      .update({ stock })
      .eq('id', productId);
    if (error) throw error;
    set((s) => ({
      products: s.products.map((p) =>
        p.id === productId ? { ...p, stock } : p
      ),
    }));
  },

  addProduct: async (product) => {
    if (!supabase) return;
    const slug = product.name?.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || 'prod';
    const id = `${slug}-${Date.now().toString(36)}`;
    const newProduct = {
      id,
      name: product.name || 'New Product',
      variety: product.variety || '',
      origin: product.origin || '',
      price: product.price || 0,
      unit: product.unit || '/kg',
      image: id,
      image_url: (product as any).image_url || '',
      image_urls: (product as any).image_urls || [],
      tag: product.tag || '',
      description: product.description || '',
      freshness: product.freshness || 'Fresh',
      stock: product.stock || 0,
      max_stock: product.max_stock || 100,
      active: true,
    };
    const { error } = await supabase.from('products').insert(newProduct);
    if (error) throw error;
    set((s) => ({ products: [newProduct as Product, ...s.products] }));
  },

  updateProduct: async (productId, updates) => {
    if (!supabase) return;
    const { error } = await supabase.from('products').update(updates).eq('id', productId);
    if (error) throw error;
    set((s) => ({
      products: s.products.map((p) => p.id === productId ? { ...p, ...updates } : p),
    }));
  },

  deleteProduct: async (productId) => {
    if (!supabase) return;
    const { error } = await supabase.from('products').delete().eq('id', productId);
    if (error) throw error;
    set((s) => ({ products: s.products.filter((p) => p.id !== productId) }));
  },

  setProductHero: async (productId) => {
    if (!supabase) return;
    // Clear all, then set the chosen one
    await supabase.from('products').update({ is_hero: false }).neq('id', '');
    await supabase.from('products').update({ is_hero: true }).eq('id', productId);
    set((s) => ({
      products: s.products.map((p) => ({ ...p, is_hero: p.id === productId })),
    }));
  },

  setProductEditorsPick: async (productId) => {
    if (!supabase) return;
    await supabase.from('products').update({ is_editors_pick: false }).neq('id', '');
    await supabase.from('products').update({ is_editors_pick: true }).eq('id', productId);
    set((s) => ({
      products: s.products.map((p) => ({ ...p, is_editors_pick: p.id === productId })),
    }));
  },

  // ── Delivery Boys ──
  fetchDeliveryBoys: async () => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from('delivery_boys')
      .select('*')
      .order('name', { ascending: true });
    if (error) throw error;
    const boys = (data || []) as DeliveryBoy[];

    // Count real deliveries from orders table
    const { data: orders } = await supabase
      .from('orders')
      .select('delivery_boy_id')
      .not('delivery_boy_id', 'is', null);

    if (orders) {
      const countMap: Record<string, number> = {};
      orders.forEach((o: any) => {
        if (o.delivery_boy_id) {
          countMap[o.delivery_boy_id] = (countMap[o.delivery_boy_id] || 0) + 1;
        }
      });
      boys.forEach((b) => {
        b.deliveries = countMap[b.id] || 0;
      });
    }

    set({ deliveryBoys: boys });
  },

  updateDeliveryBoyStatus: async (id, status) => {
    if (!supabase) return;
    const { error } = await supabase
      .from('delivery_boys')
      .update({ status })
      .eq('id', id);
    if (error) throw error;
    set((s) => ({
      deliveryBoys: s.deliveryBoys.map((d) =>
        d.id === id ? { ...d, status: status as any } : d
      ),
    }));
  },

  addDeliveryBoy: async (boy) => {
    if (!supabase) return;
    const id = `db-${Date.now()}`;
    const newBoy = {
      id,
      name: boy.name || 'New Partner',
      phone: boy.phone || '',
      area: boy.area || '',
      status: 'available',
      deliveries: 0,
    };
    const { error } = await supabase.from('delivery_boys').insert(newBoy);
    if (error) throw error;
    set((s) => ({ deliveryBoys: [...s.deliveryBoys, newBoy as DeliveryBoy] }));
  },

  updateDeliveryBoy: async (id, updates) => {
    if (!supabase) return;
    const { error } = await supabase.from('delivery_boys').update(updates).eq('id', id);
    if (error) throw error;
    set((s) => ({
      deliveryBoys: s.deliveryBoys.map((d) => d.id === id ? { ...d, ...updates } : d),
    }));
  },

  deleteDeliveryBoy: async (id) => {
    if (!supabase) return;
    const { error } = await supabase.from('delivery_boys').delete().eq('id', id);
    if (error) throw error;
    set((s) => ({ deliveryBoys: s.deliveryBoys.filter((d) => d.id !== id) }));
  },

  assignDeliveryBoy: async (orderId, boyId, boyName) => {
    if (!supabase) return;
    // Update order with delivery boy assignment
    const { error } = await supabase
      .from('orders')
      .update({ delivery_boy_id: boyId, delivery_boy_name: boyName })
      .eq('id', orderId);
    if (error) throw error;
    // Increment delivery count on the delivery boy
    const boy = get().deliveryBoys.find((d) => d.id === boyId);
    if (boy) {
      await supabase
        .from('delivery_boys')
        .update({ deliveries: (boy.deliveries || 0) + 1, status: 'busy' })
        .eq('id', boyId);
    }
    // Update local state
    set((s) => ({
      allOrders: s.allOrders.map((o) =>
        o.id === orderId ? { ...o, delivery_boy_id: boyId, delivery_boy_name: boyName } as any : o
      ),
      deliveryBoys: s.deliveryBoys.map((d) =>
        d.id === boyId ? { ...d, deliveries: (d.deliveries || 0) + 1, status: 'busy' as any } : d
      ),
    }));
  },

  unassignDeliveryBoy: async (orderId) => {
    if (!supabase) return;
    const order = get().allOrders.find((o) => o.id === orderId) as any;
    const boyId = order?.delivery_boy_id;
    const { error } = await supabase
      .from('orders')
      .update({ delivery_boy_id: null, delivery_boy_name: null })
      .eq('id', orderId);
    if (error) throw error;
    set((s) => ({
      allOrders: s.allOrders.map((o) =>
        o.id === orderId ? { ...o, delivery_boy_id: null, delivery_boy_name: null } as any : o
      ),
    }));
  },

  // ── Compute KPIs ──
  computeKPIs: () => {
    const { allOrders, customers } = get();
    const today = new Date().toDateString();
    const todayOrders = allOrders.filter(
      (o) => new Date(o.created_at).toDateString() === today
    ).length;
    const pendingOrders = allOrders.filter(
      (o) => o.status !== 'Delivered' && o.status !== 'Cancelled'
    ).length;

    set({
      kpis: {
        totalRevenue: allOrders
          .filter((o) => o.status !== 'Cancelled')
          .reduce((sum, o) => sum + (o.total || 0), 0),
        orderCount: allOrders.filter((o) => o.status !== 'Cancelled').length,
        customerCount: customers.length,
        todayOrders,
        pendingOrders,
      },
    });
  },

  // ── Analytics ──
  getRevenueByDay: (days = 7) => {
    const orders = get().allOrders;
    const now = new Date();
    const result: { date: string; revenue: number }[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const revenue = orders
        .filter((o) => {
          const t = new Date(o.created_at);
          return t >= dayStart && t < dayEnd && o.status !== 'Cancelled';
        })
        .reduce((sum, o) => sum + (o.total || 0), 0);

      result.push({ date: dateStr, revenue });
    }
    return result;
  },

  getTopProducts: (limit = 5) => {
    const orders = get().allOrders.filter((o) => o.status !== 'Cancelled');
    const map: Record<string, { count: number; revenue: number }> = {};

    orders.forEach((o) => {
      const items = Array.isArray(o.items) ? o.items : [];
      items.forEach((item) => {
        if (!map[item.name]) map[item.name] = { count: 0, revenue: 0 };
        map[item.name].count += item.qty;
        map[item.name].revenue += item.price * item.qty;
      });
    });

    return Object.entries(map)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit);
  },

  getOrdersByStatus: () => {
    const orders = get().allOrders;
    const map: Record<string, number> = {};
    orders.forEach((o) => {
      map[o.status] = (map[o.status] || 0) + 1;
    });
    return Object.entries(map).map(([status, count]) => ({ status, count }));
  },
}));
