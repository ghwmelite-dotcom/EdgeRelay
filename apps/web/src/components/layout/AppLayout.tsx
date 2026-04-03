import { useState, useEffect, useCallback, useRef } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Shield, ShieldCheck, AlertTriangle, ArrowLeftRight, Activity, BookOpen, Building2, Dice5, Download, BarChart3, Brain, Gauge, Settings, CreditCard, LogOut, Menu, X, Send, ExternalLink, Loader2, Store, FlaskConical, Radio, Crown, Gift } from 'lucide-react';
import { useAuthStore } from '@/stores/auth';
import { Badge } from '@/components/ui/Badge';
import { useNotificationStore } from '@/stores/notifications';

const ADMIN_EMAILS = ['oh84dev@gmail.com'];

const NAV_GROUPS = [
  {
    label: null,
    items: [
      { label: 'Dashboard', icon: LayoutDashboard, to: '/dashboard' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { label: 'Command Center', icon: Shield, to: '/command-center' },
      { label: 'Risk Monitor', icon: AlertTriangle, to: '/risk' },
      { label: 'Signal Log', icon: Activity, to: '/signals' },
      { label: 'Discipline', icon: Brain, to: '/discipline' },
    ],
  },
  {
    label: 'Portfolio',
    items: [
      { label: 'Copier', icon: ArrowLeftRight, to: '/accounts' },
      { label: 'Marketplace', icon: Store, to: '/app/marketplace' },
      { label: 'My Provider', icon: Radio, to: '/provider/setup' },
      { label: 'Journal', icon: BookOpen, to: '/journal' },
      { label: 'Analytics', icon: BarChart3, to: '/analytics' },
    ],
  },
  {
    label: 'Tools',
    items: [
      { label: 'Prop Firm Hub', icon: ShieldCheck, to: '/app/prop-firms', highlight: true },
      { label: 'Simulator', icon: Dice5, to: '/simulator' },
      { label: 'Strategy Hub', icon: FlaskConical, to: '/app/strategy-hub' },
      { label: 'Firm Directory', icon: Building2, to: '/app/firms' },
      { label: 'Downloads', icon: Download, to: '/downloads' },
    ],
  },
  {
    label: 'Account',
    items: [
      { label: 'Usage', icon: Gauge, to: '/usage' },
      { label: 'Settings', icon: Settings, to: '/settings' },
      { label: 'Referrals', icon: Gift, to: '/referrals' },
      { label: 'Billing', icon: CreditCard, to: '/billing' },
      { label: 'Admin', icon: Crown, to: '/admin', adminOnly: true },
    ],
  },
];

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

  const { telegramConnected, checkTelegramStatus, generateDeepLink, isLinking } =
    useNotificationStore();
  const [sidebarTgLink, setSidebarTgLink] = useState<string | null>(null);
  const [sidebarChecking, setSidebarChecking] = useState(false);
  const sidebarTgLinkRef = useRef<string | null>(null);

  // Keep ref in sync so the stable callback can read the latest value
  useEffect(() => {
    sidebarTgLinkRef.current = sidebarTgLink;
  }, [sidebarTgLink]);

  const handleSidebarVisibility = useCallback(() => {
    if (document.visibilityState === 'visible' && sidebarTgLinkRef.current) {
      setSidebarChecking(true);
      checkTelegramStatus().finally(() => setSidebarChecking(false));
    }
  }, [checkTelegramStatus]);

  useEffect(() => {
    checkTelegramStatus();
    document.addEventListener('visibilitychange', handleSidebarVisibility);
    window.addEventListener('focus', handleSidebarVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleSidebarVisibility);
      window.removeEventListener('focus', handleSidebarVisibility);
    };
  }, [handleSidebarVisibility]);

  // Clear link once connected
  useEffect(() => {
    if (telegramConnected) setSidebarTgLink(null);
  }, [telegramConnected]);

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
              <span className="text-white font-black">TRADE</span>
              <span className="text-neon-cyan font-black glow-text-cyan logo-shimmer">METRICS</span>
              <span className="ml-1 text-xs font-semibold text-terminal-muted uppercase tracking-widest">Pro</span>
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

        {/* Navigation — scrollable if items overflow */}
        <nav className="relative flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {NAV_GROUPS.map((group, gi) => (
            <div key={gi}>
              {group.label && (
                <div className="flex items-center gap-2 px-3 mb-2">
                  <span className="text-[11px] uppercase tracking-[2px] font-semibold text-terminal-muted/70">
                    {group.label}
                  </span>
                  <div className="flex-1 h-px bg-terminal-border/30" />
                </div>
              )}
              <div className="space-y-0.5">
                {group.items.filter((item) => !('adminOnly' in item && item.adminOnly) || ADMIN_EMAILS.includes(user?.email ?? '')).map((item) => {
                  const { label, icon: Icon, to } = item;
                  const isHighlight = 'highlight' in item && !!(item as { highlight?: boolean }).highlight;
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
                          : isHighlight
                            ? 'text-neon-green border border-neon-green/20 bg-neon-green/[0.06] hover:bg-neon-green/10 hover:border-neon-green/30 hover:shadow-[0_0_16px_rgba(0,255,157,0.08)]'
                            : 'text-slate-500 hover:text-slate-300 hover:bg-terminal-card/50 nav-glow-line'
                        }
                      `}
                    >
                      <Icon className={`h-[18px] w-[18px] shrink-0 ${isHighlight && !isActive ? 'drop-shadow-[0_0_4px_rgba(0,255,157,0.5)]' : ''}`} />
                      {label}
                      {isHighlight && !isActive && (
                        <span className="ml-auto flex h-[6px] w-[6px]">
                          <span className="absolute inline-flex h-[6px] w-[6px] animate-ping rounded-full bg-neon-green opacity-40" />
                          <span className="relative inline-flex h-[6px] w-[6px] rounded-full bg-neon-green shadow-[0_0_6px_rgba(0,255,157,0.6)]" />
                        </span>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Telegram Widget */}
        <div className="shrink-0 px-4 pb-2">
          {telegramConnected ? (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-500/5 border border-emerald-500/20 px-3 py-2.5">
              <div className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#22c55e80]" />
              <span className="text-xs font-medium text-emerald-400">Telegram Connected</span>
            </div>
          ) : (
            <div className="rounded-xl bg-[#0088cc]/5 border border-[#0088cc]/20 p-3">
              <div className="flex items-center gap-2 mb-1.5">
                <Send size={14} className="text-[#0088cc]" />
                <span className="text-xs font-semibold text-[#0088cc]">Telegram Alerts</span>
              </div>
              <p className="text-[10px] text-terminal-muted mb-2">Get instant trade alerts</p>
              {sidebarTgLink ? (
                <div className="space-y-1.5">
                  <a
                    href={sidebarTgLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#0088cc] py-1.5 text-[11px] font-semibold text-white transition-all hover:bg-[#0099dd]"
                  >
                    Open Telegram <ExternalLink size={11} />
                  </a>
                  {sidebarChecking && (
                    <p className="flex items-center justify-center gap-1 text-[10px] text-neon-cyan">
                      <Loader2 size={10} className="animate-spin" /> Checking…
                    </p>
                  )}
                </div>
              ) : (
                <button
                  onClick={async () => {
                    const link = await generateDeepLink();
                    if (link) {
                      useNotificationStore.setState({ isLinking: false });
                      setSidebarTgLink(link);
                    }
                  }}
                  disabled={isLinking}
                  className="w-full rounded-lg bg-[#0088cc] py-1.5 text-[11px] font-semibold text-white transition-all hover:bg-[#0099dd] disabled:opacity-50"
                >
                  {isLinking ? 'Generating…' : 'Connect'}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Bottom section — always visible, pinned to bottom */}
        <div className="relative shrink-0 p-4 space-y-3 border-t border-terminal-border/30">
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
            <span className="text-white font-black">TRADE</span>
            <span className="text-neon-cyan font-black glow-text-cyan logo-shimmer">METRICS</span>
            <span className="ml-1 text-xs font-semibold text-terminal-muted uppercase tracking-widest">Pro</span>
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
          <div className="relative z-10 p-4 sm:p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
