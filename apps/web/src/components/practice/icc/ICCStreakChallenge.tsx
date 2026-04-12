import { useState, useEffect } from 'react';
import { Flame, Trophy, Target, TrendingUp, Star, RotateCcw } from 'lucide-react';
import type { ICCScore } from '@/lib/icc-scoring-engine';

export interface StreakEntry {
  scenarioId: string;
  scenarioName: string;
  grade: string;
  percentage: number;
  timestamp: number;
  dimensions?: { bias: number; indication: number; correction: number; continuation: number; risk: number };
}

interface Props {
  onClose: () => void;
}

const STREAK_KEY = 'icc-streak-data';

export function loadStreak(): StreakEntry[] {
  try {
    const raw = localStorage.getItem(STREAK_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveStreak(entries: StreakEntry[]) {
  try { localStorage.setItem(STREAK_KEY, JSON.stringify(entries)); } catch {}
}

export function addStreakEntry(scenarioId: string, scenarioName: string, score: ICCScore) {
  const entries = loadStreak();
  const dims = score.components.reduce((acc, c) => {
    const key = c.dimension.toLowerCase().split(' ')[0] as keyof typeof acc;
    if (key in acc) acc[key] = Math.round((c.score / c.maxScore) * 100);
    return acc;
  }, { bias: 0, indication: 0, correction: 0, continuation: 0, risk: 0 });

  entries.push({
    scenarioId,
    scenarioName,
    grade: score.grade,
    percentage: score.percentage,
    timestamp: Date.now(),
    dimensions: dims,
  });
  saveStreak(entries);
}

export function ICCStreakChallenge({ onClose }: Props) {
  const [entries, setEntries] = useState<StreakEntry[]>([]);

  useEffect(() => { setEntries(loadStreak()); }, []);

  const currentStreak = (() => {
    let streak = 0;
    for (let i = entries.length - 1; i >= 0; i--) {
      if (entries[i].percentage >= 55) streak++;
      else break;
    }
    return streak;
  })();

  const bestStreak = (() => {
    let best = 0, current = 0;
    for (const e of entries) {
      if (e.percentage >= 55) { current++; best = Math.max(best, current); }
      else current = 0;
    }
    return best;
  })();

  const avgScore = entries.length > 0
    ? Math.round(entries.reduce((s, e) => s + e.percentage, 0) / entries.length)
    : 0;

  const gradeDistribution = entries.reduce((acc, e) => {
    acc[e.grade] = (acc[e.grade] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const GRADE_COLORS: Record<string, string> = {
    A: '#00ff9d', B: '#00e5ff', C: '#ffb800', D: '#ff3d57', F: '#ff3d57',
  };

  const handleReset = () => {
    saveStreak([]);
    setEntries([]);
  };

  return (
    <div className="rounded-2xl border border-neon-amber/20 bg-gradient-to-br from-neon-amber/[0.04] to-transparent overflow-hidden animate-fade-in-up">
      <div className="flex items-center justify-between border-b border-neon-amber/15 px-5 py-3">
        <div className="flex items-center gap-2">
          <Flame size={16} className="text-neon-amber" />
          <span className="text-sm font-semibold text-white">Streak Challenge</span>
          <span className="font-mono-nums text-[9px] text-neon-amber">{entries.length} attempts</span>
        </div>
        <button onClick={onClose} className="text-terminal-muted hover:text-white text-[10px] cursor-pointer">Hide</button>
      </div>

      <div className="p-5 space-y-4">
        {/* Streak stats */}
        <div className="grid grid-cols-4 gap-3">
          <div className="rounded-xl border border-neon-amber/20 bg-terminal-bg/50 p-3 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Flame size={14} className="text-neon-amber" />
            </div>
            <p className="font-mono-nums text-xl font-bold text-neon-amber">{currentStreak}</p>
            <p className="text-[9px] text-terminal-muted">Current Streak</p>
          </div>
          <div className="rounded-xl border border-neon-purple/20 bg-terminal-bg/50 p-3 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Star size={14} className="text-neon-purple" />
            </div>
            <p className="font-mono-nums text-xl font-bold text-neon-purple">{bestStreak}</p>
            <p className="text-[9px] text-terminal-muted">Best Streak</p>
          </div>
          <div className="rounded-xl border border-neon-cyan/20 bg-terminal-bg/50 p-3 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <TrendingUp size={14} className="text-neon-cyan" />
            </div>
            <p className="font-mono-nums text-xl font-bold text-neon-cyan">{avgScore}%</p>
            <p className="text-[9px] text-terminal-muted">Avg Score</p>
          </div>
          <div className="rounded-xl border border-neon-green/20 bg-terminal-bg/50 p-3 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Trophy size={14} className="text-neon-green" />
            </div>
            <p className="font-mono-nums text-xl font-bold text-neon-green">
              {entries.filter(e => e.grade === 'A').length}
            </p>
            <p className="text-[9px] text-terminal-muted">A Grades</p>
          </div>
        </div>

        {/* Grade distribution */}
        {entries.length > 0 && (
          <div>
            <p className="font-mono-nums text-[9px] uppercase tracking-widest text-terminal-muted mb-2">Grade Distribution</p>
            <div className="flex gap-1 h-6">
              {['A', 'B', 'C', 'D', 'F'].map(g => {
                const count = gradeDistribution[g] || 0;
                const pct = entries.length > 0 ? (count / entries.length) * 100 : 0;
                if (pct === 0) return null;
                return (
                  <div
                    key={g}
                    className="rounded-sm flex items-center justify-center text-[9px] font-bold transition-all"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: `${GRADE_COLORS[g]}20`,
                      color: GRADE_COLORS[g],
                      minWidth: count > 0 ? '20px' : 0,
                    }}
                  >
                    {g}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Recent history */}
        {entries.length > 0 && (
          <div>
            <p className="font-mono-nums text-[9px] uppercase tracking-widest text-terminal-muted mb-2">Recent Attempts</p>
            <div className="space-y-1 max-h-32 overflow-y-auto scrollbar-thin">
              {[...entries].reverse().slice(0, 10).map((e, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg bg-terminal-bg/40 px-3 py-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono-nums text-[11px] font-bold" style={{ color: GRADE_COLORS[e.grade] }}>{e.grade}</span>
                    <span className="text-[11px] text-slate-400 truncate max-w-[160px]">{e.scenarioName}</span>
                  </div>
                  <span className="font-mono-nums text-[10px] text-terminal-muted">{e.percentage}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {entries.length === 0 && (
          <div className="text-center py-4">
            <Target size={24} className="text-terminal-muted mx-auto mb-2 opacity-40" />
            <p className="text-[12px] text-terminal-muted">Complete scenarios to build your streak!</p>
            <p className="text-[10px] text-slate-500 mt-1">Score 55%+ (Grade C or better) to keep the streak alive</p>
          </div>
        )}

        {entries.length > 0 && (
          <button onClick={handleReset} className="flex items-center gap-1 text-[10px] text-terminal-muted hover:text-neon-red cursor-pointer mx-auto">
            <RotateCcw size={10} /> Reset Stats
          </button>
        )}
      </div>
    </div>
  );
}
