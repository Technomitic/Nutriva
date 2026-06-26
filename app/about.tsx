/**
 * Fresh — About Screen
 * Premium brand story + policies (Privacy, Terms, Refund, Shipping)
 */

import { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Animated, Image } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius } from '../src/theme';
import { supabase } from '../src/api/supabase';
import { useDynamic } from '../src/hooks/useDynamic';
import { SEOHead } from '../src/components/ui/SEOHead';
import { PAGE_SEO } from '../src/config/seo';

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

const POLICIES: { id: Section; title: string; icon: string; intro?: string; content: (string | { heading: string; body: string })[] }[] = [
  {
    id: 'privacy',
    title: 'Privacy Policy',
    icon: 'lock-closed',
    intro: 'Nutriva ("we," "our," or "us") values your privacy. This Privacy Policy explains how we collect, use, share, and protect your personal information when you use our mobile application and delivery services.',
    content: [
      {
        heading: '1. Information We Collect',
        body: 'We collect only the information strictly necessary to process your fruit orders, handle logistics, and manage your account:\n\n\u2022 Personal Identity Data: Name, email address, and phone number.\n\u2022 Transactional Data: Delivery address, order history, and payment details (processed securely via our payment gateways).\n\u2022 Device & Permissions Data:\n  \u2022 Location: We request access to your device\'s precise location to verify if you are within our delivery radiuses and to optimize delivery routing.\n  \u2022 Camera: If requested, camera access is used strictly for features like scanning payment methods or uploading photos of products for support/refunds.\n  \u2022 Notifications: We utilize device notification tokens to push real-time order status, driver tracking, and promotional alerts.',
      },
      {
        heading: '2. Data Security & Storage',
        body: '\u2022 Encryption: All personal data is strongly encrypted while in transit (using TLS 1.3 protocols) and while at rest on our servers.\n\u2022 Infrastructure: We utilize Supabase infrastructure combined with strict Row Level Security (RLS) to guarantee that your personal data is isolated and accessible exclusively to you.',
      },
      {
        heading: '3. Usage Analytics and Cookies',
        body: '\u2022 Analytics: We collect aggregated, anonymous usage metrics to track app performance and improve your shopping experience. No personally identifiable information (PII) is shared with external analytics providers.\n\u2022 Cookies: We use essential cookies and local storage tokens solely for authentication, session persistence, and security management. We do not deploy third-party advertising or tracking cookies.',
      },
      {
        heading: '4. Data Sharing and Zero-Selling Policy',
        body: '\u2022 No Selling: We strictly maintain a policy that we never sell, rent, trade, or share your personal information with third parties for their independent marketing or advertising purposes.\n\u2022 Third-Party Service Providers: We share information only with trusted third parties necessary to fulfill our core operations, including payment processing gateways, delivery/logistics partners, and automated SMS/Email transaction routers. All such parties are bound by strict data confidentiality agreements.',
      },
      {
        heading: '5. Communications and Opt-Outs',
        body: 'By creating an account, you consent to receive critical operational communications, including order receipts, delivery notifications, and customer support updates. We may also send occasional seasonal promotions or discounts. You retain full control and can opt out of promotional communications at any time directly via your profile settings.',
      },
      {
        heading: '6. Children\'s Privacy',
        body: 'Our services are commercial delivery platforms not designed for or directed toward individuals under the age of 18. We do not knowingly collect personal information from children under 18. If we discover that a child under 18 has provided us with personal data, we will immediately delete it from our systems.',
      },
      {
        heading: '7. Data Deletion and Right to Clean Slate',
        body: 'You retain full ownership over your data. You can request the complete deletion of your account and all associated personal information at any time. To execute this, please contact our support desk or use the "Delete Account" button in your app profile. We commit to processing and executing all deletion requests within 48 hours.',
      },
      {
        heading: '8. Changes to this Policy',
        body: 'We may revise this Privacy Policy to reflect changing legal requirements or operational practices. Any updates will be highlighted by modifying the "Last Updated" date at the top of this document.',
      },
      {
        heading: '9. Grievance Officer & Contact',
        body: 'In accordance with the Information Technology Act 2000 and rules made thereunder, if you have any questions, concerns, or grievances regarding this Privacy Policy, please reach out to us via the app\'s support section or email.',
      },
    ],
  },
  {
    id: 'terms',
    title: 'Terms of Service',
    icon: 'document-text',
    intro: 'Welcome to Nutriva. These Terms of Service ("Terms") govern your access to and use of the Nutriva mobile application and website (collectively, the "Service").\n\nPlease read these Terms carefully before creating an account. By downloading, accessing, or using the Service, you agree to be bound by these Terms. If you do not agree to these Terms, you must immediately discontinue use of the app.',
    content: [
      {
        heading: '1. Acceptance of Terms & Eligibility',
        body: 'By accepting these Terms, you represent and warrant that you are at least 18 years of age and possess the legal capacity to enter into a binding agreement under applicable Indian laws. If you are under 18, you may only use the Service with the involvement and consent of a parent or legal guardian.',
      },
      {
        heading: '2. User Accounts and Security',
        body: '\u2022 Registration: To place orders, you must create an account providing accurate, current, and complete information.\n\u2022 Account Responsibility: You are solely responsible for maintaining the confidentiality of your account credentials and password. You accept responsibility for all activities that occur under your account.\n\u2022 Limitations: Each user is permitted to maintain only one (1) active account. Accounts are non-transferable.',
      },
      {
        heading: '3. Orders, Pricing, and Availability',
        body: '\u2022 Product Availability: All fresh fruits and items listed on the app are subject to availability. We reserve the right to limit the order quantity on any item or discontinue products without notice.\n\u2022 Pricing: All prices are listed in Indian Rupees (INR / \u20B9) and are inclusive of applicable taxes unless stated otherwise. We reserve the right to modify prices at any time without prior notice. The price charged will be the price in effect at the time your order is placed.\n\u2022 Cancellations: Nutriva reserves the right to refuse or cancel any order for reasons including but not limited to product stockouts, errors in pricing/product descriptions, or suspected fraudulent activity.',
      },
      {
        heading: '4. Payments and Billing',
        body: '\u2022 Payment Methods: We accept payments via Unified Payments Interface (UPI), credit cards, debit cards, and net banking.\n\u2022 Processing: Payment is processed securely at the exact time of order placement. You authorize Nutriva (and our third-party payment gateways) to charge your chosen payment method for the total amount of your order.',
      },
      {
        heading: '5. Shipping and Delivery',
        body: '\u2022 Estimates: Estimated delivery windows provided within the app are approximate guidelines only.\n\u2022 Delays: Because we deal with perishable goods, factors such as weather conditions, traffic, logistics, or other unforeseen circumstances may cause delivery delays. Delays due to these external factors do not entitle the user to a refund or compensation.\n\u2022 Perishable Nature: It is the user\'s responsibility to ensure someone is available to receive the fresh produce at the designated delivery address. Nutriva is not responsible for spoiled goods due to missed or delayed receipt by the user.',
      },
      {
        heading: '6. Prohibited Use',
        body: 'You agree not to use the app for any unlawful purpose or in violation of these Terms. Prohibited activities include, but are not limited to:\n\n\u2022 Reselling Nutriva products commercially without explicit, written authorization.\n\u2022 Interfering with, disrupting, or hacking the app\'s servers, networks, or security systems.\n\u2022 Using automated systems (bots, scrapers) to extract data from the app.',
      },
      {
        heading: '7. Limitation of Liability and Disclaimers',
        body: '\u2022 As-Is Basis: The Service and all products delivered are provided on an "as is" and "as available" basis without warranties of any kind.\n\u2022 Liability Cap: To the maximum extent permitted by law, Nutriva, its directors, and employees shall not be liable for any indirect, incidental, special, or consequential damages. Our total liability for any claim arising out of an order is strictly limited to the actual amount paid by you for that specific order.',
      },
      {
        heading: '8. Governing Law and Jurisdiction',
        body: 'These Terms shall be governed by, construed, and enforced in accordance with the laws of India. Any legal actions, suits, or disputes arising directly or indirectly out of these Terms or the use of the app shall be subject to the exclusive jurisdiction of the courts located in Mumbai, Maharashtra.',
      },
      {
        heading: '9. Changes to Terms',
        body: 'We reserve the right to update or modify these Terms periodically. We will indicate changes by updating the "Last Updated" date at the top of this page. Your continued use of Nutriva following any updates constitutes your explicit acceptance of the revised Terms.',
      },
      {
        heading: '10. Contact Information',
        body: 'For any questions regarding these Terms of Service, please contact our support team within the app or via email.',
      },
    ],
  },
  {
    id: 'refund',
    title: 'Refund & Cancellation',
    icon: 'refresh',
    content: [
      'Cancellation Window \u2014 Orders can be cancelled within 30 minutes of placement for a full refund. After this window, cancellation is subject to a 10% fee.',
      'Quality Issues \u2014 If you receive damaged, rotten, or incorrect items, report within 24 hours with photos. We\'ll issue a full refund or replacement \u2014 no questions asked.',
      'Photo Proof \u2014 For quality claims, please attach clear photos of the issue. This helps us improve our supply chain and process your claim faster.',
      'Refund Timeline \u2014 Refunds are processed within 3-5 business days to the original payment method. UPI refunds may be instant.',
      'Partial Refunds \u2014 If only some items are affected, we refund only those items proportionally.',
      'Bulk Orders \u2014 Bulk and festival pack orders follow the same refund policy. Advance orders can be cancelled up to 48 hours before the scheduled delivery date.',
      'Non-Refundable \u2014 Delivery fees (if applicable), promotional discounts, and gift wrapping charges are non-refundable.',
    ],
  },
  {
    id: 'shipping',
    title: 'Shipping & Delivery',
    icon: 'car',
    content: [
      'Delivery Areas \u2014 We currently deliver across select pin codes in Mumbai, Pune, Bangalore, Delhi NCR, and Hyderabad. Check availability at checkout.',
      'Delivery Slots \u2014 Choose from Morning (9 AM \u2013 12 PM), Afternoon (12 PM \u2013 4 PM), or Evening (4 PM \u2013 8 PM) slots.',
      'Advance Orders \u2014 Schedule deliveries up to 7 days in advance. Perfect for events and festivals.',
      'Free Delivery \u2014 Orders above \u20B9499 qualify for free delivery. A flat \u20B949 delivery fee applies to smaller orders.',
      'Packaging \u2014 We use insulated, eco-friendly packaging to maintain freshness. All packaging is recyclable or compostable.',
      'Contactless Delivery \u2014 Request contactless delivery at checkout. Your order will be placed at your door with photo confirmation.',
      'Live Tracking \u2014 Track your delivery in real-time via the Orders tab. You\'ll receive push notifications at each stage.',
      'Weather Delays \u2014 Extreme weather may cause delivery delays. We\'ll notify you proactively and offer rescheduling options.',
    ],
  },
];

