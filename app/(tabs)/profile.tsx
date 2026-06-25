/**
 * Fresh — Profile Screen
 */

import { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Alert, Platform, Animated, Image, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius } from '../../src/theme';
import { useDynamic } from '../../src/hooks/useDynamic';
import { useThemeStore } from '../../src/stores/themeStore';
import { useAuthStore } from '../../src/stores/authStore';
import { useUIStore } from '../../src/stores/uiStore';
import { useOrderStore } from '../../src/stores/orderStore';
import { useWishlistStore } from '../../src/stores/wishlistStore';
import { useHeroEntrance, useStaggerEntrance } from '../../src/utils/animations';
import { supabase } from '../../src/api/supabase';
import { getLocale, setLocale, useT } from '../../src/i18n';

const menuItems = [
  { icon: 'person-circle-outline' as const, labelKey: 'profile.my_account', route: '/account' },
  { icon: 'receipt-outline' as const, labelKey: 'orders.title', route: '/(tabs)/orders' },
  { icon: 'location-outline' as const, labelKey: 'profile.addresses', route: '/addresses' },
  { icon: 'card-outline' as const, labelKey: 'common.save', route: null },
  { icon: 'notifications-outline' as const, labelKey: 'profile.notifications', route: '/notifications' },
  { icon: 'chatbubble-outline' as const, labelKey: 'profile.support', route: '/support' },
  { icon: 'information-circle-outline' as const, labelKey: 'profile.about', route: '/about' },
];

