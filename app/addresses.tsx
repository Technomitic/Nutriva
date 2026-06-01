/**
 * Fresh — Saved Addresses Screen
 * Users can view, add, and delete delivery addresses
 */

import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, Pressable, TextInput,
  StyleSheet, Platform, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius } from '../src/theme';
import { useAuthStore } from '../src/stores/authStore';
import { useUIStore } from '../src/stores/uiStore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDynamic } from '../src/hooks/useDynamic';

const STORAGE_KEY = 'fresh-addresses';

interface SavedAddress {
  id: string;
  label: string;
  address: string;
  isDefault: boolean;
}

export default function AddressesScreen() {
  const d = useDynamic();

  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const showToast = useUIStore((s) => s.showToast);
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [label, setLabel] = useState('');
  const [address, setAddress] = useState('');

  // Load addresses
  useEffect(() => {
    loadAddresses();
  }, []);

  const loadAddresses = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        setAddresses(JSON.parse(stored));
      }
    } catch {}
  };

  const saveAddresses = async (updated: SavedAddress[]) => {
    setAddresses(updated);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const handleAdd = async () => {
    if (!label.trim() || !address.trim()) {
      showToast('Please fill in both fields');
      return;
    }

    const newAddr: SavedAddress = {
      id: Date.now().toString(),
      label: label.trim(),
      address: address.trim(),
      isDefault: addresses.length === 0,
    };

    await saveAddresses([...addresses, newAddr]);
    setLabel('');
    setAddress('');
    setShowForm(false);
    showToast('Address saved! 📍');
  };

  const handleDelete = (id: string) => {
    const doDelete = () => {
      const updated = addresses.filter((a) => a.id !== id);
      // If we deleted the default, make the first one default
      if (updated.length > 0 && !updated.some((a) => a.isDefault)) {
        updated[0].isDefault = true;
      }
      saveAddresses(updated);
      showToast('Address removed');
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Remove this address?')) doDelete();
    } else {
      Alert.alert('Remove Address', 'Are you sure?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: doDelete },
      ]);
    }
  };

  const handleSetDefault = (id: string) => {
    const updated = addresses.map((a) => ({
      ...a,
      isDefault: a.id === id,
    }));
    saveAddresses(updated);
    showToast('Default address updated');
  };

  return (
    <View style={[styles.container, d.s.screenBg]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#1B3C12" />
        </Pressable>
        <Text style={[styles.headerTitle, d.s.text]}>Saved Addresses</Text>
        <Pressable
          style={styles.addHeaderBtn}
          onPress={() => setShowForm(!showForm)}
        >
          <Ionicons
            name={showForm ? 'close' : 'add'}
            size={22}
            color={'#2E7D32'}
          />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Add Form */}
        {showForm && (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Add New Address</Text>
            <TextInput
              style={styles.input}
              placeholder="Label (e.g. Home, Office)"
              placeholderTextColor={'rgba(27, 60, 18, 0.3)'}
              value={label}
              onChangeText={setLabel}
            />
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              placeholder="Full address with landmark, city, pincode"
              placeholderTextColor={'rgba(27, 60, 18, 0.3)'}
              value={address}
              onChangeText={setAddress}
              multiline
              numberOfLines={3}
            />
            <Pressable style={styles.saveBtn} onPress={handleAdd}>
              <Ionicons name="checkmark" size={18} color="#FFFFFF" />
              <Text style={styles.saveBtnText}>Save Address</Text>
            </Pressable>
          </View>
        )}

        {/* Addresses List */}
        {addresses.length === 0 && !showForm ? (
          <View style={styles.empty}>
            <Ionicons name="location-outline" size={56} color="rgba(27, 60, 18, 0.25)" />
            <Text style={[styles.emptyTitle, d.s.text]}>No saved addresses</Text>
            <Text style={[styles.emptyDesc, d.s.textMuted]}>
              Add your delivery addresses for faster checkout
            </Text>
            <Pressable style={styles.addBtn} onPress={() => setShowForm(true)}>
              <Ionicons name="add" size={18} color="#FFFFFF" />
              <Text style={styles.addBtnText}>Add Address</Text>
            </Pressable>
          </View>
        ) : (
          addresses.map((addr) => (
            <View key={addr.id} style={[styles.addrCard, addr.isDefault && styles.addrCardDefault]}>
              <View style={styles.addrTop}>
                <View style={styles.addrIconWrap}>
                  <Ionicons
                    name={addr.label.toLowerCase().includes('home') ? 'home' :
                          addr.label.toLowerCase().includes('office') ? 'business' : 'location'}
                    size={20}
                    color={addr.isDefault ? '#2E7D32' : 'rgba(165,214,167,0.6)'}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.addrLabelRow}>
                    <Text style={styles.addrLabel}>{addr.label}</Text>
                    {addr.isDefault && (
                      <View style={styles.defaultBadge}>
                        <Text style={styles.defaultBadgeText}>DEFAULT</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.addrText}>{addr.address}</Text>
                </View>
              </View>
              <View style={styles.addrActions}>
                {!addr.isDefault && (
                  <Pressable
                    style={styles.addrActionBtn}
                    onPress={() => handleSetDefault(addr.id)}
                  >
                    <Ionicons name="star-outline" size={16} color="#2E7D32" />
                    <Text style={styles.addrActionText}>Set Default</Text>
                  </Pressable>
                )}
                <Pressable
                  style={styles.addrActionBtn}
                  onPress={() => handleDelete(addr.id)}
                >
                  <Ionicons name="trash-outline" size={16} color="#E53935" />
                  <Text style={[styles.addrActionText, { color: '#E53935' }]}>Remove</Text>
                </Pressable>
              </View>
            </View>
          ))
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7F5' },
  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.base,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.base,
    paddingTop: 48, backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderBottomWidth: 1, borderBottomColor: 'rgba(46, 125, 50, 0.08)',
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(46, 125, 50, 0.06)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(46, 125, 50, 0.10)',
  },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: '#1B3C12' },
  addHeaderBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(46, 125, 50, 0.06)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(46, 125, 50, 0.10)',
  },
  content: { padding: spacing.lg },
  // Form
  formCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)', borderRadius: 18,
    padding: spacing.lg, marginBottom: spacing.lg,
    borderWidth: 1, borderColor: 'rgba(46, 125, 50, 0.12)',
  },
  formTitle: { fontSize: 16, fontWeight: '700', marginBottom: spacing.lg, color: '#1B3C12' },
  input: {
    backgroundColor: 'rgba(46, 125, 50, 0.05)', borderRadius: radius.md,
    paddingHorizontal: spacing.lg, paddingVertical: 14,
    fontSize: 15, color: '#2E4A26', marginBottom: spacing.base,
    borderWidth: 1, borderColor: 'rgba(46, 125, 50, 0.08)',
  },
  inputMultiline: { minHeight: 80, textAlignVertical: 'top' },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#2E7D32', paddingVertical: 14,
    borderRadius: radius.full, marginTop: spacing.sm,
    borderWidth: 1, borderColor: 'rgba(46, 125, 50, 0.18)',
  },
  saveBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  // Empty
  empty: { alignItems: 'center', paddingVertical: spacing['4xl'] },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginTop: spacing.lg, color: '#1B3C12' },
  emptyDesc: { fontSize: 13, color: 'rgba(27, 60, 18, 0.5)', marginTop: 4, textAlign: 'center', maxWidth: 280 },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#2E7D32', paddingVertical: 12, paddingHorizontal: 24,
    borderRadius: radius.full, marginTop: spacing.xl,
    borderWidth: 1, borderColor: 'rgba(46, 125, 50, 0.18)',
  },
  addBtnText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },
  // Address Card
  addrCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)', borderRadius: 16,
    padding: spacing.lg, marginBottom: spacing.base,
    borderWidth: 1.5, borderColor: 'rgba(46, 125, 50, 0.08)',
  },
  addrCardDefault: { borderColor: 'rgba(46, 125, 50, 0.18)' },
  addrTop: { flexDirection: 'row', gap: spacing.base },
  addrIconWrap: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(46, 125, 50, 0.05)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(46, 125, 50, 0.08)',
  },
  addrLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  addrLabel: { fontSize: 15, fontWeight: '600', color: '#2E4A26' },
  defaultBadge: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)', paddingVertical: 2, paddingHorizontal: 8,
    borderRadius: radius.full, borderWidth: 1, borderColor: 'rgba(46, 125, 50, 0.18)',
  },
  defaultBadgeText: { fontSize: 8, fontWeight: '700', color: '#43A047', letterSpacing: 0.5 },
  addrText: { fontSize: 13, color: 'rgba(27, 60, 18, 0.5)', marginTop: 4, lineHeight: 18 },
  addrActions: {
    flexDirection: 'row', gap: spacing.lg, marginTop: spacing.base,
    paddingTop: spacing.base, borderTopWidth: 1, borderTopColor: 'rgba(46, 125, 50, 0.06)',
  },
  addrActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addrActionText: { fontSize: 13, fontWeight: '500', color: '#2E7D32' },
});
