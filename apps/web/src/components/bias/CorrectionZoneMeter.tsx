// Vertical retracement meter. Shows the impulse range, each Fib level
// (25/38/50/62/79), the optimal band (38–62%) highlighted, and a bright
// marker at the current retracement depth. If no impulse is known, the
// meter renders a slim "no active correction" placeholder.
import type { CorrectionModule, MarketStateKind } from '@edgerelay/shared';

interface CorrectionZoneMeterProps {
  correction: CorrectionModule;
  marketState: MarketStateKind;
  decimals?: number;
  height?: number;
}

export function CorrectionZoneMeter({
  correction,
  marketState,
  decimals = 2,
  height = 280,
}: CorrectionZoneMeterProps) {
  if (!correction.impulseRange || !correction.retracementLevels || correction.currentDepth === null) {
    return (
      <div className="rounded-xl border border-terminal-border bg-terminal-surface/40 px-4 py-5 text-center">
        <p className="text-[10px] uppercase tracking-[0.18em] text-terminal-muted font-semibold">
          Correction Zone
        </p>
        <p className="text-[11px] text-slate-500 mt-2">No active correction to measure.</p>
      </div>
    );
  }

  const { impulseRange, retracementLevels, currentDepth, inOptimalZone } = correction;
  const uptrend = marketState === 'UPTREND';

  // In both trends, depth = 0 at the latest extreme, 100 at the pre-impulse extreme.
  // UI shows the latest extreme at the top when uptrend, at the top when downtrend too
  // (so visually "top" always means "where the Indication broke out to"), and the
  // pre-impulse extreme at the bottom.
  const topLabel = uptrend ? 'Swing High (impulse top)' : 'Swing High (pre-impulse)';
  const bottomLabel = uptrend ? 'Swing Low (pre-impulse)' : 'Swing Low (impulse bottom)';
  const topPrice = impulseRange.high;
  const bottomPrice = impulseRange.low;

  const fmt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

  // Visual: top = 0% retraced, bottom = 100% retraced (consistent for uptrend).
  // For downtrend, invert so "top" still means "where the impulse finished" (the low),
  // which means bigger depth = closer to the top in visual space. Swap accordingly.
  // Simpler: we always draw top = 0% depth (fresh extreme), bottom = 100% depth.
  const yForDepth = (depthPct: number) => (depthPct / 100) * height;

  const levels = [
    { pct: 0,   price: uptrend ? topPrice : bottomPrice, label: '0%',  faint: true },
    { pct: 25,  price: uptrend ? retracementLevels.r25 : retracementLevels.r25, label: '25%' },
    { pct: 38.2,price: retracementLevels.r38, label: '38%' },
    { pct: 50,  price: retracementLevels.r50, label: '50%' },
    { pct: 61.8,price: retracementLevels.r62, label: '62%' },
    { pct: 78.6,price: retracementLevels.r79, label: '79%' },
    { pct: 100, price: uptrend ? bottomPrice : topPrice, label: '100%', faint: true },
  ];

  return (
    <div className="rounded-xl border border-terminal-border bg-terminal-surface/30 p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] uppercase tracking-[0.18em] text-terminal-muted font-semibold">
          Correction Zone
        </p>
        <span
          className="text-[10px] font-mono-nums font-bold px-2 py-0.5 rounded"
          style={{
            color: inOptimalZone ? '#00e5ff' : '#a3a3a3',
            background: inOptimalZone ? '#00e5ff15' : '#1a1a1a',
            border: `1px solid ${inOptimalZone ? '#00e5ff30' : '#262626'}`,
          }}
        >
          {currentDepth}% depth
        </span>
      </div>

      <div className="relative flex gap-3" style={{ height }}>
        {/* Axis column */}
        <div className="relative w-12 flex-shrink-0">
          {/* Top & bottom extreme labels */}
          <div className="absolute inset-0">
            {/* Optimal band 38-62 */}
            <div
              className="absolute left-0 right-0"
              style={{
                top: yForDepth(38),
                height: yForDepth(62 - 38),
                background: 'linear-gradient(to right, #00e5ff12, #00e5ff06)',
                borderTop: '1px dashed #00e5ff40',
                borderBottom: '1px dashed #00e5ff40',
              }}
            />

            {/* Vertical spine */}
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-terminal-border" />

            {/* Tick marks + depth labels */}
            {levels.map((lvl) => (
              <div
                key={lvl.label}
                className="absolute left-0 right-0"
                style={{ top: yForDepth(lvl.pct), transform: 'translateY(-50%)' }}
              >
                <div className="flex items-center gap-1">
                  <span
                    className="h-px"
                    style={{
                      width: lvl.faint ? 14 : 18,
                      background: lvl.faint ? '#404040' : '#525252',
                    }}
                  />
                  <span
                    className={`font-mono-nums ${lvl.faint ? 'text-[9px] text-terminal-muted/60' : 'text-[10px] text-terminal-muted'}`}
                  >
                    {lvl.label}
                  </span>
                </div>
              </div>
            ))}

            {/* Current depth marker */}
            <div
              className="absolute left-0 right-0 z-10"
              style={{
                top: yForDepth(Math.max(0, Math.min(100, currentDepth))),
                transform: 'translateY(-50%)',
                transition: 'top 600ms cubic-bezier(0.33, 1, 0.68, 1)',
              }}
            >
              <div className="flex items-center gap-1">
                <div
                  className="h-2 w-2 rounded-full"
                  style={{
                    background: inOptimalZone ? '#00e5ff' : '#fafafa',
                    boxShadow: `0 0 8px ${inOptimalZone ? '#00e5ff' : '#ffffff'}80`,
                  }}
                />
                <span
                  className="text-[9px] font-mono-nums font-bold"
                  style={{ color: inOptimalZone ? '#00e5ff' : '#fafafa' }}
                >
                  ●
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Price column */}
        <div className="relative flex-1">
          {levels.map((lvl) => (
            <div
              key={lvl.label}
              className="absolute left-0 right-0 flex items-center justify-between"
              style={{ top: yForDepth(lvl.pct), transform: 'translateY(-50%)' }}
            >
              <span
                className={`font-mono-nums ${lvl.faint ? 'text-[10px] text-terminal-muted/70' : 'text-[11px] text-slate-300'}`}
              >
                {fmt(lvl.price)}
              </span>
              {lvl.pct === 38.2 && (
                <span className="text-[8px] uppercase tracking-[0.15em] text-neon-cyan/70 font-semibold">
                  Optimal ▲
                </span>
              )}
              {lvl.pct === 61.8 && (
                <span className="text-[8px] uppercase tracking-[0.15em] text-neon-cyan/70 font-semibold">
                  Optimal ▼
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 text-[10px] text-terminal-muted flex items-center justify-between">
        <span className="font-mono-nums">{topLabel}</span>
        <span className="font-mono-nums">{bottomLabel}</span>
      </div>
    </div>
  );
}
