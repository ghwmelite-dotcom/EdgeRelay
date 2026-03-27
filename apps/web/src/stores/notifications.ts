import { create } from 'zustand';
import { api } from '@/lib/api';
import type { NotificationPreferences, TelegramStatus } from '@edgerelay/shared';

interface NotificationState {
  telegramConnected: boolean;
  linkedAt: string | null;
  preferences: NotificationPreferences | null;
  isLinking: boolean;
  isLoadingStatus: boolean;
  isLoadingPrefs: boolean;

  checkTelegramStatus: () => Promise<void>;
  generateDeepLink: () => Promise<string | null>;
  unlinkTelegram: () => Promise<void>;
  fetchPreferences: () => Promise<void>;
  updatePreferences: (prefs: Partial<NotificationPreferences>) => Promise<void>;
}

export const useNotificationStore = create<NotificationState>()((set) => ({
  telegramConnected: false,
  linkedAt: null,
  preferences: null,
  isLinking: false,
  isLoadingStatus: false,
  isLoadingPrefs: false,

  checkTelegramStatus: async () => {
    set({ isLoadingStatus: true });
    const res = await api.get<TelegramStatus>('/notifications/telegram/status');
    if (res.data) {
      set({
        telegramConnected: res.data.connected,
        linkedAt: res.data.linked_at,
        isLoadingStatus: false,
      });
    } else {
      set({ isLoadingStatus: false });
    }
  },

  generateDeepLink: async () => {
    set({ isLinking: true });
    try {
      const res = await api.post<{ deepLink: string }>('/notifications/telegram/link');
      if (res.data) {
        return res.data.deepLink;
      }
    } catch {
      // API call failed
    }
    set({ isLinking: false });
    return null;
  },

  unlinkTelegram: async () => {
    await api.del('/notifications/telegram/link');
    set({ telegramConnected: false, linkedAt: null, preferences: null });
  },

  fetchPreferences: async () => {
    set({ isLoadingPrefs: true });
    const res = await api.get<{ preferences: NotificationPreferences | null }>(
      '/notifications/preferences',
    );
    if (res.data) {
      set({ preferences: res.data.preferences, isLoadingPrefs: false });
    } else {
      set({ isLoadingPrefs: false });
    }
  },

  updatePreferences: async (prefs) => {
    await api.put('/notifications/preferences', prefs);
    set((state) => ({
      preferences: state.preferences ? { ...state.preferences, ...prefs } : null,
    }));
  },
}));
