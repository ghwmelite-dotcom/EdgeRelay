import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Shield,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Activity,
  BarChart3,
  Zap,
  CheckCircle,
} from 'lucide-react';
import { useAccountsStore } from '@/stores/accounts';
import { useCommandCenterStore, type AccountHealthResult } from '@/stores/commandCenter';
import { HealthGauge } from '@/components/command/HealthGauge';
import { Badge } from '@/components/ui/Badge';
import { api } from '@/lib/api';

// ── Types ──────────────────────────────────────────────────────

interface SymbolStat {
  symbol: string;
  trades: number;
  profit: number;
  win_rate: number;
}

interface DailyPnl {
  date: string;
  trades: number;
  profit: number;
  cumulative_profit: number;
}

// ── Constants ──────────────────────────────────────────────────

const CORRELATED_PAIRS: [string, string][] = [
  ['EURUSD', 'GBPUSD'],   // both USD shorts
  ['EURUSD', 'USDCHF'],   // inverse
  ['AUDUSD', 'NZDUSD'],   // commodity bloc
  ['USDJPY', 'EURJPY'],   // JPY exposure
  ['XAUUSD', 'XAGUSD'],   // metals
  ['US500', 'NAS100'],     // indices
];

// ── Helpers ────────────────────────────────────────────────────

