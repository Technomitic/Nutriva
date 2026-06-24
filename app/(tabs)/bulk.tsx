/**
 * Fresh — Bulk Deals Screen
 */

import { useState } from 'react';
import { View, Text, ScrollView, Pressable, Image, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius } from '../../src/theme';
import { bulkDeals, festivalPacks } from '../../src/data/products';
import { useCartStore } from '../../src/stores/cartStore';
import { useUIStore } from '../../src/stores/uiStore';
import { useHeroEntrance, useStaggerEntrance, useCardEntrance3D } from '../../src/utils/animations';
import { useDynamic } from '../../src/hooks/useDynamic';
import { useT } from '../../src/i18n';

export default function BulkScreen() {
  const addItem = useCartStore((s) => s.addItem);
  const showToast = useUIStore((s) => s.showToast);
  const [selectedTiers, setSelectedTiers] = useState<Record<string, number>>({});

  const handleSelectTier = (dealId: string, tierIdx: number) => {
    setSelectedTiers((prev) => ({ ...prev, [dealId]: tierIdx }));
  };

  const handleAddDeal = (dealId: string) => {
    const deal = bulkDeals.find((d) => d.id === dealId);
    if (!deal) return;
    const tierIdx = selectedTiers[dealId] || 0;
    const tier = deal.tiers[tierIdx];
    addItem({
      id: `${deal.id}-${tierIdx}`,
      name: deal.name,
      desc: tier.qty,
      price: tier.price,
      image: deal.image,
    });
    showToast(`${deal.name} added to basket`);
  };

  const handleAddPack = (packId: string) => {
    const pack = festivalPacks.find((p) => p.id === packId);
    if (!pack) return;
    addItem({
      id: pack.id,
      name: pack.name,
      desc: pack.items.map((i) => `${i.name} ${i.qty}`).join(', '),
      price: pack.price,
      image: require('../../assets/images/bananas.png'),
    });
    showToast(`${pack.name} added to basket`);
  };

  // Animations
  const headerAnim = useHeroEntrance();
  const dealAnims = useStaggerEntrance(bulkDeals.length, 120);
  const packAnims = useStaggerEntrance(festivalPacks.length, 120);
  const d = useDynamic();
  const t = useT();

  return (
    <ScrollView style={[styles.container, { backgroundColor: d.bg }]} showsVerticalScrollIndicator={false}>
      <Animated.View style={[styles.header, headerAnim]}>
        <Text style={[styles.headerTitle, { color: d.text }]}>{t('bulk.title')}</Text>
        <Text style={[styles.headerSub, { color: d.textMuted }]}>{t('bulk.subtitle')}</Text>
      </Animated.View>

      {/* Bulk Deals */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: d.text }]}>{t('bulk.bulk_packs')}</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{t('bulk.save_big')}</Text>
          </View>
        </View>

        {bulkDeals.map((deal, idx) => (
          <Animated.View key={deal.id} style={[dealAnims[idx] || {}]}>
          <View style={[styles.dealCard, { backgroundColor: d.cardBg, borderColor: d.border }]}>
            <View style={styles.dealHeader}>
              <Image source={deal.image} style={styles.dealImg} resizeMode="contain" />
              <View style={{ flex: 1 }}>
                <Text style={[styles.dealName, { color: d.text }]}>{deal.name}</Text>
                <Text style={[styles.dealDesc, { color: d.textMuted }]}>{deal.desc}</Text>
              </View>
            </View>
            <View style={styles.tiers}>
              {deal.tiers.map((tier, i) => (
                <Pressable
                  key={i}
                  style={[
                    styles.tier,
                    (selectedTiers[deal.id] || 0) === i && styles.tierSelected,
                  ]}
                  onPress={() => handleSelectTier(deal.id, i)}
                >
                  <Text style={[styles.tierQty, { color: d.text }]}>{tier.qty}</Text>
                  <View style={styles.tierPrices}>
                    <Text style={[styles.tierOriginal, { color: d.textDim }]}>₹{tier.original}</Text>
                    <Text style={[styles.tierPrice, { color: d.accent }]}>₹{tier.price}</Text>
                    <Text style={styles.tierSave}>{tier.save}</Text>
                  </View>
                </Pressable>
              ))}
            </View>
            <Pressable style={styles.addBtn} onPress={() => handleAddDeal(deal.id)}>
              <Text style={styles.addBtnText}>{t('bulk.add_to_basket')}</Text>
            </Pressable>
          </View>
          </Animated.View>
        ))}
      </View>

      {/* Festival Packs */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: d.text }]}>{t('bulk.festival_packs')}</Text>
          <View style={[styles.badge, { backgroundColor: colors.secondaryContainer }]}>
            <Text style={[styles.badgeText, { color: colors.primary }]}>{t('bulk.popular')}</Text>
          </View>
        </View>

        {festivalPacks.map((pack, idx) => (
          <Animated.View key={pack.id} style={[packAnims[idx] || {}]}>
          <View style={[styles.festivalCard, { backgroundColor: d.cardBg, borderColor: d.border }]}>
            <Text style={[styles.festivalName, { color: d.text }]}>{pack.name}</Text>
            <Text style={[styles.festivalDesc, { color: d.textMuted }]}>{pack.desc}</Text>
            <View style={styles.festivalItems}>
              {pack.items.map((item) => (
                <View key={item.name} style={styles.festivalItem}>
                  <Ionicons name="checkmark-circle" size={16} color={d.accent} />
                  <Text style={[styles.festivalItemText, { color: d.textSecondary }]}>
                    {item.name} — {item.qty}
                  </Text>
                </View>
              ))}
            </View>
            <View style={styles.festivalFooter}>
              <View>
                <Text style={[styles.festivalPrice, { color: d.accent }]}>₹{pack.price.toLocaleString()}</Text>
                <Text style={[styles.festivalOriginal, { color: d.textDim }]}>₹{pack.original.toLocaleString()}</Text>
              </View>
              <Pressable style={styles.packBtn} onPress={() => handleAddPack(pack.id)}>
                <Text style={styles.packBtnText}>{t('bulk.add_pack')}</Text>
              </Pressable>
            </View>
          </View>
          </Animated.View>
        ))}
      </View>

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7F5' },
  header: { padding: spacing['2xl'], paddingBottom: spacing.xl },
  headerTitle: { fontSize: 32, fontWeight: '700', letterSpacing: -0.8, marginBottom: 4, color: '#1B3C12' },
  headerSub: { fontSize: 14, color: 'rgba(27, 60, 18, 0.5)' },
  section: { paddingHorizontal: spacing.lg, marginBottom: spacing['2xl'] },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  sectionTitle: { fontSize: 22, fontWeight: '700', letterSpacing: -0.5, color: '#1B3C12' },
  badge: {
    backgroundColor: '#2E7D32', paddingVertical: 4, paddingHorizontal: 10,
    borderRadius: radius.full,
  },
  badgeText: { fontSize: 10, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.5 },
  // Deal Card
  dealCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)', borderRadius: 18,
    padding: spacing.lg, marginBottom: spacing.base,
    borderWidth: 1, borderColor: 'rgba(46, 125, 50, 0.12)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2, shadowRadius: 16, elevation: 4,
  },
  dealHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.base, marginBottom: spacing.base },
  dealImg: { width: 56, height: 56, borderRadius: radius.sm },
  dealName: { fontSize: 16, fontWeight: '600', color: '#2E4A26' },
  dealDesc: { fontSize: 12, color: 'rgba(27, 60, 18, 0.5)', marginTop: 2 },
  tiers: { gap: 8, marginBottom: spacing.base },
  tier: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: spacing.base, borderRadius: radius.sm,
    backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1.5, borderColor: 'transparent',
  },
  tierSelected: { borderColor: 'rgba(46, 125, 50, 0.22)', backgroundColor: 'rgba(76, 175, 80, 0.1)' },
  tierQty: { fontSize: 14, fontWeight: '600', color: '#2E4A26' },
  tierPrices: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tierOriginal: { fontSize: 12, color: 'rgba(27, 60, 18, 0.35)', textDecorationLine: 'line-through' },
  tierPrice: { fontSize: 16, fontWeight: '700', color: '#2E7D32' },
  tierSave: { fontSize: 11, fontWeight: '700', color: '#43A047' },
  addBtn: {
    backgroundColor: '#2E7D32', paddingVertical: 12,
    borderRadius: radius.full, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(46, 125, 50, 0.18)',
  },
  addBtnText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },
  // Festival
  festivalCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)', borderRadius: 18,
    padding: spacing.lg, marginBottom: spacing.base,
    borderWidth: 1, borderColor: 'rgba(46, 125, 50, 0.12)',
  },
  festivalName: { fontSize: 16, fontWeight: '700', marginBottom: 4, color: '#2E4A26' },
  festivalDesc: { fontSize: 12, color: 'rgba(27, 60, 18, 0.5)', marginBottom: spacing.base },
  festivalItems: { gap: 6, marginBottom: spacing.base },
  festivalItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  festivalItemText: { fontSize: 13, color: 'rgba(27, 60, 18, 0.55)' },
  festivalFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  festivalPrice: { fontSize: 20, fontWeight: '800', color: '#2E7D32' },
  festivalOriginal: { fontSize: 13, color: 'rgba(27, 60, 18, 0.35)', textDecorationLine: 'line-through' },
  packBtn: {
    backgroundColor: '#2E7D32', paddingVertical: 10, paddingHorizontal: 20,
    borderRadius: radius.full, borderWidth: 1, borderColor: 'rgba(46, 125, 50, 0.18)',
  },
  packBtnText: { color: '#FFFFFF', fontWeight: '600', fontSize: 13 },
});
