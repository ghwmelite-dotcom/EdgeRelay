import { create } from 'zustand';
import { api } from '@/lib/api';
import type { AccountHealth } from '@edgerelay/shared';

export interface FirmListItem {
  firm_name: string;
  plan_count: number;
}

export interface AccountHealthResult {
  account_id: string;
  alias: string;
  firm_name: string;
  plan_name: string;
  health: AccountHealth;
}

interface CommandCenterState {
  healthResults: AccountHealthResult[];
  firms: FirmListItem[];
  firmTemplates: any[];
  isLoading: boolean;
  error: string | null;
  selectedFirm: string | null;

  fetchHealth: () => Promise<void>;
  fetchFirms: () => Promise<void>;
  fetchFirmTemplates: (firmName: string) => Promise<void>;
  linkAccount: (accountId: string, templateId: string) => Promise<boolean>;
  unlinkAccount: (accountId: string) => Promise<boolean>;
  reset: () => void;
}

const initialState = {
  healthResults: [] as AccountHealthResult[],
  firms: [] as FirmListItem[],
  firmTemplates: [] as any[],
  isLoading: false,
  error: null as string | null,
  selectedFirm: null as string | null,
};

export const useCommandCenterStore = create<CommandCenterState>()((set) => ({
  ...initialState,

  fetchHealth: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.get<{ accounts: AccountHealthResult[] }>('/command/health');
      if (res.error) {
        console.error('Health API error:', res.error);
        set({ healthResults: [], isLoading: false, error: res.error.message });
      } else if (res.data) {
        set({ healthResults: res.data.accounts ?? [], isLoading: false });
      } else {
        set({ healthResults: [], isLoading: false });
      }
    } catch (err) {
      console.error('Health fetch error:', err);
      set({ healthResults: [], isLoading: false });
    }
  },

  fetchFirms: async () => {
    try {
      const res = await api.get<{ firms: FirmListItem[] }>('/firms');
      if (res.data) {
        set({ firms: res.data.firms ?? [] });
      }
    } catch {
      // silently fail — firms are non-critical on page load
    }
  },

  fetchFirmTemplates: async (firmName: string) => {
    set({ firmTemplates: [], selectedFirm: firmName });
    try {
      const res = await api.get<{ templates: any[] }>(`/firms/${firmName}/templates`);
      if (res.data) {
        set({ firmTemplates: res.data.templates ?? [] });
      }
    } catch {
      set({ firmTemplates: [] });
    }
  },

  linkAccount: async (accountId: string, templateId: string) => {
    try {
      const res = await api.post(`/command/link/${accountId}`, { template_id: templateId });
      if (res.data) {
        return true;
      } else {
        set({ error: res.error?.message ?? 'Failed to link account' });
        return false;
      }
    } catch {
      set({ error: 'Network error' });
      return false;
    }
  },

  unlinkAccount: async (accountId: string) => {
    try {
      const res = await api.post(`/command/unlink/${accountId}`);
      if (res.data) {
        return true;
      } else {
        set({ error: res.error?.message ?? 'Failed to unlink account' });
        return false;
      }
    } catch {
      set({ error: 'Network error' });
      return false;
    }
  },

  reset: () => {
    set({ ...initialState });
  },
}));
