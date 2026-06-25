/**
 * Fresh — Admin Dashboard
 * Full admin panel with internal tab navigation
 */

import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator,
  TextInput, Platform, Alert, Image, Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius } from '../../src/theme';
import { useAuthStore } from '../../src/stores/authStore';
import { useAdminStore } from '../../src/stores/adminStore';
import { useUIStore } from '../../src/stores/uiStore';
import { Order, ORDER_STATUSES, OrderStatus } from '../../src/types';
import { supabase } from '../../src/api/supabase';
import * as ImagePicker from 'expo-image-picker';
import AnalyticsSection from '../../src/components/admin/AnalyticsSection';
import { useDynamic } from '../../src/hooks/useDynamic';

type AdminTab = 'dashboard' | 'orders' | 'products' | 'customers' | 'delivery' | 'bulk' | 'promos' | 'support' | 'about';

const TABS: { id: AdminTab; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'pulse' },
  { id: 'orders', label: 'Orders', icon: 'receipt' },
  { id: 'products', label: 'Products', icon: 'leaf' },
  { id: 'bulk', label: 'Bulk & Packs', icon: 'cube' },
  { id: 'customers', label: 'Customers', icon: 'people' },
  { id: 'delivery', label: 'Delivery', icon: 'bicycle' },
  { id: 'promos', label: 'Promos', icon: 'pricetag' },
  { id: 'support', label: 'Support', icon: 'headset' },
  { id: 'about', label: 'About', icon: 'information-circle' },
];

