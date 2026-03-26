interface HealthGaugeProps {
  score: number;
  status: 'safe' | 'caution' | 'danger';
  size?: number;
}

const statusColors: Record<HealthGaugeProps['status'], string> = {
  safe: '#00ff9d',
  caution: '#ffb800',
  danger: '#ff3d57',
};

export function HealthGauge({ score, status, size = 100 }: HealthGaugeProps) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - score / 100);
  const color = statusColors[status];
  const filterId = `glow-${status}`;

  return (
    <svg
      viewBox="0 0 100 100"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Health score: ${score} out of 100, status: ${status}`}
    >
      <defs>
        <filter id={filterId} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
          <feFlood floodColor={color} floodOpacity="0.6" result="color" />
          <feComposite in="color" in2="blur" operator="in" result="glow" />
          <feMerge>
            <feMergeNode in="glow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Background circle */}
      <circle
        cx={50}
        cy={50}
        r={radius}
        stroke="#151d28"
        strokeWidth={8}
        fill="none"
      />

      {/* Foreground arc */}
      <circle
        cx={50}
        cy={50}
        r={radius}
        stroke={color}
        strokeWidth={8}
        fill="none"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 50 50)"
        filter={`url(#${filterId})`}
        style={{ transition: 'stroke-dashoffset 0.6s ease-out' }}
      />

      {/* Score number */}
      <text
        x={50}
        y={48}
        textAnchor="middle"
        dominantBaseline="central"
        fill={color}
        fontSize={22}
        fontFamily="var(--font-mono, ui-monospace, monospace)"
        fontWeight={700}
        style={{ fontVariantNumeric: 'tabular-nums' }}
      >
        {score}
      </text>

      {/* /100 label */}
      <text
        x={50}
        y={64}
        textAnchor="middle"
        dominantBaseline="central"
        fill="#64748b"
        fontSize={9}
        fontFamily="var(--font-mono, ui-monospace, monospace)"
      >
        /100
      </text>
    </svg>
  );
}
