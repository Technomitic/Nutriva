/**
 * Fresh — Home / Shop Screen
 * Ported from page--home: hero, search, harvest grid, bulk banner, featured card
 */

import { useState, useCallback, useEffect } from 'react';
import {
  View, Text, ScrollView, Pressable, Image, FlatList,
  TextInput, StyleSheet, RefreshControl, Dimensions, Animated, Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, typography, glass } from '../../src/theme';
import { products } from '../../src/data/products';
import { useCartStore } from '../../src/stores/cartStore';
import { useUIStore } from '../../src/stores/uiStore';
import { useWishlistStore } from '../../src/stores/wishlistStore';
import { useAuthStore } from '../../src/stores/authStore';
import { Product } from '../../src/types';
import { supabase } from '../../src/api/supabase';
import { useDynamic } from '../../src/hooks/useDynamic';
import { useT } from '../../src/i18n';
import {
  useHeroEntrance, useStaggerEntrance, useCardEntrance3D,
  useSectionEntrance, useFloating, useParallaxScroll,
} from '../../src/utils/animations';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (Math.min(SCREEN_WIDTH, 430) - spacing.lg * 2 - spacing.base) / 2;
const isWeb = Platform.OS === 'web';
const ADDRESSES_KEY = 'fresh-addresses';

/* ── Mini Image Slider for Product Cards ── */
function CardImageSlider({ product }: { product: Product }) {
  const [activeIdx, setActiveIdx] = useState(0);

  // Build image list: local asset → image_url → image_urls (deduplicated)
  const images: { key: string; local?: any; uri?: string }[] = [];
  const seen = new Set<string>();

  if (product.image) {
    images.push({ key: 'local', local: product.image });
  }
  if (product.image_url) {
    seen.add(product.image_url);
    images.push({ key: product.image_url, uri: product.image_url });
  }
  if (product.image_urls?.length) {
    product.image_urls.forEach((url) => {
      if (!seen.has(url)) {
        seen.add(url);
        images.push({ key: url, uri: url });
      }
    });
  }

  // Fallback: single placeholder
  if (images.length === 0) {
    images.push({ key: 'placeholder' });
  }

  // If only 1 image, render statically (no slider)
  if (images.length === 1) {
    const img = images[0];
    return (
      <View style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
        {img.local ? (
          <Image source={img.local} style={styles.harvestImg} resizeMode="contain" />
        ) : img.uri ? (
          <Image source={{ uri: img.uri }} style={styles.harvestImg} resizeMode="contain" />
        ) : (
          <View style={{ width: '85%', height: '85%', borderRadius: 12, backgroundColor: 'rgba(46,125,50,0.08)', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="leaf-outline" size={40} color="rgba(46,125,50,0.2)" />
          </View>
        )}
      </View>
    );
  }

  // Multi-image slider
  const imgSize = CARD_WIDTH - spacing.base * 2;
  return (
    <View style={{ width: '100%', height: '100%' }}>
      <FlatList
        data={images}
        keyExtractor={(item) => item.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={(e) => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / imgSize);
          if (idx !== activeIdx) setActiveIdx(idx);
        }}
        scrollEventThrottle={16}
        getItemLayout={(_, index) => ({ length: imgSize, offset: imgSize * index, index })}
        renderItem={({ item }) => (
          <View style={{ width: imgSize, height: imgSize, alignItems: 'center', justifyContent: 'center' }}>
            {item.local ? (
              <Image source={item.local} style={styles.harvestImg} resizeMode="contain" />
            ) : item.uri ? (
              <Image source={{ uri: item.uri }} style={styles.harvestImg} resizeMode="contain" />
            ) : null}
          </View>
        )}
      />
      {/* Dot indicators */}
      <View style={{ position: 'absolute', bottom: 4, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 4 }}>
        {images.map((_, i) => (
          <View
            key={i}
            style={{
              width: activeIdx === i ? 12 : 5,
              height: 5,
              borderRadius: 3,
              backgroundColor: activeIdx === i ? '#2E7D32' : 'rgba(46,125,50,0.2)',
            }}
          />
        ))}
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const addItem = useCartStore((s) => s.addItem);
  const showToast = useUIStore((s) => s.showToast);
  const user = useAuthStore((s) => s.user);
  const { items: wishlistItems, toggleWishlist, isWishlisted, loadWishlist } = useWishlistStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [productRatings, setProductRatings] = useState<Record<string, { avg: number; count: number }>>({});
  const [sortBy, setSortBy] = useState<'default' | 'price-low' | 'price-high'>('default');
  const [filterTag, setFilterTag] = useState<string>('all');
  const [showSort, setShowSort] = useState(false);
  const d = useDynamic();
  const t = useT();

  // Web header: notification count
  const [notifCount, setNotifCount] = useState(0);
  useEffect(() => {
    if (!isWeb || !supabase || !user?.id) return;
    supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .or(`user_id.eq.${user.id},user_id.is.null`)
      .eq('read', false)
      .then(({ count }) => { if (count !== null) setNotifCount(count); });
  }, [user?.id]);

  // Web header: default address
  const [defaultAddr, setDefaultAddr] = useState<string | null>(null);
  useEffect(() => {
    if (!isWeb) return;
    AsyncStorage.getItem(ADDRESSES_KEY).then((stored) => {
      if (!stored) return;
      try {
        const addrs = JSON.parse(stored);
        const def = addrs.find((a: any) => a.isDefault) || addrs[0];
        if (def) setDefaultAddr(`${def.line1}${def.line2 ? ', ' + def.line2 : ''}, ${def.city}`);
      } catch {}
    });
  }, []);

  const FILTER_TAGS = ['all', 'SEASONAL', 'IMPORTED', 'TROPICAL', 'PREMIUM', 'FARM FRESH'];

  // Load wishlist on auth
  useEffect(() => {
    if (user?.id) loadWishlist(user.id);
  }, [user?.id]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const handleAddToCart = (product: Product) => {
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image || (product.image_url ? { uri: product.image_url } : null),
      variety: product.variety,
      unit: product.unit,
    });
    showToast(`${product.name} added to basket`);
  };

  const [supabaseProducts, setSupabaseProducts] = useState<Product[]>([]);
  const [productsLoaded, setProductsLoaded] = useState(false);

  // Fetch products from Supabase, merging with local image assets
  const loadProducts = useCallback(async () => {
    if (!supabase) {
      // No Supabase configured — use static data as sole source
      setSupabaseProducts(products.filter((p) => p.active !== false));
      setProductsLoaded(true);
      return;
    }
    // Include products where active is explicitly true OR null (never set)
    // Only exclude products where active is explicitly false
    const { data } = await supabase
      .from('products')
      .select('*')
      .or('active.eq.true,active.is.null')
      .order('name', { ascending: true });
    if (data && data.length > 0) {
      // Merge Supabase product data with local images
      const merged = data.map((dbProd: any) => {
        const local = products.find((p) => p.id === dbProd.id);
        return {
          ...dbProd,
          // Use local asset if available, otherwise null (will fall back to image_url)
          image: local?.image || null,
          freshness: dbProd.freshness || local?.freshness || 'Fresh',
        } as Product;
      });
      setSupabaseProducts(merged);
    }
    setProductsLoaded(true);
  }, []);

  // Initial load
  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Re-fetch on pull-to-refresh
  useEffect(() => {
    if (refreshing) loadProducts();
  }, [refreshing, loadProducts]);

  // Poll for product changes every 10 seconds so admin visibility
  // toggles are reflected without needing pull-to-refresh
  useEffect(() => {
    if (!supabase) return;
    const interval = setInterval(loadProducts, 10000);
    return () => clearInterval(interval);
  }, [loadProducts]);

  // Single source of truth — no mixing static and Supabase data
  const displayProducts = supabaseProducts
    .filter((p) => p.id !== 'pomegranate')
    .filter((p) =>
      searchQuery
        ? p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.variety?.toLowerCase().includes(searchQuery.toLowerCase())
        : true
    )
    .filter((p) =>
      filterTag === 'all' ? true : (p.tag || '').toUpperCase().includes(filterTag)
    )
    .sort((a, b) => {
      if (sortBy === 'price-low') return a.price - b.price;
      if (sortBy === 'price-high') return b.price - a.price;
      return 0;
    });

  const [heroId, setHeroId] = useState('mango');
  const [editorsPickId, setEditorsPickId] = useState('apple');

  useEffect(() => {
    if (!supabase) return;
    supabase.from('products').select('id, is_hero, is_editors_pick').then(({ data }) => {
      if (!data) return;
      const hero = data.find((p: any) => p.is_hero);
      const pick = data.find((p: any) => p.is_editors_pick);
      if (hero) setHeroId(hero.id);
      if (pick) setEditorsPickId(pick.id);
    });
  }, [refreshing]);

  // Fetch product ratings
  useEffect(() => {
    if (!supabase) return;
    supabase.from('reviews').select('product_id, rating').then(({ data }) => {
      if (!data) return;
      const stats: Record<string, { sum: number; count: number }> = {};
      data.forEach((r: any) => {
        if (!stats[r.product_id]) stats[r.product_id] = { sum: 0, count: 0 };
        stats[r.product_id].sum += r.rating;
        stats[r.product_id].count += 1;
      });
      const result: Record<string, { avg: number; count: number }> = {};
      Object.entries(stats).forEach(([id, s]) => {
        result[id] = { avg: s.sum / s.count, count: s.count };
      });
      setProductRatings(result);
    });
  }, []);

  // Look up hero/featured from Supabase data first, then static fallback
  const heroProduct = supabaseProducts.find((p) => p.id === heroId)
    || products.find((p) => p.id === heroId)
    || supabaseProducts[0]
    || products[0];
  const featuredProduct = supabaseProducts.find((p) => p.id === editorsPickId)
    || products.find((p) => p.id === editorsPickId)
    || supabaseProducts[1]
    || products.find((p) => p.id === 'apple')!;

  // ── Animations ──
  const heroAnim = useHeroEntrance();
  const heroFloat = useFloating(4000, 6);
  const { scrollY, headerStyle } = useParallaxScroll();
  const cardAnims = useStaggerEntrance(displayProducts.length, 60);
  const bulkAnim = useCardEntrance3D(300);
  const advanceAnim = useSectionEntrance(500);
  const featuredAnim = useCardEntrance3D(600);

  return (
    <Animated.ScrollView
      style={[styles.container, { backgroundColor: d.bg }]}
      showsVerticalScrollIndicator={false}
      onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
      scrollEventThrottle={16}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      {/* ===== WEB HEADER ===== */}
      {isWeb && (
        <View style={[webStyles.header, { backgroundColor: d.cardBg, borderBottomColor: d.border }]}>
          {/* Logo */}
          <Pressable style={webStyles.logoWrap} onPress={() => router.replace('/(tabs)')}>
            <View style={webStyles.logoIcon}>
              <Ionicons name="leaf" size={20} color="#FFFFFF" />
            </View>
            <Text style={webStyles.logoText}>Nutriva</Text>
          </Pressable>

          {/* Address */}
          <Pressable style={[webStyles.addressBtn, { borderColor: d.border }]} onPress={() => router.push('/addresses' as any)}>
            <Ionicons name="location-outline" size={16} color={d.accent} />
            <Text style={[webStyles.addressText, { color: d.text }]} numberOfLines={1}>
              {defaultAddr || 'Add delivery address'}
            </Text>
            <Ionicons name="chevron-down" size={14} color={d.textMuted} />
          </Pressable>

          {/* Spacer to push right-side items */}
          <View style={{ flex: 1 }} />

          {/* Search */}
          <View style={[webStyles.searchBar, { backgroundColor: d.inputBg, borderColor: d.inputBorder }]}>
            <Ionicons name="search" size={18} color={d.textDim} />
            <TextInput
              style={[webStyles.searchInput, { color: d.text }]}
              placeholder={t('home.search_placeholder')}
              placeholderTextColor={d.textDim}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            <Pressable
              style={webStyles.sortBtn}
              onPress={() => {
                const next = sortBy === 'default' ? 'price-low' : sortBy === 'price-low' ? 'price-high' : 'default';
                setSortBy(next);
              }}
            >
              <Ionicons name="swap-vertical" size={16} color={sortBy !== 'default' ? '#2E7D32' : d.textDim} />
            </Pressable>
          </View>

          {/* Notification */}
          <Pressable style={[webStyles.iconBtn, { borderColor: d.border }]} onPress={() => router.push('/notifications')}>
            <Ionicons name="notifications-outline" size={20} color={d.text} />
            {notifCount > 0 && (
              <View style={webStyles.badge}>
                <Text style={webStyles.badgeText}>{notifCount > 99 ? '99+' : notifCount}</Text>
              </View>
            )}
          </Pressable>

          {/* Auth */}
          {user ? (
            <Pressable style={[webStyles.profileBtn, { borderColor: d.border }]} onPress={() => router.push('/(tabs)/profile')}>
              {user.avatar_url ? (
                <Image source={{ uri: user.avatar_url }} style={webStyles.profileImg} />
              ) : (
                <Ionicons name="person" size={18} color="#FFFFFF" />
              )}
            </Pressable>
          ) : (
            <Pressable style={webStyles.signInBtn} onPress={() => router.push('/(auth)/login')}>
              <Text style={webStyles.signInText}>Sign In</Text>
            </Pressable>
          )}
        </View>
      )}

      {/* ===== HERO ===== */}
      <Pressable onPress={() => router.push(`/product/${heroProduct.id}`)}>
      <Animated.View style={[styles.hero, heroAnim]}>
        <View style={styles.heroContent}>
          <View style={styles.heroTag}>
          <Text style={styles.heroTagText}>{heroProduct.tag || t('home.hero_tag')}</Text>
          </View>
          <Text style={styles.heroTitle}>{heroProduct.name.split(' ').join('\n')}</Text>
          <Text style={styles.heroSub}>{heroProduct.origin}</Text>
          <Pressable
            style={styles.heroCta}
            onPress={(e) => { e.stopPropagation?.(); handleAddToCart(heroProduct); }}
          >
            <Ionicons name="add" size={18} color={colors.primary} />
            <Text style={styles.heroCtaText}>{t('home.add_to_cart')} — ₹{heroProduct.price}{heroProduct.unit}</Text>
          </Pressable>
        </View>
        {heroProduct.image ? (
          <Animated.Image
            source={heroProduct.image}
            style={[styles.heroImage, heroFloat]}
            resizeMode="contain"
          />
        ) : heroProduct.image_url ? (
          <Animated.Image
            source={{ uri: heroProduct.image_url }}
            style={[styles.heroImage, heroFloat]}
            resizeMode="contain"
          />
        ) : (
          <Animated.View style={[styles.heroImage, heroFloat, { alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(46,125,50,0.08)', borderRadius: 80 }]}>
            <Ionicons name="leaf-outline" size={60} color="rgba(46,125,50,0.2)" />
          </Animated.View>
        )}
      </Animated.View>
      </Pressable>

      {/* ===== SEARCH (mobile only — web search is in the header) ===== */}
      {!isWeb && (
        <View style={[styles.searchBar, { backgroundColor: d.inputBg, borderColor: d.inputBorder }]}>
          <Ionicons name="search" size={20} color={d.textDim} />
          <TextInput
            style={[styles.searchInput, { color: d.text }]}
            placeholder={t('home.search_placeholder')}
            placeholderTextColor={d.textDim}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <Pressable
            style={styles.sortBtn}
            onPress={() => {
              const next = sortBy === 'default' ? 'price-low' : sortBy === 'price-low' ? 'price-high' : 'default';
              setSortBy(next);
            }}
          >
            <Ionicons name="swap-vertical" size={18} color={sortBy !== 'default' ? '#2E7D32' : 'rgba(165,214,167,0.4)'} />
          </Pressable>
        </View>
      )}

      {/* ===== FILTER CHIPS ===== */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterRow}
        contentContainerStyle={styles.filterRowContent}
      >
        {FILTER_TAGS.map((tag) => (
          <Pressable
            key={tag}
            style={[styles.filterChip, filterTag === tag && styles.filterChipActive, filterTag !== tag && { backgroundColor: d.accentLight, borderColor: d.border }]}
            onPress={() => setFilterTag(tag)}
          >
            <Text style={[styles.filterChipText, filterTag === tag && styles.filterChipTextActive, filterTag !== tag && { color: d.textMuted }]}>
              {tag === 'all' ? `🍎 ${t('home.filter_all')}` : tag.charAt(0) + tag.slice(1).toLowerCase()}
            </Text>
          </Pressable>
        ))}
        {sortBy !== 'default' && (
          <View style={[styles.filterChip, styles.filterChipActive]}>
            <Ionicons name="swap-vertical" size={12} color="#fff" />
            <Text style={[styles.filterChipText, styles.filterChipTextActive]}>
              {sortBy === 'price-low' ? t('home.sort_price_low') : t('home.sort_price_high')}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* ===== TODAY'S HARVEST ===== */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: d.text }]}>{t('home.harvest_title')}</Text>
          <Pressable>
            <Text style={[styles.sectionAction, { color: d.accent }]}>{t('common.see_all').toUpperCase()}</Text>
          </Pressable>
        </View>

        <View style={styles.harvestGrid}>
          {displayProducts.length === 0 ? (
            <View style={styles.emptySearch}>
              <Ionicons name="search-outline" size={48} color={d.textDim} />
              <Text style={[styles.emptySearchTitle, { color: d.text }]}>
                {searchQuery ? `No results for "${searchQuery}"` : 'No products found'}
              </Text>
              <Text style={[styles.emptySearchSub, { color: d.textMuted }]}>
                {searchQuery ? 'Try a different search term or browse all products' : 'Try changing the filter above'}
              </Text>
              {(searchQuery || filterTag !== 'all') && (
                <Pressable
                  style={styles.emptySearchBtn}
                  onPress={() => { setSearchQuery(''); setFilterTag('all'); }}
                >
                  <Text style={styles.emptySearchBtnText}>Show All Products</Text>
                </Pressable>
              )}
            </View>
          ) : (
            displayProducts.map((product, idx) => (
            <Animated.View key={product.id} style={[cardAnims[idx] || {}]}>
            <Pressable
              style={[styles.harvestCard, { backgroundColor: d.cardBg, borderColor: d.border }]}
              onPress={() => router.push(`/product/${product.id}`)}
            >
              <View style={styles.harvestCardImg}>
                <CardImageSlider product={product} />
                {user && (
                  <Pressable
                    style={styles.wishlistHeart}
                    onPress={(e) => {
                      e.stopPropagation?.();
                      toggleWishlist(user.id, product.id);
                    }}
                  >
                    <Ionicons
                      name={isWishlisted(product.id) ? 'heart' : 'heart-outline'}
                      size={18}
                      color={isWishlisted(product.id) ? '#EF5350' : 'rgba(27,60,18,0.3)'}
                    />
                  </Pressable>
                )}
              </View>
              <View style={styles.freshnessTag}>
                <Text style={styles.freshnessText}>{product.freshness}</Text>
              </View>
              {productRatings[product.id] && (
                <View style={styles.cardRating}>
                  <Ionicons name="star" size={11} color="#F9A825" />
                  <Text style={[styles.cardRatingText, { color: d.text }]}>
                    {productRatings[product.id].avg.toFixed(1)}
                  </Text>
                  <Text style={[styles.cardRatingCount, { color: d.textMuted }]}>({productRatings[product.id].count})</Text>
                </View>
              )}
              <Text style={[styles.harvestName, { color: d.text }]}>{product.name}</Text>
              <Text style={[styles.harvestOrigin, { color: d.textMuted }]}>
                {product.origin.split('·')[1]?.trim() || product.origin}
              </Text>
              <View style={styles.harvestFooter}>
                <Text style={[styles.harvestPrice, { color: d.accent }]}>₹{product.price}<Text style={[styles.harvestUnit, { color: d.textMuted }]}>{product.unit}</Text></Text>
                <Pressable
                  style={styles.addBtn}
                  onPress={(e) => {
                    e.stopPropagation?.();
                    handleAddToCart(product);
                  }}
                >
                  <Ionicons name="add" size={18} color={colors.onPrimary} />
                </Pressable>
              </View>
            </Pressable>
            </Animated.View>
            ))
          )}
        </View>
      </View>

      {/* ===== BULK BANNER ===== */}
      <Animated.View style={[styles.bulkBanner, bulkAnim]}>
        <View style={styles.bulkBannerBadge}>
          <Text style={styles.bulkBannerBadgeText}>SAVE 30%</Text>
        </View>
        <Text style={styles.bulkBannerTitle}>{t('home.bulk_title')}</Text>
        <Text style={styles.bulkBannerDesc}>
          {t('home.bulk_desc')}
        </Text>
        <Pressable
          style={styles.bulkBannerBtn}
          onPress={() => router.push('/(tabs)/bulk')}
        >
          <Text style={[styles.bulkBannerBtnText, { color: '#FFFFFF' }]}>{t('home.explore_bulk')}</Text>
        </Pressable>
      </Animated.View>

      {/* ===== ADVANCE ORDER BANNER ===== */}
      <Animated.View style={advanceAnim}>
      <Pressable style={styles.advanceBanner} onPress={() => router.push('/advance-order')}>
        <View style={styles.advanceIcon}>
          <Ionicons name="calendar" size={28} color="#1565C0" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.advanceTitle}>{t('home.advance_order')}</Text>
          <Text style={styles.advanceDesc}>
            {t('home.advance_desc')}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#1565C0" />
      </Pressable>
      </Animated.View>

      {/* ===== FEATURED / EDITOR'S PICK ===== */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: d.text }]}>{t('home.editors_pick')}</Text>
        </View>

        <Animated.View style={featuredAnim}>
        <Pressable
          style={[styles.featuredCard, { backgroundColor: d.cardBg, borderColor: d.border }]}
          onPress={() => router.push(`/product/${featuredProduct.id}`)}
        >
          <View style={styles.featuredImg}>
            {featuredProduct.image ? (
              <Image
                source={featuredProduct.image}
                style={{ width: '60%', height: '80%' }}
                resizeMode="contain"
              />
            ) : featuredProduct.image_url ? (
              <Image
                source={{ uri: featuredProduct.image_url }}
                style={{ width: '100%', height: '100%', borderRadius: 12 }}
                resizeMode="contain"
              />
            ) : (
              <View style={{ width: '60%', height: '80%', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="leaf-outline" size={60} color="rgba(46,125,50,0.2)" />
              </View>
            )}
          </View>
          <View style={styles.featuredBody}>
            <Text style={styles.featuredTag}>{featuredProduct.tag || 'ARTISANAL'}</Text>
            <Text style={[styles.featuredName, { color: d.text }]}>{featuredProduct.name}</Text>
            <Text style={[styles.featuredDesc, { color: d.textMuted }]}>{featuredProduct.description}</Text>
            <View style={styles.featuredFooter}>
              <Text style={[styles.featuredPrice, { color: d.accent }]}>
                ₹{featuredProduct.price}
                <Text style={[styles.featuredUnit, { color: d.textMuted }]}> {featuredProduct.unit}</Text>
              </Text>
              <Pressable
                style={[styles.addBtnSmall, { backgroundColor: d.isDark ? '#2E7D32' : d.accentLight, borderColor: d.isDark ? '#43A047' : d.border }]}
                onPress={() => handleAddToCart(featuredProduct)}
              >
                <Ionicons name="cart-outline" size={20} color={d.isDark ? '#FFFFFF' : colors.primary} />
              </Pressable>
            </View>
          </View>
        </Pressable>
        </Animated.View>
      </View>

      <View style={{ height: 40 }} />
    </Animated.ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: glass.screenBg,
  },
  // Hero
  hero: {
    margin: spacing.base,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: 'rgba(27, 94, 32, 0.85)',
    minHeight: 280,
    justifyContent: 'flex-end',
    borderWidth: 1,
    borderColor: glass.cardBorder,
  },
  heroContent: {
    padding: spacing['2xl'],
    paddingTop: 56,
    paddingRight: 8,
    zIndex: 2,
    maxWidth: '58%',
  },
  heroTag: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(46, 125, 50, 0.10)',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: radius.full,
    marginBottom: spacing.base,
  },
  heroTagText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: colors.primaryFixed,
  },
  heroTitle: {
    fontSize: 34,
    fontWeight: '800',
    color: colors.white,
    lineHeight: 38,
    letterSpacing: -1.2,
    marginBottom: spacing.md,
  },
  heroSub: {
    color: colors.primaryFixedDim,
    fontSize: 14,
    marginBottom: spacing.xl,
  },
  heroCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
  },
  heroCtaText: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 14,
  },
  heroImage: {
    position: 'absolute',
    right: -10,
    top: 20,
    width: '50%',
    height: '85%',
    opacity: 0.9,
  },
  // Search
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: glass.inputBg,
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginHorizontal: spacing.base,
    marginVertical: spacing.base,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: glass.inputBorder,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: glass.textPrimary,
  },
  sortBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(46,125,50,0.06)',
    alignItems: 'center', justifyContent: 'center',
  },
  // Filter Chips
  filterRow: {
    maxHeight: 44,
    marginBottom: spacing.base,
  },
  filterRowContent: {
    paddingHorizontal: spacing.lg,
    gap: 8,
    alignItems: 'center',
  },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingVertical: 6, paddingHorizontal: 14,
    borderRadius: 100,
    backgroundColor: 'rgba(46,125,50,0.05)',
    borderWidth: 1, borderColor: 'rgba(46,125,50,0.08)',
  },
  filterChipActive: {
    backgroundColor: '#2E7D32',
    borderColor: 'rgba(46,125,50,0.18)',
  },
  filterChipText: {
    fontSize: 12, fontWeight: '600',
    color: glass.textMuted,
  },
  filterChipTextActive: {
    color: '#fff',
  },
  // Wishlist Heart
  wishlistHeart: {
    position: 'absolute', top: 6, right: 6,
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1, shadowRadius: 4, elevation: 2,
  },
  // Section
  section: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing['2xl'],
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: glass.textSecondary,
    letterSpacing: -0.5,
  },
  sectionAction: {
    fontSize: 12,
    fontWeight: '600',
    color: glass.accent,
    letterSpacing: 0.5,
  },
  // Harvest Grid
  harvestGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.base,
  },
  harvestCard: {
    width: CARD_WIDTH,
    backgroundColor: glass.cardBg,
    borderRadius: 18,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: glass.cardBorder,
  },
  harvestCardImg: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  harvestImg: {
    width: '85%',
    height: '85%',
  },
  freshnessTag: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: radius.full,
    marginBottom: spacing.sm,
  },
  freshnessText: {
    fontSize: 10,
    fontWeight: '600',
    color: glass.accentBright,
  },
  cardRating: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    marginBottom: 2,
  },
  cardRatingText: { fontSize: 11, fontWeight: '700', color: glass.textPrimary },
  cardRatingCount: { fontSize: 10, color: glass.textMuted },
  harvestName: {
    fontSize: 14,
    fontWeight: '600',
    color: glass.textPrimary,
    marginBottom: 2,
  },
  harvestOrigin: {
    fontSize: 11,
    color: glass.textMuted,
    marginBottom: spacing.md,
  },
  harvestFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  harvestPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: glass.accent,
  },
  harvestUnit: {
    fontSize: 11,
    fontWeight: '500',
  },
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: glass.btnPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Empty Search State
  emptySearch: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing['4xl'],
    paddingHorizontal: spacing.xl,
  },
  emptySearchTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1B3C12',
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  emptySearchSub: {
    fontSize: 13,
    color: 'rgba(27, 60, 18, 0.5)',
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 19,
  },
  emptySearchBtn: {
    marginTop: spacing.lg,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 20,
    backgroundColor: '#2E7D32',
  },
  emptySearchBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Bulk Banner
  bulkBanner: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing['2xl'],
    backgroundColor: 'rgba(20, 66, 18, 0.7)',
    borderRadius: 22,
    padding: spacing['2xl'],
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: glass.cardBorderBright,
  },
  bulkBannerBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: radius.full,
    marginBottom: spacing.base,
  },
  bulkBannerBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: colors.primaryFixed,
  },
  bulkBannerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.white,
    marginBottom: spacing.sm,
  },
  bulkBannerDesc: {
    fontSize: 13,
    color: colors.primaryFixedDim,
    marginBottom: spacing.xl,
    lineHeight: 19,
  },
  bulkBannerBtn: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  bulkBannerBtnText: {
    color: glass.textPrimary,
    fontWeight: '600',
    fontSize: 14,
  },
  // Featured Card
  featuredCard: {
    backgroundColor: glass.cardBg,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: glass.cardBorderBright,
    shadowColor: '#1B5E20',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 6,
  },
  featuredImg: {
    width: '100%',
    height: 260,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.base,
  },
  featuredBody: {
    padding: spacing.xl,
  },
  featuredTag: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: glass.accentBright,
    marginBottom: spacing.sm,
  },
  featuredName: {
    fontSize: 22,
    fontWeight: '700',
    color: glass.textPrimary,
    marginBottom: spacing.sm,
    letterSpacing: -0.4,
  },
  featuredDesc: {
    fontSize: 13,
    color: glass.textMuted,
    lineHeight: 19,
    marginBottom: spacing.lg,
  },
  featuredFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  featuredPrice: {
    fontSize: 24,
    fontWeight: '800',
    color: glass.accent,
  },
  featuredUnit: {
    fontSize: 14,
    fontWeight: '400',
    color: glass.textMuted,
  },
  addBtnSmall: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: 'rgba(46, 125, 50, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: glass.cardBorder,
  },
  // Advance Order Banner
  advanceBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xl,
    padding: spacing.lg,
    backgroundColor: 'rgba(13, 71, 161, 0.08)',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(100, 181, 246, 0.2)',
  },
  advanceIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(13, 71, 161, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  advanceTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1565C0',
    marginBottom: 2,
  },
  advanceDesc: {
    fontSize: 11,
    color: 'rgba(21, 101, 192, 0.6)',
    lineHeight: 16,
  },
});

/* ── Web-only Header Styles ── */
const webStyles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(46, 125, 50, 0.08)',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },
  logoWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginRight: 8,
  },
  logoIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#2E7D32',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1B3C12',
    letterSpacing: -0.5,
  },
  addressBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(46, 125, 50, 0.12)',
    maxWidth: 240,
  },
  addressText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#2E4A26',
    flex: 1,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(46, 125, 50, 0.08)',
    maxWidth: 420,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    outlineStyle: 'none',
  } as any,
  sortBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(46, 125, 50, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(46, 125, 50, 0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#EF5350',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  profileBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2E7D32',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  profileImg: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  signInBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: '#2E7D32',
  },
  signInText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
