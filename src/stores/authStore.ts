/**
 * Fresh — Auth Store (Zustand)
 * Manages current user session state
 */

import { create } from 'zustand';
import { Profile } from '../types';
import { supabase, isSupabaseConfigured } from '../api/supabase';

interface SignUpResult {
  needsConfirmation: boolean;
}

interface SignUpConsent {
  acceptedTermsAt: string;
  marketingOptIn: boolean;
}

// ── Helpers ──

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Fetch a profile row by user ID, return null if not found */
async function fetchProfile(userId: string): Promise<Profile | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error || !data) return null;
  return data as Profile;
}

/** Fetch the avatar signed URL from Supabase Storage (avatars bucket) */
async function fetchAvatarUrl(userId: string): Promise<string | undefined> {
  if (!supabase) return undefined;
  try {
    const { data, error } = await supabase.storage
      .from('avatars')
      .createSignedUrl(`${userId}/avatar.jpg`, 3600);
    if (!error && data?.signedUrl) return data.signedUrl;
  } catch {
    // No avatar uploaded yet
  }
  return undefined;
}

/** Merge the storage avatar URL into a profile if it doesn't already have one */
async function enrichProfileWithAvatar(profile: Profile): Promise<Profile> {
  if (!profile.avatar_url) {
    const url = await fetchAvatarUrl(profile.id);
    if (url) profile.avatar_url = url;
  }
  return profile;
}

/** Build a fallback Profile from Supabase auth.user when the DB trigger
 *  hasn't completed yet — ensures the user can use the app immediately */
function buildFallbackProfile(authUser: any): Profile {
  const email = authUser.email || '';
  const name =
    authUser.user_metadata?.name ||
    authUser.user_metadata?.full_name ||
    email.split('@')[0] ||
    'User';
  const avatar_url =
    authUser.user_metadata?.avatar_url ||
    authUser.user_metadata?.picture ||
    undefined;
  return {
    id: authUser.id,
    name,
    email,
    role: 'user', // Never grant admin on client — DB trigger handles this
    phone: '',
    address: '',
    avatar_url,
    total_orders: 0,
    total_spent: 0,
    created_at: authUser.created_at || new Date().toISOString(),
  };
}
interface AuthState {
  user: Profile | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string, consent?: SignUpConsent) => Promise<SignUpResult>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  loadSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  loadSession: async () => {
    if (!supabase || !isSupabaseConfigured) {
      set({ isLoading: false });
      return;
    }

    try {
      const { data } = await supabase.auth.getSession();
      const session = data?.session;

      if (session?.user) {
        let profile = await fetchProfile(session.user.id);

        // Fallback if profile row not found (e.g. trigger delay)
        if (!profile) {
          profile = buildFallbackProfile(session.user);
        }

        // Fetch avatar from storage so the header can show it
        profile = await enrichProfileWithAvatar(profile);

        set({ user: profile, isAuthenticated: true, isLoading: false });
        return;
      }

      set({ isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  signIn: async (email, password) => {
    if (!supabase) throw new Error('Supabase not configured');

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;

    // Fetch profile — retry once if trigger hasn't completed yet
    let profile = await fetchProfile(data.user.id);
    if (!profile) {
      await delay(1000);
      profile = await fetchProfile(data.user.id);
    }

    // Fallback: build profile from auth metadata if DB row missing
    if (!profile) {
      profile = buildFallbackProfile(data.user);
    }

    // Fetch avatar from storage so the header can show it
    profile = await enrichProfileWithAvatar(profile);

    set({ user: profile, isAuthenticated: true });
  },

  signUp: async (email: string, password: string, name: string, consent?: SignUpConsent) => {
    if (!supabase) throw new Error('Supabase not configured');

    // Pass name + consent in metadata — the database trigger handle_new_user()
    // will create the profile automatically using this metadata
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          ...(consent && {
            accepted_terms_at: consent.acceptedTermsAt,
            marketing_opt_in: consent.marketingOptIn,
          }),
        },
      },
    });
    if (error) throw error;

    if (data.session && data.user) {
      // Session exists (email confirmation disabled) — fetch the profile
      // Give the trigger a moment to create the profile row
      await delay(800);
      let profile = await fetchProfile(data.user.id);

      // Retry once more if not found
      if (!profile) {
        await delay(1200);
        profile = await fetchProfile(data.user.id);
      }

      // Fallback: build profile from auth metadata
      if (!profile) {
        profile = buildFallbackProfile(data.user);
      }

      // Fetch avatar from storage so the header can show it
      profile = await enrichProfileWithAvatar(profile);

      set({ user: profile, isAuthenticated: true });
      return { needsConfirmation: false };
    }

    // No session — email confirmation is enabled, user must verify first
    return { needsConfirmation: true };
  },

  signInWithGoogle: async () => {
    if (!supabase) throw new Error('Supabase not configured');

    const { Platform } = require('react-native');
    const redirectTo =
      Platform.OS === 'web' && typeof window !== 'undefined'
        ? window.location.origin
        : undefined;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });
    if (error) throw error;
  },

  signOut: async () => {
    if (supabase) await supabase.auth.signOut();
    set({ user: null, isAuthenticated: false });
  },
}));
