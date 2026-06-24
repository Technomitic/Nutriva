/**
 * Fresh — Shared Data Types
 */

export interface Product {
  id: string;
  name: string;
  variety: string;
  origin: string;
  price: number;
  unit: string;
  image: any;
  tag: string;
  description: string;
  freshness: string;
  stock: number;
  max_stock: number;
  active: boolean;
  is_hero?: boolean;
  is_editors_pick?: boolean;
  hero_image_url?: string;
  image_url?: string;
  image_urls?: string[];
}

export interface CartItem extends Product {
  qty: number;
}

export interface Order {
  id: string;
  order_number: string;
  user_id: string;
  customer_name: string;
  items: OrderItem[];
  items_summary: string;
  total: number;
  status: OrderStatus;
  delivery_boy_id: string | null;
  address: string;
  status_history?: StatusHistoryEntry[];
  coupon_code?: string;
  discount?: number;
  created_at: string;
  updated_at: string;
}

export interface StatusHistoryEntry {
  status: string;
  timestamp: string;
}

export interface OrderItem {
  product_id: string;
  name: string;
  qty: number;
  price: number;
  image: any;
}

export type OrderStatus =
  | 'Placed'
  | 'Awaiting Confirmation'
  | 'Payment Pending'
  | 'Confirmed'
  | 'Packed'
  | 'Out for Delivery'
  | 'Delivered'
  | 'Cancelled';

export const ORDER_STATUSES: OrderStatus[] = [
  'Placed',
  'Awaiting Confirmation',
  'Payment Pending',
  'Confirmed',
  'Packed',
  'Out for Delivery',
  'Delivered',
];

export interface ChatMessage {
  id: string;
  order_id: string;
  sender: 'user' | 'admin' | 'system';
  text: string;
  type: 'text' | 'qr' | 'image';
  amount?: string;
  created_at: string;
}

export interface Profile {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  phone: string;
  address: string;
  total_orders: number;
  total_spent: number;
  push_token?: string;
  avatar_url?: string;
  created_at: string;
}

export interface AdvanceOrder {
  id: string;
  user_id: string;
  customer_name: string;
  event: string;
  date: string;
  fruits: AdvanceFruit[];
  status: 'Pending' | 'Approved';
  created_at: string;
}

export interface AdvanceFruit {
  product_id: string;
  name: string;
  qty: number;
  unit: string;
}

export interface BulkDeal {
  id: string;
  name: string;
  image: any;
  desc: string;
  tiers: BulkTier[];
}

export interface BulkTier {
  qty: string;
  price: number;
  original: number;
  save: string;
}

export interface FestivalPack {
  id: string;
  name: string;
  desc: string;
  items: { name: string; qty: string }[];
  price: number;
  original: number;
}

export interface DeliveryBoy {
  id: string;
  name: string;
  phone: string;
  area: string;
  status: 'available' | 'busy' | 'offline';
  deliveries: number;
}

export interface Review {
  id: string;
  product_id: string;
  user_id: string;
  user_name: string;
  rating: number;
  comment: string;
  image_urls: string[];
  created_at: string;
}

export interface WishlistItem {
  id: string;
  user_id: string;
  product_id: string;
  created_at: string;
}

export interface Coupon {
  id: string;
  code: string;
  type: 'percent' | 'flat';
  value: number;
  min_order: number;
  max_discount: number;
  max_uses: number;
  used_count: number;
  valid_from: string;
  valid_until: string | null;
  active: boolean;
}

// Admin role is managed SERVER-SIDE only via the handle_new_user() trigger
// in Supabase. Never determine admin status on the client.

