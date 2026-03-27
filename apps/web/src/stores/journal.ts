import { create } from 'zustand';
import { api } from '@/lib/api';

export interface JournalTrade {
  deal_ticket: number;
  symbol: string;
  direction: string;
  deal_entry: string;
  volume: number;
  price: number;
  sl: number;
  tp: number;
  time: number;
  profit: number;
  commission: number;
  swap: number;
  magic_number: number;
  comment: string;
  balance_at_trade: number;
  equity_at_trade: number;
  spread_at_entry: number;
  atr_at_entry: number;
  session_tag: string;
  duration_seconds: number | null;
  pips: number | null;
  risk_reward_ratio: number | null;
  order_ticket?: number;
  position_id?: number;
  synced_at?: number;
}

export interface JournalStats {
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  win_rate: number;
  total_profit: number;
  total_commission: number;
  total_swap: number;
  net_profit: number;
  avg_profit_per_trade: number;
  avg_winner: number;
  avg_loser: number;
  profit_factor: number;
  avg_duration_seconds: number;
  avg_rr: number;
  best_trade: number;
  worst_trade: number;
}

export interface SymbolStat {
  symbol: string;
  trades: number;
  profit: number;
  win_rate: number;
}

export interface SessionStat {
  session: string;
  trades: number;
  profit: number;
  win_rate: number;
}

export interface DailyPnl {
  date: string;
  trades: number;
  profit: number;
  cumulative_profit: number;
}

export interface JournalFilters {
  symbol?: string;
  direction?: string;
  session_tag?: string;
  from?: number;
  to?: number;
}

interface JournalState {
  trades: JournalTrade[];
  stats: JournalStats | null;
  symbolStats: SymbolStat[];
  sessionStats: SessionStat[];
  dailyPnl: DailyPnl[];
  selectedTrade: JournalTrade | null;
  isLoading: boolean;
  error: string | null;
  cursor: string | null;
  hasMore: boolean;
  filters: JournalFilters;
  selectedAccountId: string | null;

  fetchTrades: (accountId: string) => Promise<void>;
  fetchMoreTrades: (accountId: string) => Promise<void>;
  fetchStats: (accountId: string) => Promise<void>;
  fetchSymbolStats: (accountId: string) => Promise<void>;
  fetchSessionStats: (accountId: string) => Promise<void>;
  fetchDailyPnl: (accountId: string) => Promise<void>;
  fetchTradeDetail: (accountId: string, dealTicket: number) => Promise<void>;
  fetchAll: (accountId: string) => Promise<void>;
  setFilters: (filters: Partial<JournalFilters>) => void;
  reset: () => void;
}

const initialState = {
  trades: [] as JournalTrade[],
  stats: null as JournalStats | null,
  symbolStats: [] as SymbolStat[],
  sessionStats: [] as SessionStat[],
  dailyPnl: [] as DailyPnl[],
  selectedTrade: null as JournalTrade | null,
  isLoading: false,
  error: null as string | null,
  cursor: null as string | null,
  hasMore: false,
  filters: {} as JournalFilters,
  selectedAccountId: null as string | null,
};

function buildTradeParams(filters: JournalFilters, cursor: string | null): string {
  const params = new URLSearchParams();
  if (filters.symbol) params.set('symbol', filters.symbol);
  if (filters.direction) params.set('direction', filters.direction);
  if (filters.session_tag) params.set('session_tag', filters.session_tag);
  if (filters.from) params.set('from', String(filters.from));
  if (filters.to) params.set('to', String(filters.to));
  if (cursor) params.set('cursor', cursor);
  params.set('limit', '50');
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

function buildDateParams(filters: JournalFilters): string {
  const params = new URLSearchParams();
  if (filters.from) params.set('from', String(filters.from));
  if (filters.to) params.set('to', String(filters.to));
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

interface TradesResponse {
  trades: JournalTrade[];
  next_cursor: string | null;
  has_more: boolean;
}

export const useJournalStore = create<JournalState>()((set, get) => ({
  ...initialState,

  fetchTrades: async (accountId: string) => {
    set({ isLoading: true, error: null, selectedAccountId: accountId });
    const { filters } = get();
    const qs = buildTradeParams(filters, null);
    const res = await api.get<TradesResponse>(`/journal/trades/${accountId}${qs}`);
    if (res.data) {
      set({
        trades: res.data.trades,
        cursor: res.data.next_cursor,
        hasMore: res.data.has_more,
        isLoading: false,
        error: null,
      });
    } else {
      set({ isLoading: false, error: res.error?.message ?? 'Failed to load trades' });
    }
  },

  fetchMoreTrades: async (accountId: string) => {
    const { cursor, hasMore, filters } = get();
    if (!hasMore || !cursor) return;
    set({ isLoading: true, error: null });
    const qs = buildTradeParams(filters, cursor);
    const res = await api.get<TradesResponse>(`/journal/trades/${accountId}${qs}`);
    if (res.data) {
      set({
        trades: [...get().trades, ...res.data.trades],
        cursor: res.data.next_cursor,
        hasMore: res.data.has_more,
        isLoading: false,
        error: null,
      });
    } else {
      set({ isLoading: false, error: res.error?.message ?? 'Failed to load more trades' });
    }
  },

  fetchStats: async (accountId: string) => {
    const { filters } = get();
    const qs = buildDateParams(filters);
    const res = await api.get<JournalStats>(`/journal/stats/${accountId}${qs}`);
    if (res.data) {
      set({ stats: res.data });
    }
  },

  fetchSymbolStats: async (accountId: string) => {
    const { filters } = get();
    const qs = buildDateParams(filters);
    const res = await api.get<{ symbols: SymbolStat[] }>(`/journal/stats/${accountId}/by-symbol${qs}`);
    if (res.data) {
      set({ symbolStats: res.data.symbols ?? [] });
    }
  },

  fetchSessionStats: async (accountId: string) => {
    const { filters } = get();
    const qs = buildDateParams(filters);
    const res = await api.get<{ sessions: SessionStat[] }>(`/journal/stats/${accountId}/by-session${qs}`);
    if (res.data) {
      set({ sessionStats: res.data.sessions ?? [] });
    }
  },

  fetchDailyPnl: async (accountId: string) => {
    const { filters } = get();
    const qs = buildDateParams(filters);
    const res = await api.get<{ days: DailyPnl[] }>(`/journal/stats/${accountId}/daily${qs}`);
    if (res.data) {
      set({ dailyPnl: res.data.days ?? [] });
    }
  },

  fetchTradeDetail: async (accountId: string, dealTicket: number) => {
    set({ isLoading: true, error: null });
    const res = await api.get<JournalTrade>(`/journal/trades/${accountId}/${dealTicket}`);
    if (res.data) {
      set({ selectedTrade: res.data, isLoading: false, error: null });
    } else {
      set({ isLoading: false, error: res.error?.message ?? 'Failed to load trade detail' });
    }
  },

  fetchAll: async (accountId: string) => {
    set({ isLoading: true, error: null, selectedAccountId: accountId });
    const store = get();
    await Promise.all([
      store.fetchStats(accountId),
      store.fetchSymbolStats(accountId),
      store.fetchSessionStats(accountId),
      store.fetchDailyPnl(accountId),
      store.fetchTrades(accountId),
    ]);
    set({ isLoading: false });
  },

  setFilters: (filters: Partial<JournalFilters>) => {
    set({ filters: { ...get().filters, ...filters } });
  },

  reset: () => {
    set({ ...initialState });
  },
}));
