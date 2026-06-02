/**
 * Nutriva — Reset Password Screen
 * Handles the PASSWORD_RECOVERY event from Supabase reset link
 */

import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius } from '../src/theme';
import { supabase } from '../src/api/supabase';
import { useUIStore } from '../src/stores/uiStore';
import { useAuthStore } from '../src/stores/authStore';
import { useDynamic } from '../src/hooks/useDynamic';
import { sanitizeError } from '../src/utils/sanitizeError';

export default function ResetPasswordScreen() {
  const d = useDynamic();

  const router = useRouter();
  const showToast = useUIStore((s) => s.showToast);
  const signOut = useAuthStore((s) => s.signOut);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleReset = async () => {
    setError('');

    if (!password.trim()) {
      setError('Please enter a new password');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (!supabase) {
      setError('Service not available');
      return;
    }

    setLoading(true);
    try {
      const { error: updateErr } = await supabase.auth.updateUser({
        password,
      });

      if (updateErr) throw updateErr;

      setSuccess(true);
      showToast('Password updated successfully! ✓');

      // Sign out first to clear recovery state, then redirect to login
      setTimeout(async () => {
        await signOut();
        router.replace('/(auth)/login');
      }, 2000);
    } catch (err: any) {
      setError(sanitizeError(err.message) || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <View style={[s.container, { backgroundColor: d.bg }]}>
        <View style={s.successCard}>
          <View style={s.successIcon}>
            <Ionicons name="checkmark-circle" size={56} color="#43A047" />
          </View>
          <Text style={s.successTitle}>Password Updated!</Text>
          <Text style={s.successDesc}>
            Your password has been changed successfully. Redirecting to login...
          </Text>
          <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 16 }} />
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={s.inner}>
        {/* Header */}
        <View style={s.header}>
          <Pressable style={s.backBtn} onPress={async () => { await signOut(); router.replace('/(auth)/login'); }}>
            <Ionicons name="arrow-back" size={22} color={d.text} />
          </Pressable>
        </View>

        {/* Icon */}
        <View style={s.iconWrap}>
          <View style={s.iconPulse} />
          <View style={s.iconCircle}>
            <Ionicons name="key" size={32} color="#fff" />
          </View>
        </View>

        <Text style={[s.title, { color: d.text }]}>Set New Password</Text>
        <Text style={[s.subtitle, { color: d.textMuted }]}>
          Enter your new password below. Make sure it's at least 6 characters long.
        </Text>

        {/* Error */}
        {error ? (
          <View style={s.errorBox}>
            <Ionicons name="alert-circle" size={16} color="#C62828" />
            <Text style={s.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* New Password */}
        <View style={s.inputWrap}>
          <Ionicons name="lock-closed-outline" size={18} color="rgba(27,60,18,0.4)" />
          <TextInput
            style={s.input}
            placeholder="New password"
            placeholderTextColor={d.textDim}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
          />
          <Pressable onPress={() => setShowPassword(!showPassword)}>
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color="rgba(27,60,18,0.4)"
            />
          </Pressable>
        </View>

        {/* Confirm Password */}
        <View style={s.inputWrap}>
          <Ionicons name="lock-closed-outline" size={18} color="rgba(27,60,18,0.4)" />
          <TextInput
            style={s.input}
            placeholder="Confirm new password"
            placeholderTextColor={d.textDim}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
          />
        </View>

        {/* Submit */}
        <Pressable
          style={[s.btn, loading && s.btnDisabled]}
          onPress={handleReset}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={s.btnText}>Update Password</Text>
            </>
          )}
        </Pressable>

        {/* Back to login link */}
        <Pressable style={s.linkBtn} onPress={async () => { await signOut(); router.replace('/(auth)/login'); }}>
          <Text style={s.linkText}>← Back to Login</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7F5',
    justifyContent: 'center',
  },
  inner: {
    paddingHorizontal: spacing.xl,
  },
  header: {
    marginBottom: spacing.xl,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(46,125,50,0.06)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(46,125,50,0.10)',
  },
  iconWrap: {
    alignSelf: 'center',
    position: 'relative',
    marginBottom: spacing.lg,
  },
  iconPulse: {
    position: 'absolute',
    width: 76, height: 76, borderRadius: 38,
    backgroundColor: 'rgba(46,125,50,0.12)',
    top: -4, left: -4,
  },
  iconCircle: {
    width: 68, height: 68, borderRadius: 34,
    backgroundColor: '#2E7D32',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#1B5E20',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  title: {
    fontSize: 26, fontWeight: '800', color: '#1B3C12',
    textAlign: 'center', marginBottom: 8,
  },
  subtitle: {
    fontSize: 14, color: 'rgba(27,60,18,0.5)',
    textAlign: 'center', lineHeight: 20,
    marginBottom: spacing.xl,
  },
  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(198,40,40,0.06)',
    padding: 12, borderRadius: 12,
    marginBottom: spacing.lg,
    borderWidth: 1, borderColor: 'rgba(198,40,40,0.12)',
  },
  errorText: { fontSize: 13, color: '#C62828', flex: 1 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(255,255,255,0.8)',
    paddingHorizontal: spacing.lg, paddingVertical: 14,
    borderRadius: radius.md,
    borderWidth: 1, borderColor: 'rgba(46,125,50,0.12)',
    marginBottom: spacing.base,
  },
  input: {
    flex: 1, fontSize: 15, color: '#2E4A26',
  },
  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: '#2E7D32',
    paddingVertical: 16, borderRadius: radius.full,
    marginTop: spacing.lg,
    shadowColor: '#1B5E20',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  btnDisabled: { opacity: 0.7 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  linkBtn: {
    alignSelf: 'center', marginTop: spacing.lg, paddingVertical: 8,
  },
  linkText: {
    fontSize: 14, color: '#2E7D32', fontWeight: '600',
  },
  successCard: {
    alignItems: 'center', paddingHorizontal: spacing.xl,
  },
  successIcon: { marginBottom: spacing.lg },
  successTitle: {
    fontSize: 24, fontWeight: '800', color: '#1B3C12',
    marginBottom: 8,
  },
  successDesc: {
    fontSize: 14, color: 'rgba(27,60,18,0.5)',
    textAlign: 'center', lineHeight: 20,
  },
});