function formatCurrency(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}$${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function metricBarColor(usedPercent: number): string {
  if (usedPercent > 80) return 'bg-neon-red';
  if (usedPercent > 60) return 'bg-neon-amber';
  return 'bg-neon-green';
}

function statusChipVariant(status: 'safe' | 'caution' | 'danger'): 'green' | 'amber' | 'red' {
  if (status === 'safe') return 'green';
  if (status === 'caution') return 'amber';
  return 'red';
}

function overallStatus(results: AccountHealthResult[]): 'safe' | 'caution' | 'danger' {
  if (results.some((r) => r.health.status === 'danger')) return 'danger';
  if (results.some((r) => r.health.status === 'caution')) return 'caution';
  return 'safe';
}

// ── Section Header ─────────────────────────────────────────────

function SectionHeader({
  icon,
  label,
  glowColor = '#00e5ff',
}: {
  icon: React.ReactNode;
  label: string;
  glowColor?: string;
}) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="flex items-center gap-2">
        <div
          className="h-2 w-2 rounded-full"
          style={{
            backgroundColor: glowColor,
            boxShadow: `0 0 8px ${glowColor}80, 0 0 20px ${glowColor}40`,
          }}
        />
        <span className="text-terminal-muted">{icon}</span>
        <h2 className="text-xs uppercase tracking-[0.18em] text-terminal-muted font-semibold">
          {label}
        </h2>
      </div>
      <div
        className="flex-1 h-px"
        style={{
          background: `linear-gradient(to right, ${glowColor}26, transparent)`,
        }}
      />
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────

export function RiskDashboardPage() {
  const { accounts, fetchAccounts } = useAccountsStore();
  const { healthResults, isLoading, fetchHealth } = useCommandCenterStore();

  // Local state for per-account symbol stats and daily PnL
  const [symbolDataByAccount, setSymbolDataByAccount] = useState<
    Record<string, SymbolStat[]>
  >({});
  const [dailyPnlByAccount, setDailyPnlByAccount] = useState<
    Record<string, DailyPnl[]>
  >({});
  const [dataLoading, setDataLoading] = useState(false);

  // ── Fetch accounts + health on mount ──────────────────────────
  useEffect(() => {
    fetchAccounts();
    fetchHealth();
  }, [fetchAccounts, fetchHealth]);

  // ── Fetch journal data for each monitored account ─────────────
  useEffect(() => {
    if (healthResults.length === 0) return;

    setDataLoading(true);
    const accountIds = healthResults.map((r) => r.account_id);

    const symbolPromises = accountIds.map(async (id) => {
      const res = await api.get<SymbolStat[]>(`/journal/stats/${id}/by-symbol`);
      return { id, data: res.data ?? [] };
    });

    const dailyPromises = accountIds.map(async (id) => {
      const res = await api.get<DailyPnl[]>(`/journal/stats/${id}/daily`);
      return { id, data: res.data ?? [] };
    });

    Promise.all([Promise.all(symbolPromises), Promise.all(dailyPromises)])
      .then(([symbolResults, dailyResults]) => {
        const symbolMap: Record<string, SymbolStat[]> = {};
        for (const r of symbolResults) {
          symbolMap[r.id] = r.data;
        }
        setSymbolDataByAccount(symbolMap);

        const dailyMap: Record<string, DailyPnl[]> = {};
        for (const r of dailyResults) {
          dailyMap[r.id] = r.data;
        }
        setDailyPnlByAccount(dailyMap);
      })
      .finally(() => setDataLoading(false));
  }, [healthResults]);

  // ── Derived: aggregate symbol stats ───────────────────────────
  const aggregatedSymbols = useMemo(() => {
    const map = new Map<string, { trades: number; profit: number }>();
    for (const stats of Object.values(symbolDataByAccount)) {
      for (const s of stats) {
        const existing = map.get(s.symbol);
        if (existing) {
          existing.trades += s.trades;
          existing.profit += s.profit;
        } else {
          map.set(s.symbol, { trades: s.trades, profit: s.profit });
        }
      }
    }
    return Array.from(map.entries())
      .map(([symbol, data]) => ({ symbol, ...data }))
      .sort((a, b) => b.trades - a.trades);
  }, [symbolDataByAccount]);

  // ── Derived: aggregate daily PnL ──────────────────────────────
  const aggregatedDailyPnl = useMemo(() => {
    const map = new Map<string, number>();
    for (const daily of Object.values(dailyPnlByAccount)) {
      for (const d of daily) {
        map.set(d.date, (map.get(d.date) ?? 0) + d.profit);
      }
    }
    return Array.from(map.entries())
      .map(([date, profit]) => ({ date, profit }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-7);
  }, [dailyPnlByAccount]);

  // ── Derived: banner stats ─────────────────────────────────────
  const status = healthResults.length > 0 ? overallStatus(healthResults) : 'safe';
  const avgDrawdownBudget =
    healthResults.length > 0
      ? healthResults.reduce((sum, r) => sum + (100 - r.health.drawdown.used_percent), 0) /
        healthResults.length
      : 0;
  const accountsAtRisk = healthResults.filter(
    (r) => r.health.status === 'caution' || r.health.status === 'danger',
  ).length;
  const worstAccount =
    healthResults.length > 0
      ? healthResults.reduce((worst, r) =>
          r.health.score < worst.health.score ? r : worst,
        )
      : null;

  // Sorted by risk (lowest health score first)
  const sortedResults = useMemo(
    () => [...healthResults].sort((a, b) => a.health.score - b.health.score),
    [healthResults],
  );

  // ── Derived: correlations ─────────────────────────────────────
  const activeSymbols = useMemo(
    () => new Set(aggregatedSymbols.map((s) => s.symbol)),
    [aggregatedSymbols],
  );

  const correlationWarnings = useMemo(() => {
    const warnings: { pair: [string, string]; accountCount: number; description: string }[] = [];
    const pairDescriptions: Record<string, string> = {
      'EURUSD,GBPUSD': 'amplified USD risk',
      'EURUSD,USDCHF': 'inverse EUR/CHF exposure',
      'AUDUSD,NZDUSD': 'commodity bloc concentration',
      'USDJPY,EURJPY': 'amplified JPY exposure',
      'XAUUSD,XAGUSD': 'metals concentration',
      'US500,NAS100': 'correlated index exposure',
    };

    for (const [a, b] of CORRELATED_PAIRS) {
      if (activeSymbols.has(a) && activeSymbols.has(b)) {
        // Count how many accounts have either symbol
        let count = 0;
        for (const stats of Object.values(symbolDataByAccount)) {
          const syms = new Set(stats.map((s) => s.symbol));
          if (syms.has(a) || syms.has(b)) count++;
        }
        const key = `${a},${b}`;
        warnings.push({
          pair: [a, b],
          accountCount: count,
          description: pairDescriptions[key] ?? 'correlated exposure',
        });
      }
    }
    return warnings;
  }, [activeSymbols, symbolDataByAccount]);

  // ── Derived: concentration warning ────────────────────────────
  const concentrationWarning = useMemo(() => {
    const totalAbsProfit = aggregatedSymbols.reduce((s, x) => s + Math.abs(x.profit), 0);
    if (totalAbsProfit === 0) return null;
    for (const s of aggregatedSymbols) {
      const pct = (Math.abs(s.profit) / totalAbsProfit) * 100;
      if (pct > 50) {
        return { symbol: s.symbol, percent: Math.round(pct) };
      }
    }
    return null;
  }, [aggregatedSymbols]);

  // ── Banner card style ─────────────────────────────────────────
  const bannerCard =
    status === 'danger'
      ? 'stat-card-red glow-red'
      : status === 'caution'
        ? 'stat-card-amber'
        : 'stat-card-cyan';

  // ── Loading state ─────────────────────────────────────────────
  if (isLoading && healthResults.length === 0) {
    return (
      <div className="space-y-8">
        <div className="animate-fade-in-up">
          <h1 className="text-3xl font-black tracking-tight text-white">Risk Dashboard</h1>
          <p className="text-slate-500 text-sm mt-1.5">Aggregate risk analysis across all prop firm accounts</p>
        </div>
        <div className="glass-premium stat-card-cyan rounded-2xl p-5 animate-fade-in-up">
          <div className="skeleton h-5 w-48 rounded mb-2" />
          <div className="skeleton h-4 w-32 rounded" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="glass-premium rounded-2xl p-5 animate-fade-in-up"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="skeleton h-4 w-32 rounded mb-3" />
              <div className="skeleton h-[60px] w-[60px] rounded-full mx-auto mb-3" />
              <div className="skeleton h-2 w-full rounded mb-2" />
              <div className="skeleton h-2 w-3/4 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Empty state ───────────────────────────────────────────────
  if (healthResults.length === 0) {
    return (
      <div className="space-y-8">
        <div className="animate-fade-in-up">
          <h1 className="text-3xl font-black tracking-tight text-white">Risk Dashboard</h1>
          <p className="text-slate-500 text-sm mt-1.5">Aggregate risk analysis across all prop firm accounts</p>
        </div>
        <div className="glass-premium card-hover-premium rounded-2xl flex flex-col items-center justify-center py-14 text-center animate-fade-in-up">
          <div className="relative mb-4">
            <Shield size={36} className="text-terminal-muted" />
            <div className="absolute -inset-4 rounded-full bg-neon-cyan/5 animate-pulse" />
          </div>
          <p className="text-slate-400 text-sm mb-4">
            Link accounts to firms in Command Center to see risk analysis
          </p>
          <Link
            to="/command-center"
            className="text-sm font-medium text-neon-cyan hover:underline underline-offset-4 glow-text-cyan inline-flex items-center gap-1.5"
          >
            <Shield size={14} />
            Go to Command Center
          </Link>
        </div>
      </div>
    );
  }

  // ── Top-10 symbols for exposure bars ──────────────────────────
  const top10Symbols = aggregatedSymbols.slice(0, 10);
  const maxAbsProfit = top10Symbols.length > 0
    ? Math.max(...top10Symbols.map((s) => Math.abs(s.profit)), 1)
    : 1;

  // ── Daily PnL bar chart max ───────────────────────────────────
  const maxDailyAbs = aggregatedDailyPnl.length > 0
    ? Math.max(...aggregatedDailyPnl.map((d) => Math.abs(d.profit)), 1)
    : 1;

  return (
    <div className="space-y-8">
      {/* ── Page Header ───────────────────────────────────────────── */}
      <div className="animate-fade-in-up">
        <h1 className="text-3xl font-black tracking-tight text-white">Risk Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1.5">
          Aggregate risk analysis across all prop firm accounts
        </p>
      </div>

      {/* ── Section 1: Aggregate Risk Banner ──────────────────────── */}
      <div
        className={`glass-premium ${bannerCard} rounded-2xl p-6 animate-fade-in-up`}
        style={{ animationDelay: '60ms' }}
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {/* Total Drawdown Budget */}
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-terminal-muted font-semibold mb-2">
              Drawdown Budget
            </p>
            <p
              className={`text-3xl font-black font-mono-nums ${
                avgDrawdownBudget > 50
                  ? 'text-neon-green glow-text-green'
                  : avgDrawdownBudget > 25
                    ? 'text-neon-amber'
                    : 'text-neon-red glow-text-red'
              }`}
            >
              {avgDrawdownBudget.toFixed(1)}%
            </p>
            <p className="text-[10px] text-terminal-muted mt-1">avg budget remaining</p>
          </div>

          {/* Accounts at Risk */}
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-terminal-muted font-semibold mb-2">
              Accounts at Risk
            </p>
            <p
              className={`text-3xl font-black font-mono-nums ${
                accountsAtRisk === 0
                  ? 'text-neon-green glow-text-green'
                  : 'text-neon-red glow-text-red'
              }`}
            >
              {accountsAtRisk}
            </p>
            <p className="text-[10px] text-terminal-muted mt-1">
              of {healthResults.length} monitored
            </p>
          </div>

          {/* Worst Account */}
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-terminal-muted font-semibold mb-2">
              Worst Account
            </p>
            {worstAccount ? (
              <>
                <p className="text-lg font-bold text-slate-100 truncate">
                  {worstAccount.alias}
                </p>
                <p
                  className={`font-mono-nums text-sm font-bold mt-0.5 ${
                    worstAccount.health.score >= 70
                      ? 'text-neon-green'
                      : worstAccount.health.score >= 40
                        ? 'text-neon-amber'
                        : 'text-neon-red'
                  }`}
                >
                  Score: {worstAccount.health.score}
                </p>
              </>
            ) : (
              <p className="text-lg font-mono-nums text-terminal-muted">&mdash;</p>
            )}
          </div>

          {/* Overall Risk */}
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-terminal-muted font-semibold mb-2">
              Overall Risk
            </p>
            <div className="flex items-center gap-2">
              {status === 'safe' && <CheckCircle size={20} className="text-neon-green" />}
              {status === 'caution' && <AlertTriangle size={20} className="text-neon-amber" />}
              {status === 'danger' && <AlertTriangle size={20} className="text-neon-red" />}
              <span
                className={`text-2xl font-black uppercase tracking-wider ${
                  status === 'safe'
                    ? 'text-neon-green glow-text-green'
                    : status === 'caution'
                      ? 'text-neon-amber'
                      : 'text-neon-red glow-text-red'
                }`}
              >
                {status}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Section 2: Account Risk Heatmap ───────────────────────── */}
      <section className="animate-fade-in-up" style={{ animationDelay: '120ms' }}>
        <SectionHeader
          icon={<AlertTriangle size={13} />}
          label="Account Risk Heatmap"
          glowColor="#ffb800"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedResults.map((result, i) => (
            <HeatmapCard key={result.account_id} result={result} delay={i * 80} />
          ))}
        </div>
      </section>

      {/* ── Section 3: Currency Exposure ───────────────────────────── */}
      <section className="animate-fade-in-up" style={{ animationDelay: '200ms' }}>
        <SectionHeader
          icon={<BarChart3 size={13} />}
          label="Currency Exposure Analysis"
          glowColor="#00e5ff"
        />

        {dataLoading ? (
          <div className="glass-premium rounded-2xl p-5">
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="flex items-center gap-3 mb-3 animate-fade-in-up"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="skeleton h-4 w-16 rounded" />
                <div className="skeleton h-5 flex-1 rounded" />
                <div className="skeleton h-4 w-20 rounded" />
              </div>
            ))}
          </div>
        ) : top10Symbols.length === 0 ? (
          <div className="glass-premium rounded-2xl p-8 text-center">
            <BarChart3 size={32} className="text-terminal-muted mx-auto mb-3 opacity-30" />
            <p className="text-sm text-terminal-muted">No symbol data available yet</p>
          </div>
        ) : (
          <div className="glass-premium rounded-2xl p-5 space-y-4">
            {/* Concentration Warning */}
            {concentrationWarning && (
              <div className="flex items-center gap-2 bg-neon-amber/10 border border-neon-amber/20 rounded-xl px-4 py-2.5 mb-2">
                <AlertTriangle size={14} className="text-neon-amber shrink-0" />
                <p className="text-xs text-neon-amber font-medium">
                  {concentrationWarning.percent}% of your exposure is concentrated in{' '}
                  <span className="font-bold">{concentrationWarning.symbol}</span>
                </p>
              </div>
            )}

            {/* Symbol bars */}
            <div className="space-y-2.5">
              {top10Symbols.map((s) => {
                const pct = (Math.abs(s.profit) / maxAbsProfit) * 100;
                const positive = s.profit >= 0;
                return (
                  <div key={s.symbol} className="flex items-center gap-3">
                    <span className="w-16 text-xs text-slate-300 font-medium shrink-0 truncate font-mono-nums">
                      {s.symbol}
                    </span>
                    <div className="flex-1 h-5 rounded bg-terminal-surface/60 overflow-hidden relative">
                      <div
                        className={`h-full rounded transition-all duration-500 ${
                          positive ? 'bg-neon-green/60' : 'bg-neon-red/60'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="font-mono-nums text-xs w-14 text-right shrink-0 text-terminal-muted">
                      {s.trades} trades
                    </span>
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
          </div>
        )}
      </section>

      {/* ── Section 4: Correlation Warnings ───────────────────────── */}
      <section className="animate-fade-in-up" style={{ animationDelay: '280ms' }}>
        <SectionHeader
          icon={<Zap size={13} />}
          label="Correlation Warnings"
          glowColor="#ffb800"
        />

        {correlationWarnings.length === 0 ? (
          <div className="glass-premium rounded-2xl p-6 flex items-center gap-3">
            <CheckCircle size={18} className="text-neon-green shrink-0" />
            <p className="text-sm text-neon-green font-medium">
              No correlation risks detected
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {correlationWarnings.map((w, i) => (
              <div
                key={`${w.pair[0]}-${w.pair[1]}`}
                className="glass-premium rounded-2xl p-5 border border-neon-amber/20 animate-fade-in-up"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="flex items-start gap-3">
                  <Zap size={16} className="text-neon-amber shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-slate-200 font-medium">
                      Correlated exposure:{' '}
                      <span className="font-bold text-neon-amber">{w.pair[0]}</span>
                      {' + '}
                      <span className="font-bold text-neon-amber">{w.pair[1]}</span>
                    </p>
                    <p className="text-xs text-terminal-muted mt-1">
                      {w.description} across {w.accountCount} account
                      {w.accountCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Section 5: Daily Risk Timeline ────────────────────────── */}
      <section className="animate-fade-in-up" style={{ animationDelay: '360ms' }}>
        <SectionHeader
          icon={<Activity size={13} />}
          label="7-Day Aggregate P&L"
          glowColor="#00e5ff"
        />

        {dataLoading ? (
          <div className="glass-premium rounded-2xl p-5">
            <div className="flex items-end gap-2 h-32">
              {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="skeleton flex-1 rounded" style={{ height: `${30 + i * 10}%` }} />
              ))}
            </div>
          </div>
        ) : aggregatedDailyPnl.length === 0 ? (
          <div className="glass-premium rounded-2xl p-8 text-center">
            <Activity size={32} className="text-terminal-muted mx-auto mb-3 opacity-30" />
            <p className="text-sm text-terminal-muted">No daily data available yet</p>
          </div>
        ) : (
          <div className="glass-premium rounded-2xl p-5">
            {/* Bar chart */}
            <div className="flex items-end gap-2 h-40">
              {aggregatedDailyPnl.map((d) => {
                const heightPct = (Math.abs(d.profit) / maxDailyAbs) * 100;
                const positive = d.profit >= 0;
                return (
                  <div
                    key={d.date}
                    className="flex-1 flex flex-col items-center gap-1 group"
                  >
                    {/* Value label on hover */}
                    <span
                      className={`font-mono-nums text-[10px] opacity-0 group-hover:opacity-100 transition-opacity ${
                        positive ? 'text-neon-green' : 'text-neon-red'
                      }`}
                    >
                      {formatCurrency(d.profit)}
                    </span>
                    {/* Bar */}
                    <div className="w-full flex-1 flex items-end">
                      <div
                        className={`w-full rounded-t transition-all duration-500 ${
                          positive ? 'bg-neon-green/70' : 'bg-neon-red/70'
                        }`}
                        style={{
                          height: `${Math.max(heightPct, 4)}%`,
                          boxShadow: positive
                            ? '0 0 8px #00ff9d30'
                            : '0 0 8px #ff3d5730',
                        }}
                      />
                    </div>
                    {/* Date label */}
                    <span className="text-[9px] font-mono-nums text-terminal-muted mt-1">
                      {new Date(d.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Summary row */}
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-terminal-border/30">
              <span className="text-[10px] uppercase tracking-[0.15em] text-terminal-muted font-semibold">
                7-Day Total
              </span>
              {(() => {
                const total = aggregatedDailyPnl.reduce((s, d) => s + d.profit, 0);
                const positive = total >= 0;
                return (
                  <span
                    className={`font-mono-nums text-sm font-bold inline-flex items-center gap-1 ${
                      positive ? 'text-neon-green' : 'text-neon-red'
                    }`}
                  >
                    {positive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                    {formatCurrency(total)}
                  </span>
                );
              })()}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

// ── Heatmap Card ───────────────────────────────────────────────

function HeatmapCard({
  result,
  delay,
}: {
  result: AccountHealthResult;
  delay: number;
}) {
  const { health, alias, firm_name } = result;

  return (
    <div
      className="glass-premium card-hover-premium rounded-2xl p-5 animate-fade-in-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Header: alias + firm */}
      <div className="flex items-center justify-between mb-3">
        <div className="min-w-0">
          <p className="font-semibold text-slate-100 truncate">{alias}</p>
        </div>
        <Badge variant="cyan">{firm_name}</Badge>
      </div>

      {/* Health gauge + status */}
      <div className="flex items-center gap-4 mb-4">
        <HealthGauge score={health.score} status={health.status} size={60} />
        <div className="flex-1 min-w-0">
          <Badge variant={statusChipVariant(health.status)}>
            {health.status === 'safe' && <CheckCircle size={10} />}
            {health.status !== 'safe' && <AlertTriangle size={10} />}
            <span className="uppercase font-bold text-[10px] tracking-wider">
              {health.status}
            </span>
          </Badge>
          <p className="text-[10px] text-terminal-muted mt-1.5 font-mono-nums">
            Score: {health.score}/100
          </p>
        </div>
      </div>

      {/* Drawdown bar */}
      <div className="space-y-3">
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] uppercase tracking-[0.15em] text-terminal-muted">
              Drawdown
            </span>
            <span className="font-mono-nums text-[10px] text-slate-400">
              {health.drawdown.used_percent.toFixed(1)}%
            </span>
          </div>
          <div className="h-2 rounded-full bg-terminal-border overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${metricBarColor(health.drawdown.used_percent)}`}
              style={{ width: `${Math.min(health.drawdown.used_percent, 100)}%` }}
            />
          </div>
        </div>

        {/* Daily loss bar */}
        {health.daily_loss != null && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] uppercase tracking-[0.15em] text-terminal-muted">
                Daily Loss
              </span>
              <span className="font-mono-nums text-[10px] text-slate-400">
                {health.daily_loss.used_percent.toFixed(1)}%
              </span>
            </div>
            <div className="h-2 rounded-full bg-terminal-border overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${metricBarColor(health.daily_loss.used_percent)}`}
                style={{ width: `${Math.min(health.daily_loss.used_percent, 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
