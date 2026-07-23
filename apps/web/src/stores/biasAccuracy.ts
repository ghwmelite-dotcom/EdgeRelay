// Accuracy data is independent of the live bias feed — it reads from D1
// historical snapshots so it updates far less often. Fetched on demand
// when the bias page mounts, cached in memory for 5 min.
import { create } from 'zustand';
import { api } from '@/lib/api';
import type { AccuracyBreakdown } from '@edgerelay/shared';

interface BiasAccuracyState {
  data: Record<string, AccuracyBreakdown> | null;
  lastFetched: number | null;
  isLoading: boolean;
  fetchAccuracy: () => Promise<void>;
}

const TTL_MS = 5 * 60_000;

export const useBiasAccuracyStore = create<BiasAccuracyState>()((set, get) => ({
  data: null,
  lastFetched: null,
  isLoading: false,

  fetchAccuracy: async () => {
    const last = get().lastFetched;
    if (last && Date.now() - last < TTL_MS && get().data) return;
    set({ isLoading: true });
    const res = await api.get<Record<string, AccuracyBreakdown>>('/bias/accuracy');
    if (res.data) {
      set({ data: res.data, lastFetched: Date.now(), isLoading: false });
    } else {
      set({ isLoading: false });
    }
  },
}));
