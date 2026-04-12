import { useEffect, useRef, useCallback } from 'react';
import { type Timeframe } from '@/lib/icc-candle-generator';
import { type Candle, type Position, type ClosedTrade } from '@/lib/chart-simulator-engine';
import { ICCLightweightChart } from './ICCLightweightChart';
import type { ICCMark } from '@/stores/iccStudio';
import type { DrawingObject, DrawingType } from './ICCDrawingTools';
import type { IChartApi, ISeriesApi } from 'lightweight-charts';

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
  // Drawing props passthrough
  drawings?: DrawingObject[];
  activeDrawingTool?: DrawingType | null;
  onCreateDrawing?: (drawing: DrawingObject) => void;
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
  drawings, activeDrawingTool, onCreateDrawing,
}: Props) {
  // Crosshair sync refs
  const chartRefs = useRef<Map<string, { chart: IChartApi; series: ISeriesApi<'Candlestick'> }>>(new Map());
  const syncingRef = useRef(false);

  const handleChartReady = useCallback((tf: Timeframe, chart: IChartApi, series: ISeriesApi<'Candlestick'>) => {
    chartRefs.current.set(tf, { chart, series });
  }, []);

  // Setup crosshair sync for multi-chart modes
  useEffect(() => {
    if (viewMode === 'single') return;

    const unsubscribes: (() => void)[] = [];

    // Small delay to ensure all charts are ready
    const timer = setTimeout(() => {
      chartRefs.current.forEach((ref, sourceTf) => {
        const handler = (param: any) => {
          if (syncingRef.current || !param.time || !param.point) return;
          syncingRef.current = true;

          chartRefs.current.forEach((targetRef, targetTf) => {
            if (targetTf === sourceTf) return;
            try {
              targetRef.chart.setCrosshairPosition(
                param.seriesData?.get(ref.series),
                param.time,
                targetRef.series,
              );
            } catch {}
          });

          syncingRef.current = false;
        };

        ref.chart.subscribeCrosshairMove(handler);
        unsubscribes.push(() => ref.chart.unsubscribeCrosshairMove(handler));
      });
    }, 100);

    return () => {
      clearTimeout(timer);
      unsubscribes.forEach(u => u());
    };
  }, [viewMode]);

  const chartHeight = viewMode === 'single' ? 380 : 240;

  // Single view — one chart with tabs
  if (viewMode === 'single') {
    return (
      <div>
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
        <ICCLightweightChart
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
          drawings={drawings}
          activeDrawingTool={activeDrawingTool}
          onCreateDrawing={onCreateDrawing}
          onChartReady={(chart, series) => handleChartReady(activeTimeframe, chart, series)}
          height={chartHeight}
        />
      </div>
    );
  }

  // Dual view — 2 charts side by side
  if (viewMode === 'dual') {
    const pair = dualPair || ['1H', '5M'] as [Timeframe, Timeframe];
    return (
      <div>
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
              <ICCLightweightChart
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
                drawings={drawings}
                activeDrawingTool={activeDrawingTool}
                onCreateDrawing={onCreateDrawing}
                onChartReady={(chart, series) => handleChartReady(tf, chart, series)}
                height={chartHeight}
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
            <ICCLightweightChart
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
              drawings={drawings}
              activeDrawingTool={activeTimeframe === tf ? activeDrawingTool : null}
              onCreateDrawing={onCreateDrawing}
              onChartReady={(chart, series) => handleChartReady(tf, chart, series)}
              height={chartHeight}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
