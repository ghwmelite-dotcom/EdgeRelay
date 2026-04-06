import { useEffect, useState } from 'react';
import {
  BarChart3, Users, TrendingUp, Activity, Brain, Heart, MessageSquare,
  Zap, BookOpen, Radio, GraduationCap, Loader2, RefreshCw,
} from 'lucide-react';
import { api } from '@/lib/api';

interface FounderData {
  signups: Array<{ date: string; count: number }>;
  totalUsers: number;
  activeUsers7d: number;
  pageViews: Array<{ page: string; views: number }>;
  featureUsage: Array<{ event_type: string; count: number }>;
  academy: { users_started: number; lessons_completed: number; total_attempts: number };
  totals: {
    accounts: number; trades: number; counselorSessions: number;
    socialPosts: number; eaGenerations: number; telegramUsers: number;
  };
}

export function FounderDashboardPage() {
  const [data, setData] = useState<FounderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchData() {
    setLoading(true);
    const res = await api.get<FounderData>('/founder-analytics/founder');
    if (res.data) { setData(res.data); setError(null); }
    else setError(res.error?.message || 'Failed to load');
    setLoading(false);
  }

  useEffect(() => { fetchData(); }, []);

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-neon-cyan" /></div>;
  if (error) return <div className="py-20 text-center text-neon-red">{error}</div>;
  if (!data) return null;

  return (
    <div className="page-enter max-w-6xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <BarChart3 size={24} className="text-neon-cyan" />
            <h1 className="text-2xl font-bold text-white font-display">Founder Dashboard</h1>
          </div>
          <p className="text-sm text-terminal-muted">Platform analytics — admin only</p>
        </div>
        <button onClick={fetchData} className="flex h-9 w-9 items-center justify-center rounded-lg border border-terminal-border/30 text-terminal-muted hover:text-neon-cyan cursor-pointer">
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Users', value: data.totalUsers, icon: Users, color: '#00e5ff' },
          { label: 'Active (7d)', value: data.activeUsers7d, icon: Activity, color: '#00ff9d' },
          { label: 'Total Trades', value: data.totals.trades, icon: TrendingUp, color: '#ffb800' },
          { label: 'Telegram Users', value: data.totals.telegramUsers, icon: Radio, color: '#b18cff' },
        ].map(s => (
          <div key={s.label} className="rounded-2xl border border-terminal-border/30 bg-terminal-card/20 p-4">
            <div className="flex items-center gap-2 mb-2">
              <s.icon size={14} style={{ color: s.color }} />
              <span className="text-[10px] uppercase tracking-wider text-terminal-muted">{s.label}</span>
            </div>
            <p className="font-mono-nums text-2xl font-bold text-white">{s.value.toLocaleString()}</p>
          </div>
        ))}
      </div>

      {/* Feature Usage + Platform Totals */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Platform Totals */}
        <div className="rounded-2xl border border-terminal-border/30 bg-terminal-card/20 p-5">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Zap size={14} className="text-neon-cyan" /> Platform Totals
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Accounts', value: data.totals.accounts, icon: Radio },
              { label: 'Trades Journaled', value: data.totals.trades, icon: TrendingUp },
              { label: 'Sage Sessions', value: data.totals.counselorSessions, icon: Heart },
              { label: 'Social Posts', value: data.totals.socialPosts, icon: MessageSquare },
              { label: 'EAs Generated', value: data.totals.eaGenerations, icon: Brain },
              { label: 'Telegram Links', value: data.totals.telegramUsers, icon: Radio },
            ].map(t => (
              <div key={t.label} className="flex items-center gap-3 rounded-lg bg-terminal-bg/50 border border-terminal-border/20 px-3 py-2.5">
                <t.icon size={13} className="text-terminal-muted shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-mono-nums text-sm font-bold text-white">{t.value.toLocaleString()}</p>
                  <p className="text-[9px] text-terminal-muted truncate">{t.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Academy Stats */}
        <div className="rounded-2xl border border-terminal-border/30 bg-terminal-card/20 p-5">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <GraduationCap size={14} className="text-neon-amber" /> Academy Stats
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg bg-terminal-bg/50 border border-terminal-border/20 px-4 py-3">
              <span className="text-[12px] text-slate-400">Students Started</span>
              <span className="font-mono-nums text-lg font-bold text-neon-cyan">{data.academy.users_started || 0}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-terminal-bg/50 border border-terminal-border/20 px-4 py-3">
              <span className="text-[12px] text-slate-400">Lessons Completed</span>
              <span className="font-mono-nums text-lg font-bold text-neon-green">{data.academy.lessons_completed || 0}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-terminal-bg/50 border border-terminal-border/20 px-4 py-3">
              <span className="text-[12px] text-slate-400">Quiz Attempts</span>
              <span className="font-mono-nums text-lg font-bold text-neon-amber">{data.academy.total_attempts || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Signups Chart */}
      <div className="rounded-2xl border border-terminal-border/30 bg-terminal-card/20 p-5">
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <Users size={14} className="text-neon-green" /> Signups (Last 30 Days)
        </h3>
        {data.signups.length === 0 ? (
          <p className="text-[12px] text-terminal-muted py-4 text-center">No signups in the last 30 days</p>
        ) : (
          <div className="flex items-end gap-1 h-24">
            {data.signups.slice().reverse().map((d, i) => {
              const max = Math.max(...data.signups.map(s => s.count));
              const h = max > 0 ? (d.count / max) * 100 : 0;
              return (
                <div key={d.date} className="flex-1 flex flex-col items-center gap-1" title={`${d.date}: ${d.count} signups`}>
                  <span className="font-mono-nums text-[8px] text-neon-green">{d.count > 0 ? d.count : ''}</span>
                  <div className="w-full rounded-t transition-all" style={{ height: `${Math.max(h, 3)}%`, backgroundColor: d.count > 0 ? '#00ff9d40' : '#151d2830', borderTop: d.count > 0 ? '2px solid #00ff9d' : undefined }} />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Page Views + Feature Usage */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-terminal-border/30 bg-terminal-card/20 p-5">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Activity size={14} className="text-neon-cyan" /> Top Pages (7d)
          </h3>
          {data.pageViews.length === 0 ? (
            <p className="text-[12px] text-terminal-muted py-4 text-center">No page view data yet. Tracking starts when users visit pages.</p>
          ) : (
            <div className="space-y-1.5">
              {data.pageViews.map(p => {
                const max = data.pageViews[0]?.views || 1;
                return (
                  <div key={p.page} className="flex items-center gap-3">
                    <span className="w-32 font-mono-nums text-[11px] text-slate-400 truncate">{p.page}</span>
                    <div className="flex-1 h-2 rounded-full bg-terminal-border/20 overflow-hidden">
                      <div className="h-full rounded-full bg-neon-cyan/50" style={{ width: `${(p.views / max) * 100}%` }} />
                    </div>
                    <span className="font-mono-nums text-[11px] text-neon-cyan w-8 text-right">{p.views}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-terminal-border/30 bg-terminal-card/20 p-5">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Zap size={14} className="text-neon-amber" /> Feature Usage (7d)
          </h3>
          {data.featureUsage.length === 0 ? (
            <p className="text-[12px] text-terminal-muted py-4 text-center">No feature usage data yet. Events will appear as users interact.</p>
          ) : (
            <div className="space-y-1.5">
              {data.featureUsage.map(f => {
                const max = data.featureUsage[0]?.count || 1;
                return (
                  <div key={f.event_type} className="flex items-center gap-3">
                    <span className="w-32 font-mono-nums text-[11px] text-slate-400 truncate">{f.event_type}</span>
                    <div className="flex-1 h-2 rounded-full bg-terminal-border/20 overflow-hidden">
                      <div className="h-full rounded-full bg-neon-amber/50" style={{ width: `${(f.count / max) * 100}%` }} />
                    </div>
                    <span className="font-mono-nums text-[11px] text-neon-amber w-8 text-right">{f.count}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
