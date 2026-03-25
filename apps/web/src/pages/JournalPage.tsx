import { useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen } from 'lucide-react';
import { useAccountsStore } from '@/stores/accounts';
import { useJournalStore, type JournalFilters } from '@/stores/journal';
import { EquityCurve } from '@/components/journal/EquityCurve';
import { TradeFilters } from '@/components/journal/TradeFilters';
import { Select } from '@/components/ui/Select';

/* ------------------------------------------------------------------ */
/*  Formatting helpers                                                 */
/* ------------------------------------------------------------------ */

function formatTime(ts: number): string {
  const d = new Date(ts * 1000);
  const mon = d.toLocaleString('en-US', { month: 'short' });
  const day = d.getDate();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${mon} ${day}, ${hh}:${mm}`;
}

function formatDuration(secs: number | null): string {
  if (secs == null) return '\u2014';
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${secs}s`;
}

function formatCurrency(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}$${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatPips(p: number | null): string {
  if (p == null) return '\u2014';
  const sign = p >= 0 ? '+' : '';
  return `${sign}${p.toFixed(1)}`;
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
/*  Skeleton helpers                                                   */
/* ------------------------------------------------------------------ */

function SkeletonCard({ delay = 0 }: { delay?: number }) {
  return (
    <div
      className="animate-fade-in-up glass rounded-2xl p-5"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="skeleton h-3 w-20 mb-3 rounded" />
      <div className="skeleton h-8 w-24 rounded" />
    </div>
  );
}

function SkeletonRow({ delay = 0 }: { delay?: number }) {
  return (
    <tr
      className="border-b border-terminal-border/50 animate-fade-in-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      {Array.from({ length: 8 }).map((_, j) => (
        <td key={j} className="px-3 py-3">
          <div className="skeleton h-4 w-16 rounded" />
        </td>
      ))}
    </tr>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export function JournalPage() {
  const navigate = useNavigate();

  // Accounts
  const { accounts, fetchAccounts } = useAccountsStore();

  // Journal
  const {
    trades,
    stats,
    symbolStats,
    sessionStats,
    dailyPnl,
    isLoading,
    hasMore,
    selectedAccountId,
    fetchAll,
    fetchTrades,
    fetchMoreTrades,
  } = useJournalStore();

  const setSelectedAccountId = useCallback(
    (id: string) => useJournalStore.setState({ selectedAccountId: id }),
    [],
  );

  // Infinite scroll sentinel
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingMoreRef = useRef(false);

  // ── Fetch accounts on mount ─────────────────────────────────────
  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  // Auto-select first account if none selected
  useEffect(() => {
    if (!selectedAccountId && accounts.length > 0) {
      setSelectedAccountId(accounts[0].id);
    }
  }, [accounts, selectedAccountId, setSelectedAccountId]);

  // ── Fetch all journal data when account changes ─────────────────
  useEffect(() => {
    if (selectedAccountId) {
      fetchAll(selectedAccountId);
    }
  }, [selectedAccountId, fetchAll]);

  // ── Handle filter changes ───────────────────────────────────────
  const handleFilterChange = useCallback(() => {
    if (selectedAccountId) {
      fetchTrades(selectedAccountId);
    }
  }, [selectedAccountId, fetchTrades]);

  // ── Infinite scroll observer ────────────────────────────────────
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          hasMore &&
          !loadingMoreRef.current &&
          selectedAccountId
        ) {
          loadingMoreRef.current = true;
          fetchMoreTrades(selectedAccountId).finally(() => {
            loadingMoreRef.current = false;
          });
        }
      },
      { rootMargin: '200px' },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, selectedAccountId, fetchMoreTrades]);

  // ── Derived values ──────────────────────────────────────────────
  const accountOptions = accounts.map((a) => ({
    value: a.id,
    label: `${a.alias} (${a.role})`,
  }));

  const maxSymbolProfit = symbolStats.length > 0
    ? Math.max(...symbolStats.map((s) => Math.abs(s.profit)), 1)
    : 1;

  const maxSessionProfit = sessionStats.length > 0
    ? Math.max(...sessionStats.map((s) => Math.abs(s.profit)), 1)
    : 1;

  return (
    <div className="space-y-8">
      {/* ── Section 1: Header + Account Selector ───────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in-up">
        <h1 className="text-3xl font-black tracking-tight text-white font-display">
          Trade Journal
        </h1>
        <div className="w-64">
          <Select
            label="Account"
            options={accountOptions}
            value={selectedAccountId ?? ''}
            onChange={(e) => setSelectedAccountId(e.target.value)}
          />
        </div>
      </div>

      {/* ── Section 2: Stat Cards ──────────────────────────────────── */}
      {!stats && isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} delay={i * 60} />
          ))}
        </div>
      ) : stats ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Total Trades */}
            <div
              className="animate-fade-in-up glass rounded-2xl p-5"
              style={{ animationDelay: '0ms' }}
            >
              <p className="text-[10px] uppercase tracking-[0.15em] text-terminal-muted font-medium mb-2">
                Total Trades
              </p>
              <p className="text-3xl font-black font-mono-nums text-neon-cyan glow-text-cyan">
                {stats.total_trades}
              </p>
            </div>

            {/* Win Rate */}
            <div
              className="animate-fade-in-up glass rounded-2xl p-5"
              style={{ animationDelay: '60ms' }}
            >
              <p className="text-[10px] uppercase tracking-[0.15em] text-terminal-muted font-medium mb-2">
                Win Rate
              </p>
              <p
                className={`text-3xl font-black font-mono-nums ${
                  stats.win_rate >= 50
                    ? 'text-neon-green glow-text-green'
                    : 'text-neon-red glow-text-red'
                }`}
              >
                {stats.win_rate.toFixed(1)}%
              </p>
            </div>

            {/* Net Profit */}
            <div
              className="animate-fade-in-up glass rounded-2xl p-5"
              style={{ animationDelay: '120ms' }}
            >
              <p className="text-[10px] uppercase tracking-[0.15em] text-terminal-muted font-medium mb-2">
                Net Profit
              </p>
              <p
                className={`text-3xl font-black font-mono-nums ${
                  stats.net_profit >= 0
                    ? 'text-neon-green glow-text-green'
                    : 'text-neon-red glow-text-red'
                }`}
              >
                {formatCurrency(stats.net_profit)}
              </p>
            </div>

            {/* Profit Factor */}
            <div
              className="animate-fade-in-up glass rounded-2xl p-5"
              style={{ animationDelay: '180ms' }}
            >
              <p className="text-[10px] uppercase tracking-[0.15em] text-terminal-muted font-medium mb-2">
                Profit Factor
              </p>
              <p className="text-3xl font-black font-mono-nums text-neon-cyan glow-text-cyan">
                {stats.profit_factor.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Smaller stats row */}
          <div
            className="glass rounded-2xl p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 animate-fade-in-up"
            style={{ animationDelay: '240ms' }}
          >
            <MiniStat label="Avg Winner" value={formatCurrency(stats.avg_winner)} positive />
            <MiniStat label="Avg Loser" value={formatCurrency(stats.avg_loser)} positive={false} />
            <MiniStat label="Best Trade" value={formatCurrency(stats.best_trade)} positive />
            <MiniStat label="Worst Trade" value={formatCurrency(stats.worst_trade)} positive={false} />
            <MiniStat label="Avg Duration" value={formatDuration(stats.avg_duration_seconds)} />
            <MiniStat label="Avg R:R" value={stats.avg_rr.toFixed(2)} />
          </div>
        </>
      ) : null}

      {/* ── Section 3: Charts Row ──────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Equity Curve */}
        <div
          className="glass rounded-2xl p-5 animate-fade-in-up"
          style={{ animationDelay: '300ms' }}
        >
          <h3 className="text-[10px] uppercase tracking-[0.15em] text-terminal-muted font-medium mb-4">
            Equity Curve
          </h3>
          <EquityCurve data={dailyPnl} />
        </div>

        {/* Symbol Breakdown */}
        <div
          className="glass rounded-2xl p-5 animate-fade-in-up"
          style={{ animationDelay: '360ms' }}
        >
          <h3 className="text-[10px] uppercase tracking-[0.15em] text-terminal-muted font-medium mb-4">
            By Symbol
          </h3>
          {symbolStats.length === 0 ? (
            <p className="text-sm text-terminal-muted text-center py-8">No data</p>
          ) : (
            <div className="space-y-2.5">
              {symbolStats.map((s) => {
                const pct = (Math.abs(s.profit) / maxSymbolProfit) * 100;
                const positive = s.profit >= 0;
                return (
                  <div key={s.symbol} className="flex items-center gap-3">
                    <span className="w-16 text-xs text-slate-300 font-medium shrink-0 truncate">
                      {s.symbol}
                    </span>
                    <div className="flex-1 h-5 rounded bg-terminal-surface/60 overflow-hidden relative">
                      <div
                        className={`h-full rounded transition-all ${
                          positive ? 'bg-neon-green/60' : 'bg-neon-red/60'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span
                      className={`font-mono-nums text-xs w-20 text-right shrink-0 ${
                        positive ? 'text-neon-green' : 'text-neon-red'
                      }`}
                    >
                      {formatCurrency(s.profit)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Section 4: Session Breakdown ───────────────────────────── */}
      <div
        className="glass rounded-2xl p-5 animate-fade-in-up"
        style={{ animationDelay: '420ms' }}
      >
        <h3 className="text-[10px] uppercase tracking-[0.15em] text-terminal-muted font-medium mb-4">
          Session Breakdown
        </h3>
        {sessionStats.length === 0 ? (
          <p className="text-sm text-terminal-muted text-center py-6">No data</p>
        ) : (
          <div className="space-y-3">
            {sessionStats.map((s) => {
              const pct = (Math.abs(s.profit) / maxSessionProfit) * 100;
              const positive = s.profit >= 0;
              const chipClass = SESSION_COLORS[s.session] ?? SESSION_COLORS['Off Hours'];
              return (
                <div key={s.session} className="flex items-center gap-3">
                  <span
                    className={`chip text-[11px] font-medium px-2.5 py-0.5 rounded-lg shrink-0 w-24 text-center ${chipClass}`}
                  >
                    {s.session}
                  </span>
                  <div className="flex-1 h-5 rounded bg-terminal-surface/60 overflow-hidden">
                    <div
                      className={`h-full rounded transition-all ${
                        positive ? 'bg-neon-green/50' : 'bg-neon-red/50'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs text-terminal-muted font-mono-nums w-14 text-right shrink-0">
                    {s.trades} trades
                  </span>
                  <span
                    className={`font-mono-nums text-xs w-20 text-right shrink-0 ${
                      positive ? 'text-neon-green' : 'text-neon-red'
                    }`}
                  >
                    {formatCurrency(s.profit)}
                  </span>
                  <span className="text-xs text-terminal-muted font-mono-nums w-12 text-right shrink-0">
                    {s.win_rate.toFixed(0)}%
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Section 5: Trade List ──────────────────────────────────── */}
      <section className="space-y-4 animate-fade-in-up" style={{ animationDelay: '480ms' }}>
        {/* Filters */}
        <div className="glass rounded-2xl p-4">
          <TradeFilters onFilterChange={handleFilterChange} />
        </div>

        {/* Table */}
        {trades.length === 0 && !isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <BookOpen size={40} className="text-terminal-muted mb-4 opacity-30" />
            <p className="text-sm text-terminal-muted">
              No trades yet &mdash; attach the TradeJournal_Sync EA to start syncing
            </p>
          </div>
        ) : (
          <div className="glass rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-sm">
                <thead>
                  <tr className="bg-terminal-surface/80 sticky top-0 z-10">
                    <Th>Time</Th>
                    <Th>Symbol</Th>
                    <Th>Direction</Th>
                    <Th>Entry</Th>
                    <Th align="right">Volume</Th>
                    <Th align="right">Profit</Th>
                    <Th align="right">Pips</Th>
                    <Th align="right">Duration</Th>
                  </tr>
                </thead>
                <tbody>
                  {trades.map((trade, i) => {
                    const positive = trade.profit >= 0;
                    const isBuy = trade.direction.toLowerCase() === 'buy';
                    return (
                      <tr
                        key={trade.deal_ticket}
                        className="data-row animate-fade-in-up border-b border-terminal-border/50 last:border-0 cursor-pointer transition-colors"
                        style={{ animationDelay: `${i * 40}ms` }}
                        onClick={() =>
                          navigate(`/journal/${selectedAccountId}/${trade.deal_ticket}`)
                        }
                      >
                        <td className="px-3 py-2.5 font-mono-nums text-neon-cyan/70 text-xs">
                          {formatTime(trade.time)}
                        </td>
                        <td className="px-3 py-2.5 text-slate-200 font-medium text-xs">
                          {trade.symbol}
                        </td>
                        <td className="px-3 py-2.5">
                          <span
                            className={`chip text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                              isBuy
                                ? 'bg-neon-green/15 text-neon-green'
                                : 'bg-neon-red/15 text-neon-red'
                            }`}
                          >
                            {trade.direction.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-terminal-muted text-xs">
                          {trade.deal_entry}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono-nums text-slate-200 text-xs">
                          {trade.volume.toFixed(2)}
                        </td>
                        <td
                          className={`px-3 py-2.5 text-right font-mono-nums text-xs ${
                            positive ? 'text-neon-green' : 'text-neon-red'
                          }`}
                        >
                          {formatCurrency(trade.profit)}
                        </td>
                        <td
                          className={`px-3 py-2.5 text-right font-mono-nums text-xs ${
                            trade.pips != null
                              ? trade.pips >= 0
                                ? 'text-neon-green'
                                : 'text-neon-red'
                              : 'text-terminal-muted'
                          }`}
                        >
                          {formatPips(trade.pips)}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono-nums text-terminal-muted text-xs">
                          {formatDuration(trade.duration_seconds)}
                        </td>
                      </tr>
                    );
                  })}

                  {/* Loading skeleton rows */}
                  {isLoading &&
                    Array.from({ length: 5 }).map((_, i) => (
                      <SkeletonRow key={`skel-${i}`} delay={i * 40} />
                    ))}
                </tbody>
              </table>
            </div>

            {/* Infinite scroll sentinel */}
            <div ref={sentinelRef} className="h-1" />
          </div>
        )}
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function MiniStat({
  label,
  value,
  positive,
}: {
  label: string;
  value: string;
  positive?: boolean;
}) {
  const colorClass =
    positive === true
      ? 'text-neon-green'
      : positive === false
        ? 'text-neon-red'
        : 'text-slate-300';

  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.15em] text-terminal-muted font-medium mb-1">
        {label}
      </p>
      <p className={`font-mono-nums text-sm font-semibold ${colorClass}`}>{value}</p>
    </div>
  );
}

function Th({
  children,
  align = 'left',
}: {
  children: React.ReactNode;
  align?: 'left' | 'right';
}) {
  return (
    <th
      className={`px-3 py-3 text-${align} text-[10px] font-medium uppercase tracking-[0.15em] text-terminal-muted`}
    >
      {children}
    </th>
  );
}
