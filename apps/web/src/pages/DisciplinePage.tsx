import { useState, useEffect, useCallback } from 'react';
import {
  Brain,
  Flame,
  TrendingUp,
  Clock,
  Target,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Zap,
  Timer,
  BarChart3,
  Moon,
  Hand,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { api } from '@/lib/api';

/* ================================================================== */
/*  Types                                                              */
/* ================================================================== */

interface DisciplineData {
  score: number;
  grade: string;
  total_trades: number;
  revenge_trades: { count: number; pnl: number; pct_of_total: number };
  tilt_events: { count: number; description: string };
  overtrade_days: {
    count: number;
    avg_daily_trades: number;
    worst_day: { date: string; trades: number } | null;
  };
  session_discipline: {
    best_session: string | null;
    worst_session: string | null;
    off_session_pnl: number;
  };
  streaks: { current_disciplined_days: number; best_streak: number };
  weekly_trend: { week: string; score: number }[];
}

interface CoachingData {
  headline: string;
  message: string;
  action_items: string[];
  positive: string;
  generated_at: string | null;
  cached: boolean;
}

/* ================================================================== */
/*  Helpers                                                            */
/* ================================================================== */

function fmtCurrency(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}$${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function gradeColor(grade: string): string {
  if (grade.startsWith('A')) return 'text-neon-green';
  if (grade.startsWith('B')) return 'text-neon-cyan';
  if (grade === 'C') return 'text-neon-amber';
  return 'text-neon-red';
}

function gradeBg(grade: string): string {
  if (grade.startsWith('A')) return 'bg-neon-green/10 border-neon-green/30';
  if (grade.startsWith('B')) return 'bg-neon-cyan/10 border-neon-cyan/30';
  if (grade === 'C') return 'bg-neon-amber/10 border-neon-amber/30';
  return 'bg-neon-red/10 border-neon-red/30';
}

function scoreStrokeColor(score: number): string {
  if (score >= 80) return 'var(--color-neon-green)';
  if (score >= 60) return 'var(--color-neon-amber)';
  return 'var(--color-neon-red)';
}

function scoreGlowClass(score: number): string {
  if (score >= 80) return 'drop-shadow-[0_0_12px_#22c55e60]';
  if (score >= 60) return 'drop-shadow-[0_0_12px_#f59e0b60]';
  return 'drop-shadow-[0_0_12px_#ff3d5760]';
}

/* ================================================================== */
/*  Score Gauge SVG                                                    */
/* ================================================================== */

function ScoreGauge({ score, grade }: { score: number; grade: string }) {
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;

  return (
    <div className="relative w-40 h-40 mx-auto">
      <svg viewBox="0 0 140 140" className={`w-full h-full -rotate-90 ${scoreGlowClass(score)}`}>
        <circle
          cx="70" cy="70" r={radius}
          fill="none"
          stroke="var(--color-terminal-border)"
          strokeWidth="8"
          strokeOpacity="0.2"
        />
        <circle
          cx="70" cy="70" r={radius}
          fill="none"
          stroke={scoreStrokeColor(score)}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${progress} ${circumference}`}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-black font-mono-nums text-white">{score}</span>
        <span className={`text-sm font-bold mt-0.5 ${gradeColor(grade)}`}>{grade}</span>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Weekly Trend Sparkline                                             */
/* ================================================================== */

function WeeklySparkline({ data }: { data: { week: string; score: number }[] }) {
  if (data.length < 2) return null;

  const w = 200;
  const h = 40;
  const padding = 4;
  const maxScore = 100;
  const step = (w - padding * 2) / (data.length - 1);

  const points = data.map((d, i) => {
    const x = padding + i * step;
    const y = h - padding - ((d.score / maxScore) * (h - padding * 2));
    return `${x},${y}`;
  }).join(' ');

  const last = data[data.length - 1]!;
  const prev = data[data.length - 2]!;
  const trend = last.score >= prev.score ? 'up' : 'down';

  return (
    <div className="flex items-center gap-2">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full max-w-[200px] h-10">
        <polyline
          points={points}
          fill="none"
          stroke={trend === 'up' ? 'var(--color-neon-green)' : 'var(--color-neon-red)'}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {data.map((d, i) => {
          const x = padding + i * step;
          const y = h - padding - ((d.score / maxScore) * (h - padding * 2));
          return (
            <circle
              key={d.week}
              cx={x} cy={y} r="2.5"
              fill={i === data.length - 1 ? (trend === 'up' ? 'var(--color-neon-green)' : 'var(--color-neon-red)') : 'var(--color-terminal-muted)'}
            />
          );
        })}
      </svg>
      <span className={`text-xs font-mono-nums font-semibold ${trend === 'up' ? 'text-neon-green' : 'text-neon-red'}`}>
        {trend === 'up' ? '+' : ''}{last.score - prev.score}
      </span>
    </div>
  );
}

/* ================================================================== */
/*  Behavioral Tips                                                    */
/* ================================================================== */

const TIPS = [
  {
    title: 'The 15-Minute Rule',
    icon: Timer,
    content: 'After a losing trade, wait at least 15 minutes before entering a new position. This gives your emotional brain time to cool down and your rational brain time to re-engage. Use the time to review your trading plan.',
  },
  {
    title: 'Fixed Lot Commitment',
    icon: Target,
    content: 'Never increase your lot size after losses. Stick to your predetermined position size regardless of recent outcomes. Increasing size after losses is a classic tilt behavior that compounds drawdowns.',
  },
  {
    title: 'Daily Trade Cap',
    icon: BarChart3,
    content: 'Set a maximum number of trades per day based on your average. If your average is 4 trades per day, cap yourself at 6. Once you hit the cap, close your platform. More trades does not mean more profit.',
  },
  {
    title: 'Session Focus',
    icon: Moon,
    content: 'Identify your most profitable trading session and focus your energy there. Trading off-session often leads to lower quality setups and reduced edge. Your data will show you which session works best.',
  },
  {
    title: 'The Walk Away',
    icon: Hand,
    content: 'Set a daily loss limit (e.g., 2% of account). Once hit, close all positions and walk away. No exceptions. This single rule prevents the catastrophic loss days that destroy months of progress.',
  },
];

function TipCard({ title, icon: Icon, content }: typeof TIPS[0]) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl border border-terminal-border/40 bg-terminal-card/50 overflow-hidden transition-all duration-200">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-terminal-card/80 transition-colors focus-ring rounded-2xl"
      >
        <Icon size={18} className="text-neon-cyan shrink-0" />
        <span className="text-sm font-semibold text-white flex-1">{title}</span>
        {open ? <ChevronUp size={16} className="text-terminal-muted" /> : <ChevronDown size={16} className="text-terminal-muted" />}
      </button>
      {open && (
        <div className="px-4 pb-4 pt-0">
          <p className="text-xs text-terminal-muted leading-relaxed">{content}</p>
        </div>
      )}
    </div>
  );
}

/* ================================================================== */
/*  Main Page                                                          */
/* ================================================================== */

export function DisciplinePage() {
  const [discipline, setDiscipline] = useState<DisciplineData | null>(null);
  const [coaching, setCoaching] = useState<CoachingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [coachingLoading, setCoachingLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDiscipline = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<DisciplineData>('/analytics/discipline');
      if (res.data) setDiscipline(res.data);
      else if (res.error) setError(res.error.message);
    } catch {
      setError('Failed to load discipline data');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCoaching = useCallback(async () => {
    setCoachingLoading(true);
    try {
      const res = await api.get<CoachingData>('/analytics/discipline/coaching');
      if (res.data) setCoaching(res.data);
    } catch {
      // Coaching is optional — don't show error
    } finally {
      setCoachingLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDiscipline();
    fetchCoaching();
  }, [fetchDiscipline, fetchCoaching]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Brain className="h-8 w-8 text-neon-cyan animate-pulse" />
          <p className="text-sm text-terminal-muted">Analyzing your discipline...</p>
        </div>
      </div>
    );
  }

  if (error || !discipline) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-2">
          <AlertTriangle className="h-8 w-8 text-neon-amber mx-auto" />
          <p className="text-sm text-neon-red">{error ?? 'No data available'}</p>
          <button onClick={fetchDiscipline} className="text-xs text-neon-cyan hover:underline">
            Retry
          </button>
        </div>
      </div>
    );
  }

  const d = discipline;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20">
            <Brain className="h-6 w-6 text-purple-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Trading Discipline</h1>
            <p className="text-xs text-terminal-muted">{d.total_trades} trades analyzed</p>
          </div>
        </div>
        <button
          onClick={() => { fetchDiscipline(); fetchCoaching(); }}
          className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium text-terminal-muted hover:text-neon-cyan border border-terminal-border/40 hover:border-neon-cyan/30 transition-all focus-ring"
        >
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {/* Score Section */}
      <div className="rounded-2xl border border-terminal-border/40 bg-terminal-card/50 p-6 text-center">
        <p className="text-xs text-terminal-muted uppercase tracking-wider mb-4">Discipline Score</p>
        <ScoreGauge score={d.score} grade={d.grade} />
        <div className="mt-4 flex justify-center">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${gradeBg(d.grade)} ${gradeColor(d.grade)}`}>
            {d.grade} — {d.score >= 80 ? 'Disciplined' : d.score >= 60 ? 'Improving' : d.score >= 50 ? 'Work Needed' : 'At Risk'}
          </span>
        </div>
        {d.weekly_trend.length >= 2 && (
          <div className="mt-4 flex flex-col items-center">
            <p className="text-[10px] text-terminal-muted uppercase tracking-wider mb-1">Weekly Trend</p>
            <WeeklySparkline data={d.weekly_trend} />
          </div>
        )}
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Revenge Trades */}
        <div className={`rounded-2xl border bg-terminal-card/50 p-4 ${d.revenge_trades.count > 0 ? 'border-l-4 border-l-neon-red border-t-terminal-border/40 border-r-terminal-border/40 border-b-terminal-border/40' : 'border-terminal-border/40'}`}>
          <div className="flex items-center gap-2 mb-3">
            <Flame size={16} className={d.revenge_trades.count > 0 ? 'text-neon-red' : 'text-terminal-muted'} />
            <span className="text-xs font-semibold text-terminal-muted uppercase tracking-wider">Revenge Trades</span>
          </div>
          <p className={`text-2xl font-black font-mono-nums ${d.revenge_trades.count > 0 ? 'text-neon-red' : 'text-neon-green'}`}>
            {d.revenge_trades.count}
          </p>
          {d.revenge_trades.count > 0 && (
            <>
              <p className="text-xs text-neon-red mt-1">{fmtCurrency(d.revenge_trades.pnl)} P&L impact</p>
              <p className="text-[10px] text-terminal-muted mt-0.5">{d.revenge_trades.pct_of_total}% of all trades</p>
            </>
          )}
          {d.revenge_trades.count === 0 && (
            <p className="text-xs text-neon-green mt-1 flex items-center gap-1">
              <CheckCircle2 size={12} /> No revenge trades
            </p>
          )}
        </div>

        {/* Tilt Events */}
        <div className={`rounded-2xl border bg-terminal-card/50 p-4 ${d.tilt_events.count > 0 ? 'border-l-4 border-l-neon-amber border-t-terminal-border/40 border-r-terminal-border/40 border-b-terminal-border/40' : 'border-terminal-border/40'}`}>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={16} className={d.tilt_events.count > 0 ? 'text-neon-amber' : 'text-terminal-muted'} />
            <span className="text-xs font-semibold text-terminal-muted uppercase tracking-wider">Tilt Events</span>
          </div>
          <p className={`text-2xl font-black font-mono-nums ${d.tilt_events.count > 0 ? 'text-neon-amber' : 'text-neon-green'}`}>
            {d.tilt_events.count}
          </p>
          {d.tilt_events.count > 0 && d.tilt_events.description && (
            <p className="text-[10px] text-terminal-muted mt-1">{d.tilt_events.description}</p>
          )}
          {d.tilt_events.count === 0 && (
            <p className="text-xs text-neon-green mt-1 flex items-center gap-1">
              <CheckCircle2 size={12} /> Lot sizes consistent
            </p>
          )}
        </div>

        {/* Overtrade Days */}
        <div className={`rounded-2xl border bg-terminal-card/50 p-4 ${d.overtrade_days.count > 0 ? 'border-l-4 border-l-neon-amber border-t-terminal-border/40 border-r-terminal-border/40 border-b-terminal-border/40' : 'border-terminal-border/40'}`}>
          <div className="flex items-center gap-2 mb-3">
            <Zap size={16} className={d.overtrade_days.count > 0 ? 'text-neon-amber' : 'text-terminal-muted'} />
            <span className="text-xs font-semibold text-terminal-muted uppercase tracking-wider">Overtrade Days</span>
          </div>
          <p className={`text-2xl font-black font-mono-nums ${d.overtrade_days.count > 0 ? 'text-neon-amber' : 'text-neon-green'}`}>
            {d.overtrade_days.count}
          </p>
          <p className="text-[10px] text-terminal-muted mt-1">Avg: {d.overtrade_days.avg_daily_trades} trades/day</p>
          {d.overtrade_days.worst_day && (
            <p className="text-[10px] text-neon-amber mt-0.5">
              Worst: {d.overtrade_days.worst_day.date} ({d.overtrade_days.worst_day.trades} trades)
            </p>
          )}
          {d.overtrade_days.count === 0 && (
            <p className="text-xs text-neon-green mt-1 flex items-center gap-1">
              <CheckCircle2 size={12} /> Within limits
            </p>
          )}
        </div>

        {/* Session Discipline */}
        <div className={`rounded-2xl border bg-terminal-card/50 p-4 ${d.session_discipline.off_session_pnl < 0 ? 'border-l-4 border-l-neon-amber border-t-terminal-border/40 border-r-terminal-border/40 border-b-terminal-border/40' : 'border-l-4 border-l-neon-green border-t-terminal-border/40 border-r-terminal-border/40 border-b-terminal-border/40'}`}>
          <div className="flex items-center gap-2 mb-3">
            <Clock size={16} className="text-neon-cyan" />
            <span className="text-xs font-semibold text-terminal-muted uppercase tracking-wider">Session Focus</span>
          </div>
          {d.session_discipline.best_session && (
            <p className="text-xs text-white">
              Best: <span className="text-neon-green font-semibold capitalize">{d.session_discipline.best_session}</span>
            </p>
          )}
          {d.session_discipline.worst_session && (
            <p className="text-xs text-white mt-1">
              Worst: <span className="text-neon-red font-semibold capitalize">{d.session_discipline.worst_session}</span>
            </p>
          )}
          {d.session_discipline.off_session_pnl < 0 && (
            <p className="text-[10px] text-neon-red mt-1">
              Off-session: {fmtCurrency(d.session_discipline.off_session_pnl)}
            </p>
          )}
        </div>
      </div>

      {/* Streaks */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-l-4 border-l-neon-green border-t-terminal-border/40 border-r-terminal-border/40 border-b-terminal-border/40 bg-terminal-card/50 p-4">
          <p className="text-xs text-terminal-muted uppercase tracking-wider mb-1">Current Streak</p>
          <p className="text-2xl font-black font-mono-nums text-neon-green">
            {d.streaks.current_disciplined_days} <span className="text-sm font-semibold text-terminal-muted">days</span>
          </p>
        </div>
        <div className="rounded-2xl border border-terminal-border/40 bg-terminal-card/50 p-4">
          <p className="text-xs text-terminal-muted uppercase tracking-wider mb-1">Best Streak</p>
          <p className="text-2xl font-black font-mono-nums text-neon-cyan">
            {d.streaks.best_streak} <span className="text-sm font-semibold text-terminal-muted">days</span>
          </p>
        </div>
      </div>

      {/* AI Coaching */}
      <div className="rounded-2xl border border-purple-500/30 bg-gradient-to-br from-purple-500/5 via-terminal-card/50 to-terminal-card/50 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2">
              <Brain size={18} className="text-purple-400" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">AI Coach</h2>
            </div>
            <p className="text-[11px] text-terminal-muted mt-1 ml-[26px]">Personalized coaching unlocks after 10+ closed trades</p>
          </div>
          <button
            onClick={fetchCoaching}
            disabled={coachingLoading}
            className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[11px] font-medium text-terminal-muted hover:text-purple-400 border border-terminal-border/40 hover:border-purple-400/30 transition-all disabled:opacity-50 focus-ring"
          >
            <RefreshCw size={12} className={coachingLoading ? 'animate-spin' : ''} />
            Refresh Coaching
          </button>
        </div>

        {coachingLoading && !coaching ? (
          <div className="flex items-center gap-2 py-8 justify-center">
            <Brain size={16} className="text-purple-400 animate-pulse" />
            <p className="text-xs text-terminal-muted">Generating coaching insights...</p>
          </div>
        ) : coaching ? (
          <div className="space-y-4">
            <h3 className="text-base font-bold text-purple-300">{coaching.headline}</h3>
            <div className="text-sm text-terminal-text leading-relaxed whitespace-pre-line">
              {coaching.message}
            </div>

            {coaching.action_items && coaching.action_items.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-terminal-muted uppercase tracking-wider font-semibold">Action Items</p>
                <ul className="space-y-1.5">
                  {coaching.action_items.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-white">
                      <div className="mt-0.5 h-4 w-4 rounded border border-purple-400/40 shrink-0 flex items-center justify-center">
                        <span className="text-[8px] text-purple-400 font-bold">{i + 1}</span>
                      </div>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {coaching.positive && (
              <div className="rounded-xl bg-neon-green/5 border border-neon-green/20 p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <CheckCircle2 size={14} className="text-neon-green" />
                  <span className="text-xs font-semibold text-neon-green uppercase tracking-wider">What You're Doing Well</span>
                </div>
                <p className="text-sm text-terminal-text">{coaching.positive}</p>
              </div>
            )}

            {coaching.generated_at && (
              <p className="text-[10px] text-terminal-muted">
                Generated {coaching.cached ? '(cached) ' : ''}on {new Date(coaching.generated_at).toLocaleDateString()}
              </p>
            )}
          </div>
        ) : (
          <p className="text-xs text-terminal-muted py-4 text-center">Coaching unavailable. Try refreshing.</p>
        )}
      </div>

      {/* Behavioral Tips */}
      <div>
        <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
          <Zap size={16} className="text-neon-cyan" />
          Behavioral Techniques
        </h2>
        <div className="space-y-2">
          {TIPS.map((tip) => (
            <TipCard key={tip.title} {...tip} />
          ))}
        </div>
      </div>
    </div>
  );
}
