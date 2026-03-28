import { useState, useEffect, useCallback, useRef } from 'react';
import {
  BarChart3,
  TrendingUp,
  Shield,
  Brain,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Info,
  Zap,
} from 'lucide-react';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/Badge';

/* ================================================================== */
/*  Types                                                              */
/* ================================================================== */

interface AttributionData {
  by_session: { session: string; pnl: number; trades: number; win_rate: number }[];
  by_day: { day: string; pnl: number; trades: number }[];
  by_symbol: { symbol: string; pnl: number; trades: number; win_rate: number }[];
  by_direction: { direction: string; pnl: number; trades: number; win_rate: number }[];
  hour_heatmap: { day_num: number; hour: number; pnl: number; trades: number }[];
  total_trades: number;
  total_pnl: number;
}

interface EquityHealthData {
  r_squared: number;
  recovery_factor: number;
  sharpe_ratio: number;
  max_drawdown_pct: number;
  max_underwater_days: number;
  profit_factor: number;
  total_return_pct: number;
  avg_win: number;
  avg_loss: number;
  expectancy: number;
  win_rate: number;
  total_trades: number;
  prop_compliance: {
    daily_loss_ok: boolean;
    total_dd_ok: boolean;
    daily_loss_pct: number;
    total_dd_pct: number;
    score: number;
  };
  equity_curve: { date: string; balance: number }[];
}

interface EdgeValidationData {
  sample_size: number;
  sample_adequate: boolean;
  min_recommended: number;
  mean_return: number;
  std_return: number;
  t_statistic: number;
  p_value: number;
  profit_factor: number;
  profit_factor_ci_lower: number;
  profit_factor_ci_upper: number;
  monte_carlo_median_dd: number;
  monte_carlo_worst_dd_95: number;
  verdict: string;
  explanation: string;
}

interface AIInsight {
  severity: 'critical' | 'warning' | 'positive' | 'info';
  title: string;
  detail: string;
  recommendation: string;
}

interface AIInsightsData {
  insights: AIInsight[];
  generated_at: string;
  cached: boolean;
  model: string;
}

type TabId = 'attribution' | 'equity' | 'edge' | 'ai';

/* ================================================================== */
/*  Formatting helpers                                                 */
/* ================================================================== */