export default function ProfileScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const showToast = useUIStore((s) => s.showToast);
  const orders = useOrderStore((s) => s.orders);
  const fetchOrders = useOrderStore((s) => s.fetchOrders);
  const wishlistCount = useWishlistStore((s) => s.items.length);
  const d = useDynamic();
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [currentLocale, setCurrentLocale] = useState(getLocale());
  const t = useT();

  // Animations — MUST be called before any early return
  const headerAnim = useHeroEntrance();
  const menuAnims = useStaggerEntrance(menuItems.length + 2, 60);

  // Fetch orders for real stats
  useEffect(() => {
    if (user?.id) fetchOrders(user.id);
  }, [user?.id]);

  // Fetch profile picture
  useEffect(() => {
    if (!user?.id || !supabase) return;
    const fetchAvatar = async () => {
      try {
        const { data, error } = await supabase.storage
          .from('avatars')
          .createSignedUrl(`${user.id}/avatar.jpg`, 3600);
        if (!error && data?.signedUrl) {
          setAvatarUrl(data.signedUrl);
        }
      } catch {
        // No avatar yet
      }
    };
    fetchAvatar();
  }, [user?.id]);

  // Fetch unread notification count + realtime subscription
  useEffect(() => {
    if (!user?.id || !supabase) return;

    const fetchCount = async () => {
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .or(`user_id.eq.${user.id},user_id.is.null`)
        .eq('read', false);
      setUnreadNotifCount(count || 0);
    };
    fetchCount();

    // Listen for new notifications in real-time
    const channel = supabase
      .channel('profile-notif-badge')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'notifications',
      }, () => {
        fetchCount();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  if (!isAuthenticated || !user) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: d.bg }]}>
        <Ionicons name="person-circle-outline" size={64} color={d.textMuted} />
        <Text style={[styles.emptyTitle, { color: d.text }]}>{t('profile.sign_in_desc')}</Text>
        <Text style={[styles.emptyDesc, { color: d.textMuted }]}>{t('profile.sign_in_sub')}</Text>
        <Pressable
          style={styles.primaryBtn}
          onPress={() => router.push('/(auth)/login')}
        >
          <Text style={styles.primaryBtnText}>{t('profile.sign_in')}</Text>
        </Pressable>
      </View>
    );
  }

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (e) {
      // ignore — clear state anyway
    }
    router.replace('/(auth)/login');
  };

  const handleMenuPress = (item: typeof menuItems[0]) => {


    if (item.route) {
      router.push(item.route as any);
    } else {
      showToast(`${item.label} — Coming soon! 🚧`);
    }
  };

  const initial = (user.name || 'U').charAt(0).toUpperCase();

  // Compute stats from real orders
  const orderCount = orders.length;
  const totalSpent = orders.reduce((sum, o) => sum + (o.total || 0), 0);
  const spentDisplay = totalSpent >= 1000 ? `₹${(totalSpent / 1000).toFixed(1)}k` : `₹${totalSpent}`;

  // Dynamic theme colors
  const bg = d.bg;
  const textPrimary = d.text;
  const textSecondary = d.textMuted;
  const textMuted = d.textDim;
  const borderColor = d.border;
  const accentColor = d.accent;
  const menuTextColor = d.textSecondary;
  const isDark = d.isDark;

  return (
    <ScrollView style={[styles.container, { backgroundColor: bg }]} showsVerticalScrollIndicator={false}>
      {/* Profile Header */}
      <Animated.View style={[styles.header, headerAnim]}>
        <Pressable onPress={() => router.push('/account' as any)}>
          {avatarUrl ? (
            <Image
              source={{ uri: avatarUrl }}
              style={styles.avatarImg}
              onError={() => setAvatarUrl(null)}
            />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initial}</Text>
            </View>
          )}
        </Pressable>
        <Text style={[styles.name, { color: textPrimary }]}>{user.name}</Text>
        <View style={[styles.roleBadge, user.role === 'admin' && styles.roleBadgeAdmin]}>
          <Ionicons
            name={user.role === 'admin' ? 'shield-checkmark' : 'person'}
            size={14}
            color={user.role === 'admin' ? colors.secondary : colors.outline}
          />
          <Text style={[styles.roleText, user.role === 'admin' && styles.roleTextAdmin]}>
            {user.role === 'admin' ? t('profile.admin') : t('profile.user')}
          </Text>
        </View>
        <Text style={[styles.memberSince, { color: textMuted }]}>
          {t('profile.member_since')} {new Date(user.created_at).getFullYear()}
        </Text>
        <Pressable style={styles.editProfileBtn} onPress={() => router.push('/account' as any)}>
          <Ionicons name="create-outline" size={14} color="#2E7D32" />
          <Text style={styles.editProfileText}>{t('profile.edit_profile')}</Text>
        </Pressable>
      </Animated.View>

      {/* Stats */}
      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={[styles.statVal, { color: accentColor }]}>{orderCount}</Text>
          <Text style={[styles.statLabel, { color: textSecondary }]}>{t('profile.orders_stat')}</Text>
        </View>
        <View style={styles.stat}>
          <Text style={[styles.statVal, { color: accentColor }]}>{spentDisplay}</Text>
          <Text style={[styles.statLabel, { color: textSecondary }]}>{t('profile.spent_stat')}</Text>
        </View>
        <View style={styles.stat}>
          <Text style={[styles.statVal, { color: accentColor }]}>{wishlistCount}</Text>
          <Text style={[styles.statLabel, { color: textSecondary }]}>{t('profile.favourites_stat')}</Text>
        </View>
      </View>

      {/* Settings Section */}
      <View style={styles.settingsSection}>
        <Text style={[styles.settingsSectionTitle, { color: textSecondary }]}>{t('profile.settings')}</Text>

        {/* Dark Mode */}
        <View style={[styles.settingsRow, { borderBottomColor: borderColor }]}>
          <Ionicons name={isDark ? 'moon' : 'sunny-outline'} size={20} color={isDark ? '#FFB74D' : 'rgba(27,60,18,0.4)'} />
          <Text style={[styles.settingsLabel, { color: menuTextColor }]}>{t('profile.dark_mode')}</Text>
          <Switch
            value={isDark}
            onValueChange={toggleTheme}
            trackColor={{ false: 'rgba(46,125,50,0.06)', true: 'rgba(46,125,50,0.22)' }}
            thumbColor={isDark ? '#43A047' : 'rgba(27,60,18,0.35)'}
          />
        </View>

        {/* Language */}
        <View style={[styles.settingsRow, { borderBottomColor: borderColor }]}>
          <Ionicons name="language-outline" size={20} color={isDark ? '#81C784' : 'rgba(27,60,18,0.4)'} />
          <Text style={[styles.settingsLabel, { color: menuTextColor }]}>{t('profile.language')}</Text>
          <View style={styles.langToggle}>
            <Pressable
              style={[styles.langBtn, currentLocale === 'en' && styles.langBtnActive]}
              onPress={() => { setLocale('en'); setCurrentLocale('en'); showToast('Language changed to English'); }}
            >
              <Text style={[styles.langBtnText, currentLocale === 'en' && styles.langBtnTextActive]}>EN</Text>
            </Pressable>
            <Pressable
              style={[styles.langBtn, currentLocale === 'hi' && styles.langBtnActive]}
              onPress={() => { setLocale('hi'); setCurrentLocale('hi'); showToast('भाषा हिंदी में बदली गई'); }}
            >
              <Text style={[styles.langBtnText, currentLocale === 'hi' && styles.langBtnTextActive]}>हि</Text>
            </Pressable>
          </View>
        </View>

        {/* Wishlist */}
        <Pressable style={[styles.settingsRow, { borderBottomColor: borderColor }]} onPress={() => router.push('/wishlist' as any)}>
          <Ionicons name="heart-outline" size={20} color="#EF5350" />
          <Text style={[styles.settingsLabel, { color: menuTextColor }]}>{t('profile.wishlist')}</Text>
          {wishlistCount > 0 && (
            <View style={styles.wishlistBadge}>
              <Text style={styles.wishlistBadgeText}>{wishlistCount}</Text>
            </View>
          )}
          <Ionicons name="chevron-forward" size={18} color="rgba(129,199,132,0.25)" />
        </Pressable>
      </View>

      {/* Menu */}
      <View style={styles.menu}>
        {/* Admin Dashboard entry (only for admins) */}
        {user.role === 'admin' && (
          <Animated.View style={menuAnims[0] || {}}>
          <Pressable
            style={[styles.menuItem, styles.menuItemAdmin]}
            onPress={() => router.push('/admin' as any)}
          >
            <Ionicons name="settings" size={22} color={colors.secondary} />
            <Text style={[styles.menuLabel, { color: colors.secondary }]}>Admin Dashboard</Text>
            <View style={styles.newBadge}>
              <Text style={styles.newBadgeText}>NEW</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.outlineVariant} />
          </Pressable>
          </Animated.View>
        )}

        {menuItems.map((item, idx) => (
          <Animated.View key={item.labelKey} style={menuAnims[idx + 1] || {}}>
          <Pressable
            style={styles.menuItem}
            onPress={() => handleMenuPress(item)}
          >
            <Ionicons name={item.icon} size={22} color={d.textMuted} />
            <Text style={[styles.menuLabel, { color: menuTextColor }]}>{t(item.labelKey)}</Text>
            {item.labelKey === 'profile.notifications' && unreadNotifCount > 0 && (
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeText}>{unreadNotifCount > 99 ? '99+' : unreadNotifCount}</Text>
              </View>
            )}
            {!item.route && item.labelKey !== 'profile.about' && (
              <View style={styles.soonBadge}>
                <Text style={styles.soonBadgeText}>SOON</Text>
              </View>
            )}
            <Ionicons name="chevron-forward" size={18} color="rgba(129,199,132,0.25)" />
          </Pressable>
          </Animated.View>
        ))}

        {/* Sign Out */}
        <Animated.View style={menuAnims[menuItems.length + 1] || {}}>
        <Pressable style={[styles.menuItem, styles.menuItemLogout]} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={22} color="#E53935" />
          <Text style={[styles.menuLabel, { color: '#E53935' }]}>{t('profile.sign_out')}</Text>
          <Ionicons name="chevron-forward" size={18} color="rgba(129,199,132,0.25)" />
        </Pressable>
        </Animated.View>
      </View>

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7F5' },
  // Header
  header: { alignItems: 'center', paddingTop: 48, paddingBottom: spacing.xl },
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(46, 125, 50, 0.4)', alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.base,
    borderWidth: 1.5, borderColor: 'rgba(46, 125, 50, 0.18)',
  },
  avatarText: { fontSize: 28, fontWeight: '700', color: '#FFFFFF' },
  name: { fontSize: 24, fontWeight: '700', letterSpacing: -0.5, color: '#1B3C12' },
  roleBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(46, 125, 50, 0.05)', paddingVertical: 4, paddingHorizontal: 12,
    borderRadius: radius.full, marginTop: spacing.sm,
    borderWidth: 1, borderColor: 'rgba(46, 125, 50, 0.06)',
  },
  roleBadgeAdmin: { backgroundColor: 'rgba(76, 175, 80, 0.15)', borderColor: 'rgba(129, 199, 132, 0.25)' },
  roleText: { fontSize: 12, fontWeight: '600', color: 'rgba(27, 60, 18, 0.5)' },
  roleTextAdmin: { color: '#43A047' },
  memberSince: { fontSize: 13, color: 'rgba(27, 60, 18, 0.35)', marginTop: spacing.sm },
  avatarImg: {
    width: 72, height: 72, borderRadius: 36,
    marginBottom: spacing.base,
    borderWidth: 1.5, borderColor: 'rgba(46, 125, 50, 0.18)',
  },
  editProfileBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    marginTop: spacing.sm, paddingVertical: 6, paddingHorizontal: 14,
    backgroundColor: 'rgba(46, 125, 50, 0.06)', borderRadius: radius.full,
    borderWidth: 1, borderColor: 'rgba(46, 125, 50, 0.1)',
  },
  editProfileText: { fontSize: 12, fontWeight: '600', color: '#2E7D32' },
  // Stats
  stats: {
    flexDirection: 'row', justifyContent: 'space-around',
    paddingHorizontal: spacing.lg, marginBottom: spacing['2xl'],
  },
  stat: { alignItems: 'center' },
  statVal: { fontSize: 20, fontWeight: '700', color: '#2E7D32' },
  statLabel: { fontSize: 12, color: 'rgba(27, 60, 18, 0.5)', marginTop: 2 },
  // Menu
  menu: { paddingHorizontal: spacing.lg },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.base,
    paddingVertical: 16, borderBottomWidth: 1,
    borderBottomColor: 'rgba(46, 125, 50, 0.06)',
  },
  menuLabel: { flex: 1, fontSize: 15, fontWeight: '500' },
  menuItemAdmin: { borderBottomColor: 'rgba(129, 199, 132, 0.2)' },
  menuItemLogout: { borderBottomWidth: 0, marginTop: spacing.base },
  newBadge: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)', paddingVertical: 2, paddingHorizontal: 6,
    borderRadius: radius.full, borderWidth: 1, borderColor: 'rgba(46, 125, 50, 0.18)',
  },
  newBadgeText: { fontSize: 8, fontWeight: '700', color: '#43A047', letterSpacing: 0.5 },
  // Empty
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing['2xl'] },
  emptyTitle: { fontSize: 20, fontWeight: '700', marginTop: spacing.lg },
  emptyDesc: { fontSize: 14, marginTop: 4, marginBottom: spacing.xl },
  primaryBtn: {
    backgroundColor: '#2E7D32', paddingVertical: 14, paddingHorizontal: 24,
    borderRadius: radius.full, borderWidth: 1, borderColor: 'rgba(46, 125, 50, 0.18)',
  },
  primaryBtnText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },
  // Soon badge
  soonBadge: {
    backgroundColor: 'rgba(46, 125, 50, 0.05)', paddingVertical: 2, paddingHorizontal: 6,
    borderRadius: radius.full, borderWidth: 1, borderColor: 'rgba(46, 125, 50, 0.06)',
  },
  soonBadgeText: { fontSize: 8, fontWeight: '700', color: 'rgba(27, 60, 18, 0.5)', letterSpacing: 0.5 },
  // Notification badge
  notifBadge: {
    minWidth: 22, height: 22, borderRadius: 11,
    backgroundColor: '#EF5350', alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 6,
  },
  notifBadgeText: { fontSize: 11, fontWeight: '700', color: '#FFFFFF' },
  // Settings
  settingsSection: {
    paddingHorizontal: spacing.lg, marginBottom: spacing.xl,
  },
  settingsSectionTitle: {
    fontSize: 14, fontWeight: '700', color: 'rgba(27,60,18,0.4)',
    letterSpacing: 0.5, marginBottom: spacing.base, textTransform: 'uppercase',
  },
  settingsRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.base,
    paddingVertical: 14, borderBottomWidth: 1,
    borderBottomColor: 'rgba(46,125,50,0.06)',
  },
  settingsLabel: { flex: 1, fontSize: 15, fontWeight: '500', color: '#2E4A26' },
  langToggle: {
    flexDirection: 'row', borderRadius: 100, overflow: 'hidden',
    backgroundColor: 'rgba(46,125,50,0.06)',
    borderWidth: 1, borderColor: 'rgba(46,125,50,0.15)',
  },
  langBtn: {
    paddingVertical: 6, paddingHorizontal: 14,
  },
  langBtnActive: {
    backgroundColor: '#2E7D32',
  },
  langBtnText: {
    fontSize: 13, fontWeight: '700', color: 'rgba(27,60,18,0.5)',
  },
  langBtnTextActive: {
    color: '#fff',
  },
  wishlistBadge: {
    minWidth: 20, height: 20, borderRadius: 10,
    backgroundColor: 'rgba(239,83,80,0.12)', alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 4,
  },
  wishlistBadgeText: { fontSize: 11, fontWeight: '700', color: '#EF5350' },
});
