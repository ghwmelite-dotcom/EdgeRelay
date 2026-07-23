import { useState, useEffect, useRef, useCallback } from 'react';
import { Zap, Clock, CheckCircle2, XCircle, RotateCcw, ArrowRight, Trophy } from 'lucide-react';
import { DRILL_QUESTIONS, type DrillQuestion } from '@/data/icc-drill-data';

interface Props {
  onClose: () => void;
}

const SPEED_PRESETS = [
  { label: 'Relaxed', seconds: 30, description: 'Take your time — best for beginners' },
  { label: 'Normal', seconds: 20, description: 'Comfortable pace for practicing' },
  { label: 'Fast', seconds: 10, description: 'Speed training — test your reflexes' },
  { label: 'No Timer', seconds: 0, description: 'No time limit — study mode' },
];
const QUESTIONS_PER_SESSION = 18;
const DRILL_SCORES_KEY = 'icc-drill-scores';

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function MiniCandleChart({ candles }: { candles: DrillQuestion['candles'] }) {
  const min = Math.min(...candles.map(c => Math.min(c.l, c.o, c.c)));
  const max = Math.max(...candles.map(c => Math.max(c.h, c.o, c.c)));
  const range = max - min || 1;
  const w = candles.length * 18 + 20;
  const h = 120;
  const toY = (p: number) => 10 + ((max - p) / range) * (h - 20);

  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} className="rounded-lg bg-[#0a0f16]">
      {candles.map((c, i) => {
        const x = 10 + i * 18;
        const isBull = c.c >= c.o;
        const color = isBull ? '#00ff9d' : '#ff3d57';
        const bodyTop = toY(Math.max(c.o, c.c));
        const bodyH = Math.max(2, Math.abs(toY(c.o) - toY(c.c)));
        return (
          <g key={i}>
            <line x1={x + 4} y1={toY(c.h)} x2={x + 4} y2={toY(c.l)} stroke={color} strokeWidth={1} opacity={0.5} />
            <rect x={x} y={bodyTop} width={8} height={bodyH} fill={color} opacity={0.7} rx={1} />
            <text x={x + 4} y={h - 2} textAnchor="middle" fill="#6b7f95" fontSize={7} fontFamily="monospace">{i + 1}</text>
          </g>
        );
      })}
    </svg>
  );
}

