/**
 * Fresh — UI Store (Zustand)
 * Manages transient UI state like toasts
 */

import { create } from 'zustand';

interface UIState {
  toast: { message: string; visible: boolean };
  showToast: (message: string) => void;
  hideToast: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  toast: { message: '', visible: false },

  showToast: (message) => {
    set({ toast: { message, visible: true } });
    setTimeout(() => {
      set({ toast: { message: '', visible: false } });
    }, 2500);
  },

  hideToast: () => set({ toast: { message: '', visible: false } }),
}));
