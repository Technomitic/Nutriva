/**
 * Fresh — My Account Screen
 * Edit profile details, change password, upload profile picture
 */

import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet, TextInput,
  ActivityIndicator, Alert, Platform, Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { colors, spacing, radius } from '../src/theme';
import { useAuthStore } from '../src/stores/authStore';
import { useUIStore } from '../src/stores/uiStore';
import { supabase } from '../src/api/supabase';
import { Profile } from '../src/types';
import { useDynamic } from '../src/hooks/useDynamic';

export default function MyAccountScreen() {
  const d = useDynamic();

  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const showToast = useUIStore((s) => s.showToast);

  // Editable fields
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [address, setAddress] = useState(user?.address || '');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Password change
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // State
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Fetch avatar on mount
  useEffect(() => {
    if (!user?.id || !supabase) return;
    fetchAvatar();
  }, [user?.id]);

  const fetchAvatar = async () => {
    if (!supabase || !user?.id) return;
    try {
      // Use signed URL for private bucket (expires in 1 hour)
      const { data, error } = await supabase.storage
        .from('avatars')
        .createSignedUrl(`${user.id}/avatar.jpg`, 3600);
      if (!error && data?.signedUrl) {
        setAvatarUrl(data.signedUrl);
      }
    } catch {
      // Avatar doesn't exist yet — that's fine
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (!result.canceled && result.assets[0]) {
        uploadAvatar(result.assets[0].uri);
      }
    } catch (err) {
      showToast('Could not open gallery');
    }
  };

  const uploadAvatar = async (uri: string) => {
    if (!supabase || !user?.id) return;
    setUploadingAvatar(true);

    try {
      const filePath = `${user.id}/avatar.jpg`;

      // Create FormData — works on both web and React Native
      const formData = new FormData();

      if (Platform.OS === 'web') {
        const response = await fetch(uri);
        const blob = await response.blob();
        formData.append('', blob, 'avatar.jpg');
      } else {
        // React Native: append file object with uri
        formData.append('', {
          uri,
          name: 'avatar.jpg',
          type: 'image/jpeg',
        } as any);
      }

      // Upload via Supabase REST API directly
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token || supabaseKey;

      const uploadResponse = await fetch(
        `${supabaseUrl}/storage/v1/object/avatars/${filePath}`,
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

      if (!uploadResponse.ok) {
        const errBody = await uploadResponse.text();
        throw new Error(errBody || 'Upload failed');
      }

      // Get signed URL for the uploaded file
      const { data: urlData } = await supabase.storage
        .from('avatars')
        .createSignedUrl(filePath, 3600);

      if (urlData?.signedUrl) {
        setAvatarUrl(urlData.signedUrl);
      }
      showToast('Profile photo updated! 📸');
    } catch (err: any) {
      console.warn('Avatar upload error:', err);
      showToast('Failed to upload photo');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!supabase || !user?.id) return;
    setSaving(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          name: name.trim(),
          phone: phone.trim(),
          address: address.trim(),
        })
        .eq('id', user.id);

      if (error) throw error;

      // Update local auth store
      useAuthStore.setState((state) => ({
        user: state.user
          ? { ...state.user, name: name.trim(), phone: phone.trim(), address: address.trim() }
          : null,
      }));

      showToast('Profile updated successfully! ✅');
    } catch (err: any) {
      showToast(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      showToast('Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('Passwords do not match');
      return;
    }
    if (!supabase) return;

    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordSection(false);
      showToast('Password changed successfully! 🔒');
    } catch (err: any) {
      showToast(err.message || 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleDeleteAccount = () => {
    const doDelete = async () => {
      showToast('Account deletion requested. Contact support.');
    };

    if (Platform.OS === 'web') {
      if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
        doDelete();
      }
    } else {
      Alert.alert(
        'Delete Account',
        'Are you sure you want to delete your account? This action cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: doDelete },
        ]
      );
    }
  };

  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Please sign in</Text>
      </View>
    );
  }

  const initial = (name || 'U').charAt(0).toUpperCase();
  const hasChanges =
    name.trim() !== (user.name || '') ||
    phone.trim() !== (user.phone || '') ||
    address.trim() !== (user.address || '');

  return (
    <View style={[styles.container, d.s.screenBg]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.headerBack} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/profile' as any)}>
          <Ionicons name="arrow-back" size={22} color="#1B3C12" />
        </Pressable>
        <Text style={[styles.headerTitle, d.s.text]}>My Account</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>
        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <Pressable style={styles.avatarWrapper} onPress={pickImage} disabled={uploadingAvatar}>
            {avatarUrl ? (
              <Image
                source={{ uri: avatarUrl }}
                style={styles.avatarImage}
                onError={() => setAvatarUrl(null)}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitial}>{initial}</Text>
              </View>
            )}
            <View style={styles.cameraBtn}>
              {uploadingAvatar ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="camera" size={16} color="#fff" />
              )}
            </View>
          </Pressable>
          <Text style={styles.avatarHint}>Tap to change photo</Text>
        </View>

        {/* Profile Info Card */}
        <Text style={styles.sectionTitle}>Personal Information</Text>
        <View style={styles.card}>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Full Name</Text>
            <TextInput
              style={styles.fieldInput}
              value={name}
              onChangeText={setName}
              placeholder="Enter your name"
              placeholderTextColor="rgba(27,60,18,0.25)"
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Email</Text>
            <View style={styles.readOnlyRow}>
              <Ionicons name="lock-closed-outline" size={14} color="rgba(27,60,18,0.3)" />
              <Text style={styles.readOnlyText}>{user.email}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Phone Number</Text>
            <TextInput
              style={styles.fieldInput}
              value={phone}
              onChangeText={setPhone}
              placeholder="Enter phone number"
              placeholderTextColor="rgba(27,60,18,0.25)"
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Default Address</Text>
            <TextInput
              style={[styles.fieldInput, styles.fieldTextArea]}
              value={address}
              onChangeText={setAddress}
              placeholder="Enter your address"
              placeholderTextColor="rgba(27,60,18,0.25)"
              multiline
              numberOfLines={3}
            />
          </View>
        </View>

        {/* Save Button */}
        <Pressable
          style={[styles.saveBtn, !hasChanges && styles.saveBtnDisabled]}
          onPress={handleSaveProfile}
          disabled={saving || !hasChanges}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={18} color="#fff" />
              <Text style={styles.saveBtnText}>Save Changes</Text>
            </>
          )}
        </Pressable>



        {/* Password Section */}
        <Text style={styles.sectionTitle}>Security</Text>
        <View style={styles.card}>
          <Pressable
            style={styles.passwordToggle}
            onPress={() => setShowPasswordSection(!showPasswordSection)}
          >
            <Ionicons name="lock-closed" size={20} color="#2E7D32" />
            <Text style={styles.passwordToggleText}>Change Password</Text>
            <Ionicons
              name={showPasswordSection ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={colors.outline}
            />
          </Pressable>

          {showPasswordSection && (
            <View style={styles.passwordFields}>
              <View style={styles.divider} />
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>New Password</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="Min 6 characters"
                  placeholderTextColor="rgba(27,60,18,0.25)"
                  secureTextEntry
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Confirm Password</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Re-enter password"
                  placeholderTextColor="rgba(27,60,18,0.25)"
                  secureTextEntry
                />
              </View>

              <Pressable
                style={[styles.changePassBtn, (!newPassword || !confirmPassword) && styles.saveBtnDisabled]}
                onPress={handleChangePassword}
                disabled={changingPassword || !newPassword || !confirmPassword}
              >
                {changingPassword ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.changePassBtnText}>Update Password</Text>
                )}
              </Pressable>
            </View>
          )}
        </View>

        {/* Danger Zone */}
        <Text style={[styles.sectionTitle, { color: '#E53935' }]}>Danger Zone</Text>
        <View style={[styles.card, styles.dangerCard]}>
          <Pressable style={styles.deleteBtn} onPress={handleDeleteAccount}>
            <Ionicons name="trash-outline" size={18} color="#E53935" />
            <Text style={styles.deleteBtnText}>Delete My Account</Text>
          </Pressable>
          <Text style={styles.dangerHint}>
            This will permanently remove your account and all associated data.
          </Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7F5' },
  loadingContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F7F5',
  },
  loadingText: { fontSize: 14, color: 'rgba(27,60,18,0.5)' },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingTop: 56, paddingHorizontal: spacing.lg, paddingBottom: spacing.lg,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderBottomWidth: 1, borderBottomColor: 'rgba(46,125,50,0.08)',
  },
  headerBack: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(46,125,50,0.06)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: '700', color: '#1B3C12', textAlign: 'center' },

  scroll: { flex: 1, padding: spacing.lg },

  // Avatar
  avatarSection: { alignItems: 'center', marginBottom: spacing.xl, marginTop: spacing.base },
  avatarWrapper: { position: 'relative' },
  avatarImage: {
    width: 100, height: 100, borderRadius: 50,
    borderWidth: 3, borderColor: 'rgba(46,125,50,0.15)',
  },
  avatarPlaceholder: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: 'rgba(46,125,50,0.4)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: 'rgba(46,125,50,0.15)',
  },
  avatarInitial: { fontSize: 38, fontWeight: '700', color: '#fff' },
  cameraBtn: {
    position: 'absolute', bottom: 0, right: 0,
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: '#2E7D32', alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: '#F5F7F5',
  },
  avatarHint: { fontSize: 12, color: 'rgba(27,60,18,0.35)', marginTop: 8 },

  // Section Title
  sectionTitle: {
    fontSize: 16, fontWeight: '700', color: '#1B3C12', letterSpacing: -0.3,
    marginBottom: spacing.sm, marginTop: spacing.base,
  },

  // Card
  card: {
    backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: 18,
    padding: spacing.lg, marginBottom: spacing.base,
    borderWidth: 1, borderColor: 'rgba(46,125,50,0.08)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04, shadowRadius: 12, elevation: 1,
  },

  // Fields
  fieldGroup: { paddingVertical: 6 },
  fieldLabel: {
    fontSize: 12, fontWeight: '600', color: 'rgba(27,60,18,0.45)',
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6,
  },
  fieldInput: {
    fontSize: 15, fontWeight: '500', color: '#2E4A26',
    backgroundColor: 'rgba(46,125,50,0.04)', borderRadius: 12,
    paddingVertical: 12, paddingHorizontal: 14,
    borderWidth: 1, borderColor: 'rgba(46,125,50,0.08)',
  },
  fieldTextArea: { minHeight: 70, textAlignVertical: 'top' },
  readOnlyRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(46,125,50,0.03)', borderRadius: 12,
    paddingVertical: 12, paddingHorizontal: 14,
  },
  readOnlyText: { fontSize: 15, color: 'rgba(27,60,18,0.5)', fontWeight: '500' },
  readOnlySmall: { fontSize: 13, color: 'rgba(27,60,18,0.45)', fontWeight: '500' },

  divider: { height: 1, backgroundColor: 'rgba(46,125,50,0.06)', marginVertical: 6 },

  // Save
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#2E7D32', paddingVertical: 14, borderRadius: radius.full,
    marginBottom: spacing.lg,
    shadowColor: '#2E7D32', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 3,
  },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  // Role pill
  rolePill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(46,125,50,0.05)', paddingVertical: 4, paddingHorizontal: 10,
    borderRadius: radius.full, alignSelf: 'flex-start',
  },
  rolePillAdmin: { backgroundColor: 'rgba(76,175,80,0.15)' },
  rolePillText: { fontSize: 12, fontWeight: '600', color: 'rgba(27,60,18,0.5)' },
  rolePillTextAdmin: { color: '#43A047' },

  // Password
  passwordToggle: {
    flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4,
  },
  passwordToggleText: { flex: 1, fontSize: 15, fontWeight: '600', color: '#2E4A26' },
  passwordFields: { marginTop: 4 },
  changePassBtn: {
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#1B5E20', paddingVertical: 12, borderRadius: radius.full,
    marginTop: spacing.sm,
  },
  changePassBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },

  // Danger
  dangerCard: { borderColor: 'rgba(229,57,53,0.15)' },
  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4,
  },
  deleteBtnText: { fontSize: 15, fontWeight: '600', color: '#E53935' },
  dangerHint: { fontSize: 12, color: 'rgba(229,57,53,0.5)', marginTop: 8 },
});
