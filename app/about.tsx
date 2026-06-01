/**
 * Fresh — About Screen
 * Premium brand story + policies (Privacy, Terms, Refund, Shipping)
 */

import { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius } from '../src/theme';
import { supabase } from '../src/api/supabase';
import { useDynamic } from '../src/hooks/useDynamic';

const APP_VERSION = '1.0.0';

type Section = 'story' | 'privacy' | 'terms' | 'refund' | 'shipping';

const STATS = [
  { num: '50+', label: 'Partner\nOrchards', icon: '🌳' },
  { num: '10K+', label: 'Happy\nCustomers', icon: '💚' },
  { num: '99%', label: 'Fresh\nGuarantee', icon: '✨' },
  { num: '24h', label: 'Farm to\nDoor', icon: '🚚' },
];

const TEAM = [
  { name: 'Farm Partners', desc: 'We work directly with 50+ orchards across Ratnagiri, Nashik, Shimla, and Kerala — no middlemen.', icon: 'leaf' },
  { name: 'Quality Control', desc: 'Every fruit passes a 12-point quality check before it reaches your doorstep.', icon: 'shield-checkmark' },
  { name: 'Cold Chain', desc: 'Temperature-controlled logistics from harvest to delivery, preserving peak freshness.', icon: 'snow' },
  { name: 'Community', desc: 'Fair wages to farmers, eco-friendly packaging, and carbon-neutral delivery routes.', icon: 'heart' },
];

const POLICIES: { id: Section; title: string; icon: string; content: string[] }[] = [
  {
    id: 'privacy',
    title: 'Privacy Policy',
    icon: 'lock-closed',
    content: [
      '🔒 Data Collection — We collect only the information necessary to process your orders: name, email, phone, delivery address, and payment details.',
      '🛡️ Data Security — All personal data is encrypted in transit (TLS 1.3) and at rest. We use Supabase with Row Level Security to ensure your data is only accessible to you.',
      '📊 Usage Analytics — We collect anonymous usage metrics to improve the app experience. No personally identifiable information is shared with analytics providers.',
      '🚫 No Selling — We never sell, rent, or share your personal information with third parties for marketing purposes.',
      '🍪 Cookies — We use essential cookies only for authentication and session management. No tracking cookies from third parties.',
      '📧 Communications — We may send order updates, delivery notifications, and occasional promotions. You can manage your notification preferences anytime from your profile.',
      '🗑️ Data Deletion — You can request complete deletion of your account and associated data by contacting support. We process deletion requests within 48 hours.',
      '👶 Children — Our services are not directed to individuals under 13. We do not knowingly collect information from children.',
    ],
  },
  {
    id: 'terms',
    title: 'Terms of Service',
    icon: 'document-text',
    content: [
      '✅ Acceptance — By using Nutriva, you agree to these terms. If you disagree, please discontinue use of the app.',
      '👤 Account — You are responsible for maintaining the confidentiality of your account credentials. One account per person.',
      '🛒 Orders — All orders are subject to availability. Prices are listed in INR (₹) and include applicable taxes. We reserve the right to modify prices without prior notice.',
      '💳 Payment — We accept UPI, credit/debit cards, and net banking. Payment is processed at the time of order placement.',
      '📦 Delivery — Estimated delivery times are approximate. Delays due to weather, logistics, or unforeseen circumstances do not entitle refunds.',
      '🚫 Prohibited Use — You may not use the app for any unlawful purpose, resell products commercially without authorization, or interfere with the service.',
      '⚖️ Liability — Nutriva is not liable for indirect, incidental, or consequential damages. Our total liability is limited to the amount paid for the specific order in question.',
      '📝 Changes — We may update these terms periodically. Continued use after updates constitutes acceptance of the revised terms.',
      '🏛️ Governing Law — These terms are governed by the laws of India. Any disputes shall be subject to the jurisdiction of courts in Mumbai, Maharashtra.',
    ],
  },
  {
    id: 'refund',
    title: 'Refund & Cancellation',
    icon: 'refresh',
    content: [
      '🔄 Cancellation Window — Orders can be cancelled within 30 minutes of placement for a full refund. After this window, cancellation is subject to a 10% fee.',
      '🍎 Quality Issues — If you receive damaged, rotten, or incorrect items, report within 24 hours with photos. We\'ll issue a full refund or replacement — no questions asked.',
      '📸 Photo Proof — For quality claims, please attach clear photos of the issue. This helps us improve our supply chain and process your claim faster.',
      '💰 Refund Timeline — Refunds are processed within 3-5 business days to the original payment method. UPI refunds may be instant.',
      '🔢 Partial Refunds — If only some items are affected, we refund only those items proportionally.',
      '🎁 Bulk Orders — Bulk and festival pack orders follow the same refund policy. Advance orders can be cancelled up to 48 hours before the scheduled delivery date.',
      '❌ Non-Refundable — Delivery fees (if applicable), promotional discounts, and gift wrapping charges are non-refundable.',
    ],
  },
  {
    id: 'shipping',
    title: 'Shipping & Delivery',
    icon: 'car',
    content: [
      '🚚 Delivery Areas — We currently deliver across select pin codes in Mumbai, Pune, Bangalore, Delhi NCR, and Hyderabad. Check availability at checkout.',
      '⏰ Delivery Slots — Choose from Morning (9 AM – 12 PM), Afternoon (12 PM – 4 PM), or Evening (4 PM – 8 PM) slots.',
      '📅 Advance Orders — Schedule deliveries up to 7 days in advance. Perfect for events and festivals.',
      '💸 Free Delivery — Orders above ₹499 qualify for free delivery. A flat ₹49 delivery fee applies to smaller orders.',
      '📦 Packaging — We use insulated, eco-friendly packaging to maintain freshness. All packaging is recyclable or compostable.',
      '🏠 Contactless Delivery — Request contactless delivery at checkout. Your order will be placed at your door with photo confirmation.',
      '🔔 Live Tracking — Track your delivery in real-time via the Orders tab. You\'ll receive push notifications at each stage.',
      '🌧️ Weather Delays — Extreme weather may cause delivery delays. We\'ll notify you proactively and offer rescheduling options.',
    ],
  },
];

