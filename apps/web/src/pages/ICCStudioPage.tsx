import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Play, Pause, SkipForward, RotateCcw, ChevronRight, Target, TrendingUp,
  TrendingDown, X as XIcon, Eye, EyeOff, Clock, Loader2, CheckCircle2,
  ArrowUp, ArrowDown, Crosshair, Lock,
} from 'lucide-react';
import { useICCStudioStore, type ICCMark } from '@/stores/iccStudio';
import { ICCChartCanvas } from '@/components/practice/icc/ICCChartCanvas';
import { ICC_SCENARIOS } from '@/data/icc-scenarios';
import { type Timeframe, TF_LABELS } from '@/lib/icc-candle-generator';
import { calculatePnl, getPipMultiplier } from '@/lib/chart-simulator-engine';

const SPEEDS = [
  { label: '1x', value: 500 },
  { label: '2x', value: 250 },
  { label: '5x', value: 100 },
  { label: '10x', value: 50 },
];

const TIMEFRAMES: Timeframe[] = ['4H', '1H', '15M', '5M'];

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: '#00ff9d', intermediate: '#ffb800', advanced: '#ff3d57', expert: '#b18cff',
};

export function ICCStudioPage() {
  const store = useICCStudioStore();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [slPips, setSlPips] = useState('25');
  const [tpPips, setTpPips] = useState('50');
  const [lotSize, setLotSize] = useState('0.10');

  // Playback interval
  useEffect(() => {
    if (store.isPlaying) {
      intervalRef.current = setInterval(() => store.advance(), store.playbackSpeed);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [store.isPlaying, store.playbackSpeed]);

  const stats = store.getStats();
  const currentPrice = store.getCurrentPrice();

  // Scenario selector
  if (!store.scenario) {
    return (
      <div className="page-enter max-w-5xl mx-auto space-y-6 pb-12">
        <div className="animate-fade-in-up">
          <nav className="mb-4 flex items-center gap-2 text-[11px] font-mono-nums text-terminal-muted">
            <Link to="/academy" className="hover:text-neon-cyan">Academy</Link>
            <ChevronRight size={10} />
            <span className="text-neon-cyan">ICC Practice Studio</span>
          </nav>
          <div className="flex items-center gap-3 mb-2">
            <Crosshair size={24} className="text-neon-cyan" />
            <h1 className="text-2xl font-bold text-white font-display">ICC Practice Studio</h1>
          </div>
          <p className="text-sm text-terminal-muted">Master Indication, Correction, Continuation across 4 timeframes. Practice on high-volume assets during optimal sessions.</p>
        </div>

        {/* ICC Method explanation */}
        <div className="animate-fade-in-up rounded-2xl border border-neon-cyan/20 bg-neon-cyan/[0.03] p-5" style={{ animationDelay: '60ms' }}>
          <h3 className="text-sm font-semibold text-white mb-3">The ICC Method</h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-neon-cyan/20 bg-terminal-bg/50 p-3 text-center">
              <p className="font-mono-nums text-lg font-bold text-neon-cyan">1</p>
              <p className="text-[11px] font-semibold text-white">Indication</p>
              <p className="text-[10px] text-terminal-muted mt-0.5">Strong impulse move showing trend direction</p>
            </div>
            <div className="rounded-xl border border-neon-amber/20 bg-terminal-bg/50 p-3 text-center">
              <p className="font-mono-nums text-lg font-bold text-neon-amber">2</p>
              <p className="text-[11px] font-semibold text-white">Correction</p>
              <p className="text-[10px] text-terminal-muted mt-0.5">Pullback/retracement against the impulse</p>
            </div>
            <div className="rounded-xl border border-neon-green/20 bg-terminal-bg/50 p-3 text-center">
              <p className="font-mono-nums text-lg font-bold text-neon-green">3</p>
              <p className="text-[11px] font-semibold text-white">Continuation</p>
              <p className="text-[10px] text-terminal-muted mt-0.5">Price resumes trend — your entry point</p>
            </div>
          </div>
        </div>

        {/* Scenarios */}
        <div className="grid gap-4 md:grid-cols-2">
          {ICC_SCENARIOS.map((s, i) => {
            const dc = DIFFICULTY_COLORS[s.difficulty] || '#00e5ff';
            return (
              <button key={s.id} onClick={() => store.selectScenario(s)}
                className="animate-fade-in-up text-left rounded-2xl border border-terminal-border/40 bg-terminal-card/20 overflow-hidden hover:border-terminal-border-hover transition-all cursor-pointer group"
                style={{ animationDelay: `${i * 60}ms` }}>
                <div className="h-[3px] w-full" style={{ background: `linear-gradient(90deg, ${dc}60, ${dc}20, transparent)` }} />
                <div className="p-5">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono-nums text-[11px] font-bold text-white">{s.instrument}</span>
                      <span className="rounded-full border px-2 py-0.5 font-mono-nums text-[9px]" style={{ borderColor: `${dc}30`, color: dc }}>{s.difficulty}</span>
                    </div>
                    <div className="flex items-center gap-1 font-mono-nums text-[9px] text-terminal-muted">
                      <Clock size={10} /> {s.session}
                    </div>
                  </div>
                  <h3 className="font-display text-base font-semibold text-white group-hover:text-neon-cyan transition-colors">{s.name}</h3>
                  <p className="mt-1 text-[11px] text-terminal-muted">{s.description}</p>
                  <p className="mt-2 text-[10px] text-slate-500 italic">{s.sessionHours}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Active studio
  const scenario = store.scenario;
  const pipMult = getPipMultiplier(scenario.instrument);
  const isJPY = scenario.instrument.includes('JPY');
  const isGold = scenario.instrument.toUpperCase().includes('XAU');
  const isIndex = scenario.instrument.includes('NAS') || scenario.instrument.includes('US30');
  const decimals = isIndex ? 1 : isGold ? 2 : isJPY ? 3 : 5;
  const progress = Math.round((store.tickCount / store.candles['5M'].length) * 100);

  const handleMarkRange = (tf: Timeframe, start: number, end: number) => {
    if (!store.markingMode) return;
    store.addMark({ type: store.markingMode, timeframe: tf, startIndex: start, endIndex: end });
  };

  return (
    <div className="page-enter space-y-3 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <nav className="mb-1 flex items-center gap-2 text-[11px] font-mono-nums text-terminal-muted">
            <Link to="/academy" className="hover:text-neon-cyan">Academy</Link>
            <ChevronRight size={10} />
            <Link to="/academy/icc-studio" onClick={() => { store.reset(); store.selectScenario(undefined!); }} className="hover:text-neon-cyan">ICC Studio</Link>
            <ChevronRight size={10} />
            <span className="text-neon-cyan">{scenario.name}</span>
          </nav>
          <div className="flex items-center gap-2">
            <h2 className="font-display text-lg font-bold text-white">{scenario.instrument}</h2>
            <span className="font-mono-nums text-[11px] text-terminal-muted">{scenario.session}</span>
            <span className="font-mono-nums text-[11px] text-neon-cyan">{progress}%</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => store.toggleGhost()} className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-all cursor-pointer ${store.showGhost ? 'border-neon-purple/40 bg-neon-purple/15 text-neon-purple' : 'border-terminal-border/30 text-terminal-muted'}`} title="Ghost mode">
            {store.showGhost ? <Eye size={14} /> : <EyeOff size={14} />}
          </button>
          <button onClick={() => { store.reset(); store.selectScenario(undefined!); }} className="text-terminal-muted hover:text-white cursor-pointer"><XIcon size={18} /></button>
        </div>
      </div>

      {/* Session briefing */}
      <div className="rounded-lg border border-terminal-border/20 bg-terminal-card/20 px-4 py-2 flex items-center gap-3">
        <Clock size={12} className="text-neon-amber shrink-0" />
        <p className="text-[11px] text-slate-400">{scenario.assetGuidance}</p>
      </div>

      {/* Timeframe tabs */}
      <div className="flex gap-1">
        {TIMEFRAMES.map(tf => (
          <button key={tf} onClick={() => store.setActiveTimeframe(tf)}
            className={`flex-1 rounded-lg py-2 font-mono-nums text-[11px] font-semibold transition-all cursor-pointer ${
              store.activeTimeframe === tf
                ? 'bg-terminal-card/50 border border-neon-cyan/30 text-neon-cyan'
                : 'border border-terminal-border/20 text-terminal-muted hover:text-white'
            }`}>
            {tf}
          </button>
        ))}
      </div>

      {/* Chart */}
      <ICCChartCanvas
        candles={store.candles[store.activeTimeframe]}
        visibleCount={store.getVisibleCount(store.activeTimeframe)}
        positions={store.positions}
        closedTrades={store.closedTrades}
        instrument={scenario.instrument}
        timeframe={store.activeTimeframe}
        marks={store.marks}
        markingMode={store.markingMode}
        onMarkRange={handleMarkRange}
        showGhost={store.showGhost}
        ghostRanges={store.showGhost ? {
          indication: scenario.answer.indicationRange,
          correction: scenario.answer.correctionRange,
        } : undefined}
      />

      {/* ICC Marking Toolbar */}
      <div className="flex items-center gap-2 rounded-xl border border-terminal-border/30 bg-terminal-card/20 px-3 py-2">
        <span className="font-mono-nums text-[9px] uppercase tracking-wider text-terminal-muted mr-1">Mark:</span>

        {/* Bias selector */}
        <button onClick={() => store.setBias('bullish')}
          className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[10px] font-semibold cursor-pointer transition-all ${store.biasSelection === 'bullish' ? 'bg-neon-green/15 border border-neon-green/30 text-neon-green' : 'border border-terminal-border/30 text-terminal-muted hover:text-white'}`}>
          <ArrowUp size={10} /> Bullish
        </button>
        <button onClick={() => store.setBias('bearish')}
          className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[10px] font-semibold cursor-pointer transition-all ${store.biasSelection === 'bearish' ? 'bg-neon-red/15 border border-neon-red/30 text-neon-red' : 'border border-terminal-border/30 text-terminal-muted hover:text-white'}`}>
          <ArrowDown size={10} /> Bearish
        </button>

        <div className="h-5 w-px bg-terminal-border/30 mx-1" />

        {/* ICC phase markers */}
        {(['indication', 'correction', 'continuation'] as const).map(mode => {
          const active = store.markingMode === mode;
          const hasMarked = store.marks.some(m => m.type === mode);
          const colors = { indication: '#00e5ff', correction: '#ffb800', continuation: '#00ff9d' };
          const labels = { indication: 'Indication', correction: 'Correction', continuation: 'Continuation' };
          return (
            <button key={mode} onClick={() => store.setMarkingMode(active ? null : mode)}
              className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[10px] font-semibold cursor-pointer transition-all ${
                active ? `border shadow-[0_0_12px_var(--glow)]` : hasMarked ? 'border opacity-60' : 'border border-terminal-border/30 text-terminal-muted hover:text-white'
              }`}
              style={active || hasMarked ? { borderColor: `${colors[mode]}40`, backgroundColor: `${colors[mode]}12`, color: colors[mode], '--glow': `${colors[mode]}20` } as React.CSSProperties : undefined}>
              {hasMarked && <CheckCircle2 size={10} />}
              {labels[mode]}
            </button>
          );
        })}

        <button onClick={() => store.clearMarks()} className="text-[10px] text-terminal-muted hover:text-neon-red cursor-pointer ml-auto">Clear</button>
      </div>

      {/* Playback Controls */}
      <div className="flex items-center gap-3 rounded-xl border border-terminal-border/30 bg-terminal-card/20 px-3 py-2">
        <button onClick={() => store.togglePlayback()} disabled={store.isFinished} className="flex h-8 w-8 items-center justify-center rounded-lg bg-neon-cyan/10 border border-neon-cyan/20 text-neon-cyan disabled:opacity-30 cursor-pointer">
          {store.isPlaying ? <Pause size={14} /> : <Play size={14} />}
        </button>
        <button onClick={() => store.advance()} disabled={store.isFinished} className="flex h-8 w-8 items-center justify-center rounded-lg border border-terminal-border/30 text-terminal-muted disabled:opacity-30 cursor-pointer">
          <SkipForward size={12} />
        </button>
        <div className="flex gap-1">
          {SPEEDS.map(s => (
            <button key={s.label} onClick={() => store.setSpeed(s.value)}
              className={`rounded-md px-2 py-1 font-mono-nums text-[9px] cursor-pointer ${store.playbackSpeed === s.value ? 'bg-neon-cyan/15 border border-neon-cyan/30 text-neon-cyan' : 'text-terminal-muted hover:text-white'}`}>
              {s.label}
            </button>
          ))}
        </div>
        <div className="flex-1 h-1.5 rounded-full bg-terminal-border/20 overflow-hidden">
          <div className="h-full rounded-full bg-neon-cyan/50 transition-all duration-200" style={{ width: `${progress}%` }} />
        </div>
        <button onClick={() => store.reset()} className="text-terminal-muted hover:text-white cursor-pointer"><RotateCcw size={12} /></button>
      </div>

      {/* Trade Panel + Stats */}
      <div className="grid gap-3 md:grid-cols-[1fr_240px]">
        {/* Trade panel */}
        <div className="rounded-xl border border-terminal-border/30 bg-terminal-card/20 p-4 space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-[9px] text-terminal-muted mb-1">Lots</label>
              <input type="number" value={lotSize} onChange={e => setLotSize(e.target.value)} step="0.01"
                className="w-full rounded-lg border border-terminal-border bg-terminal-bg px-2 py-1.5 font-mono-nums text-sm text-white focus:border-neon-cyan/40 focus:outline-none" />
            </div>
            <div>
              <label className="block text-[9px] text-terminal-muted mb-1">SL (pips)</label>
              <input type="number" value={slPips} onChange={e => setSlPips(e.target.value)}
                className="w-full rounded-lg border border-terminal-border bg-terminal-bg px-2 py-1.5 font-mono-nums text-sm text-white focus:outline-none" />
            </div>
            <div>
              <label className="block text-[9px] text-terminal-muted mb-1">TP (pips)</label>
              <input type="number" value={tpPips} onChange={e => setTpPips(e.target.value)}
                className="w-full rounded-lg border border-terminal-border bg-terminal-bg px-2 py-1.5 font-mono-nums text-sm text-white focus:outline-none" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => store.openTrade('buy', parseFloat(lotSize) || 0.1, parseInt(slPips) || 25, parseInt(tpPips) || 50)}
              disabled={store.isFinished || store.positions.length >= 3}
              className="rounded-xl bg-neon-green/15 border border-neon-green/30 py-2.5 text-sm font-bold text-neon-green disabled:opacity-30 cursor-pointer flex items-center justify-center gap-1.5">
              <TrendingUp size={14} /> BUY
            </button>
            <button onClick={() => store.openTrade('sell', parseFloat(lotSize) || 0.1, parseInt(slPips) || 25, parseInt(tpPips) || 50)}
              disabled={store.isFinished || store.positions.length >= 3}
              className="rounded-xl bg-neon-red/15 border border-neon-red/30 py-2.5 text-sm font-bold text-neon-red disabled:opacity-30 cursor-pointer flex items-center justify-center gap-1.5">
              <TrendingDown size={14} /> SELL
            </button>
          </div>

          {/* Open positions */}
          {store.positions.map(pos => {
            const pnl = calculatePnl(pos, currentPrice, scenario.pipValue, pipMult);
            return (
              <div key={pos.id} className="flex items-center justify-between rounded-lg border border-terminal-border/20 bg-terminal-bg/50 px-3 py-2">
                <span className={`font-mono-nums text-[11px] font-bold ${pos.direction === 'buy' ? 'text-neon-green' : 'text-neon-red'}`}>{pos.direction.toUpperCase()} {pos.lotSize}</span>
                <span className={`font-mono-nums text-[12px] font-bold ${pnl >= 0 ? 'text-neon-green' : 'text-neon-red'}`}>{pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}</span>
                <button onClick={() => store.closeTrade(pos.id)} className="text-terminal-muted hover:text-neon-amber cursor-pointer"><XIcon size={12} /></button>
              </div>
            );
          })}
        </div>

        {/* Stats */}
        <div className="rounded-xl border border-terminal-border/30 bg-terminal-card/20 p-3 space-y-2">
          <p className="font-mono-nums text-[9px] uppercase tracking-widest text-terminal-muted">Session Stats</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Trades', value: String(stats.totalTrades), color: 'text-white' },
              { label: 'Win Rate', value: `${stats.winRate}%`, color: stats.winRate >= 50 ? 'text-neon-green' : 'text-neon-red' },
              { label: 'P&L', value: `${stats.totalPnl >= 0 ? '+' : ''}$${stats.totalPnl}`, color: stats.totalPnl >= 0 ? 'text-neon-green' : 'text-neon-red' },
              { label: 'Avg R:R', value: `${stats.avgRR}R`, color: 'text-neon-cyan' },
            ].map(s => (
              <div key={s.label} className="rounded-lg bg-terminal-bg/50 p-2 text-center">
                <p className={`font-mono-nums text-sm font-bold ${s.color}`}>{s.value}</p>
                <p className="text-[8px] text-terminal-muted">{s.label}</p>
              </div>
            ))}
          </div>

          {/* ICC marks summary */}
          <div className="space-y-1 pt-1">
            <p className="font-mono-nums text-[9px] uppercase tracking-widest text-terminal-muted">ICC Marks</p>
            <div className="flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${store.biasSelection ? 'bg-neon-cyan' : 'bg-terminal-border/40'}`} />
              <span className="text-[10px] text-terminal-muted">Bias: {store.biasSelection || '—'}</span>
            </div>
            {['indication', 'correction', 'continuation'].map(type => {
              const mark = store.marks.find(m => m.type === type);
              const colors: Record<string, string> = { indication: '#00e5ff', correction: '#ffb800', continuation: '#00ff9d' };
              return (
                <div key={type} className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: mark ? colors[type] : '#151d2880' }} />
                  <span className="text-[10px] text-terminal-muted capitalize">{type}: {mark ? `${mark.timeframe} [${mark.startIndex}-${mark.endIndex}]` : '—'}</span>
                </div>
              );
            })}
          </div>

          {store.isFinished && (
            <div className="mt-2 rounded-lg border border-neon-cyan/20 bg-neon-cyan/[0.04] p-3 text-center">
              <p className="text-sm font-bold text-white">Session Complete</p>
              <div className="mt-2 flex gap-2">
                <button onClick={() => store.reset()} className="flex-1 rounded-lg border border-terminal-border py-1.5 text-[11px] text-slate-300 cursor-pointer">Retry</button>
                <button onClick={() => { store.reset(); store.selectScenario(undefined!); }} className="flex-1 rounded-lg bg-neon-cyan/15 border border-neon-cyan/30 py-1.5 text-[11px] text-neon-cyan cursor-pointer">More</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
