/**
 * Nutriva — Wishlist Screen
 * Shows user's saved favorite products with add-to-cart and remove actions
 */

import { useEffect } from 'react';
import {
  View, Text, ScrollView, Pressable, Image, StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius } from '../src/theme';
import { useAuthStore } from '../src/stores/authStore';
import { useWishlistStore } from '../src/stores/wishlistStore';
import { useCartStore } from '../src/stores/cartStore';
import { useUIStore } from '../src/stores/uiStore';
import { products as localProducts } from '../src/data/products';
import { useDynamic } from '../src/hooks/useDynamic';

export default function WishlistScreen() {
  const d = useDynamic();

  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { items: wishlistIds, loadWishlist, toggleWishlist } = useWishlistStore();
  const addItem = useCartStore((s) => s.addItem);
  const showToast = useUIStore((s) => s.showToast);

  useEffect(() => {
    if (user?.id) loadWishlist(user.id);
  }, [user?.id]);

  const wishlistProducts = localProducts.filter((p) => wishlistIds.includes(p.id));

  const handleAddToCart = (product: any) => {
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      variety: product.variety,
      unit: product.unit,
    });
    showToast(`${product.name} added to basket`);
  };

  return (
    <View style={st.container}>
      {/* Header */}
      <View style={st.header}>
        <Pressable style={st.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={d.text} />
        </Pressable>
        <Text style={st.headerTitle}>My Wishlist</Text>
        <View style={{ flex: 1 }} />
        <Text style={st.headerCount}>
          {wishlistProducts.length} item{wishlistProducts.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {wishlistProducts.length === 0 ? (
        <View style={st.empty}>
          <Ionicons name="heart-outline" size={64} color="rgba(27,60,18,0.2)" />
          <Text style={st.emptyTitle}>No favorites yet</Text>
          <Text style={st.emptyDesc}>
            Tap the ♥ icon on products to save them here
          </Text>
          <Pressable style={st.browseBtn} onPress={() => router.push('/(tabs)')}>
            <Text style={st.browseBtnText}>Browse Products</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={st.list}>
          {wishlistProducts.map((product) => (
            <View key={product.id} style={st.card}>
              <View style={st.cardImage}>
                <Image source={product.image} style={st.img} resizeMode="contain" />
              </View>
              <View style={st.cardInfo}>
                <Text style={st.cardName}>{product.name}</Text>
                <Text style={st.cardVariety}>{product.variety}</Text>
                <Text style={st.cardPrice}>₹{product.price} {product.unit}</Text>
                <View style={st.cardActions}>
                  <Pressable
                    style={st.addToCartBtn}
                    onPress={() => handleAddToCart(product)}
                  >
                    <Ionicons name="cart-outline" size={16} color="#fff" />
                    <Text style={st.addToCartText}>Add to Cart</Text>
                  </Pressable>
                  <Pressable
                    style={st.removeBtn}
                    onPress={() => {
                      if (user) toggleWishlist(user.id, product.id);
                    }}
                  >
                    <Ionicons name="heart-dislike-outline" size={16} color="#C62828" />
                  </Pressable>
                </View>
              </View>
            </View>
          ))}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7F5' },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.base,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.base,
    paddingTop: 56,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderBottomWidth: 1, borderBottomColor: 'rgba(46,125,50,0.08)',
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(46,125,50,0.06)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#1B3C12' },
  headerCount: { fontSize: 13, color: 'rgba(27,60,18,0.5)' },

  empty: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    padding: spacing['2xl'],
  },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#1B3C12', marginTop: spacing.lg },
  emptyDesc: { fontSize: 14, color: 'rgba(27,60,18,0.5)', marginTop: 4, textAlign: 'center' },
  browseBtn: {
    backgroundColor: '#2E7D32', paddingVertical: 14, paddingHorizontal: 24,
    borderRadius: radius.full, marginTop: spacing.xl,
  },
  browseBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },

  list: { padding: spacing.lg, gap: spacing.base },

  card: {
    flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 18, padding: spacing.base,
    borderWidth: 1, borderColor: 'rgba(46,125,50,0.08)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
    gap: spacing.base,
  },
  cardImage: {
    width: 80, height: 80, borderRadius: 14,
    backgroundColor: 'rgba(46,125,50,0.04)',
    alignItems: 'center', justifyContent: 'center',
  },
  img: { width: 60, height: 60 },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 16, fontWeight: '700', color: '#2E4A26' },
  cardVariety: { fontSize: 12, color: 'rgba(27,60,18,0.5)', marginTop: 2 },
  cardPrice: { fontSize: 15, fontWeight: '700', color: '#2E7D32', marginTop: 4 },
  cardActions: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8,
  },
  addToCartBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#2E7D32', paddingVertical: 6, paddingHorizontal: 14,
    borderRadius: 100,
  },
  addToCartText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  removeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(198,40,40,0.06)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(198,40,40,0.15)',
  },
});
