// Live ICC chart for /bias/:symbol pages. Renders 4H or 1H candles
// pulled from /v1/bias/candles/:symbol/:interval with the engine's
// structural annotations drawn on top:
//
//   • Swing high/low markers   (red triangles / green triangles)
//   • Indication level         (amber dashed horizontal line)
//   • Impulse range + Fib zone (38–62% highlighted translucent band)
//   • Trade plan lines         (Entry / SL / TP1 / TP2) when Continuation
//
// The chart is intentionally self-contained — it fetches its own data
// and refreshes on an independent interval so the parent page's data
// lifecycle doesn't need to know about candle state.
import { useEffect, useMemo, useRef, useState } from 'react';
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
  type UTCTimestamp,
  type SeriesMarker,
  type Time,
  type IPriceLine,
} from 'lightweight-charts';
import { BarChart2, RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';
import type { BiasCandlesPayload } from '@edgerelay/shared';

interface ICCLiveChartProps {
  symbol: string;
  initialInterval?: '4h' | '1h';
  decimals: number;
  height?: number;
}

const INTERVAL_LABEL: Record<'4h' | '1h', string> = { '4h': '4H', '1h': '1H' };

export function ICCLiveChart({
  symbol,
  initialInterval = '4h',
  decimals,
  height = 420,
}: ICCLiveChartProps) {
  const [interval, setInterval_] = useState<'4h' | '1h'>(initialInterval);
  const [payload, setPayload] = useState<BiasCandlesPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastLoaded, setLastLoaded] = useState<number | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const priceLinesRef = useRef<IPriceLine[]>([]);
  const markersApiRef = useRef<ReturnType<typeof createSeriesMarkers<Time>> | null>(null);

  // Fetch data when symbol or interval changes, and on a 5-min refresh timer.
  useEffect(() => {
    let cancelled = false;
    const fetchIt = async (manual = false) => {
      if (manual) setRefreshing(true);
      const res = await api.get<BiasCandlesPayload>(`/bias/candles/${symbol}/${interval}`);
      if (cancelled) return;
      if (res.data) {
        setPayload(res.data);
        setError(null);
        setLastLoaded(Date.now());
      } else {
        setError(res.error?.message ?? 'Failed to load chart');
      }
      setLoading(false);
      setRefreshing(false);
    };
    fetchIt();
    const timer = window.setInterval(() => fetchIt(), 5 * 60_000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [symbol, interval]);

  // Create the chart once the container is ready.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // autoSize handles both width and height via ResizeObserver on the
    // container. Passing explicit width/height alongside can fight with
    // initial layout (esp. when the container starts at zero size).
    const chart = createChart(container, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#a3a3a3',
        fontFamily: 'IBM Plex Mono, ui-monospace, monospace',
      },
      grid: {
        vertLines: { color: 'rgba(255,255,255,0.04)' },
        horzLines: { color: 'rgba(255,255,255,0.04)' },
      },
      rightPriceScale: { borderColor: 'rgba(255,255,255,0.08)' },
      timeScale: { borderColor: 'rgba(255,255,255,0.08)', timeVisible: true, secondsVisible: false },
      crosshair: { mode: CrosshairMode.Normal },
      autoSize: true,
    });
    const series = chart.addSeries(CandlestickSeries, {
      upColor: '#00ff9d',
      downColor: '#ff3d57',
      borderVisible: false,
      wickUpColor: '#00ff9d',
      wickDownColor: '#ff3d57',
      priceFormat: { type: 'price', precision: decimals, minMove: 1 / Math.pow(10, decimals) },
    });

    chartRef.current = chart;
    seriesRef.current = series;
    markersApiRef.current = createSeriesMarkers<Time>(series, []);

    return () => {
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      markersApiRef.current = null;
      priceLinesRef.current = [];
    };
  }, [decimals]);

  // Render data + overlays when payload changes.
  useEffect(() => {
    const chart = chartRef.current;
    const series = seriesRef.current;
    if (!chart || !series || !payload) return;

    // Candles
    const data: CandlestickData<UTCTimestamp>[] = payload.candles.map((c) => ({
      time: c.time as UTCTimestamp,
      open: c.open, high: c.high, low: c.low, close: c.close,
    }));
    series.setData(data);

    // Swing markers
    if (markersApiRef.current) {
      const markers: SeriesMarker<Time>[] = payload.swings.map((s) => ({
        time: s.time as UTCTimestamp,
        position: s.type === 'high' ? 'aboveBar' : 'belowBar',
        color: s.type === 'high' ? '#ff3d57' : '#00ff9d',
        shape: s.type === 'high' ? 'arrowDown' : 'arrowUp',
        size: 0.8,
      }));
      markersApiRef.current.setMarkers(markers);
    }

    // Clear existing price lines
    for (const pl of priceLinesRef.current) series.removePriceLine(pl);
    priceLinesRef.current = [];

    const addLine = (price: number, title: string, color: string, style: LineStyle, lineWidth: 1 | 2 = 1) => {
      const pl = series.createPriceLine({
        price, color, lineStyle: style, lineWidth,
        axisLabelVisible: true, title,
      });
      priceLinesRef.current.push(pl);
    };

    // Indication level (broken swing)
    if (payload.indicationLevel !== null) {
      addLine(payload.indicationLevel, 'Indication', '#ffb800', LineStyle.Dashed, 2);
    }

    // Retracement band — draw only when in correction / continuation
    if (payload.retracementLevels && (payload.state.phase === 'CORRECTION' || payload.state.phase === 'CONTINUATION')) {
      addLine(payload.retracementLevels.r25, '25%', 'rgba(163, 163, 163, 0.35)', LineStyle.Dotted);
      addLine(payload.retracementLevels.r38, '38% · optimal start', 'rgba(0, 229, 255, 0.70)', LineStyle.Dashed);
      addLine(payload.retracementLevels.r50, '50%', 'rgba(0, 229, 255, 0.40)', LineStyle.Dotted);
      addLine(payload.retracementLevels.r62, '62% · optimal end',  'rgba(0, 229, 255, 0.70)', LineStyle.Dashed);
      addLine(payload.retracementLevels.r79, '79% · deep',         'rgba(177, 140, 255, 0.40)', LineStyle.Dotted);
    }

    // Trade plan lines — only when engine emitted a plan (Continuation + tradeable)
    if (payload.tradePlan) {
      const p = payload.tradePlan;
      addLine(p.entry,       `Entry (${p.direction.toUpperCase()})`, '#fafafa', LineStyle.Solid,  2);
      addLine(p.stopLoss,    `SL · 1R`, '#ff3d57', LineStyle.Solid, 2);
      addLine(p.takeProfit1, `TP · 2R`, '#00ff9d', LineStyle.Solid, 2);
      addLine(p.takeProfit2, `TP · 3R`, '#00e5ff', LineStyle.Dashed, 1);
    }

    chart.timeScale().fitContent();
  }, [payload]);

  const state = payload?.state;
  const phaseBadge = useMemo(() => {
    if (!state) return null;
    const map: Record<string, string> = {
      INDICATION: '#ffb800', CORRECTION: '#00e5ff', CONTINUATION: '#00ff9d',
      NO_SETUP: '#525252',
    };
    const color = map[state.phase] ?? '#525252';
    return { color, label: state.phase };
  }, [state]);

  return (
    <section className="glass-premium rounded-2xl p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <BarChart2 size={14} className="text-neon-cyan" />
          <h2 className="text-[11px] uppercase tracking-[0.18em] text-terminal-muted font-semibold">
            {symbol} · Live ICC chart
          </h2>
          {phaseBadge && (
            <span
              className="text-[9px] font-bold uppercase tracking-[0.14em] px-1.5 py-0.5 rounded"
              style={{
                color: phaseBadge.color,
                background: `${phaseBadge.color}15`,
                border: `1px solid ${phaseBadge.color}30`,
              }}
            >
              {phaseBadge.label}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border border-terminal-border/50 overflow-hidden">
            {(['4h', '1h'] as const).map((tf) => (
              <button
                key={tf}
                type="button"
                onClick={() => setInterval_(tf)}
                className={`text-[10px] font-bold uppercase tracking-[0.14em] px-2.5 py-1 transition-colors ${
                  interval === tf
                    ? 'bg-neon-cyan/15 text-neon-cyan'
                    : 'text-terminal-muted hover:text-slate-200'
                }`}
              >
                {INTERVAL_LABEL[tf]}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => {
              setRefreshing(true);
              api.get<BiasCandlesPayload>(`/bias/candles/${symbol}/${interval}`).then((r) => {
                if (r.data) { setPayload(r.data); setLastLoaded(Date.now()); }
                setRefreshing(false);
              });
            }}
            disabled={refreshing}
            className="inline-flex items-center gap-1 rounded-lg border border-neon-cyan/25 bg-neon-cyan/5 px-2 py-1 text-[10px] font-semibold text-neon-cyan hover:bg-neon-cyan/15 transition-colors disabled:opacity-60"
            aria-label="Refresh chart"
          >
            <RefreshCw size={10} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Chart container is ALWAYS rendered so the useEffect that creates
          the chart can find its ref on mount. Loading + error states are
          overlays on top of it, not replacements for it — otherwise the
          ref is only attached after data arrives, by which point the
          chart-creation effect has already run against a null ref and
          won't re-run (its deps haven't changed). */}
      <div className="relative w-full rounded-xl overflow-hidden border border-terminal-border/40 bg-terminal-bg/40" style={{ height }}>
        <div ref={containerRef} className="absolute inset-0" />
        {loading && !payload && (
          <div className="absolute inset-0 flex items-center justify-center bg-terminal-surface/30 animate-pulse pointer-events-none">
            <span className="text-[11px] text-terminal-muted">Loading chart…</span>
          </div>
        )}
        {error && !payload && (
          <div className="absolute inset-0 flex items-center justify-center bg-neon-red/[0.04]">
            <p className="text-[11px] text-neon-red">{error}</p>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[10px] text-terminal-muted">
        <Legend color="#00ff9d" shape="arrow-up" label="Swing low" />
        <Legend color="#ff3d57" shape="arrow-down" label="Swing high" />
        <Legend color="#ffb800" shape="dash" label="Indication level" />
        <Legend color="#00e5ff" shape="dash" label="Optimal retracement (38–62%)" />
        {payload?.tradePlan && (
          <>
            <Legend color="#fafafa" shape="solid" label="Entry" />
            <Legend color="#ff3d57" shape="solid" label="SL · 1R" />
            <Legend color="#00ff9d" shape="solid" label="TP · 2R" />
            <Legend color="#00e5ff" shape="dash" label="TP · 3R" />
          </>
        )}
        {lastLoaded && (
          <span className="ml-auto font-mono-nums text-[9px]">
            Updated {new Date(lastLoaded).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>
    </section>
  );
}

function Legend({ color, shape, label }: { color: string; shape: 'solid' | 'dash' | 'arrow-up' | 'arrow-down'; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      {shape === 'arrow-up' ? (
        <span style={{ color, fontSize: 10 }}>▲</span>
      ) : shape === 'arrow-down' ? (
        <span style={{ color, fontSize: 10 }}>▼</span>
      ) : shape === 'dash' ? (
        <span style={{
          display: 'inline-block', width: 14, height: 2,
          background: `repeating-linear-gradient(to right, ${color} 0 4px, transparent 4px 7px)`,
        }} />
      ) : (
        <span style={{ display: 'inline-block', width: 14, height: 2, background: color }} />
      )}
      <span>{label}</span>
    </span>
  );
}
