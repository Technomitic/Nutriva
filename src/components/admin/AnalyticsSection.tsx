/**
 * Nutriva — Admin Analytics Section
 * Visual analytics dashboard with revenue chart, top products, and order breakdown
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing, radius } from '../../theme';
import { useAdminStore } from '../../stores/adminStore';

const STATUS_COLORS: Record<string, string> = {
  'Placed': '#FFA726',
  'Awaiting Confirmation': '#FF7043',
  'Payment Pending': '#EF5350',
  'Confirmed': '#42A5F5',
  'Packed': '#AB47BC',
  'Out for Delivery': '#29B6F6',
  'Delivered': '#66BB6A',
  'Cancelled': '#BDBDBD',
};

export default function AnalyticsSection() {
  const allOrders = useAdminStore((s) => s.allOrders);
  
  // Compute analytics from orders data directly (not via selectors that return new arrays)
  const revenueByDay = React.useMemo(() => {
    const now = new Date();
    const result: { date: string; revenue: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);
      const revenue = allOrders
        .filter((o) => {
          const t = new Date(o.created_at);
          return t >= dayStart && t < dayEnd && o.status !== 'Cancelled';
        })
        .reduce((sum, o) => sum + (o.total || 0), 0);
      result.push({ date: dateStr, revenue });
    }
    return result;
  }, [allOrders]);

  const topProducts = React.useMemo(() => {
    const orders = allOrders.filter((o) => o.status !== 'Cancelled');
    const map: Record<string, { count: number; revenue: number }> = {};
    orders.forEach((o) => {
      const items = Array.isArray(o.items) ? o.items : [];
      items.forEach((item) => {
        if (!map[item.name]) map[item.name] = { count: 0, revenue: 0 };
        map[item.name].count += item.qty;
        map[item.name].revenue += item.price * item.qty;
      });
    });
    return Object.entries(map)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [allOrders]);

  const ordersByStatus = React.useMemo(() => {
    const map: Record<string, number> = {};
    allOrders.forEach((o) => { map[o.status] = (map[o.status] || 0) + 1; });
    return Object.entries(map).map(([status, count]) => ({ status, count }));
  }, [allOrders]);

  const maxRevenue = Math.max(...revenueByDay.map((d) => d.revenue), 1);
  const totalOrders = ordersByStatus.reduce((s, o) => s + o.count, 0);

  return (
    <View style={st.container}>
      <Text style={st.title}>📊 Analytics</Text>

      {/* Revenue Chart */}
      <View style={st.card}>
        <Text style={st.cardTitle}>Revenue (Last 7 Days)</Text>
        <View style={st.chart}>
          {revenueByDay.map((day) => (
            <View key={day.date} style={st.barCol}>
              <Text style={st.barValue}>
                {day.revenue > 0 ? `₹${(day.revenue / 1000).toFixed(1)}k` : ''}
              </Text>
              <View
                style={[
                  st.bar,
                  { height: Math.max(4, (day.revenue / maxRevenue) * 100) },
                ]}
              />
              <Text style={st.barLabel}>{day.date}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Top Products */}
      <View style={st.card}>
        <Text style={st.cardTitle}>Top Products</Text>
        {topProducts.length === 0 ? (
          <Text style={st.emptyText}>No data yet</Text>
        ) : (
          topProducts.map((p, i) => {
            const barWidth = (p.revenue / (topProducts[0]?.revenue || 1)) * 100;
            return (
              <View key={p.name} style={st.productRow}>
                <Text style={st.productRank}>{i + 1}</Text>
                <View style={st.productInfo}>
                  <Text style={st.productName} numberOfLines={1}>{p.name}</Text>
                  <View style={st.productBarTrack}>
                    <View style={[st.productBar, { width: `${barWidth}%` }]} />
                  </View>
                </View>
                <View style={st.productStats}>
                  <Text style={st.productRevenue}>₹{p.revenue.toLocaleString()}</Text>
                  <Text style={st.productCount}>{p.count} sold</Text>
                </View>
              </View>
            );
          })
        )}
      </View>

      {/* Order Status Breakdown */}
      <View style={st.card}>
        <Text style={st.cardTitle}>Order Breakdown</Text>
        <View style={st.statusGrid}>
          {ordersByStatus.map((item) => (
            <View key={item.status} style={st.statusItem}>
              <View style={[st.statusDot, { backgroundColor: STATUS_COLORS[item.status] || '#999' }]} />
              <Text style={st.statusLabel}>{item.status}</Text>
              <Text style={st.statusCount}>{item.count}</Text>
              <Text style={st.statusPct}>
                {totalOrders > 0 ? `${Math.round((item.count / totalOrders) * 100)}%` : '0%'}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  title: {
    fontSize: 20, fontWeight: '700', color: '#1B3C12',
    marginBottom: spacing.lg,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 18, padding: spacing.lg, marginBottom: spacing.lg,
    borderWidth: 1, borderColor: 'rgba(46,125,50,0.08)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  cardTitle: {
    fontSize: 15, fontWeight: '700', color: '#2E4A26',
    marginBottom: spacing.base,
  },
  emptyText: { fontSize: 13, color: 'rgba(27,60,18,0.4)' },

  // Revenue Chart
  chart: {
    flexDirection: 'row', alignItems: 'flex-end',
    justifyContent: 'space-between', height: 130, gap: 4,
  },
  barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  bar: {
    width: '70%', minWidth: 16, borderRadius: 6,
    backgroundColor: '#43A047',
  },
  barValue: {
    fontSize: 9, fontWeight: '600', color: '#43A047', marginBottom: 4,
  },
  barLabel: {
    fontSize: 9, color: 'rgba(27,60,18,0.4)', marginTop: 6,
    textAlign: 'center',
  },

  // Top Products
  productRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: 'rgba(46,125,50,0.04)',
  },
  productRank: {
    width: 20, fontSize: 13, fontWeight: '800', color: 'rgba(27,60,18,0.3)',
    textAlign: 'center',
  },
  productInfo: { flex: 1 },
  productName: { fontSize: 13, fontWeight: '600', color: '#2E4A26', marginBottom: 4 },
  productBarTrack: {
    height: 4, borderRadius: 2, backgroundColor: 'rgba(46,125,50,0.06)',
    overflow: 'hidden',
  },
  productBar: {
    height: '100%', borderRadius: 2, backgroundColor: '#66BB6A',
  },
  productStats: { alignItems: 'flex-end' },
  productRevenue: { fontSize: 13, fontWeight: '700', color: '#2E7D32' },
  productCount: { fontSize: 10, color: 'rgba(27,60,18,0.4)' },

  // Status Breakdown
  statusGrid: { gap: 6 },
  statusItem: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 6,
  },
  statusDot: {
    width: 10, height: 10, borderRadius: 5,
  },
  statusLabel: { flex: 1, fontSize: 13, fontWeight: '500', color: '#2E4A26' },
  statusCount: { fontSize: 14, fontWeight: '700', color: '#1B3C12', width: 36, textAlign: 'right' },
  statusPct: { fontSize: 11, color: 'rgba(27,60,18,0.4)', width: 36, textAlign: 'right' },
});