export default function AboutScreen() {
  const d = useDynamic();

  const router = useRouter();
  const params = useLocalSearchParams<{ section?: string }>();
  const initialSection = (['privacy', 'terms', 'refund', 'shipping'].includes(params.section || '')
    ? params.section as Section
    : 'story');
  const [activeSection, setActiveSection] = useState<Section>(initialSection);
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
    <View style={[s.container, { backgroundColor: d.bg }]}>
      <SEOHead {...PAGE_SEO.about} />
      {/* Header */}
      <View style={s.header}>
        <Pressable style={[s.backBtn, { backgroundColor: d.accentLight, borderColor: d.border }]} onPress={() => router.replace('/(tabs)/profile')}>
          <Ionicons name="arrow-back" size={22} color={d.text} />
        </Pressable>
        <Text style={[s.headerTitle, { color: d.text }]}>About</Text>
        <Text style={[s.headerVersion, { color: d.textMuted, backgroundColor: d.accentLight, borderColor: d.border }]}>v{APP_VERSION}</Text>
      </View>

      {/* Section Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabBar} contentContainerStyle={s.tabBarContent}>
        <Pressable style={[s.tab, activeSection === 'story' && s.tabActive, activeSection !== 'story' && { backgroundColor: d.accentLight, borderColor: d.border }]} onPress={() => setActiveSection('story')}>
          <Ionicons name="sparkles" size={14} color={activeSection === 'story' ? '#fff' : d.textMuted} />
          <Text style={[s.tabText, activeSection === 'story' && s.tabTextActive, activeSection !== 'story' && { color: d.textMuted }]}>Our Story</Text>
        </Pressable>
        {POLICIES.map((p) => (
          <Pressable key={p.id} style={[s.tab, activeSection === p.id && s.tabActive, activeSection !== p.id && { backgroundColor: d.accentLight, borderColor: d.border }]} onPress={() => setActiveSection(p.id)}>
            <Ionicons name={p.icon as any} size={14} color={activeSection === p.id ? '#fff' : d.textMuted} />
            <Text style={[s.tabText, activeSection === p.id && s.tabTextActive, activeSection !== p.id && { color: d.textMuted }]}>{p.title}</Text>
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
                  <Image source={require('../assets/images/nutriva-02.png')} style={{ width: 80, height: 80 }} resizeMode="contain" />
                </View>
              </View>
              <Text style={[s.brandName, { color: d.accent }]}>Nutriva</Text>
              <Text style={[s.brandTagline, { color: d.textMuted }]}>The Editorial Orchard</Text>
              <Text style={[s.brandDesc, { color: d.textSecondary }]}>
                {brandDesc}
              </Text>
            </View>

            {/* Stats */}
            <View style={s.statsRow}>
              {dynamicStats.map((stat: any, idx: number) => (
                <View key={idx} style={[s.statCard, { backgroundColor: d.cardBg, borderColor: d.border }]}>
                  <Text style={s.statEmoji}>{stat.icon}</Text>
                  <Text style={[s.statNum, { color: d.accent }]}>{stat.num}</Text>
                  <Text style={[s.statLabel, { color: d.textMuted }]}>{stat.label}</Text>
                </View>
              ))}
            </View>

            {/* How We Work */}
            <Text style={[s.sectionTitle, { color: d.text }]}>How We Work</Text>
            {dynamicSteps.map((item: any, i: number) => (
              <View key={i} style={[s.howCard, { backgroundColor: d.cardBg, borderColor: d.border }]}>
                <View style={s.howNum}>
                  <Text style={s.howNumText}>{i + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={s.howHeader}>
                    <Ionicons name={(item.icon || 'star') as any} size={18} color={d.accent} />
                    <Text style={[s.howTitle, { color: d.text }]}>{item.name}</Text>
                  </View>
                  <Text style={[s.howDesc, { color: d.textMuted }]}>{item.desc}</Text>
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
            <Text style={[s.sectionTitle, { color: d.text }]}>Policies & Legal</Text>
            {POLICIES.map((p) => (
              <Pressable key={p.id} style={[s.policyLink, { borderBottomColor: d.border }]} onPress={() => setActiveSection(p.id)}>
                <View style={[s.policyIcon, { backgroundColor: d.accentLight, borderColor: d.border }]}>
                  <Ionicons name={p.icon as any} size={18} color={d.accent} />
                </View>
                <Text style={[s.policyLinkText, { color: d.text }]}>{p.title}</Text>
                <Ionicons name="chevron-forward" size={16} color={d.textDim} />
              </Pressable>
            ))}
          </>
        )}

        {/* ═══ POLICY PAGES ═══ */}
        {dynamicPolicies.map((policy) => (
          activeSection === policy.id && (
            <View key={policy.id}>
              <View style={s.policyHeader}>
                <View style={[s.policyHeaderIcon, { backgroundColor: d.accentLight, borderColor: d.border }]}>
                  <Ionicons name={policy.icon as any} size={28} color={d.accent} />
                </View>
                <Text style={[s.policyTitle, { color: d.text }]}>{policy.title}</Text>
                <Text style={[s.policyUpdated, { color: d.textDim }]}>Last updated: {new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</Text>
              </View>

              {/* Intro paragraph */}
              {policy.intro && (
                <View style={[s.policyIntro, { backgroundColor: d.cardBg, borderColor: d.border }]}>
                  <Text style={[s.policyIntroText, { color: d.textSecondary }]}>{policy.intro}</Text>
                </View>
              )}

              {policy.content.map((item, i) => (
                <View key={i} style={[s.policyItem, { backgroundColor: d.cardBg, borderColor: d.border }]}>
                  {typeof item === 'string' ? (
                    <Text style={[s.policyText, { color: d.textSecondary }]}>{item}</Text>
                  ) : (
                    <>
                      <Text style={[s.policySectionHeading, { color: d.text }]}>{item.heading}</Text>
                      <Text style={[s.policyText, { color: d.textSecondary }]}>{item.body}</Text>
                    </>
                  )}
                </View>
              ))}

              <View style={[s.policyFooter, { borderTopColor: d.border }]}>
                <Ionicons name="mail-outline" size={16} color={d.accent} />
                <Text style={[s.policyFooterText, { color: d.accent }]}>Questions? Contact us at {supportEmail}</Text>
              </View>
            </View>
          )
        ))}

        {/* Footer */}
        <View style={s.footer}>
          <Text style={s.footerEmoji}>🍃</Text>
          <Text style={[s.footerText, { color: d.textMuted }]}>Made with love for fresh fruit lovers</Text>
          <Text style={[s.footerCopy, { color: d.textDim }]}>© {new Date().getFullYear()} Nutriva. All rights reserved.</Text>
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
  tabBar: { flexShrink: 0, borderBottomWidth: 1, borderBottomColor: 'rgba(46, 125, 50, 0.06)', paddingVertical: spacing.sm },
  tabBarContent: { paddingHorizontal: spacing.lg, gap: 8, alignItems: 'center' },
  tab: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 22,
    backgroundColor: 'rgba(46, 125, 50, 0.05)',
    borderWidth: 1, borderColor: 'rgba(46, 125, 50, 0.15)',
  },
  tabActive: { backgroundColor: '#2E7D32', borderColor: '#2E7D32' },
  tabText: { fontSize: 13, fontWeight: '600', color: 'rgba(27, 60, 18, 0.55)' },
  tabTextActive: { color: '#FFFFFF' },

  scroll: { paddingHorizontal: spacing.lg, paddingTop: spacing.xl },

  // Brand Hero
  brandHero: { alignItems: 'center', marginBottom: spacing['2xl'] },
  logoWrap: { position: 'relative', marginBottom: spacing.lg },
  logoPulse: { position: 'absolute', width: 88, height: 88, borderRadius: 44, backgroundColor: 'transparent', top: -4, left: -4 },
  logo: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'center',
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
  policyIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(46, 125, 50, 0.15)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(46, 125, 50, 0.10)' },
  policyLinkText: { flex: 1, fontSize: 15, fontWeight: '600', color: '#2E4A26' },

  // Policy Page
  policyHeader: { alignItems: 'center', marginBottom: spacing.xl },
  policyHeaderIcon: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: 'rgba(46, 125, 50, 0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: spacing.base,
    borderWidth: 1, borderColor: 'rgba(129,199,132,0.2)',
  },
  policyTitle: { fontSize: 22, fontWeight: '700', color: '#1B3C12' },
  policyUpdated: { fontSize: 11, color: 'rgba(27, 60, 18, 0.35)', marginTop: 4 },
  policyIntro: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)', borderRadius: 14,
    padding: spacing.lg, marginBottom: spacing.lg,
    borderWidth: 1, borderColor: 'rgba(46, 125, 50, 0.06)',
  },
  policyIntroText: { fontSize: 14, lineHeight: 22, color: '#2E4A26', fontStyle: 'italic' },
  policyItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)', borderRadius: 14,
    padding: spacing.lg, marginBottom: spacing.sm,
    borderWidth: 1, borderColor: 'rgba(46, 125, 50, 0.15)',
  },
  policySectionHeading: {
    fontSize: 15, fontWeight: '700', color: '#1B3C12',
    marginBottom: 8, letterSpacing: -0.2,
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
