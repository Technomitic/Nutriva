/**
 * Fresh — Advance Order Screen
 * Dedicated screen: Calendar → Pick products → Choose time → Place advance order
 */

import { useState, useMemo, useEffect } from 'react';
import {
  View, Text, ScrollView, Pressable, Image,
  StyleSheet, ActivityIndicator, Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius } from '../src/theme';
import { products } from '../src/data/products';
import { useAuthStore } from '../src/stores/authStore';
import { useOrderStore } from '../src/stores/orderStore';
import { useUIStore } from '../src/stores/uiStore';
import { Product } from '../src/types';
import { supabase } from '../src/api/supabase';

const { width: SW } = Dimensions.get('window');
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const SLOTS = [
  { id: 'morning', label: '9 AM – 12 PM', icon: 'sunny-outline' as const, sub: 'Morning' },
  { id: 'afternoon', label: '12 PM – 4 PM', icon: 'partly-sunny-outline' as const, sub: 'Afternoon' },
  { id: 'evening', label: '4 PM – 8 PM', icon: 'moon-outline' as const, sub: 'Evening' },
];

type Step = 'date' | 'products' | 'review';

export default function AdvanceOrderScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const placeOrder = useOrderStore((s) => s.placeOrder);
  const showToast = useUIStore((s) => s.showToast);

  const [step, setStep] = useState<Step>('date');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState('morning');
  const [cart, setCart] = useState<Record<string, number>>({});
  const [placing, setPlacing] = useState(false);
  const [calMonth, setCalMonth] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  // Calendar data
  const calendarDays = useMemo(() => {
    const { year, month } = calMonth;
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const days: { date: string; day: number; isToday: boolean; isPast: boolean; isCurrentMonth: boolean }[] = [];

    // Empty slots for days before month starts
    for (let i = 0; i < firstDay; i++) {
      days.push({ date: '', day: 0, isToday: false, isPast: true, isCurrentMonth: false });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      date.setHours(0, 0, 0, 0);
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        date: dateStr,
        day: d,
        isToday: date.getTime() === today.getTime(),
        isPast: date <= today, // Can't order for today or past
        isCurrentMonth: true,
      });
    }
    return days;
  }, [calMonth]);

  const navigateMonth = (dir: number) => {
    setCalMonth((prev) => {
      let m = prev.month + dir;
      let y = prev.year;
      if (m > 11) { m = 0; y++; }
      if (m < 0) { m = 11; y--; }
      return { year: y, month: m };
    });
  };

  // Fetch active products from Supabase
  const [activeProducts, setActiveProducts] = useState<Product[]>(products.filter((p) => p.active !== false));
  useEffect(() => {
    if (!supabase) return;
    const load = async () => {
      const { data } = await supabase
        .from('products')
        .select('*')
        .or('active.eq.true,active.is.null')
        .order('name', { ascending: true });
      if (data && data.length > 0) {
        const merged = data.map((dbProd: any) => {
          const local = products.find((p) => p.id === dbProd.id);
          return { ...dbProd, image: local?.image || products[0].image } as Product;
        });
        setActiveProducts(merged);
      }
    };
    load();
  }, []);

  const addToCart = (id: string) => setCart((c) => ({ ...c, [id]: (c[id] || 0) + 1 }));
  const removeFromCart = (id: string) => setCart((c) => {
    const qty = (c[id] || 0) - 1;
    if (qty <= 0) { const { [id]: _, ...rest } = c; return rest; }
    return { ...c, [id]: qty };
  });

  const cartItems = Object.entries(cart).filter(([, qty]) => qty > 0);
  const cartTotal = cartItems.reduce((sum, [id, qty]) => {
    const p = products.find((pr) => pr.id === id);
    return sum + (p?.price || 0) * qty;
  }, 0);

  const selectedDateObj = selectedDate ? new Date(selectedDate) : null;
  const formattedDate = selectedDateObj
    ? selectedDateObj.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : '';

  const handlePlaceOrder = async () => {
    if (!user) { showToast('Please sign in first'); router.push('/(auth)/login'); return; }
    if (cartItems.length === 0 || !selectedDate) return;
    setPlacing(true);
    try {
      await placeOrder({
        userId: user.id,
        customerName: user.name,
        items: cartItems.map(([id, qty]) => {
          const p = products.find((pr) => pr.id === id)!;
          return { product_id: id, name: p.name, qty, price: p.price, image: p.image };
        }),
        total: cartTotal,
        address: user.address || '42 Orchard Lane, Green Valley',
        is_advance: true,
        delivery_date: selectedDate,
        delivery_slot: selectedSlot,
      });
      showToast('Advance order placed! 📅🎉');
      router.push('/(tabs)/orders');
    } catch (err: any) {
      showToast(err.message || 'Failed to place order');
    } finally {
      setPlacing(false);
    }
  };

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <Pressable style={s.backBtn} onPress={() => router.replace('/(tabs)')}>

          <Ionicons name="arrow-back" size={22} color="#1B3C12" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Advance Order</Text>
          <Text style={s.headerSub}>Schedule your delivery in advance</Text>
        </View>
      </View>

      {/* Steps indicator */}
      <View style={s.steps}>
        {(['date', 'products', 'review'] as Step[]).map((st, i) => (
          <View key={st} style={s.stepRow}>
            <View style={[s.stepDot, step === st && s.stepDotActive, (['date', 'products', 'review'].indexOf(step) > i) && s.stepDotDone]}>
              <Text style={[s.stepNum, (step === st || ['date', 'products', 'review'].indexOf(step) > i) && s.stepNumActive]}>
                {['date', 'products', 'review'].indexOf(step) > i ? '✓' : i + 1}
              </Text>
            </View>
            <Text style={[s.stepLabel, step === st && s.stepLabelActive]}>
              {st === 'date' ? 'Date & Slot' : st === 'products' ? 'Products' : 'Review'}
            </Text>
            {i < 2 && <View style={[s.stepLine, ['date', 'products', 'review'].indexOf(step) > i && s.stepLineDone]} />}
          </View>
        ))}
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {/* ═══ STEP 1: CALENDAR ═══ */}
        {step === 'date' && (
          <View style={s.section}>
            {/* Calendar */}
            <View style={s.calendar}>
              <View style={s.calHeader}>
                <Pressable onPress={() => navigateMonth(-1)}>
                  <Ionicons name="chevron-back" size={22} color="#2E7D32" />
                </Pressable>
                <Text style={s.calTitle}>{MONTHS[calMonth.month]} {calMonth.year}</Text>
                <Pressable onPress={() => navigateMonth(1)}>
                  <Ionicons name="chevron-forward" size={22} color="#2E7D32" />
                </Pressable>
              </View>

              <View style={s.calWeekdays}>
                {WEEKDAYS.map((d) => (
                  <Text key={d} style={s.calWeekday}>{d}</Text>
                ))}
              </View>

              <View style={s.calGrid}>
                {calendarDays.map((day, i) => (
                  <Pressable
                    key={i}
                    style={[
                      s.calDay,
                      day.isPast && s.calDayPast,
                      day.isToday && s.calDayToday,
                      selectedDate === day.date && s.calDaySelected,
                    ]}
                    disabled={day.isPast || !day.isCurrentMonth}
                    onPress={() => day.date && setSelectedDate(day.date)}
                  >
                    {day.isCurrentMonth && (
                      <Text style={[
                        s.calDayText,
                        day.isPast && s.calDayTextPast,
                        selectedDate === day.date && s.calDayTextSelected,
                      ]}>
                        {day.day}
                      </Text>
                    )}
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Time Slots */}
            <Text style={s.slotTitle}>Delivery Slot</Text>
            {SLOTS.map((slot) => (
              <Pressable
                key={slot.id}
                style={[s.slotCard, selectedSlot === slot.id && s.slotCardActive]}
                onPress={() => setSelectedSlot(slot.id)}
              >
                <View style={[s.slotIcon, selectedSlot === slot.id && s.slotIconActive]}>
                  <Ionicons name={slot.icon} size={22} color={selectedSlot === slot.id ? '#FFFFFF' : '#2E7D32'} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.slotSub, selectedSlot === slot.id && { color: '#FFFFFF' }]}>{slot.sub}</Text>
                  <Text style={[s.slotLabel, selectedSlot === slot.id && { color: '#FFFFFF', opacity: 0.8 }]}>{slot.label}</Text>
                </View>
                {selectedSlot === slot.id && (
                  <Ionicons name="checkmark-circle" size={22} color="#FFFFFF" />
                )}
              </Pressable>
            ))}

            {/* Next */}
            <Pressable
              style={[s.primaryBtn, !selectedDate && { opacity: 0.5 }]}
              disabled={!selectedDate}
              onPress={() => setStep('products')}
            >
              <Text style={s.primaryBtnText}>Choose Products →</Text>
            </Pressable>
          </View>
        )}

        {/* ═══ STEP 2: PRODUCTS ═══ */}
        {step === 'products' && (
          <View style={s.section}>
            <View style={s.dateReminder}>
              <Ionicons name="calendar" size={18} color="#2E7D32" />
              <Text style={s.dateReminderText}>{formattedDate} · {SLOTS.find((sl) => sl.id === selectedSlot)?.sub}</Text>
              <Pressable onPress={() => setStep('date')}>
                <Text style={s.dateReminderEdit}>Change</Text>
              </Pressable>
            </View>

            <Text style={s.prodSectionTitle}>Select Products</Text>

            <View style={s.prodGrid}>
              {activeProducts.map((product) => {
                const qty = cart[product.id] || 0;
                return (
                  <View key={product.id} style={s.prodCard}>
                    <View style={s.prodImgWrap}>
                      <Image source={product.image} style={s.prodImg} resizeMode="contain" />
                    </View>
                    <Text style={s.prodName} numberOfLines={1}>{product.name}</Text>
                    <Text style={s.prodPrice}>₹{product.price}{product.unit}</Text>
                    {qty === 0 ? (
                      <Pressable style={s.prodAddBtn} onPress={() => addToCart(product.id)}>
                        <Ionicons name="add" size={18} color="#FFFFFF" />
                        <Text style={s.prodAddText}>Add</Text>
                      </Pressable>
                    ) : (
                      <View style={s.prodQtyRow}>
                        <Pressable style={s.prodQtyBtn} onPress={() => removeFromCart(product.id)}>
                          <Ionicons name="remove" size={16} color="#2E7D32" />
                        </Pressable>
                        <Text style={s.prodQtyText}>{qty}</Text>
                        <Pressable style={s.prodQtyBtn} onPress={() => addToCart(product.id)}>
                          <Ionicons name="add" size={16} color="#2E7D32" />
                        </Pressable>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>

            {/* Cart summary + Next */}
            {cartItems.length > 0 && (
              <Pressable style={s.primaryBtn} onPress={() => setStep('review')}>
                <Text style={s.primaryBtnText}>{cartItems.length} items · ₹{cartTotal.toLocaleString()} → Review Order</Text>
              </Pressable>
            )}
          </View>
        )}

        {/* ═══ STEP 3: REVIEW ═══ */}
        {step === 'review' && (
          <View style={s.section}>
            <View style={s.reviewCard}>
              <View style={s.reviewRow}>
                <Ionicons name="calendar" size={20} color="#2E7D32" />
                <View style={{ flex: 1 }}>
                  <Text style={s.reviewLabel}>Delivery Date</Text>
                  <Text style={s.reviewValue}>{formattedDate}</Text>
                </View>
              </View>
              <View style={s.reviewRow}>
                <Ionicons name={SLOTS.find((sl) => sl.id === selectedSlot)?.icon || 'time'} size={20} color="#2E7D32" />
                <View style={{ flex: 1 }}>
                  <Text style={s.reviewLabel}>Time Slot</Text>
                  <Text style={s.reviewValue}>{SLOTS.find((sl) => sl.id === selectedSlot)?.label}</Text>
                </View>
              </View>
            </View>

            <Text style={s.reviewItemsTitle}>Order Items</Text>
            {cartItems.map(([id, qty]) => {
              const p = products.find((pr) => pr.id === id)!;
              return (
                <View key={id} style={s.reviewItem}>
                  <Image source={p.image} style={s.reviewItemImg} resizeMode="contain" />
                  <View style={{ flex: 1 }}>
                    <Text style={s.reviewItemName}>{p.name}</Text>
                    <Text style={s.reviewItemMeta}>{p.variety} · ×{qty}</Text>
                  </View>
                  <Text style={s.reviewItemPrice}>₹{(p.price * qty).toLocaleString()}</Text>
                </View>
              );
            })}

            <View style={s.reviewTotalRow}>
              <Text style={s.reviewTotalLabel}>Total</Text>
              <Text style={s.reviewTotalValue}>₹{cartTotal.toLocaleString()}</Text>
            </View>

            <Pressable
              style={[s.primaryBtn, s.placeBtn, placing && { opacity: 0.7 }]}
              onPress={handlePlaceOrder}
              disabled={placing}
            >
              {placing ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="calendar-outline" size={20} color="#FFFFFF" />
                  <Text style={s.primaryBtnText}>Schedule Advance Order</Text>
                </>
              )}
            </Pressable>

            <Pressable style={s.backStepBtn} onPress={() => setStep('products')}>
              <Text style={s.backStepText}>← Back to Products</Text>
            </Pressable>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// ═══════════════ STYLES ═══════════════
const CELL = (Math.min(SW, 430) - spacing.lg * 2) / 7;

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7F5' },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.base,
    paddingHorizontal: spacing.lg, paddingTop: spacing['2xl'], paddingBottom: spacing.base,
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(46, 125, 50, 0.06)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(46, 125, 50, 0.10)' },
  headerTitle: { fontSize: 22, fontWeight: '700', letterSpacing: -0.5, color: '#1B3C12' },
  headerSub: { fontSize: 12, color: 'rgba(27, 60, 18, 0.5)', marginTop: 2 },

  // Steps
  steps: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl, paddingVertical: spacing.base },
  stepRow: { flexDirection: 'row', alignItems: 'center' },
  stepDot: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(46, 125, 50, 0.06)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(46, 125, 50, 0.10)' },
  stepDotActive: { backgroundColor: '#2E7D32', borderColor: 'rgba(46, 125, 50, 0.22)' },
  stepDotDone: { backgroundColor: '#43A047', borderColor: '#43A047' },
  stepNum: { fontSize: 12, fontWeight: '700', color: 'rgba(27, 60, 18, 0.5)' },
  stepNumActive: { color: '#FFFFFF' },
  stepLabel: { fontSize: 11, fontWeight: '500', color: 'rgba(27, 60, 18, 0.5)', marginLeft: 6 },
  stepLabelActive: { color: '#2E7D32', fontWeight: '700' },
  stepLine: { width: 24, height: 2, backgroundColor: 'rgba(46, 125, 50, 0.10)', marginHorizontal: 8 },
  stepLineDone: { backgroundColor: '#43A047' },

  section: { paddingHorizontal: spacing.lg },

  // Calendar
  calendar: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)', borderRadius: 20,
    padding: spacing.lg, marginBottom: spacing.xl,
    borderWidth: 1, borderColor: 'rgba(46, 125, 50, 0.12)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 16, elevation: 4,
  },
  calHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg },
  calTitle: { fontSize: 18, fontWeight: '700', color: '#1B3C12' },
  calWeekdays: { flexDirection: 'row' },
  calWeekday: { width: CELL, textAlign: 'center', fontSize: 11, fontWeight: '600', color: 'rgba(27, 60, 18, 0.5)', marginBottom: 8 },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calDay: { width: CELL, height: CELL, alignItems: 'center', justifyContent: 'center', borderRadius: CELL / 2 },
  calDayPast: { opacity: 0.3 },
  calDayToday: { borderWidth: 2, borderColor: 'rgba(46, 125, 50, 0.2)' },
  calDaySelected: { backgroundColor: '#2E7D32' },
  calDayText: { fontSize: 15, fontWeight: '500', color: '#2E4A26' },
  calDayTextPast: { color: 'rgba(27, 60, 18, 0.35)' },
  calDayTextSelected: { color: '#FFFFFF', fontWeight: '700' },

  // Slots
  slotTitle: { fontSize: 16, fontWeight: '700', marginBottom: spacing.base, color: '#1B3C12' },
  slotCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14, padding: spacing.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.7)', borderRadius: 16,
    borderWidth: 1.5, borderColor: 'rgba(46, 125, 50, 0.08)', marginBottom: spacing.sm,
  },
  slotCardActive: { borderColor: 'rgba(46, 125, 50, 0.22)', backgroundColor: '#2E7D32' },
  slotIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(46, 125, 50, 0.08)', alignItems: 'center', justifyContent: 'center' },
  slotIconActive: { backgroundColor: 'rgba(46, 125, 50, 0.10)' },
  slotSub: { fontSize: 14, fontWeight: '600', color: '#2E4A26' },
  slotLabel: { fontSize: 12, color: 'rgba(27, 60, 18, 0.5)', marginTop: 2 },

  // Buttons
  primaryBtn: {
    backgroundColor: '#2E7D32', paddingVertical: 16,
    borderRadius: radius.full, alignItems: 'center', justifyContent: 'center',
    marginTop: spacing.xl, flexDirection: 'row', gap: 8,
    borderWidth: 1, borderColor: 'rgba(46, 125, 50, 0.18)',
  },
  primaryBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  placeBtn: { backgroundColor: 'rgba(46, 125, 50, 0.12)' },
  backStepBtn: { alignItems: 'center', marginTop: spacing.lg },
  backStepText: { color: '#2E7D32', fontSize: 14, fontWeight: '600' },

  // Date reminder
  dateReminder: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(46, 125, 50, 0.06)', borderRadius: radius.md, padding: 12, marginBottom: spacing.xl,
    borderWidth: 1, borderColor: 'rgba(46, 125, 50, 0.08)',
  },
  dateReminderText: { flex: 1, fontSize: 13, fontWeight: '500', color: '#2E7D32' },
  dateReminderEdit: { fontSize: 12, fontWeight: '700', color: '#43A047' },

  // Products
  prodSectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: spacing.lg, color: '#1B3C12' },
  prodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  prodCard: {
    width: (Math.min(SW, 430) - spacing.lg * 2 - spacing.sm * 2) / 3,
    backgroundColor: 'rgba(255, 255, 255, 0.7)', borderRadius: 14,
    padding: spacing.sm, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(46, 125, 50, 0.08)',
  },
  prodImgWrap: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  prodImg: { width: 48, height: 48 },
  prodName: { fontSize: 11, fontWeight: '600', textAlign: 'center', marginBottom: 2, color: '#2E4A26' },
  prodPrice: { fontSize: 12, fontWeight: '700', color: '#2E7D32', marginBottom: 6 },
  prodAddBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#2E7D32', paddingVertical: 5, paddingHorizontal: 12,
    borderRadius: radius.full, borderWidth: 1, borderColor: 'rgba(46, 125, 50, 0.18)',
  },
  prodAddText: { color: '#FFFFFF', fontSize: 11, fontWeight: '600' },
  prodQtyRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  prodQtyBtn: { width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(46, 125, 50, 0.06)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(46, 125, 50, 0.10)' },
  prodQtyText: { fontSize: 14, fontWeight: '700', minWidth: 14, textAlign: 'center', color: '#2E4A26' },

  // Review
  reviewCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)', borderRadius: 20,
    padding: spacing.lg, gap: spacing.lg, marginBottom: spacing.xl,
    borderWidth: 1, borderColor: 'rgba(46, 125, 50, 0.12)',
  },
  reviewRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  reviewLabel: { fontSize: 11, color: 'rgba(27, 60, 18, 0.5)', fontWeight: '500' },
  reviewValue: { fontSize: 14, fontWeight: '600', color: '#2E4A26' },
  reviewItemsTitle: { fontSize: 16, fontWeight: '700', marginBottom: spacing.base, color: '#1B3C12' },
  reviewItem: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.base,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(46, 125, 50, 0.06)',
  },
  reviewItemImg: { width: 40, height: 40 },
  reviewItemName: { fontSize: 14, fontWeight: '600', color: '#2E4A26' },
  reviewItemMeta: { fontSize: 11, color: 'rgba(27, 60, 18, 0.5)', marginTop: 2 },
  reviewItemPrice: { fontSize: 14, fontWeight: '700', color: '#2E7D32' },
  reviewTotalRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: spacing.lg, marginTop: spacing.sm,
  },
  reviewTotalLabel: { fontSize: 16, fontWeight: '700', color: '#1B3C12' },
  reviewTotalValue: { fontSize: 22, fontWeight: '800', color: '#2E7D32' },
});
