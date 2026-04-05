import { useEffect, useState } from 'react';
import {
  Trophy, Flame, Star, Medal, Zap, Crown, Target, Users,
  ChevronDown, Loader2, Share2, CheckCircle2,
} from 'lucide-react';
import { api } from '@/lib/api';

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  totalXp: number;
  badges: string[];
}

interface LeaderEntry {
  user_name: string;
  xp: number;
  streak_days: number;
  quizzes_passed: number;
}

const BADGE_META: Record<string, { label: string; icon: typeof Flame; color: string; desc: string }> = {
  'streak-3': { label: '3-Day Streak', icon: Flame, color: '#ffb800', desc: 'Studied 3 days in a row' },
  'streak-7': { label: 'Weekly Warrior', icon: Flame, color: '#ff3d57', desc: '7-day study streak' },
  'streak-14': { label: 'Fortnight Focus', icon: Star, color: '#b18cff', desc: '14-day study streak' },
  'streak-30': { label: 'Monthly Master', icon: Crown, color: '#00e5ff', desc: '30-day study streak' },
  'xp-100': { label: 'Century XP', icon: Zap, color: '#00ff9d', desc: 'Earned 100 XP' },
  'xp-500': { label: 'XP Hunter', icon: Zap, color: '#ffb800', desc: 'Earned 500 XP' },
  'xp-1000': { label: 'XP Legend', icon: Trophy, color: '#ff3d57', desc: 'Earned 1,000 XP' },
};

const ALL_BADGES = Object.entries(BADGE_META);

