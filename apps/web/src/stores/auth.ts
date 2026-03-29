import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '@/lib/api';

interface User {
  id: string;
  email: string;
  name: string;
  plan: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, name: string) => Promise<boolean>;
  logout: () => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (email, password) => {
        set({ isLoading: true, error: null });
        const res = await api.post<{ token: string; user: User }>('/auth/login', {
          email,
          password,
        });
        if (res.error) {
          set({ isLoading: false, error: res.error.message });
          return false;
        }
        const { token, user } = res.data!;
        api.setToken(token);
        set({ user, token, isAuthenticated: true, isLoading: false });
        return true;
      },

      register: async (email, password, name) => {
        set({ isLoading: true, error: null });
        const referralCode = localStorage.getItem('referral_code');
        const res = await api.post<{ token: string; user: User }>('/auth/register', {
          email,
          password,
          name,
          referral_code: referralCode || undefined,
        });
        if (res.error) {
          set({ isLoading: false, error: res.error.message });
          return false;
        }
        // Clear referral code after successful registration
        if (referralCode) localStorage.removeItem('referral_code');
        const { token, user } = res.data!;
        api.setToken(token);
        set({ user, token, isAuthenticated: true, isLoading: false });
        return true;
      },

      logout: () => {
        const { token } = get();
        if (token) {
          api.post('/auth/logout').catch(() => {});
        }
        api.setToken(null);
        set({ user: null, token: null, isAuthenticated: false });
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'edgerelay-auth',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);

// Restore API token from persisted state on module load
const persisted = useAuthStore.getState();
if (persisted.token) {
  api.setToken(persisted.token);
}

// Wire auto-refresh callbacks
api.onTokenRefreshed = (token, user) => {
  api.setToken(token);
  useAuthStore.setState({
    token,
    user: user as { id: string; email: string; name: string; plan: string },
    isAuthenticated: true,
  });
};

api.onAuthExpired = () => {
  useAuthStore.getState().logout();
};
