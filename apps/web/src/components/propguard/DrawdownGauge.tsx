interface DrawdownGaugeProps {
  current: number;
  limit: number;
  label: string;
  showAbsolute?: boolean;
  absoluteValue?: number;
}

export function DrawdownGauge({ current, limit, label, showAbsolute, absoluteValue }: DrawdownGaugeProps) {
  const ratio = limit > 0 ? Math.min((current / limit) * 100, 100) : 0;

  let barColor = 'bg-emerald-500';
  if (ratio >= 95) barColor = 'bg-red-500';
  else if (ratio >= 80) barColor = 'bg-amber-500';

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-zinc-400">{label}</span>
        <span className="text-zinc-300 font-mono">
          {current.toFixed(2)}% / {limit.toFixed(1)}%
          {showAbsolute && absoluteValue != null && (
            <span className="text-zinc-500 ml-1">(${absoluteValue.toFixed(0)})</span>
          )}
        </span>
      </div>
      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${ratio}%` }}
        />
      </div>
    </div>
  );
}
