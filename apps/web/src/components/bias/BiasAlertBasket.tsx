// BiasAlertBasket — bell icon + slide-over panel that persists the user's
// phase-transition alerts with quality tier grading.
//
// The bell shows an unread count badge; clicking opens a panel with the
// last 50 alerts. Each alert is tagged A+ / A / B / C so the user can
// immediately see which signals had full confluence vs partial.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, BellOff, CheckCheck, X as XIcon, TrendingUp, TrendingDown, Circle, Zap } from 'lucide-react';
import { api } from '@/lib/api';
import type { AlertHistoryItem, AlertQuality, InboxResponse } from '@edgerelay/shared';
import { useAuthStore } from '@/stores/auth';

const POLL_MS = 60_000;

const QUALITY_META: Record<AlertQuality, { label: string; color: string; bg: string; border: string; accent: string }> = {
  A_PLUS: { label: 'A+', color: '#00ff9d', bg: 'rgba(0,255,157,0.10)', border: 'rgba(0,255,157,0.45)', accent: 'shadow-[0_0_18px_rgba(0,255,157,0.35)]' },
  A:      { label: 'A',  color: '#00e5ff', bg: 'rgba(0,229,255,0.08)', border: 'rgba(0,229,255,0.35)', accent: '' },
  B:      { label: 'B',  color: '#ffb800', bg: 'rgba(255,184,0,0.08)', border: 'rgba(255,184,0,0.30)', accent: '' },
  C:      { label: 'C',  color: '#ff3d57', bg: 'rgba(255,61,87,0.06)', border: 'rgba(255,61,87,0.25)', accent: '' },
};

export function BiasAlertBasket() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<InboxResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchInbox = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    const res = await api.get<InboxResponse>('/bias-alerts/inbox');
    if (res.data) setData(res.data);
    setLoading(false);
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchInbox();
    const t = window.setInterval(fetchInbox, POLL_MS);
    return () => window.clearInterval(t);
  }, [isAuthenticated, fetchInbox]);

  // Mark all as read when the panel opens (but wait a tick so user sees the
  // badge one last time before it drops, then animate out).
  useEffect(() => {
    if (!open || !data || data.unreadCount === 0) return;
    const t = window.setTimeout(async () => {
      await api.post('/bias-alerts/inbox/mark-read', {});
      fetchInbox();
    }, 1200);
    return () => window.clearTimeout(t);
  }, [open, data, fetchInbox]);

  if (!isAuthenticated) return null;

  const unread = data?.unreadCount ?? 0;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl border border-terminal-border/60 bg-terminal-surface/40 text-slate-300 hover:text-neon-cyan hover:border-neon-cyan/40 transition-colors"
        aria-label={`Bias alerts (${unread} unread)`}
      >
        <Bell size={14} />
        {unread > 0 && (
          <span
            className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-neon-red text-[9px] font-bold text-white flex items-center justify-center font-mono-nums"
            style={{ boxShadow: '0 0 6px rgba(255,61,87,0.6)' }}
          >
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            style={{ animation: 'tm-basket-fade 160ms ease-out both' }}
            onClick={() => setOpen(false)}
          />
          <aside
            className="fixed top-0 right-0 z-50 h-screen w-full sm:w-[440px] bg-terminal-bg border-l border-terminal-border/60 shadow-[-20px_0_60px_rgba(0,0,0,0.5)] flex flex-col"
            style={{ animation: 'tm-basket-slide 220ms cubic-bezier(0.33, 1, 0.68, 1) both' }}
            role="dialog"
            aria-label="Bias alerts"
          >
            <style>{`
              @keyframes tm-basket-fade { from { opacity: 0; } to { opacity: 1; } }
              @keyframes tm-basket-slide {
                from { transform: translateX(24px); opacity: 0; }
                to   { transform: translateX(0);    opacity: 1; }
              }
            `}</style>
            <header className="flex items-center justify-between gap-3 px-5 py-4 border-b border-terminal-border/40 bg-terminal-surface/40">
              <div className="flex items-center gap-2">
                <Bell size={16} className="text-neon-cyan" />
                <h2 className="text-[13px] uppercase tracking-[0.16em] text-slate-200 font-bold">
                  Bias alerts
                </h2>
                {unread > 0 && (
                  <span className="text-[10px] font-mono-nums font-bold text-neon-red bg-neon-red/10 border border-neon-red/25 rounded px-1.5 py-0.5">
                    {unread} new
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {data && data.alerts.length > 0 && unread > 0 && (
                  <button
                    type="button"
                    onClick={async () => {
                      await api.post('/bias-alerts/inbox/mark-read', {});
                      fetchInbox();
                    }}
                    className="inline-flex items-center gap-1 rounded-lg border border-terminal-border/50 bg-terminal-surface/40 px-2.5 py-1 text-[10px] font-semibold text-slate-300 hover:text-neon-cyan hover:border-neon-cyan/40 transition-colors"
                  >
                    <CheckCheck size={11} />
                    Mark all
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close"
                  className="text-terminal-muted hover:text-slate-200 transition-colors"
                >
                  <XIcon size={16} />
                </button>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto">
              {loading && !data ? (
                <div className="p-5 space-y-3">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="h-[110px] rounded-xl border border-terminal-border/40 bg-terminal-surface/30 animate-pulse" />
                  ))}
                </div>
              ) : !data || data.alerts.length === 0 ? (
                <EmptyState />
              ) : (
                <div className="p-4 space-y-3">
                  {data.alerts.map((a) => (
                    <AlertCard key={a.id} alert={a} />
                  ))}
                </div>
              )}
            </div>

            <footer className="px-5 py-3 border-t border-terminal-border/40 bg-terminal-surface/30 text-[10px] text-terminal-muted flex items-center justify-between">
              <Link to="/settings" className="hover:text-neon-cyan transition-colors" onClick={() => setOpen(false)}>
                Manage alert preferences →
              </Link>
              <Link to="/track-record" className="hover:text-neon-cyan transition-colors" onClick={() => setOpen(false)}>
                Engine track record →
              </Link>
            </footer>
          </aside>
        </>
      )}
    </>
  );
}

