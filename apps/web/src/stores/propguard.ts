import { create } from 'zustand';
import { api } from '@/lib/api';
import type { PropRuleSet, DailyStat } from '@edgerelay/shared';

interface BlockedTrade {
  id: string;
  account_id: string;
  rule_violated: string;
  rule_details: string;
  attempted_action: string;
  attempted_symbol: string;
  attempted_volume: number;
  attempted_price?: number;
  current_daily_loss_percent?: number;
  current_total_drawdown_percent?: number;
  current_equity?: number;
  blocked_at: string;
}

interface PropGuardState {
  rules: Record<string, PropRuleSet>;
  blockedTrades: Record<string, BlockedTrade[]>;
  dailyStats: Record<string, DailyStat[]>;
  presets: Record<string, Partial<PropRuleSet>>;
  loading: boolean;
  error: string | null;

  fetchPresets: () => Promise<void>;
  fetchRules: (accountId: string) => Promise<PropRuleSet | null>;
  saveRules: (accountId: string, rules: PropRuleSet) => Promise<void>;
  applyPreset: (accountId: string, presetName: string, initialBalance: number) => Promise<void>;
  deleteRules: (accountId: string) => Promise<void>;
  fetchBlockedTrades: (accountId: string, limit?: number) => Promise<void>;
  fetchDailyStats: (accountId: string, from?: string, to?: string) => Promise<void>;
}

export const usePropGuardStore = create<PropGuardState>((set) => ({
  rules: {},
  blockedTrades: {},
  dailyStats: {},
  presets: {},
  loading: false,
  error: null,

  fetchPresets: async () => {
    try {
      const res = await api.get<{ presets: Record<string, Partial<PropRuleSet>> }>('/propguard/presets');
      if (res.data?.presets) {
        set({ presets: res.data.presets });
      }
    } catch (err) {
      console.error('Failed to fetch presets:', err);
    }
  },

  fetchRules: async (accountId: string) => {
    set({ loading: true, error: null });
    try {
      const res = await api.get<PropRuleSet>(`/propguard/rules/${accountId}`);
      if (res.data) {
        set((state) => ({
          rules: { ...state.rules, [accountId]: res.data! },
          loading: false,
        }));
        return res.data;
      }
      set({ loading: false });
      return null;
    } catch {
      set({ loading: false, error: 'Failed to fetch rules' });
      return null;
    }
  },

  saveRules: async (accountId: string, rules: PropRuleSet) => {
    set({ loading: true, error: null });
    try {
      const res = await api.put<PropRuleSet>(`/propguard/rules/${accountId}`, rules);
      if (res.data) {
        set((state) => ({
          rules: { ...state.rules, [accountId]: res.data! },
          loading: false,
        }));
      }
    } catch {
      set({ loading: false, error: 'Failed to save rules' });
    }
  },

  applyPreset: async (accountId: string, presetName: string, initialBalance: number) => {
    set({ loading: true, error: null });
    try {
      const res = await api.post<PropRuleSet>(`/propguard/rules/${accountId}/apply-preset`, {
        preset_name: presetName,
        initial_balance: initialBalance,
      });
      if (res.data) {
        set((state) => ({
          rules: { ...state.rules, [accountId]: res.data! },
          loading: false,
        }));
      }
    } catch {
      set({ loading: false, error: 'Failed to apply preset' });
    }
  },

  deleteRules: async (accountId: string) => {
    try {
      await api.del(`/propguard/rules/${accountId}`);
      set((state) => {
        const { [accountId]: _, ...rest } = state.rules;
        return { rules: rest };
      });
    } catch {
      set({ error: 'Failed to delete rules' });
    }
  },

  fetchBlockedTrades: async (accountId: string, limit = 50) => {
    try {
      const res = await api.get<{ blocked_trades: BlockedTrade[]; total: number }>(
        `/propguard/blocked/${accountId}?limit=${limit}`,
      );
      if (res.data?.blocked_trades) {
        set((state) => ({
          blockedTrades: { ...state.blockedTrades, [accountId]: res.data!.blocked_trades },
        }));
      }
    } catch (err) {
      console.error('Failed to fetch blocked trades:', err);
    }
  },

  fetchDailyStats: async (accountId: string, from?: string, to?: string) => {
    try {
      const params = new URLSearchParams();
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const query = params.toString() ? `?${params}` : '';
      const res = await api.get<{ stats: DailyStat[] }>(`/propguard/daily-stats/${accountId}${query}`);
      if (res.data?.stats) {
        set((state) => ({
          dailyStats: { ...state.dailyStats, [accountId]: res.data!.stats },
        }));
      }
    } catch (err) {
      console.error('Failed to fetch daily stats:', err);
    }
  },
}));
