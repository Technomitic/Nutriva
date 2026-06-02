/**
 * Fresh — Supabase Client
 * Configured for React Native + Web with AsyncStorage persistence
 */

import 'react-native-url-polyfill/auto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// Only create a real client if credentials are configured
const isConfigured =
  supabaseUrl.length > 0 &&
  supabaseAnonKey.length > 0 &&
  !supabaseUrl.includes('your-project') &&
  !supabaseAnonKey.includes('your-anon-key');

import { Platform } from 'react-native';

// ⚠️ Capture the URL hash BEFORE createClient() — Supabase's
// detectSessionInUrl will auto-consume and clear the hash fragment.
export const initialUrlWasRecovery =
  Platform.OS === 'web' &&
  typeof window !== 'undefined' &&
  window.location.hash.includes('type=recovery');

export const supabase: SupabaseClient | null = isConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: Platform.OS === 'web',
      },
    })
  : null;

export const isSupabaseConfigured = isConfigured;
