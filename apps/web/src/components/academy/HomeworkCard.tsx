import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle2, Clock, Shield, BookOpen, Heart, Target, Zap,
  ChevronDown, Loader2,
} from 'lucide-react';
import { api } from '@/lib/api';
import { HOMEWORK_ASSIGNMENTS, type HomeworkAssignment } from '@/data/academy-homework';

const ICON_MAP: Record<string, typeof Zap> = {
  Zap, Shield, Clock, BookOpen, Heart, Target,
};

const ACCENT_MAP: Record<string, string> = {
  'neon-cyan': '#00e5ff', 'neon-green': '#00ff9d', 'neon-amber': '#ffb800',
  'neon-purple': '#b18cff', 'neon-red': '#ff3d57',
};

const LINK_MAP: Record<string, string> = {
  'hw-1': '/accounts', 'hw-2': '/accounts', 'hw-3': '/journal',
  'hw-4': '/journal', 'hw-5': '/counselor', 'hw-6': '/academy/practice',
};

interface HomeworkStatus {
  current: number;
  required: number;
  completed: boolean;
}

export function HomeworkSection() {
  const [statuses, setStatuses] = useState<Record<string, HomeworkStatus>>({});
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    async function fetch() {
      setLoading(true);
      const res = await api.get<{ homework: Record<string, HomeworkStatus> }>('/academy/homework');
      if (res.data) setStatuses(res.data.homework);
      setLoading(false);
    }
    fetch();
  }, []);

  const completedCount = Object.values(statuses).filter(s => s.completed).length;
  const totalCount = HOMEWORK_ASSIGNMENTS.length;

  return (
    <div className="rounded-2xl border border-terminal-border/40 bg-terminal-card/20 overflow-hidden">
      {/* Header — always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-4 cursor-pointer group"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-neon-amber/25 bg-neon-amber/10">
            <BookOpen size={18} className="text-neon-amber" />
          </div>
          <div className="text-left">
            <h3 className="font-display text-base font-bold text-white">Practical Homework</h3>
            <p className="text-[11px] text-terminal-muted">
              {loading ? 'Checking progress...' : `${completedCount}/${totalCount} assignments completed`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {!loading && (
            <div className="hidden sm:flex items-center gap-1.5">
              {HOMEWORK_ASSIGNMENTS.map(hw => {
                const s = statuses[hw.id];
                return (
                  <span
                    key={hw.id}
                    className={`h-2.5 w-2.5 rounded-full ${s?.completed ? 'bg-neon-green shadow-[0_0_4px_#00ff9d]' : 'bg-terminal-border/40'}`}
                  />
                );
              })}
            </div>
          )}
          <ChevronDown size={16} className={`text-terminal-muted transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {/* Expanded content */}
      <div className={`overflow-hidden transition-all duration-400 ease-out ${expanded ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="border-t border-terminal-border/20 px-5 py-4 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-terminal-muted">
              <Loader2 size={16} className="animate-spin" />
            </div>
          ) : (
            HOMEWORK_ASSIGNMENTS.map(hw => {
              const status = statuses[hw.id];
              const accent = ACCENT_MAP[hw.accentColor] || '#00e5ff';
              const Icon = ICON_MAP[hw.icon] || Zap;
              const progressPct = status ? Math.min((status.current / status.required) * 100, 100) : 0;
              const link = LINK_MAP[hw.id] || '/dashboard';

              return (
                <div
                  key={hw.id}
                  className={`rounded-xl border p-4 transition-all ${
                    status?.completed
                      ? 'border-neon-green/20 bg-neon-green/[0.03]'
                      : 'border-terminal-border/25 bg-terminal-bg/30'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border mt-0.5"
                      style={{
                        borderColor: status?.completed ? '#00ff9d25' : `${accent}20`,
                        backgroundColor: status?.completed ? '#00ff9d08' : `${accent}08`,
                      }}
                    >
                      {status?.completed ? (
                        <CheckCircle2 size={16} className="text-neon-green" />
                      ) : (
                        <Icon size={16} style={{ color: accent }} />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Title + badge */}
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono-nums text-[9px] text-terminal-muted">Level {hw.levelId}</span>
                        <h4 className="text-[13px] font-semibold text-white">{hw.title}</h4>
                        {status?.completed && (
                          <span className="rounded-full bg-neon-green/15 border border-neon-green/25 px-2 py-0.5 font-mono-nums text-[8px] text-neon-green">DONE</span>
                        )}
                      </div>

                      <p className="text-[12px] text-slate-400 leading-relaxed">{hw.description}</p>

                      {/* Progress bar */}
                      <div className="mt-2.5 flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-terminal-border/20 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{
                              width: `${progressPct}%`,
                              backgroundColor: status?.completed ? '#00ff9d60' : `${accent}50`,
                            }}
                          />
                        </div>
                        <span className="font-mono-nums text-[10px] text-terminal-muted">
                          {status?.current || 0}/{status?.required || hw.requiredCount}
                        </span>
                      </div>

                      {/* Tips (only if not completed) */}
                      {!status?.completed && (
                        <div className="mt-2 flex items-center gap-2">
                          <Link
                            to={link}
                            className="inline-flex items-center gap-1 rounded-md border border-terminal-border/30 bg-terminal-card/40 px-2.5 py-1 text-[10px] font-medium text-slate-300 hover:border-neon-cyan/30 hover:text-neon-cyan transition-all"
                          >
                            Start →
                          </Link>
                          <span className="text-[10px] text-terminal-muted italic">
                            {hw.tips[0]}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
