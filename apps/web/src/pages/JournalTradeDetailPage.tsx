import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import { useJournalStore } from '@/stores/journal';
import { TradeAutopsySection } from '@/components/journal/TradeAutopsySection';
import { TradeReplaySection } from '@/components/journal/TradeReplaySection';

/* ------------------------------------------------------------------ */
/*  Formatting helpers                                                 */
/* ------------------------------------------------------------------ */

function formatCurrency(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}$${Math.abs(n).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatPrice(n: number): string {
  return n.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 5,
  });
}

function formatDuration(secs: number | null): string {
  if (secs == null) return '\u2014';
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function formatPips(p: number | null): string {
  if (p == null) return '\u2014';
  const sign = p >= 0 ? '+' : '';
  return `${sign}${p.toFixed(1)}`;
}

function formatTimestamp(ts: number | undefined): string {
  if (!ts) return '\u2014';
  const d = new Date(ts * 1000);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/* ------------------------------------------------------------------ */
/*  Session color helper                                               */
/* ------------------------------------------------------------------ */

const SESSION_COLORS: Record<string, string> = {
  Asian: 'bg-neon-amber/15 text-neon-amber',
  London: 'bg-neon-cyan/15 text-neon-cyan',
  'New York': 'bg-neon-green/15 text-neon-green',
  'Off Hours': 'bg-terminal-muted/15 text-terminal-muted',
};

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-terminal-muted text-xs uppercase tracking-widest mb-1">{label}</p>
      <div className="text-white font-mono-nums">{children}</div>
    </div>
  );
}

