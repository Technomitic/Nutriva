/**
 * Fresh — Root Layout
 * Sets up providers (QueryClient, fonts) and auth-gated routing
 */

import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SEOHead } from '../src/components/ui/SEOHead';
import { PAGE_SEO } from '../src/config/seo';
import {
  useFonts,
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from '@expo-google-fonts/manrope';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { View, ActivityIndicator, StyleSheet, Text, Platform } from 'react-native';
import { useAuthStore } from '../src/stores/authStore';
import { colors } from '../src/theme';
import { useThemeStore } from '../src/stores/themeStore';
import { Toast } from '../src/components/ui/Toast';
import { requestAllPermissions, configureNotifications } from '../src/utils/permissions';
import { loadSavedLocale } from '../src/i18n';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, initialUrlWasRecovery } from '../src/api/supabase';
import * as Notifications from 'expo-notifications';

const PERMISSIONS_ASKED_KEY = 'fresh-permissions-asked';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 2,
    },
  },
});

function AuthGuard({ children }: { children: React.ReactNode }) {
  const segments = useSegments();
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  // Use the flag captured in supabase.ts before createClient consumed the hash
  const [isRecovery, setIsRecovery] = useState(initialUrlWasRecovery);

  // Fallback: listen for PASSWORD_RECOVERY event
  useEffect(() => {
    if (!supabase) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, _session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecovery(true);
        router.replace('/reset-password');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const onResetPage = segments[0] === 'reset-password';

    // Don't redirect away from the reset-password page
    if (onResetPage) return;

    // Recovery mode: actively redirect to reset password once session is ready
    if (isRecovery && isAuthenticated) {
      router.replace('/reset-password');
      return;
    }

    // Skip other routing while in recovery (waiting for session)
    if (isRecovery) return;

    if (!isAuthenticated && !inAuthGroup) {
      // Allow browsing tabs without auth for now
    } else if (isAuthenticated && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, segments, isLoading, isRecovery]);

  return <>{children}</>;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const loadSession = useAuthStore((s) => s.loadSession);
  const isLoading = useAuthStore((s) => s.isLoading);

  // Force-bypass loading after timeout so app never hangs
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), 4000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    loadSession();
    loadSavedLocale();
    useThemeStore.getState().loadTheme();
  }, []);

  // Register push token when authenticated
  const user = useAuthStore((s) => s.user);
  useEffect(() => {
    if (!user?.id || !supabase || Platform.OS === 'web') return;
    (async () => {
      try {
        const { status } = await Notifications.getPermissionsAsync();
        if (status !== 'granted') return;
        const token = (await Notifications.getExpoPushTokenAsync()).data;
        if (token) {
          await supabase.from('profiles').update({ push_token: token }).eq('id', user.id);
        }
      } catch {}
    })();
  }, [user?.id]);

  // Configure notifications handler
  useEffect(() => {
    configureNotifications();
  }, []);

  // Request permissions on first launch
  useEffect(() => {
    const askPermissions = async () => {
      try {
        const alreadyAsked = await AsyncStorage.getItem(PERMISSIONS_ASKED_KEY);
        if (alreadyAsked) return; // Don't ask again

        // Small delay to let the app render first
        await new Promise((r) => setTimeout(r, 1500));

        const result = await requestAllPermissions();

        await AsyncStorage.setItem(PERMISSIONS_ASKED_KEY, 'true');
      } catch (err) {
        console.warn('Permission request error:', err);
      }
    };

    askPermissions();
  }, []);

  const ready = (fontsLoaded || timedOut) && !isLoading;

  if (!ready) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading Nutriva...</Text>
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <SEOHead {...PAGE_SEO.home} />
      <StatusBar style={useThemeStore.getState().isDark ? 'light' : 'dark'} />
      <AuthGuard>
        <Stack screenOptions={{ headerShown: false }} />
      </AuthGuard>
      <Toast />
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7F5',
    gap: 16,
  },
  loadingText: {
    color: 'rgba(27, 60, 18, 0.5)',
    fontSize: 14,
    marginTop: 8,
  },
});
