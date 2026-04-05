import { useState, useEffect } from 'react';
import { Globe, Clock } from 'lucide-react';

interface Session {
  name: string;
  openUTC: number;
  closeUTC: number;
  color: string;
  city: string;
  instruments: string;
}

const SESSIONS: Session[] = [
  { name: 'Sydney', openUTC: 21, closeUTC: 6, color: '#b18cff', city: 'Sydney', instruments: 'AUD, NZD pairs' },
  { name: 'Tokyo', openUTC: 0, closeUTC: 9, color: '#ff3d57', city: 'Tokyo', instruments: 'JPY pairs, Nikkei' },
  { name: 'London', openUTC: 7, closeUTC: 16, color: '#00e5ff', city: 'London', instruments: 'EUR, GBP, Gold' },
  { name: 'New York', openUTC: 12, closeUTC: 21, color: '#00ff9d', city: 'New York', instruments: 'USD pairs, Indices, Oil' },
];

function isSessionActive(session: Session, hour: number): boolean {
  if (session.openUTC < session.closeUTC) {
    return hour >= session.openUTC && hour < session.closeUTC;
  }
  return hour >= session.openUTC || hour < session.closeUTC;
}

export function SessionTimezoneMap() {
  const [utcHour, setUtcHour] = useState(new Date().getUTCHours());

  useEffect(() => {
    const interval = setInterval(() => setUtcHour(new Date().getUTCHours()), 60000);
    return () => clearInterval(interval);
  }, []);

  const activeSessions = SESSIONS.filter((s) => isSessionActive(s, utcHour));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Globe size={16} className="text-neon-cyan" />
          <h4 className="text-sm font-semibold text-white">Live Trading Sessions</h4>
        </div>
        <div className="flex items-center gap-1.5 font-mono-nums text-[11px] text-terminal-muted">
          <Clock size={12} />
          {String(utcHour).padStart(2, '0')}:00 UTC
        </div>
      </div>

      {/* 24-hour timeline */}
      <div className="rounded-xl border border-terminal-border/20 bg-terminal-bg/50 p-4">
        {/* Hour markers */}
        <div className="flex justify-between mb-1 font-mono-nums text-[8px] text-terminal-muted/50">
          {[0, 3, 6, 9, 12, 15, 18, 21].map((h) => (
            <span key={h}>{String(h).padStart(2, '0')}</span>
          ))}
        </div>

        {/* Session bars */}
        <div className="space-y-2">
          {SESSIONS.map((session) => {
            const active = isSessionActive(session, utcHour);
            // Calculate bar position
            let startPct: number;
            let widthPct: number;

            if (session.openUTC < session.closeUTC) {
              startPct = (session.openUTC / 24) * 100;
              widthPct = ((session.closeUTC - session.openUTC) / 24) * 100;
            } else {
              startPct = (session.openUTC / 24) * 100;
              widthPct = ((24 - session.openUTC + session.closeUTC) / 24) * 100;
            }

            return (
              <div key={session.name} className="flex items-center gap-2">
                <span className="w-14 font-mono-nums text-[10px] text-terminal-muted shrink-0">{session.name}</span>
                <div className="flex-1 relative h-5 rounded-full bg-terminal-border/10">
                  {/* Session bar */}
                  <div
                    className="absolute top-0 h-full rounded-full transition-all duration-500"
                    style={{
                      left: `${startPct}%`,
                      width: `${Math.min(widthPct, 100 - startPct)}%`,
                      backgroundColor: active ? `${session.color}40` : `${session.color}15`,
                      border: active ? `1px solid ${session.color}60` : `1px solid ${session.color}20`,
                      boxShadow: active ? `0 0 8px ${session.color}30` : 'none',
                    }}
                  />
                  {/* Wrap-around for Sydney */}
                  {session.openUTC > session.closeUTC && (
                    <div
                      className="absolute top-0 h-full rounded-full transition-all duration-500"
                      style={{
                        left: 0,
                        width: `${(session.closeUTC / 24) * 100}%`,
                        backgroundColor: active ? `${session.color}40` : `${session.color}15`,
                        border: active ? `1px solid ${session.color}60` : `1px solid ${session.color}20`,
                      }}
                    />
                  )}
                  {/* Current hour marker */}
                  <div
                    className="absolute top-0 h-full w-0.5 bg-white/60"
                    style={{ left: `${(utcHour / 24) * 100}%` }}
                  />
                </div>
                <span className={`w-6 text-center font-mono-nums text-[9px] font-bold ${active ? '' : 'text-terminal-muted/40'}`} style={active ? { color: session.color } : undefined}>
                  {active ? 'ON' : 'OFF'}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Active session cards */}
      <div className="grid grid-cols-2 gap-2">
        {SESSIONS.map((session) => {
          const active = isSessionActive(session, utcHour);
          return (
            <div
              key={session.name}
              className={`rounded-xl border p-3 transition-all ${active ? '' : 'opacity-40'}`}
              style={{
                borderColor: active ? `${session.color}30` : '#151d2840',
                backgroundColor: active ? `${session.color}08` : 'transparent',
              }}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className={`h-2 w-2 rounded-full ${active ? 'animate-pulse' : ''}`} style={{ backgroundColor: session.color }} />
                <span className="text-[12px] font-semibold text-white">{session.city}</span>
              </div>
              <p className="font-mono-nums text-[10px] text-terminal-muted">
                {String(session.openUTC).padStart(2, '0')}:00 – {String(session.closeUTC).padStart(2, '0')}:00 UTC
              </p>
              <p className="text-[10px] text-terminal-muted mt-0.5">{session.instruments}</p>
            </div>
          );
        })}
      </div>

      {/* Overlap highlight */}
      {activeSessions.length >= 2 && (
        <div className="rounded-xl border border-neon-amber/20 bg-neon-amber/[0.04] p-3">
          <p className="text-[12px] text-neon-amber font-semibold">
            Session Overlap Active — {activeSessions.map((s) => s.name).join(' + ')}
          </p>
          <p className="text-[11px] text-terminal-muted mt-0.5">
            Overlaps produce the highest volume and cleanest price action. This is when most profitable trades occur.
          </p>
        </div>
      )}
    </div>
  );
}
