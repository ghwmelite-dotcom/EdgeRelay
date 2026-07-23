// Subscribes a component to the ICC Bias store and triggers an initial
// fetch + 5-minute auto-refresh. Stale data (KV fallback on a failed
// Twelve Data call) stays on screen so the UI never blanks out during a
// network blip — the store sets isStale so we can show a subtle badge.

import { useEffect } from 'react';
import { useMarketBiasStore } from '@/stores/marketBias';

const REFRESH_INTERVAL_MS = 5 * 60_000;

export function useBiasData() {
  const data        = useMarketBiasStore((s) => s.data);
  const lastUpdated = useMarketBiasStore((s) => s.lastUpdated);
  const isLoading   = useMarketBiasStore((s) => s.isLoading);
  const isStale     = useMarketBiasStore((s) => s.isStale);
  const error       = useMarketBiasStore((s) => s.error);
  const fetchBias   = useMarketBiasStore((s) => s.fetchBias);

  useEffect(() => {
    // Kick off immediately if we've never loaded, or if cached data is older
    // than a refresh window (user navigated back to the page).
    const needsFetch =
      !data ||
      !lastUpdated ||
      Date.now() - lastUpdated > REFRESH_INTERVAL_MS;
    if (needsFetch) fetchBias();

    const interval = setInterval(fetchBias, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { data, lastUpdated, isLoading, isStale, error, refresh: fetchBias };
}
