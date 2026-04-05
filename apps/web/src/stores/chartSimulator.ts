import { create } from 'zustand';
import {
  type Scenario,
  type Position,
  type ClosedTrade,
  type SessionStats,
  openPosition,
  advanceCandle,
  calculateSessionStats,
  calculatePnl,
  getPipMultiplier,
} from '@/lib/chart-simulator-engine';

interface ChartSimulatorState {
  scenario: Scenario | null;
  visibleCount: number;
  positions: Position[];
  closedTrades: ClosedTrade[];
  isPlaying: boolean;
  playbackSpeed: number; // ms per candle
  isFinished: boolean;

  // Actions
  selectScenario: (scenario: Scenario) => void;
  advance: () => void;
  togglePlayback: () => void;
  setSpeed: (speed: number) => void;
  openTrade: (direction: 'buy' | 'sell', lotSize: number, slPips: number, tpPips: number) => void;
  closeTrade: (positionId: string) => void;
  reset: () => void;
  getStats: () => SessionStats;
  getCurrentPrice: () => number;
}

const INITIAL_VISIBLE = 30;

export const useChartSimulatorStore = create<ChartSimulatorState>()((set, get) => ({
  scenario: null,
  visibleCount: INITIAL_VISIBLE,
  positions: [],
  closedTrades: [],
  isPlaying: false,
  playbackSpeed: 1000,
  isFinished: false,

  selectScenario: (scenario) => {
    set({
      scenario,
      visibleCount: INITIAL_VISIBLE,
      positions: [],
      closedTrades: [],
      isPlaying: false,
      isFinished: false,
    });
  },

  advance: () => {
    const { scenario, visibleCount, positions, closedTrades } = get();
    if (!scenario) return;

    const nextIndex = visibleCount;
    if (nextIndex >= scenario.candles.length) {
      set({ isPlaying: false, isFinished: true });
      return;
    }

    const newCandle = scenario.candles[nextIndex];
    const pipMult = getPipMultiplier(scenario.instrument);

    const result = advanceCandle(positions, closedTrades, newCandle, nextIndex, scenario.pipValue, pipMult);

    set({
      visibleCount: nextIndex + 1,
      positions: result.positions,
      closedTrades: result.closedTrades,
      isFinished: nextIndex + 1 >= scenario.candles.length,
      isPlaying: nextIndex + 1 >= scenario.candles.length ? false : get().isPlaying,
    });
  },

  togglePlayback: () => {
    const { isFinished } = get();
    if (isFinished) return;
    set((s) => ({ isPlaying: !s.isPlaying }));
  },

  setSpeed: (speed) => set({ playbackSpeed: speed }),

  openTrade: (direction, lotSize, slPips, tpPips) => {
    const { scenario, visibleCount, positions } = get();
    if (!scenario || visibleCount === 0) return;
    if (positions.length >= 3) return; // Max 3 open positions

    const currentCandle = scenario.candles[visibleCount - 1];
    const entryPrice = currentCandle.c;
    const pipMult = getPipMultiplier(scenario.instrument);

    const pos = openPosition(direction, entryPrice, lotSize, slPips, tpPips, visibleCount - 1, pipMult);
    set({ positions: [...positions, pos] });
  },

  closeTrade: (positionId) => {
    const { scenario, visibleCount, positions, closedTrades } = get();
    if (!scenario || visibleCount === 0) return;

    const pos = positions.find(p => p.id === positionId);
    if (!pos) return;

    const currentCandle = scenario.candles[visibleCount - 1];
    const exitPrice = currentCandle.c;
    const pipMult = getPipMultiplier(scenario.instrument);

    const pips = pos.direction === 'buy'
      ? (exitPrice - pos.entryPrice) / pipMult
      : (pos.entryPrice - exitPrice) / pipMult;
    const pnl = pips * scenario.pipValue * pos.lotSize;

    const trade: ClosedTrade = {
      id: pos.id,
      direction: pos.direction,
      entryPrice: pos.entryPrice,
      exitPrice,
      lotSize: pos.lotSize,
      sl: pos.sl,
      tp: pos.tp,
      pnl,
      pips,
      exitReason: 'manual',
      entryIndex: pos.entryIndex,
      exitIndex: visibleCount - 1,
    };

    set({
      positions: positions.filter(p => p.id !== positionId),
      closedTrades: [...closedTrades, trade],
    });
  },

  reset: () => {
    const { scenario } = get();
    set({
      visibleCount: INITIAL_VISIBLE,
      positions: [],
      closedTrades: [],
      isPlaying: false,
      isFinished: false,
    });
  },

  getStats: () => calculateSessionStats(get().closedTrades),

  getCurrentPrice: () => {
    const { scenario, visibleCount } = get();
    if (!scenario || visibleCount === 0) return 0;
    return scenario.candles[visibleCount - 1].c;
  },
}));
