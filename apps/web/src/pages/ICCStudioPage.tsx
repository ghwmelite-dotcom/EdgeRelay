import { useEffect, useRef, useState, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Play, Pause, SkipForward, RotateCcw, ChevronRight, TrendingUp,
  TrendingDown, X as XIcon, Eye, EyeOff, Clock, CheckCircle2,
  ArrowUp, ArrowDown, Crosshair, Sparkles, Flame, ScanSearch, ArrowLeft,
  Volume2, VolumeX, Keyboard, Bookmark, Zap, BookOpen, Lock, GraduationCap, Shield,
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
import { ICCFlashDrills } from '@/components/practice/icc/ICCFlashDrills';
import { ICCPatternLibrary } from '@/components/practice/icc/ICCPatternLibrary';
import { ICCLessonLibrary } from '@/components/practice/icc/ICCLessonLibrary';
import { ICCRulesCards } from '@/components/practice/icc/ICCRulesCards';
import { ICCComparisonView } from '@/components/practice/icc/ICCComparisonView';
import { ICCMistakeReplay } from '@/components/practice/icc/ICCMistakeReplay';
import { ICCGuidedWalkthrough } from '@/components/practice/icc/ICCGuidedWalkthrough';
import { ICCCommentary } from '@/components/practice/icc/ICCCommentary';
import { getGatingInfo } from '@/lib/icc-gating';
import { useICCKeyboardShortcuts } from '@/hooks/useICCKeyboardShortcuts';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { playTick, playTradeOpen, playTradeClose, playSuccess, playFail, playBookmark, isMuted, toggleMute } from '@/lib/icc-sounds';
import { ICC_SCENARIOS } from '@/data/icc-scenarios';
import { scoreICCAttempt } from '@/lib/icc-scoring-engine';
import { Layout, Columns2, Square, Compass } from 'lucide-react';
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
  // Asset deep-link (e.g., ?asset=XAUUSD from the Bias Engine) — filters
  // the scenario picker to instruments matching the query. Keeps the two
  // tools feeling like one product.
  const [searchParams, setSearchParams] = useSearchParams();
  const assetFilter = (searchParams.get('asset') || '').toUpperCase() || null;
  const clearAssetFilter = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('asset');
    setSearchParams(next);
  };
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
  // Mastery features
  const [showFlashDrills, setShowFlashDrills] = useState(false);
  const [showPatternLibrary, setShowPatternLibrary] = useState(false);
  const [showLessons, setShowLessons] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [guidedMode, setGuidedMode] = useState(false);
  const [commentaryEnabled, setCommentaryEnabled] = useState(true);

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

          {/* Cross-link into the live Bias Engine — turns training into a
              closed loop: practice the pattern, then read it live. */}
          <Link
            to={assetFilter ? `/bias/${assetFilter.toLowerCase()}` : '/bias'}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-neon-cyan/25 bg-neon-cyan/[0.05] px-3 py-1.5 text-[11px] font-semibold text-neon-cyan hover:bg-neon-cyan/15 transition-colors"
          >
            <Compass size={12} />
            See live 4H + 1H bias
            {assetFilter ? ` on ${assetFilter}` : ' on 5 assets'}
            <ChevronRight size={11} />
          </Link>
        </div>

        {/* Mode selector */}
        <div className="animate-fade-in-up flex gap-2 flex-wrap" style={{ animationDelay: '40ms' }}>
          <button onClick={() => setShowTutorial(true)}
            className="flex items-center gap-2 rounded-xl border border-neon-amber/25 bg-neon-amber/[0.06] px-3 py-2 text-[11px] font-semibold text-neon-amber hover:bg-neon-amber/10 transition-all cursor-pointer">
            <Sparkles size={13} /> Tutorial
          </button>
          <button onClick={() => { setShowFlashDrills(!showFlashDrills); setShowPatternLibrary(false); setShowLessons(false); setShowRules(false); }}
            className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-[11px] font-semibold transition-all cursor-pointer ${
              showFlashDrills ? 'border-neon-cyan/40 bg-neon-cyan/15 text-neon-cyan' : 'border-neon-cyan/25 bg-neon-cyan/[0.06] text-neon-cyan hover:bg-neon-cyan/10'
            }`}>
            <Zap size={13} /> Flash Drills
          </button>
          <button onClick={() => { setShowPatternLibrary(!showPatternLibrary); setShowFlashDrills(false); setShowLessons(false); setShowRules(false); }}
            className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-[11px] font-semibold transition-all cursor-pointer ${
              showPatternLibrary ? 'border-neon-purple/40 bg-neon-purple/15 text-neon-purple' : 'border-neon-purple/25 bg-neon-purple/[0.06] text-neon-purple hover:bg-neon-purple/10'
            }`}>
            <BookOpen size={13} /> Patterns
          </button>
          <button onClick={() => { setShowLessons(!showLessons); setShowFlashDrills(false); setShowPatternLibrary(false); setShowRules(false); }}
            className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-[11px] font-semibold transition-all cursor-pointer ${
              showLessons ? 'border-neon-green/40 bg-neon-green/15 text-neon-green' : 'border-neon-green/25 bg-neon-green/[0.06] text-neon-green hover:bg-neon-green/10'
            }`}>
            <GraduationCap size={13} /> Lessons
          </button>
          <button onClick={() => { setShowRules(!showRules); setShowFlashDrills(false); setShowPatternLibrary(false); setShowLessons(false); }}
            className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-[11px] font-semibold transition-all cursor-pointer ${
              showRules ? 'border-neon-amber/40 bg-neon-amber/15 text-neon-amber' : 'border-neon-amber/25 bg-neon-amber/[0.06] text-neon-amber hover:bg-neon-amber/10'
            }`}>
            <Shield size={13} /> Rules
          </button>
          <button onClick={() => setShowStreak(!showStreak)}
            className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-[11px] font-semibold transition-all cursor-pointer ${
              showStreak ? 'border-neon-amber/40 bg-neon-amber/15 text-neon-amber' : 'border-neon-amber/25 bg-neon-amber/[0.06] text-neon-amber hover:bg-neon-amber/10'
            }`}>
            <Flame size={13} /> Streak
          </button>
        </div>

        {/* Flash Drills */}
        {showFlashDrills && <ICCFlashDrills onClose={() => setShowFlashDrills(false)} />}

        {/* Lessons Library */}
        {showLessons && <ICCLessonLibrary onClose={() => setShowLessons(false)} />}

        {/* Rules Cards */}
        {showRules && <ICCRulesCards onClose={() => setShowRules(false)} />}

        {/* Pattern Library */}
        {showPatternLibrary && <ICCPatternLibrary onClose={() => setShowPatternLibrary(false)} />}

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

        {/* How It Works — Step by Step Workflow */}
        <div className="animate-fade-in-up rounded-2xl border border-neon-green/20 bg-neon-green/[0.03] p-5" style={{ animationDelay: '80ms' }}>
          <h3 className="text-sm font-semibold text-white mb-3">How It Works — Your Workflow</h3>
          <div className="space-y-3">
            {[
              { step: '1', title: 'Pick a scenario below', desc: 'Start with a green "beginner" card. Each scenario is a real market situation frozen in time.', color: '#00ff9d' },
              { step: '2', title: 'Analyze the 4H chart first', desc: 'Decide the bias — is the trend bullish or bearish? Click "Bullish" or "Bearish" in the marking toolbar.', color: '#b18cff' },
              { step: '3', title: 'Mark the Indication on 1H', desc: 'Switch to the 1H tab. Click "Indication" in the toolbar, then tap the start and end candles of the impulse move.', color: '#00e5ff' },
              { step: '4', title: 'Mark the Correction on 15M', desc: 'Switch to 15M. Click "Correction", then tap the start and end of the pullback.', color: '#ffb800' },
              { step: '5', title: 'Mark the Continuation on 5M', desc: 'Switch to 5M. Click "Continuation", then tap the candle where price resumes the trend — this is your entry.', color: '#00ff9d' },
              { step: '6', title: 'Press Play and trade it', desc: 'Hit the play button to advance candles. Place a BUY or SELL when you see your entry. Set your SL and TP.', color: '#00e5ff' },
              { step: '7', title: 'Get scored', desc: 'When the session ends, you\'ll see your grade (A-F) across 5 dimensions. AI Coach gives personalized feedback.', color: '#b18cff' },
            ].map(s => (
              <div key={s.step} className="flex items-start gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg font-mono-nums text-[11px] font-bold" style={{ backgroundColor: `${s.color}15`, color: s.color, border: `1px solid ${s.color}30` }}>{s.step}</div>
                <div>
                  <p className="text-[12px] font-semibold text-white">{s.title}</p>
                  <p className="text-[10px] text-terminal-muted mt-0.5">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-lg border border-neon-green/15 bg-neon-green/[0.04] px-3 py-2">
            <p className="text-[10px] text-slate-400"><span className="text-neon-green font-semibold">Pro tip:</span> Press <kbd className="inline-flex items-center justify-center min-w-[18px] h-4 rounded border border-terminal-border/30 bg-terminal-bg/80 px-1 font-mono-nums text-[8px] text-neon-cyan mx-0.5">?</kbd> anytime inside the studio to see all keyboard shortcuts. Toggle <span className="text-neon-purple">Ghost Mode</span> (eye icon) to see the correct answer overlaid on the chart.</p>
          </div>
        </div>

        {/* Scenarios */}
        {!showFlashDrills && !showPatternLibrary && !showLessons && !showRules && (
        <div>
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-white">Choose a Scenario</h3>
              {assetFilter && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-neon-cyan/40 bg-neon-cyan/10 px-2 py-0.5 text-[10px] font-semibold text-neon-cyan">
                  <Compass size={10} />
                  From live bias · {assetFilter}
                  <button
                    onClick={clearAssetFilter}
                    className="ml-0.5 opacity-70 hover:opacity-100 cursor-pointer"
                    aria-label="Clear asset filter"
                  >
                    <XIcon size={10} />
                  </button>
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setGuidedMode(!guidedMode)}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] font-semibold cursor-pointer transition-all ${
                  guidedMode ? 'bg-neon-green/15 border border-neon-green/30 text-neon-green' : 'border border-terminal-border/20 text-terminal-muted hover:text-white'
                }`}>
                <GraduationCap size={11} /> {guidedMode ? 'Guided Mode' : 'Free Practice'}
              </button>
            </div>
          </div>
          {assetFilter && !ICC_SCENARIOS.some((s) => s.instrument === assetFilter) && (
            <p className="mb-3 text-[11px] text-terminal-muted rounded-lg border border-terminal-border/30 bg-terminal-bg/60 px-3 py-2">
              No scenarios for <span className="font-mono-nums font-bold text-slate-200">{assetFilter}</span> yet — the closest training fit is shown first.
              <button onClick={clearAssetFilter} className="ml-2 text-neon-cyan underline underline-offset-2 hover:no-underline cursor-pointer">Show all</button>
            </p>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            {[...ICC_SCENARIOS].sort((a, b) => {
              if (!assetFilter) return 0;
              const aMatch = a.instrument === assetFilter ? 0 : 1;
              const bMatch = b.instrument === assetFilter ? 0 : 1;
              return aMatch - bMatch;
            }).map((s, i) => {
              const dc = DIFFICULTY_COLORS[s.difficulty] || '#00e5ff';
              // "START HERE" tracks the original-order first scenario so that
              // reordering by asset filter doesn't mislead new users into
              // starting on an advanced scenario they're not ready for.
              const originalIndex = ICC_SCENARIOS.findIndex((o) => o.id === s.id);
              const isFirstBeginner = originalIndex === 0;
              const matchesAsset = assetFilter !== null && s.instrument === assetFilter;
              const gating = getGatingInfo(s.difficulty);
              return (
                <button key={s.id}
                  onClick={() => !gating.locked && store.selectScenario(s)}
                  disabled={gating.locked}
                  className={`animate-fade-in-up text-left rounded-2xl border overflow-hidden transition-all group relative ${
                    gating.locked ? 'border-terminal-border/20 opacity-60 cursor-not-allowed' :
                    matchesAsset ? 'border-neon-cyan/40 ring-1 ring-neon-cyan/20 cursor-pointer hover:border-neon-cyan/60' :
                    isFirstBeginner ? 'border-neon-green/40 ring-1 ring-neon-green/20 cursor-pointer hover:border-terminal-border-hover' : 'border-terminal-border/40 bg-terminal-card/20 cursor-pointer hover:border-terminal-border-hover'
                  }`}
                  style={{ animationDelay: `${i * 60}ms` }}>
                  <div className="h-[3px] w-full" style={{ background: `linear-gradient(90deg, ${dc}60, ${dc}20, transparent)` }} />
                  <div className="p-5">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono-nums text-[11px] font-bold text-white">{s.instrument}</span>
                        <span className="rounded-full border px-2 py-0.5 font-mono-nums text-[9px]" style={{ borderColor: `${dc}30`, color: dc }}>{s.difficulty}</span>
                        {isFirstBeginner && !gating.locked && (
                          <span className="rounded-full bg-neon-green/15 border border-neon-green/30 px-2 py-0.5 font-mono-nums text-[8px] font-bold text-neon-green animate-pulse">START HERE</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 font-mono-nums text-[9px] text-terminal-muted">
                        {gating.locked ? <Lock size={10} className="text-terminal-muted" /> : <Clock size={10} />}
                        {gating.locked ? `${gating.achieved}/${gating.needed} B+` : s.session}
                      </div>
                    </div>
                    <h3 className={`font-display text-base font-semibold ${gating.locked ? 'text-terminal-muted' : 'text-white group-hover:text-neon-cyan'} transition-colors`}>{s.name}</h3>
                    <p className="mt-1 text-[11px] text-terminal-muted">{s.description}</p>
                    {gating.locked ? (
                      <p className="mt-2 text-[10px] text-terminal-muted flex items-center gap-1">
                        <Lock size={9} /> Score B+ on {gating.needed} {gating.prerequisite} scenarios to unlock
                      </p>
                    ) : (
                      <p className="mt-2 text-[10px] text-slate-500 italic">{s.sessionHours}</p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
        )}
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
            <button
              onClick={() => { store.reset(); store.selectScenario(undefined!); setStreakRecorded(false); setDrawings([]); setBookmarks([]); }}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-terminal-border/30 text-terminal-muted hover:text-neon-cyan hover:border-neon-cyan/30 transition-all cursor-pointer"
              title="Back to scenario selection"
            >
              <ArrowLeft size={14} />
            </button>
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

      {/* Real-Time AI Commentary */}
      <ICCCommentary
        candles={store.candles}
        visibleCounts={{ '4H': store.getVisibleCount('4H'), '1H': store.getVisibleCount('1H'), '15M': store.getVisibleCount('15M'), '5M': store.getVisibleCount('5M') }}
        tickCount={store.tickCount}
        enabled={commentaryEnabled && !store.isFinished}
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

        {/* Workflow Checklist / Guided Walkthrough + Stats */}
        <div className="rounded-xl border border-terminal-border/30 bg-terminal-card/20 p-3 space-y-3">
          {/* Guided Walkthrough replaces checklist when active */}
          {guidedMode && scenario ? (
            <ICCGuidedWalkthrough
              marks={store.marks}
              biasSelection={store.biasSelection}
              answer={scenario.answer}
              tradesTaken={stats.totalTrades}
              isFinished={store.isFinished}
              onSwitchTimeframe={(tf) => store.setActiveTimeframe(tf)}
              onPausePlayback={() => { if (store.isPlaying) store.togglePlayback(); }}
              onShowGhost={(show) => { if (show !== store.showGhost) store.toggleGhost(); }}
            />
          ) : (
          /* Live Workflow Checklist */
          <div>
            <p className="font-mono-nums text-[9px] uppercase tracking-widest text-terminal-muted mb-2">Your Next Step</p>
            {(() => {
              const hasBias = !!store.biasSelection;
              const hasInd = store.marks.some(m => m.type === 'indication');
              const hasCor = store.marks.some(m => m.type === 'correction');
              const hasCon = store.marks.some(m => m.type === 'continuation');
              const hasTrade = stats.totalTrades > 0;
              const steps = [
                { done: hasBias, label: 'Set bias (4H)', hint: 'Look at the 4H chart. Is it trending up or down? Click Bullish or Bearish above.', tf: '4H', color: '#b18cff' },
                { done: hasInd, label: 'Mark indication (1H)', hint: 'Switch to 1H tab. Click "Indication", then tap the start and end candle of the impulse move.', tf: '1H', color: '#00e5ff' },
                { done: hasCor, label: 'Mark correction (15M)', hint: 'Switch to 15M. Click "Correction", then tap the start and end of the pullback.', tf: '15M', color: '#ffb800' },
                { done: hasCon, label: 'Mark continuation (5M)', hint: 'Switch to 5M. Click "Continuation", then tap the candle where price resumes trend.', tf: '5M', color: '#00ff9d' },
                { done: hasTrade, label: 'Place a trade', hint: 'Set your SL & TP pips, then click BUY or SELL. Press Play to advance candles.', tf: '', color: '#00e5ff' },
              ];
              // Find the current active step (first incomplete)
              const activeIdx = steps.findIndex(s => !s.done);
              return (
                <div className="space-y-1.5">
                  {steps.map((s, i) => {
                    const isActive = i === activeIdx;
                    const isPast = i < activeIdx || (activeIdx === -1);
                    return (
                      <div key={s.label} className={`rounded-lg px-2.5 py-1.5 transition-all ${isActive ? 'bg-terminal-bg/80 border border-terminal-border/30' : ''}`}>
                        <div className="flex items-center gap-2">
                          <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full" style={{
                            backgroundColor: s.done ? `${s.color}20` : isActive ? `${s.color}10` : '#151d2830',
                            border: `1.5px solid ${s.done ? s.color : isActive ? `${s.color}60` : '#151d2850'}`,
                          }}>
                            {s.done && <CheckCircle2 size={10} style={{ color: s.color }} />}
                            {isActive && <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ backgroundColor: s.color }} />}
                          </div>
                          <span className={`text-[10px] font-medium ${s.done ? 'text-slate-500 line-through' : isActive ? 'text-white' : 'text-terminal-muted'}`}>{s.label}</span>
                          {s.tf && isActive && <span className="font-mono-nums text-[8px] rounded px-1 py-0.5" style={{ color: s.color, backgroundColor: `${s.color}12`, border: `1px solid ${s.color}25` }}>{s.tf}</span>}
                        </div>
                        {isActive && <p className="text-[9px] text-slate-400 mt-1 ml-6 leading-relaxed">{s.hint}</p>}
                      </div>
                    );
                  })}
                  {activeIdx === -1 && !store.isFinished && (
                    <div className="rounded-lg bg-neon-green/[0.06] border border-neon-green/20 px-2.5 py-2 text-center">
                      <p className="text-[10px] text-neon-green font-semibold">All steps complete!</p>
                      <p className="text-[9px] text-terminal-muted mt-0.5">Press Play to advance candles and watch your trade.</p>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
          )}

          {/* Session Stats */}
          <div>
            <p className="font-mono-nums text-[9px] uppercase tracking-widest text-terminal-muted mb-1.5">Session Stats</p>
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
          </div>

          {store.isFinished && (
            <div className="text-center">
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

          {/* Mistake Replay — for weak dimensions */}
          <ICCMistakeReplay
            score={scoreICCAttempt(store.marks, store.biasSelection, scenario.answer, stats.totalTrades, stats.totalPnl)}
            scenario={scenario}
            candles={store.candles}
          />

          {/* Side-by-Side Comparison */}
          <ICCComparisonView
            marks={store.marks}
            biasSelection={store.biasSelection}
            answer={scenario.answer}
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