export function PeerChallenges() {
  const [streak, setStreak] = useState<StreakData | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkedIn, setCheckedIn] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);
  const [newBadges, setNewBadges] = useState<string[]>([]);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [streakRes, lbRes] = await Promise.all([
        api.get<StreakData>('/academy/streak'),
        api.get<{ leaderboard: LeaderEntry[] }>('/academy/leaderboard'),
      ]);
      if (streakRes.data) setStreak(streakRes.data);
      if (lbRes.data) setLeaderboard(lbRes.data.leaderboard);
      setLoading(false);
    }
    load();
  }, []);

  const handleCheckIn = async () => {
    const res = await api.post<{ streak: number; xpEarned: number; newBadges?: string[]; totalXp: number; alreadyCheckedIn?: boolean }>(
      '/academy/streak/check-in'
    );
    if (res.data) {
      setCheckedIn(true);
      setXpEarned(res.data.xpEarned);
      setNewBadges(res.data.newBadges || []);
      if (streak) {
        setStreak({
          ...streak,
          currentStreak: res.data.streak,
          totalXp: res.data.totalXp,
          badges: [...(streak.badges || []), ...(res.data.newBadges || [])],
        });
      }
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-terminal-border/40 bg-terminal-card/20 p-8 flex items-center justify-center">
        <Loader2 size={20} className="animate-spin text-terminal-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Streak + XP Card */}
      <div className="rounded-2xl border border-neon-amber/20 bg-gradient-to-br from-neon-amber/[0.04] to-transparent overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-neon-amber/25 bg-neon-amber/10">
              <Flame size={20} className="text-neon-amber" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono-nums text-2xl font-black text-neon-amber">{streak?.currentStreak || 0}</span>
                <span className="text-sm text-terminal-muted">day streak</span>
              </div>
              <div className="flex items-center gap-3 font-mono-nums text-[10px] text-terminal-muted">
                <span>Best: {streak?.longestStreak || 0} days</span>
                <span>·</span>
                <span className="text-neon-cyan">{streak?.totalXp || 0} XP</span>
              </div>
            </div>
          </div>

          {/* Check-in button */}
          {!checkedIn ? (
            <button
              onClick={handleCheckIn}
              className="inline-flex items-center gap-2 rounded-xl bg-neon-amber px-5 py-2.5 text-sm font-bold text-terminal-bg shadow-[0_0_16px_rgba(255,184,0,0.2)] hover:shadow-[0_0_24px_rgba(255,184,0,0.35)] transition-all cursor-pointer"
            >
              <Zap size={14} /> Check In (+XP)
            </button>
          ) : (
            <div className="text-center">
              <div className="flex items-center gap-1.5 text-neon-green">
                <CheckCircle2 size={16} />
                <span className="text-sm font-semibold">+{xpEarned} XP</span>
              </div>
              {newBadges.length > 0 && (
                <p className="font-mono-nums text-[10px] text-neon-purple mt-0.5">New badge unlocked!</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Badges */}
      <div className="rounded-2xl border border-terminal-border/40 bg-terminal-card/20 overflow-hidden">
        <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center justify-between px-5 py-3 cursor-pointer">
          <div className="flex items-center gap-2">
            <Medal size={16} className="text-neon-purple" />
            <span className="text-sm font-semibold text-white">Badges</span>
            <span className="font-mono-nums text-[10px] text-terminal-muted">{streak?.badges?.length || 0}/{ALL_BADGES.length}</span>
          </div>
          <ChevronDown size={14} className={`text-terminal-muted transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </button>

        {expanded && (
          <div className="border-t border-terminal-border/20 px-5 py-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {ALL_BADGES.map(([key, meta]) => {
              const earned = streak?.badges?.includes(key);
              const Icon = meta.icon;
              return (
                <div
                  key={key}
                  className={`rounded-xl border p-3 text-center transition-all ${
                    earned ? 'border-opacity-30 bg-opacity-10' : 'border-terminal-border/20 bg-terminal-bg/30 opacity-40'
                  }`}
                  style={earned ? { borderColor: `${meta.color}30`, backgroundColor: `${meta.color}08` } : undefined}
                >
                  <Icon size={20} className="mx-auto mb-1.5" style={{ color: earned ? meta.color : '#6b7f9540' }} />
                  <p className="text-[11px] font-semibold" style={{ color: earned ? meta.color : '#6b7f9560' }}>{meta.label}</p>
                  <p className="text-[9px] text-terminal-muted mt-0.5">{meta.desc}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Leaderboard */}
      <div className="rounded-2xl border border-terminal-border/40 bg-terminal-card/20 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-terminal-border/20">
          <div className="flex items-center gap-2">
            <Trophy size={16} className="text-neon-cyan" />
            <span className="text-sm font-semibold text-white">Weekly Leaderboard</span>
          </div>
          <span className="font-mono-nums text-[10px] text-terminal-muted">
            {leaderboard.length} trader{leaderboard.length !== 1 ? 's' : ''}
          </span>
        </div>

        {leaderboard.length === 0 ? (
          <div className="p-6 text-center">
            <Users size={24} className="mx-auto text-terminal-muted/20 mb-2" />
            <p className="text-[12px] text-terminal-muted">No leaderboard data yet this week</p>
            <p className="text-[10px] text-terminal-muted/50 mt-1">Check in daily to earn XP and climb the ranks</p>
          </div>
        ) : (
          <div className="divide-y divide-terminal-border/15">
            {leaderboard.map((entry, i) => {
              const rankColor = i === 0 ? '#ffb800' : i === 1 ? '#c0c0c0' : i === 2 ? '#cd7f32' : '#6b7f95';
              return (
                <div key={i} className="flex items-center gap-3 px-5 py-2.5">
                  <span className="w-6 font-mono-nums text-sm font-bold text-center" style={{ color: rankColor }}>
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-white truncate">{entry.user_name}</p>
                    <p className="font-mono-nums text-[10px] text-terminal-muted">
                      🔥 {entry.streak_days}d streak
                    </p>
                  </div>
                  <span className="font-mono-nums text-sm font-bold text-neon-cyan">{entry.xp} XP</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Share CTA */}
      {streak && streak.currentStreak >= 3 && (
        <button
          onClick={() => {
            const text = `🔥 ${streak.currentStreak}-day study streak on TradeMetrics Academy! ${streak.totalXp} XP earned. Free trading education at trademetrics.pro`;
            if (navigator.share) navigator.share({ text });
            else navigator.clipboard?.writeText(text);
          }}
          className="w-full rounded-xl border border-terminal-border/30 bg-terminal-card/30 py-3 text-[12px] text-terminal-muted hover:text-neon-cyan hover:border-neon-cyan/30 transition-all cursor-pointer flex items-center justify-center gap-2"
        >
          <Share2 size={13} /> Share your streak
        </button>
      )}
    </div>
  );
}