function fmtCurrency(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}$${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtPct(n: number, decimals = 1): string {
  return `${n >= 0 ? '+' : ''}${n.toFixed(decimals)}%`;
}

function fmtNum(n: number, decimals = 2): string {
  return n.toFixed(decimals);
}

/* ================================================================== */
/*  SVG Chart Components (inline)                                      */
/* ================================================================== */

/* --- Horizontal Bar Chart ----------------------------------------- */

function HorizontalBarChart({
  data,
  height: barH = 28,
}: {
  data: { label: string; value: number }[];
  height?: number;
}) {
  const maxAbs = Math.max(...data.map((d) => Math.abs(d.value)), 0.01);
  const svgH = data.length * (barH + 6) + 8;
  const midX = 200;
  const barMaxW = 160;

  return (
    <svg viewBox={`0 0 400 ${svgH}`} className="w-full" style={{ maxHeight: `${svgH}px` }}>
      {data.map((d, i) => {
        const y = i * (barH + 6) + 4;
        const w = (Math.abs(d.value) / maxAbs) * barMaxW;
        const isPos = d.value >= 0;
        const barX = isPos ? midX : midX - w;

        return (
          <g key={d.label}>
            {/* Label */}
            <text
              x={midX - barMaxW - 8}
              y={y + barH / 2 + 4}
              className="fill-[var(--color-terminal-text)] text-[11px]"
              textAnchor="start"
              style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '11px' }}
            >
              {d.label}
            </text>
            {/* Center axis */}
            <line x1={midX} y1={y} x2={midX} y2={y + barH} stroke="var(--color-terminal-border)" strokeWidth="1" strokeOpacity="0.3" />
            {/* Bar */}
            <rect
              x={barX}
              y={y + 4}
              width={w}
              height={barH - 8}
              rx={3}
              fill={isPos ? 'var(--color-neon-green)' : 'var(--color-neon-red)'}
              fillOpacity={0.85}
            />
            {/* Value */}
            <text
              x={isPos ? midX + w + 6 : midX - w - 6}
              y={y + barH / 2 + 4}
              className="fill-[var(--color-terminal-text)]"
              textAnchor={isPos ? 'start' : 'end'}
              style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '10px' }}
            >
              {fmtCurrency(d.value)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* --- Heatmap Grid ------------------------------------------------- */

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function HeatmapGrid({ data }: { data: { day_num: number; hour: number; pnl: number; trades: number }[] }) {
  const cellSize = 18;
  const gap = 2;
  const labelW = 32;
  const labelH = 16;
  const svgW = labelW + 24 * (cellSize + gap);
  const svgH = labelH + 7 * (cellSize + gap);

  const lookup = new Map<string, { pnl: number; trades: number }>();
  let maxAbs = 0.01;
  for (const d of data) {
    lookup.set(`${d.day_num}-${d.hour}`, { pnl: d.pnl, trades: d.trades });
    if (Math.abs(d.pnl) > maxAbs) maxAbs = Math.abs(d.pnl);
  }

  const [tooltip, setTooltip] = useState<{ x: number; y: number; pnl: number; trades: number } | null>(null);

  return (
    <div className="relative overflow-x-auto">
      <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full" style={{ minWidth: '500px' }}>
        {/* Hour labels */}
        {Array.from({ length: 24 }, (_, h) => (
          <text
            key={`h-${h}`}
            x={labelW + h * (cellSize + gap) + cellSize / 2}
            y={12}
            textAnchor="middle"
            className="fill-[var(--color-terminal-muted)]"
            style={{ fontSize: '8px', fontFamily: 'var(--font-mono, monospace)' }}
          >
            {h}
          </text>
        ))}
        {/* Day labels + cells */}
        {Array.from({ length: 7 }, (_, d) => (
          <g key={`d-${d}`}>
            <text
              x={0}
              y={labelH + d * (cellSize + gap) + cellSize / 2 + 3}
              className="fill-[var(--color-terminal-muted)]"
              style={{ fontSize: '9px', fontFamily: 'var(--font-mono, monospace)' }}
            >
              {DAY_LABELS[d]}
            </text>
            {Array.from({ length: 24 }, (_, h) => {
              const cell = lookup.get(`${d}-${h}`);
              const intensity = cell ? Math.min(Math.abs(cell.pnl) / maxAbs, 1) : 0;
              let fill = 'var(--color-terminal-border)';
              let opacity = 0.15;
              if (cell && cell.trades > 0) {
                fill = cell.pnl >= 0 ? 'var(--color-neon-green)' : 'var(--color-neon-red)';
                opacity = 0.2 + intensity * 0.7;
              }
              return (
                <rect
                  key={`${d}-${h}`}
                  x={labelW + h * (cellSize + gap)}
                  y={labelH + d * (cellSize + gap)}
                  width={cellSize}
                  height={cellSize}
                  rx={3}
                  fill={fill}
                  fillOpacity={opacity}
                  className="cursor-pointer transition-opacity hover:opacity-100"
                  onMouseEnter={(e) => {
                    if (cell && cell.trades > 0) {
                      const rect = (e.target as SVGRectElement).getBoundingClientRect();
                      setTooltip({ x: rect.left + rect.width / 2, y: rect.top, pnl: cell.pnl, trades: cell.trades });
                    }
                  }}
                  onMouseLeave={() => setTooltip(null)}
                />
              );
            })}
          </g>
        ))}
      </svg>
      {/* Tooltip portal */}
      {tooltip && (
        <div
          className="fixed z-50 pointer-events-none glass-premium rounded-lg px-3 py-2 text-xs shadow-2xl"
          style={{ left: tooltip.x, top: tooltip.y - 48, transform: 'translateX(-50%)' }}
        >
          <div className="font-mono-nums text-white">{fmtCurrency(tooltip.pnl)}</div>
          <div className="text-terminal-muted">{tooltip.trades} trades</div>
        </div>
      )}
    </div>
  );
}

/* --- Equity Curve Chart ------------------------------------------- */

function EquityCurveChart({ data }: { data: { date: string; balance: number }[] }) {
  if (data.length < 2) return null;

  const paddingL = 60;
  const paddingR = 20;
  const paddingT = 20;
  const paddingB = 40;
  const svgW = 800;
  const svgH = 300;
  const chartW = svgW - paddingL - paddingR;
  const chartH = svgH - paddingT - paddingB;

  const balances = data.map((d) => d.balance);
  const minB = Math.min(...balances);
  const maxB = Math.max(...balances);
  const range = maxB - minB || 1;

  const toX = (i: number) => paddingL + (i / (data.length - 1)) * chartW;
  const toY = (b: number) => paddingT + chartH - ((b - minB) / range) * chartH;

  const points = data.map((d, i) => `${toX(i)},${toY(d.balance)}`).join(' ');
  const areaPoints = `${toX(0)},${paddingT + chartH} ${points} ${toX(data.length - 1)},${paddingT + chartH}`;

  // Y-axis ticks (5 ticks)
  const yTicks = Array.from({ length: 5 }, (_, i) => {
    const val = minB + (range / 4) * i;
    return { val, y: toY(val) };
  });

  // X-axis ticks (5 dates)
  const xStep = Math.max(1, Math.floor(data.length / 4));
  const xTicks: { label: string; x: number }[] = [];
  for (let i = 0; i < data.length; i += xStep) {
    xTicks.push({
      label: new Date(data[i].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      x: toX(i),
    });
  }
  // Always include last
  if (xTicks.length > 0 && xTicks[xTicks.length - 1].x < toX(data.length - 1) - 30) {
    xTicks.push({
      label: new Date(data[data.length - 1].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      x: toX(data.length - 1),
    });
  }

  return (
    <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-neon-cyan)" stopOpacity="0.3" />
          <stop offset="100%" stopColor="var(--color-neon-cyan)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Grid lines */}
      {yTicks.map((t, i) => (
        <line key={i} x1={paddingL} y1={t.y} x2={svgW - paddingR} y2={t.y} stroke="var(--color-terminal-border)" strokeOpacity="0.2" strokeDasharray="4,4" />
      ))}
      {/* Y labels */}
      {yTicks.map((t, i) => (
        <text key={i} x={paddingL - 8} y={t.y + 4} textAnchor="end" className="fill-[var(--color-terminal-muted)]" style={{ fontSize: '10px', fontFamily: 'var(--font-mono, monospace)' }}>
          ${t.val.toLocaleString('en-US', { maximumFractionDigits: 0 })}
        </text>
      ))}
      {/* X labels */}
      {xTicks.map((t, i) => (
        <text key={i} x={t.x} y={svgH - 8} textAnchor="middle" className="fill-[var(--color-terminal-muted)]" style={{ fontSize: '10px', fontFamily: 'var(--font-mono, monospace)' }}>
          {t.label}
        </text>
      ))}
      {/* Area fill */}
      <polygon points={areaPoints} fill="url(#eqGrad)" />
      {/* Line */}
      <polyline points={points} fill="none" stroke="var(--color-neon-cyan)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

/* --- Confidence Interval Bar -------------------------------------- */

function CIBar({ lower, upper, reference }: { lower: number; upper: number; reference: number }) {
  const min = Math.min(lower, reference) - 0.3;
  const max = Math.max(upper, reference) + 0.3;
  const range = max - min || 1;
  const toX = (v: number) => ((v - min) / range) * 100;

  return (
    <div className="relative h-10 w-full">
      <svg viewBox="0 0 100 10" preserveAspectRatio="none" className="w-full h-full">
        {/* Background track */}
        <rect x="0" y="3" width="100" height="4" rx="2" fill="var(--color-terminal-border)" fillOpacity="0.3" />
        {/* CI range */}
        <rect x={toX(lower)} y="2" width={toX(upper) - toX(lower)} height="6" rx="2" fill="var(--color-neon-cyan)" fillOpacity="0.4" />
        {/* Reference line */}
        <line x1={toX(reference)} y1="0" x2={toX(reference)} y2="10" stroke="var(--color-neon-amber)" strokeWidth="0.5" strokeDasharray="1,1" />
        {/* Lower */}
        <circle cx={toX(lower)} cy="5" r="1.5" fill="var(--color-neon-cyan)" />
        {/* Upper */}
        <circle cx={toX(upper)} cy="5" r="1.5" fill="var(--color-neon-cyan)" />
      </svg>
      <div className="flex justify-between text-[10px] font-mono-nums text-terminal-muted mt-1">
        <span>{fmtNum(lower)}</span>
        <span className="text-neon-amber">ref: {fmtNum(reference)}</span>
        <span>{fmtNum(upper)}</span>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Skeleton / Loading                                                 */
/* ================================================================== */

function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`glass-premium rounded-2xl p-5 animate-pulse ${className}`}>
      <div className="skeleton h-3 w-20 mb-3 rounded" />
      <div className="skeleton h-7 w-28 rounded" />
    </div>
  );
}

function SkeletonBlock({ h = 'h-48' }: { h?: string }) {
  return (
    <div className={`glass-premium rounded-2xl p-6 animate-pulse ${h}`}>
      <div className="skeleton h-3 w-32 mb-4 rounded" />
      <div className="skeleton h-full w-full rounded" />
    </div>
  );
}

/* ================================================================== */
/*  Stat Card                                                          */
/* ================================================================== */

function StatCard({
  label,
  value,
  sub,
  valueClass = 'text-white glow-text-cyan',
}: {
  label: string;
  value: string;
  sub?: string;
  valueClass?: string;
}) {
  return (
    <div className="glass-premium rounded-2xl p-4">
      <p className="text-[10px] uppercase tracking-[0.15em] text-terminal-muted font-medium flex items-center gap-1.5 mb-2">
        <span className="h-1 w-1 rounded-full bg-neon-cyan" />
        {label}
      </p>
      <p className={`text-lg sm:text-2xl font-mono-nums font-bold ${valueClass}`}>{value}</p>
      {sub && <p className="text-xs text-terminal-muted font-mono-nums mt-1">{sub}</p>}
    </div>
  );
}

/* ================================================================== */
/*  Tabs                                                               */
/* ================================================================== */

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'attribution', label: 'Attribution', icon: <BarChart3 size={16} /> },
  { id: 'equity', label: 'Equity Health', icon: <TrendingUp size={16} /> },
  { id: 'edge', label: 'Edge Validator', icon: <Shield size={16} /> },
  { id: 'ai', label: 'AI Insights', icon: <Brain size={16} /> },
];

/* ================================================================== */
/*  Tab Content Components                                             */
/* ================================================================== */

/* --- Attribution Tab ---------------------------------------------- */

function AttributionTab() {
  const [data, setData] = useState<AttributionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.get<AttributionData>('/analytics/attribution').then((res) => {
      if (cancelled) return;
      if (res.error) { setError(res.error.message); setLoading(false); return; }
      setData(res.data);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  if (loading) return <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">{Array.from({ length: 4 }, (_, i) => <SkeletonBlock key={i} />)}</div>;
  if (error) return <ErrorState message={error} />;
  if (!data) return <EmptyAnalytics />;

  const sessionBars = [...data.by_session].sort((a, b) => b.pnl - a.pnl).map((s) => ({ label: s.session, value: s.pnl }));
  const dayBars = data.by_day.map((d) => ({ label: d.day, value: d.pnl }));
  const symbolBars = [...data.by_symbol].sort((a, b) => b.pnl - a.pnl).slice(0, 10).map((s) => ({ label: s.symbol, value: s.pnl }));

  const buyDir = data.by_direction.find((d) => d.direction.toLowerCase() === 'buy');
  const sellDir = data.by_direction.find((d) => d.direction.toLowerCase() === 'sell');

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-4">
        <StatCard label="Total Trades" value={data.total_trades.toLocaleString()} />
        <StatCard label="Total P&L" value={fmtCurrency(data.total_pnl)} valueClass={data.total_pnl >= 0 ? 'text-neon-green glow-text-green' : 'text-neon-red'} />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Session P&L */}
        <div className="glass-premium rounded-2xl p-6">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-neon-cyan" />
            Session P&L
          </h3>
          <HorizontalBarChart data={sessionBars} />
        </div>

        {/* Day-of-Week P&L */}
        <div className="glass-premium rounded-2xl p-6">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-neon-cyan" />
            Day-of-Week P&L
          </h3>
          <HorizontalBarChart data={dayBars} />
        </div>
      </div>

      {/* Symbol breakdown */}
      <div className="glass-premium rounded-2xl p-6">
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-neon-cyan" />
          Symbol Breakdown
        </h3>
        <HorizontalBarChart data={symbolBars} />
      </div>

      {/* Direction split */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="glass-premium rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-neon-green mb-3 flex items-center gap-2">
            <TrendingUp size={14} /> Buy
          </h3>
          <p className="text-lg sm:text-2xl font-mono-nums font-bold text-neon-green">{fmtCurrency(buyDir?.pnl ?? 0)}</p>
          <div className="flex gap-4 mt-2 text-xs text-terminal-muted font-mono-nums">
            <span>WR: {fmtNum(buyDir?.win_rate ?? 0, 1)}%</span>
            <span>Trades: {buyDir?.trades ?? 0}</span>
          </div>
        </div>
        <div className="glass-premium rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-neon-red mb-3 flex items-center gap-2">
            <TrendingUp size={14} className="rotate-180" /> Sell
          </h3>
          <p className="text-lg sm:text-2xl font-mono-nums font-bold text-neon-red">{fmtCurrency(sellDir?.pnl ?? 0)}</p>
          <div className="flex gap-4 mt-2 text-xs text-terminal-muted font-mono-nums">
            <span>WR: {fmtNum(sellDir?.win_rate ?? 0, 1)}%</span>
            <span>Trades: {sellDir?.trades ?? 0}</span>
          </div>
        </div>
      </div>

      {/* Hour Heatmap */}
      <div className="glass-premium rounded-2xl p-6">
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-neon-cyan" />
          Hour Heatmap
        </h3>
        <HeatmapGrid data={data.hour_heatmap} />
      </div>
    </div>
  );
}

/* --- Equity Health Tab -------------------------------------------- */

function EquityHealthTab() {
  const [data, setData] = useState<EquityHealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.get<EquityHealthData>('/analytics/equity-health').then((res) => {
      if (cancelled) return;
      if (res.error) { setError(res.error.message); setLoading(false); return; }
      setData(res.data);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  if (loading) return <div className="space-y-6"><SkeletonBlock h="h-64" /><div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{Array.from({ length: 8 }, (_, i) => <SkeletonCard key={i} />)}</div></div>;
  if (error) return <ErrorState message={error} />;
  if (!data) return <EmptyAnalytics />;

  const r2Label = data.r_squared > 0.8 ? 'Smooth' : data.r_squared > 0.5 ? 'Moderate' : 'Choppy';
  const r2Color = data.r_squared > 0.8 ? 'text-neon-green' : data.r_squared > 0.5 ? 'text-neon-amber' : 'text-neon-red';

  const compliance = data.prop_compliance;

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Equity Curve */}
      <div className="glass-premium rounded-2xl p-6">
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-neon-cyan" />
          Equity Curve
        </h3>
        <EquityCurveChart data={data.equity_curve} />
      </div>

      {/* Health Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="R-Squared"
          value={fmtNum(data.r_squared)}
          sub={r2Label}
          valueClass={r2Color}
        />
        <StatCard
          label="Recovery Factor"
          value={fmtNum(data.recovery_factor)}
          valueClass={data.recovery_factor >= 2 ? 'text-neon-green' : 'text-neon-amber'}
        />
        <StatCard
          label="Sharpe Ratio"
          value={fmtNum(data.sharpe_ratio)}
          valueClass={data.sharpe_ratio >= 1.5 ? 'text-neon-green glow-text-green' : data.sharpe_ratio >= 0.5 ? 'text-neon-amber' : 'text-neon-red'}
        />
        <StatCard
          label="Max Drawdown"
          value={fmtPct(-Math.abs(data.max_drawdown_pct))}
          valueClass="text-neon-red"
        />
        <StatCard
          label="Underwater Days"
          value={`${data.max_underwater_days}d`}
          valueClass={data.max_underwater_days > 30 ? 'text-neon-red' : 'text-neon-amber'}
        />
        <StatCard
          label="Profit Factor"
          value={fmtNum(data.profit_factor)}
          valueClass={data.profit_factor >= 1.5 ? 'text-neon-green glow-text-green' : data.profit_factor >= 1.0 ? 'text-neon-amber' : 'text-neon-red'}
        />
        <StatCard
          label="Expectancy"
          value={fmtCurrency(data.expectancy)}
          valueClass={data.expectancy >= 0 ? 'text-neon-green' : 'text-neon-red'}
        />
        <StatCard
          label="Total Return"
          value={fmtPct(data.total_return_pct)}
          valueClass={data.total_return_pct >= 0 ? 'text-neon-green glow-text-green' : 'text-neon-red'}
        />
      </div>

      {/* Prop Firm Compliance */}
      <div className="glass-premium rounded-2xl p-6">
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <Shield size={14} className="text-neon-cyan" />
          Prop Firm Compliance
          <Badge variant="cyan">FTMO</Badge>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {/* Daily Loss */}
          <div className="flex items-center gap-3">
            {compliance.daily_loss_ok
              ? <CheckCircle size={20} className="text-neon-green shrink-0" />
              : <AlertTriangle size={20} className="text-neon-red shrink-0" />}
            <div>
              <p className="text-xs text-terminal-muted uppercase tracking-wider">Daily Loss</p>
              <p className={`font-mono-nums text-sm font-bold ${compliance.daily_loss_ok ? 'text-neon-green' : 'text-neon-red'}`}>
                {fmtPct(compliance.daily_loss_pct)} / -5%
              </p>
            </div>
          </div>

          {/* Total DD */}
          <div className="flex items-center gap-3">
            {compliance.total_dd_ok
              ? <CheckCircle size={20} className="text-neon-green shrink-0" />
              : <AlertTriangle size={20} className="text-neon-red shrink-0" />}
            <div>
              <p className="text-xs text-terminal-muted uppercase tracking-wider">Total DD</p>
              <p className={`font-mono-nums text-sm font-bold ${compliance.total_dd_ok ? 'text-neon-green' : 'text-neon-red'}`}>
                {fmtPct(compliance.total_dd_pct)} / -10%
              </p>
            </div>
          </div>

          {/* Score Gauge */}
          <div className="flex items-center gap-3">
            <div className="relative w-12 h-12 shrink-0">
              <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                <circle cx="18" cy="18" r="15" fill="none" stroke="var(--color-terminal-border)" strokeWidth="3" strokeOpacity="0.3" />
                <circle
                  cx="18" cy="18" r="15" fill="none"
                  stroke={compliance.score >= 80 ? 'var(--color-neon-green)' : compliance.score >= 50 ? 'var(--color-neon-amber)' : 'var(--color-neon-red)'}
                  strokeWidth="3" strokeLinecap="round"
                  strokeDasharray={`${(compliance.score / 100) * 94.25} 94.25`}
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-mono-nums font-bold text-white">
                {compliance.score}
              </span>
            </div>
            <div>
              <p className="text-xs text-terminal-muted uppercase tracking-wider">Score</p>
              <p className={`font-mono-nums text-sm font-bold ${compliance.score >= 80 ? 'text-neon-green' : compliance.score >= 50 ? 'text-neon-amber' : 'text-neon-red'}`}>
                {compliance.score >= 80 ? 'Excellent' : compliance.score >= 50 ? 'Fair' : 'At Risk'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* --- Edge Validator Tab ------------------------------------------- */

function EdgeValidatorTab() {
  const [data, setData] = useState<EdgeValidationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.get<EdgeValidationData>('/analytics/edge-validation').then((res) => {
      if (cancelled) return;
      if (res.error) { setError(res.error.message); setLoading(false); return; }
      setData(res.data);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  if (loading) return <div className="space-y-6"><SkeletonBlock h="h-24" /><div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{Array.from({ length: 4 }, (_, i) => <SkeletonCard key={i} />)}</div><SkeletonBlock h="h-32" /></div>;
  if (error) return <ErrorState message={error} />;
  if (!data) return <EmptyAnalytics />;

  const verdictColors: Record<string, { bg: string; text: string; variant: 'green' | 'cyan' | 'amber' | 'red' }> = {
    VALIDATED: { bg: 'bg-neon-green/10', text: 'text-neon-green', variant: 'green' },
    LIKELY_VALID: { bg: 'bg-neon-cyan/10', text: 'text-neon-cyan', variant: 'cyan' },
    INCONCLUSIVE: { bg: 'bg-neon-amber/10', text: 'text-neon-amber', variant: 'amber' },
    LIKELY_NOISE: { bg: 'bg-neon-red/10', text: 'text-neon-red', variant: 'red' },
    OVERFITTED: { bg: 'bg-neon-red/10', text: 'text-neon-red', variant: 'red' },
  };

  const vc = verdictColors[data.verdict] ?? verdictColors.INCONCLUSIVE;
  const samplePct = Math.min((data.sample_size / data.min_recommended) * 100, 100);

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Verdict Badge */}
      <div className="flex justify-center">
        <div className={`${vc.bg} border border-current/20 rounded-2xl px-8 py-4 text-center`}>
          <Badge variant={vc.variant} className="text-base px-4 py-1.5 mb-2">
            {data.verdict.replace(/_/g, ' ')}
          </Badge>
        </div>
      </div>

      {/* Sample Size Progress */}
      <div className="glass-premium rounded-2xl p-5">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-terminal-muted uppercase tracking-wider">Sample Size</p>
          <p className="font-mono-nums text-sm text-white">
            {data.sample_size} / {data.min_recommended}
          </p>
        </div>
        <div className="w-full h-3 bg-terminal-border/30 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${samplePct}%`,
              background: data.sample_adequate
                ? 'var(--color-neon-green)'
                : `linear-gradient(90deg, var(--color-neon-amber), var(--color-neon-cyan))`,
            }}
          />
        </div>
        {!data.sample_adequate && (
          <p className="text-xs text-neon-amber mt-2 flex items-center gap-1">
            <AlertTriangle size={12} /> Need {data.min_recommended - data.sample_size} more trades for statistical significance
          </p>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Mean Return" value={fmtCurrency(data.mean_return)} valueClass={data.mean_return >= 0 ? 'text-neon-green' : 'text-neon-red'} />
        <StatCard label="t-Statistic" value={fmtNum(data.t_statistic)} valueClass={Math.abs(data.t_statistic) >= 2 ? 'text-neon-green' : 'text-neon-amber'} />
        <StatCard label="p-Value" value={fmtNum(data.p_value, 4)} valueClass={data.p_value < 0.05 ? 'text-neon-green' : 'text-neon-amber'} sub={data.p_value < 0.05 ? 'Significant' : 'Not significant'} />
        <StatCard label="Profit Factor" value={fmtNum(data.profit_factor)} valueClass={data.profit_factor >= 1.5 ? 'text-neon-green glow-text-green' : data.profit_factor >= 1.0 ? 'text-neon-amber' : 'text-neon-red'} />
      </div>

      {/* Confidence Interval */}
      <div className="glass-premium rounded-2xl p-6">
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-neon-cyan" />
          Profit Factor Confidence Interval
        </h3>
        <CIBar lower={data.profit_factor_ci_lower} upper={data.profit_factor_ci_upper} reference={1.0} />
      </div>

      {/* Monte Carlo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard label="Monte Carlo Median DD" value={fmtPct(-Math.abs(data.monte_carlo_median_dd))} valueClass="text-neon-amber" />
        <StatCard label="Monte Carlo Worst DD (95th)" value={fmtPct(-Math.abs(data.monte_carlo_worst_dd_95))} valueClass="text-neon-red" />
      </div>

      {/* Explanation */}
      <div className="glass-premium rounded-2xl p-6">
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <Info size={14} className="text-neon-cyan" />
          Analysis
        </h3>
        <p className="text-sm text-terminal-text leading-relaxed">{data.explanation}</p>
      </div>
    </div>
  );
}

/* --- AI Insights Tab ---------------------------------------------- */

function AIInsightsTab() {
  const [data, setData] = useState<AIInsightsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchRef = useRef(0);

  const fetchInsights = useCallback(() => {
    const id = ++fetchRef.current;
    setLoading(true);
    setError(null);
    api.get<AIInsightsData>('/analytics/ai-insights').then((res) => {
      if (id !== fetchRef.current) return;
      if (res.error) { setError(res.error.message); setLoading(false); return; }
      setData(res.data);
      setLoading(false);
    });
  }, []);

  useEffect(() => { fetchInsights(); }, [fetchInsights]);

  const severityConfig: Record<string, { border: string; variant: 'red' | 'amber' | 'green' | 'cyan'; icon: React.ReactNode }> = {
    critical: { border: 'border-l-neon-red', variant: 'red', icon: <AlertTriangle size={14} className="text-neon-red" /> },
    warning: { border: 'border-l-neon-amber', variant: 'amber', icon: <AlertTriangle size={14} className="text-neon-amber" /> },
    positive: { border: 'border-l-neon-green', variant: 'green', icon: <CheckCircle size={14} className="text-neon-green" /> },
    info: { border: 'border-l-neon-cyan', variant: 'cyan', icon: <Info size={14} className="text-neon-cyan" /> },
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header with refresh + meta */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          {data?.generated_at && (
            <span className="text-xs text-terminal-muted font-mono-nums">
              Updated: {new Date(data.generated_at).toLocaleString()}
            </span>
          )}
          {data?.model && <Badge variant="purple">{data.model}</Badge>}
          {data?.cached && <Badge variant="muted">cached</Badge>}
        </div>
        <button
          onClick={fetchInsights}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl glass-premium text-sm text-neon-cyan hover:text-white transition-colors disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh Insights
        </button>
      </div>

      {/* Loading skeletons */}
      {loading && (
        <div className="space-y-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="glass-premium rounded-2xl p-5 animate-pulse border-l-4 border-terminal-border">
              <div className="skeleton h-4 w-32 mb-3 rounded" />
              <div className="skeleton h-3 w-full mb-2 rounded" />
              <div className="skeleton h-3 w-3/4 rounded" />
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {!loading && error && <ErrorState message={error} />}

      {/* Insights */}
      {!loading && data && (
        <div className="space-y-4">
          {data.insights.length === 0 && (
            <div className="glass-premium rounded-2xl p-8 text-center">
              <Zap size={32} className="text-terminal-muted mx-auto mb-3" />
              <p className="text-terminal-muted">No insights available yet. Trade more to generate AI analysis.</p>
            </div>
          )}
          {data.insights.map((insight, i) => {
            const cfg = severityConfig[insight.severity] ?? severityConfig.info;
            return (
              <div
                key={i}
                className={`glass-premium rounded-2xl p-5 border-l-4 ${cfg.border}`}
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="flex items-center gap-2 mb-2">
                  {cfg.icon}
                  <Badge variant={cfg.variant} className="text-[10px]">{insight.severity.toUpperCase()}</Badge>
                  <h4 className="text-sm font-semibold text-white">{insight.title}</h4>
                </div>
                <p className="text-sm text-terminal-text leading-relaxed mb-3">{insight.detail}</p>
                <div className="bg-terminal-bg/50 rounded-xl px-4 py-3 border border-terminal-border/30">
                  <p className="text-xs text-terminal-muted uppercase tracking-wider mb-1">Recommendation</p>
                  <p className="text-sm text-neon-cyan">{insight.recommendation}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ================================================================== */
/*  Shared UI                                                          */
/* ================================================================== */

function ErrorState({ message }: { message: string }) {
  return (
    <div className="glass-premium rounded-2xl p-8 text-center">
      <AlertTriangle size={32} className="text-neon-red mx-auto mb-3" />
      <p className="text-neon-red font-medium mb-1">Failed to load data</p>
      <p className="text-sm text-terminal-muted">{message}</p>
    </div>
  );
}

function EmptyAnalytics() {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
      <div className="glass-premium rounded-2xl p-6">
        <BarChart3 size={48} className="text-terminal-muted" />
      </div>
      <h2 className="text-xl font-semibold text-white">No analytics data yet</h2>
      <p className="text-sm text-terminal-muted max-w-md">
        Start trading with your connected MT5 account to see analytics here.
      </p>
    </div>
  );
}

/* ================================================================== */
/*  Main Component                                                     */
/* ================================================================== */

export function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('attribution');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="animate-fade-in-up">
        <h1 className="text-3xl font-black tracking-tight text-white font-display">Advanced Analytics</h1>
        <p className="text-sm text-terminal-muted mt-1">Deep statistical analysis of your trading performance</p>
      </div>

      {/* Tab Bar */}
      <div className="glass-premium rounded-xl p-1.5 flex gap-1 overflow-x-auto animate-fade-in-up" style={{ animationDelay: '60ms' }}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'text-neon-cyan border-b-2 border-neon-cyan bg-neon-cyan/5'
                : 'text-terminal-muted hover:text-white hover:bg-white/5'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{ animationDelay: '120ms' }}>
        {activeTab === 'attribution' && <AttributionTab />}
        {activeTab === 'equity' && <EquityHealthTab />}
        {activeTab === 'edge' && <EdgeValidatorTab />}
        {activeTab === 'ai' && <AIInsightsTab />}
      </div>
    </div>
  );
}
