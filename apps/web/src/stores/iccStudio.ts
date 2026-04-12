import { create } from 'zustand';
import type { Candle } from '@/lib/chart-simulator-engine';
import { openPosition, advanceCandle, calculateSessionStats, getPipMultiplier } from '@/lib/chart-simulator-engine';
import type { Position, ClosedTrade, SessionStats } from '@/lib/chart-simulator-engine';
import { generateAllTimeframes, unpackCandles, type Timeframe, TF_TICK_RATIOS } from '@/lib/icc-candle-generator';
import type { ICCScenario } from '@/data/icc-scenarios';

export interface ICCMark {
  type: 'indication' | 'correction' | 'continuation';
  timeframe: Timeframe;
  startIndex: number;
  endIndex: number;
}

interface ICCStudioState {
  scenario: ICCScenario | null;
  candles: Record<Timeframe, Candle[]>;
  activeTimeframe: Timeframe;
  viewMode: 'single' | 'dual' | 'quad';
  tickCount: number; // 5M granularity
  isPlaying: boolean;
  playbackSpeed: number;
  isFinished: boolean;

  // ICC marking
  markingMode: 'indication' | 'correction' | 'continuation' | null;
  marks: ICCMark[];
  biasSelection: 'bullish' | 'bearish' | null;

  // Trading
  positions: Position[];
  closedTrades: ClosedTrade[];

  // Ghost mode
  showGhost: boolean;

  // Actions
  selectScenario: (scenario: ICCScenario) => void;
  setActiveTimeframe: (tf: Timeframe) => void;
  setViewMode: (mode: 'single' | 'dual' | 'quad') => void;
  advance: () => void;
  togglePlayback: () => void;
  setSpeed: (speed: number) => void;
  setMarkingMode: (mode: 'indication' | 'correction' | 'continuation' | null) => void;
  addMark: (mark: ICCMark) => void;
  clearMarks: () => void;
  setBias: (bias: 'bullish' | 'bearish') => void;
  openTrade: (direction: 'buy' | 'sell', lotSize: number, slPips: number, tpPips: number) => void;
  closeTrade: (positionId: string) => void;
  toggleGhost: () => void;
  reset: () => void;
  getVisibleCount: (tf: Timeframe) => number;
  getCurrentPrice: () => number;
  getStats: () => SessionStats;
}

const INITIAL_TICKS = 120; // Start with some visible candles (120 × 5M = 10 hours)

export const useICCStudioStore = create<ICCStudioState>()((set, get) => ({
  scenario: null,
  candles: { '4H': [], '1H': [], '15M': [], '5M': [] },
  activeTimeframe: '1H',
  viewMode: 'single',
  tickCount: INITIAL_TICKS,
  isPlaying: false,
  playbackSpeed: 300,
  isFinished: false,
  markingMode: null,
  marks: [],
  biasSelection: null,
  positions: [],
  closedTrades: [],
  showGhost: false,

  selectScenario: (scenario) => {
    const h4Candles = unpackCandles(scenario.h4Data);
    const allTF = generateAllTimeframes(h4Candles, scenario.seed);
    set({
      scenario,
      candles: { '4H': allTF.h4, '1H': allTF.h1, '15M': allTF.m15, '5M': allTF.m5 },
      tickCount: INITIAL_TICKS,
      isPlaying: false,
      isFinished: false,
      markingMode: null,
      marks: [],
      biasSelection: null,
      positions: [],
      closedTrades: [],
      showGhost: false,
      activeTimeframe: '1H',
    });
  },

  setActiveTimeframe: (tf) => set({ activeTimeframe: tf }),
  setViewMode: (mode) => set({ viewMode: mode }),

  advance: () => {
    const { scenario, candles, tickCount, positions, closedTrades } = get();
    if (!scenario) return;

    const maxTicks = candles['5M'].length;
    if (tickCount >= maxTicks) {
      set({ isPlaying: false, isFinished: true });
      return;
    }

    // Check SL/TP on the new 5M candle
    const newCandle = candles['5M'][tickCount];
    const pipMult = getPipMultiplier(scenario.instrument);
    const result = advanceCandle(positions, closedTrades, newCandle, tickCount, scenario.pipValue, pipMult);

    set({
      tickCount: tickCount + 1,
      positions: result.positions,
      closedTrades: result.closedTrades,
      isFinished: tickCount + 1 >= maxTicks,
      isPlaying: tickCount + 1 >= maxTicks ? false : get().isPlaying,
    });
  },

  togglePlayback: () => {
    if (get().isFinished) return;
    set(s => ({ isPlaying: !s.isPlaying }));
  },

  setSpeed: (speed) => set({ playbackSpeed: speed }),

  setMarkingMode: (mode) => set({ markingMode: mode }),

  addMark: (mark) => {
    set(s => ({
      marks: [...s.marks.filter(m => m.type !== mark.type), mark],
      markingMode: null,
    }));
  },

  clearMarks: () => set({ marks: [], biasSelection: null }),

  setBias: (bias) => set({ biasSelection: bias }),

  openTrade: (direction, lotSize, slPips, tpPips) => {
    const { scenario, candles, tickCount, positions } = get();
    if (!scenario || positions.length >= 3) return;

    const visibleM5 = tickCount;
    if (visibleM5 === 0) return;
    const currentCandle = candles['5M'][visibleM5 - 1];
    const pipMult = getPipMultiplier(scenario.instrument);
    const pos = openPosition(direction, currentCandle.c, lotSize, slPips, tpPips, visibleM5 - 1, pipMult);
    set({ positions: [...positions, pos] });
  },

  closeTrade: (positionId) => {
    const { scenario, candles, tickCount, positions, closedTrades } = get();
    if (!scenario) return;
    const pos = positions.find(p => p.id === positionId);
    if (!pos) return;

    const currentCandle = candles['5M'][tickCount - 1];
    const pipMult = getPipMultiplier(scenario.instrument);
    const priceDiff = pos.direction === 'buy'
      ? currentCandle.c - pos.entryPrice
      : pos.entryPrice - currentCandle.c;
    const pips = priceDiff / pipMult;
    const pnl = pips * scenario.pipValue * pos.lotSize;

    const trade: ClosedTrade = {
      id: pos.id, direction: pos.direction, entryPrice: pos.entryPrice,
      exitPrice: currentCandle.c, lotSize: pos.lotSize, sl: pos.sl, tp: pos.tp,
      pnl, pips, exitReason: 'manual', entryIndex: pos.entryIndex, exitIndex: tickCount - 1,
    };

    set({
      positions: positions.filter(p => p.id !== positionId),
      closedTrades: [...closedTrades, trade],
    });
  },

  toggleGhost: () => set(s => ({ showGhost: !s.showGhost })),

  reset: () => {
    set({
      tickCount: INITIAL_TICKS,
      isPlaying: false,
      isFinished: false,
      markingMode: null,
      marks: [],
      biasSelection: null,
      positions: [],
      closedTrades: [],
      showGhost: false,
    });
  },

  getVisibleCount: (tf) => {
    const { tickCount } = get();
    return Math.floor(tickCount / TF_TICK_RATIOS[tf]);
  },

  getCurrentPrice: () => {
    const { candles, tickCount } = get();
    if (tickCount === 0 || candles['5M'].length === 0) return 0;
    return candles['5M'][Math.min(tickCount - 1, candles['5M'].length - 1)].c;
  },

  getStats: () => calculateSessionStats(get().closedTrades),
}));
