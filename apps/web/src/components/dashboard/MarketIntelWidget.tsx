// apps/web/src/components/dashboard/MarketIntelWidget.tsx
import { useState, useEffect } from 'react';
import { Newspaper, Calendar, ExternalLink } from 'lucide-react';
import { useMarketIntelStore } from '@/stores/marketIntel';

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function timeUntil(dateStr: string): string {
  const diff = new Date(dateStr).getTime() - Date.now();
  if (diff < 0) return 'passed';
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `in ${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `in ${hours}h ${mins % 60}m`;
  return `in ${Math.floor(hours / 24)}d`;
}

export function MarketIntelWidget() {
  const [tab, setTab] = useState<'news' | 'calendar'>('news');
  const { headlines, calendarEvents, isLoadingNews, isLoadingCalendar, fetchHeadlines, fetchCalendar } =
    useMarketIntelStore();

  useEffect(() => {
    fetchHeadlines();
    fetchCalendar();
    // Auto-refresh every 5 minutes
    const timer = setInterval(() => {
      fetchHeadlines();
      fetchCalendar();
    }, 5 * 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="glass-premium border-gradient rounded-2xl p-5 animate-fade-in-up" style={{ animationDelay: '60ms' }}>
      {/* Tabs */}
      <div className="flex items-center gap-1 mb-4">
        <button
          onClick={() => setTab('news')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
            tab === 'news'
              ? 'bg-neon-cyan/10 text-neon-cyan'
              : 'text-terminal-muted hover:text-slate-300'
          }`}
        >
          <Newspaper size={12} /> News
        </button>
        <button
          onClick={() => setTab('calendar')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
            tab === 'calendar'
              ? 'bg-amber-500/10 text-amber-400'
              : 'text-terminal-muted hover:text-slate-300'
          }`}
        >
          <Calendar size={12} /> Calendar
        </button>
      </div>

      {/* News Tab */}
      {tab === 'news' && (
        <div className="space-y-2.5 max-h-[220px] overflow-y-auto scrollbar-thin">
          {isLoadingNews && headlines.length === 0 ? (
            <p className="text-xs text-terminal-muted text-center py-4">Loading news...</p>
          ) : headlines.length === 0 ? (
            <p className="text-xs text-terminal-muted text-center py-4">No recent news</p>
          ) : (
            headlines.map((item) => (
              <a
                key={item.id}
                href={item.url || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="block group"
              >
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-200 leading-relaxed line-clamp-2 group-hover:text-neon-cyan transition-colors">
                      {item.headline}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-terminal-muted">{item.source}</span>
                      <span className="text-[10px] text-terminal-muted/50">{timeAgo(item.published_at)}</span>
                    </div>
                  </div>
                  <ExternalLink size={10} className="shrink-0 mt-1 text-terminal-muted/30 group-hover:text-neon-cyan/50" />
                </div>
              </a>
            ))
          )}
        </div>
      )}

      {/* Calendar Tab */}
      {tab === 'calendar' && (
        <div className="space-y-2 max-h-[220px] overflow-y-auto scrollbar-thin">
          {isLoadingCalendar && calendarEvents.length === 0 ? (
            <p className="text-xs text-terminal-muted text-center py-4">Loading events...</p>
          ) : calendarEvents.length === 0 ? (
            <p className="text-xs text-terminal-muted text-center py-4">No upcoming events</p>
          ) : (
            calendarEvents.map((event) => (
              <div key={event.id} className="flex items-center gap-2">
                <span
                  className={`shrink-0 px-1.5 py-0.5 rounded text-[8px] font-bold ${
                    event.impact === 'high'
                      ? 'bg-red-500/20 text-red-400'
                      : 'bg-amber-500/20 text-amber-400'
                  }`}
                >
                  {event.impact.toUpperCase()}
                </span>
                <span className="text-[10px] text-neon-cyan font-mono w-8">{event.currency}</span>
                <span className="text-xs text-slate-300 flex-1 truncate">{event.event_name}</span>
                <span className="text-[10px] text-terminal-muted shrink-0">
                  {timeUntil(event.event_time)}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
