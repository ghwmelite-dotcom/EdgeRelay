import { useState, useEffect, useRef } from 'react';
import { Timer, AlertTriangle, Zap } from 'lucide-react';

interface Props {
  enabled: boolean;
  /** Seconds allowed */
  duration: number;
  isFinished: boolean;
  onTimeUp: () => void;
}

const PRESETS = [
  { label: '3 min', value: 180 },
  { label: '5 min', value: 300 },
  { label: '10 min', value: 600 },
  { label: '15 min', value: 900 },
];

export function ICCTimePressure({ enabled, duration, isFinished, onTimeUp }: Props) {
  const [remaining, setRemaining] = useState(duration);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasCalledTimeUp = useRef(false);

  useEffect(() => {
    setRemaining(duration);
    hasCalledTimeUp.current = false;
  }, [duration]);

  useEffect(() => {
    if (!enabled || isFinished) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    // Timer counts down when playing OR when user is actively marking (always ticking once enabled)
    intervalRef.current = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          if (!hasCalledTimeUp.current) {
            hasCalledTimeUp.current = true;
            onTimeUp();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [enabled, isFinished, onTimeUp]);

  if (!enabled) return null;

  const pct = (remaining / duration) * 100;
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const isLow = remaining <= 30;
  const isCritical = remaining <= 10;

  return (
    <div className={`flex items-center gap-2 rounded-xl border px-3 py-2 transition-all ${
      isCritical
        ? 'border-neon-red/50 bg-neon-red/10 animate-pulse'
        : isLow
          ? 'border-neon-amber/40 bg-neon-amber/[0.06]'
          : 'border-terminal-border/30 bg-terminal-card/20'
    }`}>
      {isCritical ? (
        <AlertTriangle size={14} className="text-neon-red shrink-0" />
      ) : isLow ? (
        <Zap size={14} className="text-neon-amber shrink-0" />
      ) : (
        <Timer size={14} className="text-neon-cyan shrink-0" />
      )}

      <div className="flex-1 h-1.5 rounded-full bg-terminal-border/20 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${
            isCritical ? 'bg-neon-red/70' : isLow ? 'bg-neon-amber/60' : 'bg-neon-cyan/50'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <span className={`font-mono-nums text-sm font-bold tabular-nums min-w-[48px] text-right ${
        isCritical ? 'text-neon-red' : isLow ? 'text-neon-amber' : 'text-neon-cyan'
      }`}>
        {mins}:{secs.toString().padStart(2, '0')}
      </span>

      {remaining === 0 && (
        <span className="font-mono-nums text-[9px] text-neon-red uppercase tracking-wider">Time&apos;s up!</span>
      )}
    </div>
  );
}

export function TimePressureSelector({ value, onChange, enabled, onToggle }: {
  value: number;
  onChange: (v: number) => void;
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onToggle}
        className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] font-semibold cursor-pointer transition-all ${
          enabled
            ? 'bg-neon-amber/15 border border-neon-amber/30 text-neon-amber'
            : 'border border-terminal-border/20 text-terminal-muted hover:text-white'
        }`}
      >
        <Timer size={12} /> Time Pressure
      </button>
      {enabled && (
        <div className="flex gap-1">
          {PRESETS.map(p => (
            <button
              key={p.value}
              onClick={() => onChange(p.value)}
              className={`rounded-md px-2 py-1 font-mono-nums text-[9px] cursor-pointer ${
                value === p.value
                  ? 'bg-neon-amber/15 border border-neon-amber/30 text-neon-amber'
                  : 'text-terminal-muted hover:text-white'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
