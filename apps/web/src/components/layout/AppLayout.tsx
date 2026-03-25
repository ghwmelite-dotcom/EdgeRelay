import { useState } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Activity, BookOpen, Download, BarChart3, Gauge, Settings, CreditCard, LogOut, Menu, X } from 'lucide-react';
import { useAuthStore } from '@/stores/auth';
import { Badge } from '@/components/ui/Badge';

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, to: '/dashboard' },
  { label: 'Accounts', icon: Users, to: '/accounts' },
  { label: 'Signal Log', icon: Activity, to: '/signals' },
  { label: 'Journal', icon: BookOpen, to: '/journal' },
  { label: 'Downloads', icon: Download, to: '/downloads' },
  { label: 'Analytics', icon: BarChart3, to: '/analytics' },
  { label: 'Usage', icon: Gauge, to: '/usage' },
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

const STREAM_LINES = Array.from({ length: 8 }, (_, i) => ({
  id: i,
  left: 12 + i * 12,
  height: 40 + Math.random() * 30,
  duration: 6 + Math.random() * 8,
  delay: Math.random() * 6,
}));

function DataStreamBg() {
  return (
    <div className="data-stream-bg">
      {STREAM_LINES.map((line) => (
        <div
          key={line.id}
          className="stream-line"
          style={{
            left: `${line.left}%`,
            height: `${line.height}%`,
            '--duration': `${line.duration}s`,
            '--delay': `${line.delay}s`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuthStore();
  const location = useLocation();

  return (
    <div className="flex h-screen overflow-hidden bg-terminal-bg">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/80 backdrop-blur-sm lg:hidden transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-40 flex w-64 flex-col
          backdrop-blur-xl bg-terminal-surface/80
          transition-transform duration-300 ease-out
          lg:static lg:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Data stream rain effect */}
        <DataStreamBg />

        {/* Left edge gradient border */}
        <div className="absolute top-0 left-0 bottom-0 w-px bg-gradient-to-b from-neon-cyan/40 via-neon-cyan/10 to-transparent" />

        {/* Right border */}
        <div className="absolute top-0 right-0 bottom-0 w-px bg-terminal-border/60" />

        {/* Logo */}
        <div className="relative flex h-16 items-center justify-between px-5 border-b border-terminal-border/40">
          <div className="flex items-center gap-2.5">
            <span className="text-xl tracking-tighter">
              <span className="text-white font-black">EDGE</span>
              <span className="text-neon-cyan font-black glow-text-cyan logo-shimmer">RELAY</span>
            </span>
            <span className="live-dot" />
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-terminal-card/50 hover:text-slate-200 lg:hidden focus-ring"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="relative flex-1 space-y-1 px-3 py-4">
          {navItems.map(({ label, icon: Icon, to }) => {
            const isActive = location.pathname === to || location.pathname.startsWith(`${to}/`);
            return (
              <NavLink
                key={to}
                to={to}
                onClick={() => setSidebarOpen(false)}
                className={`
                  flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium
                  transition-all duration-200 ease-out
                  focus-ring
                  ${isActive
                    ? 'border-l-2 border-neon-cyan bg-neon-cyan/8 text-neon-cyan glow-text-cyan sidebar-active-glow'
                    : 'text-slate-500 hover:text-slate-300 hover:bg-terminal-card/50 nav-glow-line'
                  }
                `}
              >
                <Icon className="h-[18px] w-[18px] shrink-0" />
                {label}
              </NavLink>
            );
          })}
        </nav>

        {/* Bottom section */}
        <div className="relative p-4 space-y-3">
          {/* Gradient divider */}
          <div className="divider mb-3" />

          {user && (
            <div className="space-y-2">
              <p className="truncate text-sm text-slate-400">{user.email}</p>
              <Badge variant={planBadgeVariant(user.plan)} className="chip">
                {user.plan}
              </Badge>
            </div>
          )}
          <button
            onClick={logout}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-500 transition-all duration-200 ease-out hover:bg-neon-red/5 hover:text-neon-red hover:glow-text-red hover:shadow-[inset_0_0_20px_#ff3d5708] focus-ring group"
          >
            <LogOut className="h-4 w-4 transition-colors duration-200 group-hover:drop-shadow-[0_0_6px_#ff3d5760]" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile top bar */}
        <header className="flex h-14 items-center border-b border-terminal-border/40 backdrop-blur-xl bg-terminal-surface/80 px-4 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-xl p-2 text-slate-500 backdrop-blur-sm bg-terminal-card/30 hover:bg-terminal-card/60 hover:text-neon-cyan transition-all duration-200 focus-ring"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="ml-3 text-lg tracking-tighter">
            <span className="text-white font-black">EDGE</span>
            <span className="text-neon-cyan font-black glow-text-cyan logo-shimmer">RELAY</span>
          </span>
        </header>

        {/* Page content */}
        <main className="scan-line relative flex-1 overflow-y-auto bg-terminal-bg">
          {/* Hex pattern overlay */}
          <div className="bg-hex absolute inset-0 pointer-events-none" />

          {/* Grid overlay */}
          <div className="bg-grid absolute inset-0 pointer-events-none" />

          {/* Ambient glow orbs */}
          <div className="ambient-glow" />

          {/* Content */}
          <div className="relative z-10 p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