export default function AboutScreen() {
  const d = useDynamic();

  const router = useRouter();
  const [activeSection, setActiveSection] = useState<Section>('story');
  const [configData, setConfigData] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!supabase) return;
    const fetchConfig = async () => {
      try {
        const { data } = await supabase.from('app_config').select('key, value');
        if (data) {
          const obj: Record<string, string> = {};
          data.forEach((row: any) => { if (row.value) obj[row.key] = row.value; });
          setConfigData(obj);
        }
      } catch {}
    };
    fetchConfig();
  }, []);

  // Use dynamic data with fallbacks to hardcoded defaults
  const brandDesc = configData.brand_desc || 'We believe everyone deserves fruit that tastes like it was just picked. No wax, no gas ripening, no cold storage for months \u2014 just real, honest produce from people who care.';
  const promiseText = configData.promise_text || 'If any fruit doesn\'t meet your expectations, we\'ll replace it or refund you \u2014 no questions asked. That\'s how confident we are in our supply chain.';
  const supportEmail = configData.support_email || 'support@nutriva.in';

  let dynamicStats = STATS;
  try { if (configData.stats_json) dynamicStats = JSON.parse(configData.stats_json); } catch {}

  let dynamicSteps = TEAM;
  try { if (configData.steps_json) dynamicSteps = JSON.parse(configData.steps_json); } catch {}

  const dynamicPolicies = POLICIES.map((p) => {
    const keyMap: Record<string, string> = { privacy: 'privacy_policy', terms: 'terms_of_service', refund: 'refund_policy', shipping: 'shipping_policy' };
    const dbKey = keyMap[p.id];
    if (dbKey && configData[dbKey]) {
      return { ...p, content: configData[dbKey].split('\n').filter((l: string) => l.trim()) };
    }
    return p;
  });

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <Pressable style={s.backBtn} onPress={() => router.replace('/(tabs)/profile')}>
          <Ionicons name="arrow-back" size={22} color="#1B3C12" />
        </Pressable>
        <Text style={s.headerTitle}>About</Text>
        <Text style={s.headerVersion}>v{APP_VERSION}</Text>
      </View>

      {/* Section Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabBar} contentContainerStyle={s.tabBarContent}>
        <Pressable style={[s.tab, activeSection === 'story' && s.tabActive]} onPress={() => setActiveSection('story')}>
          <Ionicons name="sparkles" size={14} color={activeSection === 'story' ? '#2E4A26' : 'rgba(27, 60, 18, 0.5)'} />
          <Text style={[s.tabText, activeSection === 'story' && s.tabTextActive]}>Our Story</Text>
        </Pressable>
        {POLICIES.map((p) => (
          <Pressable key={p.id} style={[s.tab, activeSection === p.id && s.tabActive]} onPress={() => setActiveSection(p.id)}>
            <Ionicons name={p.icon as any} size={14} color={activeSection === p.id ? '#2E4A26' : 'rgba(27, 60, 18, 0.5)'} />
            <Text style={[s.tabText, activeSection === p.id && s.tabTextActive]}>{p.title.replace('& ', '&\n')}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        {/* ═══ OUR STORY ═══ */}
        {activeSection === 'story' && (
          <>
            {/* Hero Brand */}
            <View style={s.brandHero}>
              <View style={s.logoWrap}>
                <View style={s.logoPulse} />
                <View style={s.logo}>
                  <Ionicons name="leaf" size={36} color="#fff" />
                </View>
              </View>
              <Text style={s.brandName}>Nutriva</Text>
              <Text style={s.brandTagline}>The Editorial Orchard</Text>
              <Text style={s.brandDesc}>
                {brandDesc}
              </Text>
            </View>

            {/* Stats */}
            <View style={s.statsRow}>
              {dynamicStats.map((stat: any, idx: number) => (
                <View key={idx} style={s.statCard}>
                  <Text style={s.statEmoji}>{stat.icon}</Text>
                  <Text style={s.statNum}>{stat.num}</Text>
                  <Text style={s.statLabel}>{stat.label}</Text>
                </View>
              ))}
            </View>

            {/* How We Work */}
            <Text style={s.sectionTitle}>How We Work</Text>
            {dynamicSteps.map((item: any, i: number) => (
              <View key={i} style={s.howCard}>
                <View style={s.howNum}>
                  <Text style={s.howNumText}>{i + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={s.howHeader}>
                    <Ionicons name={(item.icon || 'star') as any} size={18} color="#2E7D32" />
                    <Text style={s.howTitle}>{item.name}</Text>
                  </View>
                  <Text style={s.howDesc}>{item.desc}</Text>
                </View>
              </View>
            ))}

            {/* Orchard Promise */}
            <View style={s.promiseCard}>
              <Text style={s.promiseEmoji}>🤝</Text>
              <Text style={s.promiseTitle}>The Nutriva Promise</Text>
              <Text style={s.promiseText}>
                {promiseText}
              </Text>
            </View>

            {/* Quick Links to Policies */}
            <Text style={s.sectionTitle}>Policies & Legal</Text>
            {POLICIES.map((p) => (
              <Pressable key={p.id} style={s.policyLink} onPress={() => setActiveSection(p.id)}>
                <View style={s.policyIcon}>
                  <Ionicons name={p.icon as any} size={18} color="#2E7D32" />
                </View>
                <Text style={s.policyLinkText}>{p.title}</Text>
                <Ionicons name="chevron-forward" size={16} color="rgba(129,199,132,0.25)" />
              </Pressable>
            ))}
          </>
        )}

        {/* ═══ POLICY PAGES ═══ */}
        {dynamicPolicies.map((policy) => (
          activeSection === policy.id && (
            <View key={policy.id}>
              <View style={s.policyHeader}>
                <View style={s.policyHeaderIcon}>
                  <Ionicons name={policy.icon as any} size={28} color="#2E7D32" />
                </View>
                <Text style={s.policyTitle}>{policy.title}</Text>
                <Text style={s.policyUpdated}>Last updated: {new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</Text>
              </View>

              {policy.content.map((item, i) => (
                <View key={i} style={s.policyItem}>
                  <Text style={s.policyText}>{item}</Text>
                </View>
              ))}

              <View style={s.policyFooter}>
                <Ionicons name="mail-outline" size={16} color="#2E7D32" />
                <Text style={s.policyFooterText}>Questions? Contact us at {supportEmail}</Text>
              </View>
            </View>
          )
        ))}

        {/* Footer */}
        <View style={s.footer}>
          <Text style={s.footerEmoji}>🍃</Text>
          <Text style={s.footerText}>Made with love for fresh fruit lovers</Text>
          <Text style={s.footerCopy}>© {new Date().getFullYear()} Nutriva. All rights reserved.</Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// ═══════════════ STYLES ═══════════════
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7F5' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingTop: spacing['2xl'], paddingBottom: spacing.sm,
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(46, 125, 50, 0.06)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(46, 125, 50, 0.10)' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1B3C12' },
  headerVersion: { fontSize: 12, color: 'rgba(27, 60, 18, 0.5)', backgroundColor: 'rgba(46, 125, 50, 0.05)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(46, 125, 50, 0.06)' },

  // Tabs
  tabBar: { maxHeight: 48, borderBottomWidth: 1, borderBottomColor: 'rgba(46, 125, 50, 0.06)' },
  tabBarContent: { paddingHorizontal: spacing.lg, gap: 6, alignItems: 'center' },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: 'rgba(46, 125, 50, 0.05)', borderWidth: 1, borderColor: 'rgba(46, 125, 50, 0.06)' },
  tabActive: { backgroundColor: 'rgba(46, 125, 50, 0.5)', borderColor: 'rgba(46, 125, 50, 0.18)' },
  tabText: { fontSize: 12, fontWeight: '600', color: 'rgba(27, 60, 18, 0.5)' },
  tabTextActive: { color: '#FFFFFF' },

  scroll: { paddingHorizontal: spacing.lg, paddingTop: spacing.xl },

  // Brand Hero
  brandHero: { alignItems: 'center', marginBottom: spacing['2xl'] },
  logoWrap: { position: 'relative', marginBottom: spacing.lg },
  logoPulse: { position: 'absolute', width: 88, height: 88, borderRadius: 44, backgroundColor: 'rgba(46,125,50,0.15)', top: -4, left: -4 },
  logo: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#2E7D32', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: 'rgba(46, 125, 50, 0.18)',
    shadowColor: '#1B5E20', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 10,
  },
  brandName: { fontSize: 36, fontWeight: '800', letterSpacing: -1.5, color: '#2E7D32' },
  brandTagline: { fontSize: 14, color: 'rgba(27, 60, 18, 0.6)', marginTop: 2, fontStyle: 'italic', letterSpacing: 1 },
  brandDesc: { fontSize: 14, lineHeight: 22, color: '#3E5A38', textAlign: 'center', marginTop: spacing.lg, paddingHorizontal: spacing.sm },

  // Stats
  statsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing['2xl'] },
  statCard: {
    flex: 1, alignItems: 'center', paddingVertical: spacing.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.7)', borderRadius: 16,
    borderWidth: 1, borderColor: 'rgba(46, 125, 50, 0.12)',
  },
  statEmoji: { fontSize: 20, marginBottom: 6 },
  statNum: { fontSize: 22, fontWeight: '800', color: '#2E7D32' },
  statLabel: { fontSize: 10, color: '#3E5A38', textAlign: 'center', marginTop: 4, lineHeight: 14 },

  // Section
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: spacing.lg, letterSpacing: -0.3, color: '#1B3C12' },

  // How We Work
  howCard: {
    flexDirection: 'row', gap: 14, marginBottom: spacing.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.7)', borderRadius: 16, padding: spacing.lg,
    borderWidth: 1, borderColor: 'rgba(46, 125, 50, 0.12)',
  },
  howNum: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#2E7D32', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(46, 125, 50, 0.18)' },
  howNumText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  howHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  howTitle: { fontSize: 15, fontWeight: '700', color: '#2E4A26' },
  howDesc: { fontSize: 13, lineHeight: 20, color: '#3E5A38' },

  // Promise
  promiseCard: {
    alignItems: 'center', padding: spacing.xl, marginBottom: spacing['2xl'],
    backgroundColor: 'rgba(27, 60, 18, 0.6)', borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(129, 199, 132, 0.25)',
  },
  promiseEmoji: { fontSize: 32, marginBottom: spacing.sm },
  promiseTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF', marginBottom: 8 },
  promiseText: { fontSize: 13, lineHeight: 20, color: 'rgba(255,255,255,0.9)', textAlign: 'center' },

  // Policy Links
  policyLink: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(46, 125, 50, 0.06)',
  },
  policyIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(46, 125, 50, 0.08)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(46, 125, 50, 0.10)' },
  policyLinkText: { flex: 1, fontSize: 15, fontWeight: '600', color: '#2E4A26' },

  // Policy Page
  policyHeader: { alignItems: 'center', marginBottom: spacing.xl },
  policyHeaderIcon: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: 'rgba(46, 125, 50, 0.08)', alignItems: 'center', justifyContent: 'center', marginBottom: spacing.base,
    borderWidth: 1, borderColor: 'rgba(129,199,132,0.2)',
  },
  policyTitle: { fontSize: 22, fontWeight: '700', color: '#1B3C12' },
  policyUpdated: { fontSize: 11, color: 'rgba(27, 60, 18, 0.35)', marginTop: 4 },
  policyItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)', borderRadius: 14,
    padding: spacing.lg, marginBottom: spacing.sm,
    borderWidth: 1, borderColor: 'rgba(46, 125, 50, 0.08)',
  },
  policyText: { fontSize: 13, lineHeight: 21, color: '#2E4A26' },
  policyFooter: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginTop: spacing.lg, paddingVertical: spacing.lg,
    borderTopWidth: 1, borderTopColor: 'rgba(46, 125, 50, 0.06)',
  },
  policyFooterText: { fontSize: 13, color: '#2E7D32', fontWeight: '500' },

  // Footer
  footer: { alignItems: 'center', paddingVertical: spacing['2xl'] },
  footerEmoji: { fontSize: 24, marginBottom: 8 },
  footerText: { fontSize: 13, color: 'rgba(27, 60, 18, 0.5)' },
  footerCopy: { fontSize: 11, color: 'rgba(27, 60, 18, 0.25)', marginTop: 4 },
});
