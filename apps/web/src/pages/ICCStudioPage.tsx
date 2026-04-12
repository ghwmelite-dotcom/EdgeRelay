import { useEffect, useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Play, Pause, SkipForward, RotateCcw, ChevronRight, TrendingUp,
  TrendingDown, X as XIcon, Eye, EyeOff, Clock, CheckCircle2,
  ArrowUp, ArrowDown, Crosshair, Sparkles, Flame, ScanSearch,
  Volume2, VolumeX, Keyboard, Bookmark,
} from 'lucide-react';
import { useICCStudioStore, type ICCMark } from '@/stores/iccStudio';
import { ICCTimeframeGrid } from '@/components/practice/icc/ICCTimeframeGrid';
import { ICCScorePanel } from '@/components/practice/icc/ICCScorePanel';
import { ICCGuidedTutorial } from '@/components/practice/icc/ICCGuidedTutorial';
import { ICCAICoach } from '@/components/practice/icc/ICCAICoach';
import { ICCTimePressure, TimePressureSelector } from '@/components/practice/icc/ICCTimePressure';
import { ICCStreakChallenge, addStreakEntry } from '@/components/practice/icc/ICCStreakChallenge';
import { ICCDrawingToolbar, type DrawingObject, type DrawingType } from '@/components/practice/icc/ICCDrawingTools';
import { ICCPatternScanner } from '@/components/practice/icc/ICCPatternScanner';
import { ICCKeyboardHelp } from '@/components/practice/icc/ICCKeyboardHelp';
import { ICCBookmarkList, type BookmarkEntry } from '@/components/practice/icc/ICCBookmarks';
import { ICCRecommendations } from '@/components/practice/icc/ICCRecommendations';
import { ICCSessionSummary } from '@/components/practice/icc/ICCSessionSummary';
import { useICCKeyboardShortcuts } from '@/hooks/useICCKeyboardShortcuts';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { playTick, playTradeOpen, playTradeClose, playSuccess, playFail, playBookmark, isMuted, toggleMute } from '@/lib/icc-sounds';
import { ICC_SCENARIOS } from '@/data/icc-scenarios';
import { scoreICCAttempt } from '@/lib/icc-scoring-engine';
import { Layout, Columns2, Square } from 'lucide-react';
import { type Timeframe } from '@/lib/icc-candle-generator';
import { calculatePnl, getPipMultiplier } from '@/lib/chart-simulator-engine';

const SPEEDS = [
  { label: '1x', value: 500 },
  { label: '2x', value: 250 },
  { label: '5x', value: 100 },
  { label: '10x', value: 50 },
];

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: '#00ff9d', intermediate: '#ffb800', advanced: '#ff3d57', expert: '#b18cff',
};

