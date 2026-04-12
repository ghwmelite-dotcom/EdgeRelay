/**
 * ICCLightweightChart — Professional candlestick chart built on
 * TradingView Lightweight Charts v5. Drop-in replacement for ICCChartCanvas.
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import {
  createChart,
  createSeriesMarkers,
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  LineStyle,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  type Time,
  type UTCTimestamp,
  type SeriesMarker,
  type IPriceLine,
} from 'lightweight-charts';
import type { Candle, Position, ClosedTrade } from '@/lib/chart-simulator-engine';
import type { ICCMark } from '@/stores/iccStudio';
import type { Timeframe } from '@/lib/icc-candle-generator';
import type { DrawingObject, DrawingType } from './ICCDrawingTools';
import { ICCZoneOverlayPrimitive, type ICCMarkInput, type GhostInput } from './primitives/ICCZoneOverlay';
import { DrawingToolPrimitive } from './primitives/DrawingPrimitive';

interface Props {
  candles: Candle[];
  visibleCount: number;
  positions: Position[];
  closedTrades: ClosedTrade[];
  instrument: string;
  timeframe: Timeframe;
  marks: ICCMark[];
  markingMode: 'indication' | 'correction' | 'continuation' | null;
  onMarkRange?: (tf: Timeframe, start: number, end: number) => void;
  showGhost?: boolean;
  ghostRanges?: { indication?: [number, number]; correction?: [number, number]; continuation?: number };
  // New optional props
  drawings?: DrawingObject[];
  activeDrawingTool?: DrawingType | null;
  onCreateDrawing?: (drawing: DrawingObject) => void;
  onChartReady?: (chart: IChartApi, series: ISeriesApi<'Candlestick'>) => void;
  height?: number;
}

const TF_COLORS: Record<string, string> = {
  '4H': '#b18cff', '1H': '#00e5ff', '15M': '#ffb800', '5M': '#00ff9d',
};

const TF_PURPOSES: Record<string, string> = {
  '4H': 'Bias', '1H': 'Indication', '15M': 'Correction', '5M': 'Entry',
};

const DRAWING_COLORS: Record<string, string> = {
  trendline: '#00e5ff', horizontal: '#ffb800', fibonacci: '#b18cff',
};

function toChartData(candles: Candle[]): CandlestickData<UTCTimestamp>[] {
  return candles.map(c => ({
    time: c.t as UTCTimestamp,
    open: c.o,
    high: c.h,
    low: c.l,
    close: c.c,
  }));
}

export function ICCLightweightChart({
  candles, visibleCount, positions, closedTrades, instrument, timeframe,
  marks, markingMode, onMarkRange, showGhost, ghostRanges,
  drawings, activeDrawingTool, onCreateDrawing, onChartReady, height = 240,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const priceLinesRef = useRef<IPriceLine[]>([]);
  const markersPluginRef = useRef<any>(null);
  const zonePrimitiveRef = useRef<ICCZoneOverlayPrimitive | null>(null);
  const drawingPrimitiveRef = useRef<DrawingToolPrimitive | null>(null);
  const prevVisibleCountRef = useRef(0);
  const timeToIndexRef = useRef<Map<number, number>>(new Map());

  // Two-click marking state
  const [markStart, setMarkStart] = useState<number | null>(null);
  // Two-click drawing state
  const [drawStart, setDrawStart] = useState<{ index: number; price: number; time: number } | null>(null);

  // Initialize chart
  useEffect(() => {
    if (!containerRef.current) return;
    // HMR safety
    containerRef.current.innerHTML = '';

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height,
      layout: {
        background: { type: ColorType.Solid, color: '#0a0f16' },
        textColor: '#6b7f95',
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: 10,
      },
      grid: {
        vertLines: { color: '#151d2833' },
        horzLines: { color: '#151d2833' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: '#00e5ff4d', width: 1, style: LineStyle.Dashed, labelBackgroundColor: '#151d28' },
        horzLine: { color: '#00e5ff4d', width: 1, style: LineStyle.Dashed, labelBackgroundColor: '#151d28' },
      },
      rightPriceScale: {
        borderColor: '#151d2840',
        scaleMargins: { top: 0.05, bottom: 0.05 },
      },
      timeScale: {
        borderColor: '#151d2840',
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 5,
        fixLeftEdge: true,
      },
      handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: false },
      handleScale: { mouseWheel: true, pinch: true },
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: '#00ff9d',
      downColor: '#ff3d57',
      borderUpColor: '#00ff9d',
      borderDownColor: '#ff3d57',
      wickUpColor: '#00ff9d80',
      wickDownColor: '#ff3d5780',
    });

    // Attach zone overlay primitive
    const zonePrimitive = new ICCZoneOverlayPrimitive();
    series.attachPrimitive(zonePrimitive);
    zonePrimitiveRef.current = zonePrimitive;

    // Attach drawing primitive
    const drawingPrimitive = new DrawingToolPrimitive();
    drawingPrimitive.setTimeframe(timeframe);
    series.attachPrimitive(drawingPrimitive);
    drawingPrimitiveRef.current = drawingPrimitive;

    chartRef.current = chart;
    seriesRef.current = series;

    // Resize observer
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        chart.applyOptions({ width: entry.contentRect.width });
      }
    });
    ro.observe(containerRef.current);

    // Notify parent
    onChartReady?.(chart, series);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      zonePrimitiveRef.current = null;
      drawingPrimitiveRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Update height
  useEffect(() => {
    chartRef.current?.applyOptions({ height });
  }, [height]);

  // Update data (progressive reveal)
  useEffect(() => {
    const series = seriesRef.current;
    const chart = chartRef.current;
    if (!series || !chart || visibleCount === 0) return;

    const visible = candles.slice(0, visibleCount);

    // Build time-to-index map
    const map = new Map<number, number>();
    visible.forEach((c, i) => map.set(c.t, i));
    timeToIndexRef.current = map;

    // Optimize: use update() for single candle increments
    if (visibleCount === prevVisibleCountRef.current + 1 && prevVisibleCountRef.current > 0) {
      const lastCandle = visible[visible.length - 1];
      series.update({
        time: lastCandle.t as UTCTimestamp,
        open: lastCandle.o,
        high: lastCandle.h,
        low: lastCandle.l,
        close: lastCandle.c,
      });
    } else {
      series.setData(toChartData(visible));
    }

    prevVisibleCountRef.current = visibleCount;

    // Auto-scroll to latest
    chart.timeScale().scrollToRealTime();
  }, [candles, visibleCount]);

  // Update ICC zone overlays
  useEffect(() => {
    const prim = zonePrimitiveRef.current;
    if (!prim) return;

    const tfMarks: ICCMarkInput[] = marks
      .filter(m => m.timeframe === timeframe)
      .map(m => ({
        type: m.type,
        startTime: candles[m.startIndex]?.t ?? 0,
        endTime: candles[m.endIndex]?.t ?? 0,
      }));

    const ghosts: GhostInput[] = [];
    if (showGhost && ghostRanges) {
      if (ghostRanges.indication) {
        ghosts.push({
          type: 'indication',
          startTime: candles[ghostRanges.indication[0]]?.t ?? 0,
          endTime: candles[ghostRanges.indication[1]]?.t ?? 0,
        });
      }
      if (ghostRanges.correction) {
        ghosts.push({
          type: 'correction',
          startTime: candles[ghostRanges.correction[0]]?.t ?? 0,
          endTime: candles[ghostRanges.correction[1]]?.t ?? 0,
        });
      }
    }

    prim.updateMarks(tfMarks, ghosts);
  }, [marks, showGhost, ghostRanges, candles, timeframe]);

  // Update drawings
  useEffect(() => {
    const prim = drawingPrimitiveRef.current;
    if (!prim) return;
    prim.setTimeframe(timeframe);
    prim.updateDrawings(drawings ?? []);
  }, [drawings, timeframe]);

  // Update position markers + SL/TP price lines
  useEffect(() => {
    const series = seriesRef.current;
    if (!series) return;

    // Clear old price lines
    for (const pl of priceLinesRef.current) {
      try { series.removePriceLine(pl); } catch {}
    }
    priceLinesRef.current = [];

    // Create SL/TP price lines for open positions
    for (const pos of positions) {
      const slLine = series.createPriceLine({
        price: pos.sl,
        color: '#ff3d57',
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: 'SL',
      });
      const tpLine = series.createPriceLine({
        price: pos.tp,
        color: '#00ff9d',
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: 'TP',
      });
      priceLinesRef.current.push(slLine, tpLine);
    }

    // Current price line
    if (visibleCount > 0) {
      const lastCandle = candles[Math.min(visibleCount - 1, candles.length - 1)];
      if (lastCandle) {
        const priceLine = series.createPriceLine({
          price: lastCandle.c,
          color: TF_COLORS[timeframe] || '#00e5ff',
          lineWidth: 1,
          lineStyle: LineStyle.Dotted,
          axisLabelVisible: true,
          title: '',
        });
        priceLinesRef.current.push(priceLine);
      }
    }

    // Entry/exit markers
    const markerData: SeriesMarker<UTCTimestamp>[] = [];

    for (const pos of positions) {
      const t = candles[pos.entryIndex]?.t;
      if (t !== undefined) {
        markerData.push({
          time: t as UTCTimestamp,
          position: pos.direction === 'buy' ? 'belowBar' : 'aboveBar',
          color: pos.direction === 'buy' ? '#00ff9d' : '#ff3d57',
          shape: 'circle',
          text: pos.direction === 'buy' ? 'BUY' : 'SELL',
        });
      }
    }

    for (const trade of closedTrades.slice(-5)) {
      const t = candles[trade.exitIndex]?.t;
      if (t !== undefined) {
        markerData.push({
          time: t as UTCTimestamp,
          position: 'inBar',
          color: trade.pnl >= 0 ? '#00ff9d' : '#ff3d57',
          shape: 'circle',
          text: trade.pnl >= 0 ? '+' : '-',
        });
      }
    }

    // Sort ascending by time (required by LW Charts)
    markerData.sort((a, b) => (a.time as number) - (b.time as number));

    // Remove old markers plugin
    if (markersPluginRef.current) {
      try { markersPluginRef.current.detach(); } catch {}
    }

    if (markerData.length > 0) {
      markersPluginRef.current = createSeriesMarkers(series, markerData);
    } else {
      markersPluginRef.current = null;
    }
  }, [positions, closedTrades, candles, visibleCount, timeframe]);

  // Click handler for marking + drawing
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    const handler = (param: any) => {
      if (!param.time) return;
      const clickedTime = param.time as number;
      const clickedIndex = timeToIndexRef.current.get(clickedTime);
      if (clickedIndex === undefined) return;

      // Drawing tool interaction
      if (activeDrawingTool && onCreateDrawing && seriesRef.current) {
        const price = seriesRef.current.coordinateToPrice(param.point?.y ?? 0) as number;
        if (price === null) return;

        if (activeDrawingTool === 'horizontal') {
          onCreateDrawing({
            id: crypto.randomUUID(),
            type: 'horizontal',
            startIndex: clickedTime,
            endIndex: clickedTime,
            startPrice: price,
            endPrice: price,
            color: DRAWING_COLORS.horizontal,
            timeframe,
          });
          return;
        }

        // Two-click for trendline/fibonacci
        if (!drawStart) {
          setDrawStart({ index: clickedTime, price, time: clickedTime });
          return;
        }

        onCreateDrawing({
          id: crypto.randomUUID(),
          type: activeDrawingTool,
          startIndex: drawStart.time,
          endIndex: clickedTime,
          startPrice: drawStart.price,
          endPrice: price,
          color: DRAWING_COLORS[activeDrawingTool],
          timeframe,
        });
        setDrawStart(null);
        return;
      }

      // ICC marking interaction
      if (!markingMode || !onMarkRange) return;

      if (markingMode === 'continuation') {
        onMarkRange(timeframe, clickedIndex, clickedIndex);
        return;
      }

      if (markStart === null) {
        setMarkStart(clickedIndex);
      } else {
        const start = Math.min(markStart, clickedIndex);
        const end = Math.max(markStart, clickedIndex);
        onMarkRange(timeframe, start, end);
        setMarkStart(null);
      }
    };

    chart.subscribeClick(handler);
    return () => chart.unsubscribeClick(handler);
  }, [markingMode, markStart, activeDrawingTool, drawStart, onMarkRange, onCreateDrawing, timeframe]);

  // Reset markStart/drawStart when mode changes
  useEffect(() => { setMarkStart(null); }, [markingMode]);
  useEffect(() => { setDrawStart(null); }, [activeDrawingTool]);

  // Cursor style
  const cursorClass = markingMode || activeDrawingTool ? 'cursor-crosshair' : '';

  return (
    <div className="relative group">
      {/* TF label badge */}
      <div className="absolute top-2 left-3 z-10 flex items-center gap-1.5">
        <span
          className="rounded-md px-1.5 py-0.5 font-mono-nums text-[10px] font-bold border"
          style={{ borderColor: `${TF_COLORS[timeframe]}30`, backgroundColor: `${TF_COLORS[timeframe]}15`, color: TF_COLORS[timeframe] }}
        >
          {timeframe}
        </span>
        <span className="text-[9px] text-terminal-muted">{TF_PURPOSES[timeframe]}</span>
      </div>

      {/* Marking mode indicator */}
      {markingMode && (
        <div className="absolute top-2 right-3 z-10 flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-neon-cyan animate-pulse" />
          <span className="text-[9px] text-neon-cyan">
            {markingMode === 'continuation' ? 'Tap entry' : markStart !== null ? 'Tap end' : 'Tap start'}
          </span>
        </div>
      )}

      {/* Drawing mode indicator */}
      {activeDrawingTool && !markingMode && (
        <div className="absolute top-2 right-3 z-10 flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ backgroundColor: DRAWING_COLORS[activeDrawingTool] }} />
          <span className="text-[9px]" style={{ color: DRAWING_COLORS[activeDrawingTool] }}>
            {activeDrawingTool === 'horizontal' ? 'Click level' : drawStart ? 'Click end' : 'Click start'}
          </span>
        </div>
      )}

      {/* Chart container */}
      <div
        ref={containerRef}
        className={`rounded-xl border border-terminal-border/30 overflow-hidden ${cursorClass}`}
        style={{ height }}
      />
    </div>
  );
}
