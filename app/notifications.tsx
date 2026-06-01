/**
 * Fresh — Notifications Screen
 * Fetches real notifications from Supabase + real-time subscription
 */

import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, Pressable, Switch,
  StyleSheet, SectionList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius } from '../src/theme';
import { useAuthStore } from '../src/stores/authStore';
import { useUIStore } from '../src/stores/uiStore';
import { supabase } from '../src/api/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFS_KEY = 'fresh-notif-prefs';

interface AppNotification {
  id: string;
  title: string;
  body: string;
  type: string;
  icon: string;
  read: boolean;
  created_at: string;
}

interface NotifPrefs {
  orderUpdates: boolean;
  promotions: boolean;
  newArrivals: boolean;
  deliveryAlerts: boolean;
  weeklyDigest: boolean;
}

const DEFAULT_PREFS: NotifPrefs = {
  orderUpdates: true,
  promotions: true,
  newArrivals: true,
  deliveryAlerts: true,
  weeklyDigest: false,
};

const PREF_ITEMS: { key: keyof NotifPrefs; label: string; desc: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'orderUpdates', label: 'Order Updates', desc: 'Status changes, confirmations, delivery', icon: 'receipt-outline' },
  { key: 'deliveryAlerts', label: 'Delivery Alerts', desc: 'Driver assigned, out for delivery, arrived', icon: 'bicycle-outline' },
  { key: 'promotions', label: 'Offers & Deals', desc: 'Flash sales, bulk discounts, festival packs', icon: 'pricetag-outline' },
  { key: 'newArrivals', label: 'New Arrivals', desc: 'Seasonal fruits and fresh imports', icon: 'leaf-outline' },
  { key: 'weeklyDigest', label: 'Weekly Digest', desc: 'Summary of your orders and savings', icon: 'calendar-outline' },
];

const ICON_CONFIG: Record<string, { icon: string; color: string; bg: string }> = {
  order: { icon: 'receipt', color: colors.primary, bg: 'rgba(27,60,18,0.1)' },
  promo: { icon: 'pricetag', color: '#E65100', bg: 'rgba(230,81,0,0.1)' },
  stock: { icon: 'leaf', color: colors.secondary, bg: 'rgba(30,142,62,0.1)' },
  system: { icon: 'sparkles', color: '#00838F', bg: 'rgba(0,131,143,0.1)' },
};

type ViewMode = 'notifications' | 'preferences';

