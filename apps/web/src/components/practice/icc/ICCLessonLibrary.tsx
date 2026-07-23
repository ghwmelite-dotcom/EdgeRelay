import { useState } from 'react';
import { BookOpen, ChevronDown, X, Quote, Lightbulb, CheckCircle2 } from 'lucide-react';
import { ICC_LESSONS, type ICCLesson } from '@/data/icc-lessons';
import { LESSON_ILLUSTRATIONS } from './ICCLessonIllustrations';

interface Props {
  onClose: () => void;
}

const ICON_LABELS: Record<string, string> = {
  basics: 'Basics', trend: 'Trends', indication: 'Indication', correction: 'Correction',
  continuation: 'Continuation', structure: 'Structure', timeframe: 'Timeframes',
  psychology: 'Psychology', markup: 'Markup', decision: 'Decisions',
};

function LessonCard({ lesson }: { lesson: ICCLesson }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-2xl border border-terminal-border/30 bg-terminal-card/20 overflow-hidden">
      <button onClick={() => setExpanded(!expanded)} className="w-full text-left cursor-pointer">
        <div className="h-[3px] w-full" style={{ background: `linear-gradient(90deg, ${lesson.color}60, ${lesson.color}20, transparent)` }} />
        <div className="p-4">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="font-mono-nums text-[12px] font-bold rounded-md px-1.5 py-0.5" style={{ color: lesson.color, backgroundColor: `${lesson.color}12`, border: `1px solid ${lesson.color}25` }}>
              Day {lesson.day}
            </span>
            <span className="text-[11px] text-terminal-muted">{ICON_LABELS[lesson.icon]}</span>
            <ChevronDown size={12} className={`text-terminal-muted ml-auto transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </div>
          <h4 className="text-[15px] font-semibold text-white">{lesson.title}</h4>
          <p className="text-[12px] text-terminal-muted mt-0.5">{lesson.subtitle}</p>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-terminal-border/15 px-4 pb-4 space-y-4">
          {/* Illustration */}
          {LESSON_ILLUSTRATIONS[lesson.id] && (
            <div className="pt-3">
              {LESSON_ILLUSTRATIONS[lesson.id]()}
            </div>
          )}

          {/* Summary */}
          <p className="text-[13px] text-slate-300 leading-relaxed">{lesson.summary}</p>

          {/* Key Points */}
          <div>
            <p className="font-mono-nums text-[9px] uppercase tracking-widest text-terminal-muted mb-2">Key Points</p>
            <ul className="space-y-1.5">
              {lesson.keyPoints.map((point, i) => (
                <li key={i} className="flex items-start gap-2">
                  <CheckCircle2 size={12} className="shrink-0 mt-0.5" style={{ color: lesson.color }} />
                  <span className="text-[12px] text-slate-400">{point}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Rules */}
          <div>
            <p className="font-mono-nums text-[9px] uppercase tracking-widest text-terminal-muted mb-2">Rules to Remember</p>
            <div className="space-y-1.5">
              {lesson.rules.map((rule, i) => (
                <div key={i} className="flex items-start gap-2 rounded-lg bg-terminal-bg/50 px-3 py-2">
                  <Lightbulb size={11} className="text-neon-amber shrink-0 mt-0.5" />
                  <span className="text-[12px] text-white font-medium">{rule}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quote */}
          <div className="rounded-xl border border-terminal-border/20 bg-terminal-bg/30 p-3">
            <div className="flex items-start gap-2">
              <Quote size={14} className="shrink-0 mt-0.5" style={{ color: lesson.color }} />
              <p className="text-[12px] text-slate-300 italic leading-relaxed">"{lesson.quote}"</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function ICCLessonLibrary({ onClose }: Props) {
  const [filter, setFilter] = useState<string | null>(null);

  const filtered = filter ? ICC_LESSONS.filter(l => l.icon === filter) : ICC_LESSONS;

  const categories = Array.from(new Set(ICC_LESSONS.map(l => l.icon)));

  return (
    <div className="animate-fade-in-up space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen size={16} className="text-neon-cyan" />
          <h3 className="text-sm font-semibold text-white">ICC Lesson Library</h3>
          <span className="font-mono-nums text-[10px] text-terminal-muted">{ICC_LESSONS.length} lessons</span>
        </div>
        <button onClick={onClose} className="text-terminal-muted hover:text-white cursor-pointer"><X size={14} /></button>
      </div>

      {/* Category filters */}
      <div className="flex gap-1.5 flex-wrap">
        <button onClick={() => setFilter(null)}
          className={`rounded-lg px-2.5 py-1 text-[10px] font-semibold cursor-pointer transition-all ${!filter ? 'bg-neon-cyan/15 border border-neon-cyan/30 text-neon-cyan' : 'border border-terminal-border/20 text-terminal-muted hover:text-white'}`}>
          All
        </button>
        {categories.map(cat => (
          <button key={cat} onClick={() => setFilter(filter === cat ? null : cat)}
            className={`rounded-lg px-2.5 py-1 text-[10px] font-semibold cursor-pointer transition-all ${filter === cat ? 'bg-neon-cyan/15 border border-neon-cyan/30 text-neon-cyan' : 'border border-terminal-border/20 text-terminal-muted hover:text-white'}`}>
            {ICON_LABELS[cat]}
          </button>
        ))}
      </div>

      {/* Lesson cards */}
      <div className="space-y-3">
        {filtered.map(lesson => (
          <LessonCard key={lesson.id} lesson={lesson} />
        ))}
      </div>
    </div>
  );
}
