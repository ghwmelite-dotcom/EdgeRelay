import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Dice5,
  TrendingUp,
  TrendingDown,
  Target,
  Clock,
  DollarSign,
  BarChart3,
  Play,
  Download,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';

// ── Types ───────────────────────────────────────────────────────

interface Firm {
  firm_name: string;
  plan_count: number;
}

interface FirmTemplate {
  id: string;
  firm_name: string;
  plan_name: string;
  challenge_phase: string;
  initial_balance: number;
  profit_target_percent: number | null;
  daily_loss_percent: number;
  max_drawdown_percent: number;
  drawdown_type: string;
  daily_loss_type: string;
  min_trading_days: number | null;
  max_calendar_days: number | null;
  news_trading_restricted: number;
  consistency_rule: number;
  source_url: string | null;
}

interface SimParams {
  initialBalance: number;
  profitTargetPct: number;
  dailyLossPct: number;
  maxDrawdownPct: number;
  maxDays: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  tradesPerDay: number;
}

interface SimResult {
  passed: boolean;
  equityCurve: number[];
  finalBalance: number;
  daysUsed: number;
  maxDrawdown: number;
}

interface MonteCarloResult {
  passRate: number;
  avgDaysToPass: number;
  avgDaysToFail: number;
  medianFinalBalance: number;
  worstDrawdown: number;
  sampleCurves: SimResult[];
  totalResults: SimResult[];
}

// ── Simulation Logic ────────────────────────────────────────────

function simulateChallenge(params: SimParams): SimResult {
  const {
    initialBalance,
    profitTargetPct,
    dailyLossPct,
    maxDrawdownPct,
    maxDays,
    winRate,
    avgWin,
    avgLoss,
    tradesPerDay,
  } = params;

  const target = initialBalance * (1 + profitTargetPct / 100);
  const maxDD = initialBalance * maxDrawdownPct / 100;
  const dailyLossLimit = initialBalance * dailyLossPct / 100;

  let balance = initialBalance;
  let highWaterMark = initialBalance;
  const equityCurve: number[] = [balance];

  for (let day = 0; day < maxDays; day++) {
    let dailyPnl = 0;

    for (let t = 0; t < tradesPerDay; t++) {
      const isWin = Math.random() < winRate / 100;
      const pnl = isWin ? avgWin : avgLoss;
      dailyPnl += pnl;
      balance += pnl;

      highWaterMark = Math.max(highWaterMark, balance);

      if (highWaterMark - balance >= maxDD) {
        return {
          passed: false,
          equityCurve,
          finalBalance: balance,
          daysUsed: day + 1,
          maxDrawdown: highWaterMark - balance,
        };
      }
    }

    if (Math.abs(dailyPnl) >= dailyLossLimit && dailyPnl < 0) {
      return {
        passed: false,
        equityCurve,
        finalBalance: balance,
        daysUsed: day + 1,
        maxDrawdown: highWaterMark - balance,
      };
    }

    equityCurve.push(balance);

    if (balance >= target) {
      return {
        passed: true,
        equityCurve,
        finalBalance: balance,
        daysUsed: day + 1,
        maxDrawdown: highWaterMark - balance,
      };
    }
  }

  return {
    passed: false,
    equityCurve,
    finalBalance: balance,
    daysUsed: maxDays,
    maxDrawdown: highWaterMark - balance,
  };
}

function runMonteCarlo(params: SimParams, iterations = 1000): MonteCarloResult {
  const results = Array.from({ length: iterations }, () =>
    simulateChallenge(params),
  );
  const passed = results.filter((r) => r.passed);
  const failed = results.filter((r) => !r.passed);

  return {
    passRate: (passed.length / iterations) * 100,
    avgDaysToPass:
      passed.length > 0
        ? passed.reduce((s, r) => s + r.daysUsed, 0) / passed.length
        : 0,
    avgDaysToFail:
      failed.length > 0
        ? failed.reduce((s, r) => s + r.daysUsed, 0) / failed.length
        : 0,
    medianFinalBalance: results
      .map((r) => r.finalBalance)
      .sort((a, b) => a - b)[Math.floor(iterations / 2)],
    worstDrawdown: Math.max(...results.map((r) => r.maxDrawdown)),
    sampleCurves: results.slice(0, 50),
    totalResults: results,
  };
}

// ── Formatting ──────────────────────────────────────────────────

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

// ── Equity Curve SVG ────────────────────────────────────────────