export default function NotificationsScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const showToast = useUIStore((s) => s.showToast);

  const [viewMode, setViewMode] = useState<ViewMode>('notifications');
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [prefs, setPrefs] = useState<NotifPrefs>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);

  // Load notifications from Supabase
  useEffect(() => {
    if (!user?.id || !supabase) return;
    fetchNotifications();
    loadPrefs();

    // Real-time subscription
    const channel = supabase
      .channel('user-notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
      }, (payload) => {
        const n = payload.new as AppNotification;
        // Only add if it's for this user or broadcast
        if (!n.user_id || n.user_id === user.id) {
          setNotifications((prev) => [n, ...prev]);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  const fetchNotifications = async () => {
    if (!supabase || !user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .or(`user_id.eq.${user.id},user_id.is.null`)
        .order('created_at', { ascending: false })
        .limit(50);
      if (!error && data) setNotifications(data);
    } catch {}
    setLoading(false);
  };

  const loadPrefs = async () => {
    try {
      const stored = await AsyncStorage.getItem(PREFS_KEY);
      if (stored) setPrefs(JSON.parse(stored));
    } catch {}
  };

  const savePrefs = async (updated: NotifPrefs) => {
    setPrefs(updated);
    await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(updated));
  };

  const togglePref = (key: keyof NotifPrefs) => {
    savePrefs({ ...prefs, [key]: !prefs[key] });
  };

  const markAllRead = async () => {
    if (!supabase || !user) return;
    try {
      await supabase
        .from('notifications')
        .update({ read: true })
        .or(`user_id.eq.${user.id},user_id.is.null`);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      showToast('All marked as read ✓');
    } catch {}
  };

  const markRead = async (id: string) => {
    if (!supabase) return;
    try {
      await supabase.from('notifications').update({ read: true }).eq('id', id);
      setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
    } catch {}
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Time formatting
  const fmtTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const diff = now.getTime() - d.getTime();
      const mins = Math.floor(diff / 60000);
      if (mins < 1) return 'Just now';
      if (mins < 60) return `${mins}m ago`;
      const hrs = Math.floor(mins / 60);
      if (hrs < 24) return `${hrs}h ago`;
      const days = Math.floor(hrs / 24);
      if (days === 1) return 'Yesterday';
      if (days < 7) return `${days}d ago`;
      return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    } catch { return ''; }
  };

  // Section data
  const todayNotifs = notifications.filter((n) => {
    const t = fmtTime(n.created_at);
    return t.includes('now') || t.includes('m ago') || t.includes('h ago');
  });
  const olderNotifs = notifications.filter((n) => !todayNotifs.includes(n));
  const sections = [
    ...(todayNotifs.length > 0 ? [{ title: 'Today', data: todayNotifs }] : []),
    ...(olderNotifs.length > 0 ? [{ title: 'Earlier', data: olderNotifs }] : []),
  ];

  return (
    <View style={st.container}>
      {/* Header */}
      <View style={st.header}>
        <Pressable style={st.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#1B3C12" />
        </Pressable>
        <Text style={st.headerTitle}>Notifications</Text>
        {unreadCount > 0 && (
          <View style={st.unreadBadge}>
            <Text style={st.unreadBadgeText}>{unreadCount}</Text>
          </View>
        )}
        <View style={{ flex: 1 }} />
        <Pressable style={st.refreshBtn} onPress={fetchNotifications}>
          <Ionicons name="refresh" size={18} color="rgba(27, 60, 18, 0.4)" />
        </Pressable>
      </View>

      {/* Tab Pills */}
      <View style={st.tabRow}>
        <Pressable style={[st.tabPill, viewMode === 'notifications' && st.tabPillActive]}
          onPress={() => setViewMode('notifications')}>
          <Text style={[st.tabPillText, viewMode === 'notifications' && st.tabPillTextActive]}>Activity</Text>
        </Pressable>
        <Pressable style={[st.tabPill, viewMode === 'preferences' && st.tabPillActive]}
          onPress={() => setViewMode('preferences')}>
          <Text style={[st.tabPillText, viewMode === 'preferences' && st.tabPillTextActive]}>Preferences</Text>
        </Pressable>
      </View>

      {/* ── Notifications ── */}
      {viewMode === 'notifications' && (
        <>
          {unreadCount > 0 && (
            <Pressable style={st.markAllBtn} onPress={markAllRead}>
              <Ionicons name="checkmark-done" size={16} color="#2E7D32" />
              <Text style={st.markAllText}>Mark all as read</Text>
            </Pressable>
          )}

          {notifications.length === 0 ? (
            <View style={st.empty}>
              <Ionicons name="notifications-off-outline" size={56} color="rgba(27, 60, 18, 0.25)" />
              <Text style={st.emptyTitle}>No notifications yet</Text>
              <Text style={st.emptyDesc}>Order updates and offers will appear here</Text>
            </View>
          ) : (
            <SectionList
              sections={sections}
              keyExtractor={(item) => item.id}
              renderSectionHeader={({ section }) => (
                <View style={st.sectionHeader}><Text style={st.sectionTitle}>{section.title}</Text></View>
              )}
              renderItem={({ item }) => {
                const cfg = ICON_CONFIG[item.type] || ICON_CONFIG.system;
                return (
                  <Pressable style={[st.notifCard, !item.read && st.notifCardUnread]}
                    onPress={() => markRead(item.id)}>
                    <View style={[st.notifIcon, { backgroundColor: cfg.bg }]}>
                      <Ionicons name={(item.icon || cfg.icon) as any} size={20} color={cfg.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[st.notifTitle, !item.read && st.notifTitleUnread]}>{item.title}</Text>
                      <Text style={st.notifBody} numberOfLines={2}>{item.body}</Text>
                    </View>
                    <View style={st.notifMeta}>
                      <Text style={st.notifTime}>{fmtTime(item.created_at)}</Text>
                      {!item.read && <View style={st.notifDot} />}
                    </View>
                  </Pressable>
                );
              }}
              contentContainerStyle={st.listContent}
              showsVerticalScrollIndicator={false}
            />
          )}
        </>
      )}

      {/* ── Preferences ── */}
      {viewMode === 'preferences' && (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={st.prefsContent}>
          <Text style={st.prefsIntro}>Choose what you'd like to be notified about</Text>
          {PREF_ITEMS.map((pref) => (
            <View key={pref.key} style={st.prefRow}>
              <View style={st.prefIconWrap}>
                <Ionicons name={pref.icon as any} size={20} color="rgba(27, 60, 18, 0.4)" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={st.prefLabel}>{pref.label}</Text>
                <Text style={st.prefDesc}>{pref.desc}</Text>
              </View>
              <Switch value={prefs[pref.key]} onValueChange={() => togglePref(pref.key)}
                trackColor={{ false: 'rgba(46, 125, 50, 0.06)', true: 'rgba(46, 125, 50, 0.22)' }}
                thumbColor={prefs[pref.key] ? '#43A047' : 'rgba(27, 60, 18, 0.35)'} />
            </View>
          ))}
          <View style={st.prefNote}>
            <Ionicons name="information-circle-outline" size={16} color="rgba(27, 60, 18, 0.5)" />
            <Text style={st.prefNoteText}>Critical order updates are always sent regardless of preferences.</Text>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7F5' },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.base, paddingHorizontal: spacing.lg, paddingVertical: spacing.base, paddingTop: 48, backgroundColor: 'rgba(255, 255, 255, 0.9)', borderBottomWidth: 1, borderBottomColor: 'rgba(46, 125, 50, 0.08)' },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(46, 125, 50, 0.06)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(46, 125, 50, 0.10)' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1B3C12' },
  unreadBadge: { minWidth: 20, height: 20, borderRadius: 10, backgroundColor: '#EF5350', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  unreadBadgeText: { fontSize: 10, fontWeight: '700', color: '#fff' },
  refreshBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(46, 125, 50, 0.06)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(46, 125, 50, 0.08)' },
  tabRow: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.base, backgroundColor: 'rgba(255, 255, 255, 0.9)' },
  tabPill: { paddingVertical: 8, paddingHorizontal: 20, borderRadius: radius.full, backgroundColor: 'rgba(46, 125, 50, 0.05)', borderWidth: 1, borderColor: 'rgba(46, 125, 50, 0.06)' },
  tabPillActive: { backgroundColor: '#2E7D32', borderColor: 'rgba(46, 125, 50, 0.18)' },
  tabPillText: { fontSize: 13, fontWeight: '600', color: 'rgba(27, 60, 18, 0.5)' },
  tabPillTextActive: { color: '#FFFFFF' },
  markAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, alignSelf: 'flex-end' },
  markAllText: { fontSize: 13, fontWeight: '500', color: '#2E7D32' },
  listContent: { paddingBottom: 40 },
  sectionHeader: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.sm },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: 'rgba(27, 60, 18, 0.35)', textTransform: 'uppercase', letterSpacing: 0.5 },
  notifCard: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.base, paddingHorizontal: spacing.lg, paddingVertical: spacing.base, borderBottomWidth: 1, borderBottomColor: 'rgba(46, 125, 50, 0.06)' },
  notifCardUnread: { backgroundColor: 'rgba(46, 125, 50, 0.04)' },
  notifIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  notifTitle: { fontSize: 14, fontWeight: '500', color: '#2E4A26' },
  notifTitleUnread: { fontWeight: '700' },
  notifBody: { fontSize: 12, color: 'rgba(27, 60, 18, 0.5)', marginTop: 2, lineHeight: 17 },
  notifMeta: { alignItems: 'flex-end', gap: 6, paddingTop: 2 },
  notifTime: { fontSize: 11, color: 'rgba(27, 60, 18, 0.35)' },
  notifDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#43A047' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: spacing['4xl'] },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginTop: spacing.lg, color: '#1B3C12' },
  emptyDesc: { fontSize: 13, color: 'rgba(27, 60, 18, 0.5)', marginTop: 4, textAlign: 'center' },
  prefsContent: { padding: spacing.lg },
  prefsIntro: { fontSize: 14, color: 'rgba(27, 60, 18, 0.5)', marginBottom: spacing.xl },
  prefRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.base, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(46, 125, 50, 0.06)' },
  prefIconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(46, 125, 50, 0.05)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(46, 125, 50, 0.08)' },
  prefLabel: { fontSize: 14, fontWeight: '600', color: '#2E4A26' },
  prefDesc: { fontSize: 11, color: 'rgba(27, 60, 18, 0.5)', marginTop: 2 },
  prefNote: { flexDirection: 'row', gap: spacing.base, alignItems: 'flex-start', marginTop: spacing['2xl'], paddingVertical: spacing.base },
  prefNoteText: { flex: 1, fontSize: 12, color: 'rgba(27, 60, 18, 0.5)', lineHeight: 17 },
});