export default function AdminScreen() {
  const d = useDynamic();

  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const showToast = useUIStore((s) => s.showToast);
  const {
    allOrders, customers, products, deliveryBoys, kpis,
    isLoading, loadAll, updateOrderStatus, toggleProductActive,
    updateProductPrice, updateProductStock, updateDeliveryBoyStatus,
    addProduct, updateProduct, deleteProduct,
    setProductHero, setProductEditorsPick,
    addDeliveryBoy, updateDeliveryBoy, deleteDeliveryBoy,
    assignDeliveryBoy, unassignDeliveryBoy,
  } = useAdminStore();

  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [orderFilter, setOrderFilter] = useState<string>('all');
  const [deliveryFilter, setDeliveryFilter] = useState<string>('all');
  const [editingPrice, setEditingPrice] = useState<string | null>(null);
  const [priceInput, setPriceInput] = useState('');
  const [showNotifForm, setShowNotifForm] = useState(false);
  const [notifTitle, setNotifTitle] = useState('');
  const [notifBody, setNotifBody] = useState('');
  const [notifType, setNotifType] = useState<'promo' | 'stock' | 'system'>('promo');
  // Product form
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<string | null>(null);
  const [pf, setPf] = useState({ name: '', variety: '', origin: '', price: '', unit: '/kg', tag: '', description: '', stock: '', max_stock: '100', image_url: '' });
  const [imageUploading, setImageUploading] = useState(false);
  const [productImageUrls, setProductImageUrls] = useState<string[]>([]);
  const [heroImageUrl, setHeroImageUrl] = useState('');
  const [heroImageUploading, setHeroImageUploading] = useState(false);
  // Bulk state
  const [bulkDeals, setBulkDeals] = useState<any[]>([]);
  const [festivalPacks, setFestivalPacks] = useState<any[]>([]);
  const [showBulkForm, setShowBulkForm] = useState(false);
  const [editingBulkDeal, setEditingBulkDeal] = useState<string | null>(null);
  const [bf, setBf] = useState({ name: '', description: '', tiers: [{ qty: '', price: '', original: '' }] });
  const [showPackForm, setShowPackForm] = useState(false);
  const [editingPack, setEditingPack] = useState<string | null>(null);
  const [fpf, setFpf] = useState({ name: '', description: '', price: '', original: '', items: [{ name: '', qty: '' }] });
  const [unreadChatOrderIds, setUnreadChatOrderIds] = useState<Set<string>>(new Set());
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [customerOrders, setCustomerOrders] = useState<Order[]>([]);

  // About state
  const [aboutData, setAboutData] = useState<Record<string, string>>({
    brand_desc: '',
    promise_text: '',
    support_email: '',
    privacy_policy: '',
    terms_of_service: '',
    refund_policy: '',
    shipping_policy: '',
    stats_json: '',
    steps_json: '',
  });
  const [aboutSaving, setAboutSaving] = useState(false);
  const [aboutLoaded, setAboutLoaded] = useState(false);
  // Promos state
  const [coupons, setCoupons] = useState<any[]>([]);
  const [showPromoForm, setShowPromoForm] = useState(false);
  const [editingPromo, setEditingPromo] = useState<string | null>(null);
  const [prf, setPrf] = useState({ code: '', type: 'percent', value: '', min_order: '0', max_discount: '0', max_uses: '0', valid_until: '' });
  const [promoSaving, setPromoSaving] = useState(false);

  // Support tickets state
  const [supportTickets, setSupportTickets] = useState<any[]>([]);
  const [selectedSupportTicket, setSelectedSupportTicket] = useState<any>(null);
  const [supportMessages, setSupportMessages] = useState<any[]>([]);
  const [supportReply, setSupportReply] = useState('');
  const [supportFilter, setSupportFilter] = useState<'open' | 'resolved' | 'all'>('open');

  const DEFAULT_STATS = [
    { num: '50+', label: 'Partner\nOrchards', icon: '\ud83c\udf33' },
    { num: '10K+', label: 'Happy\nCustomers', icon: '\ud83d\udc9a' },
    { num: '99%', label: 'Fresh\nGuarantee', icon: '\u2728' },
    { num: '24h', label: 'Farm to\nDoor', icon: '\ud83d\ude9a' },
  ];
  const DEFAULT_STEPS = [
    { name: 'Farm Partners', desc: 'We work directly with 50+ orchards across Ratnagiri, Nashik, Shimla, and Kerala \u2014 no middlemen.', icon: 'leaf' },
    { name: 'Quality Control', desc: 'Every fruit passes a 12-point quality check before it reaches your doorstep.', icon: 'shield-checkmark' },
    { name: 'Cold Chain', desc: 'Temperature-controlled logistics from harvest to delivery, preserving peak freshness.', icon: 'snow' },
    { name: 'Community', desc: 'Fair wages to farmers, eco-friendly packaging, and carbon-neutral delivery routes.', icon: 'heart' },
  ];

  const getAboutStats = (): any[] => {
    try { return aboutData.stats_json ? JSON.parse(aboutData.stats_json) : DEFAULT_STATS; } catch { return DEFAULT_STATS; }
  };
  const setAboutStats = (arr: any[]) => setAboutData({ ...aboutData, stats_json: JSON.stringify(arr) });

  const getAboutSteps = (): any[] => {
    try { return aboutData.steps_json ? JSON.parse(aboutData.steps_json) : DEFAULT_STEPS; } catch { return DEFAULT_STEPS; }
  };
  const setAboutSteps = (arr: any[]) => setAboutData({ ...aboutData, steps_json: JSON.stringify(arr) });
  // Order detail modal
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderCustomer, setOrderCustomer] = useState<any>(null);
  const [custAvatars, setCustAvatars] = useState<Record<string, string>>({});
  // Targeted notification for a specific customer
  const [showCustNotif, setShowCustNotif] = useState(false);
  const [custNotifTitle, setCustNotifTitle] = useState('');
  const [custNotifBody, setCustNotifBody] = useState('');
  const [custNotifType, setCustNotifType] = useState<'promo' | 'stock' | 'system' | 'reminder'>('system');
  const [sendingCustNotif, setSendingCustNotif] = useState(false);
  // Customer search
  const [customerSearch, setCustomerSearch] = useState('');
  // Delivery form
  const [showDeliveryForm, setShowDeliveryForm] = useState(false);
  const [editingDelivery, setEditingDelivery] = useState<string | null>(null);
  const [df, setDf] = useState({ name: '', phone: '', area: '' });

  useEffect(() => {
    if (user?.role === 'admin') { loadAll(); fetchBulkData(); fetchAboutData(); fetchCoupons(); }
  }, [user?.role]);

  // Support tickets: fetch + realtime
  useEffect(() => {
    if (!supabase || user?.role !== 'admin') return;
    const fetchTickets = async () => {
      const { data } = await supabase
        .from('support_tickets')
        .select('*')
        .order('updated_at', { ascending: false });
      if (data) setSupportTickets(data);
    };
    fetchTickets();
    const channel = supabase
      .channel('admin-support-tickets')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets' }, () => { fetchTickets(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.role]);

  // Support messages: fetch + realtime for selected ticket
  useEffect(() => {
    if (!selectedSupportTicket || !supabase) return;
    const fetchMsgs = async () => {
      const { data } = await supabase
        .from('support_messages')
        .select('*')
        .eq('ticket_id', selectedSupportTicket.id)
        .order('created_at', { ascending: true });
      if (data) setSupportMessages(data);
    };
    fetchMsgs();
    const channel = supabase
      .channel(`admin-ticket-msgs-${selectedSupportTicket.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'support_messages',
        filter: `ticket_id=eq.${selectedSupportTicket.id}`,
      }, (payload) => {
        setSupportMessages((prev) => {
          if (prev.some((m) => m.id === (payload.new as any).id)) return prev;
          return [...prev, payload.new];
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedSupportTicket?.id]);

  const sendSupportReply = async () => {
    const text = supportReply.trim();
    if (!text || !selectedSupportTicket || !supabase) return;
    setSupportReply('');
    await supabase.from('support_messages').insert({ ticket_id: selectedSupportTicket.id, sender: 'admin', text });
    await supabase.from('support_tickets').update({ updated_at: new Date().toISOString() }).eq('id', selectedSupportTicket.id);
  };

  const resolveSupportTicket = async (ticketId: string) => {
    if (!supabase) return;
    await supabase.from('support_tickets').update({ status: 'resolved', updated_at: new Date().toISOString() }).eq('id', ticketId);
    setSupportTickets((prev) => prev.map((t) => t.id === ticketId ? { ...t, status: 'resolved' } : t));
    if (selectedSupportTicket?.id === ticketId) setSelectedSupportTicket({ ...selectedSupportTicket, status: 'resolved' });
    showToast('Ticket resolved');
  };

  const reopenSupportTicket = async (ticketId: string) => {
    if (!supabase) return;
    await supabase.from('support_tickets').update({ status: 'open', updated_at: new Date().toISOString() }).eq('id', ticketId);
    setSupportTickets((prev) => prev.map((t) => t.id === ticketId ? { ...t, status: 'open' } : t));
    if (selectedSupportTicket?.id === ticketId) setSelectedSupportTicket({ ...selectedSupportTicket, status: 'open' });
    showToast('Ticket reopened');
  };

  const supportTopicLabel = (t: string) => t === 'product' ? 'Product Info' : t === 'feedback' ? 'Feedback' : 'Something Else';
  const supportTopicColor = (t: string) => t === 'product' ? '#43A047' : t === 'feedback' ? '#6A1B9A' : '#00838F';
  const supportFormatDate = (d: string) => {
    try { return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }); }
    catch { return ''; }
  };

  // ── Promo CRUD ──
  const fetchCoupons = async () => {
    if (!supabase) return;
    const { data } = await supabase.from('coupons').select('*').order('created_at', { ascending: false });
    if (data) setCoupons(data);
  };

  const savePromo = async () => {
    if (!supabase || !prf.code.trim() || !prf.value) return;
    setPromoSaving(true);
    try {
      const payload = {
        code: prf.code.toUpperCase().trim(),
        type: prf.type,
        value: Number(prf.value),
        min_order: Number(prf.min_order) || 0,
        max_discount: Number(prf.max_discount) || 0,
        max_uses: Number(prf.max_uses) || 0,
        valid_until: prf.valid_until || null,
        active: true,
      };
      if (editingPromo) {
        await supabase.from('coupons').update(payload).eq('id', editingPromo);
        showToast('Coupon updated ✅');
      } else {
        await supabase.from('coupons').insert(payload);
        showToast('Coupon created ✅');
      }
      setShowPromoForm(false);
      setEditingPromo(null);
      setPrf({ code: '', type: 'percent', value: '', min_order: '0', max_discount: '0', max_uses: '0', valid_until: '' });
      fetchCoupons();
    } catch (err: any) {
      showToast(err.message || 'Failed to save coupon');
    } finally {
      setPromoSaving(false);
    }
  };

  const deletePromo = async (id: string) => {
    if (!supabase) return;
    await supabase.from('coupons').delete().eq('id', id);
    showToast('Coupon deleted');
    fetchCoupons();
  };

  const togglePromoActive = async (id: string, active: boolean) => {
    if (!supabase) return;
    await supabase.from('coupons').update({ active: !active }).eq('id', id);
    fetchCoupons();
  };

  // Fetch customer avatars when customers tab is opened
  useEffect(() => {
    if (activeTab !== 'customers' || customers.length === 0 || !supabase) return;
    const loadAvatars = async () => {
      const avatarMap: Record<string, string> = {};
      await Promise.all(
        customers.map(async (c) => {
          try {
            const { data, error } = await supabase.storage
              .from('avatars')
              .createSignedUrl(`${c.id}/avatar.jpg`, 3600);
            if (!error && data?.signedUrl) {
              avatarMap[c.id] = data.signedUrl;
            }
          } catch {}
        })
      );
      setCustAvatars(avatarMap);
    };
    loadAvatars();
  }, [activeTab, customers.length]);

  // Track unread chat messages (from users) for admin
  useEffect(() => {
    if (user?.role !== 'admin' || !supabase || allOrders.length === 0) return;

    const checkUnread = async () => {
      const orderIds = allOrders.map((o) => o.id);
      const unread = new Set<string>();

      const { data } = await supabase
        .from('chat_messages')
        .select('order_id, sender, created_at')
        .in('order_id', orderIds)
        .order('created_at', { ascending: false });

      if (data) {
        const seen = new Set<string>();
        for (const msg of data) {
          if (!seen.has(msg.order_id)) {
            seen.add(msg.order_id);
            if (msg.sender === 'user') {
              unread.add(msg.order_id);
            }
          }
        }
      }
      setUnreadChatOrderIds(unread);
    };

    checkUnread();

    const channel = supabase
      .channel('admin-chat-badge')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
      }, (payload) => {
        const msg = payload.new as any;
        if (msg.sender === 'user') {
          setUnreadChatOrderIds((prev) => new Set([...prev, msg.order_id]));
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.role, allOrders.length]);

  const fetchBulkData = async () => {
    if (!supabase) return;
    try {
      const { data: deals } = await supabase.from('bulk_deals').select('*, bulk_tiers(*)').order('created_at');
      const { data: packs } = await supabase.from('festival_packs').select('*, festival_pack_items(*)').order('created_at');
      if (deals) setBulkDeals(deals);
      if (packs) setFestivalPacks(packs);
    } catch {}
  };

  const fetchAboutData = async () => {
    if (!supabase) return;
    try {
      const { data } = await supabase.from('app_config').select('key, value');
      if (data) {
        const obj: Record<string, string> = {};
        data.forEach((row: any) => { obj[row.key] = row.value || ''; });
        setAboutData((prev) => ({ ...prev, ...obj }));
      }
      setAboutLoaded(true);
    } catch { setAboutLoaded(true); }
  };

  const saveAboutField = async (key: string, value: string) => {
    if (!supabase) return;
    // Upsert into app_config
    const { error } = await supabase.from('app_config').upsert({ key, value }, { onConflict: 'key' });
    if (error) throw error;
  };

  if (user?.role !== 'admin') {
    return (
      <View style={s.denied}>
        <Ionicons name="lock-closed" size={48} color={colors.outline} />
        <Text style={s.deniedTitle}>Admin Access Only</Text>
        <Text style={s.deniedDesc}>This dashboard is restricted to administrators.</Text>
        <Pressable style={s.primaryBtn} onPress={() => router.back()}>
          <Text style={s.primaryBtnText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const handleStatusChange = async (order: Order, newStatus: OrderStatus) => {
    try {
      await updateOrderStatus(order.id, newStatus, order.order_number);
      // Auto-notify the user about status change
      if (supabase) {
        try {
          await supabase.from('notifications').insert({
            user_id: order.user_id,
            title: `${order.order_number} — ${newStatus}`,
            body: `Your order status has been updated to: ${newStatus}`,
            type: 'order',
            icon: 'receipt',
          });
        } catch {}
      }
      showToast(`${order.order_number} → ${newStatus}`);
    } catch { showToast('Failed to update status'); }
  };

  const sendNotification = async () => {
    if (!notifTitle.trim() || !notifBody.trim()) { showToast('Fill in title and message'); return; }
    if (!supabase) return;
    try {
      await supabase.from('notifications').insert({
        user_id: null, // broadcast to all
        title: notifTitle.trim(),
        body: notifBody.trim(),
        type: notifType,
        icon: notifType === 'promo' ? 'pricetag' : notifType === 'stock' ? 'leaf' : 'sparkles',
      });
      setNotifTitle('');
      setNotifBody('');
      setShowNotifForm(false);
      showToast('Notification sent to all users! 📣');
    } catch { showToast('Failed to send'); }
  };

  const handleToggleProduct = async (id: string, active: boolean) => {
    try {
      await toggleProductActive(id, !active);
      showToast(active ? 'Product hidden' : 'Product visible');
    } catch { showToast('Failed to update'); }
  };

  const handleSavePrice = async (id: string) => {
    const price = parseInt(priceInput);
    if (isNaN(price) || price <= 0) { showToast('Invalid price'); return; }
    try {
      await updateProductPrice(id, price);
      setEditingPrice(null);
      showToast('Price updated');
    } catch { showToast('Failed'); }
  };

  const handleDeliveryStatus = async (id: string, current: string) => {
    const next = current === 'available' ? 'busy' : current === 'busy' ? 'offline' : 'available';
    try {
      await updateDeliveryBoyStatus(id, next);
      showToast(`Status → ${next}`);
    } catch { showToast('Failed'); }
  };

  const resetProductForm = () => {
    setPf({ name: '', variety: '', origin: '', price: '', unit: '/kg', tag: '', description: '', stock: '', max_stock: '100', image_url: '' });
    setProductImageUrls([]);
    setHeroImageUrl('');
    setEditingProduct(null);
    setShowProductForm(false);
  };

  const openEditProduct = (prod: any) => {
    setPf({
      name: prod.name || '', variety: prod.variety || '', origin: prod.origin || '',
      price: String(prod.price || ''), unit: prod.unit || '/kg', tag: prod.tag || '',
      description: prod.description || '', stock: String(prod.stock || ''), max_stock: String(prod.max_stock || '100'),
      image_url: prod.image_url || '',
    });
    setProductImageUrls(prod.image_urls || []);
    setHeroImageUrl(prod.hero_image_url || '');
    setEditingProduct(prod.id);
    setShowProductForm(true);
  };

  const handleSaveProduct = async () => {
    if (!pf.name.trim()) { showToast('Product name is required'); return; }
    // Determine the primary image URL: use explicit value, else first uploaded image
    const primaryImage = pf.image_url.trim() || (productImageUrls.length > 0 ? productImageUrls[0] : '');
    const data: any = {
      name: pf.name.trim(), variety: pf.variety.trim(), origin: pf.origin.trim(),
      price: parseInt(pf.price) || 0, unit: pf.unit, tag: pf.tag.trim(),
      description: pf.description.trim(), stock: parseInt(pf.stock) || 0,
      max_stock: parseInt(pf.max_stock) || 100,
      image_url: primaryImage,
      image_urls: productImageUrls,
      hero_image_url: heroImageUrl.trim() || null,
    };
    try {
      if (editingProduct) {
        await updateProduct(editingProduct, data);
        showToast('Product updated ✓');
      } else {
        await addProduct(data);
        showToast('Product added ✓');
      }
      resetProductForm();
    } catch { showToast('Failed to save product'); }
  };

  const handleDeleteProduct = async (id: string, name: string) => {
    if (Platform.OS === 'web') {
      if (!window.confirm(`Delete "${name}"?`)) return;
    }
    try {
      await deleteProduct(id);
      showToast('Product deleted');
    } catch { showToast('Failed to delete'); }
  };

  const handleDeleteCustomer = async (customer: any) => {
    if (!customer || !supabase) return;
    if (customer.role === 'admin') {
      showToast('Cannot delete admin accounts');
      return;
    }
    const doDelete = async () => {
      try {
        // Delete user's chat messages (via their orders)
        const { data: userOrders } = await supabase
          .from('orders')
          .select('id')
          .eq('user_id', customer.id);
        if (userOrders && userOrders.length > 0) {
          const orderIds = userOrders.map((o: any) => o.id);
          await supabase.from('chat_messages').delete().in('order_id', orderIds);
        }
        // Delete user's orders
        await supabase.from('orders').delete().eq('user_id', customer.id);
        // Delete user's notifications
        await supabase.from('notifications').delete().eq('user_id', customer.id);
        // Delete user's profile and verify it was actually deleted
        const { data, error } = await supabase
          .from('profiles')
          .delete()
          .eq('id', customer.id)
          .select();
        if (error) throw error;
        if (!data || data.length === 0) {
          throw new Error('Delete blocked by database policy. Please run the admin DELETE policies in Supabase SQL Editor.');
        }
        setSelectedCustomer(null);
        setCustomerOrders([]);
        showToast(`${customer.name || 'User'} deleted`);
        // Refresh customers list
        loadAll();
      } catch (err: any) {
        showToast(err.message || 'Failed to delete user');
      }
    };
    if (Platform.OS === 'web') {
      if (window.confirm(`Delete user "${customer.name || customer.email}"? This will remove their profile and all their orders. This cannot be undone.`)) {
        doDelete();
      }
    } else {
      Alert.alert(
        'Delete User',
        `Delete "${customer.name || customer.email}"? This will remove their profile and all their orders. This cannot be undone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: doDelete },
        ]
      );
    }
  };

  const pickAndUploadImage = async () => {
    if (productImageUrls.length >= 5) {
      showToast('Max 5 images per product');
      return;
    }
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      setImageUploading(true);

      if (!supabase) {
        showToast('Supabase not configured');
        setImageUploading(false);
        return;
      }

      // Determine file extension from mimeType (more reliable than URI on mobile)
      const mimeToExt: Record<string, string> = {
        'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif',
      };
      const ext = mimeToExt[asset.mimeType || ''] || 'jpg';
      const fileName = `product_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const filePath = `products/${fileName}`;

      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token || supabaseKey;

      let uploadOk = false;

      if (Platform.OS === 'web') {
        // Web: use blob
        const response = await fetch(asset.uri);
        const blob = await response.blob();
        const formData = new FormData();
        formData.append('', blob, `product.${ext}`);

        const uploadRes = await fetch(
          `${supabaseUrl}/storage/v1/object/product-images/${filePath}`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'apikey': supabaseKey || '',
              'x-upsert': 'true',
            },
            body: formData,
          }
        );
        uploadOk = uploadRes.ok;
        if (!uploadOk) {
          const errText = await uploadRes.text().catch(() => 'Unknown error');
          showToast(`Upload failed: ${errText.slice(0, 80)}`);
          setImageUploading(false);
          return;
        }
      } else {
        // Mobile: fetch the image as a blob and upload via arraybuffer
        const response = await fetch(asset.uri);
        const blob = await response.blob();

        const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as ArrayBuffer);
          reader.onerror = reject;
          reader.readAsArrayBuffer(blob);
        });

        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(filePath, arrayBuffer, {
            contentType: asset.mimeType || `image/${ext}`,
            upsert: true,
          });

        if (uploadError) {
          showToast(`Upload failed: ${uploadError.message}`);
          setImageUploading(false);
          return;
        }
        uploadOk = true;
      }

      // Get the public URL
      const { data: urlData } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      if (urlData?.publicUrl) {
        setProductImageUrls((prev) => [...prev, urlData.publicUrl]);
        // Also set as primary if first image
        if (!pf.image_url.trim()) {
          setPf((prev) => ({ ...prev, image_url: urlData.publicUrl }));
        }
        showToast('Image uploaded! ✓');
      }
    } catch (err: any) {
      showToast(`Upload error: ${err.message || 'Unknown error'}`);
    } finally {
      setImageUploading(false);
    }
  };

  /** Upload a separate hero banner image for the hero section */
  const pickAndUploadHeroImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      setHeroImageUploading(true);

      if (!supabase) {
        showToast('Supabase not configured');
        setHeroImageUploading(false);
        return;
      }

      const mimeToExt: Record<string, string> = {
        'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif',
      };
      const ext = mimeToExt[asset.mimeType || ''] || 'jpg';
      const fileName = `hero_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const filePath = `products/${fileName}`;

      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token || supabaseKey;

      let uploadOk = false;

      if (Platform.OS === 'web') {
        const response = await fetch(asset.uri);
        const blob = await response.blob();
        const formData = new FormData();
        formData.append('', blob, `hero.${ext}`);

        const uploadRes = await fetch(
          `${supabaseUrl}/storage/v1/object/product-images/${filePath}`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'apikey': supabaseKey || '',
              'x-upsert': 'true',
            },
            body: formData,
          }
        );
        uploadOk = uploadRes.ok;
        if (!uploadOk) {
          showToast('Hero image upload failed');
          setHeroImageUploading(false);
          return;
        }
      } else {
        const response = await fetch(asset.uri);
        const blob = await response.blob();
        const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as ArrayBuffer);
          reader.onerror = reject;
          reader.readAsArrayBuffer(blob);
        });
        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(filePath, arrayBuffer, {
            contentType: asset.mimeType || `image/${ext}`,
            upsert: true,
          });
        if (uploadError) {
          showToast(`Hero upload failed: ${uploadError.message}`);
          setHeroImageUploading(false);
          return;
        }
        uploadOk = true;
      }

      const { data: urlData } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      if (urlData?.publicUrl) {
        setHeroImageUrl(urlData.publicUrl);
        showToast('Hero image uploaded! ✓');
      }
    } catch (err: any) {
      showToast(`Upload error: ${err.message || 'Unknown error'}`);
    } finally {
      setHeroImageUploading(false);
    }
  };

  const filteredOrders = (orderFilter === 'all'
    ? allOrders
    : orderFilter === 'advance'
    ? allOrders.filter((o: any) => o.is_advance)
    : orderFilter === 'delivered-by'
    ? allOrders
    : allOrders.filter((o) => o.status === orderFilter)
  ).filter((o: any) => {
    if (deliveryFilter === 'all') return true;
    if (deliveryFilter === 'unassigned') return !o.delivery_boy_id;
    return o.delivery_boy_id === deliveryFilter;
  });

  const fmtDate = (d: string) => {
    try { return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); }
    catch { return d; }
  };

  const revenue = kpis.totalRevenue >= 1000 ? `₹${(kpis.totalRevenue / 1000).toFixed(1)}k` : `₹${kpis.totalRevenue}`;

  // ═══════════════ RENDER ═══════════════

  return (
    <View style={[s.container, { backgroundColor: d.bg }]}>
      {/* Header */}
      <View style={s.header}>
        <Pressable style={s.backBtn} onPress={() => router.replace('/(tabs)/profile' as any)}>
          <Ionicons name="arrow-back" size={22} color={colors.onSurface} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={[s.headerTitle, { color: d.text }]}>Orchard Pulse</Text>
          <Text style={[s.headerSub, { color: d.textMuted }]}>Admin Dashboard</Text>
        </View>
        <View style={s.onlineStatus}>
          <View style={s.onlineDot} />
          <Text style={s.onlineText}>Live</Text>
        </View>
      </View>

      {/* Tab Bar */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabBar} contentContainerStyle={s.tabBarContent}>
        {TABS.map((tab) => (
          <Pressable
            key={tab.id}
            style={[s.tab, activeTab === tab.id && s.tabActive]}
            onPress={() => setActiveTab(tab.id)}
          >
            <Ionicons name={`${tab.icon}-outline` as any} size={16}
              color={activeTab === tab.id ? colors.onPrimary : colors.onSurfaceVariant} />
            <Text style={[s.tabText, activeTab === tab.id && s.tabTextActive]}>{tab.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {isLoading && allOrders.length === 0 ? (
        <View style={s.loading}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={s.loadingText}>Loading admin data...</Text>
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>

          {/* ═══ DASHBOARD ═══ */}
          {activeTab === 'dashboard' && (
            <>
              <View style={s.kpiGrid}>
                {[
                  { label: 'Revenue', value: revenue, icon: 'wallet', bg: '#e8f5e9' },
                  { label: 'Orders', value: `${kpis.orderCount}`, icon: 'bag-handle', bg: '#e3f2fd' },
                  { label: 'Customers', value: `${kpis.customerCount}`, icon: 'people', bg: '#fce4ec' },
                  { label: 'Today', value: `${kpis.todayOrders}`, icon: 'today', bg: '#fff8e1' },
                ].map((kpi) => (
                  <View key={kpi.label} style={[s.kpiCard, { backgroundColor: kpi.bg }]}>
                    <Ionicons name={kpi.icon as any} size={22} color={colors.primary} />
                    <Text style={s.kpiLabel}>{kpi.label}</Text>
                    <Text style={s.kpiValue}>{kpi.value}</Text>
                  </View>
                ))}
              </View>

              <View style={s.pendingBanner}>
                <Ionicons name="alert-circle" size={20} color="#E65100" />
                <Text style={s.pendingText}>{kpis.pendingOrders} orders pending</Text>
                <Pressable onPress={() => { setActiveTab('orders'); setOrderFilter('Placed'); }}>
                  <Text style={s.pendingLink}>View →</Text>
                </Pressable>
              </View>

              {/* Send Notification */}
              <Pressable style={s.notifSendBtn} onPress={() => setShowNotifForm(!showNotifForm)}>
                <Ionicons name={showNotifForm ? 'close' : 'megaphone'} size={18} color={colors.onPrimary} />
                <Text style={s.notifSendBtnText}>{showNotifForm ? 'Cancel' : 'Send Notification'}</Text>
              </Pressable>

              {showNotifForm && (
                <View style={s.notifForm}>
                  <View style={s.notifTypeRow}>
                    {(['promo', 'stock', 'system'] as const).map((t) => (
                      <Pressable key={t} style={[s.notifTypeChip, notifType === t && s.notifTypeChipActive]}
                        onPress={() => setNotifType(t)}>
                        <Text style={[s.notifTypeChipText, notifType === t && s.notifTypeChipTextActive]}>
                          {t === 'promo' ? '🏷️ Promo' : t === 'stock' ? '🍃 Stock' : '⚙️ System'}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                  <TextInput style={s.notifInput} placeholder="Title" value={notifTitle}
                    onChangeText={setNotifTitle} placeholderTextColor={colors.outline} />
                  <TextInput style={[s.notifInput, { minHeight: 60 }]} placeholder="Message" value={notifBody}
                    onChangeText={setNotifBody} multiline placeholderTextColor={colors.outline} />
                  <Pressable style={s.notifSendAction} onPress={sendNotification}>
                    <Ionicons name="send" size={16} color={colors.onPrimary} />
                    <Text style={s.notifSendActionText}>Send to All Users</Text>
                  </Pressable>
                </View>
              )}

              {/* Analytics Section */}
              <AnalyticsSection />

              <Text style={[s.sectionTitle, { color: d.text }]}>Recent Orders</Text>
              {allOrders.slice(0, 5).map((order) => (
                <View key={order.id} style={s.orderRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.orderRowId}>{order.order_number}</Text>
                    <Text style={s.orderRowMeta}>{order.customer_name} · ₹{order.total?.toLocaleString()}</Text>
                  </View>
                  <View style={[s.statusBadge, order.status === 'Delivered' ? s.statusDone : s.statusPending]}>
                    <Text style={[s.statusText, order.status === 'Delivered' && s.statusTextDone]}>{order.status}</Text>
                  </View>
                </View>
              ))}
            </>
          )}

          {/* ═══ ORDERS ═══ */}
          {activeTab === 'orders' && (
            <>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterBar}>
                {['all', 'advance', 'delivered-by', ...ORDER_STATUSES, 'Cancelled'].map((f) => (
                  <Pressable key={f} style={[s.filterChip, orderFilter === f && s.filterChipActive]}
                    onPress={() => { setOrderFilter(f); if (f !== 'delivered-by') setDeliveryFilter('all'); }}>
                    <Text style={[s.filterChipText, orderFilter === f && s.filterChipTextActive]}>
                      {f === 'all' ? `All (${allOrders.length})` : f === 'advance' ? `📅 Advance (${allOrders.filter((o: any) => o.is_advance).length})` : f === 'delivered-by' ? '🚚 Delivered By' : f}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>

              {/* Delivery person sub-filter */}
              {orderFilter === 'delivered-by' && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[s.filterBar, { marginTop: 0, paddingTop: 0 }]}>
                  <Pressable
                    style={[s.filterChip, deliveryFilter === 'all' && s.filterChipActive, { borderColor: 'rgba(46,125,50,0.2)' }]}
                    onPress={() => setDeliveryFilter('all')}
                  >
                    <Text style={[s.filterChipText, deliveryFilter === 'all' && s.filterChipTextActive]}>All Partners</Text>
                  </Pressable>
                  <Pressable
                    style={[s.filterChip, deliveryFilter === 'unassigned' && s.filterChipActive, { borderColor: 'rgba(229,57,53,0.2)' }]}
                    onPress={() => setDeliveryFilter('unassigned')}
                  >
                    <Text style={[s.filterChipText, deliveryFilter === 'unassigned' && s.filterChipTextActive]}>
                      Unassigned ({allOrders.filter((o: any) => !o.delivery_boy_id).length})
                    </Text>
                  </Pressable>
                  {deliveryBoys.map((db) => {
                    const count = allOrders.filter((o: any) => o.delivery_boy_id === db.id).length;
                    return (
                      <Pressable
                        key={db.id}
                        style={[s.filterChip, deliveryFilter === db.id && s.filterChipActive, { borderColor: 'rgba(46,125,50,0.2)' }]}
                        onPress={() => setDeliveryFilter(db.id)}
                      >
                        <Ionicons name="bicycle" size={12} color={deliveryFilter === db.id ? colors.onPrimary : colors.primary} style={{ marginRight: 4 }} />
                        <Text style={[s.filterChipText, deliveryFilter === db.id && s.filterChipTextActive]}>
                          {db.name} ({count})
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              )}

              {filteredOrders.map((order) => (
                <View key={order.id} style={s.orderCard}>
                  <Pressable
                    style={s.orderCardTop}
                    onPress={async () => {
                      setSelectedOrder(order);
                      setOrderCustomer(null);
                      // Fetch customer profile
                      if (supabase && order.user_id) {
                        const { data } = await supabase
                          .from('profiles')
                          .select('*')
                          .eq('id', order.user_id)
                          .single();
                        setOrderCustomer(data);
                      }
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={s.orderCardId}>{order.order_number}</Text>
                        {(order as any).is_advance && (
                          <View style={{ backgroundColor: '#E3F2FD', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 }}>
                            <Text style={{ fontSize: 9, fontWeight: '700', color: '#1565C0' }}>📅 ADVANCE</Text>
                          </View>
                        )}
                      </View>
                      <Text style={s.orderCardCustomer}>{order.customer_name}</Text>
                      <Text style={s.orderCardItems}>{order.items_summary}</Text>
                      {(order as any).is_advance && (order as any).delivery_date && (
                        <Text style={{ fontSize: 11, color: '#1565C0', marginTop: 4, fontWeight: '600' }}>
                          🚚 Deliver: {new Date((order as any).delivery_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', weekday: 'short' })} · {(order as any).delivery_slot || ''}
                        </Text>
                      )}
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={s.orderCardTotal}>₹{order.total?.toLocaleString()}</Text>
                      <Text style={s.orderCardDate}>{fmtDate(order.created_at)}</Text>
                    </View>
                  </Pressable>

                  {/* Status changer */}
                  <View style={s.orderActions}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {ORDER_STATUSES.map((st) => (
                        <Pressable key={st}
                          style={[s.statusPill, order.status === st && s.statusPillActive]}
                          onPress={() => order.status !== st && handleStatusChange(order, st)}>
                          <Text style={[s.statusPillText, order.status === st && s.statusPillTextActive]}>
                            {st}
                          </Text>
                        </Pressable>
                      ))}
                      {order.status !== 'Delivered' && order.status !== 'Cancelled' && (
                        <Pressable
                          style={[s.statusPill, { borderColor: '#C62828' }]}
                          onPress={() => handleStatusChange(order, 'Cancelled' as any)}
                        >
                          <Text style={[s.statusPillText, { color: '#C62828' }]}>✕ Cancel</Text>
                        </Pressable>
                      )}
                      {order.status === 'Cancelled' && (
                        <View style={[s.statusPill, { backgroundColor: '#C62828', borderColor: '#C62828' }]}>
                          <Text style={[s.statusPillText, { color: '#fff' }]}>Cancelled</Text>
                        </View>
                      )}
                    </ScrollView>
                    <Pressable style={s.chatLink} onPress={() => {
                      setUnreadChatOrderIds((prev) => {
                        const next = new Set(prev);
                        next.delete(order.id);
                        return next;
                      });
                      router.push(`/chat/${order.id}`);
                    }}>
                      <Ionicons name="chatbubble" size={16} color={colors.primary} />
                      {unreadChatOrderIds.has(order.id) && (
                        <View style={s.chatBadge} />
                      )}
                    </Pressable>
                  </View>

                  {/* Delivery Boy Assignment */}
                  {order.status !== 'Delivered' && (
                    <View style={s.deliveryAssignSection}>
                      <Ionicons name="bicycle-outline" size={14} color="rgba(27,60,18,0.4)" />
                      {(order as any).delivery_boy_id ? (
                        <View style={s.deliveryAssignedRow}>
                          <View style={s.deliveryAssignedBadge}>
                            <Ionicons name="person" size={10} color="#fff" />
                          </View>
                          <Text style={s.deliveryAssignedName}>{(order as any).delivery_boy_name || 'Assigned'}</Text>
                          <Pressable
                            style={s.deliveryUnassignBtn}
                            onPress={async () => {
                              try {
                                await unassignDeliveryBoy(order.id);
                                showToast('Delivery partner removed');
                              } catch { showToast('Failed'); }
                            }}
                          >
                            <Ionicons name="close" size={12} color="#C62828" />
                          </Pressable>
                        </View>
                      ) : (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', gap: 6 }}>
                            {deliveryBoys
                              .filter((db) => db.status === 'available')
                              .map((db) => (
                                <Pressable
                                  key={db.id}
                                  style={s.deliveryPickBtn}
                                  onPress={async () => {
                                    try {
                                      await assignDeliveryBoy(order.id, db.id, db.name);
                                      showToast(`${db.name} assigned!`);
                                    } catch (err: any) {
                                      console.warn('Assign error:', err);
                                      showToast(err?.message || 'Failed to assign');
                                    }
                                  }}
                                >
                                  <Ionicons name="person-add-outline" size={11} color="#2E7D32" />
                                  <Text style={s.deliveryPickText}>{db.name}</Text>
                                </Pressable>
                              ))}
                            {deliveryBoys.filter((db) => db.status === 'available').length === 0 && (
                              <Text style={{ fontSize: 11, color: 'rgba(27,60,18,0.3)', fontStyle: 'italic' }}>No available partners</Text>
                            )}
                          </View>
                        </ScrollView>
                      )}
                    </View>
                  )}

                  {/* Show assigned delivery for delivered orders */}
                  {order.status === 'Delivered' && (order as any).delivery_boy_name && (
                    <View style={s.deliveryAssignSection}>
                      <Ionicons name="checkmark-circle" size={14} color="#43A047" />
                      <Text style={{ fontSize: 11, color: '#43A047', fontWeight: '600' }}>
                        Delivered by {(order as any).delivery_boy_name}
                      </Text>
                    </View>
                  )}
                </View>
              ))}
              {filteredOrders.length === 0 && (
                <View style={s.emptySection}><Text style={s.emptyText}>No orders with this status</Text></View>
              )}

              {/* ── Order Detail Modal ── */}
              <Modal
                visible={!!selectedOrder}
                animationType="slide"
                transparent
                onRequestClose={() => setSelectedOrder(null)}
              >
                <View style={s.modalOverlay}>
                  <View style={s.custModal}>
                    <ScrollView showsVerticalScrollIndicator={false}>
                      {selectedOrder && (
                        <>
                          {/* Header */}
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <View>
                              <Text style={{ fontSize: 20, fontWeight: '800', color: colors.onSurface }}>{selectedOrder.order_number}</Text>
                              <View style={[s.statusBadge, selectedOrder.status === 'Delivered' ? s.statusDone : s.statusPending, { marginTop: 4 }]}>
                                <Text style={[s.statusText, selectedOrder.status === 'Delivered' && s.statusTextDone]}>{selectedOrder.status}</Text>
                              </View>
                            </View>
                            <Pressable onPress={() => setSelectedOrder(null)} style={{ padding: 8 }}>
                              <Ionicons name="close" size={24} color={colors.outline} />
                            </Pressable>
                          </View>

                          {/* Order Info */}
                          <View style={s.odSection}>
                            <Text style={s.odSectionTitle}>Order Details</Text>
                            <View style={s.odRow}>
                              <Text style={s.odLabel}>Date</Text>
                              <Text style={s.odValue}>{fmtDate(selectedOrder.created_at)}</Text>
                            </View>
                            <View style={s.odRow}>
                              <Text style={s.odLabel}>Total</Text>
                              <Text style={[s.odValue, { fontWeight: '700', color: colors.primary }]}>₹{selectedOrder.total?.toLocaleString()}</Text>
                            </View>
                            {selectedOrder.address && (
                              <View style={s.odRow}>
                                <Text style={s.odLabel}>Address</Text>
                                <Text style={[s.odValue, { flex: 1, textAlign: 'right' }]}>{selectedOrder.address}</Text>
                              </View>
                            )}
                            {(selectedOrder as any).delivery_boy_name && (
                              <View style={s.odRow}>
                                <Text style={s.odLabel}>Delivery By</Text>
                                <Text style={s.odValue}>{(selectedOrder as any).delivery_boy_name}</Text>
                              </View>
                            )}
                            {(selectedOrder as any).is_advance && (
                              <>
                                <View style={s.odRow}>
                                  <Text style={s.odLabel}>Type</Text>
                                  <Text style={[s.odValue, { color: '#1565C0' }]}>📅 Advance Order</Text>
                                </View>
                                {(selectedOrder as any).delivery_date && (
                                  <View style={s.odRow}>
                                    <Text style={s.odLabel}>Delivery Date</Text>
                                    <Text style={s.odValue}>
                                      {new Date((selectedOrder as any).delivery_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', weekday: 'short' })}
                                      {(selectedOrder as any).delivery_slot ? ` · ${(selectedOrder as any).delivery_slot}` : ''}
                                    </Text>
                                  </View>
                                )}
                              </>
                            )}
                          </View>

                          {/* Items */}
                          <View style={s.odSection}>
                            <Text style={s.odSectionTitle}>Items ({selectedOrder.items?.length || 0})</Text>
                            {(selectedOrder.items || []).map((item, idx) => (
                              <View key={idx} style={s.odItemRow}>
                                {item.image && (
                                  <Image source={typeof item.image === 'string' ? { uri: item.image } : item.image} style={s.odItemImg} />
                                )}
                                <View style={{ flex: 1 }}>
                                  <Text style={s.odItemName}>{item.name}</Text>
                                  <Text style={s.odItemQty}>×{item.qty}</Text>
                                </View>
                                <Text style={s.odItemPrice}>₹{(item.price * item.qty).toLocaleString()}</Text>
                              </View>
                            ))}
                            {(!selectedOrder.items || selectedOrder.items.length === 0) && (
                              <Text style={{ fontSize: 12, color: colors.outline, fontStyle: 'italic' }}>{selectedOrder.items_summary}</Text>
                            )}
                          </View>

                          {/* Customer Info */}
                          <View style={s.odSection}>
                            <Text style={s.odSectionTitle}>Customer</Text>
                            {orderCustomer ? (
                              <>
                                <View style={s.odRow}>
                                  <Text style={s.odLabel}>Name</Text>
                                  <Text style={s.odValue}>{orderCustomer.name || selectedOrder.customer_name}</Text>
                                </View>
                                <View style={s.odRow}>
                                  <Text style={s.odLabel}>Email</Text>
                                  <Text style={s.odValue}>{orderCustomer.email || '—'}</Text>
                                </View>
                                <View style={s.odRow}>
                                  <Text style={s.odLabel}>Phone</Text>
                                  <Text style={s.odValue}>{orderCustomer.phone || '—'}</Text>
                                </View>
                                {orderCustomer.address && (
                                  <View style={s.odRow}>
                                    <Text style={s.odLabel}>Profile Address</Text>
                                    <Text style={[s.odValue, { flex: 1, textAlign: 'right' }]}>{orderCustomer.address}</Text>
                                  </View>
                                )}
                                <View style={s.odRow}>
                                  <Text style={s.odLabel}>Role</Text>
                                  <View style={[s.roleBadge, orderCustomer.role === 'admin' && s.roleBadgeAdmin]}>
                                    <Text style={[s.roleText, orderCustomer.role === 'admin' && s.roleTextAdmin]}>{orderCustomer.role}</Text>
                                  </View>
                                </View>
                              </>
                            ) : (
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 }}>
                                <ActivityIndicator size="small" color={colors.primary} />
                                <Text style={{ fontSize: 12, color: colors.outline }}>Loading customer...</Text>
                              </View>
                            )}
                          </View>

                          {/* Actions */}
                          <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
                            <Pressable
                              style={[s.prodFormSave, { flex: 1 }]}
                              onPress={() => {
                                setSelectedOrder(null);
                                router.push(`/chat/${selectedOrder.id}`);
                              }}
                            >
                              <Ionicons name="chatbubble-outline" size={16} color={colors.onPrimary} />
                              <Text style={s.prodFormSaveText}>Open Chat</Text>
                            </Pressable>
                            <Pressable
                              style={[s.prodFormCancel, { flex: 1 }]}
                              onPress={() => setSelectedOrder(null)}
                            >
                              <Text style={s.prodFormCancelText}>Close</Text>
                            </Pressable>
                          </View>
                        </>
                      )}
                    </ScrollView>
                  </View>
                </View>
              </Modal>
            </>
          )}

          {/* ═══ PRODUCTS ═══ */}
          {activeTab === 'products' && (
            <>
              <View style={s.prodHeader}>
                <Text style={s.sectionSubtext}>{products.length} products · {products.filter(p=>p.active).length} active</Text>
                <Pressable style={s.addProdBtn} onPress={() => { resetProductForm(); setShowProductForm(true); }}>
                  <Ionicons name="add" size={18} color={colors.onPrimary} />
                  <Text style={s.addProdBtnText}>Add Product</Text>
                </Pressable>
              </View>

              {/* Add/Edit Form */}
              {showProductForm && (
                <View style={s.prodForm}>
                  <Text style={s.prodFormTitle}>{editingProduct ? 'Edit Product' : 'New Product'}</Text>
                  <View style={s.prodFormRow}>
                    <TextInput style={[s.prodFormInput, { flex: 2 }]} placeholder="Product Name *" value={pf.name} onChangeText={(v) => setPf({...pf, name: v})} placeholderTextColor={colors.outline} />
                    <TextInput style={[s.prodFormInput, { flex: 1 }]} placeholder="Variety" value={pf.variety} onChangeText={(v) => setPf({...pf, variety: v})} placeholderTextColor={colors.outline} />
                  </View>
                  <TextInput style={s.prodFormInput} placeholder="Origin (e.g. Ratnagiri, India)" value={pf.origin} onChangeText={(v) => setPf({...pf, origin: v})} placeholderTextColor={colors.outline} />
                  <View style={s.prodFormRow}>
                    <TextInput style={[s.prodFormInput, { flex: 1 }]} placeholder="Price ₹" value={pf.price} onChangeText={(v) => setPf({...pf, price: v})} keyboardType="numeric" placeholderTextColor={colors.outline} />
                    <TextInput style={[s.prodFormInput, { flex: 1 }]} placeholder="Unit (/kg)" value={pf.unit} onChangeText={(v) => setPf({...pf, unit: v})} placeholderTextColor={colors.outline} />
                    <TextInput style={[s.prodFormInput, { flex: 1 }]} placeholder="Tag" value={pf.tag} onChangeText={(v) => setPf({...pf, tag: v})} placeholderTextColor={colors.outline} />
                  </View>
                  <View style={s.prodFormRow}>
                    <TextInput style={[s.prodFormInput, { flex: 1 }]} placeholder="Stock" value={pf.stock} onChangeText={(v) => setPf({...pf, stock: v})} keyboardType="numeric" placeholderTextColor={colors.outline} />
                    <TextInput style={[s.prodFormInput, { flex: 1 }]} placeholder="Max Stock" value={pf.max_stock} onChangeText={(v) => setPf({...pf, max_stock: v})} keyboardType="numeric" placeholderTextColor={colors.outline} />
                  </View>
                  <TextInput style={[s.prodFormInput, { minHeight: 50 }]} placeholder="Description" value={pf.description} onChangeText={(v) => setPf({...pf, description: v})} multiline placeholderTextColor={colors.outline} />
                  {/* Product Images (multi) */}
                  <View style={s.imageUrlSection}>
                    <Text style={s.imageUrlLabel}>Product Images ({productImageUrls.length}/5)</Text>
                    {/* Uploaded images gallery */}
                    {productImageUrls.length > 0 && (
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                          {productImageUrls.map((url, idx) => (
                            <View key={idx} style={s.imagePreview}>
                              <Image source={{ uri: url }} style={s.imagePreviewImg} resizeMode="cover" />
                              <Pressable
                                style={s.imageRemoveBtn}
                                onPress={() => {
                                  const updated = productImageUrls.filter((_, i) => i !== idx);
                                  setProductImageUrls(updated);
                                  // Update primary image_url
                                  if (pf.image_url === url) {
                                    setPf((prev) => ({ ...prev, image_url: updated[0] || '' }));
                                  }
                                }}
                              >
                                <Ionicons name="close-circle" size={22} color={colors.error} />
                              </Pressable>
                            </View>
                          ))}
                        </View>
                      </ScrollView>
                    )}
                    {/* Upload button */}
                    <View style={s.imageActions}>
                      <Pressable
                        style={[s.imageUploadBtn, (imageUploading || productImageUrls.length >= 5) && { opacity: 0.6 }]}
                        onPress={pickAndUploadImage}
                        disabled={imageUploading || productImageUrls.length >= 5}
                      >
                        {imageUploading ? (
                          <ActivityIndicator size="small" color={colors.onPrimary} />
                        ) : (
                          <Ionicons name="cloud-upload-outline" size={18} color={colors.onPrimary} />
                        )}
                        <Text style={s.imageUploadBtnText}>
                          {imageUploading ? 'Uploading...' : productImageUrls.length >= 5 ? 'Max Reached' : 'Upload Image'}
                        </Text>
                      </Pressable>
                      <Text style={s.imageOrText}>or</Text>
                      <View style={{ flex: 1 }}>
                        <TextInput
                          style={[s.prodFormInput, { marginBottom: 0 }]}
                          placeholder="Paste URL"
                          value={pf.image_url}
                          onChangeText={(v) => setPf({...pf, image_url: v})}
                          placeholderTextColor={colors.outline}
                          autoCapitalize="none"
                        />
                      </View>
                    </View>
                    {productImageUrls.length === 0 && !pf.image_url.trim() && (
                      <View style={s.imagePlaceholder}>
                        <Ionicons name="images-outline" size={32} color={colors.outline} />
                        <Text style={s.imagePlaceholderText}>No images — upload up to 5 photos</Text>
                      </View>
                    )}
                  </View>
                  {/* Hero Banner Image (separate from product images) */}
                  <View style={s.imageUrlSection}>
                    <Text style={s.imageUrlLabel}>🖼️ Hero Banner Image (optional)</Text>
                    <Text style={{ fontSize: 11, color: colors.outline, marginBottom: 8 }}>
                      A separate image shown on the hero section. If not set, the product image is used.
                    </Text>
                    {heroImageUrl ? (
                      <View style={{ marginBottom: 10 }}>
                        <View style={s.imagePreview}>
                          <Image source={{ uri: heroImageUrl }} style={s.imagePreviewImg} resizeMode="cover" />
                          <Pressable
                            style={s.imageRemoveBtn}
                            onPress={() => setHeroImageUrl('')}
                          >
                            <Ionicons name="close-circle" size={22} color={colors.error} />
                          </Pressable>
                        </View>
                      </View>
                    ) : null}
                    <View style={s.imageActions}>
                      <Pressable
                        style={[s.imageUploadBtn, heroImageUploading && { opacity: 0.6 }]}
                        onPress={pickAndUploadHeroImage}
                        disabled={heroImageUploading}
                      >
                        {heroImageUploading ? (
                          <ActivityIndicator size="small" color={colors.onPrimary} />
                        ) : (
                          <Ionicons name="image-outline" size={18} color={colors.onPrimary} />
                        )}
                        <Text style={s.imageUploadBtnText}>
                          {heroImageUploading ? 'Uploading...' : 'Upload Hero Image'}
                        </Text>
                      </Pressable>
                      <Text style={s.imageOrText}>or</Text>
                      <View style={{ flex: 1 }}>
                        <TextInput
                          style={[s.prodFormInput, { marginBottom: 0 }]}
                          placeholder="Paste hero image URL"
                          value={heroImageUrl}
                          onChangeText={setHeroImageUrl}
                          placeholderTextColor={colors.outline}
                          autoCapitalize="none"
                        />
                      </View>
                    </View>
                  </View>
                  <View style={s.prodFormActions}>
                    <Pressable style={s.prodFormCancel} onPress={resetProductForm}>
                      <Text style={s.prodFormCancelText}>Cancel</Text>
                    </Pressable>
                    <Pressable style={s.prodFormSave} onPress={handleSaveProduct}>
                      <Ionicons name="checkmark" size={18} color={colors.onPrimary} />
                      <Text style={s.prodFormSaveText}>{editingProduct ? 'Update' : 'Add Product'}</Text>
                    </Pressable>
                  </View>
                </View>
              )}

              {products.map((prod) => (
                <View key={prod.id} style={[s.prodCard, !prod.active && s.prodCardInactive]}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.prodName}>{prod.name}</Text>
                    <Text style={s.prodMeta}>{prod.variety} · {prod.origin}</Text>
                    <View style={s.prodStats}>
                      <Text style={s.prodPrice}>₹{prod.price}{prod.unit}</Text>
                      <Text style={s.prodStock}>Stock: {prod.stock}/{prod.max_stock}</Text>
                      {prod.tag ? <View style={s.prodTag}><Text style={s.prodTagText}>{prod.tag}</Text></View> : null}
                    </View>
                    <View style={s.prodBadgeRow}>
                      <Pressable
                        style={[s.prodBadge, prod.is_hero && s.prodBadgeActive]}
                        onPress={() => { setProductHero(prod.id); showToast(`${prod.name} is now the Hero!`); }}>
                        <Ionicons name={prod.is_hero ? 'star' : 'star-outline'} size={14} color={prod.is_hero ? '#fff' : colors.outline} />
                        <Text style={[s.prodBadgeText, prod.is_hero && s.prodBadgeTextActive]}>Hero</Text>
                      </Pressable>
                      <Pressable
                        style={[s.prodBadge, prod.is_editors_pick && s.prodBadgeActive2]}
                        onPress={() => { setProductEditorsPick(prod.id); showToast(`${prod.name} is now Editor's Pick!`); }}>
                        <Ionicons name={prod.is_editors_pick ? 'ribbon' : 'ribbon-outline'} size={14} color={prod.is_editors_pick ? '#fff' : colors.outline} />
                        <Text style={[s.prodBadgeText, prod.is_editors_pick && s.prodBadgeTextActive]}>Editor's Pick</Text>
                      </Pressable>
                    </View>
                  </View>
                  <View style={s.prodActions}>
                    <Pressable style={s.prodEditBtn} onPress={() => openEditProduct(prod)}>
                      <Ionicons name="create-outline" size={18} color={colors.primary} />
                    </Pressable>
                    <Pressable style={[s.toggleBtn, prod.active ? s.toggleActive : s.toggleInactive]}
                      onPress={() => handleToggleProduct(prod.id, prod.active)}>
                      <Ionicons name={prod.active ? 'eye' : 'eye-off'} size={18}
                        color={prod.active ? colors.secondary : colors.outline} />
                    </Pressable>
                    <Pressable style={s.prodDeleteBtn} onPress={() => handleDeleteProduct(prod.id, prod.name)}>
                      <Ionicons name="trash-outline" size={16} color={colors.error} />
                    </Pressable>
                  </View>
                </View>
              ))}
              {products.length === 0 && (
                <View style={s.emptySection}><Text style={s.emptyText}>No products in database</Text></View>
              )}
            </>
          )}

          {/* ═══ CUSTOMERS ═══ */}
          {activeTab === 'customers' && (
            <>
              {/* Search bar */}
              <View style={s.custSearchWrap}>
                <Ionicons name="search" size={16} color={colors.outline} />
                <TextInput
                  style={s.custSearchInput}
                  placeholder="Search by name, email or phone..."
                  value={customerSearch}
                  onChangeText={setCustomerSearch}
                  placeholderTextColor={colors.outline}
                  autoCapitalize="none"
                />
                {customerSearch.length > 0 && (
                  <Pressable onPress={() => setCustomerSearch('')}>
                    <Ionicons name="close-circle" size={18} color={colors.outline} />
                  </Pressable>
                )}
              </View>
              <Text style={s.sectionSubtext}>
                {customerSearch
                  ? `${customers.filter((c) => {
                      const q = customerSearch.toLowerCase();
                      return (c.name || '').toLowerCase().includes(q)
                        || (c.email || '').toLowerCase().includes(q)
                        || (c.phone || '').toLowerCase().includes(q);
                    }).length} of ${customers.length} customers`
                  : `${customers.length} registered users`
                }
              </Text>
              {customers
                .filter((c) => {
                  if (!customerSearch) return true;
                  const q = customerSearch.toLowerCase();
                  return (c.name || '').toLowerCase().includes(q)
                    || (c.email || '').toLowerCase().includes(q)
                    || (c.phone || '').toLowerCase().includes(q);
                })
                .map((cust) => (
                <Pressable
                  key={cust.id}
                  style={s.custCard}
                  onPress={async () => {
                    setSelectedCustomer(cust);
                    // Fetch this customer's orders
                    if (supabase) {
                      const { data } = await supabase
                        .from('orders')
                        .select('*')
                        .eq('user_id', cust.id)
                        .order('created_at', { ascending: false });
                      setCustomerOrders((data || []) as Order[]);
                    }
                  }}
                >
                  {custAvatars[cust.id] ? (
                    <Image source={{ uri: custAvatars[cust.id] }} style={s.custAvatarImg} />
                  ) : (
                    <View style={s.custAvatar}>
                      <Text style={s.custAvatarText}>{(cust.name || '?')[0].toUpperCase()}</Text>
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={s.custName}>{cust.name}</Text>
                    <Text style={s.custEmail}>{cust.email}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={s.custOrders}>{cust.total_orders || 0} orders</Text>
                    <Text style={s.custSpent}>₹{(cust.total_spent || 0).toLocaleString()}</Text>
                    <View style={[s.roleBadge, cust.role === 'admin' && s.roleBadgeAdmin]}>
                      <Text style={[s.roleText, cust.role === 'admin' && s.roleTextAdmin]}>{cust.role}</Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.outline} />
                </Pressable>
              ))}

              {/* ── Customer Detail Modal ── */}
              <Modal
                visible={!!selectedCustomer}
                animationType="slide"
                transparent
                onRequestClose={() => setSelectedCustomer(null)}
              >
                <View style={s.modalOverlay}>
                  <View style={s.custModal}>
                    <ScrollView showsVerticalScrollIndicator={false}>
                      {/* Header */}
                      <View style={s.custModalHeader}>
                        {selectedCustomer && custAvatars[selectedCustomer.id] ? (
                          <Image source={{ uri: custAvatars[selectedCustomer.id] }} style={s.custModalAvatarImg} />
                        ) : (
                          <View style={s.custModalAvatar}>
                            <Text style={s.custModalAvatarText}>
                              {(selectedCustomer?.name || '?')[0].toUpperCase()}
                            </Text>
                          </View>
                        )}
                        <Text style={s.custModalName}>{selectedCustomer?.name}</Text>
                        <View style={[s.roleBadge, selectedCustomer?.role === 'admin' && s.roleBadgeAdmin, { marginTop: 4 }]}>
                          <Text style={[s.roleText, selectedCustomer?.role === 'admin' && s.roleTextAdmin]}>
                            {selectedCustomer?.role === 'admin' ? 'Administrator' : 'Customer'}
                          </Text>
                        </View>
                      </View>

                      {/* Contact Info */}
                      <Text style={s.custModalSection}>Contact Information</Text>
                      <View style={s.custModalCard}>
                        <View style={s.custModalRow}>
                          <Ionicons name="mail-outline" size={16} color={colors.outline} />
                          <Text style={s.custModalLabel}>Email</Text>
                          <Text style={s.custModalValue}>{selectedCustomer?.email || '—'}</Text>
                        </View>
                        <View style={s.custModalDivider} />
                        <View style={s.custModalRow}>
                          <Ionicons name="call-outline" size={16} color={colors.outline} />
                          <Text style={s.custModalLabel}>Phone</Text>
                          <Text style={s.custModalValue}>{selectedCustomer?.phone || 'Not provided'}</Text>
                        </View>
                        <View style={s.custModalDivider} />
                        <View style={s.custModalRow}>
                          <Ionicons name="location-outline" size={16} color={colors.outline} />
                          <Text style={s.custModalLabel}>Address</Text>
                          <Text style={[s.custModalValue, { flex: 1, textAlign: 'right' }]} numberOfLines={2}>
                            {selectedCustomer?.address || 'Not provided'}
                          </Text>
                        </View>
                      </View>

                      {/* Stats */}
                      <Text style={s.custModalSection}>Statistics</Text>
                      <View style={s.custModalCard}>
                        <View style={s.custModalStatsRow}>
                          <View style={s.custModalStat}>
                            <Text style={s.custModalStatVal}>{selectedCustomer?.total_orders || 0}</Text>
                            <Text style={s.custModalStatLabel}>Orders</Text>
                          </View>
                          <View style={s.custModalStat}>
                            <Text style={s.custModalStatVal}>₹{(selectedCustomer?.total_spent || 0).toLocaleString()}</Text>
                            <Text style={s.custModalStatLabel}>Total Spent</Text>
                          </View>
                          <View style={s.custModalStat}>
                            <Text style={s.custModalStatVal}>
                              {selectedCustomer?.created_at
                                ? new Date(selectedCustomer.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })
                                : '—'}
                            </Text>
                            <Text style={s.custModalStatLabel}>Joined</Text>
                          </View>
                        </View>
                        <View style={s.custModalDivider} />
                        <View style={s.custModalRow}>
                          <Ionicons name="finger-print-outline" size={16} color={colors.outline} />
                          <Text style={s.custModalLabel}>User ID</Text>
                          <Text style={[s.custModalValue, { fontSize: 10 }]} numberOfLines={1}>
                            {selectedCustomer?.id}
                          </Text>
                        </View>
                      </View>

                      {/* Recent Orders */}
                      <Text style={s.custModalSection}>Order History ({customerOrders.length})</Text>
                      {customerOrders.length === 0 ? (
                        <View style={[s.custModalCard, { alignItems: 'center', paddingVertical: 20 }]}>
                          <Text style={s.custEmail}>No orders yet</Text>
                        </View>
                      ) : (
                        customerOrders.slice(0, 10).map((order) => (
                          <View key={order.id} style={s.custModalOrderCard}>
                            <View style={{ flex: 1 }}>
                              <Text style={s.custName}>#{order.id.slice(0, 8)}</Text>
                              <Text style={s.custEmail}>
                                {new Date(order.created_at).toLocaleDateString('en-IN', {
                                  day: 'numeric', month: 'short', year: 'numeric',
                                })}
                              </Text>
                            </View>
                            <View style={{ alignItems: 'flex-end' }}>
                              <Text style={s.custOrders}>₹{(order.total || 0).toLocaleString()}</Text>
                              <View style={[s.roleBadge, { marginTop: 2 }]}>
                                <Text style={s.roleText}>{order.status}</Text>
                              </View>
                            </View>
                          </View>
                        ))
                      )}
                    </ScrollView>

                    {/* ── Send Targeted Notification ── */}
                    <Pressable
                      style={s.custNotifToggle}
                      onPress={() => setShowCustNotif(!showCustNotif)}
                    >
                      <Ionicons name={showCustNotif ? 'close-circle' : 'notifications'} size={18} color="#2E7D32" />
                      <Text style={s.custNotifToggleText}>
                        {showCustNotif ? 'Cancel' : `Send Notification to ${selectedCustomer?.name?.split(' ')[0] || 'User'}`}
                      </Text>
                    </Pressable>

                    {showCustNotif && (
                      <View style={s.custNotifForm}>
                        {/* Quick Actions */}
                        <Text style={s.custNotifQuickLabel}>Quick Templates</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                          <View style={{ flexDirection: 'row', gap: 6 }}>
                            {[
                              { label: '📱 Complete Profile', title: 'Complete Your Profile', body: 'Please add your phone number and address to your profile for faster deliveries!' },
                              { label: '🛒 Come Back!', title: 'We Miss You! 🍎', body: 'It\'s been a while! Check out our latest fresh arrivals and exclusive deals.' },
                              { label: '⭐ Leave Review', title: 'How Was Your Order?', body: 'We\'d love to hear your feedback! Rate your recent order to help us improve.' },
                              { label: '🎉 Special Offer', title: 'Special Offer Just For You!', body: 'We have an exclusive discount waiting for you. Open the app to claim it!' },
                            ].map((preset) => (
                              <Pressable
                                key={preset.label}
                                style={s.custNotifPreset}
                                onPress={() => {
                                  setCustNotifTitle(preset.title);
                                  setCustNotifBody(preset.body);
                                }}
                              >
                                <Text style={s.custNotifPresetText}>{preset.label}</Text>
                              </Pressable>
                            ))}
                          </View>
                        </ScrollView>

                        {/* Type selector */}
                        <View style={s.custNotifTypeRow}>
                          {(['system', 'promo', 'stock', 'reminder'] as const).map((t) => (
                            <Pressable
                              key={t}
                              style={[s.custNotifTypeChip, custNotifType === t && s.custNotifTypeChipActive]}
                              onPress={() => setCustNotifType(t)}
                            >
                              <Text style={[s.custNotifTypeChipText, custNotifType === t && s.custNotifTypeChipTextActive]}>
                                {t}
                              </Text>
                            </Pressable>
                          ))}
                        </View>

                        {/* Title & Body */}
                        <TextInput
                          style={s.custNotifInput}
                          placeholder="Notification title"
                          value={custNotifTitle}
                          onChangeText={setCustNotifTitle}
                          placeholderTextColor={d.textDim}
                        />
                        <TextInput
                          style={[s.custNotifInput, { minHeight: 70, textAlignVertical: 'top' }]}
                          placeholder="Message..."
                          value={custNotifBody}
                          onChangeText={setCustNotifBody}
                          multiline
                          placeholderTextColor={d.textDim}
                        />

                        {/* Send */}
                        <Pressable
                          style={[s.custNotifSendBtn, sendingCustNotif && { opacity: 0.6 }]}
                          disabled={sendingCustNotif}
                          onPress={async () => {
                            if (!custNotifTitle.trim() || !custNotifBody.trim()) {
                              showToast('Fill in title and message');
                              return;
                            }
                            if (!supabase || !selectedCustomer) return;
                            setSendingCustNotif(true);
                            try {
                              const iconMap = { promo: 'pricetag', stock: 'leaf', system: 'sparkles', reminder: 'notifications' };
                              await supabase.from('notifications').insert({
                                user_id: selectedCustomer.id,
                                title: custNotifTitle.trim(),
                                body: custNotifBody.trim(),
                                type: custNotifType,
                                icon: iconMap[custNotifType],
                              });
                              showToast(`Notification sent to ${selectedCustomer.name}! 🔔`);
                              setCustNotifTitle('');
                              setCustNotifBody('');
                              setShowCustNotif(false);
                            } catch {
                              showToast('Failed to send notification');
                            } finally {
                              setSendingCustNotif(false);
                            }
                          }}
                        >
                          {sendingCustNotif ? (
                            <ActivityIndicator size="small" color="#fff" />
                          ) : (
                            <>
                              <Ionicons name="send" size={16} color="#fff" />
                              <Text style={s.custNotifSendBtnText}>Send to {selectedCustomer?.name?.split(' ')[0]}</Text>
                            </>
                          )}
                        </Pressable>
                      </View>
                    )}

                    {/* Delete User */}
                    {selectedCustomer?.role !== 'admin' && (
                      <Pressable
                        style={s.custDeleteBtn}
                        onPress={() => handleDeleteCustomer(selectedCustomer)}
                      >
                        <Ionicons name="trash-outline" size={16} color="#C62828" />
                        <Text style={s.custDeleteBtnText}>Delete User</Text>
                      </Pressable>
                    )}

                    {/* Close */}
                    <Pressable
                      style={s.custModalClose}
                      onPress={() => {
                        setSelectedCustomer(null);
                        setCustomerOrders([]);
                        setShowCustNotif(false);
                        setCustNotifTitle('');
                        setCustNotifBody('');
                      }}
                    >
                      <Text style={s.custModalCloseText}>Close</Text>
                    </Pressable>
                  </View>
                </View>
              </Modal>
            </>
          )}

          {/* ═══ DELIVERY ═══ */}
          {activeTab === 'delivery' && (
            <>
              {/* Header + Add Button */}
              <View style={s.prodHeader}>
                <Text style={s.sectionSubtext}>{deliveryBoys.length} delivery partners</Text>
                <Pressable
                  style={s.addProdBtn}
                  onPress={() => {
                    setDf({ name: '', phone: '', area: '' });
                    setEditingDelivery(null);
                    setShowDeliveryForm(true);
                  }}
                >
                  <Ionicons name="add" size={18} color={colors.onPrimary} />
                  <Text style={s.addProdBtnText}>Add Partner</Text>
                </Pressable>
              </View>

              {/* Add/Edit Form */}
              {showDeliveryForm && (
                <View style={s.prodForm}>
                  <Text style={s.prodFormTitle}>{editingDelivery ? 'Edit Partner' : 'New Delivery Partner'}</Text>
                  <TextInput
                    style={s.prodFormInput}
                    placeholder="Full Name *"
                    value={df.name}
                    onChangeText={(v) => setDf({ ...df, name: v })}
                    placeholderTextColor={colors.outline}
                  />
                  <View style={s.prodFormRow}>
                    <TextInput
                      style={[s.prodFormInput, { flex: 1 }]}
                      placeholder="Phone Number"
                      value={df.phone}
                      onChangeText={(v) => setDf({ ...df, phone: v })}
                      keyboardType="phone-pad"
                      placeholderTextColor={colors.outline}
                    />
                    <TextInput
                      style={[s.prodFormInput, { flex: 1 }]}
                      placeholder="Service Area"
                      value={df.area}
                      onChangeText={(v) => setDf({ ...df, area: v })}
                      placeholderTextColor={colors.outline}
                    />
                  </View>
                  <View style={s.prodFormActions}>
                    <Pressable
                      style={s.prodFormCancel}
                      onPress={() => { setShowDeliveryForm(false); setEditingDelivery(null); }}
                    >
                      <Text style={s.prodFormCancelText}>Cancel</Text>
                    </Pressable>
                    <Pressable
                      style={s.prodFormSave}
                      onPress={async () => {
                        if (!df.name.trim()) { showToast('Name is required'); return; }
                        try {
                          if (editingDelivery) {
                            await updateDeliveryBoy(editingDelivery, {
                              name: df.name.trim(),
                              phone: df.phone.trim(),
                              area: df.area.trim(),
                            });
                            showToast('Partner updated ✓');
                          } else {
                            await addDeliveryBoy({
                              name: df.name.trim(),
                              phone: df.phone.trim(),
                              area: df.area.trim(),
                            });
                            showToast('Partner added ✓');
                          }
                          setShowDeliveryForm(false);
                          setEditingDelivery(null);
                          setDf({ name: '', phone: '', area: '' });
                        } catch { showToast('Failed to save'); }
                      }}
                    >
                      <Ionicons name="checkmark" size={18} color={colors.onPrimary} />
                      <Text style={s.prodFormSaveText}>{editingDelivery ? 'Update' : 'Add Partner'}</Text>
                    </Pressable>
                  </View>
                </View>
              )}

              {/* Delivery Partner List */}
              {deliveryBoys.length === 0 && !showDeliveryForm ? (
                <View style={s.emptySection}>
                  <Ionicons name="bicycle-outline" size={48} color={colors.outline} />
                  <Text style={s.emptyText}>No delivery partners added yet</Text>
                  <Text style={s.emptySubtext}>Tap "Add Partner" to get started</Text>
                </View>
              ) : (
                deliveryBoys.map((db) => (
                  <View key={db.id} style={s.deliveryCard}>
                    <View style={s.deliveryAvatar}>
                      <Ionicons name="person" size={20} color={colors.onPrimary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.deliveryName}>{db.name}</Text>
                      <Text style={s.deliveryMeta}>{db.phone || 'No phone'} · {db.area || 'No area'}</Text>
                      <Text style={s.deliveryTrips}>{db.deliveries} deliveries</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 6 }}>
                      {/* Status toggle */}
                      <Pressable
                        style={[s.deliveryStatusBtn,
                          db.status === 'available' ? s.dsAvailable :
                          db.status === 'busy' ? s.dsBusy : s.dsOffline]}
                        onPress={() => handleDeliveryStatus(db.id, db.status)}
                      >
                        <Text style={s.deliveryStatusText}>{db.status}</Text>
                      </Pressable>
                      {/* Edit + Delete */}
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <Pressable
                          onPress={() => {
                            setDf({ name: db.name, phone: db.phone, area: db.area });
                            setEditingDelivery(db.id);
                            setShowDeliveryForm(true);
                          }}
                        >
                          <Ionicons name="create-outline" size={18} color="#2E7D32" />
                        </Pressable>
                        <Pressable
                          onPress={async () => {
                            try {
                              await deleteDeliveryBoy(db.id);
                              showToast(`${db.name} removed`);
                            } catch (err: any) {
                              console.warn('Delete delivery boy error:', err);
                              showToast(err?.message || 'Failed to remove');
                            }
                          }}
                          style={{ padding: 4 }}
                        >
                          <Ionicons name="trash-outline" size={18} color="#C62828" />
                        </Pressable>
                      </View>
                    </View>
                  </View>
                ))
              )}
            </>
          )}

          {/* ═══ BULK & PACKS ═══ */}
          {activeTab === 'bulk' && (
            <>
              {/* Bulk Deals */}
              <View style={s.prodHeader}>
                <Text style={[s.sectionTitle, { color: d.text }]}>Bulk Deals</Text>
                <Pressable style={s.addProdBtn} onPress={() => { setEditingBulkDeal(null); setBf({ name: '', description: '', tiers: [{ qty: '', price: '', original: '' }] }); setShowBulkForm(true); }}>
                  <Ionicons name="add" size={18} color={colors.onPrimary} />
                  <Text style={s.addProdBtnText}>Add Deal</Text>
                </Pressable>
              </View>

              {showBulkForm && (
                <View style={[s.prodForm, editingBulkDeal && s.editForm]}>
                  {editingBulkDeal && <View style={s.editBadge}><Ionicons name="create" size={12} color="#fff" /><Text style={s.editBadgeText}>Editing</Text></View>}
                  <Text style={s.prodFormTitle}>{editingBulkDeal ? 'Edit Bulk Deal' : 'New Bulk Deal'}</Text>
                  <TextInput style={[s.prodFormInput, editingBulkDeal && s.editFormInput]} placeholder="Deal Name *" value={bf.name} onChangeText={(v) => setBf({...bf, name: v})} placeholderTextColor={colors.outline} />
                  <TextInput style={[s.prodFormInput, editingBulkDeal && s.editFormInput]} placeholder="Description" value={bf.description} onChangeText={(v) => setBf({...bf, description: v})} placeholderTextColor={colors.outline} />
                  <Text style={[s.sectionSubtext, { marginTop: 4 }]}>Tiers:</Text>
                  {bf.tiers.map((tier, i) => (
                    <View key={i} style={s.prodFormRow}>
                      <TextInput style={[s.prodFormInput, { flex: 1 }, editingBulkDeal && s.editFormInput]} placeholder="Qty (5 kg)" value={tier.qty} onChangeText={(v) => { const t = [...bf.tiers]; t[i] = {...t[i], qty: v}; setBf({...bf, tiers: t}); }} placeholderTextColor={colors.outline} />
                      <TextInput style={[s.prodFormInput, { flex: 1 }, editingBulkDeal && s.editFormInput]} placeholder="Price ₹" value={tier.price} onChangeText={(v) => { const t = [...bf.tiers]; t[i] = {...t[i], price: v}; setBf({...bf, tiers: t}); }} keyboardType="numeric" placeholderTextColor={colors.outline} />
                      <TextInput style={[s.prodFormInput, { flex: 1 }, editingBulkDeal && s.editFormInput]} placeholder="Original ₹" value={tier.original} onChangeText={(v) => { const t = [...bf.tiers]; t[i] = {...t[i], original: v}; setBf({...bf, tiers: t}); }} keyboardType="numeric" placeholderTextColor={colors.outline} />
                      {bf.tiers.length > 1 && (
                        <Pressable onPress={() => { const t = bf.tiers.filter((_, idx) => idx !== i); setBf({...bf, tiers: t}); }}>
                          <Ionicons name="close-circle" size={20} color={colors.error} />
                        </Pressable>
                      )}
                    </View>
                  ))}
                  <Pressable onPress={() => setBf({...bf, tiers: [...bf.tiers, { qty: '', price: '', original: '' }]})}>
                    <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 13 }}>+ Add Tier</Text>
                  </Pressable>
                  <View style={s.prodFormActions}>
                    <Pressable style={s.prodFormCancel} onPress={() => { setShowBulkForm(false); setEditingBulkDeal(null); }}>
                      <Text style={s.prodFormCancelText}>Cancel</Text>
                    </Pressable>
                    <Pressable style={s.prodFormSave} onPress={async () => {
                      if (!bf.name.trim() || !supabase) return;
                      try {
                        if (editingBulkDeal) {
                          // Update existing deal
                          await supabase.from('bulk_deals').update({ name: bf.name, description: bf.description }).eq('id', editingBulkDeal);
                          // Delete old tiers and re-insert
                          await supabase.from('bulk_tiers').delete().eq('deal_id', editingBulkDeal);
                          for (const tier of bf.tiers) {
                            if (tier.qty && tier.price) {
                              const save = tier.original ? `${Math.round((1 - parseInt(tier.price) / parseInt(tier.original)) * 100)}%` : '';
                              await supabase.from('bulk_tiers').insert({ deal_id: editingBulkDeal, qty: tier.qty, price: parseInt(tier.price), original: parseInt(tier.original) || parseInt(tier.price), save });
                            }
                          }
                          showToast('Deal updated ✓');
                        } else {
                          // Create new deal
                          const id = bf.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
                          await supabase.from('bulk_deals').insert({ id, name: bf.name, description: bf.description });
                          for (const tier of bf.tiers) {
                            if (tier.qty && tier.price) {
                              const save = tier.original ? `${Math.round((1 - parseInt(tier.price) / parseInt(tier.original)) * 100)}%` : '';
                              await supabase.from('bulk_tiers').insert({ deal_id: id, qty: tier.qty, price: parseInt(tier.price), original: parseInt(tier.original) || parseInt(tier.price), save });
                            }
                          }
                          showToast('Deal added ✓');
                        }
                        setShowBulkForm(false); setEditingBulkDeal(null); fetchBulkData();
                      } catch { showToast('Failed to save deal'); }
                    }}>
                      <Text style={s.prodFormSaveText}>{editingBulkDeal ? 'Save Changes' : 'Add Deal'}</Text>
                    </Pressable>
                  </View>
                </View>
              )}

              {bulkDeals.map((deal) => (
                <View key={deal.id} style={s.prodCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.prodName}>{deal.name}</Text>
                    <Text style={s.prodMeta}>{deal.description}</Text>
                    {deal.bulk_tiers?.map((tier: any, i: number) => (
                      <Text key={i} style={s.prodStock}>{tier.qty}: ₹{tier.price} (was ₹{tier.original}) — {tier.save}</Text>
                    ))}
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                    <Pressable style={[s.prodDeleteBtn, { backgroundColor: 'rgba(46, 125, 50, 0.15)' }]} onPress={() => {
                      setEditingBulkDeal(deal.id);
                      setBf({
                        name: deal.name || '',
                        description: deal.description || '',
                        tiers: deal.bulk_tiers?.length > 0
                          ? deal.bulk_tiers.map((t: any) => ({ qty: t.qty || '', price: String(t.price || ''), original: String(t.original || '') }))
                          : [{ qty: '', price: '', original: '' }],
                      });
                      setShowBulkForm(true);
                    }}>
                      <Ionicons name="create-outline" size={16} color={colors.primary} />
                    </Pressable>
                    <Pressable style={s.prodDeleteBtn} onPress={async () => {
                      if (!supabase) return;
                      await supabase.from('bulk_deals').delete().eq('id', deal.id);
                      fetchBulkData(); showToast('Deal deleted');
                    }}>
                      <Ionicons name="trash-outline" size={16} color={colors.error} />
                    </Pressable>
                  </View>
                </View>
              ))}
              {bulkDeals.length === 0 && <View style={s.emptySection}><Text style={s.emptyText}>No bulk deals</Text></View>}

              {/* Festival Packs */}
              <View style={[s.prodHeader, { marginTop: spacing.xl }]}>
                <Text style={[s.sectionTitle, { color: d.text }]}>Festival Packs</Text>
                <Pressable style={s.addProdBtn} onPress={() => { setEditingPack(null); setFpf({ name: '', description: '', price: '', original: '', items: [{ name: '', qty: '' }] }); setShowPackForm(true); }}>
                  <Ionicons name="add" size={18} color={colors.onPrimary} />
                  <Text style={s.addProdBtnText}>Add Pack</Text>
                </Pressable>
              </View>

              {showPackForm && (
                <View style={[s.prodForm, editingPack && s.editForm]}>
                  {editingPack && <View style={s.editBadge}><Ionicons name="create" size={12} color="#fff" /><Text style={s.editBadgeText}>Editing</Text></View>}
                  <Text style={s.prodFormTitle}>{editingPack ? 'Edit Festival Pack' : 'New Festival Pack'}</Text>
                  <TextInput style={[s.prodFormInput, editingPack && s.editFormInput]} placeholder="Pack Name *" value={fpf.name} onChangeText={(v) => setFpf({...fpf, name: v})} placeholderTextColor={colors.outline} />
                  <TextInput style={[s.prodFormInput, editingPack && s.editFormInput]} placeholder="Description" value={fpf.description} onChangeText={(v) => setFpf({...fpf, description: v})} placeholderTextColor={colors.outline} />
                  <View style={s.prodFormRow}>
                    <TextInput style={[s.prodFormInput, { flex: 1 }, editingPack && s.editFormInput]} placeholder="Price ₹" value={fpf.price} onChangeText={(v) => setFpf({...fpf, price: v})} keyboardType="numeric" placeholderTextColor={colors.outline} />
                    <TextInput style={[s.prodFormInput, { flex: 1 }, editingPack && s.editFormInput]} placeholder="Original ₹" value={fpf.original} onChangeText={(v) => setFpf({...fpf, original: v})} keyboardType="numeric" placeholderTextColor={colors.outline} />
                  </View>
                  <Text style={[s.sectionSubtext, { marginTop: 4 }]}>Items:</Text>
                  {fpf.items.map((item, i) => (
                    <View key={i} style={s.prodFormRow}>
                      <TextInput style={[s.prodFormInput, { flex: 1 }, editingPack && s.editFormInput]} placeholder="Fruit Name" value={item.name} onChangeText={(v) => { const items = [...fpf.items]; items[i] = {...items[i], name: v}; setFpf({...fpf, items}); }} placeholderTextColor={colors.outline} />
                      <TextInput style={[s.prodFormInput, { flex: 1 }, editingPack && s.editFormInput]} placeholder="Qty (2 kg)" value={item.qty} onChangeText={(v) => { const items = [...fpf.items]; items[i] = {...items[i], qty: v}; setFpf({...fpf, items}); }} placeholderTextColor={colors.outline} />
                      {fpf.items.length > 1 && (
                        <Pressable onPress={() => { const items = fpf.items.filter((_, idx) => idx !== i); setFpf({...fpf, items}); }}>
                          <Ionicons name="close-circle" size={20} color={colors.error} />
                        </Pressable>
                      )}
                    </View>
                  ))}
                  <Pressable onPress={() => setFpf({...fpf, items: [...fpf.items, { name: '', qty: '' }]})}>
                    <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 13 }}>+ Add Item</Text>
                  </Pressable>
                  <View style={s.prodFormActions}>
                    <Pressable style={s.prodFormCancel} onPress={() => { setShowPackForm(false); setEditingPack(null); }}>
                      <Text style={s.prodFormCancelText}>Cancel</Text>
                    </Pressable>
                    <Pressable style={s.prodFormSave} onPress={async () => {
                      if (!fpf.name.trim() || !supabase) return;
                      try {
                        if (editingPack) {
                          // Update existing pack
                          await supabase.from('festival_packs').update({ name: fpf.name, description: fpf.description, price: parseInt(fpf.price) || 0, original: parseInt(fpf.original) || 0 }).eq('id', editingPack);
                          // Delete old items and re-insert
                          await supabase.from('festival_pack_items').delete().eq('pack_id', editingPack);
                          for (const item of fpf.items) {
                            if (item.name && item.qty) {
                              await supabase.from('festival_pack_items').insert({ pack_id: editingPack, name: item.name, qty: item.qty });
                            }
                          }
                          showToast('Pack updated ✓');
                        } else {
                          // Create new pack
                          const id = fpf.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
                          await supabase.from('festival_packs').insert({ id, name: fpf.name, description: fpf.description, price: parseInt(fpf.price) || 0, original: parseInt(fpf.original) || 0 });
                          for (const item of fpf.items) {
                            if (item.name && item.qty) {
                              await supabase.from('festival_pack_items').insert({ pack_id: id, name: item.name, qty: item.qty });
                            }
                          }
                          showToast('Pack added ✓');
                        }
                        setShowPackForm(false); setEditingPack(null); fetchBulkData();
                      } catch { showToast('Failed to save pack'); }
                    }}>
                      <Text style={s.prodFormSaveText}>{editingPack ? 'Save Changes' : 'Add Pack'}</Text>
                    </Pressable>
                  </View>
                </View>
              )}

              {festivalPacks.map((pack) => (
                <View key={pack.id} style={s.prodCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.prodName}>{pack.name}</Text>
                    <Text style={s.prodMeta}>{pack.description}</Text>
                    <View style={s.prodStats}>
                      <Text style={s.prodPrice}>₹{pack.price}</Text>
                      <Text style={[s.prodStock, { textDecorationLine: 'line-through' }]}>₹{pack.original}</Text>
                    </View>
                    {pack.festival_pack_items?.map((item: any, i: number) => (
                      <Text key={i} style={s.prodStock}>• {item.name} — {item.qty}</Text>
                    ))}
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                    <Pressable style={[s.prodDeleteBtn, { backgroundColor: 'rgba(46, 125, 50, 0.15)' }]} onPress={() => {
                      setEditingPack(pack.id);
                      setFpf({
                        name: pack.name || '',
                        description: pack.description || '',
                        price: String(pack.price || ''),
                        original: String(pack.original || ''),
                        items: pack.festival_pack_items?.length > 0
                          ? pack.festival_pack_items.map((it: any) => ({ name: it.name || '', qty: it.qty || '' }))
                          : [{ name: '', qty: '' }],
                      });
                      setShowPackForm(true);
                    }}>
                      <Ionicons name="create-outline" size={16} color={colors.primary} />
                    </Pressable>
                    <Pressable style={s.prodDeleteBtn} onPress={async () => {
                      if (!supabase) return;
                      await supabase.from('festival_packs').delete().eq('id', pack.id);
                      fetchBulkData(); showToast('Pack deleted');
                    }}>
                      <Ionicons name="trash-outline" size={16} color={colors.error} />
                    </Pressable>
                  </View>
                </View>
              ))}
              {festivalPacks.length === 0 && <View style={s.emptySection}><Text style={s.emptyText}>No festival packs</Text></View>}
            </>
          )}

          {/* ═══ PROMOS / COUPONS ═══ */}
          {activeTab === 'promos' && (
            <>
              <View style={s.prodHeader}>
                <Text style={[s.sectionTitle, { color: d.text }]}>Promo Codes</Text>
                <Pressable
                  style={s.addProductBtn}
                  onPress={() => {
                    setEditingPromo(null);
                    setPrf({ code: '', type: 'percent', value: '', min_order: '0', max_discount: '0', max_uses: '0', valid_until: '' });
                    setShowPromoForm(true);
                  }}
                >
                  <Ionicons name="add" size={16} color="#fff" />
                  <Text style={s.addProductBtnText}>New Coupon</Text>
                </Pressable>
              </View>

              {showPromoForm && (
                <View style={s.formCard}>
                  <Text style={s.formTitle}>{editingPromo ? 'Edit Coupon' : 'Create Coupon'}</Text>

                  <Text style={[s.fieldLabel, { color: d.textMuted }]}>Code</Text>
                  <TextInput
                    style={s.fieldInput}
                    placeholder="e.g. FRESH20"
                    placeholderTextColor={d.textDim}
                    value={prf.code}
                    onChangeText={(v) => setPrf({ ...prf, code: v.toUpperCase() })}
                    autoCapitalize="characters"
                  />

                  <Text style={[s.fieldLabel, { color: d.textMuted }]}>Type</Text>
                  <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                    <Pressable
                      style={[s.promoTypeBtn, prf.type === 'percent' && s.promoTypeBtnActive]}
                      onPress={() => setPrf({ ...prf, type: 'percent' })}
                    >
                      <Text style={[s.promoTypeBtnText, prf.type === 'percent' && s.promoTypeBtnTextActive]}>% Percent</Text>
                    </Pressable>
                    <Pressable
                      style={[s.promoTypeBtn, prf.type === 'flat' && s.promoTypeBtnActive]}
                      onPress={() => setPrf({ ...prf, type: 'flat' })}
                    >
                      <Text style={[s.promoTypeBtnText, prf.type === 'flat' && s.promoTypeBtnTextActive]}>₹ Flat</Text>
                    </Pressable>
                  </View>

                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.fieldLabel, { color: d.textMuted }]}>{prf.type === 'percent' ? 'Discount %' : 'Discount ₹'}</Text>
                      <TextInput
                        style={s.fieldInput}
                        placeholder={prf.type === 'percent' ? '20' : '100'}
                        placeholderTextColor={d.textDim}
                        value={prf.value}
                        onChangeText={(v) => setPrf({ ...prf, value: v })}
                        keyboardType="numeric"
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.fieldLabel, { color: d.textMuted }]}>Min Order ₹</Text>
                      <TextInput
                        style={s.fieldInput}
                        placeholder="500"
                        placeholderTextColor={d.textDim}
                        value={prf.min_order}
                        onChangeText={(v) => setPrf({ ...prf, min_order: v })}
                        keyboardType="numeric"
                      />
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.fieldLabel, { color: d.textMuted }]}>Max Discount ₹</Text>
                      <TextInput
                        style={s.fieldInput}
                        placeholder="200 (0 = no cap)"
                        placeholderTextColor={d.textDim}
                        value={prf.max_discount}
                        onChangeText={(v) => setPrf({ ...prf, max_discount: v })}
                        keyboardType="numeric"
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.fieldLabel, { color: d.textMuted }]}>Max Uses</Text>
                      <TextInput
                        style={s.fieldInput}
                        placeholder="0 = unlimited"
                        placeholderTextColor={d.textDim}
                        value={prf.max_uses}
                        onChangeText={(v) => setPrf({ ...prf, max_uses: v })}
                        keyboardType="numeric"
                      />
                    </View>
                  </View>

                  <Text style={[s.fieldLabel, { color: d.textMuted }]}>Valid Until (optional)</Text>
                  <TextInput
                    style={s.fieldInput}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={d.textDim}
                    value={prf.valid_until}
                    onChangeText={(v) => setPrf({ ...prf, valid_until: v })}
                  />

                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                    <Pressable style={[s.saveBtn, { flex: 1 }]} onPress={savePromo} disabled={promoSaving}>
                      {promoSaving ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={s.saveBtnText}>{editingPromo ? 'Update' : 'Create'}</Text>
                      )}
                    </Pressable>
                    <Pressable
                      style={[s.cancelBtn, { flex: 1 }]}
                      onPress={() => { setShowPromoForm(false); setEditingPromo(null); }}
                    >
                      <Text style={s.cancelBtnText}>Cancel</Text>
                    </Pressable>
                  </View>
                </View>
              )}

              {coupons.length === 0 ? (
                <View style={s.emptySection}>
                  <Ionicons name="pricetag-outline" size={48} color={colors.outline} />
                  <Text style={s.emptyText}>No promo codes yet</Text>
                </View>
              ) : (
                coupons.map((c) => (
                  <View key={c.id} style={[s.orderCard, !c.active && { opacity: 0.6 }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <View style={[s.promoBadge, !c.active && { backgroundColor: 'rgba(200,50,50,0.1)' }]}>
                          <Text style={[s.promoBadgeText, !c.active && { color: '#C62828' }]}>
                            {c.active ? 'ACTIVE' : 'INACTIVE'}
                          </Text>
                        </View>
                        <Text style={s.promoCodeText}>{c.code}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        <Pressable style={s.promoActionBtn} onPress={() => togglePromoActive(c.id, c.active)}>
                          <Ionicons name={c.active ? 'pause' : 'play'} size={14} color={c.active ? '#E65100' : '#2E7D32'} />
                        </Pressable>
                        <Pressable
                          style={s.promoActionBtn}
                          onPress={() => {
                            setEditingPromo(c.id);
                            setPrf({
                              code: c.code, type: c.type, value: String(c.value),
                              min_order: String(c.min_order || 0), max_discount: String(c.max_discount || 0),
                              max_uses: String(c.max_uses || 0), valid_until: c.valid_until || '',
                            });
                            setShowPromoForm(true);
                          }}
                        >
                          <Ionicons name="create-outline" size={14} color={colors.primary} />
                        </Pressable>
                        <Pressable
                          style={s.promoActionBtn}
                          onPress={() => {
                            if (Platform.OS === 'web') {
                              if (confirm(`Delete coupon ${c.code}?`)) deletePromo(c.id);
                            } else {
                              Alert.alert('Delete', `Delete coupon ${c.code}?`, [
                                { text: 'Cancel', style: 'cancel' },
                                { text: 'Delete', style: 'destructive', onPress: () => deletePromo(c.id) },
                              ]);
                            }
                          }}
                        >
                          <Ionicons name="trash-outline" size={14} color="#C62828" />
                        </Pressable>
                      </View>
                    </View>

                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                      <View style={s.promoMeta}>
                        <Text style={s.promoMetaLabel}>Discount</Text>
                        <Text style={s.promoMetaValue}>{c.type === 'percent' ? `${c.value}%` : `₹${c.value}`}</Text>
                      </View>
                      <View style={s.promoMeta}>
                        <Text style={s.promoMetaLabel}>Min Order</Text>
                        <Text style={s.promoMetaValue}>₹{c.min_order || 0}</Text>
                      </View>
                      {c.type === 'percent' && c.max_discount > 0 && (
                        <View style={s.promoMeta}>
                          <Text style={s.promoMetaLabel}>Max Off</Text>
                          <Text style={s.promoMetaValue}>₹{c.max_discount}</Text>
                        </View>
                      )}
                      <View style={s.promoMeta}>
                        <Text style={s.promoMetaLabel}>Uses</Text>
                        <Text style={s.promoMetaValue}>{c.used_count || 0}{c.max_uses > 0 ? `/${c.max_uses}` : '/∞'}</Text>
                      </View>
                      {c.valid_until && (
                        <View style={s.promoMeta}>
                          <Text style={s.promoMetaLabel}>Expires</Text>
                          <Text style={s.promoMetaValue}>
                            {new Date(c.valid_until).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                ))
              )}
            </>
          )}

          {/* ═══ SUPPORT TICKETS ═══ */}
          {activeTab === 'support' && (() => {
            const filtered = supportFilter === 'all' ? supportTickets : supportTickets.filter((t) => t.status === supportFilter);

            return (
              <>
                <Text style={[s.sectionTitle, d.s.text]}>Support Tickets</Text>

                {/* Filters */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.lg, flexGrow: 0 }}>
                  {(['open', 'resolved', 'all'] as const).map((f) => (
                    <Pressable key={f} style={[s.filterChip, supportFilter === f && s.filterChipActive]} onPress={() => setSupportFilter(f)}>
                      <Text style={[s.filterChipText, supportFilter === f && s.filterChipTextActive]}>
                        {f === 'open' ? `Open (${supportTickets.filter((t) => t.status === 'open').length})` :
                         f === 'resolved' ? `Resolved (${supportTickets.filter((t) => t.status === 'resolved').length})` :
                         `All (${supportTickets.length})`}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>

                {filtered.length === 0 ? (
                  <View style={s.emptySection}>
                    <Ionicons name="chatbubbles-outline" size={48} color="rgba(27,60,18,0.15)" />
                    <Text style={s.emptyText}>No {supportFilter !== 'all' ? supportFilter : ''} tickets</Text>
                  </View>
                ) : (
                  filtered.map((ticket) => (
                    <View
                      key={ticket.id}
                      style={{
                        backgroundColor: colors.surfaceContainerLowest,
                        borderRadius: 16,
                        marginBottom: spacing.base,
                        borderWidth: selectedSupportTicket?.id === ticket.id ? 2 : 1,
                        borderColor: selectedSupportTicket?.id === ticket.id ? colors.primary : 'rgba(46, 125, 50, 0.15)',
                        overflow: 'hidden',
                      }}
                    >
                      {/* Header — pressable to expand/collapse */}
                      <Pressable
                        onPress={() => setSelectedSupportTicket(selectedSupportTicket?.id === ticket.id ? null : ticket)}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: spacing.lg }}
                      >
                        {/* Topic icon */}
                        <View style={{
                          width: 44, height: 44, borderRadius: 22,
                          backgroundColor: `${supportTopicColor(ticket.topic)}12`,
                          alignItems: 'center', justifyContent: 'center',
                          borderWidth: 1, borderColor: `${supportTopicColor(ticket.topic)}20`,
                        }}>
                          <Ionicons
                            name={ticket.topic === 'product' ? 'leaf' : ticket.topic === 'feedback' ? 'star' : 'chatbubble-ellipses'}
                            size={20} color={supportTopicColor(ticket.topic)}
                          />
                        </View>

                        {/* Info */}
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                            <Text style={{ fontSize: 15, fontWeight: '700', color: d.text }}>{ticket.user_name || 'User'}</Text>
                            <View style={{
                              backgroundColor: `${supportTopicColor(ticket.topic)}14`,
                              paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10,
                            }}>
                              <Text style={{ fontSize: 10, fontWeight: '700', color: supportTopicColor(ticket.topic), letterSpacing: 0.3 }}>
                                {supportTopicLabel(ticket.topic)}
                              </Text>
                            </View>
                          </View>
                          <Text style={{ fontSize: 12, color: colors.outline }}>
                            {supportFormatDate(ticket.updated_at || ticket.created_at)}
                          </Text>
                        </View>

                        {/* Status badge + chevron */}
                        <View style={{
                          backgroundColor: ticket.status === 'open' ? 'rgba(46,125,50,0.1)' : 'rgba(0,0,0,0.05)',
                          paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12,
                        }}>
                          <Text style={{
                            fontSize: 11, fontWeight: '700',
                            color: ticket.status === 'open' ? '#2E7D32' : '#888',
                          }}>
                            {ticket.status === 'open' ? '● Open' : '✓ Resolved'}
                          </Text>
                        </View>
                        <Ionicons
                          name={selectedSupportTicket?.id === ticket.id ? 'chevron-up' : 'chevron-down'}
                          size={18} color={colors.outline}
                        />
                      </Pressable>

                      {/* Expanded: messages + reply */}
                      {selectedSupportTicket?.id === ticket.id && (
                        <View style={{
                          borderTopWidth: 1, borderTopColor: 'rgba(46, 125, 50, 0.15)',
                          backgroundColor: 'rgba(46,125,50,0.02)',
                        }}>
                          {/* Messages area */}
                          <View style={{ maxHeight: 320, paddingHorizontal: spacing.lg, paddingTop: spacing.base }}>
                            <ScrollView showsVerticalScrollIndicator={false}>
                              {supportMessages.map((msg) => {
                                if (msg.sender === 'system') {
                                  return (
                                    <View key={msg.id} style={{
                                      alignSelf: 'center', marginVertical: 8,
                                      backgroundColor: 'rgba(46,125,50,0.06)',
                                      paddingHorizontal: 14, paddingVertical: 6, borderRadius: 12,
                                    }}>
                                      <Text style={{ fontSize: 11, color: 'rgba(27,60,18,0.5)', fontStyle: 'italic', textAlign: 'center' }}>
                                        {msg.text}
                                      </Text>
                                    </View>
                                  );
                                }
                                const isAdmin = msg.sender === 'admin';
                                return (
                                  <View key={msg.id} style={{
                                    alignSelf: isAdmin ? 'flex-end' : 'flex-start',
                                    maxWidth: '78%',
                                    backgroundColor: isAdmin ? '#2E7D32' : '#FFFFFF',
                                    borderRadius: 16,
                                    borderBottomRightRadius: isAdmin ? 4 : 16,
                                    borderBottomLeftRadius: isAdmin ? 16 : 4,
                                    padding: 12, marginBottom: 8,
                                    borderWidth: isAdmin ? 0 : 1,
                                    borderColor: 'rgba(46,125,50,0.1)',
                                    ...(isAdmin ? {} : {
                                      shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
                                      shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
                                    }),
                                  }}>
                                    {!isAdmin && (
                                      <Text style={{ fontSize: 10, fontWeight: '700', color: supportTopicColor(ticket.topic), marginBottom: 3 }}>
                                        {ticket.user_name || 'User'}
                                      </Text>
                                    )}
                                    <Text style={{ fontSize: 14, color: isAdmin ? '#fff' : '#2E4A26', lineHeight: 20 }}>
                                      {msg.text}
                                    </Text>
                                    <Text style={{
                                      fontSize: 10, marginTop: 4, alignSelf: 'flex-end',
                                      color: isAdmin ? 'rgba(255,255,255,0.6)' : 'rgba(27,60,18,0.35)',
                                    }}>
                                      {supportFormatDate(msg.created_at)}
                                    </Text>
                                  </View>
                                );
                              })}
                              {supportMessages.length === 0 && (
                                <View style={{ alignItems: 'center', paddingVertical: 30 }}>
                                  <Ionicons name="chatbubble-outline" size={32} color="rgba(27,60,18,0.12)" />
                                  <Text style={{ fontSize: 13, color: 'rgba(27,60,18,0.35)', marginTop: 8 }}>No messages yet</Text>
                                </View>
                              )}
                            </ScrollView>
                          </View>

                          {/* Reply input */}
                          <View style={{
                            flexDirection: 'row', alignItems: 'center', gap: 8,
                            paddingHorizontal: spacing.lg, paddingVertical: spacing.base,
                            borderTopWidth: 1, borderTopColor: 'rgba(46,125,50,0.06)',
                          }}>
                            <TextInput
                              style={{
                                flex: 1, backgroundColor: '#FFFFFF',
                                borderRadius: 24, paddingHorizontal: 16, paddingVertical: 10,
                                fontSize: 14, color: '#2E4A26',
                                borderWidth: 1, borderColor: 'rgba(46,125,50,0.12)',
                              }}
                              placeholder="Type admin reply..."
                              placeholderTextColor="rgba(27,60,18,0.3)"
                              value={supportReply}
                              onChangeText={setSupportReply}
                              onSubmitEditing={sendSupportReply}
                              returnKeyType="send"
                            />
                            <Pressable
                              onPress={sendSupportReply}
                              style={{
                                width: 42, height: 42, borderRadius: 21,
                                backgroundColor: '#2E7D32',
                                alignItems: 'center', justifyContent: 'center',
                              }}
                            >
                              <Ionicons name="send" size={18} color="#fff" />
                            </Pressable>
                          </View>

                          {/* Resolve / Reopen button */}
                          <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.lg }}>
                            <Pressable
                              onPress={() => ticket.status === 'open' ? resolveSupportTicket(ticket.id) : reopenSupportTicket(ticket.id)}
                              style={{
                                flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                                paddingVertical: 12, borderRadius: 14,
                                backgroundColor: ticket.status === 'open' ? 'rgba(67,160,71,0.1)' : 'rgba(255,152,0,0.1)',
                                borderWidth: 1,
                                borderColor: ticket.status === 'open' ? 'rgba(67,160,71,0.2)' : 'rgba(255,152,0,0.2)',
                              }}
                            >
                              <Ionicons
                                name={ticket.status === 'open' ? 'checkmark-circle' : 'refresh'}
                                size={18}
                                color={ticket.status === 'open' ? '#43A047' : '#FF9800'}
                              />
                              <Text style={{
                                fontSize: 13, fontWeight: '700',
                                color: ticket.status === 'open' ? '#43A047' : '#FF9800',
                              }}>
                                {ticket.status === 'open' ? 'Mark as Resolved' : 'Reopen Ticket'}
                              </Text>
                            </Pressable>
                          </View>
                        </View>
                      )}
                    </View>
                  ))
                )}
              </>
            );
          })()}

          {/* ═══ ABOUT EDITOR ═══ */}
          {activeTab === 'about' && (() => {
            const ABOUT_DEFAULTS = {
              brand_desc: 'We believe everyone deserves fruit that tastes like it was just picked. No wax, no gas ripening, no cold storage for months \u2014 just real, honest produce from people who care.',
              promise_text: 'If any fruit doesn\'t meet your expectations, we\'ll replace it or refund you \u2014 no questions asked. That\'s how confident we are in our supply chain.',
              support_email: 'support@nutriva.in',
            };
            const POLICY_SECTIONS = [
              { key: 'privacy_policy', title: 'Privacy Policy', icon: 'lock-closed' as const },
              { key: 'terms_of_service', title: 'Terms of Service', icon: 'document-text' as const },
              { key: 'refund_policy', title: 'Refund & Cancellation', icon: 'refresh' as const },
              { key: 'shipping_policy', title: 'Shipping & Delivery', icon: 'car' as const },
            ];
            const ab = { ...ABOUT_DEFAULTS, ...aboutData };
            const eI = { fontSize: 14, color: '#2E4A26', borderWidth: 1.5, borderColor: 'rgba(46,125,50,0.25)', borderStyle: 'dashed' as const, borderRadius: 10, padding: 10, backgroundColor: 'rgba(255,255,255,0.9)' };
            const stats = getAboutStats();
            const steps = getAboutSteps();

            return (
              <>
                {/* Edit mode banner */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(46, 125, 50, 0.15)', padding: 12, borderRadius: 14, marginBottom: spacing.lg, borderWidth: 1, borderColor: 'rgba(46,125,50,0.15)' }}>
                  <Ionicons name="create" size={18} color={colors.primary} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#1B3C12' }}>Editing About Page</Text>
                    <Text style={{ fontSize: 11, color: 'rgba(27,60,18,0.5)' }}>Tap any text to edit. Changes save to database.</Text>
                  </View>
                </View>

                {/* ─── Hero Section ─── */}
                <View style={{ alignItems: 'center', marginBottom: spacing['2xl'] }}>
                  <View style={{ position: 'relative', marginBottom: spacing.lg }}>
                    <View style={{ position: 'absolute', width: 88, height: 88, borderRadius: 44, backgroundColor: 'rgba(46,125,50,0.15)', top: -4, left: -4 }} />
                    <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#2E7D32', alignItems: 'center', justifyContent: 'center' }}>
                      <Ionicons name="leaf" size={36} color="#fff" />
                    </View>
                  </View>
                  <Text style={{ fontSize: 36, fontWeight: '800', letterSpacing: -1.5, color: '#2E7D32' }}>Nutriva</Text>
                  <Text style={{ fontSize: 14, color: 'rgba(27,60,18,0.6)', fontStyle: 'italic', letterSpacing: 1, marginTop: 2 }}>The Editorial Orchard</Text>
                  <TextInput
                    style={[eI, { textAlign: 'center', marginTop: spacing.lg, minHeight: 60 }]}
                    multiline
                    value={ab.brand_desc}
                    onChangeText={(v) => setAboutData({...aboutData, brand_desc: v})}
                    placeholder="Brand description..."
                    placeholderTextColor={colors.outline}
                  />
                </View>

                {/* ─── Stats (editable) ─── */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.base }}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: '#1B3C12' }}>Stats</Text>
                  <Pressable onPress={() => setAboutStats([...stats, { num: '0', label: 'Label', icon: '\u2b50' }])} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primary, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14 }}>
                    <Ionicons name="add" size={14} color="#fff" />
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#fff' }}>Add</Text>
                  </Pressable>
                </View>
                <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing['2xl'], flexWrap: 'wrap' }}>
                  {stats.map((stat: any, i: number) => (
                    <View key={i} style={{ flex: 1, minWidth: 70, alignItems: 'center', paddingVertical: 10, paddingHorizontal: 4, backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(46,125,50,0.12)', position: 'relative' }}>
                      {stats.length > 1 && (
                        <Pressable onPress={() => setAboutStats(stats.filter((_: any, idx: number) => idx !== i))} style={{ position: 'absolute', top: -6, right: -6, zIndex: 1, width: 22, height: 22, borderRadius: 11, backgroundColor: colors.error, alignItems: 'center', justifyContent: 'center' }}>
                          <Ionicons name="close" size={12} color="#fff" />
                        </Pressable>
                      )}
                      <TextInput style={[eI, { fontSize: 18, padding: 2, textAlign: 'center', width: '90%', marginBottom: 4 }]} value={stat.icon} onChangeText={(v) => { const s = [...stats]; s[i] = { ...s[i], icon: v }; setAboutStats(s); }} placeholder="\ud83c\udf33" placeholderTextColor={colors.outline} />
                      <TextInput style={[eI, { fontSize: 16, fontWeight: '800', color: '#2E7D32', padding: 2, textAlign: 'center', width: '90%', marginBottom: 2 }]} value={stat.num} onChangeText={(v) => { const s = [...stats]; s[i] = { ...s[i], num: v }; setAboutStats(s); }} placeholder="50+" placeholderTextColor={colors.outline} />
                      <TextInput style={[eI, { fontSize: 9, padding: 2, textAlign: 'center', width: '90%' }]} value={stat.label} onChangeText={(v) => { const s = [...stats]; s[i] = { ...s[i], label: v }; setAboutStats(s); }} placeholder="Label" placeholderTextColor={colors.outline} multiline />
                    </View>
                  ))}
                </View>

                {/* ─── How We Work (editable) ─── */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg }}>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: '#1B3C12' }}>How We Work</Text>
                  <Pressable onPress={() => setAboutSteps([...steps, { name: 'New Step', desc: 'Description...', icon: 'star' }])} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primary, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14 }}>
                    <Ionicons name="add" size={14} color="#fff" />
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#fff' }}>Add Step</Text>
                  </Pressable>
                </View>
                {steps.map((item: any, i: number) => (
                  <View key={i} style={{ flexDirection: 'row', gap: 14, marginBottom: spacing.lg, backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 16, padding: spacing.lg, borderWidth: 1, borderColor: 'rgba(46,125,50,0.12)', position: 'relative' }}>
                    {steps.length > 1 && (
                      <Pressable onPress={() => setAboutSteps(steps.filter((_: any, idx: number) => idx !== i))} style={{ position: 'absolute', top: -6, right: -6, zIndex: 1, width: 24, height: 24, borderRadius: 12, backgroundColor: colors.error, alignItems: 'center', justifyContent: 'center' }}>
                        <Ionicons name="close" size={14} color="#fff" />
                      </Pressable>
                    )}
                    <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#2E7D32', alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ color: '#fff', fontSize: 14, fontWeight: '800' }}>{i + 1}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <TextInput style={[eI, { fontSize: 15, fontWeight: '700', marginBottom: 6 }]} value={item.name} onChangeText={(v) => { const s = [...steps]; s[i] = { ...s[i], name: v }; setAboutSteps(s); }} placeholder="Step title" placeholderTextColor={colors.outline} />
                      <TextInput style={[eI, { fontSize: 13, minHeight: 40, textAlignVertical: 'top' }]} multiline value={item.desc} onChangeText={(v) => { const s = [...steps]; s[i] = { ...s[i], desc: v }; setAboutSteps(s); }} placeholder="Description..." placeholderTextColor={colors.outline} />
                    </View>
                  </View>
                ))}

                {/* ─── Promise Card ─── */}
                <View style={{ alignItems: 'center', padding: spacing.xl, marginBottom: spacing['2xl'], backgroundColor: 'rgba(27,60,18,0.6)', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(129,199,132,0.25)' }}>
                  <Text style={{ fontSize: 32, marginBottom: spacing.sm }}>{'\ud83e\udd1d'}</Text>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: '#FFFFFF', marginBottom: 8 }}>The Nutriva Promise</Text>
                  <TextInput
                    style={[eI, { textAlign: 'center', color: '#fff', backgroundColor: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.4)', minHeight: 50 }]}
                    multiline
                    value={ab.promise_text}
                    onChangeText={(v) => setAboutData({...aboutData, promise_text: v})}
                    placeholder="Promise text..."
                    placeholderTextColor="rgba(255,255,255,0.5)"
                  />
                </View>

                {/* ─── Support Email ─── */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: spacing.xl, padding: spacing.lg, backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(46,125,50,0.12)' }}>
                  <Ionicons name="mail-outline" size={20} color="#2E7D32" />
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#2E4A26' }}>Support Email:</Text>
                  <TextInput
                    style={[eI, { flex: 1, fontSize: 13, padding: 8 }]}
                    value={ab.support_email}
                    onChangeText={(v) => setAboutData({...aboutData, support_email: v})}
                    placeholder="support@nutriva.in"
                    placeholderTextColor={colors.outline}
                    keyboardType="email-address"
                  />
                </View>

                {/* ─── Policy Sections ─── */}
                <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: spacing.lg, color: '#1B3C12' }}>Policies & Legal</Text>
                {POLICY_SECTIONS.map((pol) => (
                  <View key={pol.key} style={{ marginBottom: spacing.xl }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: spacing.base }}>
                      <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(46, 125, 50, 0.15)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(129,199,132,0.2)' }}>
                        <Ionicons name={pol.icon} size={20} color="#2E7D32" />
                      </View>
                      <Text style={{ fontSize: 17, fontWeight: '700', color: '#1B3C12' }}>{pol.title}</Text>
                    </View>
                    <Text style={{ fontSize: 11, color: 'rgba(27,60,18,0.45)', marginBottom: 8 }}>One point per line \u2014 each line becomes a separate card for users.</Text>
                    <TextInput
                      style={[eI, { minHeight: 140, textAlignVertical: 'top', lineHeight: 22 }]}
                      multiline
                      value={aboutData[pol.key] || ''}
                      onChangeText={(v) => setAboutData({...aboutData, [pol.key]: v})}
                      placeholder={`Enter ${pol.title.toLowerCase()} points, one per line...`}
                      placeholderTextColor={colors.outline}
                    />
                  </View>
                ))}

                {/* ─── Floating Save ─── */}
                <Pressable
                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#2E7D32', paddingVertical: 16, borderRadius: radius.full, marginBottom: spacing.xl, shadowColor: '#1B5E20', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 }}
                  onPress={async () => {
                    setAboutSaving(true);
                    try {
                      const keys = Object.keys(aboutData);
                      for (const key of keys) {
                        await saveAboutField(key, aboutData[key]);
                      }
                      showToast('About page updated \u2713');
                    } catch {
                      showToast('Failed to save \u2014 check if app_config table exists');
                    } finally {
                      setAboutSaving(false);
                    }
                  }}
                >
                  {aboutSaving ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={20} color="#fff" />
                      <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Save All Changes</Text>
                    </>
                  )}
                </Pressable>
              </>
            );
          })()}

          <View style={{ height: 60 }} />
        </ScrollView>
      )}
    </View>
  );
}

