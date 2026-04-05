interface CurrencyData {
  high: number;
  medium: number;
  total: number;
}

interface Props {
  byCurrency: Record<string, CurrencyData>;
}

const CURRENCIES = [
  { code: 'USD', flag: '🇺🇸', name: 'US Dollar' },
  { code: 'EUR', flag: '🇪🇺', name: 'Euro' },
  { code: 'GBP', flag: '🇬🇧', name: 'British Pound' },
  { code: 'JPY', flag: '🇯🇵', name: 'Japanese Yen' },
  { code: 'CHF', flag: '🇨🇭', name: 'Swiss Franc' },
  { code: 'AUD', flag: '🇦🇺', name: 'Australian Dollar' },
  { code: 'NZD', flag: '🇳🇿', name: 'New Zealand Dollar' },
  { code: 'CAD', flag: '🇨🇦', name: 'Canadian Dollar' },
];

function getHeatColor(high: number, total: number): { bg: string; border: string; text: string; label: string } {
  if (high >= 3) return { bg: 'bg-neon-red/10', border: 'border-neon-red/30', text: 'text-neon-red', label: 'High Volatility' };
  if (high >= 1) return { bg: 'bg-neon-amber/10', border: 'border-neon-amber/25', text: 'text-neon-amber', label: 'Elevated' };
  if (total >= 2) return { bg: 'bg-neon-cyan/[0.06]', border: 'border-neon-cyan/20', text: 'text-neon-cyan', label: 'Moderate' };
  return { bg: 'bg-terminal-card/30', border: 'border-terminal-border/25', text: 'text-terminal-muted', label: 'Calm' };
}

export function CurrencyHeatMap({ byCurrency }: Props) {
  return (
    <div className="rounded-2xl border border-terminal-border/40 bg-terminal-card/20 overflow-hidden">
      <div className="flex items-center justify-between border-b border-terminal-border/20 px-5 py-3">
        <span className="text-sm font-semibold text-white">Currency Heat Map</span>
        <span className="font-mono-nums text-[10px] text-terminal-muted">Based on upcoming events</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-4">
        {CURRENCIES.map(c => {
          const data = byCurrency[c.code] || { high: 0, medium: 0, total: 0 };
          const heat = getHeatColor(data.high, data.total);

          return (
            <div key={c.code} className={`rounded-xl border p-3 ${heat.bg} ${heat.border} transition-all`}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{c.flag}</span>
                <span className="font-mono-nums text-sm font-bold text-white">{c.code}</span>
              </div>
              <div className="flex items-center gap-2 font-mono-nums text-[10px]">
                {data.high > 0 && (
                  <span className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-neon-red" />
                    <span className="text-neon-red">{data.high} high</span>
                  </span>
                )}
                {data.medium > 0 && (
                  <span className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-neon-amber" />
                    <span className="text-neon-amber">{data.medium} med</span>
                  </span>
                )}
                {data.total === 0 && <span className="text-terminal-muted">No events</span>}
              </div>
              <p className={`mt-1.5 font-mono-nums text-[9px] font-semibold ${heat.text}`}>{heat.label}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
