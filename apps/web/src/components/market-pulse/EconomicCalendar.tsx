import { useState, useEffect } from 'react';
import { Clock, AlertTriangle, ChevronDown } from 'lucide-react';

interface NewsEvent {
  event_name: string;
  currency: string;
  impact: string;
  event_time: string;
  forecast: string | null;
  previous: string | null;
  actual: string | null;
}

interface Props {
  events: NewsEvent[];
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return 'NOW';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

const CURRENCY_FLAGS: Record<string, string> = {
  USD: '🇺🇸', EUR: '🇪🇺', GBP: '🇬🇧', JPY: '🇯🇵', CHF: '🇨🇭',
  AUD: '🇦🇺', NZD: '🇳🇿', CAD: '🇨🇦', CNY: '🇨🇳',
};

export function EconomicCalendar({ events }: Props) {
  const [now, setNow] = useState(Date.now());
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Group by date
  const grouped: Record<string, NewsEvent[]> = {};
  for (const e of events) {
    const date = e.event_time.slice(0, 10);
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push(e);
  }

  const dates = Object.keys(grouped).sort();
  const visibleDates = showAll ? dates : dates.slice(0, 2);

  return (
    <div className="rounded-2xl border border-terminal-border/40 bg-terminal-card/20 overflow-hidden">
      <div className="flex items-center justify-between border-b border-terminal-border/20 px-5 py-3">
        <div className="flex items-center gap-2">
          <AlertTriangle size={14} className="text-neon-amber" />
          <span className="text-sm font-semibold text-white">Economic Calendar</span>
        </div>
        <span className="font-mono-nums text-[10px] text-terminal-muted">{events.length} events</span>
      </div>

      <div className="divide-y divide-terminal-border/10">
        {visibleDates.map(date => {
          const dayEvents = grouped[date];
          const today = new Date().toISOString().slice(0, 10);
          const isToday = date === today;
          const dayLabel = isToday ? 'Today' : new Date(date + 'T00:00:00Z').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

          return (
            <div key={date}>
              <div className="px-5 py-2 bg-terminal-surface/30">
                <span className={`font-mono-nums text-[11px] font-semibold ${isToday ? 'text-neon-cyan' : 'text-terminal-muted'}`}>
                  {dayLabel}
                </span>
              </div>
              {dayEvents.map((e, i) => {
                const eventTime = new Date(e.event_time.includes('T') ? e.event_time : e.event_time + 'Z').getTime();
                const diff = eventTime - now;
                const isPast = diff < 0;
                const isImminent = diff > 0 && diff < 1800000; // 30 min
                const isUpcoming = diff > 0 && diff < 14400000; // 4 hours

                return (
                  <div key={i} className={`flex items-center gap-3 px-5 py-2.5 ${isImminent ? 'bg-neon-red/[0.03]' : ''}`}>
                    {/* Time */}
                    <span className={`w-12 font-mono-nums text-[11px] shrink-0 ${isPast ? 'text-terminal-muted/50' : 'text-slate-300'}`}>
                      {e.event_time.slice(11, 16) || '—'}
                    </span>

                    {/* Impact dot */}
                    <span className={`h-2 w-2 rounded-full shrink-0 ${e.impact === 'high' ? 'bg-neon-red shadow-[0_0_4px_#ff3d57]' : 'bg-neon-amber shadow-[0_0_4px_#ffb800]'}`} />

                    {/* Currency */}
                    <span className="w-8 font-mono-nums text-[11px] text-terminal-muted shrink-0">
                      {CURRENCY_FLAGS[e.currency] || ''} {e.currency}
                    </span>

                    {/* Event name */}
                    <span className={`flex-1 text-[12px] truncate ${isPast ? 'text-terminal-muted/50' : 'text-slate-300'}`}>
                      {e.event_name}
                    </span>

                    {/* Forecast/Previous */}
                    <div className="hidden sm:flex items-center gap-3 font-mono-nums text-[10px]">
                      {e.forecast && <span className="text-terminal-muted">F: {e.forecast}</span>}
                      {e.previous && <span className="text-terminal-muted">P: {e.previous}</span>}
                      {e.actual && <span className="text-neon-green font-semibold">A: {e.actual}</span>}
                    </div>

                    {/* Countdown */}
                    <div className="w-16 text-right shrink-0">
                      {isPast ? (
                        <span className="font-mono-nums text-[10px] text-terminal-muted/40">passed</span>
                      ) : isUpcoming ? (
                        <span className={`font-mono-nums text-[10px] font-bold ${isImminent ? 'text-neon-red animate-pulse' : 'text-neon-amber'}`}>
                          {formatCountdown(diff)}
                        </span>
                      ) : (
                        <span className="font-mono-nums text-[10px] text-terminal-muted">{formatCountdown(diff)}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {dates.length > 2 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="w-full border-t border-terminal-border/20 px-5 py-2.5 text-center text-[12px] text-terminal-muted hover:text-neon-cyan transition-colors cursor-pointer flex items-center justify-center gap-1"
        >
          {showAll ? 'Show less' : `Show ${dates.length - 2} more days`}
          <ChevronDown size={12} className={showAll ? 'rotate-180' : ''} />
        </button>
      )}
    </div>
  );
}
