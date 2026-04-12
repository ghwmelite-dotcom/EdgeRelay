import { useState } from 'react';
import { Trophy, ChevronDown, RotateCcw, ArrowRight } from 'lucide-react';
import { scoreICCAttempt, type ICCScore } from '@/lib/icc-scoring-engine';
import type { ICCMark } from '@/stores/iccStudio';
import type { ICCAnswer } from '@/data/icc-scenarios';
import { Link } from 'react-router-dom';

interface Props {
  marks: ICCMark[];
  biasSelection: 'bullish' | 'bearish' | null;
  answer: ICCAnswer;
  tradesTaken: number;
  totalPnl: number;
  onRetry: () => void;
  onNextScenario: () => void;
}

const GRADE_COLORS: Record<string, string> = {
  A: '#00ff9d', B: '#00e5ff', C: '#ffb800', D: '#ff3d57', F: '#ff3d57',
};

export function ICCScorePanel({ marks, biasSelection, answer, tradesTaken, totalPnl, onRetry, onNextScenario }: Props) {
  const [expanded, setExpanded] = useState(true);
  const score = scoreICCAttempt(marks, biasSelection, answer, tradesTaken, totalPnl);
  const gradeColor = GRADE_COLORS[score.grade] || '#00e5ff';

  return (
    <div className="rounded-2xl border border-terminal-border/40 bg-terminal-card/20 overflow-hidden animate-fade-in-up">
      {/* Header */}
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center justify-between px-5 py-4 cursor-pointer">
        <div className="flex items-center gap-3">
          <Trophy size={18} style={{ color: gradeColor }} />
          <div className="text-left">
            <h3 className="text-sm font-semibold text-white">ICC Analysis Score</h3>
            <p className="font-mono-nums text-[10px] text-terminal-muted">{score.percentage}% — Grade {score.grade}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Score gauge */}
          <div className="relative h-12 w-12">
            <svg viewBox="0 0 36 36" className="h-12 w-12 -rotate-90">
              <circle cx="18" cy="18" r="15" fill="none" stroke="var(--color-terminal-border)" strokeWidth="3" opacity="0.2" />
              <circle cx="18" cy="18" r="15" fill="none" stroke={gradeColor} strokeWidth="3"
                strokeDasharray={`${(score.percentage / 100) * 94.2} 94.2`} strokeLinecap="round"
                style={{ filter: `drop-shadow(0 0 4px ${gradeColor}50)` }} />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center font-mono-nums text-[13px] font-bold" style={{ color: gradeColor }}>
              {score.grade}
            </span>
          </div>
          <ChevronDown size={14} className={`text-terminal-muted transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {expanded && (
        <div className="border-t border-terminal-border/20 px-5 py-4 space-y-4">
          {/* Overall feedback */}
          <p className="text-[13px] leading-relaxed text-slate-300">{score.overallFeedback}</p>

          {/* Component breakdown */}
          <div className="space-y-3">
            {score.components.map((comp) => (
              <div key={comp.dimension}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[12px] font-medium text-white">{comp.dimension}</span>
                  <span className="font-mono-nums text-[11px] font-bold" style={{ color: comp.color }}>
                    {comp.score}/{comp.maxScore}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-terminal-border/20 overflow-hidden mb-1.5">
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${(comp.score / comp.maxScore) * 100}%`, backgroundColor: `${comp.color}60` }} />
                </div>
                <p className="text-[11px] text-slate-400">{comp.feedback}</p>
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="rounded-xl border border-terminal-border/20 bg-terminal-bg/50 p-4 text-center">
            <p className="font-mono-nums text-3xl font-bold" style={{ color: gradeColor }}>{score.percentage}%</p>
            <p className="text-[11px] text-terminal-muted mt-1">{score.total}/{score.maxTotal} points</p>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button onClick={onRetry} className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-terminal-border bg-terminal-card/60 py-2.5 text-[12px] font-semibold text-slate-200 cursor-pointer">
              <RotateCcw size={12} /> Retry
            </button>
            <button onClick={onNextScenario} className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-neon-cyan/15 border border-neon-cyan/30 py-2.5 text-[12px] font-semibold text-neon-cyan cursor-pointer">
              Next Scenario <ArrowRight size={12} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
