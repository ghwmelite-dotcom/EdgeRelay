import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import './app.css';

import { useAuthStore } from '@/stores/auth';
import { AppLayout } from '@/components/layout/AppLayout';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { AccountsPage } from '@/pages/AccountsPage';
import { SignalLogPage } from '@/pages/SignalLogPage';
import { BillingPage } from '@/pages/BillingPage';
import { BillingCallbackPage } from '@/pages/BillingCallbackPage';
import { DownloadsPage } from '@/pages/DownloadsPage';
import { AnalyticsPage } from '@/pages/AnalyticsPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { UsagePage } from '@/pages/UsagePage';
import { LandingPage } from '@/pages/LandingPage';
import { PropGuardSetupPage } from '@/pages/PropGuardSetupPage';
import { JournalPage } from '@/pages/JournalPage';
import { JournalTradeDetailPage } from '@/pages/JournalTradeDetailPage';
import { CommandCenterPage } from '@/pages/CommandCenterPage';
import { FirmDirectoryPage } from '@/pages/FirmDirectoryPage';
import { FirmDetailPage } from '@/pages/FirmDetailPage';

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

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />

        {/* Public firms pages — redirect to in-app version if logged in */}
        <Route path="/firms" element={<PublicOrAppRoute><FirmDirectoryPage /></PublicOrAppRoute>} />
        <Route path="/firms/:firmName" element={<PublicOrAppRoute><FirmDetailPage /></PublicOrAppRoute>} />

        <Route element={<AuthLayout />}>
          <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
          <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />
        </Route>

        <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/command-center" element={<CommandCenterPage />} />
          <Route path="/accounts" element={<AccountsPage />} />
          <Route path="/signals" element={<SignalLogPage />} />
          <Route path="/journal" element={<JournalPage />} />
          <Route path="/journal/:accountId/:dealTicket" element={<JournalTradeDetailPage />} />
          <Route path="/app/firms" element={<FirmDirectoryPage />} />
          <Route path="/app/firms/:firmName" element={<FirmDetailPage />} />
          <Route path="/downloads" element={<DownloadsPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/usage" element={<UsagePage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/billing" element={<BillingPage />} />
          <Route path="/billing/callback" element={<BillingCallbackPage />} />
          <Route path="/propguard/setup" element={<PropGuardSetupPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
