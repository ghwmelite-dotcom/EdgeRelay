import React, { Suspense, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import './app.css';

import { useAuthStore } from '@/stores/auth';
import { AppLayout } from '@/components/layout/AppLayout';
import { AuthLayout } from '@/components/layout/AuthLayout';

// Lazy-load ALL pages — reduces initial bundle from one monolithic chunk to per-route chunks
const LandingPage = React.lazy(() => import('@/pages/LandingPage').then(m => ({ default: m.LandingPage })));
const DashboardPage = React.lazy(() => import('@/pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const AccountsPage = React.lazy(() => import('@/pages/AccountsPage').then(m => ({ default: m.AccountsPage })));
const SignalLogPage = React.lazy(() => import('@/pages/SignalLogPage').then(m => ({ default: m.SignalLogPage })));
const BillingPage = React.lazy(() => import('@/pages/BillingPage').then(m => ({ default: m.BillingPage })));
const BillingCallbackPage = React.lazy(() => import('@/pages/BillingCallbackPage').then(m => ({ default: m.BillingCallbackPage })));
const DownloadsPage = React.lazy(() => import('@/pages/DownloadsPage').then(m => ({ default: m.DownloadsPage })));
const AnalyticsPage = React.lazy(() => import('@/pages/AnalyticsPage').then(m => ({ default: m.AnalyticsPage })));
const SettingsPage = React.lazy(() => import('@/pages/SettingsPage').then(m => ({ default: m.SettingsPage })));
const UsagePage = React.lazy(() => import('@/pages/UsagePage').then(m => ({ default: m.UsagePage })));
const LoginPage = React.lazy(() => import('@/pages/LoginPage').then(m => ({ default: m.LoginPage })));
const RegisterPage = React.lazy(() => import('@/pages/RegisterPage').then(m => ({ default: m.RegisterPage })));
const PropGuardSetupPage = React.lazy(() => import('@/pages/PropGuardSetupPage').then(m => ({ default: m.PropGuardSetupPage })));
const JournalPage = React.lazy(() => import('@/pages/JournalPage').then(m => ({ default: m.JournalPage })));
const JournalTradeDetailPage = React.lazy(() => import('@/pages/JournalTradeDetailPage').then(m => ({ default: m.JournalTradeDetailPage })));
const CommandCenterPage = React.lazy(() => import('@/pages/CommandCenterPage').then(m => ({ default: m.CommandCenterPage })));
const FirmDirectoryPage = React.lazy(() => import('@/pages/FirmDirectoryPage').then(m => ({ default: m.FirmDirectoryPage })));
const FirmDetailPage = React.lazy(() => import('@/pages/FirmDetailPage').then(m => ({ default: m.FirmDetailPage })));
const RiskDashboardPage = React.lazy(() => import('@/pages/RiskDashboardPage').then(m => ({ default: m.RiskDashboardPage })));
const SimulatorPage = React.lazy(() => import('@/pages/SimulatorPage').then(m => ({ default: m.SimulatorPage })));
const ProviderSetupPage = React.lazy(() => import('@/pages/ProviderSetupPage').then(m => ({ default: m.ProviderSetupPage })));
const MarketplacePage = React.lazy(() => import('@/pages/MarketplacePage').then(m => ({ default: m.MarketplacePage })));
const StrategyHubPage = React.lazy(() => import('@/pages/StrategyHubPage').then(m => ({ default: m.StrategyHubPage })));
const PrivacyPolicyPage = React.lazy(() => import('@/pages/PrivacyPolicyPage').then(m => ({ default: m.PrivacyPolicyPage })));
const TermsOfServicePage = React.lazy(() => import('@/pages/TermsOfServicePage').then(m => ({ default: m.TermsOfServicePage })));
const AuthCallbackPage = React.lazy(() => import('@/pages/AuthCallbackPage').then(m => ({ default: m.AuthCallbackPage })));
const DisciplinePage = React.lazy(() => import('@/pages/DisciplinePage').then(m => ({ default: m.DisciplinePage })));
const AdminPage = React.lazy(() => import('@/pages/AdminPage').then(m => ({ default: m.AdminPage })));
const ReferralPage = React.lazy(() => import('@/pages/ReferralPage').then(m => ({ default: m.ReferralPage })));
const ReferralLandingPage = React.lazy(() => import('@/pages/ReferralLandingPage').then(m => ({ default: m.ReferralLandingPage })));

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function GuestRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

/** Show standalone public page if not logged in, redirect to in-app version if logged in */
function PublicOrAppRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const location = useLocation();
  if (isAuthenticated) {
    // /firms/FTMO → /app/firms/FTMO
    return <Navigate to={`/app${location.pathname}`} replace />;
  }
  return <>{children}</>;
}

/** Capture ?ref= query param from URL and store in localStorage for registration. */
function ReferralCapture() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) {
      localStorage.setItem('referral_code', ref);
      // Clean URL without losing the page
      const url = new URL(window.location.href);
      url.searchParams.delete('ref');
      window.history.replaceState({}, '', url.toString());
    }
  }, []);
  return null;
}

function App() {
  return (
    <BrowserRouter>
      <ReferralCapture />
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-screen bg-terminal-bg">
          <div className="flex items-center gap-3 text-terminal-muted">
            <span className="h-2 w-2 rounded-full bg-neon-cyan animate-pulse shadow-[0_0_6px_#00e5ff]" />
            Loading...
          </div>
        </div>
      }>
      <Routes>
        <Route path="/" element={<LandingPage />} />

        {/* Public legal pages */}
        <Route path="/privacy" element={<PrivacyPolicyPage />} />
        <Route path="/terms" element={<TermsOfServicePage />} />

        {/* Public firms pages — redirect to in-app version if logged in */}
        <Route path="/firms" element={<PublicOrAppRoute><FirmDirectoryPage /></PublicOrAppRoute>} />
        <Route path="/firms/:firmName" element={<PublicOrAppRoute><FirmDetailPage /></PublicOrAppRoute>} />
        <Route path="/marketplace" element={<PublicOrAppRoute><MarketplacePage /></PublicOrAppRoute>} />
        <Route path="/strategy-hub" element={<PublicOrAppRoute><StrategyHubPage /></PublicOrAppRoute>} />
        <Route path="/referral" element={<ReferralLandingPage />} />

        <Route path="/auth/callback" element={<AuthCallbackPage />} />

        <Route element={<AuthLayout />}>
          <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
          <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />
        </Route>

        <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/command-center" element={<CommandCenterPage />} />
          <Route path="/risk" element={<RiskDashboardPage />} />
          <Route path="/accounts" element={<AccountsPage />} />
          <Route path="/signals" element={<SignalLogPage />} />
          <Route path="/journal" element={<JournalPage />} />
          <Route path="/journal/:accountId/:dealTicket" element={<JournalTradeDetailPage />} />
          <Route path="/app/firms" element={<FirmDirectoryPage />} />
          <Route path="/app/firms/:firmName" element={<FirmDetailPage />} />
          <Route path="/downloads" element={<DownloadsPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/discipline" element={<DisciplinePage />} />
          <Route path="/usage" element={<UsagePage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/billing" element={<BillingPage />} />
          <Route path="/billing/callback" element={<BillingCallbackPage />} />
          <Route path="/propguard/setup" element={<PropGuardSetupPage />} />
          <Route path="/simulator" element={<SimulatorPage />} />
          <Route path="/provider/setup" element={<ProviderSetupPage />} />
          <Route path="/app/marketplace" element={<MarketplacePage />} />
          <Route path="/app/strategy-hub" element={<StrategyHubPage />} />
          <Route path="/referrals" element={<ReferralPage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
