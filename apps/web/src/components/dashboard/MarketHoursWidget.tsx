import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

export const FX_SESSIONS = [
  { name: 'Sydney', zone: 'Australia/Sydney', start: 8, end: 17 },
  { name: 'Tokyo', zone: 'Asia/Tokyo', start: 9, end: 18 },
  { name: 'London', zone: 'Europe/London', start: 8, end: 17 },
  { name: 'New York', zone: 'America/New_York', start: 8, end: 17 },
];
function localTime(now: Date, zone: string) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: zone, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now);
  const get = (type: string) => parts.find((part) => part.type === type)!.value;
  return { day: get('weekday'), minute: Number(get('hour')) * 60 + Number(get('minute')) };
}
export function fxWeekend(now: Date) {
  const ny = localTime(now, 'America/New_York');
  return ny.day === 'Sat' || (ny.day === 'Fri' && ny.minute >= 17 * 60) || (ny.day === 'Sun' && ny.minute < 17 * 60);
}
export function fxSessionState(session: typeof FX_SESSIONS[number], now: Date) {
  const local = localTime(now, session.zone);
  const open = !fxWeekend(now) && local.day !== 'Sat' && local.day !== 'Sun' && local.minute >= session.start * 60 && local.minute < session.end * 60;
  return { open, progress: open ? (local.minute - session.start * 60) / ((session.end - session.start) * 60) : 0 };
}
export function MarketHoursWidget() {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const timer = window.setInterval(() => setNow(new Date()), 60_000); return () => window.clearInterval(timer); }, []);
  return <section aria-label="Market hours" className="glass-premium rounded-2xl p-5">
    <h3 className="text-sm font-semibold text-terminal-text flex items-center gap-2 mb-4"><Clock size={14} />Market Hours</h3>
    {fxWeekend(now) ? <p className="text-sm text-terminal-muted">FX weekend closure — typical reopening Sunday 17:00 New York time.</p> : <div className="space-y-3">
      {FX_SESSIONS.map((session) => { const status = fxSessionState(session, now); return <div key={session.name} className="flex items-center gap-3 text-xs">
        <span className="w-20 text-terminal-text">{session.name}</span>
        <div className="flex-1 h-1.5 rounded-full bg-terminal-border/30"><div className="h-full bg-neon-green rounded-full" style={{ width: `${status.progress * 100}%` }} /></div>
        <span className={status.open ? 'text-neon-green' : 'text-terminal-muted'}>{status.open ? 'Open' : 'Closed'}</span>
      </div>; })}
    </div>}
    <p className="text-xs text-terminal-muted mt-3">Typical FX session windows, adjusted for daylight saving. Broker schedules and holidays may differ.</p>
  </section>;
}
