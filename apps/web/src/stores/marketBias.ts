// Zustand store for the ICC 4H Market Bias Engine.
//
// Holds the latest /v1/bias response plus timestamp + stale flag so the UI
// can surface "data may be stale" if the worker fails but KV cache held.

import { create } from 'zustand';
import { api } from '@/lib/api';
import type { BiasResponse, AssetBias } from '@edgerelay/shared';

interface MarketBiasState {
  data: BiasResponse | null;
  lastUpdated: number | null;
  isLoading: boolean;
  error: string | null;
  isStale: boolean;

  fetchBias: () => Promise<void>;
  selectedSymbol: string | null;
  setSelected: (symbol: string | null) => void;
  getAsset: (symbol: string) => AssetBias | null;
}

export const useMarketBiasStore = create<MarketBiasState>()((set, get) => ({
  data: null,
  lastUpdated: null,
  isLoading: false,
  error: null,
  isStale: false,
  selectedSymbol: null,

  fetchBias: async () => {
    const prior = get().data;
    set({ isLoading: true, error: null });
    const res = await api.get<BiasResponse>('/bias');
    if (res.data) {
      set({
        data: res.data,
        lastUpdated: Date.now(),
        isLoading: false,
        error: null,
        isStale: false,
      });
    } else {
      // Keep the prior data on screen and mark it stale
      set({
        isLoading: false,
        isStale: prior !== null,
        error: res.error?.message ?? 'Failed to load bias data',
      });
    }
  },

  setSelected: (symbol) => set({ selectedSymbol: symbol }),

  getAsset: (symbol) => {
    const d = get().data;
    return d?.assets.find((a) => a.symbol === symbol) ?? null;
  },
}));
