// apps/web/src/stores/marketIntel.ts
import { create } from 'zustand';
import { api } from '@/lib/api';
import type { MarketHeadline } from '@edgerelay/shared';

interface CalendarEvent {
  id: string;
  event_name: string;
  currency: string;
  impact: 'high' | 'medium';
  event_time: string;
  actual: string | null;
  forecast: string | null;
  previous: string | null;
}

interface MarketIntelState {
  headlines: MarketHeadline[];
  calendarEvents: CalendarEvent[];
  isLoadingNews: boolean;
  isLoadingCalendar: boolean;

  fetchHeadlines: () => Promise<void>;
  fetchCalendar: () => Promise<void>;
}

export const useMarketIntelStore = create<MarketIntelState>()((set) => ({
  headlines: [],
  calendarEvents: [],
  isLoadingNews: false,
  isLoadingCalendar: false,

  fetchHeadlines: async () => {
    set({ isLoadingNews: true });
    const res = await api.get<{ headlines: MarketHeadline[] }>('/market-news/headlines?limit=10');
    if (res.data) {
      set({ headlines: res.data.headlines ?? [], isLoadingNews: false });
    } else {
      set({ isLoadingNews: false });
    }
  },

  fetchCalendar: async () => {
    set({ isLoadingCalendar: true });
    const res = await api.get<{ events: CalendarEvent[] }>('/news/calendar');
    if (res.data) {
      set({ calendarEvents: res.data.events ?? [], isLoadingCalendar: false });
    } else {
      set({ isLoadingCalendar: false });
    }
  },
}));
