import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Play, Pause, SkipForward, RotateCcw, TrendingUp, TrendingDown, X as XIcon,
  ChevronRight, GraduationCap, BarChart3, Target, ShieldCheck, Clock,
  CheckCircle2, Lock, Zap,
} from 'lucide-react';
import { useChartSimulatorStore } from '@/stores/chartSimulator';
import { useAcademyStore } from '@/stores/academy';
import { ChartCanvas } from '@/components/practice/ChartCanvas';
import { PRACTICE_SCENARIOS } from '@/data/practice-scenarios';
import { calculateSessionStats, getPipMultiplier, calculatePnl } from '@/lib/chart-simulator-engine';

const SPEED_OPTIONS = [
  { label: '1x', value: 1000 },
  { label: '2x', value: 500 },
  { label: '5x', value: 200 },
  { label: '10x', value: 100 },
];

const ACCENT_MAP: Record<string, string> = {
  'neon-cyan': '#00e5ff', 'neon-green': '#00ff9d', 'neon-amber': '#ffb800',
  'neon-purple': '#b18cff', 'neon-red': '#ff3d57',
};

export function ChartSimulatorPage() {
  const store = useChartSimulatorStore();
  const { isLevelUnlocked, fetchProgress } = useAcademyStore();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [slPips, setSlPips] = useState('25');
  const [tpPips, setTpPips] = useState('50');
  const [lotSize, setLotSize] = useState('0.10');

  useEffect(() => { fetchProgress(); }, [fetchProgress]);

  // Playback interval
  useEffect(() => {
    if (store.isPlaying) {
      intervalRef.current = setInterval(() => store.advance(), store.playbackSpeed);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [store.isPlaying, store.playbackSpeed]);

  const stats = store.getStats();
  const currentPrice = store.getCurrentPrice();
  const progress = store.scenario ? Math.round((store.visibleCount / store.scenario.candles.length) * 100) : 0;

  // If no scenario selected, show selector
  if (!store.scenario) {
    return (
      <div className="page-enter max-w-4xl mx-auto space-y-8 pb-12">
        <div className="animate-fade-in-up">
          <nav className="mb-4 flex items-center gap-2 text-[11px] font-mono-nums text-terminal-muted">
            <Link to="/academy" className="hover:text-neon-cyan">Academy</Link>
            <ChevronRight size={10} />
            <span className="text-slate-400">Practice Trading</span>
          </nav>
          <div className="flex items-center gap-3 mb-2">
            <Target size={24} className="text-neon-cyan" />
            <h1 className="text-2xl font-bold text-white font-display">Practice Trading</h1>
          </div>
          <p className="text-sm text-terminal-muted">Trade against historical price data. No risk, real learning.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {PRACTICE_SCENARIOS.map((s, i) => {
            const unlocked = isLevelUnlocked(s.requiredLevel);
            const accent = ACCENT_MAP[s.accentColor] || '#00e5ff';
            return (
              <button
                key={s.id}
                onClick={() => unlocked && store.selectScenario(s)}
                disabled={!unlocked}
                className={`animate-fade-in-up text-left rounded-2xl border overflow-hidden transition-all cursor-pointer group ${
                  unlocked ? 'border-terminal-border/40 bg-terminal-card/20 hover:border-terminal-border-hover' : 'border-terminal-border/20 bg-terminal-card/10 opacity-50'
                }`}
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="h-[3px] w-full" style={{ background: `linear-gradient(90deg, ${accent}60, ${accent}20, transparent)` }} />
                <div className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono-nums text-[10px] uppercase tracking-wider" style={{ color: accent }}>{s.instrument} · {s.timeframe}</span>
                      <span className={`rounded-full border px-2 py-0.5 font-mono-nums text-[9px] ${
                        s.difficulty === 'beginner' ? 'border-neon-green/25 text-neon-green' :
                        s.difficulty === 'intermediate' ? 'border-neon-amber/25 text-neon-amber' :
                        s.difficulty === 'advanced' ? 'border-neon-red/25 text-neon-red' :
                        'border-neon-purple/25 text-neon-purple'
                      }`}>
                        {s.difficulty}
                      </span>
                    </div>
                    {!unlocked && <Lock size={14} className="text-terminal-muted" />}
                  </div>
                  <h3 className="font-display text-base font-semibold text-white group-hover:text-neon-cyan transition-colors">{s.name}</h3>
                  <p className="mt-1.5 text-[12px] text-terminal-muted">{s.description}</p>
                  <div className="mt-3 flex items-center gap-3 font-mono-nums text-[10px] text-terminal-muted">
                    <span>{s.candles.length} candles</span>
                    <span>Level {s.requiredLevel}+</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const scenario = store.scenario;
  const accent = ACCENT_MAP[scenario.accentColor] || '#00e5ff';
  const pipMult = getPipMultiplier(scenario.instrument);
  const isGold = scenario.instrument.toUpperCase().includes('XAU');
  const isIndex = scenario.instrument.toUpperCase().includes('NAS') || scenario.instrument.toUpperCase().includes('US30');
  const decimals = isIndex ? 1 : isGold ? 2 : 5;

  return (
    <div className="page-enter space-y-4 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <nav className="mb-1 flex items-center gap-2 text-[11px] font-mono-nums text-terminal-muted">
            <Link to="/academy" className="hover:text-neon-cyan">Academy</Link>
            <ChevronRight size={10} />
            <Link to="/academy/practice" className="hover:text-neon-cyan" onClick={() => store.reset()}>Practice</Link>
            <ChevronRight size={10} />
            <span style={{ color: accent }}>{scenario.name}</span>
          </nav>
          <div className="flex items-center gap-2">
            <h2 className="font-display text-lg font-bold text-white">{scenario.instrument}</h2>
            <span className="font-mono-nums text-[11px] text-terminal-muted">{scenario.timeframe}</span>
            <span className="font-mono-nums text-[11px]" style={{ color: accent }}>{progress}%</span>
          </div>
        </div>
        <button onClick={() => { store.reset(); store.selectScenario(null as any); }} className="text-terminal-muted hover:text-white transition-colors cursor-pointer">
          <XIcon size={18} />
        </button>
      </div>

      {/* Chart */}
      <ChartCanvas
        candles={scenario.candles}
        visibleCount={store.visibleCount}
        positions={store.positions}
        closedTrades={store.closedTrades}
        instrument={scenario.instrument}
      />

      {/* Playback Controls */}
      <div className="flex items-center gap-3 rounded-xl border border-terminal-border/30 bg-terminal-card/20 px-4 py-2.5">
        <button onClick={() => store.togglePlayback()} disabled={store.isFinished} className="flex h-9 w-9 items-center justify-center rounded-lg bg-neon-cyan/10 border border-neon-cyan/20 text-neon-cyan hover:bg-neon-cyan/20 disabled:opacity-30 cursor-pointer">
          {store.isPlaying ? <Pause size={16} /> : <Play size={16} />}
        </button>
        <button onClick={() => store.advance()} disabled={store.isFinished} className="flex h-9 w-9 items-center justify-center rounded-lg border border-terminal-border/30 text-terminal-muted hover:text-white disabled:opacity-30 cursor-pointer">
          <SkipForward size={14} />
        </button>
        <div className="flex gap-1">
          {SPEED_OPTIONS.map((s) => (
            <button
              key={s.label}
              onClick={() => store.setSpeed(s.value)}
              className={`rounded-md px-2.5 py-1 font-mono-nums text-[10px] cursor-pointer ${
                store.playbackSpeed === s.value ? 'bg-neon-cyan/15 border border-neon-cyan/30 text-neon-cyan' : 'text-terminal-muted hover:text-white'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <div className="flex-1 h-1.5 rounded-full bg-terminal-border/20 overflow-hidden">
          <div className="h-full rounded-full transition-all duration-300" style={{ width: `${progress}%`, backgroundColor: `${accent}60` }} />
        </div>
        <button onClick={() => store.reset()} className="text-terminal-muted hover:text-white cursor-pointer" title="Reset">
          <RotateCcw size={14} />
        </button>
      </div>

      {/* Trade Panel + Stats */}
      <div className="grid gap-4 md:grid-cols-[1fr_280px]">
        {/* Left — Trade Panel */}
        <div className="space-y-3">
          {/* Buy/Sell + Inputs */}
          <div className="rounded-xl border border-terminal-border/30 bg-terminal-card/20 p-4">
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div>
                <label className="block text-[10px] text-terminal-muted mb-1">Lot Size</label>
                <input type="number" value={lotSize} onChange={(e) => setLotSize(e.target.value)} step="0.01" min="0.01"
                  className="w-full rounded-lg border border-terminal-border bg-terminal-bg px-3 py-2 font-mono-nums text-sm text-white focus:border-neon-cyan/40 focus:outline-none" />
              </div>
              <div>
                <label className="block text-[10px] text-terminal-muted mb-1">SL (pips)</label>
                <input type="number" value={slPips} onChange={(e) => setSlPips(e.target.value)} min="1"
                  className="w-full rounded-lg border border-terminal-border bg-terminal-bg px-3 py-2 font-mono-nums text-sm text-white focus:border-neon-cyan/40 focus:outline-none" />
              </div>
              <div>
                <label className="block text-[10px] text-terminal-muted mb-1">TP (pips)</label>
                <input type="number" value={tpPips} onChange={(e) => setTpPips(e.target.value)} min="1"
                  className="w-full rounded-lg border border-terminal-border bg-terminal-bg px-3 py-2 font-mono-nums text-sm text-white focus:border-neon-cyan/40 focus:outline-none" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => store.openTrade('buy', parseFloat(lotSize) || 0.1, parseInt(slPips) || 25, parseInt(tpPips) || 50)}
                disabled={store.isFinished || store.positions.length >= 3}
                className="rounded-xl bg-neon-green/15 border border-neon-green/30 py-3 text-sm font-bold text-neon-green hover:bg-neon-green/25 disabled:opacity-30 cursor-pointer flex items-center justify-center gap-2"
              >
                <TrendingUp size={16} /> BUY
              </button>
              <button
                onClick={() => store.openTrade('sell', parseFloat(lotSize) || 0.1, parseInt(slPips) || 25, parseInt(tpPips) || 50)}
                disabled={store.isFinished || store.positions.length >= 3}
                className="rounded-xl bg-neon-red/15 border border-neon-red/30 py-3 text-sm font-bold text-neon-red hover:bg-neon-red/25 disabled:opacity-30 cursor-pointer flex items-center justify-center gap-2"
              >
                <TrendingDown size={16} /> SELL
              </button>
            </div>
          </div>

          {/* Open Positions */}
          {store.positions.length > 0 && (
            <div className="rounded-xl border border-terminal-border/30 bg-terminal-card/20 p-4">
              <p className="font-mono-nums text-[9px] uppercase tracking-widest text-terminal-muted mb-2">Open Positions ({store.positions.length})</p>
              <div className="space-y-2">
                {store.positions.map((pos) => {
                  const pnl = calculatePnl(pos, currentPrice, scenario.pipValue, pipMult);
                  return (
                    <div key={pos.id} className="flex items-center justify-between rounded-lg border border-terminal-border/20 bg-terminal-bg/50 px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className={`font-mono-nums text-[11px] font-bold ${pos.direction === 'buy' ? 'text-neon-green' : 'text-neon-red'}`}>
                          {pos.direction.toUpperCase()}
                        </span>
                        <span className="font-mono-nums text-[10px] text-terminal-muted">{pos.lotSize} lots @ {pos.entryPrice.toFixed(decimals)}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`font-mono-nums text-[12px] font-bold ${pnl >= 0 ? 'text-neon-green' : 'text-neon-red'}`}>
                          {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
                        </span>
                        <button onClick={() => store.closeTrade(pos.id)} className="text-terminal-muted hover:text-neon-amber cursor-pointer" title="Close">
                          <XIcon size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Closed Trades (last 5) */}
          {store.closedTrades.length > 0 && (
            <div className="rounded-xl border border-terminal-border/30 bg-terminal-card/20 p-4">
              <p className="font-mono-nums text-[9px] uppercase tracking-widest text-terminal-muted mb-2">Recent Trades</p>
              <div className="space-y-1">
                {store.closedTrades.slice(-5).reverse().map((t) => (
                  <div key={t.id} className="flex items-center justify-between font-mono-nums text-[11px]">
                    <span className={t.direction === 'buy' ? 'text-neon-green' : 'text-neon-red'}>{t.direction.toUpperCase()}</span>
                    <span className="text-terminal-muted">{t.exitReason.toUpperCase()}</span>
                    <span className={t.pnl >= 0 ? 'text-neon-green' : 'text-neon-red'}>{t.pnl >= 0 ? '+' : ''}${t.pnl.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right — Score Board */}
        <div className="rounded-xl border border-terminal-border/30 bg-terminal-card/20 p-4 space-y-3">
          <p className="font-mono-nums text-[9px] uppercase tracking-widest text-terminal-muted">Session Stats</p>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-terminal-bg/50 p-2.5 text-center">
              <p className="font-mono-nums text-lg font-bold text-white">{stats.totalTrades}</p>
              <p className="text-[9px] text-terminal-muted">Trades</p>
            </div>
            <div className="rounded-lg bg-terminal-bg/50 p-2.5 text-center">
              <p className={`font-mono-nums text-lg font-bold ${stats.winRate >= 50 ? 'text-neon-green' : 'text-neon-red'}`}>{stats.winRate}%</p>
              <p className="text-[9px] text-terminal-muted">Win Rate</p>
            </div>
            <div className="rounded-lg bg-terminal-bg/50 p-2.5 text-center">
              <p className={`font-mono-nums text-lg font-bold ${stats.totalPnl >= 0 ? 'text-neon-green' : 'text-neon-red'}`}>
                {stats.totalPnl >= 0 ? '+' : ''}${stats.totalPnl.toFixed(0)}
              </p>
              <p className="text-[9px] text-terminal-muted">Total P&L</p>
            </div>
            <div className="rounded-lg bg-terminal-bg/50 p-2.5 text-center">
              <p className="font-mono-nums text-lg font-bold text-neon-cyan">{stats.avgRR.toFixed(1)}R</p>
              <p className="text-[9px] text-terminal-muted">Avg R:R</p>
            </div>
          </div>

          <div className="space-y-1.5 text-[11px]">
            <div className="flex justify-between"><span className="text-terminal-muted">Wins</span><span className="text-neon-green">{stats.wins}</span></div>
            <div className="flex justify-between"><span className="text-terminal-muted">Losses</span><span className="text-neon-red">{stats.losses}</span></div>
            <div className="flex justify-between"><span className="text-terminal-muted">Best Trade</span><span className="text-neon-green">${stats.bestTrade.toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-terminal-muted">Worst Trade</span><span className="text-neon-red">${stats.worstTrade.toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-terminal-muted">Max DD</span><span className="text-neon-amber">${stats.maxDrawdown.toFixed(2)}</span></div>
          </div>

          {/* Finished state */}
          {store.isFinished && (
            <div className={`rounded-xl p-4 text-center ${stats.totalPnl >= 0 ? 'bg-neon-green/[0.06] border border-neon-green/20' : 'bg-neon-red/[0.06] border border-neon-red/20'}`}>
              <CheckCircle2 size={24} className={stats.totalPnl >= 0 ? 'mx-auto text-neon-green mb-2' : 'mx-auto text-neon-red mb-2'} />
              <p className="text-sm font-bold text-white">{stats.totalPnl >= 0 ? 'Scenario Complete!' : 'Scenario Complete'}</p>
              <p className={`font-mono-nums text-lg font-bold mt-1 ${stats.totalPnl >= 0 ? 'text-neon-green' : 'text-neon-red'}`}>
                {stats.totalPnl >= 0 ? '+' : ''}${stats.totalPnl.toFixed(2)}
              </p>
              <div className="mt-3 flex gap-2">
                <button onClick={() => store.reset()} className="flex-1 rounded-lg border border-terminal-border py-2 text-[12px] text-slate-300 cursor-pointer">Retry</button>
                <Link to="/academy/practice" onClick={() => { store.reset(); store.selectScenario(null as any); }} className="flex-1 rounded-lg bg-neon-cyan/15 border border-neon-cyan/30 py-2 text-[12px] text-neon-cyan text-center">More Scenarios</Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
