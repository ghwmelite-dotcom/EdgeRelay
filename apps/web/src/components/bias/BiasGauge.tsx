// Semicircular gauge from -100 (bearish) → 0 → +100 (bullish).
// Needle rotates between -90° and +90°. Colored arc fills from center.
interface BiasGaugeProps {
  score: number;            // -100 to +100
  size?: number;
  label?: string;
  showValue?: boolean;
}

export function BiasGauge({ score, size = 180, label, showValue = true }: BiasGaugeProps) {
  const clamped = Math.max(-100, Math.min(100, score));
  const angle = (clamped / 100) * 90; // degrees from vertical, negative = left

  const w = size;
  const h = size * 0.62;
  const cx = w / 2;
  const cy = h - 8;
  const r = (size / 2) - 14;

  // Arc path from (cx - r, cy) to (cx + r, cy)
  const arcLeft  = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx} ${cy - r}`;
  const arcRight = `M ${cx} ${cy - r} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;

  const needleLen = r - 8;
  const rad = (angle - 90) * (Math.PI / 180);
  const nx = cx + needleLen * Math.cos(rad);
  const ny = cy + needleLen * Math.sin(rad);

  const color =
    clamped > 25 ? '#00ff9d' :
    clamped < -25 ? '#ff3d57' :
    '#a3a3a3';

  const label2 = label ?? (clamped > 25 ? 'BULLISH' : clamped < -25 ? 'BEARISH' : 'NEUTRAL');

  return (
    <div className="flex flex-col items-center">
      <svg width={w} height={h + 20} viewBox={`0 0 ${w} ${h + 20}`}>
        {/* Background arcs */}
        <path d={arcLeft}  stroke="#ff3d5725" strokeWidth={10} fill="none" strokeLinecap="round" />
        <path d={arcRight} stroke="#00ff9d25" strokeWidth={10} fill="none" strokeLinecap="round" />

        {/* Active arc — scaled dasharray to fill from center */}
        {clamped !== 0 && (() => {
          const halfArcLength = Math.PI * r / 2;
          const fill = (Math.abs(clamped) / 100) * halfArcLength;
          const dashArc = clamped > 0 ? arcRight : arcLeft;
          const offset = clamped > 0 ? 0 : halfArcLength - fill;
          return (
            <path
              d={dashArc}
              stroke={color}
              strokeWidth={10}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={`${fill} ${halfArcLength}`}
              strokeDashoffset={-offset}
              style={{
                filter: `drop-shadow(0 0 6px ${color}60)`,
                transition: 'stroke-dasharray 600ms cubic-bezier(0.33, 1, 0.68, 1)',
              }}
            />
          );
        })()}

        {/* Needle */}
        <line
          x1={cx} y1={cy} x2={nx} y2={ny}
          stroke={color}
          strokeWidth={2.5}
          strokeLinecap="round"
          style={{
            transition: 'all 600ms cubic-bezier(0.33, 1, 0.68, 1)',
            filter: `drop-shadow(0 0 4px ${color})`,
          }}
        />
        <circle cx={cx} cy={cy} r={4} fill={color} />

        {/* Tick labels */}
        <text x={cx - r} y={cy + 14} textAnchor="middle" fontSize="9" fill="#525252" fontFamily="ui-monospace, monospace">-100</text>
        <text x={cx + r} y={cy + 14} textAnchor="middle" fontSize="9" fill="#525252" fontFamily="ui-monospace, monospace">+100</text>
        <text x={cx}     y={cy - r - 4} textAnchor="middle" fontSize="9" fill="#525252" fontFamily="ui-monospace, monospace">0</text>
      </svg>
      {showValue && (
        <div className="flex flex-col items-center mt-1 -mt-3">
          <span
            className="font-mono-nums text-3xl font-black"
            style={{ color, textShadow: `0 0 16px ${color}50` }}
          >
            {clamped > 0 ? '+' : ''}{clamped}
          </span>
          <span
            className="text-[10px] uppercase tracking-[0.22em] font-semibold mt-0.5"
            style={{ color }}
          >
            {label2}
          </span>
        </div>
      )}
    </div>
  );
}