// ═══════════════ STYLES ═══════════════
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.base,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.base, paddingTop: 48,
    backgroundColor: colors.surfaceContainerLowest,
  },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surfaceContainerLow, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  headerSub: { fontSize: 12, color: colors.outline },
  onlineStatus: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  onlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.secondary },
  onlineText: { fontSize: 12, color: colors.secondary, fontWeight: '600' },
  // Tab bar
  tabBar: { flexGrow: 0, flexShrink: 0, backgroundColor: colors.surfaceContainerLowest, borderBottomWidth: 1, borderBottomColor: colors.surfaceContainer },
  tabBarContent: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, gap: spacing.sm },
  tab: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 14, borderRadius: radius.full, backgroundColor: colors.surfaceContainerHigh, minWidth: 100 },
  tabActive: { backgroundColor: colors.primary },
  tabText: { fontSize: 12, fontWeight: '600', color: colors.onSurfaceVariant },
  tabTextActive: { color: colors.onPrimary },
  // Loading
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.base },
  loadingText: { fontSize: 14, color: colors.outline },
  content: { padding: spacing.lg, paddingBottom: 80 },
  // KPIs
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.base, marginBottom: spacing.lg },
  kpiCard: { width: '47%', borderRadius: radius.lg, padding: spacing.lg, gap: 4 },
  kpiLabel: { fontSize: 11, color: colors.outline, marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  kpiValue: { fontSize: 24, fontWeight: '800' },
  pendingBanner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: '#FFF3E0', borderRadius: radius.md, padding: spacing.base, marginBottom: spacing.xl },
  pendingText: { flex: 1, fontSize: 13, fontWeight: '600', color: '#E65100' },
  pendingLink: { fontSize: 13, fontWeight: '700', color: colors.primary },
  // Section
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: spacing.base, marginTop: spacing.sm },
  sectionSubtext: { fontSize: 13, color: colors.outline, marginBottom: spacing.lg },
  // Order row (dashboard)
  orderRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.surfaceContainer },
  orderRowId: { fontSize: 14, fontWeight: '600' },
  orderRowMeta: { fontSize: 12, color: colors.outline, marginTop: 2 },
  // Status badge
  statusBadge: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: radius.full },
  statusPending: { backgroundColor: '#FFF3E0' },
  statusDone: { backgroundColor: '#2E4A26' },
  statusText: { fontSize: 11, fontWeight: '600', color: '#E65100' },
  statusTextDone: { color: colors.secondary },
  // Filter bar
  filterBar: { marginBottom: spacing.base, maxHeight: 44 },
  filterChip: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: radius.full, backgroundColor: colors.surfaceContainerHigh, marginRight: spacing.sm },
  filterChipActive: { backgroundColor: colors.primary },
  filterChipText: { fontSize: 12, fontWeight: '500', color: colors.onSurfaceVariant },
  filterChipTextActive: { color: colors.onPrimary },
  // Order card
  orderCard: { backgroundColor: colors.surfaceContainerLowest, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.base },
  orderCardTop: { flexDirection: 'row', marginBottom: spacing.base },
  orderCardId: { fontSize: 15, fontWeight: '700' },
  orderCardCustomer: { fontSize: 13, color: colors.outline, marginTop: 2 },
  orderCardItems: { fontSize: 12, color: colors.onSurfaceVariant, marginTop: 4 },
  orderCardTotal: { fontSize: 16, fontWeight: '700' },
  orderCardDate: { fontSize: 11, color: colors.outline, marginTop: 2 },
  orderActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderTopWidth: 1, borderTopColor: colors.surfaceContainer, paddingTop: spacing.base },
  statusPill: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: radius.full, backgroundColor: colors.surfaceContainerHigh, marginRight: 4 },
  statusPillActive: { backgroundColor: colors.primary },
  statusPillText: { fontSize: 10, fontWeight: '600', color: colors.outline },
  statusPillTextActive: { color: colors.onPrimary },
  chatLink: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surfaceContainerLow, alignItems: 'center', justifyContent: 'center', overflow: 'visible' as any },
  chatBadge: { position: 'absolute' as const, top: -2, right: -2, width: 12, height: 12, borderRadius: 6, backgroundColor: '#EF5350', borderWidth: 2, borderColor: colors.surfaceContainerLow },
  // Products
  prodCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.base, backgroundColor: colors.surfaceContainerLowest, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.base },
  prodCardInactive: { opacity: 0.5 },
  prodName: { fontSize: 15, fontWeight: '600' },
  prodMeta: { fontSize: 12, color: colors.outline, marginTop: 2 },
  prodStats: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, marginTop: 6 },
  prodPrice: { fontSize: 14, fontWeight: '700', color: colors.primary },
  prodStock: { fontSize: 12, color: colors.outline },
  priceEditRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  priceInput: { width: 80, borderWidth: 1, borderColor: colors.primary, borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 4, fontSize: 14 },
  toggleBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  toggleActive: { backgroundColor: 'rgba(30,142,62,0.1)' },
  toggleInactive: { backgroundColor: colors.surfaceContainerHigh },
  // Product form & actions
  prodHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.base },
  addProdBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primary, paddingVertical: 8, paddingHorizontal: 16, borderRadius: radius.full },
  addProdBtnText: { color: colors.onPrimary, fontSize: 13, fontWeight: '600' },
  prodForm: { backgroundColor: colors.surfaceContainerLowest, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.xl, borderWidth: 2, borderColor: colors.primaryFixedDim },
  editForm: { backgroundColor: '#f0f9f0', borderColor: '#2E7D32', borderWidth: 2, borderLeftWidth: 5, borderLeftColor: '#2E7D32', shadowColor: '#2E7D32', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 4 },
  editFormInput: { backgroundColor: '#ffffff', borderWidth: 1.5, borderColor: 'rgba(46,125,50,0.3)' },
  editBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 4, backgroundColor: '#2E7D32', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginBottom: 10 },
  editBadgeText: { fontSize: 11, fontWeight: '700', color: '#ffffff', letterSpacing: 0.5 },
  prodFormTitle: { fontSize: 16, fontWeight: '700', marginBottom: spacing.base },
  prodFormRow: { flexDirection: 'row', gap: spacing.sm },
  prodFormInput: { backgroundColor: colors.surfaceContainerHigh, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: colors.onSurface, marginBottom: spacing.sm },
  prodFormActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.sm },
  prodFormCancel: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: radius.full, backgroundColor: colors.surfaceContainerHigh },
  prodFormCancelText: { fontSize: 13, fontWeight: '600', color: colors.onSurfaceVariant },
  prodFormSave: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 20, borderRadius: radius.full, backgroundColor: colors.primary },
  prodFormSaveText: { fontSize: 13, fontWeight: '600', color: colors.onPrimary },
  prodActions: { gap: 8, alignItems: 'center' },
  prodEditBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(27,60,18,0.08)', alignItems: 'center', justifyContent: 'center' },
  prodDeleteBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(186,26,26,0.08)', alignItems: 'center', justifyContent: 'center' },
  prodTag: { paddingVertical: 2, paddingHorizontal: 8, borderRadius: radius.full, backgroundColor: 'rgba(27,60,18,0.08)' },
  prodTagText: { fontSize: 9, fontWeight: '700', color: colors.primary, textTransform: 'uppercase' },
  prodBadgeRow: { flexDirection: 'row', gap: spacing.sm, marginTop: 8 },
  prodBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 10, borderRadius: radius.full, borderWidth: 1, borderColor: colors.outline },
  prodBadgeActive: { backgroundColor: '#E65100', borderColor: '#E65100' },
  prodBadgeActive2: { backgroundColor: '#6A1B9A', borderColor: '#6A1B9A' },
  prodBadgeText: { fontSize: 10, fontWeight: '600', color: colors.outline },
  prodBadgeTextActive: { color: '#fff' },
  // Customers
  custSearchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.lg, paddingHorizontal: 14, paddingVertical: 10,
    marginBottom: spacing.base, borderWidth: 1, borderColor: 'rgba(46, 125, 50, 0.15)',
  },
  custSearchInput: {
    flex: 1, fontSize: 14, color: colors.onSurface,
    paddingVertical: 0,
  },
  custCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.base, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.surfaceContainerHigh },
  custAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primaryContainer, alignItems: 'center', justifyContent: 'center' },
  custAvatarImg: { width: 40, height: 40, borderRadius: 20 },
  custAvatarText: { fontSize: 16, fontWeight: '700', color: colors.onPrimary },
  custName: { fontSize: 14, fontWeight: '600' },
  custEmail: { fontSize: 12, color: colors.outline, marginTop: 2 },
  custOrders: { fontSize: 12, fontWeight: '600', color: colors.primary },
  custSpent: { fontSize: 11, color: colors.outline },
  // Customer Detail Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  custModal: {
    backgroundColor: '#F5F7F5', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '85%', paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.xl,
  },
  custModalHeader: {
    alignItems: 'center', paddingBottom: spacing.lg,
    borderBottomWidth: 1, borderBottomColor: 'rgba(46, 125, 50, 0.15)',
  },
  custModalAvatar: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: 'rgba(46,125,50,0.4)', alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  custModalAvatarText: { fontSize: 26, fontWeight: '700', color: '#fff' },
  custModalAvatarImg: {
    width: 64, height: 64, borderRadius: 32,
    marginBottom: spacing.sm, borderWidth: 2, borderColor: 'rgba(46,125,50,0.15)',
  },
  custModalName: { fontSize: 20, fontWeight: '700', color: '#1B3C12' },
  custModalSection: {
    fontSize: 13, fontWeight: '700', color: 'rgba(27,60,18,0.45)',
    textTransform: 'uppercase', letterSpacing: 0.5,
    marginTop: spacing.lg, marginBottom: spacing.sm,
  },
  custModalCard: {
    backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: 14,
    padding: spacing.base, borderWidth: 1, borderColor: 'rgba(46, 125, 50, 0.15)',
  },
  custModalRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6,
  },
  custModalLabel: { fontSize: 13, color: 'rgba(27,60,18,0.45)', fontWeight: '500', width: 60 },
  custModalValue: { fontSize: 13, fontWeight: '600', color: '#2E4A26' },
  custModalDivider: { height: 1, backgroundColor: 'rgba(46,125,50,0.06)', marginVertical: 2 },
  custModalStatsRow: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 8 },
  custModalStat: { alignItems: 'center' },
  custModalStatVal: { fontSize: 16, fontWeight: '700', color: '#2E7D32' },
  custModalStatLabel: { fontSize: 11, color: 'rgba(27,60,18,0.4)', marginTop: 2 },
  custModalOrderCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: 12,
    padding: spacing.base, marginBottom: spacing.sm,
    borderWidth: 1, borderColor: 'rgba(46,125,50,0.06)',
  },
  custModalClose: {
    backgroundColor: '#2E7D32', paddingVertical: 14, borderRadius: 999,
    alignItems: 'center', marginTop: spacing.lg,
  },
  custModalCloseText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  custDeleteBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, borderRadius: 999, marginTop: spacing.base,
    backgroundColor: 'rgba(198,40,40,0.06)',
    borderWidth: 1, borderColor: 'rgba(198,40,40,0.2)',
  },
  custDeleteBtnText: { color: '#C62828', fontSize: 14, fontWeight: '700' },
  // Targeted Notification in Customer Modal
  custNotifToggle: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 12, borderRadius: 14, marginTop: spacing.base,
    backgroundColor: 'rgba(46, 125, 50, 0.15)', borderWidth: 1, borderColor: 'rgba(46,125,50,0.12)',
  },
  custNotifToggleText: { fontSize: 13, fontWeight: '600', color: '#2E7D32' },
  custNotifForm: {
    backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 14, padding: spacing.base,
    marginTop: spacing.sm, borderWidth: 1, borderColor: 'rgba(46, 125, 50, 0.15)',
  },
  custNotifQuickLabel: {
    fontSize: 11, fontWeight: '700', color: 'rgba(27,60,18,0.4)',
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6,
  },
  custNotifPreset: {
    paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999,
    backgroundColor: 'rgba(46,125,50,0.06)', borderWidth: 1, borderColor: 'rgba(46,125,50,0.1)',
  },
  custNotifPresetText: { fontSize: 11, fontWeight: '600', color: '#2E4A26' },
  custNotifTypeRow: { flexDirection: 'row', gap: 6, marginBottom: spacing.sm },
  custNotifTypeChip: {
    paddingVertical: 5, paddingHorizontal: 12, borderRadius: 999,
    backgroundColor: 'rgba(46,125,50,0.06)',
  },
  custNotifTypeChipActive: { backgroundColor: '#2E7D32' },
  custNotifTypeChipText: { fontSize: 11, fontWeight: '600', color: '#2E4A26', textTransform: 'capitalize' },
  custNotifTypeChipTextActive: { color: '#fff' },
  custNotifInput: {
    backgroundColor: 'rgba(245,247,245,0.8)', borderRadius: 10, paddingHorizontal: 12,
    paddingVertical: 10, fontSize: 13, color: '#1B3C12', marginBottom: 8,
    borderWidth: 1, borderColor: 'rgba(46,125,50,0.06)',
  },
  custNotifSendBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#2E7D32', paddingVertical: 12, borderRadius: 999,
  },
  custNotifSendBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  roleBadge: { paddingVertical: 2, paddingHorizontal: 8, borderRadius: radius.full, backgroundColor: colors.surfaceContainerHigh, marginTop: 4 },
  roleBadgeAdmin: { backgroundColor: 'rgba(0,110,28,0.1)' },
  roleText: { fontSize: 9, fontWeight: '700', color: colors.outline, textTransform: 'uppercase' },
  roleTextAdmin: { color: colors.secondary },
  // Delivery
  deliveryCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.base, backgroundColor: colors.surfaceContainerLowest, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.base },
  deliveryAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primaryContainer, alignItems: 'center', justifyContent: 'center' },
  deliveryName: { fontSize: 14, fontWeight: '600' },
  deliveryMeta: { fontSize: 12, color: colors.outline, marginTop: 2 },
  deliveryTrips: { fontSize: 11, color: colors.onSurfaceVariant, marginTop: 2 },
  deliveryStatusBtn: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: radius.full },
  dsAvailable: { backgroundColor: '#2E4A26' },
  dsBusy: { backgroundColor: '#FFF3E0' },
  dsOffline: { backgroundColor: colors.surfaceContainerHigh },
  deliveryStatusText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  // Delivery Assignment in Orders
  deliveryAssignSection: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(46,125,50,0.06)',
    marginTop: 8,
  },
  deliveryAssignedRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  deliveryAssignedBadge: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: '#2E7D32', alignItems: 'center', justifyContent: 'center',
  },
  deliveryAssignedName: { fontSize: 12, fontWeight: '600', color: '#1B3C12' },
  deliveryUnassignBtn: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: 'rgba(198,40,40,0.08)',
    alignItems: 'center', justifyContent: 'center', marginLeft: 'auto',
  },
  deliveryPickBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingVertical: 4, paddingHorizontal: 10,
    backgroundColor: 'rgba(46,125,50,0.06)', borderRadius: 999,
    borderWidth: 1, borderColor: 'rgba(46,125,50,0.1)',
  },
  deliveryPickText: { fontSize: 10, fontWeight: '600', color: '#2E7D32' },
  // Empty
  // Order Detail Modal
  odSection: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.base,
    borderWidth: 1, borderColor: 'rgba(46,125,50,0.06)',
  },
  odSectionTitle: { fontSize: 13, fontWeight: '700', color: colors.onSurface, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  odRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.03)' },
  odLabel: { fontSize: 12, color: colors.outline, fontWeight: '500' },
  odValue: { fontSize: 13, color: colors.onSurface, fontWeight: '500' },
  odItemRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.03)' },
  odItemImg: { width: 36, height: 36, borderRadius: 8 },
  odItemName: { fontSize: 13, fontWeight: '600', color: colors.onSurface },
  odItemQty: { fontSize: 11, color: colors.outline },
  odItemPrice: { fontSize: 13, fontWeight: '700', color: colors.onSurface },
  // Empty
  emptySection: { alignItems: 'center', paddingVertical: spacing['4xl'], gap: spacing.sm },
  emptyText: { fontSize: 14, fontWeight: '600', color: colors.outline },
  emptySubtext: { fontSize: 12, color: colors.outline },
  // Denied
  denied: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing['2xl'] },
  deniedTitle: { fontSize: 20, fontWeight: '700', marginTop: spacing.lg },
  deniedDesc: { fontSize: 14, color: colors.outline, marginTop: 4, textAlign: 'center', marginBottom: spacing.xl },
  primaryBtn: { backgroundColor: colors.primary, paddingVertical: 14, paddingHorizontal: 24, borderRadius: radius.full },
  primaryBtnText: { color: colors.onPrimary, fontWeight: '600', fontSize: 14 },
  // Notification sender
  notifSendBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.tertiary || '#6A1B9A', paddingVertical: 12, borderRadius: radius.full, marginBottom: spacing.base },
  notifSendBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  notifForm: { backgroundColor: colors.surfaceContainerLowest, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.xl },
  notifTypeRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.base },
  notifTypeChip: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: radius.full, backgroundColor: colors.surfaceContainerHigh },
  notifTypeChipActive: { backgroundColor: colors.primary },
  notifTypeChipText: { fontSize: 12, fontWeight: '600', color: colors.onSurfaceVariant },
  notifTypeChipTextActive: { color: colors.onPrimary },
  notifInput: { backgroundColor: colors.surfaceContainerHigh, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: 12, fontSize: 14, color: colors.onSurface, marginBottom: spacing.sm },
  notifSendAction: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.primary, paddingVertical: 12, borderRadius: radius.full, marginTop: spacing.sm },
  notifSendActionText: { color: colors.onPrimary, fontWeight: '600', fontSize: 13 },
  // Product image
  imageUrlSection: { marginTop: spacing.sm, marginBottom: spacing.sm },
  imageUrlLabel: { fontSize: 13, fontWeight: '600', color: colors.onSurfaceVariant, marginBottom: 6 },
  imagePreview: { position: 'relative', alignItems: 'center', backgroundColor: colors.surfaceContainer, borderRadius: radius.lg, padding: spacing.base },
  imagePreviewImg: { width: 120, height: 120, borderRadius: radius.md },
  imageRemoveBtn: { position: 'absolute', top: 6, right: 6 },
  imagePlaceholder: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xl, backgroundColor: colors.surfaceContainer, borderRadius: radius.lg, borderWidth: 2, borderStyle: 'dashed', borderColor: colors.outlineVariant, marginTop: spacing.sm },
  imagePlaceholderText: { fontSize: 12, color: colors.outline, marginTop: 6 },
  imageActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  imageUploadBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#1565C0', paddingVertical: 10, paddingHorizontal: 16, borderRadius: radius.full },
  imageUploadBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  imageOrText: { fontSize: 12, color: colors.outline, fontWeight: '500' },
  // Promo styles
  promoTypeBtn: { flex: 1, paddingVertical: 10, borderRadius: radius.md, backgroundColor: 'rgba(46,125,50,0.06)', alignItems: 'center' },
  promoTypeBtnActive: { backgroundColor: colors.primary },
  promoTypeBtnText: { fontSize: 13, fontWeight: '600', color: colors.onSurfaceVariant },
  promoTypeBtnTextActive: { color: '#fff' },
  promoBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full, backgroundColor: 'rgba(46,125,50,0.1)' },
  promoBadgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5, color: '#2E7D32' },
  promoCodeText: { fontSize: 16, fontWeight: '700', color: colors.onSurface, letterSpacing: 1 },
  promoActionBtn: { width: 32, height: 32, borderRadius: radius.full, backgroundColor: 'rgba(46,125,50,0.06)', alignItems: 'center', justifyContent: 'center' },
  promoMeta: { minWidth: 70 },
  promoMetaLabel: { fontSize: 11, color: colors.outline, marginBottom: 2 },
  promoMetaValue: { fontSize: 14, fontWeight: '600', color: colors.onSurface },
});
