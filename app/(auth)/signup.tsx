/**
 * Fresh — Signup Screen
 * Premium auth UI with animated floating fruit background
 */

import { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, Pressable, ScrollView,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
  Animated, Dimensions, Easing,
} from 'react-native';
import { useRouter, Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius } from '../../src/theme';
import { useAuthStore } from '../../src/stores/authStore';
import { useUIStore } from '../../src/stores/uiStore';
import { supabase } from '../../src/api/supabase';
import { useDynamic } from '../../src/hooks/useDynamic';
import { sanitizeError } from '../../src/utils/sanitizeError';

const { width: SW, height: SH } = Dimensions.get('window');
const FRUITS = ['🍎', '🍊', '🍋', '🍇', '🍓', '🥭', '🍑', '🍌', '🫐', '🍒', '🥝', '🍍'];

function FloatingFruit({ emoji, delay, startX, duration, size }: { emoji: string; delay: number; startX: number; duration: number; size: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, { toValue: 1, duration, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [SH + 40, -60] });
  const translateX = anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, Math.sin(startX) * 30, 0] });
  const rotate = anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${(Math.random() > 0.5 ? 1 : -1) * 360}deg`] });
  const opacity = anim.interpolate({ inputRange: [0, 0.1, 0.9, 1], outputRange: [0, 0.5, 0.5, 0] });
  return (
    <Animated.Text style={{ position: 'absolute', left: startX, fontSize: size, transform: [{ translateY }, { translateX }, { rotate }], opacity }}>
      {emoji}
    </Animated.Text>
  );
}



function useCardEntrance() {
  const translateY = useRef(new Animated.Value(50)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateY, { toValue: 0, tension: 50, friction: 9, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);
  return { transform: [{ translateY }], opacity };
}

export default function SignupScreen() {
  const d = useDynamic();

  const router = useRouter();
  const signUp = useAuthStore((s) => s.signUp);
  const showToast = useUIStore((s) => s.showToast);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmationSent, setConfirmationSent] = useState(false);
  const cardAnim = useCardEntrance();
  const phoneRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const fruits = useRef(
    Array.from({ length: 14 }, (_, i) => ({
      emoji: FRUITS[i % FRUITS.length],
      delay: i * 800,
      startX: (i * (SW / 14)) + Math.random() * 30,
      duration: 8000 + Math.random() * 6000,
      size: 18 + Math.random() * 16,
    }))
  ).current;

  // Password strength
  const getStrength = () => {
    let score = 0;
    if (password.length >= 6) score++;
    if (password.length >= 10) score++;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password)) score++;
    return Math.min(score, 4);
  };
  const strength = getStrength();
  const strengthLabels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  const strengthColors = ['', colors.error, '#f57c00', '#1a73e8', colors.secondary];

  const handleSignup = async () => {
    if (!name.trim() || !email.trim() || !password) {
      setError('Please fill in all fields');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await signUp(email.trim(), password, name.trim());
      // Save phone number to profile if we got a session
      if (!result.needsConfirmation && supabase) {
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session?.user?.id) {
          await supabase.from('profiles').update({ phone: phone.trim() }).eq('id', sessionData.session.user.id);
        }
      }
      if (result.needsConfirmation) {
        setConfirmationSent(true);
      } else {
        showToast('Account created! 🎉');
        router.replace('/(tabs)');
      }
    } catch (err: any) {
      const msg =
        err.message?.includes('already registered')
          ? 'This email is already registered'
          : sanitizeError(err.message) || 'Signup failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // ── Email confirmation success card ──
  if (confirmationSent) {
    return (
      <View style={[styles.container, d.s.screenBg]}>
        <View style={styles.bgLayer}>
          <View style={styles.bgPatchTopLeft} />
          <View style={styles.bgPatchCenter} />
          <View style={styles.bgPatchBottomRight} />
          {fruits.map((f, i) => <FloatingFruit key={i} {...f} />)}
        </View>
        <View style={styles.content}>
          <Animated.View style={[styles.confirmCard, cardAnim]}>
            <View style={styles.confirmIconCircle}>
              <Ionicons name="mail-outline" size={36} color="#2E7D32" />
            </View>
            <Text style={styles.confirmTitle}>Check Your Email</Text>
            <Text style={styles.confirmDesc}>We've sent a confirmation link to</Text>
            <Text style={styles.confirmEmail}>{email}</Text>
            <Text style={styles.confirmHint}>
              Click the link in the email to verify your account, then come back here to sign in.
            </Text>
            <View style={styles.confirmDivider} />
            <Link href="/(auth)/login" asChild>
              <Pressable style={styles.confirmBtn}>
                <Ionicons name="log-in-outline" size={18} color="#FFFFFF" />
                <Text style={styles.confirmBtnText}>Go to Sign In</Text>
              </Pressable>
            </Link>
            <Pressable style={styles.confirmResend} onPress={() => { setConfirmationSent(false); setPassword(''); }}>
              <Text style={styles.confirmResendText}>Didn't get it? Try signing up again</Text>
            </Pressable>
          </Animated.View>
        </View>
      </View>
    );
  }

  // ── Main signup form ──
  return (
    <View style={[styles.container, { backgroundColor: d.bg }]}>
      {/* Animated Background */}
      <View style={styles.bgLayer}>
        <View style={styles.bgPatchTopLeft} />
        <View style={styles.bgPatchCenter} />
        <View style={styles.bgPatchBottomRight} />
        {fruits.map((f, i) => <FloatingFruit key={i} {...f} />)}
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.brand}>
            <View style={styles.logoCircle}>
              <Ionicons name="leaf" size={32} color="#A5D6A7" />
            </View>
            <Text style={styles.brandTitle}>Nutriva</Text>
            <Text style={styles.brandTagline}>The Editorial Orchard</Text>
          </View>

          <Animated.View style={[styles.card, cardAnim]}>
            <View style={styles.tabs}>
              <Link href="/(auth)/login" asChild>
                <Pressable style={styles.tab}>
                  <Text style={styles.tabText}>Sign In</Text>
                </Pressable>
              </Link>
              <Pressable style={[styles.tab, styles.tabActive]}>
                <Text style={[styles.tabText, styles.tabTextActive]}>Sign Up</Text>
              </Pressable>
            </View>

            {error ? (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={16} color="#E53935" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.field}>
              <Ionicons name="person-outline" size={20} color="rgba(255,255,255,0.45)" />
              <TextInput
                style={[styles.input, { backgroundColor: d.inputBg, borderColor: d.inputBorder, color: d.text }]}
                placeholder="Full name"
                placeholderTextColor="rgba(255,255,255,0.4)"
                value={name}
                onChangeText={(t) => { setName(t); setError(''); }}
                autoComplete="name"
                returnKeyType="next"
                onSubmitEditing={() => phoneRef.current?.focus()}
                blurOnSubmit={false}
              />
            </View>

            <View style={styles.field}>
              <Ionicons name="call-outline" size={20} color="rgba(255,255,255,0.45)" />
              <TextInput
                ref={phoneRef}
                style={[styles.input, { backgroundColor: d.inputBg, borderColor: d.inputBorder, color: d.text }]}
                placeholder="Phone number (optional)"
                placeholderTextColor="rgba(255,255,255,0.4)"
                value={phone}
                onChangeText={(t) => { setPhone(t); setError(''); }}
                keyboardType="phone-pad"
                autoComplete="tel"
                returnKeyType="next"
                onSubmitEditing={() => emailRef.current?.focus()}
                blurOnSubmit={false}
              />
            </View>

            <View style={styles.field}>
              <Ionicons name="mail-outline" size={20} color="rgba(255,255,255,0.45)" />
              <TextInput
                ref={emailRef}
                style={[styles.input, { backgroundColor: d.inputBg, borderColor: d.inputBorder, color: d.text }]}
                placeholder="Email address"
                placeholderTextColor="rgba(255,255,255,0.4)"
                value={email}
                onChangeText={(t) => { setEmail(t); setError(''); }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
                blurOnSubmit={false}
              />
            </View>

            <View style={styles.field}>
              <Ionicons name="lock-closed-outline" size={20} color="rgba(255,255,255,0.45)" />
              <TextInput
                ref={passwordRef}
                style={[styles.input, { backgroundColor: d.inputBg, borderColor: d.inputBorder, color: d.text }]}
                placeholder="Create password"
                placeholderTextColor="rgba(255,255,255,0.4)"
                value={password}
                onChangeText={(t) => { setPassword(t); setError(''); }}
                secureTextEntry={!showPassword}
                autoComplete="new-password"
                returnKeyType="go"
                onSubmitEditing={handleSignup}
              />
              <Pressable onPress={() => setShowPassword(!showPassword)}>
                <Ionicons name={showPassword ? 'eye-outline' : 'eye-off-outline'} size={20} color="rgba(255,255,255,0.45)" />
              </Pressable>
            </View>

            {/* Password Strength */}
            {password.length > 0 && (
              <View style={styles.strengthRow}>
                <View style={styles.strengthBars}>
                  {[1, 2, 3, 4].map((i) => (
                    <View key={i} style={[styles.strengthBar, i <= strength && { backgroundColor: strengthColors[strength] }]} />
                  ))}
                </View>
                <Text style={[styles.strengthLabel, { color: strengthColors[strength] }]}>
                  {strengthLabels[strength]}
                </Text>
              </View>
            )}

            <Pressable
              style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
              onPress={handleSignup}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.submitText}>Create Account</Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                </>
              )}
            </Pressable>

            <Text style={styles.terms}>
              By signing up, you agree to our Terms and Privacy Policy
            </Text>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1A6B22' },

  // Animated background
  bgLayer: { ...StyleSheet.absoluteFillObject, overflow: 'hidden', backgroundColor: '#1E7B28' },
  bgPatchTopLeft: {
    position: 'absolute', top: -SH * 0.12, left: -SW * 0.2, width: SW * 0.85, height: SW * 0.85,
    borderRadius: SW * 0.45, backgroundColor: 'rgba(46, 125, 50, 0.5)',
  },
  bgPatchCenter: {
    position: 'absolute', top: SH * 0.25, right: -SW * 0.15, width: SW * 0.7, height: SW * 0.7,
    borderRadius: SW * 0.35, backgroundColor: 'rgba(27, 94, 32, 0.45)',
  },
  bgPatchBottomRight: {
    position: 'absolute', bottom: -SH * 0.08, left: SW * 0.1, width: SW * 0.9, height: SW * 0.6,
    borderRadius: SW * 0.3, backgroundColor: 'rgba(56, 142, 60, 0.35)',
  },

  content: { flexGrow: 1, justifyContent: 'center', padding: spacing.lg, alignItems: 'center' },

  // Brand
  brand: { alignItems: 'center', marginBottom: spacing['2xl'] },
  logoCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(165, 214, 167, 0.12)', alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.base,
    borderWidth: 1.5, borderColor: 'rgba(165, 214, 167, 0.2)',
  },
  brandTitle: { fontSize: 40, fontWeight: '800', color: '#FFFFFF', letterSpacing: -1.5 },
  brandTagline: { fontSize: 11, color: 'rgba(165, 214, 167, 0.6)', marginTop: 4, letterSpacing: 3, textTransform: 'uppercase' },

  // Glass Card
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 22,
    padding: spacing.lg,
    paddingVertical: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    width: '100%',
    maxWidth: 420,
    ...Platform.select({
      web: { backdropFilter: 'blur(20px)' } as any,
      default: {},
    }),
  },
  tabs: {
    flexDirection: 'row', backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: radius.full, padding: 4, marginBottom: spacing.xl,
    borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  tab: { flex: 1, paddingVertical: 10, borderRadius: radius.full, alignItems: 'center' },
  tabActive: { backgroundColor: 'rgba(255, 255, 255, 0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' },
  tabText: { fontSize: 14, fontWeight: '600', color: 'rgba(255, 255, 255, 0.4)' },
  tabTextActive: { color: '#FFFFFF' },
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(229, 57, 53, 0.15)', padding: spacing.base,
    borderRadius: radius.sm, marginBottom: spacing.base,
    borderWidth: 1, borderColor: 'rgba(229, 57, 53, 0.3)',
  },
  errorText: { fontSize: 13, color: '#EF9A9A', flex: 1 },
  field: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: radius.md,
    paddingHorizontal: spacing.base, paddingVertical: 14, marginBottom: spacing.base,
    borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  input: { flex: 1, fontSize: 15, color: '#FFFFFF' },
  strengthRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginBottom: spacing.base, marginTop: -4,
  },
  strengthBars: { flexDirection: 'row', gap: 4, flex: 1 },
  strengthBar: {
    flex: 1, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  strengthLabel: { fontSize: 11, fontWeight: '600' },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#1B3C12', paddingVertical: 16,
    borderRadius: radius.full, marginTop: spacing.sm,
    borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  terms: {
    fontSize: 12, color: 'rgba(255, 255, 255, 0.35)', textAlign: 'center',
    marginTop: spacing.lg, lineHeight: 18,
  },
  // ── Confirmation Card ──
  confirmCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 22,
    padding: spacing.lg, paddingVertical: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    width: '100%',
    maxWidth: 420,
    ...Platform.select({
      web: { backdropFilter: 'blur(20px)' } as any,
      default: {},
    }),
  },
  confirmIconCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(165, 214, 167, 0.12)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.lg,
    borderWidth: 1, borderColor: 'rgba(165, 214, 167, 0.2)',
  },
  confirmTitle: { fontSize: 24, fontWeight: '700', color: '#FFFFFF', marginBottom: spacing.sm },
  confirmDesc: { fontSize: 15, color: 'rgba(255, 255, 255, 0.55)', textAlign: 'center' },
  confirmEmail: { fontSize: 15, fontWeight: '700', color: '#A5D6A7', marginTop: 4, marginBottom: spacing.base },
  confirmHint: { fontSize: 13, color: 'rgba(255, 255, 255, 0.4)', textAlign: 'center', lineHeight: 20, paddingHorizontal: spacing.base },
  confirmDivider: { width: '100%', height: 1, backgroundColor: 'rgba(255, 255, 255, 0.08)', marginVertical: spacing.xl },
  confirmBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#1B3C12', paddingVertical: 16,
    paddingHorizontal: 32, borderRadius: radius.full, width: '100%',
    borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  confirmBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  confirmResend: { marginTop: spacing.lg, paddingVertical: 8 },
  confirmResendText: { fontSize: 13, color: '#A5D6A7', fontWeight: '500' },
});