function AlertCard({ alert }: { alert: AlertHistoryItem }) {
  const q = QUALITY_META[alert.quality];
  const isBullish = alert.bias === 'BULLISH';
  const minsAgo = Math.max(0, Math.round((Date.now() / 1000 - alert.firedAtUnix) / 60));
  const timeStr = minsAgo < 1 ? 'just now' : minsAgo < 60 ? `${minsAgo}m ago` : minsAgo < 1440 ? `${Math.round(minsAgo / 60)}h ago` : `${Math.round(minsAgo / 1440)}d ago`;
  const [showDetails, setShowDetails] = useState(false);

  const headlineWarning = useMemo(() => {
    if (alert.quality === 'A_PLUS') return null;
    const missed = alert.criteria.filter((c) => !c.met).slice(0, 2).map((c) => {
      if (c.key === 'confluence_aligned') return '1H not confirming';
      if (c.key === 'optimal_zone') return 'not in optimal zone';
      if (c.key === 'session_relevance') return 'off-hours for this asset';
      if (c.key === 'phase_continuation') return 'not yet Continuation';
      if (c.key === 'momentum') return 'weak momentum';
      if (c.key === 'confidence') return 'low confidence';
      if (c.key === 'other_tf_agree') return 'other TF disagreeing';
      if (c.key === 'tradeable') return 'structure unclear';
      return '';
    }).filter(Boolean);
    return missed.length > 0 ? missed.join(' · ') : null;
  }, [alert]);

  return (
    <Link
      to={`/bias/${alert.symbol.toLowerCase()}?alert=${alert.firedAtUnix}&tf=${alert.interval}&strategy=${alert.strategy.toLowerCase()}`}
      className={`block rounded-xl border transition-all hover:border-opacity-100 ${
        alert.readAtUnix === null ? 'ring-1 ring-neon-cyan/20' : 'opacity-80'
      } ${q.accent}`}
      style={{
        background: q.bg,
        borderColor: q.border,
      }}
    >
      <div className="p-3.5">
        {/* Header row: strategy + quality + symbol + phase */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            {/* Strategy badge — cyan for ICC, purple for ORB — so users
                can distinguish the two engines at a glance. */}
            <span
              className="inline-flex items-center justify-center h-5 rounded px-1.5 text-[9px] font-black uppercase tracking-[0.14em]"
              style={{
                color: alert.strategy === 'ORB' ? '#b18cff' : '#00e5ff',
                background: alert.strategy === 'ORB' ? 'rgba(177,140,255,0.10)' : 'rgba(0,229,255,0.10)',
                border: `1px solid ${alert.strategy === 'ORB' ? 'rgba(177,140,255,0.45)' : 'rgba(0,229,255,0.45)'}`,
              }}
              title={alert.strategy === 'ORB' ? 'Opening Range Breakout' : 'ICC structural transition'}
            >
              {alert.strategy}
            </span>
            <span
              className="inline-flex items-center justify-center h-5 min-w-[26px] rounded px-1 text-[10px] font-black"
              style={{
                color: q.color,
                background: `${q.color}15`,
                border: `1px solid ${q.color}60`,
              }}
            >
              {alert.quality === 'A_PLUS' && <Zap size={9} className="mr-0.5" />}
              {q.label}
            </span>
            <span className="font-mono-nums text-[13px] font-bold text-slate-100">
              {alert.symbol}
            </span>
            <span className="text-[9px] uppercase tracking-[0.14em] text-terminal-muted font-semibold">
              {alert.interval === '4h' ? '4H' : alert.interval === '1h' ? '1H' : '15M'}
            </span>
            {isBullish ? (
              <TrendingUp size={11} className="text-neon-green" />
            ) : alert.bias === 'BEARISH' ? (
              <TrendingDown size={11} className="text-neon-red" />
            ) : (
              <Circle size={9} className="text-terminal-muted" />
            )}
          </div>
          <span className="text-[10px] font-mono-nums text-terminal-muted whitespace-nowrap">
            {timeStr}
          </span>
        </div>

        {/* Phase transition */}
        <p className="text-[11px] text-slate-300 mb-1.5">
          {alert.previousPhase ? (
            <>
              <span className="text-terminal-muted">{alert.previousPhase}</span>
              <span className="mx-1.5 text-terminal-muted">→</span>
              <span style={{ color: q.color }} className="font-semibold">
                {alert.phase}
              </span>
            </>
          ) : (
            <span style={{ color: q.color }} className="font-semibold">{alert.phase}</span>
          )}
          <span className="ml-2 text-terminal-muted">· {alert.bias}</span>
        </p>

        {/* Quality warning when not A+ */}
        {headlineWarning && (
          <div className="mb-2 flex items-start gap-1.5 text-[10px]" style={{ color: q.color }}>
            <span>⚠</span>
            <span>{headlineWarning}</span>
          </div>
        )}

        {/* Trade plan summary */}
        {alert.tradePlan && (
          <div className="grid grid-cols-3 gap-2 mb-2 text-[10px]">
            <PlanCell label="Entry" value={alert.tradePlan.entry} color="#fafafa" />
            <PlanCell label="SL" value={alert.tradePlan.stopLoss} color="#ff3d57" />
            <PlanCell label="TP·2R" value={alert.tradePlan.takeProfit1} color="#00ff9d" />
          </div>
        )}

        {/* Narrative (if present + short) */}
        {alert.narrative && (
          <p className="text-[10px] italic text-terminal-muted leading-snug line-clamp-2">
            "{alert.narrative}"
          </p>
        )}

        {/* Criteria drill-down toggle */}
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowDetails((v) => !v); }}
          className="mt-2 text-[9px] uppercase tracking-[0.14em] text-terminal-muted/70 hover:text-neon-cyan font-semibold flex items-center gap-1"
        >
          {alert.metCount}/{alert.totalCount} criteria met {showDetails ? '▲' : '▼'}
        </button>

        {showDetails && (
          <ul className="mt-1.5 space-y-0.5" onClick={(e) => e.preventDefault()}>
            {alert.criteria.map((c) => (
              <li key={c.key} className="flex items-start gap-1.5 text-[10px]">
                <span className={c.met ? 'text-neon-green' : 'text-terminal-muted/50'}>
                  {c.met ? '✓' : '✗'}
                </span>
                <span className={c.met ? 'text-slate-300' : 'text-terminal-muted/70 line-through'}>
                  {c.label}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Link>
  );
}

function PlanCell({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <p className="text-[9px] uppercase tracking-[0.12em] text-terminal-muted font-semibold">
        {label}
      </p>
      <p className="font-mono-nums text-[12px] font-bold" style={{ color }}>
        {value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 5 })}
      </p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="p-8 flex flex-col items-center justify-center h-full text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-terminal-border/40 bg-terminal-surface/40 mb-4">
        <BellOff size={20} className="text-terminal-muted" />
      </div>
      <p className="text-[13px] font-semibold text-slate-200 mb-1">No alerts yet</p>
      <p className="text-[11px] text-terminal-muted leading-relaxed max-w-[260px]">
        Toggle phase alerts on tracked assets in <Link to="/settings" className="text-neon-cyan hover:underline">Settings → ICC Bias Alerts</Link> to start receiving them.
      </p>
      <p className="text-[10px] text-terminal-muted/70 mt-3">
        The inbox grades every alert <span className="text-neon-green font-bold">A+</span> / <span className="text-neon-cyan font-bold">A</span> / <span className="text-neon-amber font-bold">B</span> / <span className="text-neon-red font-bold">C</span> based on how many ICC criteria aligned at the moment it fired.
      </p>
    </div>
  );
}
