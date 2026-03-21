import { useState } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Activity, Download, BarChart3, Settings, CreditCard, LogOut, Menu, X } from 'lucide-react';
import { useAuthStore } from '@/stores/auth';
import { Badge } from '@/components/ui/Badge';

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, to: '/dashboard' },
  { label: 'Accounts', icon: Users, to: '/accounts' },
  { label: 'Signal Log', icon: Activity, to: '/signals' },
  { label: 'Downloads', icon: Download, to: '/downloads' },
  { label: 'Analytics', icon: BarChart3, to: '/analytics' },
  { label: 'Settings', icon: Settings, to: '/settings' },
  { label: 'Billing', icon: CreditCard, to: '/billing' },
] as const;

const planBadgeVariant = (plan: string) => {
  switch (plan.toLowerCase()) {
    case 'pro':
      return 'cyan' as const;
    case 'enterprise':
      return 'purple' as const;
    case 'starter':
      return 'green' as const;
    default:
      return 'muted' as const;
  }
};

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuthStore();
  const location = useLocation();

  return (
    <div className="flex h-screen overflow-hidden bg-terminal-bg">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-terminal-surface border-r border-terminal-border
          transition-transform duration-300 ease-out
          lg:static lg:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between px-5 border-b border-terminal-border">
          <span className="font-display text-xl font-bold tracking-tight">
            <span className="text-white">Edge</span>
            <span className="text-neon-cyan">Relay</span>
          </span>
          <button
            onClick={() => setSidebarOpen(false)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-terminal-card hover:text-slate-200 lg:hidden focus:outline-none focus:ring-2 focus:ring-neon-cyan/40"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map(({ label, icon: Icon, to }) => {
            const isActive = location.pathname === to || location.pathname.startsWith(`${to}/`);
            return (
              <NavLink
                key={to}
                to={to}
                onClick={() => setSidebarOpen(false)}
                className={`
                  flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-200
                  hover:bg-terminal-card focus:outline-none focus:ring-2 focus:ring-neon-cyan/40
                  ${isActive
                    ? 'border-l-2 border-neon-cyan bg-terminal-card text-neon-cyan'
                    : 'text-slate-400 hover:text-slate-200'
                  }
                `}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {label}
              </NavLink>
            );
          })}
        </nav>

        {/* Bottom section */}
        <div className="border-t border-terminal-border p-4 space-y-3">
          {user && (
            <div className="space-y-2">
              <p className="truncate text-sm text-slate-300">{user.email}</p>
              <Badge variant={planBadgeVariant(user.plan)}>
                {user.plan}
              </Badge>
            </div>
          )}
          <button
            onClick={logout}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-400 transition-colors duration-200 hover:bg-terminal-card hover:text-neon-red focus:outline-none focus:ring-2 focus:ring-neon-cyan/40"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile top bar */}
        <header className="flex h-14 items-center border-b border-terminal-border bg-terminal-surface px-4 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-2 text-slate-400 hover:bg-terminal-card hover:text-slate-200 focus:outline-none focus:ring-2 focus:ring-neon-cyan/40"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="ml-3 font-display text-lg font-bold tracking-tight">
            <span className="text-white">Edge</span>
            <span className="text-neon-cyan">Relay</span>
          </span>
        </header>

        {/* Page content */}
        <main className="relative flex-1 overflow-y-auto bg-terminal-bg">
          <div className="bg-grid absolute inset-0 pointer-events-none" />
          <div className="relative z-10 p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
