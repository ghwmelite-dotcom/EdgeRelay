import { create } from 'zustand';
import { api } from '@/lib/api';

export interface Account {
  id: string;
  role: 'master' | 'follower';
  alias: string;
  broker_name: string | null;
  mt5_login: string | null;
  api_key: string;
  api_secret: string;
  master_account_id: string | null;
  is_active: boolean;
  last_heartbeat: string | null;
  last_signal_at: string | null;
  signals_today: number;
  created_at: string;
  follower_config?: FollowerConfig;
  symbol_mappings?: SymbolMapping[];
}

export interface FollowerConfig {
  lot_mode: 'mirror' | 'fixed' | 'multiplier' | 'risk_percent';
  lot_value: number;
  max_daily_loss_percent: number;
  max_total_drawdown_percent: number;
  respect_news_filter: boolean;
  max_slippage_points: number;
  symbol_suffix: string;
  copy_buys: boolean;
  copy_sells: boolean;
  copy_pendings: boolean;
  invert_direction: boolean;
}

export interface SymbolMapping {
  id: string;
  master_symbol: string;
  follower_symbol: string;
}

interface AccountsState {
  accounts: Account[];
  isLoading: boolean;
  error: string | null;
  fetchAccounts: () => Promise<void>;
  createAccount: (data: {
    role: 'master' | 'follower';
    alias: string;
    broker_name?: string;
    mt5_login?: string;
    master_account_id?: string;
  }) => Promise<Account | null>;
  deleteAccount: (id: string) => Promise<boolean>;
}

export const useAccountsStore = create<AccountsState>()((set, get) => ({
  accounts: [],
  isLoading: false,
  error: null,

  fetchAccounts: async () => {
    set({ isLoading: true });
    const res = await api.get<Account[]>('/accounts');
    if (res.data) {
      set({ accounts: res.data, isLoading: false, error: null });
    } else {
      set({ isLoading: false, error: res.error?.message ?? 'Failed to load accounts' });
    }
  },

  createAccount: async (data) => {
    const res = await api.post<Account>('/accounts', data);
    if (res.data) {
      set({ accounts: [...get().accounts, res.data] });
      return res.data;
    }
    set({ error: res.error?.message ?? 'Failed to create account' });
    return null;
  },

  deleteAccount: async (id) => {
    const res = await api.del<{ deleted: boolean }>(`/accounts/${id}`);
    if (!res.error) {
      set({ accounts: get().accounts.filter((a) => a.id !== id) });
      return true;
    }
    return false;
  },
}));
