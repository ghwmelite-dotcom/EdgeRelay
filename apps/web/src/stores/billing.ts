import { create } from 'zustand';
import { api } from '@/lib/api';

export interface Plan {
  tier: string;
  plan_code: string;
  plan_name: string;
  amount_cents: number;
  currency: string;
  interval: string;
}

export interface SubscriptionInfo {
  status: string;
  plan_tier: string;
  amount: number;
  currency: string;
  next_payment_date: string | null;
  subscription_code: string;
}

interface BillingState {
  subscription: SubscriptionInfo | null;
  plans: Plan[];
  isLoading: boolean;
  error: string | null;
  fetchPlans: () => Promise<void>;
  fetchSubscription: () => Promise<void>;
  initializePayment: (planTier: string) => Promise<string | null>;
  cancelSubscription: () => Promise<boolean>;
}

export const useBillingStore = create<BillingState>()((set) => ({
  subscription: null,
  plans: [],
  isLoading: false,
  error: null,

  fetchPlans: async () => {
    set({ isLoading: true, error: null });
    const res = await api.get<{ plans: Plan[] }>('/billing/plans');
    if (res.error) {
      set({ isLoading: false, error: res.error.message });
      return;
    }
    set({ plans: res.data!.plans, isLoading: false });
  },

  fetchSubscription: async () => {
    set({ isLoading: true, error: null });
    const res = await api.get<{ subscription: SubscriptionInfo | null }>('/billing/subscription');
    if (res.error) {
      set({ isLoading: false, error: res.error.message });
      return;
    }
    set({ subscription: res.data!.subscription, isLoading: false });
  },

  initializePayment: async (planTier: string) => {
    set({ isLoading: true, error: null });
    const res = await api.post<{ authorization_url: string }>('/billing/initialize', {
      plan_tier: planTier,
    });
    if (res.error) {
      set({ isLoading: false, error: res.error.message });
      return null;
    }
    set({ isLoading: false });
    return res.data!.authorization_url;
  },

  cancelSubscription: async () => {
    set({ isLoading: true, error: null });
    const res = await api.post<{ success: boolean }>('/billing/cancel');
    if (res.error) {
      set({ isLoading: false, error: res.error.message });
      return false;
    }
    set({ subscription: null, isLoading: false });
    return true;
  },
}));
