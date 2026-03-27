// apps/web/src/components/dashboard/MarketHoursWidget.tsx
import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface Session {
  name: string;
  flag: string;
  openHour: number;  // UTC hour
  closeHour: number; // UTC hour
  wrapsDay: boolean; // true if open > close (e.g., Sydney 21→06)
}

const SESSIONS: Session[] = [
  { name: 'Sydney', flag: '🇦🇺', openHour: 21, closeHour: 6, wrapsDay: true },
  { name: 'Tokyo', flag: '🇯🇵', openHour: 0, closeHour: 9, wrapsDay: false },
  { name: 'London', flag: '🇬🇧', openHour: 7, closeHour: 16, wrapsDay: false },
  { name: 'New York', flag: '🇺🇸', openHour: 12, closeHour: 21, wrapsDay: false },
];

function isSessionOpen(session: Session, utcHour: number): boolean {
  if (session.wrapsDay) {
    return utcHour >= session.openHour || utcHour < session.closeHour;
  }
  return utcHour >= session.openHour && utcHour < session.closeHour;
}

function getSessionProgress(session: Session, utcHour: number, utcMinute: number): number {
  if (!isSessionOpen(session, utcHour)) return 0;
  const totalMinutes = session.wrapsDay
    ? (24 - session.openHour + session.closeHour) * 60
    : (session.closeHour - session.openHour) * 60;
  let elapsed: number;
  if (session.wrapsDay) {
    elapsed = utcHour >= session.openHour
      ? (utcHour - session.openHour) * 60 + utcMinute
      : (24 - session.openHour + utcHour) * 60 + utcMinute;
  } else {
    elapsed = (utcHour - session.openHour) * 60 + utcMinute;
  }
  return Math.min(elapsed / totalMinutes, 1);
}

function isWeekend(now: Date): boolean {
  const day = now.getUTCDay();
  const hour = now.getUTCHours();
  // Market closed from Friday 21:00 UTC to Sunday 21:00 UTC
  if (day === 6) return true; // Saturday
  if (day === 0 && hour < 21) return true; // Sunday before 21:00
  if (day === 5 && hour >= 21) return true; // Friday after 21:00
  return false;
}

function getNextEvent(utcHour: number): string {
  // Find next session open/close
  const events: { label: string; hoursAway: number }[] = [];
  for (const s of SESSIONS) {
    const openDiff = (s.openHour - utcHour + 24) % 24;
    const closeDiff = (s.closeHour - utcHour + 24) % 24;
    if (openDiff > 0 && openDiff <= 12) {
      events.push({ label: `${s.name} opens`, hoursAway: openDiff });
    }
    if (closeDiff > 0 && closeDiff <= 12 && isSessionOpen(s, utcHour)) {
      events.push({ label: `${s.name} closes`, hoursAway: closeDiff });
    }
  }
  events.sort((a, b) => a.hoursAway - b.hoursAway);
  if (events.length === 0) return '';
  const next = events[0];
  const h = Math.floor(next.hoursAway);
  const m = Math.round((next.hoursAway - h) * 60);
  return `Next: ${next.label} in ${h}h ${m}m`;
}

export function MarketHoursWidget() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const utcHour = now.getUTCHours();
  const utcMinute = now.getUTCMinutes();
  const weekend = isWeekend(now);

  return (
    <div className="glass-premium border-gradient rounded-2xl p-5 animate-fade-in-up">
      <div className="flex items-center gap-2 mb-4">
        <Clock size={14} className="text-neon-cyan" />
        <h3 className="text-xs font-bold uppercase tracking-widest text-neon-cyan">
          Market Hours
        </h3>
      </div>

      {weekend ? (
        <div className="text-center py-4">
          <p className="text-sm text-terminal-muted">Market Closed</p>
          <p className="text-xs text-terminal-muted/60 mt-1">Opens Sunday 21:00 UTC</p>
        </div>
      ) : (
        <div className="space-y-3">
          {SESSIONS.map((session) => {
            const open = isSessionOpen(session, utcHour);
            const progress = getSessionProgress(session, utcHour, utcMinute);
            return (
              <div key={session.name} className="flex items-center gap-3">
                <span className="text-sm w-5">{session.flag}</span>
                <span className={`text-xs font-medium w-16 ${open ? 'text-slate-200' : 'text-terminal-muted/50'}`}>
                  {session.name}
                </span>
                {/* Progress bar */}
                <div className="flex-1 h-1.5 rounded-full bg-terminal-border/30 overflow-hidden">
                  {open && (
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-1000"
                      style={{ width: `${progress * 100}%` }}
                    />
                  )}
                </div>
                <span className={`text-[10px] font-semibold w-12 text-right ${open ? 'text-emerald-400' : 'text-terminal-muted/40'}`}>
                  {open ? 'Open' : 'Closed'}
                </span>
              </div>
            );
          })}
          <p className="text-[10px] text-terminal-muted/60 pt-1">
            {getNextEvent(utcHour)}
          </p>
        </div>
      )}
    </div>
  );
}
