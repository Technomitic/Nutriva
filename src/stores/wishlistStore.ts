/**
 * Nutriva — Wishlist Store (Zustand)
 * Manages user's favorite products with Supabase sync
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../api/supabase';

interface WishlistState {
  items: string[]; // product_id array
  isLoading: boolean;

  loadWishlist: (userId: string) => Promise<void>;
  toggleWishlist: (userId: string, productId: string) => Promise<void>;
  isWishlisted: (productId: string) => boolean;
  clearWishlist: () => void;
}

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],
      isLoading: false,

      loadWishlist: async (userId) => {
        if (!supabase) return;
        set({ isLoading: true });
        try {
          const { data } = await supabase
            .from('wishlist')
            .select('product_id')
            .eq('user_id', userId);
          if (data) {
            set({ items: data.map((d: any) => d.product_id) });
          }
        } catch {} finally {
          set({ isLoading: false });
        }
      },

      toggleWishlist: async (userId, productId) => {
        if (!supabase) return;
        const current = get().items;
        const isWishlisted = current.includes(productId);

        if (isWishlisted) {
          // Remove
          set({ items: current.filter((id) => id !== productId) });
          await supabase
            .from('wishlist')
            .delete()
            .eq('user_id', userId)
            .eq('product_id', productId);
        } else {
          // Add
          set({ items: [...current, productId] });
          await supabase
            .from('wishlist')
            .insert({ user_id: userId, product_id: productId });
        }
      },

      isWishlisted: (productId) => get().items.includes(productId),

      clearWishlist: () => set({ items: [] }),
    }),
    {
      name: 'nutriva-wishlist',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