export function ICCStudioPage() {
  const store = useICCStudioStore();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [slPips, setSlPips] = useState('25');
  const [tpPips, setTpPips] = useState('50');
  const [lotSize, setLotSize] = useState('0.10');
  const [showTutorial, setShowTutorial] = useState(() => {
    try { return localStorage.getItem('icc-tutorial-done') !== '1'; }
    catch { return true; }
  });
  const [timePressureEnabled, setTimePressureEnabled] = useState(false);
  const [timePressureDuration, setTimePressureDuration] = useState(300);
  const [showStreak, setShowStreak] = useState(false);
  const [drawings, setDrawings] = useState<DrawingObject[]>([]);
  const [activeDrawingTool, setActiveDrawingTool] = useState<DrawingType | null>(null);
  const [patternScannerEnabled, setPatternScannerEnabled] = useState(false);
  const [streakRecorded, setStreakRecorded] = useState(false);
  // Enhancement 1: Keyboard shortcuts
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  // Enhancement 2: Sound effects
  const [soundMuted, setSoundMuted] = useState(() => isMuted());
  // Enhancement 3: Bookmarks
  const [bookmarks, setBookmarks] = useState<BookmarkEntry[]>([]);
  // Enhancement 4: Mobile
  const isMobile = useMediaQuery('(max-width: 767px)');

  const handleTutorialComplete = () => {
    setShowTutorial(false);
    try { localStorage.setItem('icc-tutorial-done', '1'); } catch {}
  };

  const handleToggleMute = () => { const m = toggleMute(); setSoundMuted(m); };

  const addBookmark = useCallback(() => {
    if (!store.scenario || store.isFinished) return;
    playBookmark();
    setBookmarks(prev => [...prev, {
      id: crypto.randomUUID(),
      candleIndex: store.tickCount,
      label: '',
      timestamp: Date.now(),
    }]);
  }, [store.tickCount, store.scenario, store.isFinished]);

  // Enhancement 1: Keyboard shortcuts hook
  useICCKeyboardShortcuts({
    active: !!store.scenario,
    togglePlayback: store.togglePlayback,
    advance: () => { store.advance(); playTick(); },
    openTrade: (dir, lots, sl, tp) => { store.openTrade(dir, lots, sl, tp); playTradeOpen(); },
    setBias: store.setBias,
    setMarkingMode: store.setMarkingMode,
    markingMode: store.markingMode,
    toggleGhost: store.toggleGhost,
    reset: () => { store.reset(); setStreakRecorded(false); setDrawings([]); setBookmarks([]); },
    isFinished: store.isFinished,
    lotSize, slPips, tpPips,
    activeDrawingTool,
    setActiveDrawingTool,
    setShowKeyboardHelp,
    onBookmark: addBookmark,
    onSoundTick: playTick,
  });

  // Playback interval
  useEffect(() => {
    if (store.isPlaying) {
      intervalRef.current = setInterval(() => store.advance(), store.playbackSpeed);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [store.isPlaying, store.playbackSpeed]);

  // Record streak + play sound when session finishes
  useEffect(() => {
    if (store.isFinished && store.scenario && !streakRecorded) {
      const s = store.getStats();
      const score = scoreICCAttempt(store.marks, store.biasSelection, store.scenario.answer, s.totalTrades, s.totalPnl);
      addStreakEntry(store.scenario.id, store.scenario.name, score);
      setStreakRecorded(true);
      if (score.percentage >= 55) playSuccess(); else playFail();
    }
  }, [store.isFinished]);

  const handleTimeUp = () => {
    if (!store.isFinished) store.togglePlayback();
  };

  const stats = store.getStats();
  const currentPrice = store.getCurrentPrice();

  // Tutorial mode — show for first-time users
  if (showTutorial && !store.scenario) {
    return (
      <div className="page-enter max-w-5xl mx-auto space-y-6 pb-12">
        <div className="animate-fade-in-up">
          <nav className="mb-4 flex items-center gap-2 text-[11px] font-mono-nums text-terminal-muted">
            <Link to="/academy" className="hover:text-neon-cyan">Academy</Link>
            <ChevronRight size={10} />
            <span className="text-neon-cyan">ICC Practice Studio</span>
          </nav>
        </div>
        <ICCGuidedTutorial onComplete={handleTutorialComplete} onSkip={handleTutorialComplete} />
      </div>
    );
  }

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

        {/* Mode selector */}
        <div className="animate-fade-in-up flex gap-2 flex-wrap" style={{ animationDelay: '40ms' }}>
          <button onClick={() => setShowTutorial(true)}
            className="flex items-center gap-2 rounded-xl border border-neon-amber/25 bg-neon-amber/[0.06] px-4 py-2.5 text-[12px] font-semibold text-neon-amber hover:bg-neon-amber/10 transition-all cursor-pointer">
            <Sparkles size={14} /> Replay Tutorial
          </button>
          <button onClick={() => setShowStreak(!showStreak)}
            className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-[12px] font-semibold transition-all cursor-pointer ${
              showStreak
                ? 'border-neon-amber/40 bg-neon-amber/15 text-neon-amber'
                : 'border-neon-amber/25 bg-neon-amber/[0.06] text-neon-amber hover:bg-neon-amber/10'
            }`}>
            <Flame size={14} /> Streak Challenge
          </button>
        </div>

        {/* Streak Challenge Panel */}
        {showStreak && <ICCStreakChallenge onClose={() => setShowStreak(false)} />}

        {/* Smart Recommendations */}
        <ICCRecommendations onSelectScenario={(s) => store.selectScenario(s)} />

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
        <div className="flex items-center gap-1.5">
          <button onClick={handleToggleMute} className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-all cursor-pointer ${soundMuted ? 'border-terminal-border/30 text-terminal-muted' : 'border-neon-green/30 bg-neon-green/10 text-neon-green'}`} title={soundMuted ? 'Unmute sounds' : 'Mute sounds'}>
            {soundMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
          </button>
          <button onClick={() => setShowKeyboardHelp(true)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-terminal-border/30 text-terminal-muted hover:text-white transition-all cursor-pointer" title="Keyboard shortcuts (?)">
            <Keyboard size={14} />
          </button>
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

      {/* Enhancement controls row */}
      <div className="flex items-center gap-2 flex-wrap">
        <TimePressureSelector
          value={timePressureDuration}
          onChange={setTimePressureDuration}
          enabled={timePressureEnabled}
          onToggle={() => setTimePressureEnabled(!timePressureEnabled)}
        />
        <div className="h-5 w-px bg-terminal-border/20" />
        <button
          onClick={() => setPatternScannerEnabled(!patternScannerEnabled)}
          className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[10px] font-semibold cursor-pointer transition-all ${
            patternScannerEnabled
              ? 'bg-neon-cyan/15 border border-neon-cyan/30 text-neon-cyan'
              : 'border border-terminal-border/20 text-terminal-muted hover:text-white'
          }`}
        >
          <ScanSearch size={12} /> Scanner
        </button>
      </div>

      {/* Time Pressure Timer */}
      <ICCTimePressure
        enabled={timePressureEnabled}
        duration={timePressureDuration}
        isFinished={store.isFinished}
        onTimeUp={handleTimeUp}
      />

      {/* View mode selector + Drawing tools */}
      <div className="flex items-center gap-2 flex-wrap">
        {!isMobile && (
          <>
            <div className="flex gap-1">
              {([
                { mode: 'single' as const, icon: Square, label: 'Single' },
                { mode: 'dual' as const, icon: Columns2, label: 'Dual' },
                { mode: 'quad' as const, icon: Layout, label: 'Quad' },
              ]).map(v => (
                <button key={v.mode} onClick={() => store.setViewMode(v.mode)}
                  className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[10px] font-semibold cursor-pointer transition-all ${
                    store.viewMode === v.mode
                      ? 'bg-neon-cyan/15 border border-neon-cyan/30 text-neon-cyan'
                      : 'border border-terminal-border/20 text-terminal-muted hover:text-white'
                  }`}>
                  <v.icon size={12} /> {v.label}
                </button>
              ))}
            </div>
            <div className="h-5 w-px bg-terminal-border/20" />
          </>
        )}
        <div className="relative">
          <ICCDrawingToolbar
            activeDrawing={activeDrawingTool}
            onSelectTool={setActiveDrawingTool}
            drawings={drawings}
            onClearDrawings={() => setDrawings([])}
            onDeleteDrawing={(id) => setDrawings(d => d.filter(x => x.id !== id))}
          />
        </div>
        <span className="font-mono-nums text-[9px] text-terminal-muted ml-auto hidden md:inline">
          4H: Bias → 1H: Indication → 15M: Correction → 5M: Entry
        </span>
      </div>

      {/* Multi-Timeframe Chart Grid */}
      <ICCTimeframeGrid
        candles={store.candles}
        visibleCounts={{
          '4H': store.getVisibleCount('4H'),
          '1H': store.getVisibleCount('1H'),
          '15M': store.getVisibleCount('15M'),
          '5M': store.getVisibleCount('5M'),
        }}
        positions={store.positions}
        closedTrades={store.closedTrades}
        instrument={scenario.instrument}
        marks={store.marks}
        markingMode={store.markingMode}
        onMarkRange={handleMarkRange}
        showGhost={store.showGhost}
        ghostRanges={store.showGhost ? {
          indication: scenario.answer.indicationRange,
          correction: scenario.answer.correctionRange,
        } : undefined}
        viewMode={isMobile ? 'single' : store.viewMode}
        activeTimeframe={store.activeTimeframe}
        onSelectTimeframe={(tf) => store.setActiveTimeframe(tf)}
        drawings={drawings}
        activeDrawingTool={activeDrawingTool}
        onCreateDrawing={(drawing) => setDrawings(d => [...d, drawing])}
      />

      {/* ICC Marking Toolbar */}
      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap rounded-xl border border-terminal-border/30 bg-terminal-card/20 px-2 sm:px-3 py-2">
        <span className="font-mono-nums text-[9px] uppercase tracking-wider text-terminal-muted mr-1 hidden sm:inline">Mark:</span>

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
      <div className="flex items-center gap-2 sm:gap-3 rounded-xl border border-terminal-border/30 bg-terminal-card/20 px-2 sm:px-3 py-2">
        <button onClick={() => store.togglePlayback()} disabled={store.isFinished} className="flex h-8 w-8 items-center justify-center rounded-lg bg-neon-cyan/10 border border-neon-cyan/20 text-neon-cyan disabled:opacity-30 cursor-pointer">
          {store.isPlaying ? <Pause size={14} /> : <Play size={14} />}
        </button>
        <button onClick={() => { store.advance(); playTick(); }} disabled={store.isFinished} className="flex h-8 w-8 items-center justify-center rounded-lg border border-terminal-border/30 text-terminal-muted disabled:opacity-30 cursor-pointer">
          <SkipForward size={12} />
        </button>
        <div className="flex gap-1">
          {SPEEDS.map((s, i) => (
            <button key={s.label} onClick={() => store.setSpeed(s.value)}
              className={`rounded-md px-2 py-1 font-mono-nums text-[9px] cursor-pointer ${i === 1 || i === 3 ? 'hidden sm:block' : ''} ${store.playbackSpeed === s.value ? 'bg-neon-cyan/15 border border-neon-cyan/30 text-neon-cyan' : 'text-terminal-muted hover:text-white'}`}>
              {s.label}
            </button>
          ))}
        </div>
        {/* Bookmark button */}
        <button onClick={addBookmark} disabled={store.isFinished} className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-terminal-border/30 text-terminal-muted hover:text-neon-cyan disabled:opacity-30 cursor-pointer" title="Add bookmark (M)">
          <Bookmark size={12} />
          {bookmarks.length > 0 && (
            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-neon-cyan text-[7px] font-bold text-black">{bookmarks.length}</span>
          )}
        </button>
        <div className="flex-1 h-1.5 rounded-full bg-terminal-border/20 overflow-hidden">
          <div className="h-full rounded-full bg-neon-cyan/50 transition-all duration-200" style={{ width: `${progress}%` }} />
        </div>
        <button onClick={() => { store.reset(); setBookmarks([]); }} className="text-terminal-muted hover:text-white cursor-pointer"><RotateCcw size={12} /></button>
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
            <button onClick={() => { store.openTrade('buy', parseFloat(lotSize) || 0.1, parseInt(slPips) || 25, parseInt(tpPips) || 50); playTradeOpen(); }}
              disabled={store.isFinished || store.positions.length >= 3}
              className="rounded-xl bg-neon-green/15 border border-neon-green/30 py-2.5 text-sm font-bold text-neon-green disabled:opacity-30 cursor-pointer flex items-center justify-center gap-1.5">
              <TrendingUp size={14} /> BUY
            </button>
            <button onClick={() => { store.openTrade('sell', parseFloat(lotSize) || 0.1, parseInt(slPips) || 25, parseInt(tpPips) || 50); playTradeOpen(); }}
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
                <button onClick={() => { store.closeTrade(pos.id); playTradeClose(); }} className="text-terminal-muted hover:text-neon-amber cursor-pointer"><XIcon size={12} /></button>
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
            <div className="mt-2 text-center">
              <p className="text-[10px] text-terminal-muted mb-2">Session complete — see score below</p>
            </div>
          )}
        </div>
      </div>

      {/* Pattern Scanner */}
      <ICCPatternScanner
        candles={store.candles}
        visibleCounts={{
          '4H': store.getVisibleCount('4H'),
          '1H': store.getVisibleCount('1H'),
          '15M': store.getVisibleCount('15M'),
          '5M': store.getVisibleCount('5M'),
        }}
        enabled={patternScannerEnabled}
        onToggle={() => setPatternScannerEnabled(!patternScannerEnabled)}
      />

      {/* Bookmarks */}
      <ICCBookmarkList
        bookmarks={bookmarks}
        onRemove={(id) => setBookmarks(b => b.filter(x => x.id !== id))}
        onClear={() => setBookmarks([])}
        isFinished={store.isFinished}
        totalCandles={store.candles['5M'].length}
        answerContinuation={store.isFinished ? scenario.answer.continuationCandle : undefined}
      />

      {/* ICC Score Panel — appears when session finishes or user wants to check */}
      {store.isFinished && (
        <>
          <ICCScorePanel
            marks={store.marks}
            biasSelection={store.biasSelection}
            answer={scenario.answer}
            tradesTaken={stats.totalTrades}
            totalPnl={stats.totalPnl}
            onRetry={() => { store.reset(); setStreakRecorded(false); setDrawings([]); setBookmarks([]); }}
            onNextScenario={() => { store.reset(); store.selectScenario(undefined!); setStreakRecorded(false); setDrawings([]); setBookmarks([]); }}
          />

          {/* Session Summary Card */}
          <ICCSessionSummary
            scenario={scenario}
            score={scoreICCAttempt(store.marks, store.biasSelection, scenario.answer, stats.totalTrades, stats.totalPnl)}
            stats={stats}
          />

          <ICCAICoach
            scenario={scenario}
            marks={store.marks}
            biasSelection={store.biasSelection}
            score={scoreICCAttempt(store.marks, store.biasSelection, scenario.answer, stats.totalTrades, stats.totalPnl)}
            totalPnl={stats.totalPnl}
            tradesTaken={stats.totalTrades}
          />

          {/* Post-session recommendations */}
          <ICCRecommendations onSelectScenario={(s) => { store.reset(); store.selectScenario(s); setStreakRecorded(false); setDrawings([]); setBookmarks([]); }} />
        </>
      )}

      {/* Keyboard Help Overlay */}
      <ICCKeyboardHelp open={showKeyboardHelp} onClose={() => setShowKeyboardHelp(false)} />
    </div>
  );
}