function SectionCard({
  title,
  delay = 0,
  children,
}: {
  title: string;
  delay?: number;
  children: React.ReactNode;
}) {
  return (
    <div
      className="glass rounded-2xl p-6 animate-fade-in-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <h2 className="font-display text-lg font-semibold text-white mb-4">{title}</h2>
      <div className="grid grid-cols-2 gap-x-8 gap-y-5">{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Skeleton                                                           */
/* ------------------------------------------------------------------ */

function SkeletonDetail() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="glass rounded-2xl p-6 animate-fade-in-up">
        <div className="skeleton h-4 w-24 rounded mb-4" />
        <div className="skeleton h-10 w-40 rounded mb-3" />
        <div className="flex gap-3 items-center">
          <div className="skeleton h-6 w-14 rounded-lg" />
          <div className="skeleton h-9 w-32 rounded" />
        </div>
      </div>
      {/* Section skeletons */}
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="glass rounded-2xl p-6 animate-fade-in-up"
          style={{ animationDelay: `${(i + 1) * 60}ms` }}
        >
          <div className="skeleton h-5 w-28 rounded mb-4" />
          <div className="grid grid-cols-2 gap-x-8 gap-y-5">
            {Array.from({ length: 4 }).map((_, j) => (
              <div key={j}>
                <div className="skeleton h-3 w-16 rounded mb-2" />
                <div className="skeleton h-5 w-24 rounded" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export function JournalTradeDetailPage() {
  const { accountId, dealTicket } = useParams<{
    accountId: string;
    dealTicket: string;
  }>();

  const { selectedTrade, isLoading, error, fetchTradeDetail } = useJournalStore();

  useEffect(() => {
    if (accountId && dealTicket) {
      fetchTradeDetail(accountId, Number(dealTicket));
    }
  }, [accountId, dealTicket, fetchTradeDetail]);

  /* ── Loading ─────────────────────────────────────────────────── */
  if (isLoading && !selectedTrade) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Back link skeleton */}
        <div className="skeleton h-4 w-32 rounded animate-fade-in-up" />
        <SkeletonDetail />
      </div>
    );
  }

  /* ── Error / Not found ───────────────────────────────────────── */
  if (error || (!isLoading && !selectedTrade)) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <Link
          to="/journal"
          className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-neon-cyan transition-colors"
        >
          <ArrowLeft size={15} />
          Back to Journal
        </Link>

        <div className="glass rounded-2xl p-10 flex flex-col items-center justify-center text-center animate-fade-in-up">
          <AlertTriangle size={40} className="text-neon-red mb-4 opacity-70" />
          <p className="text-neon-red font-semibold text-lg mb-1">
            {error ?? 'Trade not found'}
          </p>
          <p className="text-sm text-terminal-muted">
            The trade detail could not be loaded. Please go back and try again.
          </p>
        </div>
      </div>
    );
  }

  /* ── Resolved trade ──────────────────────────────────────────── */
  const t = selectedTrade!;
  const isBuy = t.direction.toLowerCase() === 'buy';
  const isPositive = t.profit >= 0;
  const net = t.profit + t.commission + t.swap;
  const sessionChip = SESSION_COLORS[t.session_tag] ?? SESSION_COLORS['Off Hours'];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* ── Back link ───────────────────────────────────────────────── */}
      <Link
        to="/journal"
        className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-neon-cyan transition-colors animate-fade-in-up"
      >
        <ArrowLeft size={15} />
        Back to Journal
      </Link>

      {/* ── Header card ─────────────────────────────────────────────── */}
      <div
        className="glass rounded-2xl p-6 animate-fade-in-up"
        style={{ animationDelay: '40ms' }}
      >
        {/* Symbol */}
        <h1 className="font-display text-3xl font-black tracking-tight text-white mb-3">
          {t.symbol}
        </h1>

        {/* Direction badge + Profit */}
        <div className="flex flex-wrap items-center gap-4">
          <span
            className={`chip text-sm font-bold px-3 py-1 rounded-lg ${
              isBuy ? 'bg-neon-green/15 text-neon-green' : 'bg-neon-red/15 text-neon-red'
            }`}
          >
            {t.direction.toUpperCase()}
          </span>
          <span
            className={`text-3xl font-black font-mono-nums ${
              isPositive ? 'text-neon-green glow-text-green' : 'text-neon-red glow-text-red'
            }`}
          >
            {formatCurrency(t.profit)}
          </span>
        </div>
      </div>

      {/* ── Section 1: Trade Info ────────────────────────────────────── */}
      <SectionCard title="Trade Info" delay={80}>
        <DetailRow label="Symbol">{t.symbol}</DetailRow>
        <DetailRow label="Direction">
          <span
            className={`chip text-xs font-semibold px-2 py-0.5 rounded-md ${
              isBuy ? 'bg-neon-green/15 text-neon-green' : 'bg-neon-red/15 text-neon-red'
            }`}
          >
            {t.direction.toUpperCase()}
          </span>
        </DetailRow>
        <DetailRow label="Deal Entry">{t.deal_entry}</DetailRow>
        <DetailRow label="Volume">{t.volume.toFixed(2)} lots</DetailRow>
        <DetailRow label="Magic Number">{t.magic_number}</DetailRow>
        <DetailRow label="Comment">
          {t.comment ? (
            <span className="text-slate-300 font-sans text-sm">{t.comment}</span>
          ) : (
            <span className="text-terminal-muted">&mdash;</span>
          )}
        </DetailRow>
      </SectionCard>

      {/* ── Section 2: Pricing ──────────────────────────────────────── */}
      <SectionCard title="Pricing" delay={140}>
        <DetailRow label="Entry Price">{formatPrice(t.price)}</DetailRow>
        <DetailRow label="Stop Loss">
          {t.sl ? (
            formatPrice(t.sl)
          ) : (
            <span className="text-terminal-muted">&mdash;</span>
          )}
        </DetailRow>
        <DetailRow label="Take Profit">
          {t.tp ? (
            formatPrice(t.tp)
          ) : (
            <span className="text-terminal-muted">&mdash;</span>
          )}
        </DetailRow>
        <DetailRow label="Risk:Reward Ratio">
          {t.risk_reward_ratio != null ? (
            t.risk_reward_ratio.toFixed(2)
          ) : (
            <span className="text-terminal-muted">&mdash;</span>
          )}
        </DetailRow>
      </SectionCard>

      {/* ── Section 3: P&L ──────────────────────────────────────────── */}
      <SectionCard title="P&L" delay={200}>
        <DetailRow label="Profit">
          <span className={isPositive ? 'text-neon-green' : 'text-neon-red'}>
            {formatCurrency(t.profit)}
          </span>
        </DetailRow>
        <DetailRow label="Commission">
          <span className={t.commission <= 0 ? 'text-neon-red' : 'text-slate-300'}>
            {formatCurrency(t.commission)}
          </span>
        </DetailRow>
        <DetailRow label="Swap">
          <span className={t.swap >= 0 ? 'text-slate-300' : 'text-neon-red'}>
            {formatCurrency(t.swap)}
          </span>
        </DetailRow>
        <DetailRow label="Net">
          <span className={net >= 0 ? 'text-neon-green' : 'text-neon-red'}>
            {formatCurrency(net)}
          </span>
        </DetailRow>
        <DetailRow label="Pips">
          <span
            className={
              t.pips != null
                ? t.pips >= 0
                  ? 'text-neon-green'
                  : 'text-neon-red'
                : 'text-terminal-muted'
            }
          >
            {formatPips(t.pips)}
          </span>
        </DetailRow>
        <DetailRow label="Duration">
          <span className={t.duration_seconds != null ? 'text-slate-300' : 'text-terminal-muted'}>
            {formatDuration(t.duration_seconds)}
          </span>
        </DetailRow>
      </SectionCard>

      {/* ── Section 4: Market Context ────────────────────────────────── */}
      <SectionCard title="Market Context" delay={260}>
        <DetailRow label="Session Tag">
          <span className={`chip text-xs font-semibold px-2.5 py-0.5 rounded-lg ${sessionChip}`}>
            {t.session_tag || 'Unknown'}
          </span>
        </DetailRow>
        <DetailRow label="Spread at Entry">
          {t.spread_at_entry != null ? (
            `${t.spread_at_entry} pts`
          ) : (
            <span className="text-terminal-muted">&mdash;</span>
          )}
        </DetailRow>
        <DetailRow label="ATR at Entry">
          {t.atr_at_entry != null ? (
            formatPrice(t.atr_at_entry)
          ) : (
            <span className="text-terminal-muted">&mdash;</span>
          )}
        </DetailRow>
      </SectionCard>

      {/* ── Section 5: Account State ─────────────────────────────────── */}
      <SectionCard title="Account State" delay={320}>
        <DetailRow label="Balance at Trade">
          {t.balance_at_trade != null ? (
            `$${t.balance_at_trade.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`
          ) : (
            <span className="text-terminal-muted">&mdash;</span>
          )}
        </DetailRow>
        <DetailRow label="Equity at Trade">
          {t.equity_at_trade != null ? (
            `$${t.equity_at_trade.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`
          ) : (
            <span className="text-terminal-muted">&mdash;</span>
          )}
        </DetailRow>
      </SectionCard>

      {/* ── Section 6: Meta ──────────────────────────────────────────── */}
      <SectionCard title="Meta" delay={380}>
        <DetailRow label="Deal Ticket">{t.deal_ticket}</DetailRow>
        <DetailRow label="Order Ticket">
          {t.order_ticket != null ? (
            t.order_ticket
          ) : (
            <span className="text-terminal-muted">&mdash;</span>
          )}
        </DetailRow>
        <DetailRow label="Position ID">
          {t.position_id != null ? (
            t.position_id
          ) : (
            <span className="text-terminal-muted">&mdash;</span>
          )}
        </DetailRow>
        <DetailRow label="Synced At">
          <span className="text-slate-300 font-sans text-sm">
            {formatTimestamp(t.synced_at)}
          </span>
        </DetailRow>
      </SectionCard>

      {/* ── Trade Replay ─────────────────────────────────── */}
      <TradeReplaySection trade={t} accountId={accountId!} />

      {/* ── Trade Autopsy (losing trades only) ──────────── */}
      <TradeAutopsySection trade={t} accountId={accountId!} />
    </div>
  );
}
