import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap, BookOpen, CheckCircle2, Lock, ChevronRight, Sparkles, BarChart3, Target } from 'lucide-react';
import { useAcademyStore } from '@/stores/academy';
import { ACADEMY_CURRICULUM } from '@/data/academy-curriculum';
import { HomeworkSection } from '@/components/academy/HomeworkCard';

const ACCENT_MAP: Record<string, string> = {
  'neon-cyan': '#00e5ff', 'neon-green': '#00ff9d', 'neon-amber': '#ffb800',
  'neon-purple': '#b18cff', 'neon-red': '#ff3d57',
};

export function AcademyPage() {
  const { progress, fetchProgress, isLevelUnlocked, getLevelProgress, loading } = useAcademyStore();

  useEffect(() => { fetchProgress(); }, [fetchProgress]);

  const totalLessons = ACADEMY_CURRICULUM.reduce((s, l) => s + l.lessons.length, 0);
  const completedLessons = Object.values(progress).filter((p) => p.quiz_passed).length;

  return (
    <div className="page-enter max-w-4xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="animate-fade-in-up">
        <div className="flex items-center gap-3 mb-2">
          <GraduationCap size={24} className="text-neon-amber" />
          <h1 className="text-2xl font-bold text-white font-display tracking-tight">TradeMetrics Academy</h1>
        </div>
        <p className="text-sm text-terminal-muted">Master trading from the ground up — 6 levels, interactive lessons, and quizzes</p>
      </div>

      {/* Overall progress */}
      <div className="animate-fade-in-up glass-premium rounded-2xl p-6" style={{ animationDelay: '60ms' }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <BarChart3 size={16} className="text-neon-amber" />
            <span className="text-sm font-semibold text-white">Your Progress</span>
          </div>
          <span className="font-mono-nums text-[12px] text-neon-amber">{completedLessons} / {totalLessons} lessons</span>
        </div>
        <div className="h-2.5 rounded-full bg-terminal-border/20 overflow-hidden">
          <div
            className="h-full rounded-full bg-neon-amber/60 transition-all duration-1000"
            style={{ width: `${totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0}%`, boxShadow: '0 0 8px #ffb80040' }}
          />
        </div>
      </div>

      {/* Practice Trading CTA */}
      <Link
        to="/academy/practice"
        className="animate-fade-in-up group block rounded-2xl border border-neon-cyan/20 bg-gradient-to-r from-neon-cyan/[0.04] to-transparent p-5 hover:border-neon-cyan/40 transition-all"
        style={{ animationDelay: '100ms' }}
      >
        <div className="flex items-center gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-neon-cyan/25 bg-neon-cyan/10">
            <Target size={20} className="text-neon-cyan" />
          </div>
          <div className="flex-1">
            <h3 className="font-display text-base font-bold text-white group-hover:text-neon-cyan transition-colors">Practice Trading</h3>
            <p className="text-[12px] text-terminal-muted">Trade against historical data with zero risk. 4 scenarios from beginner to expert.</p>
          </div>
          <ChevronRight size={18} className="text-terminal-muted group-hover:text-neon-cyan transition-colors" />
        </div>
      </Link>

      {/* Homework */}
      <HomeworkSection />

      {/* Level cards */}
      <div className="space-y-4">
        {ACADEMY_CURRICULUM.map((level, li) => {
          const unlocked = isLevelUnlocked(level.id);
          const { completed, total } = getLevelProgress(level.id);
          const accent = ACCENT_MAP[level.accentColor] || '#00e5ff';
          const isComplete = completed === total;

          return (
            <div
              key={level.id}
              className={`animate-fade-in-up rounded-2xl border overflow-hidden transition-all ${
                unlocked
                  ? 'border-terminal-border/40 bg-terminal-card/20'
                  : 'border-terminal-border/20 bg-terminal-card/10 opacity-60'
              }`}
              style={{ animationDelay: `${(li + 1) * 80}ms` }}
            >
              {/* Level header */}
              <div className="flex items-center gap-4 p-5">
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border font-display text-lg font-black"
                  style={{
                    borderColor: `${accent}30`,
                    backgroundColor: `${accent}10`,
                    color: isComplete ? accent : unlocked ? accent : '#6b7f95',
                  }}
                >
                  {isComplete ? <CheckCircle2 size={22} /> : unlocked ? level.id : <Lock size={18} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="font-display text-base font-bold text-white">Level {level.id}: {level.title}</h2>
                    {isComplete && (
                      <span className="rounded-full border px-2 py-0.5 font-mono-nums text-[9px] font-semibold" style={{ borderColor: `${accent}30`, color: accent, backgroundColor: `${accent}10` }}>
                        COMPLETE
                      </span>
                    )}
                  </div>
                  <p className="text-[12px] text-terminal-muted mt-0.5">{level.subtitle}</p>
                  {/* Mini progress bar */}
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-terminal-border/20 overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${total > 0 ? (completed / total) * 100 : 0}%`, backgroundColor: `${accent}60` }} />
                    </div>
                    <span className="font-mono-nums text-[10px] text-terminal-muted">{completed}/{total}</span>
                  </div>
                </div>
              </div>

              {/* Lessons list (only if unlocked) */}
              {unlocked && (
                <div className="border-t border-terminal-border/20 divide-y divide-terminal-border/10">
                  {level.lessons.map((lesson) => {
                    const lp = progress[lesson.id];
                    const isPassed = lp?.quiz_passed;
                    const isInProgress = lp?.status === 'in_progress';

                    return (
                      <Link
                        key={lesson.id}
                        to={`/academy/${lesson.id}`}
                        className="flex items-center gap-3 px-5 py-3 hover:bg-terminal-card/30 transition-all group"
                      >
                        {/* Status icon */}
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg" style={{
                          backgroundColor: isPassed ? `${accent}15` : isInProgress ? '#ffb80010' : '#151d2850',
                          border: `1px solid ${isPassed ? `${accent}25` : isInProgress ? '#ffb80020' : '#151d2880'}`,
                        }}>
                          {isPassed ? (
                            <CheckCircle2 size={14} style={{ color: accent }} />
                          ) : isInProgress ? (
                            <Sparkles size={13} className="text-neon-amber" />
                          ) : (
                            <BookOpen size={13} className="text-terminal-muted/50" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className={`text-[13px] font-medium ${isPassed ? 'text-slate-300' : 'text-white'}`}>{lesson.title}</p>
                          <p className="text-[11px] text-terminal-muted truncate">{lesson.description}</p>
                        </div>

                        <div className="flex items-center gap-2">
                          {lp?.quiz_score !== null && lp?.quiz_score !== undefined && (
                            <span className={`font-mono-nums text-[10px] ${isPassed ? 'text-neon-green' : 'text-neon-amber'}`}>
                              {lp.quiz_score}%
                            </span>
                          )}
                          <span className="font-mono-nums text-[10px] text-terminal-muted">{lesson.readTime}</span>
                          <ChevronRight size={14} className="text-terminal-muted/40 group-hover:text-neon-cyan transition-colors" />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}

              {/* Locked message */}
              {!unlocked && (
                <div className="border-t border-terminal-border/15 px-5 py-3">
                  <p className="text-[11px] text-terminal-muted flex items-center gap-1.5">
                    <Lock size={11} /> Complete all lessons in Level {level.id - 1} to unlock
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
