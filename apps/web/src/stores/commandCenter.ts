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
    const res = await api.get<AccountHealthResult[]>('/command/health');
    if (res.data) {
      set({ healthResults: res.data, isLoading: false, error: null });
    } else {
      set({ isLoading: false, error: res.error?.message ?? 'Failed to load health data' });
    }
  },

  fetchFirms: async () => {
    set({ isLoading: true, error: null });
    const res = await api.get<FirmListItem[]>('/firms');
    if (res.data) {
      set({ firms: res.data, isLoading: false, error: null });
    } else {
      set({ isLoading: false, error: res.error?.message ?? 'Failed to load firms' });
    }
  },

  fetchFirmTemplates: async (firmName: string) => {
    set({ isLoading: true, error: null });
    const res = await api.get<any[]>(`/firms/${firmName}/templates`);
    if (res.data) {
      set({ firmTemplates: res.data, selectedFirm: firmName, isLoading: false, error: null });
    } else {
      set({ isLoading: false, error: res.error?.message ?? 'Failed to load templates' });
    }
  },

  linkAccount: async (accountId: string, templateId: string) => {
    set({ isLoading: true, error: null });
    const res = await api.post(`/command/link/${accountId}`, { template_id: templateId });
    if (res.data) {
      set({ isLoading: false, error: null });
      return true;
    } else {
      set({ isLoading: false, error: res.error?.message ?? 'Failed to link account' });
      return false;
    }
  },

  reset: () => {
    set({ ...initialState });
  },
}));
