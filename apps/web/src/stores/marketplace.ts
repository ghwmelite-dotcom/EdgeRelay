import { create } from 'zustand';
import { api } from '@/lib/api';

export interface ProviderProfile {
  id: string;
  user_id: string;
  master_account_id: string;
  display_name: string;
  bio: string | null;
  instruments: string | null;
  strategy_style: 'scalper' | 'swing' | 'position' | 'mixed';
  is_listed: boolean;
  listed_at: string | null;
  created_at: string;
}

export interface ProviderStats {
  total_trades: number;
  win_rate: number;
  total_pnl: number;
  avg_pips: number;
  max_drawdown_pct: number;
  sharpe_ratio: number;
  avg_trade_duration_sec: number;
  profit_factor: number;
  active_days: number;
  subscriber_count: number;
  equity_curve_json: string;
  computed_at: string;
}

export interface Qualification {
  qualified: boolean;
  trade_count: number;
  active_days: number;
  required_trades: number;
  required_days: number;
}

interface MarketplaceState {
  profile: ProviderProfile | null;
  stats: ProviderStats | null;
  qualification: Qualification | null;
  isLoading: boolean;
  error: string | null;
  fetchMyProfile: () => Promise<void>;
  createProfile: (data: {
    display_name: string;
    bio?: string;
    instruments?: string;
    strategy_style?: string;
    master_account_id: string;
  }) => Promise<boolean>;
  updateProfile: (data: Partial<{
    display_name: string;
    bio: string;
    instruments: string;
    strategy_style: string;
    is_listed: boolean;
  }>) => Promise<boolean>;
}

export const useMarketplaceStore = create<MarketplaceState>()((set) => ({
  profile: null,
  stats: null,
  qualification: null,
  isLoading: false,
  error: null,

  fetchMyProfile: async () => {
    set({ isLoading: true });
    const res = await api.get<{
      profile: ProviderProfile | null;
      stats: ProviderStats | null;
      qualification: Qualification | null;
    }>('/marketplace/provider/me');
    if (res.data) {
      set({
        profile: res.data.profile,
        stats: res.data.stats,
        qualification: res.data.qualification,
        isLoading: false,
        error: null,
      });
    } else {
      set({ isLoading: false, error: res.error?.message ?? 'Failed to load profile' });
    }
  },

  createProfile: async (data) => {
    set({ isLoading: true, error: null });
    const res = await api.post<{
      profile: ProviderProfile;
      qualification: Qualification;
    }>('/marketplace/provider', data);
    if (res.data) {
      set({
        profile: res.data.profile,
        qualification: res.data.qualification,
        isLoading: false,
      });
      return true;
    }
    set({ isLoading: false, error: res.error?.message ?? 'Failed to create profile' });
    return false;
  },

  updateProfile: async (data) => {
    set({ isLoading: true, error: null });
    const res = await api.put<ProviderProfile>('/marketplace/provider', data);
    if (res.data) {
      set({ profile: res.data, isLoading: false });
      return true;
    }
    set({ isLoading: false, error: res.error?.message ?? 'Failed to update profile' });
    return false;
  },
}));
