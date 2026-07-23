// Live M15 chart with ORB overlays — draws the opening range as a
// shaded rectangle, marks the break candle with an arrow, and renders
// the trade plan (Entry / SL / TP1 / TP2) as price lines. Follows the
// same container pattern as ICCLiveChart (ref always mounted so the
// chart-creation useEffect doesn't miss the container).
import { useEffect, useRef, useState } from 'react';
import {
  createChart,
  createSeriesMarkers,
  createImageWatermark,
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
import { BarChart2, RefreshCw, Target } from 'lucide-react';
import { api } from '@/lib/api';
import type { OrbCandlesPayload, OrbSignal } from '@edgerelay/shared';

interface OrbLiveChartProps {
  symbol: string;
  decimals: number;
  height?: number;
}

// Session → theme color mapping for range rectangles
const SESSION_TINT: Record<'london' | 'newyork', string> = {
  london: 'rgba(0, 229, 255, 0.12)',    // cyan-ish
  newyork: 'rgba(177, 140, 255, 0.12)', // purple-ish
};
const SESSION_BORDER: Record<'london' | 'newyork', string> = {
  london: 'rgba(0, 229, 255, 0.55)',
  newyork: 'rgba(177, 140, 255, 0.55)',
};

export function OrbLiveChart({ symbol, decimals, height = 420 }: OrbLiveChartProps) {
  const [payload, setPayload] = useState<OrbCandlesPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastLoaded, setLastLoaded] = useState<number | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const priceLinesRef = useRef<IPriceLine[]>([]);
  const markersApiRef = useRef<ReturnType<typeof createSeriesMarkers<Time>> | null>(null);
  // Range-rectangle overlay DOM element (absolute-positioned within the
  // chart container). lightweight-charts v5 doesn't yet have native shape
  // primitives, so we draw the range as a DIV positioned via time/price
  // → pixel coords from the chart API.
  const rangeOverlayRef = useRef<HTMLDivElement | null>(null);

  // Fetch + refresh every 5 min
  useEffect(() => {
    let cancelled = false;
    const fetchIt = async (manual = false) => {
      if (manual) setRefreshing(true);
      const res = await api.get<OrbCandlesPayload>(`/orb/candles/${symbol}`);
      if (cancelled) return;
      if (res.data) { setPayload(res.data); setError(null); setLastLoaded(Date.now()); }
      else setError(res.error?.message ?? 'Failed to load ORB chart');
      setLoading(false); setRefreshing(false);
    };
    fetchIt();
    const timer = window.setInterval(() => fetchIt(), 5 * 60_000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [symbol]);

  // Create chart once
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
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

    // Create a range-rectangle overlay div that we reposition manually.
    const overlayParent = container;
    const overlay = document.createElement('div');
    overlay.style.position = 'absolute';
    overlay.style.pointerEvents = 'none';
    overlay.style.transition = 'all 200ms ease';
    overlay.style.zIndex = '2';
    overlayParent.appendChild(overlay);
    rangeOverlayRef.current = overlay;

    // Suppress unused-var warning for watermark import reservation
    void createImageWatermark;

    // Subscribe to visibleRange changes so we can reposition the overlay
    const repositionOverlay = () => repositionRangeOverlay({
      chart, series,
      overlay: rangeOverlayRef.current!,
      container,
      today: payloadRef.current?.today ?? null,
    });
    chart.timeScale().subscribeVisibleTimeRangeChange(repositionOverlay);
    // Also reposition on window resize
    const ro = new ResizeObserver(repositionOverlay);
    ro.observe(container);

    return () => {
      ro.disconnect();
      chart.timeScale().unsubscribeVisibleTimeRangeChange(repositionOverlay);
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      markersApiRef.current = null;
      priceLinesRef.current = [];
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      rangeOverlayRef.current = null;
    };
  }, [decimals]);

  // Keep a ref to the latest payload so the overlay reposition callback
  // (closed over at chart-create time) can read current data.
  const payloadRef = useRef<OrbCandlesPayload | null>(null);
  useEffect(() => { payloadRef.current = payload; }, [payload]);

  // Render data + overlays when payload changes
  useEffect(() => {
    const chart = chartRef.current;
    const series = seriesRef.current;
    if (!chart || !series || !payload) return;

    const data: CandlestickData<UTCTimestamp>[] = payload.candles.map((c) => ({
      time: c.time as UTCTimestamp,
      open: c.open, high: c.high, low: c.low, close: c.close,
    }));
    series.setData(data);

    // Break markers (arrow at the break candle)
    if (markersApiRef.current) {
      const markers: SeriesMarker<Time>[] = [];
      for (const sig of [payload.today.london, payload.today.newyork]) {
        if (sig?.signalType && sig.signalAtUnix) {
          // Marker goes on the break candle — use signalAtUnix - 15min = open time
          const openTime = (sig.signalAtUnix - 15 * 60) as UTCTimestamp;
          markers.push({
            time: openTime,
            position: sig.signalType === 'long' ? 'belowBar' : 'aboveBar',
            color: sig.signalType === 'long' ? '#00ff9d' : '#ff3d57',
            shape: sig.signalType === 'long' ? 'arrowUp' : 'arrowDown',
            size: 1.4,
            text: `${sig.session === 'london' ? 'LDN' : 'NY'} ${sig.signalType === 'long' ? '▲' : '▼'}`,
          });
        }
      }
      markersApiRef.current.setMarkers(markers);
    }

    // Clear + redraw price lines (trade plan levels)
    for (const pl of priceLinesRef.current) series.removePriceLine(pl);
    priceLinesRef.current = [];

    const addLine = (price: number, title: string, color: string, style: LineStyle, width: 1 | 2 = 1) => {
      const pl = series.createPriceLine({ price, color, lineStyle: style, lineWidth: width, axisLabelVisible: true, title });
      priceLinesRef.current.push(pl);
    };

    // Draw levels for whichever session has a signal (prefer the more recent one)
    const activeSignal =
      (payload.today.newyork?.signalType ? payload.today.newyork : null) ??
      (payload.today.london?.signalType ? payload.today.london : null);

    if (activeSignal?.tradePlan) {
      const tag = activeSignal.session === 'london' ? 'LDN' : 'NY';
      addLine(activeSignal.tradePlan.entry,        `${tag} Entry`, '#fafafa', LineStyle.Solid,  2);
      addLine(activeSignal.tradePlan.stopLoss,     `${tag} SL · 1R`, '#ff3d57', LineStyle.Solid, 2);
      addLine(activeSignal.tradePlan.takeProfit1,  `${tag} TP · 2R`, '#00ff9d', LineStyle.Solid, 2);
      addLine(activeSignal.tradePlan.takeProfit2,  `${tag} TP · 3R`, '#00e5ff', LineStyle.Dashed, 1);
    }

    // Also show range boundaries as dashed lines for any session that has a range
    for (const sig of [payload.today.london, payload.today.newyork]) {
      if (sig?.range && sig.range.high > 0) {
        const tag = sig.session === 'london' ? 'LDN' : 'NY';
        const color = SESSION_BORDER[sig.session];
        addLine(sig.range.high, `${tag} range hi`, color, LineStyle.Dotted);
        addLine(sig.range.low,  `${tag} range lo`, color, LineStyle.Dotted);
      }
    }

    // Fit view to include today's session
    chart.timeScale().fitContent();

    // Position the overlay rectangle
    if (rangeOverlayRef.current && containerRef.current) {
      repositionRangeOverlay({
        chart, series,
        overlay: rangeOverlayRef.current,
        container: containerRef.current,
        today: payload.today,
      });
    }
  }, [payload]);

  const aPlusToday = [payload?.today.london, payload?.today.newyork].filter((s) => s?.quality === 'A_PLUS').length;

  return (
    <section className="glass-premium rounded-2xl p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <div className="flex items-center gap-2">
          <BarChart2 size={14} className="text-neon-purple" />
          <h2 className="text-[11px] uppercase tracking-[0.18em] text-terminal-muted font-semibold">
            {symbol} · ORB live chart
          </h2>
          {aPlusToday > 0 && (
            <span className="text-[9px] font-bold uppercase tracking-[0.14em] px-1.5 py-0.5 rounded" style={{ color: '#00ff9d', background: '#00ff9d15', border: '1px solid #00ff9d30' }}>
              ⚡ A+ today
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setRefreshing(true);
              api.get<OrbCandlesPayload>(`/orb/candles/${symbol}`).then((r) => {
                if (r.data) { setPayload(r.data); setLastLoaded(Date.now()); }
                setRefreshing(false);
              });
            }}
            disabled={refreshing}
            className="inline-flex items-center gap-1 rounded-lg border border-neon-cyan/25 bg-neon-cyan/5 px-2 py-1 text-[10px] font-semibold text-neon-cyan hover:bg-neon-cyan/15 transition-colors disabled:opacity-60"
            aria-label="Refresh ORB chart"
          >
            <RefreshCw size={10} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="relative w-full rounded-xl overflow-hidden border border-terminal-border/40 bg-terminal-bg/40" style={{ height }}>
        <div ref={containerRef} className="absolute inset-0" />
        {loading && !payload && (
          <div className="absolute inset-0 flex items-center justify-center bg-terminal-surface/30 animate-pulse pointer-events-none">
            <span className="text-[11px] text-terminal-muted">Loading ORB chart…</span>
          </div>
        )}
        {error && !payload && (
          <div className="absolute inset-0 flex items-center justify-center bg-neon-red/[0.04]">
            <p className="text-[11px] text-neon-red">{error}</p>
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[10px] text-terminal-muted">
        <Legend tint={SESSION_TINT.london}    border={SESSION_BORDER.london}    label="London opening range" />
        <Legend tint={SESSION_TINT.newyork}   border={SESSION_BORDER.newyork}   label="NY opening range" />
        <span className="inline-flex items-center gap-1"><Target size={9} className="text-neon-amber" /><span>Break arrow at candle close</span></span>
        <span className="inline-flex items-center gap-1"><span className="inline-block w-3 h-[1px] bg-white" /><span>Entry</span></span>
        <span className="inline-flex items-center gap-1"><span className="inline-block w-3 h-[1px] bg-neon-red" /><span>SL · 1R</span></span>
        <span className="inline-flex items-center gap-1"><span className="inline-block w-3 h-[1px] bg-neon-green" /><span>TP · 2R</span></span>
        {lastLoaded && (
          <span className="ml-auto font-mono-nums text-[9px]">
            Updated {new Date(lastLoaded).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>
    </section>
  );
}

function Legend({ tint, border, label }: { tint: string; border: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="inline-block w-3 h-2 rounded-sm" style={{ background: tint, border: `1px solid ${border}` }} />
      <span>{label}</span>
    </span>
  );
}

// ── Range rectangle overlay positioning ──────────────────────────

interface RepositionArgs {
  chart: IChartApi;
  series: ISeriesApi<'Candlestick'>;
  overlay: HTMLDivElement;
  container: HTMLElement;
  today: { london: OrbSignal | null; newyork: OrbSignal | null } | null;
}

/** Reads the chart's time scale + price scale to position a set of
 *  translucent rectangles representing today's session ranges. Called on
 *  data changes and on visible-range-changes (pan/zoom). */
function repositionRangeOverlay({ chart, series, overlay, container, today }: RepositionArgs): void {
  // Clear any existing children
  while (overlay.firstChild) overlay.removeChild(overlay.firstChild);
  if (!today) return;

  const ts = chart.timeScale();
  const visible = ts.getVisibleRange();
  if (!visible) return;

  const rect = container.getBoundingClientRect();

  for (const sig of [today.london, today.newyork]) {
    if (!sig || !sig.range.formedAtUnix || sig.range.high <= 0) continue;

    // Range spans the two opening candles: starts at session open, ends 30 min later.
    const session = sig.session;
    const startTime = (sig.range.formedAtUnix - 30 * 60) as UTCTimestamp;
    const endTime   = sig.range.formedAtUnix as UTCTimestamp;

    const xStart = ts.timeToCoordinate(startTime);
    const xEnd   = ts.timeToCoordinate(endTime);
    if (xStart === null || xEnd === null) continue;

    const yHigh = series.priceToCoordinate(sig.range.high);
    const yLow  = series.priceToCoordinate(sig.range.low);
    if (yHigh === null || yLow === null) continue;

    const box = document.createElement('div');
    box.style.position = 'absolute';
    box.style.left = `${Math.min(xStart, xEnd)}px`;
    box.style.top = `${Math.min(yHigh, yLow)}px`;
    box.style.width = `${Math.max(2, Math.abs(xEnd - xStart))}px`;
    box.style.height = `${Math.max(2, Math.abs(yLow - yHigh))}px`;
    box.style.background = SESSION_TINT[session];
    box.style.border = `1px solid ${SESSION_BORDER[session]}`;
    box.style.borderRadius = '2px';
    box.style.pointerEvents = 'none';

    // Label
    const label = document.createElement('div');
    label.textContent = session === 'london' ? 'LDN' : 'NY';
    label.style.position = 'absolute';
    label.style.top = '2px';
    label.style.left = '4px';
    label.style.fontSize = '9px';
    label.style.fontFamily = 'IBM Plex Mono, ui-monospace, monospace';
    label.style.fontWeight = '700';
    label.style.letterSpacing = '0.1em';
    label.style.color = SESSION_BORDER[session];
    box.appendChild(label);

    overlay.appendChild(box);
  }
  void rect;
}