export function ICCFlashDrills({ onClose }: Props) {
  const [speed, setSpeed] = useState<number | null>(null); // null = not started yet
  const [questions] = useState(() => shuffleArray(DRILL_QUESTIONS).slice(0, QUESTIONS_PER_SESSION));
  const [currentIdx, setCurrentIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState<null | boolean>(null);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(20);
  const [finished, setFinished] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const q = questions[currentIdx];
  const timePerQuestion = speed ?? 20;

  const advance = useCallback(() => {
    if (currentIdx + 1 >= questions.length) {
      setFinished(true);
      // Save score
      try {
        const key = DRILL_SCORES_KEY;
        const existing = JSON.parse(localStorage.getItem(key) || '[]');
        const finalScore = score + (answered === true ? 1 : 0);
        existing.push({ timestamp: Date.now(), correct: finalScore, total: questions.length, percentage: Math.round((finalScore / questions.length) * 100) });
        localStorage.setItem(key, JSON.stringify(existing.slice(-20)));
      } catch {}
    } else {
      setCurrentIdx(i => i + 1);
      setAnswered(null);
      setSelectedIdx(null);
      setTimeLeft(timePerQuestion);
    }
  }, [currentIdx, questions.length, score, answered, timePerQuestion]);

  // Timer countdown (skip if no timer mode)
  useEffect(() => {
    if (finished || answered !== null || timePerQuestion === 0) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          setAnswered(false);
          setSelectedIdx(-1);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [currentIdx, finished, answered, timePerQuestion]);

  // No auto-advance — user clicks "Next" when ready

  const handleAnswer = (idx: number) => {
    if (answered !== null) return;
    if (timerRef.current) clearInterval(timerRef.current);
    const correct = idx === q.correctIndex;
    setSelectedIdx(idx);
    setAnswered(correct);
    if (correct) setScore(s => s + 1);
  };

  // Speed selection screen
  if (speed === null) {
    return (
      <div className="max-w-lg mx-auto animate-fade-in-up">
        <div className="rounded-2xl border border-terminal-border/40 bg-terminal-card/20 p-6 space-y-5">
          <div className="text-center">
            <Zap size={24} className="text-neon-amber mx-auto mb-2" />
            <h3 className="font-display text-lg font-bold text-white">Flash Drills</h3>
            <p className="text-[13px] text-terminal-muted mt-1">{QUESTIONS_PER_SESSION} questions to test your ICC pattern recognition</p>
          </div>
          <div>
            <p className="font-mono-nums text-[10px] uppercase tracking-widest text-terminal-muted mb-3">Choose your pace</p>
            <div className="space-y-2">
              {SPEED_PRESETS.map(preset => (
                <button key={preset.label}
                  onClick={() => { setSpeed(preset.seconds); setTimeLeft(preset.seconds); }}
                  className="w-full text-left rounded-xl border border-terminal-border/30 bg-terminal-bg/30 px-4 py-3 hover:border-neon-cyan/30 transition-all cursor-pointer group">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[14px] font-semibold text-white group-hover:text-neon-cyan transition-colors">{preset.label}</p>
                      <p className="text-[11px] text-terminal-muted">{preset.description}</p>
                    </div>
                    <span className="font-mono-nums text-[13px] font-bold text-neon-cyan">
                      {preset.seconds > 0 ? `${preset.seconds}s` : 'Unlimited'}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
          <button onClick={onClose} className="w-full text-center text-[12px] text-terminal-muted hover:text-white cursor-pointer py-1">Cancel</button>
        </div>
      </div>
    );
  }

  if (finished) {
    const pct = Math.round((score / questions.length) * 100);
    const grade = pct >= 90 ? 'A' : pct >= 75 ? 'B' : pct >= 60 ? 'C' : pct >= 40 ? 'D' : 'F';
    const gradeColor = { A: '#00ff9d', B: '#00e5ff', C: '#ffb800', D: '#ff3d57', F: '#ff3d57' }[grade];
    return (
      <div className="max-w-lg mx-auto animate-fade-in-up">
        <div className="rounded-2xl border border-terminal-border/40 bg-terminal-card/20 p-8 text-center space-y-4">
          <Trophy size={32} style={{ color: gradeColor }} className="mx-auto" />
          <h3 className="font-display text-xl font-bold text-white">Drill Complete!</h3>
          <div className="font-mono-nums text-4xl font-bold" style={{ color: gradeColor }}>{score}/{questions.length}</div>
          <p className="text-[13px] text-slate-400">{pct}% pattern recognition accuracy — Grade {grade}</p>
          <div className="h-3 rounded-full bg-terminal-border/20 overflow-hidden">
            <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${pct}%`, backgroundColor: `${gradeColor}60` }} />
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={() => { setCurrentIdx(0); setScore(0); setFinished(false); setAnswered(null); setSelectedIdx(null); setTimeLeft(timePerQuestion); }}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-terminal-border bg-terminal-card/60 py-2.5 text-[12px] font-semibold text-slate-200 cursor-pointer">
              <RotateCcw size={12} /> Retry
            </button>
            <button onClick={onClose}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-neon-cyan/15 border border-neon-cyan/30 py-2.5 text-[12px] font-semibold text-neon-cyan cursor-pointer">
              Back to Studio <ArrowRight size={12} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  const timerPct = timePerQuestion > 0 ? (timeLeft / timePerQuestion) * 100 : 100;
  const timerColor = timePerQuestion === 0 ? '#00e5ff' : timeLeft <= 3 ? '#ff3d57' : timeLeft <= 5 ? '#ffb800' : '#00e5ff';

  return (
    <div className="max-w-lg mx-auto animate-fade-in-up space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap size={16} className="text-neon-amber" />
          <span className="text-sm font-semibold text-white">Flash Drills</span>
          <span className="font-mono-nums text-[10px] text-neon-cyan">{currentIdx + 1}/{questions.length}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono-nums text-[11px] text-neon-green">{score} correct</span>
          <button onClick={onClose} className="text-[10px] text-terminal-muted hover:text-white cursor-pointer">Exit</button>
        </div>
      </div>

      {/* Timer bar */}
      <div className="h-1.5 rounded-full bg-terminal-border/20 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${timerPct}%`, backgroundColor: timerColor }} />
      </div>

      {/* Question card */}
      <div className="rounded-2xl border border-terminal-border/40 bg-terminal-card/20 overflow-hidden">
        <div className="px-5 py-3 border-b border-terminal-border/20 flex items-center justify-between">
          <p className="text-[13px] font-semibold text-white">{q.prompt}</p>
          <div className="flex items-center gap-1">
            <Clock size={11} className="shrink-0" style={{ color: timerColor }} />
            <span className="font-mono-nums text-[11px] font-bold" style={{ color: timerColor }}>{timePerQuestion === 0 ? 'No limit' : `${timeLeft}s`}</span>
          </div>
        </div>

        {/* Chart */}
        <div className="px-5 py-4">
          <MiniCandleChart candles={q.candles} />
        </div>

        {/* Choices */}
        <div className="px-5 pb-5 space-y-2">
          {q.choices.map((choice, i) => {
            let btnClass = 'border border-terminal-border/30 text-slate-300 hover:border-terminal-border-hover';
            if (answered !== null) {
              if (i === q.correctIndex) btnClass = 'border border-neon-green/40 bg-neon-green/10 text-neon-green';
              else if (i === selectedIdx && !answered) btnClass = 'border border-neon-red/40 bg-neon-red/10 text-neon-red';
              else btnClass = 'border border-terminal-border/20 text-terminal-muted opacity-50';
            }
            return (
              <button key={i} onClick={() => handleAnswer(i)} disabled={answered !== null}
                className={`w-full text-left rounded-xl px-4 py-3 text-[12px] font-semibold cursor-pointer transition-all flex items-center gap-2 ${btnClass}`}>
                {answered !== null && i === q.correctIndex && <CheckCircle2 size={14} className="text-neon-green shrink-0" />}
                {answered !== null && i === selectedIdx && !answered && <XCircle size={14} className="text-neon-red shrink-0" />}
                {choice}
              </button>
            );
          })}
        </div>

        {/* Explanation + Next button (shown after answer) */}
        {answered !== null && (
          <div className={`px-5 pb-4 border-t ${answered ? 'border-neon-green/15' : 'border-neon-red/15'}`}>
            <p className={`text-[13px] leading-relaxed mt-3 ${answered ? 'text-neon-green/80' : 'text-slate-400'}`}>
              {q.explanation}
            </p>
            <button onClick={advance}
              className="mt-3 w-full flex items-center justify-center gap-1.5 rounded-xl bg-neon-cyan/15 border border-neon-cyan/30 py-2.5 text-[13px] font-semibold text-neon-cyan cursor-pointer hover:bg-neon-cyan/20 transition-all">
              {currentIdx + 1 >= questions.length ? 'See Results' : 'Next Question'} <ArrowRight size={13} />
            </button>
          </div>
        )}
      </div>

      {/* Progress dots */}
      <div className="flex justify-center gap-1">
        {questions.map((_, i) => (
          <div key={i} className="h-1.5 w-1.5 rounded-full transition-all" style={{
            backgroundColor: i < currentIdx ? (i < score ? '#00ff9d' : '#ff3d57') : i === currentIdx ? '#00e5ff' : '#151d2880',
          }} />
        ))}
      </div>
    </div>
  );
}
