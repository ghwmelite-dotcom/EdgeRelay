import { type Timeframe } from '@/lib/icc-candle-generator';
import { type Candle, type Position, type ClosedTrade } from '@/lib/chart-simulator-engine';
import { ICCChartCanvas } from './ICCChartCanvas';
import type { ICCMark } from '@/stores/iccStudio';

interface Props {
  candles: Record<Timeframe, Candle[]>;
  visibleCounts: Record<Timeframe, number>;
  positions: Position[];
  closedTrades: ClosedTrade[];
  instrument: string;
  marks: ICCMark[];
  markingMode: 'indication' | 'correction' | 'continuation' | null;
  onMarkRange: (tf: Timeframe, start: number, end: number) => void;
  showGhost: boolean;
  ghostRanges?: { indication?: [number, number]; correction?: [number, number] };
  viewMode: 'quad' | 'dual' | 'single';
  activeTimeframe: Timeframe;
  onSelectTimeframe: (tf: Timeframe) => void;
  dualPair?: [Timeframe, Timeframe];
}

const ALL_TFS: Timeframe[] = ['4H', '1H', '15M', '5M'];

const TF_PURPOSES: Record<Timeframe, string> = {
  '4H': 'Bias — What\'s the trend?',
  '1H': 'Indication — Where\'s the impulse?',
  '15M': 'Correction — Is the pullback complete?',
  '5M': 'Continuation — Where\'s the entry?',
};

export function ICCTimeframeGrid({
  candles, visibleCounts, positions, closedTrades, instrument,
  marks, markingMode, onMarkRange, showGhost, ghostRanges,
  viewMode, activeTimeframe, onSelectTimeframe, dualPair,
}: Props) {
  // Single view — one chart with tabs
  if (viewMode === 'single') {
    return (
      <div>
        {/* TF tabs */}
        <div className="flex gap-1 mb-2">
          {ALL_TFS.map(tf => (
            <button key={tf} onClick={() => onSelectTimeframe(tf)}
              className={`flex-1 rounded-lg py-1.5 text-center cursor-pointer transition-all ${
                activeTimeframe === tf
                  ? 'bg-terminal-card/50 border border-neon-cyan/30 text-neon-cyan'
                  : 'border border-terminal-border/20 text-terminal-muted hover:text-white'
              }`}>
              <span className="font-mono-nums text-[11px] font-semibold">{tf}</span>
              <span className="hidden sm:inline text-[8px] text-terminal-muted ml-1.5">{tf === '4H' ? 'Bias' : tf === '1H' ? 'Indication' : tf === '15M' ? 'Correction' : 'Entry'}</span>
            </button>
          ))}
        </div>
        <ICCChartCanvas
          candles={candles[activeTimeframe]}
          visibleCount={visibleCounts[activeTimeframe]}
          positions={positions}
          closedTrades={closedTrades}
          instrument={instrument}
          timeframe={activeTimeframe}
          marks={marks}
          markingMode={markingMode}
          onMarkRange={onMarkRange}
          showGhost={showGhost}
          ghostRanges={ghostRanges}
        />
      </div>
    );
  }

  // Dual view — 2 charts side by side
  if (viewMode === 'dual') {
    const pair = dualPair || ['1H', '5M'] as [Timeframe, Timeframe];
    return (
      <div>
        {/* Dual pair selector */}
        <div className="flex gap-1 mb-2">
          {[['4H', '1H'], ['1H', '15M'], ['15M', '5M'], ['1H', '5M']].map(([a, b]) => {
            const isActive = pair[0] === a && pair[1] === b;
            return (
              <button key={`${a}-${b}`} onClick={() => onSelectTimeframe(a as Timeframe)}
                className={`rounded-lg px-3 py-1.5 font-mono-nums text-[10px] cursor-pointer transition-all ${
                  isActive ? 'bg-terminal-card/50 border border-neon-cyan/30 text-neon-cyan' : 'border border-terminal-border/20 text-terminal-muted hover:text-white'
                }`}>
                {a} + {b}
              </button>
            );
          })}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {pair.map(tf => (
            <div key={tf}>
              <p className="font-mono-nums text-[9px] text-terminal-muted mb-1 text-center">{TF_PURPOSES[tf]}</p>
              <ICCChartCanvas
                candles={candles[tf]}
                visibleCount={visibleCounts[tf]}
                positions={tf === '5M' ? positions : []}
                closedTrades={tf === '5M' ? closedTrades : []}
                instrument={instrument}
                timeframe={tf}
                marks={marks}
                markingMode={markingMode}
                onMarkRange={onMarkRange}
                showGhost={showGhost}
                ghostRanges={ghostRanges}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Quad view — 2x2 grid
  return (
    <div>
      <div className="grid grid-cols-2 gap-2">
        {ALL_TFS.map(tf => (
          <div key={tf} className={`rounded-lg transition-all ${activeTimeframe === tf ? 'ring-1 ring-neon-cyan/30' : ''}`}
            onClick={() => onSelectTimeframe(tf)}>
            <p className="font-mono-nums text-[9px] text-terminal-muted mb-1 px-1 flex items-center justify-between">
              <span>{TF_PURPOSES[tf]}</span>
              {activeTimeframe === tf && <span className="text-neon-cyan">Active</span>}
            </p>
            <ICCChartCanvas
              candles={candles[tf]}
              visibleCount={visibleCounts[tf]}
              positions={tf === '5M' || tf === activeTimeframe ? positions : []}
              closedTrades={tf === '5M' || tf === activeTimeframe ? closedTrades : []}
              instrument={instrument}
              timeframe={tf}
              marks={marks}
              markingMode={activeTimeframe === tf ? markingMode : null}
              onMarkRange={onMarkRange}
              showGhost={showGhost}
              ghostRanges={ghostRanges}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