function EquityCurveChart({
  result,
  initialBalance,
  profitTargetPct,
  maxDrawdownPct,
}: {
  result: MonteCarloResult;
  initialBalance: number;
  profitTargetPct: number;
  maxDrawdownPct: number;
}) {
  const width = 800;
  const height = 400;
  const padding = { top: 24, right: 16, bottom: 40, left: 72 };

  const targetBalance = initialBalance * (1 + profitTargetPct / 100);
  const drawdownBalance = initialBalance * (1 - maxDrawdownPct / 100);

  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  // Find global min/max across all sample curves
  const allValues = result.sampleCurves.flatMap((r) => r.equityCurve);
  const globalMin = Math.min(...allValues, drawdownBalance) * 0.995;
  const globalMax = Math.max(...allValues, targetBalance) * 1.005;

  const maxDays = Math.max(...result.sampleCurves.map((r) => r.equityCurve.length));

  const scaleX = (day: number) => padding.left + (day / (maxDays - 1)) * chartW;
  const scaleY = (val: number) =>
    padding.top + chartH - ((val - globalMin) / (globalMax - globalMin)) * chartH;

  const buildPath = (curve: number[]) => {
    return curve
      .map((val, i) => {
        const x = scaleX(i);
        const y = scaleY(val);
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  };

  // Y-axis ticks
  const yTicks = useMemo(() => {
    const range = globalMax - globalMin;
    const rawStep = range / 5;
    const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const step = Math.ceil(rawStep / magnitude) * magnitude;
    const ticks: number[] = [];
    let tick = Math.floor(globalMin / step) * step;
    while (tick <= globalMax) {
      if (tick >= globalMin) ticks.push(tick);
      tick += step;
    }
    return ticks;
  }, [globalMin, globalMax]);

  // X-axis ticks
  const xTicks = useMemo(() => {
    const step = Math.max(1, Math.ceil(maxDays / 8));
    const ticks: number[] = [];
    for (let i = 0; i < maxDays; i += step) ticks.push(i);
    return ticks;
  }, [maxDays]);

  const targetY = scaleY(targetBalance);
  const ddY = scaleY(drawdownBalance);
  const startY = scaleY(initialBalance);

  return (
    <div className="w-full overflow-hidden rounded-xl border border-terminal-border bg-terminal-bg/50">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Grid lines */}
        {yTicks.map((tick) => (
          <line
            key={`grid-${tick}`}
            x1={padding.left}
            y1={scaleY(tick)}
            x2={width - padding.right}
            y2={scaleY(tick)}
            stroke="rgba(255,255,255,0.04)"
            strokeWidth={1}
          />
        ))}

        {/* Y-axis labels */}
        {yTicks.map((tick) => (
          <text
            key={`label-${tick}`}
            x={padding.left - 8}
            y={scaleY(tick) + 4}
            textAnchor="end"
            fill="rgba(148,163,184,0.6)"
            fontSize={11}
            fontFamily="monospace"
          >
            {formatCurrency(tick)}
          </text>
        ))}

        {/* X-axis labels */}
        {xTicks.map((tick) => (
          <text
            key={`xlab-${tick}`}
            x={scaleX(tick)}
            y={height - 8}
            textAnchor="middle"
            fill="rgba(148,163,184,0.6)"
            fontSize={11}
            fontFamily="monospace"
          >
            D{tick}
          </text>
        ))}

        {/* Starting balance line */}
        <line
          x1={padding.left}
          y1={startY}
          x2={width - padding.right}
          y2={startY}
          stroke="rgba(148,163,184,0.15)"
          strokeWidth={1}
          strokeDasharray="4 4"
        />

        {/* Profit target line */}
        <line
          x1={padding.left}
          y1={targetY}
          x2={width - padding.right}
          y2={targetY}
          stroke="var(--color-neon-cyan)"
          strokeWidth={1.5}
          strokeDasharray="8 4"
          opacity={0.6}
        />
        <text
          x={width - padding.right - 4}
          y={targetY - 6}
          textAnchor="end"
          fill="var(--color-neon-cyan)"
          fontSize={10}
          fontFamily="monospace"
          opacity={0.8}
        >
          TARGET {formatCurrency(targetBalance)}
        </text>

        {/* Max drawdown line */}
        <line
          x1={padding.left}
          y1={ddY}
          x2={width - padding.right}
          y2={ddY}
          stroke="var(--color-neon-red)"
          strokeWidth={1.5}
          strokeDasharray="8 4"
          opacity={0.6}
        />
        <text
          x={width - padding.right - 4}
          y={ddY + 14}
          textAnchor="end"
          fill="var(--color-neon-red)"
          fontSize={10}
          fontFamily="monospace"
          opacity={0.8}
        >
          MAX DD {formatCurrency(drawdownBalance)}
        </text>

        {/* Equity curves — failures first (behind), then passes */}
        {result.sampleCurves
          .filter((r) => !r.passed)
          .map((r, i) => (
            <path
              key={`fail-${i}`}
              d={buildPath(r.equityCurve)}
              fill="none"
              stroke="var(--color-neon-red)"
              strokeWidth={1.2}
              opacity={0.15}
            />
          ))}
        {result.sampleCurves
          .filter((r) => r.passed)
          .map((r, i) => (
            <path
              key={`pass-${i}`}
              d={buildPath(r.equityCurve)}
              fill="none"
              stroke="var(--color-neon-green)"
              strokeWidth={1.2}
              opacity={0.15}
            />
          ))}
      </svg>
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────

export function SimulatorPage() {
  // Firm data
  const [firms, setFirms] = useState<Firm[]>([]);
  const [firmsLoading, setFirmsLoading] = useState(true);
  const [selectedFirm, setSelectedFirm] = useState('');
  const [templates, setTemplates] = useState<FirmTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');

  // User inputs
  const [winRate, setWinRate] = useState(55);
  const [avgWin, setAvgWin] = useState(150);
  const [avgLoss, setAvgLoss] = useState(-100);
  const [tradesPerDay, setTradesPerDay] = useState(3);

  // Simulation results
  const [mcResult, setMcResult] = useState<MonteCarloResult | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  // Import My Stats
  const [importing, setImporting] = useState(false);
  const { isAuthenticated } = useAuthStore();

  // Comparison Mode
  const [comparing, setComparing] = useState(false);
  const [comparisonResults, setComparisonResults] = useState<Array<{
    firm_name: string;
    plan_name: string;
    pass_rate: number;
    avg_days: number;
    worst_dd: number;
  }> | null>(null);

  // What If Sliders
  const [whatIfWR, setWhatIfWR] = useState<number | null>(null);
  const [whatIfWin, setWhatIfWin] = useState<number | null>(null);
  const [whatIfTPD, setWhatIfTPD] = useState<number | null>(null);
  const [whatIfResult, setWhatIfResult] = useState<MonteCarloResult | null>(null);

  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === selectedTemplateId) ?? null,
    [templates, selectedTemplateId],
  );

  // ── Fetch firms ──
  useEffect(() => {
    async function fetchFirms() {
      try {
        const res = await fetch(
          'https://edgerelay-api.ghwmelite.workers.dev/v1/firms',
        );
        const json = await res.json();
        setFirms(json.data?.firms ?? []);
      } catch {
        // silent
      } finally {
        setFirmsLoading(false);
      }
    }
    fetchFirms();
  }, []);

  // ── Fetch templates when firm changes ──
  useEffect(() => {
    if (!selectedFirm) {
      setTemplates([]);
      setSelectedTemplateId('');
      return;
    }
    setTemplatesLoading(true);
    setSelectedTemplateId('');
    async function fetchTemplates() {
      try {
        const res = await fetch(
          `https://edgerelay-api.ghwmelite.workers.dev/v1/firms/${encodeURIComponent(selectedFirm)}/templates`,
        );
        const json = await res.json();
        setTemplates(json.data?.templates ?? []);
      } catch {
        setTemplates([]);
      } finally {
        setTemplatesLoading(false);
      }
    }
    fetchTemplates();
  }, [selectedFirm]);

  // ── Run simulation ──
  const canRun = selectedTemplate !== null && winRate > 0 && avgWin > 0 && avgLoss < 0;

  const handleRun = useCallback(() => {
    if (!selectedTemplate) return;
    setIsSimulating(true);

    // Use requestAnimationFrame to let the UI update before blocking
    requestAnimationFrame(() => {
      const params: SimParams = {
        initialBalance: selectedTemplate.initial_balance,
        profitTargetPct: selectedTemplate.profit_target_percent ?? 10,
        dailyLossPct: selectedTemplate.daily_loss_percent,
        maxDrawdownPct: selectedTemplate.max_drawdown_percent,
        maxDays: selectedTemplate.max_calendar_days ?? 60,
        winRate,
        avgWin,
        avgLoss,
        tradesPerDay,
      };

      const result = runMonteCarlo(params, 1000);
      setMcResult(result);
      setIsSimulating(false);
      // Reset what-if state
      setWhatIfWR(null); setWhatIfWin(null); setWhatIfTPD(null); setWhatIfResult(null);
    });
  }, [selectedTemplate, winRate, avgWin, avgLoss, tradesPerDay]);

  // ── Import My Stats ──
  const handleImportStats = async () => {
    setImporting(true);
    try {
      const res = await api.get<{
        win_rate: number;
        avg_win: number;
        avg_loss: number;
        total_trades: number;
        equity_curve: { date: string; balance: number }[];
      }>('/analytics/equity-health');

      if (res.data) {
        setWinRate(Math.round(res.data.win_rate));
        setAvgWin(Math.round(res.data.avg_win));
        setAvgLoss(Math.round(res.data.avg_loss));

        // Calculate trades per day from equity curve
        const days = res.data.equity_curve?.length || 1;
        const tpd = Math.max(1, Math.round(res.data.total_trades / Math.max(1, days)));
        setTradesPerDay(Math.min(20, tpd));
      }
    } catch {
      // Silent — fields stay at current values
    } finally {
      setImporting(false);
    }
  };

  // ── Compare Firms ──
  const handleCompare = useCallback(() => {
    if (!selectedTemplate) return;
    setComparing(true);

    requestAnimationFrame(() => {
      const comparisons = [
        { firm: 'FTMO', plan: '$100K Challenge', balance: 100000, target: 10, daily: 5, dd: 10, days: 30 },
        { firm: 'The5ers', plan: '$100K Hyper', balance: 100000, target: 8, daily: 4, dd: 6, days: 30 },
        { firm: 'FundedNext', plan: '$100K Stellar', balance: 100000, target: 10, daily: 5, dd: 10, days: 30 },
        { firm: 'MyFundedFX', plan: '$100K', balance: 100000, target: 8, daily: 5, dd: 8, days: 30 },
        { firm: 'Apex', plan: '$100K', balance: 100000, target: 8, daily: 2.5, dd: 7, days: 30 },
      ];

      const results = comparisons.map((c) => {
        const result = runMonteCarlo({
          initialBalance: c.balance,
          profitTargetPct: c.target,
          dailyLossPct: c.daily,
          maxDrawdownPct: c.dd,
          maxDays: c.days,
          winRate,
          avgWin,
          avgLoss,
          tradesPerDay,
        });
        return {
          firm_name: c.firm,
          plan_name: c.plan,
          pass_rate: Math.round(result.passRate * 10) / 10,
          avg_days: Math.round(result.avgDaysToPass),
          worst_dd: Math.round(result.worstDrawdown),
        };
      });

      results.sort((a, b) => b.pass_rate - a.pass_rate);
      setComparisonResults(results);
      setComparing(false);
    });
  }, [selectedTemplate, winRate, avgWin, avgLoss, tradesPerDay]);

  // ── What If debounced re-simulation ──
  useEffect(() => {
    if (!mcResult || !selectedTemplate) return;
    if (whatIfWR === null && whatIfWin === null && whatIfTPD === null) {
      setWhatIfResult(null);
      return;
    }

    const timer = setTimeout(() => {
      const result = runMonteCarlo({
        initialBalance: selectedTemplate.initial_balance,
        profitTargetPct: selectedTemplate.profit_target_percent ?? 10,
        dailyLossPct: selectedTemplate.daily_loss_percent,
        maxDrawdownPct: selectedTemplate.max_drawdown_percent,
        maxDays: selectedTemplate.max_calendar_days ?? 60,
        winRate: whatIfWR ?? winRate,
        avgWin: whatIfWin ?? avgWin,
        avgLoss: avgLoss,
        tradesPerDay: whatIfTPD ?? tradesPerDay,
      });
      setWhatIfResult(result);
    }, 300);

    return () => clearTimeout(timer);
  }, [whatIfWR, whatIfWin, whatIfTPD, mcResult, selectedTemplate, winRate, avgWin, avgLoss, tradesPerDay]);

  // ── Derived ──
  const passColor =
    mcResult === null
      ? ''
      : mcResult.passRate >= 50
        ? 'text-neon-green glow-text-green'
        : mcResult.passRate >= 30
          ? 'text-neon-amber'
          : 'text-neon-red glow-text-red';

  const expectedAttempts =
    mcResult && mcResult.passRate > 0
      ? Math.ceil(100 / mcResult.passRate)
      : null;

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neon-cyan/10">
            <Dice5 size={20} className="text-neon-cyan" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white font-display">
            Monte Carlo Simulator
          </h1>
        </div>
        <p className="text-sm text-terminal-muted">
          Simulate 1,000 challenge attempts based on your trading stats to estimate your pass probability.
        </p>
      </div>

      {/* ── Input Section ──────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Trading Stats Card */}
        <div className="glass-premium rounded-2xl p-6 space-y-5">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <BarChart3 size={16} className="text-neon-cyan" />
              <h2 className="text-sm font-bold uppercase tracking-widest text-slate-300">
                Your Trading Stats
              </h2>
            </div>
            {isAuthenticated && (
              <button
                onClick={handleImportStats}
                disabled={importing}
                className="flex items-center gap-1.5 rounded-lg border border-neon-cyan/20 bg-neon-cyan/5 px-3 py-1.5 text-[11px] font-semibold text-neon-cyan hover:bg-neon-cyan/10 transition-colors disabled:opacity-50"
              >
                {importing ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Download size={12} />
                )}
                Import My Stats
              </button>
            )}
          </div>

          {/* Win Rate */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-terminal-muted">
                Win Rate
              </label>
              <span className="font-mono-nums text-sm font-bold text-neon-cyan">
                {winRate}%
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={99}
              value={winRate}
              onChange={(e) => setWinRate(Number(e.target.value))}
              className="w-full accent-[var(--color-neon-cyan)] h-1.5 rounded-full appearance-none bg-terminal-border cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-terminal-muted">
              <span>1%</span>
              <span>50%</span>
              <span>99%</span>
            </div>
          </div>

          {/* Avg Winner */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-terminal-muted">
              Avg Winner ($)
            </label>
            <div className="relative">
              <TrendingUp
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-neon-green"
              />
              <input
                type="number"
                min={1}
                value={avgWin}
                onChange={(e) => setAvgWin(Math.max(1, Number(e.target.value)))}
                className="w-full rounded-lg border border-terminal-border bg-terminal-card pl-9 pr-4 py-2.5 text-sm font-mono-nums text-slate-100 placeholder:text-terminal-muted focus:border-neon-cyan/40 focus:outline-none focus:ring-1 focus:ring-neon-cyan/30 transition-colors"
              />
            </div>
          </div>

          {/* Avg Loser */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-terminal-muted">
              Avg Loser ($)
            </label>
            <div className="relative">
              <TrendingDown
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-neon-red"
              />
              <input
                type="number"
                max={-1}
                value={avgLoss}
                onChange={(e) =>
                  setAvgLoss(Math.min(-1, Number(e.target.value)))
                }
                className="w-full rounded-lg border border-terminal-border bg-terminal-card pl-9 pr-4 py-2.5 text-sm font-mono-nums text-slate-100 placeholder:text-terminal-muted focus:border-neon-cyan/40 focus:outline-none focus:ring-1 focus:ring-neon-cyan/30 transition-colors"
              />
            </div>
          </div>

          {/* Trades Per Day */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-terminal-muted">
              Trades Per Day
            </label>
            <div className="relative">
              <Target
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-neon-amber"
              />
              <input
                type="number"
                min={1}
                max={20}
                value={tradesPerDay}
                onChange={(e) =>
                  setTradesPerDay(
                    Math.min(20, Math.max(1, Number(e.target.value))),
                  )
                }
                className="w-full rounded-lg border border-terminal-border bg-terminal-card pl-9 pr-4 py-2.5 text-sm font-mono-nums text-slate-100 placeholder:text-terminal-muted focus:border-neon-cyan/40 focus:outline-none focus:ring-1 focus:ring-neon-cyan/30 transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Challenge Selection Card */}
        <div className="glass-premium rounded-2xl p-6 space-y-5">
          <div className="flex items-center gap-2 mb-1">
            <Target size={16} className="text-neon-cyan" />
            <h2 className="text-sm font-bold uppercase tracking-widest text-slate-300">
              Select Challenge
            </h2>
          </div>

          {/* Firm Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-terminal-muted">
              Prop Firm
            </label>
            <select
              value={selectedFirm}
              onChange={(e) => setSelectedFirm(e.target.value)}
              disabled={firmsLoading}
              className="w-full rounded-lg border border-terminal-border bg-terminal-card px-4 py-2.5 text-sm text-slate-100 focus:border-neon-cyan/40 focus:outline-none focus:ring-1 focus:ring-neon-cyan/30 transition-colors disabled:opacity-50"
            >
              <option value="">
                {firmsLoading ? 'Loading firms...' : 'Choose a firm'}
              </option>
              {firms.map((f) => (
                <option key={f.firm_name} value={f.firm_name}>
                  {f.firm_name} ({f.plan_count} plan
                  {f.plan_count !== 1 ? 's' : ''})
                </option>
              ))}
            </select>
          </div>

          {/* Plan Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-terminal-muted">
              Challenge Plan
            </label>
            <select
              value={selectedTemplateId}
              onChange={(e) => setSelectedTemplateId(e.target.value)}
              disabled={!selectedFirm || templatesLoading}
              className="w-full rounded-lg border border-terminal-border bg-terminal-card px-4 py-2.5 text-sm text-slate-100 focus:border-neon-cyan/40 focus:outline-none focus:ring-1 focus:ring-neon-cyan/30 transition-colors disabled:opacity-50"
            >
              <option value="">
                {templatesLoading
                  ? 'Loading plans...'
                  : !selectedFirm
                    ? 'Select a firm first'
                    : 'Choose a plan'}
              </option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.plan_name} — {t.challenge_phase} (
                  {formatCurrency(t.initial_balance)})
                </option>
              ))}
            </select>
          </div>

          {/* Selected plan details */}
          {selectedTemplate && (
            <div className="rounded-xl border border-terminal-border bg-terminal-bg/50 p-4 space-y-3 animate-fade-in-up">
              <h3 className="text-xs font-bold uppercase tracking-widest text-terminal-muted">
                Challenge Rules
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-terminal-muted">
                    Balance
                  </p>
                  <p className="font-mono-nums text-sm font-bold text-white">
                    {formatCurrency(selectedTemplate.initial_balance)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-terminal-muted">
                    Profit Target
                  </p>
                  <p className="font-mono-nums text-sm font-bold text-neon-green">
                    {selectedTemplate.profit_target_percent ?? 'N/A'}%
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-terminal-muted">
                    Daily Loss Limit
                  </p>
                  <p className="font-mono-nums text-sm font-bold text-neon-red">
                    {selectedTemplate.daily_loss_percent}%
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-terminal-muted">
                    Max Drawdown
                  </p>
                  <p className="font-mono-nums text-sm font-bold text-neon-red">
                    {selectedTemplate.max_drawdown_percent}%
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-terminal-muted">
                    Max Days
                  </p>
                  <p className="font-mono-nums text-sm font-bold text-white">
                    {selectedTemplate.max_calendar_days ?? 'Unlimited'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-terminal-muted">
                    DD Type
                  </p>
                  <p className="text-sm font-bold text-neon-amber">
                    {selectedTemplate.drawdown_type}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Run Button */}
          <button
            onClick={handleRun}
            disabled={!canRun || isSimulating}
            className="btn-premium mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-neon-cyan px-6 py-3.5 text-sm font-bold text-terminal-bg shadow-[0_0_20px_rgba(0,229,255,0.3)] transition-all hover:shadow-[0_0_32px_rgba(0,229,255,0.5)] disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
          >
            <Play size={16} />
            {isSimulating ? 'Simulating...' : 'Run 1,000 Simulations'}
          </button>
        </div>
      </div>

      {/* ── Results Section ─────────────────────────────────────── */}
      {mcResult && selectedTemplate && (
        <div className="space-y-6 animate-fade-in-up">
          {/* Pass Probability */}
          <div className="glass-premium rounded-2xl p-8 text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-terminal-muted mb-3">
              Pass Probability
            </p>
            <p className={`font-mono-nums text-7xl font-black ${passColor}`}>
              {mcResult.passRate.toFixed(1)}%
            </p>
            <p className="mt-3 text-sm text-slate-400">
              Based on 1,000 simulated challenge attempts
            </p>
          </div>

          {/* Equity Curve Chart */}
          <div className="glass-premium rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 size={16} className="text-neon-cyan" />
              <h2 className="text-sm font-bold uppercase tracking-widest text-slate-300">
                Simulated Equity Curves
              </h2>
              <span className="ml-auto flex items-center gap-4 text-xs text-terminal-muted">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-2 w-4 rounded-sm bg-neon-green/40" />
                  Pass
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-2 w-4 rounded-sm bg-neon-red/40" />
                  Fail
                </span>
              </span>
            </div>
            <EquityCurveChart
              result={mcResult}
              initialBalance={selectedTemplate.initial_balance}
              profitTargetPct={selectedTemplate.profit_target_percent ?? 10}
              maxDrawdownPct={selectedTemplate.max_drawdown_percent}
            />
          </div>

          {/* Statistics Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="glass-premium rounded-2xl p-5 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Clock size={14} className="text-neon-green" />
                <p className="text-[10px] font-bold uppercase tracking-widest text-terminal-muted">
                  Avg Days to Pass
                </p>
              </div>
              <p className="font-mono-nums text-3xl font-black text-neon-green">
                {mcResult.avgDaysToPass > 0
                  ? mcResult.avgDaysToPass.toFixed(1)
                  : '--'}
              </p>
            </div>

            <div className="glass-premium rounded-2xl p-5 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Clock size={14} className="text-neon-red" />
                <p className="text-[10px] font-bold uppercase tracking-widest text-terminal-muted">
                  Avg Days to Fail
                </p>
              </div>
              <p className="font-mono-nums text-3xl font-black text-neon-red">
                {mcResult.avgDaysToFail > 0
                  ? mcResult.avgDaysToFail.toFixed(1)
                  : '--'}
              </p>
            </div>

            <div className="glass-premium rounded-2xl p-5 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <DollarSign size={14} className="text-neon-cyan" />
                <p className="text-[10px] font-bold uppercase tracking-widest text-terminal-muted">
                  Median Final Balance
                </p>
              </div>
              <p className="font-mono-nums text-3xl font-black text-white">
                {formatCurrency(mcResult.medianFinalBalance)}
              </p>
            </div>

            <div className="glass-premium rounded-2xl p-5 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <TrendingDown size={14} className="text-neon-amber" />
                <p className="text-[10px] font-bold uppercase tracking-widest text-terminal-muted">
                  Worst Drawdown
                </p>
              </div>
              <p className="font-mono-nums text-3xl font-black text-neon-amber">
                {formatCurrency(mcResult.worstDrawdown)}
              </p>
            </div>
          </div>

          {/* Cost Analysis */}
          <div className="glass-premium rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign size={16} className="text-neon-cyan" />
              <h2 className="text-sm font-bold uppercase tracking-widest text-slate-300">
                Risk Analysis
              </h2>
            </div>

            {mcResult.passRate > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-terminal-border bg-terminal-bg/50 p-4">
                  <p className="text-xs text-terminal-muted mb-1">
                    Expected attempts to pass
                  </p>
                  <p className="font-mono-nums text-2xl font-black text-white">
                    {expectedAttempts}
                    <span className="text-sm font-normal text-terminal-muted ml-1">
                      attempt{expectedAttempts !== 1 ? 's' : ''}
                    </span>
                  </p>
                </div>
                <div className="rounded-xl border border-terminal-border bg-terminal-bg/50 p-4">
                  <p className="text-xs text-terminal-muted mb-1">
                    Estimated cost to pass once (~$500/attempt)
                  </p>
                  <p className="font-mono-nums text-2xl font-black text-neon-amber">
                    {formatCurrency((expectedAttempts ?? 1) * 500)}
                  </p>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-neon-red/20 bg-neon-red/5 p-4 text-center">
                <p className="text-sm text-neon-red font-semibold">
                  At your current stats, passing this challenge is extremely unlikely.
                </p>
                <p className="text-xs text-terminal-muted mt-1">
                  Consider improving your win rate or risk-reward ratio before attempting.
                </p>
              </div>
            )}
          </div>

          {/* What If Sliders */}
          {selectedTemplate && (
            <div className="glass-premium rounded-2xl p-6 space-y-5 animate-fade-in-up">
              <h3 className="text-sm font-bold uppercase tracking-widest text-slate-300 flex items-center gap-2">
                <Sparkles size={14} className="text-neon-amber" />
                What If Analysis
              </h3>

              <div className="grid gap-4 sm:grid-cols-3">
                {/* Win Rate slider */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-terminal-muted">
                    <span>Win Rate</span>
                    <span className="font-mono-nums font-bold text-neon-cyan">{whatIfWR ?? winRate}%</span>
                  </div>
                  <input
                    type="range"
                    min={Math.max(1, winRate - 15)}
                    max={Math.min(99, winRate + 15)}
                    value={whatIfWR ?? winRate}
                    onChange={(e) => setWhatIfWR(Number(e.target.value))}
                    className="w-full accent-neon-cyan"
                  />
                </div>

                {/* Avg Winner slider */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-terminal-muted">
                    <span>Avg Winner</span>
                    <span className="font-mono-nums font-bold text-neon-green">${whatIfWin ?? avgWin}</span>
                  </div>
                  <input
                    type="range"
                    min={Math.max(1, Math.round(avgWin * 0.5))}
                    max={Math.round(avgWin * 2)}
                    value={whatIfWin ?? avgWin}
                    onChange={(e) => setWhatIfWin(Number(e.target.value))}
                    className="w-full accent-neon-green"
                  />
                </div>

                {/* Trades Per Day slider */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-terminal-muted">
                    <span>Trades/Day</span>
                    <span className="font-mono-nums font-bold text-neon-amber">{whatIfTPD ?? tradesPerDay}</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={10}
                    value={whatIfTPD ?? tradesPerDay}
                    onChange={(e) => setWhatIfTPD(Number(e.target.value))}
                    className="w-full accent-neon-amber"
                  />
                </div>
              </div>

              {/* Delta display */}
              {whatIfResult && (
                <div className="flex items-center justify-center gap-6 pt-2">
                  <div className="text-center">
                    <p className="text-[10px] uppercase tracking-wider text-terminal-muted">Original</p>
                    <p className="font-mono-nums text-lg font-bold text-terminal-text">{mcResult!.passRate.toFixed(1)}%</p>
                  </div>
                  <div className="text-2xl text-terminal-muted">&rarr;</div>
                  <div className="text-center">
                    <p className="text-[10px] uppercase tracking-wider text-terminal-muted">What If</p>
                    <p className={`font-mono-nums text-lg font-bold ${
                      whatIfResult.passRate > mcResult!.passRate ? 'text-neon-green' :
                      whatIfResult.passRate < mcResult!.passRate ? 'text-neon-red' : 'text-terminal-text'
                    }`}>
                      {whatIfResult.passRate.toFixed(1)}%
                    </p>
                  </div>
                  <div className={`font-mono-nums text-sm font-bold ${
                    whatIfResult.passRate > mcResult!.passRate ? 'text-neon-green' :
                    whatIfResult.passRate < mcResult!.passRate ? 'text-neon-red' : 'text-terminal-muted'
                  }`}>
                    {whatIfResult.passRate > mcResult!.passRate ? '+' : ''}
                    {(whatIfResult.passRate - mcResult!.passRate).toFixed(1)}%
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Comparison Mode */}
          <div className="space-y-4 animate-fade-in-up">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-widest text-slate-300 flex items-center gap-2">
                <Target size={14} className="text-neon-purple" />
                Firm Comparison
              </h3>
              <button
                onClick={handleCompare}
                disabled={comparing}
                className="flex items-center gap-1.5 rounded-lg border border-neon-purple/20 bg-neon-purple/5 px-3 py-1.5 text-[11px] font-semibold text-neon-purple hover:bg-neon-purple/10 transition-colors disabled:opacity-50"
              >
                {comparing ? 'Comparing...' : 'Compare 5 Firms'}
              </button>
            </div>

            {comparisonResults && (
              <div className="glass-premium rounded-2xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-terminal-border/50">
                      <th className="px-4 py-3 text-left text-[10px] uppercase tracking-wider text-terminal-muted font-semibold">Firm</th>
                      <th className="px-4 py-3 text-right text-[10px] uppercase tracking-wider text-terminal-muted font-semibold">Pass Rate</th>
                      <th className="px-4 py-3 text-right text-[10px] uppercase tracking-wider text-terminal-muted font-semibold">Avg Days</th>
                      <th className="px-4 py-3 text-right text-[10px] uppercase tracking-wider text-terminal-muted font-semibold">Worst DD</th>
                      <th className="px-4 py-3 text-right text-[10px] uppercase tracking-wider text-terminal-muted font-semibold">Fit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonResults.map((r, i) => (
                      <tr key={r.firm_name} className="border-b border-terminal-border/20 hover:bg-terminal-card/30">
                        <td className="px-4 py-3 font-medium text-white">
                          {r.firm_name}
                          <span className="block text-[10px] text-terminal-muted">{r.plan_name}</span>
                        </td>
                        <td className={`px-4 py-3 text-right font-mono-nums font-bold ${
                          r.pass_rate >= 60 ? 'text-neon-green' : r.pass_rate >= 40 ? 'text-neon-amber' : 'text-neon-red'
                        }`}>
                          {r.pass_rate}%
                        </td>
                        <td className="px-4 py-3 text-right font-mono-nums text-terminal-text">
                          {r.avg_days || '\u2014'}
                        </td>
                        <td className="px-4 py-3 text-right font-mono-nums text-neon-red">
                          ${r.worst_dd.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {i === 0 && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-neon-green/10 border border-neon-green/20 px-2 py-0.5 text-[10px] font-bold text-neon-green">
                              BEST FIT
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
