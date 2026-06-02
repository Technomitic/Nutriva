/**
 * Fresh — Login Screen
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

// Floating fruit config
const FRUITS = ['🍎', '🍊', '🍋', '🍇', '🍓', '🥭', '🍑', '🍌', '🫐', '🍒', '🥝', '🍍'];

function FloatingFruit({ emoji, delay, startX, duration, size }: { emoji: string; delay: number; startX: number; duration: number; size: number }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, {
          toValue: 1,
          duration,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
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
    <Animated.Text
      style={{
        position: 'absolute',
        left: startX,
        fontSize: size,
        transform: [{ translateY }, { translateX }, { rotate }],
        opacity,
      }}
    >
      {emoji}
    </Animated.Text>
  );
}



// Card entrance animation
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

export default function LoginScreen() {
  const d = useDynamic();

  const router = useRouter();
  const signIn = useAuthStore((s) => s.signIn);
  const showToast = useUIStore((s) => s.showToast);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const cardAnim = useCardEntrance();
  const passwordRef = useRef<TextInput>(null);

  // Brute-force protection
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number>(0);
  const MAX_ATTEMPTS = 3;
  const LOCKOUT_MS = 30_000; // 30 seconds

  const isLocked = Date.now() < lockedUntil;

  // Generate floating fruits
  const fruits = useRef(
    Array.from({ length: 14 }, (_, i) => ({
      emoji: FRUITS[i % FRUITS.length],
      delay: i * 800,
      startX: (i * (SW / 14)) + Math.random() * 30,
      duration: 8000 + Math.random() * 6000,
      size: 18 + Math.random() * 16,
    }))
  ).current;

  const handleLogin = async () => {
    if (isLocked) {
      const secsLeft = Math.ceil((lockedUntil - Date.now()) / 1000);
      setError(`Too many attempts. Try again in ${secsLeft}s`);
      return;
    }
    if (!email.trim() || !password) {
      setError('Please fill in all fields');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await signIn(email.trim(), password);
      setFailedAttempts(0);
      showToast('Welcome back! 🍃');
      router.replace('/(tabs)');
    } catch (err: any) {
      const newAttempts = failedAttempts + 1;
      setFailedAttempts(newAttempts);

      if (newAttempts >= MAX_ATTEMPTS) {
        setLockedUntil(Date.now() + LOCKOUT_MS);
        setError(`Too many failed attempts. Locked for 30 seconds.`);
        // Auto-unlock after timeout
        setTimeout(() => {
          setFailedAttempts(0);
          setLockedUntil(0);
          setError('');
        }, LOCKOUT_MS);
      } else {
        let msg = err.message || 'Login failed';
        if (err.message?.includes('Invalid login')) {
          msg = `Invalid email or password (${MAX_ATTEMPTS - newAttempts} attempts remaining)`;
        } else if (err.message?.includes('Email not confirmed')) {
          msg = 'Please confirm your email first — check your inbox for the verification link';
        }
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, d.s.screenBg]}>
      {/* Animated Background */}
      <View style={styles.bgLayer}>
        {fruits.map((f, i) => (
          <FloatingFruit key={i} {...f} />
        ))}
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Brand */}
          <View style={styles.brand}>
            <View style={styles.logoCircle}>
              <Ionicons name="leaf" size={32} color="#A5D6A7" />
            </View>
            <Text style={styles.brandTitle}>Nutriva</Text>
            <Text style={styles.brandTagline}>The Editorial Orchard</Text>
          </View>

          {/* Card */}
          <Animated.View style={[styles.card, cardAnim]}>
            {/* Tabs */}
            <View style={styles.tabs}>
              <Pressable style={[styles.tab, styles.tabActive]}>
                <Text style={[styles.tabText, styles.tabTextActive]}>Sign In</Text>
              </Pressable>
              <Link href="/(auth)/signup" asChild>
                <Pressable style={styles.tab}>
                  <Text style={styles.tabText}>Sign Up</Text>
                </Pressable>
              </Link>
            </View>

            {error ? (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={16} color={colors.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Email */}
            <View style={styles.field}>
              <Ionicons name="mail-outline" size={20} color="rgba(255,255,255,0.45)" />
              <TextInput
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

            {/* Password */}
            <View style={styles.field}>
              <Ionicons name="lock-closed-outline" size={20} color="rgba(255,255,255,0.45)" />
              <TextInput
                ref={passwordRef}
                style={[styles.input, { backgroundColor: d.inputBg, borderColor: d.inputBorder, color: d.text }]}
                placeholder="Password"
                placeholderTextColor="rgba(255,255,255,0.4)"
                value={password}
                onChangeText={(t) => { setPassword(t); setError(''); }}
                secureTextEntry={!showPassword}
                autoComplete="password"
                returnKeyType="go"
                onSubmitEditing={handleLogin}
              />
              <Pressable onPress={() => setShowPassword(!showPassword)}>
                <Ionicons
                  name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                  size={20}
                  color="rgba(255,255,255,0.45)"
                />
              </Pressable>
            </View>

            {/* Submit */}
            <Pressable
              style={[styles.submitBtn, (loading || isLocked) && styles.submitBtnDisabled]}
              onPress={handleLogin}
              disabled={loading || isLocked}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.submitText}>Sign In</Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                </>
              )}
            </Pressable>

            {/* Forgot Password */}
            <Pressable
              style={styles.forgotBtn}
              onPress={async () => {
                if (!email.trim()) {
                  setError('Enter your email first, then tap Forgot Password');
                  return;
                }
                setForgotLoading(true);
                try {
                  // Build redirect URL for the reset link
                  const redirectUrl = Platform.OS === 'web'
                    ? window.location.origin
                    : 'fresh://reset-password';
                  const { error: resetErr } = await supabase!.auth.resetPasswordForEmail(email.trim(), {
                    redirectTo: redirectUrl,
                  });
                  if (resetErr) throw resetErr;
                  showToast('Password reset link sent to your email! 📧');
                } catch (err: any) {
                  setError(sanitizeError(err.message) || 'Failed to send reset email');
                } finally {
                  setForgotLoading(false);
                }
              }}
              disabled={forgotLoading}
            >
              {forgotLoading ? (
                <ActivityIndicator size="small" color="rgba(165,214,167,0.6)" />
              ) : (
                <Text style={styles.forgotText}>Forgot Password?</Text>
              )}
            </Pressable>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or continue with</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Social */}
            <View style={styles.socials}>
              <Pressable
                style={[styles.socialBtn, { opacity: 0.4 }]}
                onPress={() => showToast('Google Sign-In coming soon!')}
              >
                <Ionicons name="logo-google" size={20} color={colors.onSurface} />
                <Text style={styles.socialText}>Google</Text>
              </Pressable>
              <Pressable
                style={[styles.socialBtn, { opacity: 0.4 }]}
                onPress={() => showToast('Apple Sign-In coming soon!')}
              >
                <Ionicons name="logo-apple" size={20} color={colors.onSurface} />
                <Text style={styles.socialText}>Apple</Text>
              </Pressable>
            </View>
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
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#1B3C12', paddingVertical: 16,
    borderRadius: radius.full, marginTop: spacing.sm,
    borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  divider: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.base,
    marginVertical: spacing.xl,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255, 255, 255, 0.08)' },
  dividerText: { fontSize: 11, color: 'rgba(255, 255, 255, 0.35)', letterSpacing: 1.5, textTransform: 'uppercase' },
  socials: { flexDirection: 'row', gap: spacing.base },
  socialBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 12, borderRadius: radius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  socialText: { fontSize: 14, fontWeight: '500', color: 'rgba(255, 255, 255, 0.7)' },
  forgotBtn: { alignSelf: 'flex-end', marginTop: 4, marginBottom: spacing.sm, paddingVertical: 4 },
  forgotText: { fontSize: 13, color: 'rgba(165, 214, 167, 0.6)', fontWeight: '500' },
});
