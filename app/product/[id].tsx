/**
 * Fresh — Product Detail Screen
 * Image slider with dot indicators + Review system
 */

import { useState, useEffect, useRef } from 'react';
import {
  View, Text, Pressable, Image, StyleSheet, ScrollView,
  Dimensions, ActivityIndicator, TextInput, Platform, FlatList,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { colors, spacing, radius } from '../../src/theme';
import { products } from '../../src/data/products';
import { useCartStore } from '../../src/stores/cartStore';
import { useAuthStore } from '../../src/stores/authStore';
import { useUIStore } from '../../src/stores/uiStore';
import { supabase } from '../../src/api/supabase';
import { Review, Product } from '../../src/types';
import { useDynamic } from '../../src/hooks/useDynamic';

const { width: SW } = Dimensions.get('window');
const IMG_HEIGHT = 380;

export default function ProductDetailScreen() {
  const d = useDynamic();

  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const addItem = useCartStore((s) => s.addItem);
  const user = useAuthStore((s) => s.user);
  const showToast = useUIStore((s) => s.showToast);
  const [qty, setQty] = useState(1);

  // Image slider
  const [allImages, setAllImages] = useState<{ uri: string; isLocal: boolean }[]>([]);
  const [activeSlide, setActiveSlide] = useState(0);
  const sliderRef = useRef<FlatList>(null);

  // Reviews
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [avgRating, setAvgRating] = useState(0);

  // Write review
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewImages, setReviewImages] = useState<string[]>([]);
  const [submittingReview, setSubmittingReview] = useState(false);

  // Product data — fetched from Supabase, merged with local assets
  const [product, setProduct] = useState<Product | null>(null);
  const [productLoading, setProductLoading] = useState(true);
  const [isHidden, setIsHidden] = useState(false);

  // Fetch product from Supabase, fall back to static data
  useEffect(() => {
    if (!id) { setProductLoading(false); return; }

    const localProduct = products.find((p) => p.id === id) || null;

    if (!supabase) {
      // No Supabase — use static data only
      setProduct(localProduct);
      setProductLoading(false);
      return;
    }

    supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data, error }) => {
        if (data) {
          if (data.active === false) {
            setIsHidden(true);
            setProductLoading(false);
            return;
          }
          // Merge: Supabase data wins for all fields; local asset used for image
          setProduct({
            ...data,
            image: localProduct?.image || null,
            freshness: data.freshness || localProduct?.freshness || 'Fresh',
          } as Product);
        } else {
          // Product not in Supabase — use static data if available
          setProduct(localProduct);
        }
        setProductLoading(false);
      });
  }, [id]);

  // Load product images — depends on product being loaded
  useEffect(() => {
    if (!product) return;

    const images: { uri: string; isLocal: boolean }[] = [];
    const seen = new Set<string>();

    // Add local asset image if available
    if (product.image) {
      images.push({ uri: 'LOCAL', isLocal: true });
    }

    // Add the main Supabase image_url
    if (product.image_url) {
      seen.add(product.image_url);
      images.push({ uri: product.image_url, isLocal: false });
    }

    // Add additional Supabase image_urls (deduplicated)
    if (product.image_urls?.length) {
      product.image_urls.forEach((url: string) => {
        if (!seen.has(url)) {
          seen.add(url);
          images.push({ uri: url, isLocal: false });
        }
      });
    }

    // If still no images, show a placeholder
    if (images.length === 0) {
      images.push({ uri: 'PLACEHOLDER', isLocal: true });
    }

    setAllImages(images);
  }, [product]);

  // Load reviews
  useEffect(() => {
    if (!supabase || !id) { setLoadingReviews(false); return; }
    const fetchReviews = async () => {
      const { data } = await supabase
        .from('reviews')
        .select('*')
        .eq('product_id', id)
        .order('created_at', { ascending: false });
      const revs = (data || []) as Review[];
      setReviews(revs);
      if (revs.length > 0) {
        setAvgRating(revs.reduce((sum, r) => sum + r.rating, 0) / revs.length);
      }
      setLoadingReviews(false);
    };
    fetchReviews();
  }, [id]);

  // Show loading while fetching
  if (productLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: d.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={d.accent} />
      </View>
    );
  }

  if (!product) {
    return (
      <View style={{ flex: 1, backgroundColor: d.bg, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <Ionicons name="leaf-outline" size={48} color={d.textDim} />
        <Text style={{ fontSize: 18, fontWeight: '700', color: d.text, marginTop: 16 }}>Product Not Found</Text>
        <Text style={{ fontSize: 14, color: d.textMuted, marginTop: 6, textAlign: 'center' }}>This product may have been removed.</Text>
        <Pressable
          style={{ marginTop: 20, backgroundColor: '#2E7D32', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 999 }}
          onPress={() => router.back()}
        >
          <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  if (isHidden) {
    return (
      <View style={{ flex: 1, backgroundColor: d.bg, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <Ionicons name="eye-off-outline" size={48} color={d.textDim} />
        <Text style={{ fontSize: 18, fontWeight: '700', color: d.text, marginTop: 16 }}>Product Unavailable</Text>
        <Text style={{ fontSize: 14, color: d.textMuted, marginTop: 6, textAlign: 'center' }}>This product is currently not available.</Text>
        <Pressable
          style={{ marginTop: 20, backgroundColor: '#2E7D32', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 999 }}
          onPress={() => router.back()}
        >
          <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const handleAdd = () => {
    addItem(
      {
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image || product.image_url || null,
        variety: product.variety,
        unit: product.unit,
      },
      qty
    );
    showToast(`${product.name} added to basket`);
    router.back();
  };

  const handleScroll = (e: any) => {
    const x = e.nativeEvent.contentOffset.x;
    const idx = Math.round(x / SW);
    if (idx !== activeSlide) setActiveSlide(idx);
  };

  // Pick review image
  const pickReviewImage = async () => {
    if (reviewImages.length >= 3) {
      showToast('Max 3 images per review');
      return;
    }
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.7,
      });
      if (!result.canceled && result.assets[0]) {
        setReviewImages([...reviewImages, result.assets[0].uri]);
      }
    } catch {
      showToast('Could not open gallery');
    }
  };

  // Submit review
  const submitReview = async () => {
    if (!supabase || !user) {
      showToast('Please sign in to leave a review');
      return;
    }
    if (reviewRating < 1) {
      showToast('Please select a rating');
      return;
    }
    setSubmittingReview(true);
    try {
      // Upload review images
      const uploadedUrls: string[] = [];
      for (const imgUri of reviewImages) {
        const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
        const formData = new FormData();

        if (Platform.OS === 'web') {
          const response = await fetch(imgUri);
          const blob = await response.blob();
          formData.append('', blob, 'review.jpg');
        } else {
          formData.append('', {
            uri: imgUri,
            name: 'review.jpg',
            type: 'image/jpeg',
          } as any);
        }

        const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData?.session?.access_token || supabaseKey;

        const uploadRes = await fetch(
          `${supabaseUrl}/storage/v1/object/review-images/${fileName}`,
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

        if (uploadRes.ok) {
          // Get signed URL
          const { data: urlData } = await supabase.storage
            .from('review-images')
            .createSignedUrl(fileName, 86400 * 30); // 30 days
          if (urlData?.signedUrl) uploadedUrls.push(urlData.signedUrl);
        }
      }

      // Insert review
      const { error } = await supabase.from('reviews').insert({
        product_id: id,
        user_id: user.id,
        user_name: user.name || 'Anonymous',
        rating: reviewRating,
        comment: reviewComment.trim(),
        image_urls: uploadedUrls,
      });
      if (error) throw error;

      // Refresh reviews
      const { data: newReviews } = await supabase
        .from('reviews')
        .select('*')
        .eq('product_id', id)
        .order('created_at', { ascending: false });
      const revs = (newReviews || []) as Review[];
      setReviews(revs);
      if (revs.length > 0) {
        setAvgRating(revs.reduce((sum, r) => sum + r.rating, 0) / revs.length);
      }

      setShowReviewForm(false);
      setReviewRating(5);
      setReviewComment('');
      setReviewImages([]);
      showToast('Review submitted! ⭐');
    } catch (err: any) {
      console.warn('Review submit error:', err);
      showToast('Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  const renderStars = (rating: number, size = 14) => (
    <View style={{ flexDirection: 'row', gap: 1 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Ionicons
          key={i}
          name={i <= rating ? 'star' : i - 0.5 <= rating ? 'star-half' : 'star-outline'}
          size={size}
          color="#F9A825"
        />
      ))}
    </View>
  );

  return (
    <View style={[s.container, { backgroundColor: d.bg }]}>
      {/* Close Button */}
      <Pressable style={[s.closeBtn, { backgroundColor: d.cardBg, borderColor: d.border }]} onPress={() => router.back()}>
        <Ionicons name="close" size={24} color={d.text} />
      </Pressable>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* ── Image Slider ── */}
        <View style={s.sliderWrap}>
          <FlatList
            ref={sliderRef}
            data={allImages}
            keyExtractor={(_, idx) => idx.toString()}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            getItemLayout={(_, index) => ({ length: SW, offset: SW * index, index })}
            renderItem={({ item: img }) => (
              <View style={[s.slideItem, { width: SW }]}>
                {img.isLocal && img.uri === 'PLACEHOLDER' ? (
                  <View style={{ width: '70%', height: '85%', borderRadius: 12, backgroundColor: 'rgba(46,125,50,0.06)', alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="leaf-outline" size={64} color="rgba(46,125,50,0.15)" />
                  </View>
                ) : img.isLocal && product.image ? (
                  <Image source={product.image} style={s.slideImg} resizeMode="contain" />
                ) : !img.isLocal ? (
                  <Image source={{ uri: img.uri }} style={s.slideImg} resizeMode="contain" />
                ) : null}
              </View>
            )}
          />
          {/* Dot indicators */}
          {allImages.length > 1 && (
            <View style={s.dotsRow}>
              {allImages.map((_, idx) => (
                <Pressable
                  key={idx}
                  style={[s.dot, activeSlide === idx && s.dotActive]}
                  onPress={() => {
                    sliderRef.current?.scrollToIndex({ index: idx, animated: true });
                    setActiveSlide(idx);
                  }}
                />
              ))}
            </View>
          )}
          {/* Image counter badge */}
          {allImages.length > 1 && (
            <View style={s.imgCountBadge}>
              <Ionicons name="images-outline" size={12} color="#fff" />
              <Text style={s.imgCountText}>{activeSlide + 1}/{allImages.length}</Text>
            </View>
          )}
          {/* Navigation arrows for web */}
          {Platform.OS === 'web' && allImages.length > 1 && (
            <>
              {activeSlide > 0 && (
                <Pressable
                  style={[s.sliderArrow, { left: 12 }]}
                  onPress={() => {
                    const prev = activeSlide - 1;
                    sliderRef.current?.scrollToIndex({ index: prev, animated: true });
                    setActiveSlide(prev);
                  }}
                >
                  <Ionicons name="chevron-back" size={22} color="#fff" />
                </Pressable>
              )}
              {activeSlide < allImages.length - 1 && (
                <Pressable
                  style={[s.sliderArrow, { right: 12 }]}
                  onPress={() => {
                    const next = activeSlide + 1;
                    sliderRef.current?.scrollToIndex({ index: next, animated: true });
                    setActiveSlide(next);
                  }}
                >
                  <Ionicons name="chevron-forward" size={22} color="#fff" />
                </Pressable>
              )}
            </>
          )}
        </View>

        {/* ── Product Info ── */}
        <View style={s.body}>
          <Text style={[s.tag, { color: d.isDark ? '#81C784' : '#43A047' }]}>{product.tag}</Text>
          <Text style={[s.name, { color: d.text }]}>{product.name}</Text>
          <Text style={[s.origin, { color: d.textMuted }]}>{product.origin}</Text>

          {/* Rating summary */}
          {reviews.length > 0 && (
            <Pressable style={s.ratingSummary} onPress={() => {}}>
              {renderStars(Math.round(avgRating))}
              <Text style={[s.ratingAvg, { color: d.text }]}>{avgRating.toFixed(1)}</Text>
              <Text style={[s.ratingCount, { color: d.textMuted }]}>({reviews.length} review{reviews.length !== 1 ? 's' : ''})</Text>
            </Pressable>
          )}

          <Text style={[s.description, { color: d.textSecondary }]}>{product.description}</Text>
        </View>

        {/* ── Reviews Section ── */}
        <View style={[s.reviewsSection, { borderTopColor: d.border }]}>
          <View style={s.reviewsHeader}>
            <Text style={[s.reviewsTitle, { color: d.text }]}>Reviews</Text>
            <Pressable
              style={[s.writeReviewBtn, { backgroundColor: d.accentLight, borderColor: d.border }]}
              onPress={() => setShowReviewForm(!showReviewForm)}
            >
              <Ionicons name={showReviewForm ? 'close' : 'create-outline'} size={16} color={d.accent} />
              <Text style={[s.writeReviewText, { color: d.accent }]}>{showReviewForm ? 'Cancel' : 'Write Review'}</Text>
            </Pressable>
          </View>

          {/* ── Write Review Form ── */}
          {showReviewForm && (
            <View style={[s.reviewForm, { backgroundColor: d.cardBg, borderColor: d.border }]}>
              {/* Star selector */}
              <Text style={[s.reviewFormLabel, { color: d.textMuted }]}>Your Rating</Text>
              <View style={s.starSelector}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <Pressable key={i} onPress={() => setReviewRating(i)}>
                    <Ionicons
                      name={i <= reviewRating ? 'star' : 'star-outline'}
                      size={32}
                      color="#F9A825"
                    />
                  </Pressable>
                ))}
              </View>

              {/* Comment */}
              <TextInput
                style={[s.reviewInput, { backgroundColor: d.inputBg, borderColor: d.inputBorder, color: d.text }]}
                placeholder="Share your experience..."
                placeholderTextColor={d.textDim}
                value={reviewComment}
                onChangeText={setReviewComment}
                multiline
              />

              {/* Attached images */}
              {reviewImages.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {reviewImages.map((uri, idx) => (
                      <View key={idx} style={s.reviewImgThumb}>
                        <Image source={{ uri }} style={s.reviewImgThumbImg} />
                        <Pressable
                          style={s.reviewImgRemove}
                          onPress={() => setReviewImages(reviewImages.filter((_, i) => i !== idx))}
                        >
                          <Ionicons name="close" size={12} color="#fff" />
                        </Pressable>
                      </View>
                    ))}
                  </View>
                </ScrollView>
              )}

              {/* Actions */}
              <View style={s.reviewFormActions}>
                <Pressable style={[s.attachBtn, { backgroundColor: d.accentLight, borderColor: d.border }]} onPress={pickReviewImage}>
                  <Ionicons name="camera-outline" size={18} color={d.accent} />
                  <Text style={[s.attachText, { color: d.accent }]}>Photo ({reviewImages.length}/3)</Text>
                </Pressable>
                <Pressable
                  style={[s.submitReviewBtn, submittingReview && { opacity: 0.6 }]}
                  onPress={submitReview}
                  disabled={submittingReview}
                >
                  {submittingReview ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={s.submitReviewText}>Submit</Text>
                  )}
                </Pressable>
              </View>
            </View>
          )}

          {/* ── Reviews List ── */}
          {loadingReviews ? (
            <ActivityIndicator style={{ paddingVertical: 20 }} color={d.accent} />
          ) : reviews.length === 0 ? (
            <View style={s.emptyReviews}>
              <Ionicons name="chatbubble-ellipses-outline" size={32} color={d.textDim} />
              <Text style={[s.emptyReviewsText, { color: d.textDim }]}>No reviews yet</Text>
              <Text style={[s.emptyReviewsSub, { color: d.textDim }]}>Be the first to review this product!</Text>
            </View>
          ) : (
            reviews.map((rev) => (
              <View key={rev.id} style={[s.reviewCard, { backgroundColor: d.cardBg, borderColor: d.border }]}>
                <View style={s.reviewCardHeader}>
                  <View style={[s.reviewAvatar, { backgroundColor: d.accentLight }]}>
                    <Text style={[s.reviewAvatarText, { color: d.accent }]}>{(rev.user_name || '?')[0].toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.reviewUserName, { color: d.text }]}>{rev.user_name}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      {renderStars(rev.rating, 12)}
                      <Text style={[s.reviewTime, { color: d.textDim }]}>{timeAgo(rev.created_at)}</Text>
                    </View>
                  </View>
                  {/* Delete own review */}
                  {user?.id === rev.user_id && (
                    <Pressable
                      onPress={async () => {
                        if (!supabase) return;
                        await supabase.from('reviews').delete().eq('id', rev.id);
                        setReviews(reviews.filter((r) => r.id !== rev.id));
                        showToast('Review deleted');
                      }}
                    >
                      <Ionicons name="trash-outline" size={16} color={d.textDim} />
                    </Pressable>
                  )}
                </View>
                {rev.comment ? <Text style={[s.reviewComment, { color: d.textSecondary }]}>{rev.comment}</Text> : null}
                {rev.image_urls?.length > 0 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      {rev.image_urls.map((url, idx) => (
                        <Image key={idx} source={{ uri: url }} style={s.reviewAttachedImg} />
                      ))}
                    </View>
                  </ScrollView>
                )}
              </View>
            ))
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── Footer ── */}
      <View style={[s.footer, { backgroundColor: d.isDark ? 'rgba(13,27,15,0.95)' : 'rgba(255, 255, 255, 0.9)', borderColor: d.border }]}>
        <View style={[s.qtyControl, { backgroundColor: d.accentLight, borderColor: d.border }]}>
          <Pressable style={[s.qtyBtn, { backgroundColor: d.accentLight }]} onPress={() => setQty((q) => Math.max(1, q - 1))}>
            <Ionicons name="remove" size={20} color={d.accent} />
          </Pressable>
          <Text style={[s.qtyText, { color: d.text }]}>{qty}</Text>
          <Pressable style={[s.qtyBtn, { backgroundColor: d.accentLight }]} onPress={() => setQty((q) => q + 1)}>
            <Ionicons name="add" size={20} color={d.accent} />
          </Pressable>
        </View>
        <Pressable style={s.addBtn} onPress={handleAdd}>
          <Text style={s.addBtnText}>Add — ₹{(product.price * qty).toLocaleString()}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7F5' },
  closeBtn: {
    position: 'absolute', top: 16, right: 16, zIndex: 10,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(46, 125, 50, 0.06)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(46, 125, 50, 0.10)',
  },

  // ── Image Slider ──
  sliderWrap: { position: 'relative', overflow: 'hidden' },
  slideItem: {
    width: SW, height: IMG_HEIGHT,
    backgroundColor: 'rgba(46, 125, 50, 0.03)',
    alignItems: 'center', justifyContent: 'center',
  },
  slideImg: { width: '90%', height: '90%', borderRadius: 12 },
  dotsRow: {
    flexDirection: 'row', justifyContent: 'center', gap: 6,
    position: 'absolute', bottom: 12, left: 0, right: 0,
  },
  dot: {
    width: 7, height: 7, borderRadius: 4,
    backgroundColor: 'rgba(46, 125, 50, 0.15)',
  },
  dotActive: { backgroundColor: '#2E7D32', width: 20, borderRadius: 4 },
  imgCountBadge: {
    position: 'absolute', top: 16, left: 16,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(0,0,0,0.5)', paddingVertical: 4, paddingHorizontal: 8,
    borderRadius: 999,
  },
  imgCountText: { fontSize: 11, fontWeight: '600', color: '#fff' },
  sliderArrow: {
    position: 'absolute', top: '50%', marginTop: -20,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center',
    zIndex: 10,
  } as any,

  // ── Body ──
  body: { padding: spacing.xl },
  tag: {
    fontSize: 10, fontWeight: '700', letterSpacing: 1.2,
    color: '#43A047', marginBottom: spacing.sm,
  },
  name: {
    fontSize: 28, fontWeight: '700', letterSpacing: -0.5,
    marginBottom: spacing.sm, color: '#1B3C12',
  },
  origin: { fontSize: 14, color: 'rgba(27, 60, 18, 0.5)', marginBottom: spacing.sm },
  ratingSummary: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginBottom: spacing.lg,
  },
  ratingAvg: { fontSize: 14, fontWeight: '700', color: '#1B3C12' },
  ratingCount: { fontSize: 12, color: 'rgba(27, 60, 18, 0.4)' },
  description: {
    fontSize: 14, color: 'rgba(27, 60, 18, 0.55)', lineHeight: 22,
  },

  // ── Reviews Section ──
  reviewsSection: {
    paddingHorizontal: spacing.xl, paddingTop: spacing.lg,
    borderTopWidth: 1, borderTopColor: 'rgba(46,125,50,0.06)',
  },
  reviewsHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  reviewsTitle: { fontSize: 18, fontWeight: '700', color: '#1B3C12' },
  writeReviewBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingVertical: 6, paddingHorizontal: 12,
    backgroundColor: 'rgba(46,125,50,0.06)', borderRadius: 999,
    borderWidth: 1, borderColor: 'rgba(46,125,50,0.1)',
  },
  writeReviewText: { fontSize: 12, fontWeight: '600', color: '#2E7D32' },

  // ── Review Form ──
  reviewForm: {
    backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 16, padding: spacing.lg,
    marginBottom: spacing.lg, borderWidth: 1, borderColor: 'rgba(46,125,50,0.08)',
  },
  reviewFormLabel: {
    fontSize: 12, fontWeight: '600', color: 'rgba(27,60,18,0.4)',
    marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  starSelector: {
    flexDirection: 'row', gap: 6, marginBottom: spacing.base,
  },
  reviewInput: {
    backgroundColor: 'rgba(245,247,245,0.8)', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 14,
    color: '#1B3C12', minHeight: 80, textAlignVertical: 'top',
    borderWidth: 1, borderColor: 'rgba(46,125,50,0.06)',
    marginBottom: 10,
  },
  reviewFormActions: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  attachBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingVertical: 8, paddingHorizontal: 12,
    backgroundColor: 'rgba(46,125,50,0.06)', borderRadius: 999,
    borderWidth: 1, borderColor: 'rgba(46,125,50,0.08)',
  },
  attachText: { fontSize: 12, fontWeight: '600', color: '#2E7D32' },
  submitReviewBtn: {
    flex: 1, backgroundColor: '#2E7D32',
    paddingVertical: 10, borderRadius: 999, alignItems: 'center',
  },
  submitReviewText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  reviewImgThumb: { position: 'relative' },
  reviewImgThumbImg: { width: 60, height: 60, borderRadius: 8 },
  reviewImgRemove: {
    position: 'absolute', top: -4, right: -4,
    width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center', justifyContent: 'center',
  },

  // ── Review Cards ──
  emptyReviews: {
    alignItems: 'center', paddingVertical: 30,
  },
  emptyReviewsText: { fontSize: 14, fontWeight: '600', color: 'rgba(27,60,18,0.25)', marginTop: 8 },
  emptyReviewsSub: { fontSize: 12, color: 'rgba(27,60,18,0.2)', marginTop: 2 },
  reviewCard: {
    backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: 14,
    padding: spacing.base, marginBottom: spacing.sm,
    borderWidth: 1, borderColor: 'rgba(46,125,50,0.06)',
  },
  reviewCardHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6,
  },
  reviewAvatar: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(46,125,50,0.12)', alignItems: 'center', justifyContent: 'center',
  },
  reviewAvatarText: { fontSize: 13, fontWeight: '700', color: '#2E7D32' },
  reviewUserName: { fontSize: 13, fontWeight: '600', color: '#1B3C12' },
  reviewTime: { fontSize: 10, color: 'rgba(27,60,18,0.3)' },
  reviewComment: {
    fontSize: 13, color: 'rgba(27,60,18,0.6)', lineHeight: 19,
    marginLeft: 42,
  },
  reviewAttachedImg: {
    width: 80, height: 80, borderRadius: 10,
    marginLeft: 42,
  },

  // ── Footer ──
  footer: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.base,
    paddingHorizontal: spacing.xl, paddingVertical: spacing.lg, paddingBottom: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderTopWidth: 1, borderColor: 'rgba(129,199,132,0.2)',
    shadowColor: '#000', shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.3, shadowRadius: 24, elevation: 16,
  },
  qtyControl: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'rgba(46, 125, 50, 0.05)', borderRadius: radius.full,
    paddingHorizontal: 4, paddingVertical: 4,
    borderWidth: 1, borderColor: 'rgba(46, 125, 50, 0.08)',
  },
  qtyBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(46, 125, 50, 0.06)',
    alignItems: 'center', justifyContent: 'center',
  },
  qtyText: { fontSize: 16, fontWeight: '700', minWidth: 24, textAlign: 'center', color: '#2E4A26' },
  addBtn: {
    flex: 1, backgroundColor: '#2E7D32',
    paddingVertical: 16, borderRadius: radius.full, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(46, 125, 50, 0.18)',
  },
  addBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});
