import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface Session {
  name: string;
  city: string;
  openUTC: number;
  closeUTC: number;
  color: string;
  instruments: string;
}

const SESSIONS: Session[] = [
  { name: 'Sydney', city: 'Sydney', openUTC: 21, closeUTC: 6, color: '#b18cff', instruments: 'AUD, NZD' },
  { name: 'Tokyo', city: 'Tokyo', openUTC: 0, closeUTC: 9, color: '#ff3d57', instruments: 'JPY, Nikkei' },
  { name: 'London', city: 'London', openUTC: 7, closeUTC: 16, color: '#00e5ff', instruments: 'EUR, GBP, Gold' },
  { name: 'New York', city: 'New York', openUTC: 12, closeUTC: 21, color: '#00ff9d', instruments: 'USD, Indices, Oil' },
];

function isOpen(s: Session, h: number): boolean {
  if (s.openUTC < s.closeUTC) return h >= s.openUTC && h < s.closeUTC;
  return h >= s.openUTC || h < s.closeUTC;
}

export function SessionStatusBar() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const utcH = now.getUTCHours();
  const utcTime = now.toISOString().slice(11, 19);
  const activeSessions = SESSIONS.filter(s => isOpen(s, utcH));
  const isOverlap = activeSessions.length >= 2;

  return (
    <div className="rounded-2xl border border-terminal-border/40 bg-terminal-card/20 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-terminal-border/20 px-5 py-3">
        <div className="flex items-center gap-2">
          <Clock size={14} className="text-neon-cyan" />
          <span className="text-sm font-semibold text-white">Market Sessions</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono-nums text-lg font-bold text-neon-cyan tracking-wider">{utcTime}</span>
          <span className="font-mono-nums text-[10px] text-terminal-muted">UTC</span>
        </div>
      </div>

      {/* Sessions grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-0 divide-x divide-terminal-border/15">
        {SESSIONS.map(s => {
          const active = isOpen(s, utcH);
          return (
            <div key={s.name} className={`p-4 transition-all ${active ? '' : 'opacity-40'}`}>
              <div className="flex items-center gap-2 mb-1.5">
                <span className={`h-2.5 w-2.5 rounded-full ${active ? 'animate-pulse' : ''}`}
                  style={{ backgroundColor: active ? s.color : '#6b7f9540', boxShadow: active ? `0 0 8px ${s.color}60` : 'none' }} />
                <span className="text-sm font-semibold text-white">{s.city}</span>
              </div>
              <p className="font-mono-nums text-[10px] text-terminal-muted">
                {String(s.openUTC).padStart(2, '0')}:00 – {String(s.closeUTC).padStart(2, '0')}:00 UTC
              </p>
              <p className="text-[10px] text-terminal-muted mt-0.5">{s.instruments}</p>
              <p className="mt-1.5 font-mono-nums text-[11px] font-semibold" style={{ color: active ? s.color : '#6b7f95' }}>
                {active ? 'OPEN' : 'CLOSED'}
              </p>
            </div>
          );
        })}
      </div>

      {/* Overlap indicator */}
      {isOverlap && (
        <div className="border-t border-neon-amber/15 bg-neon-amber/[0.03] px-5 py-2 text-center">
          <span className="font-mono-nums text-[11px] text-neon-amber">
            ⚡ Session Overlap — {activeSessions.map(s => s.name).join(' + ')} — Peak Volume
          </span>
        </div>
      )}
    </div>
  );
}
