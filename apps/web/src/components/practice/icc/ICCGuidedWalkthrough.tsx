import { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, ArrowRight, RotateCcw, Eye, Sparkles, Quote } from 'lucide-react';
import { GUIDED_STAGES, validateStage, type GuidedStage, type StageValidation } from '@/lib/icc-guided-engine';
import { GUIDED_TIPS } from '@/data/icc-lessons';
import type { ICCMark } from '@/stores/iccStudio';
import type { ICCAnswer } from '@/data/icc-scenarios';
import type { Timeframe } from '@/lib/icc-candle-generator';

interface Props {
  marks: ICCMark[];
  biasSelection: 'bullish' | 'bearish' | null;
  answer: ICCAnswer;
  tradesTaken: number;
  isFinished: boolean;
  onSwitchTimeframe: (tf: Timeframe) => void;
  onPausePlayback: () => void;
  onShowGhost: (show: boolean) => void;
}

export function ICCGuidedWalkthrough({
  marks, biasSelection, answer, tradesTaken, isFinished,
  onSwitchTimeframe, onPausePlayback, onShowGhost,
}: Props) {
  const [currentStageIdx, setCurrentStageIdx] = useState(0);
  const [stageResults, setStageResults] = useState<Record<GuidedStage, StageValidation | null>>({
    bias: null, indication: null, correction: null, continuation: null, trade: null,
  });
  const [showingCorrect, setShowingCorrect] = useState(false);
  const [validated, setValidated] = useState(false);

  const stage = GUIDED_STAGES[currentStageIdx];
  const result = stageResults[stage.stage];
  const allDone = currentStageIdx >= GUIDED_STAGES.length || isFinished;

  // Auto-switch timeframe and pause when entering a new stage
  useEffect(() => {
    if (allDone) return;
    onSwitchTimeframe(stage.targetTimeframe);
    if (stage.stage !== 'trade') onPausePlayback();
    setValidated(false);
    setShowingCorrect(false);
    onShowGhost(false);
  }, [currentStageIdx]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleValidate = () => {
    const validation = validateStage(stage.stage, marks, biasSelection, answer, tradesTaken);
    setStageResults(prev => ({ ...prev, [stage.stage]: validation }));
    setValidated(true);

    if (validation.correct) {
      // Auto-advance after 2 seconds
      setTimeout(() => {
        if (currentStageIdx < GUIDED_STAGES.length - 1) {
          setCurrentStageIdx(i => i + 1);
        }
      }, 2000);
    }
  };

  const handleShowAnswer = () => {
    setShowingCorrect(true);
    onShowGhost(true);
  };

  const handleRetry = () => {
    setValidated(false);
    setShowingCorrect(false);
    onShowGhost(false);
    setStageResults(prev => ({ ...prev, [stage.stage]: null }));
  };

  const handleSkip = () => {
    setStageResults(prev => ({ ...prev, [stage.stage]: { correct: false, feedback: 'Skipped' } }));
    if (currentStageIdx < GUIDED_STAGES.length - 1) {
      setCurrentStageIdx(i => i + 1);
    }
  };

  if (allDone) {
    const correctCount = Object.values(stageResults).filter(r => r?.correct).length;
    return (
      <div className="rounded-xl border border-neon-green/20 bg-neon-green/[0.04] p-4 text-center space-y-2">
        <Sparkles size={20} className="text-neon-green mx-auto" />
        <p className="text-[13px] font-semibold text-white">Walkthrough Complete!</p>
        <p className="text-[11px] text-terminal-muted">{correctCount}/5 steps correct on first attempt</p>
        <p className="text-[10px] text-slate-500">Scroll down for your full score breakdown.</p>
      </div>
    );
  }

  const progress = ((currentStageIdx) / GUIDED_STAGES.length) * 100;

  return (
    <div className="rounded-xl border border-terminal-border/30 bg-terminal-card/20 p-3 space-y-3">
      {/* Progress */}
      <div className="flex items-center gap-2">
        <p className="font-mono-nums text-[9px] uppercase tracking-widest text-terminal-muted">Guided Mode</p>
        <div className="flex-1 h-1 rounded-full bg-terminal-border/20 overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progress}%`, backgroundColor: stage.color }} />
        </div>
        <span className="font-mono-nums text-[9px] text-terminal-muted">{currentStageIdx + 1}/5</span>
      </div>

      {/* Stage steps overview */}
      <div className="space-y-1">
        {GUIDED_STAGES.map((s, i) => {
          const res = stageResults[s.stage];
          const isActive = i === currentStageIdx;
          const isPast = i < currentStageIdx;
          return (
            <div key={s.stage} className={`rounded-lg px-2.5 py-1.5 transition-all ${isActive ? 'bg-terminal-bg/80 border border-terminal-border/30' : ''}`}>
              <div className="flex items-center gap-2">
                <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full" style={{
                  backgroundColor: res?.correct ? `${s.color}20` : isActive ? `${s.color}10` : '#151d2830',
                  border: `1.5px solid ${res?.correct ? s.color : isActive ? `${s.color}60` : '#151d2850'}`,
                }}>
                  {res?.correct && <CheckCircle2 size={10} style={{ color: s.color }} />}
                  {isPast && !res?.correct && res && <XCircle size={10} className="text-neon-red" />}
                  {isActive && !validated && <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ backgroundColor: s.color }} />}
                </div>
                <span className={`text-[10px] font-medium ${res?.correct ? 'text-slate-400' : isActive ? 'text-white' : 'text-terminal-muted'}`}>
                  {s.title}
                </span>
                {s.stage !== 'trade' && isActive && (
                  <span className="font-mono-nums text-[8px] rounded px-1 py-0.5 ml-auto" style={{ color: s.color, backgroundColor: `${s.color}12`, border: `1px solid ${s.color}25` }}>
                    {s.targetTimeframe}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Active stage instruction */}
      <div className="rounded-lg border border-terminal-border/20 bg-terminal-bg/50 p-3 space-y-2">
        <p className="text-[12px] font-semibold" style={{ color: stage.color }}>{stage.title}</p>
        <p className="text-[10px] text-slate-400 leading-relaxed">{stage.instruction}</p>
        {/* Contextual tip from ICC course */}
        {GUIDED_TIPS[stage.stage] && (
          <div className="rounded-md border border-terminal-border/15 bg-terminal-bg/30 px-2.5 py-2 mt-1">
            <div className="flex items-start gap-1.5">
              <Quote size={10} className="shrink-0 mt-0.5" style={{ color: stage.color }} />
              <div>
                <p className="text-[9px] text-slate-400 italic leading-relaxed">"{GUIDED_TIPS[stage.stage].quote}"</p>
                <p className="text-[8px] text-terminal-muted mt-0.5">— ICC Course {GUIDED_TIPS[stage.stage].source}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Validation result */}
      {validated && result && (
        <div className={`rounded-lg border px-3 py-2.5 ${result.correct ? 'border-neon-green/25 bg-neon-green/[0.06]' : 'border-neon-red/25 bg-neon-red/[0.06]'}`}>
          <div className="flex items-start gap-2">
            {result.correct ? <CheckCircle2 size={14} className="text-neon-green shrink-0 mt-0.5" /> : <XCircle size={14} className="text-neon-red shrink-0 mt-0.5" />}
            <p className={`text-[11px] leading-relaxed ${result.correct ? 'text-neon-green/90' : 'text-slate-400'}`}>{result.feedback}</p>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2">
        {!validated ? (
          <button onClick={handleValidate}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-[11px] font-semibold cursor-pointer"
            style={{ backgroundColor: `${stage.color}15`, border: `1px solid ${stage.color}30`, color: stage.color }}>
            Check My Answer <ArrowRight size={11} />
          </button>
        ) : result && !result.correct ? (
          <>
            <button onClick={handleRetry}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-terminal-border bg-terminal-card/60 py-2 text-[11px] font-semibold text-slate-200 cursor-pointer">
              <RotateCcw size={10} /> Retry
            </button>
            {!showingCorrect && (
              <button onClick={handleShowAnswer}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-neon-purple/30 bg-neon-purple/10 py-2 text-[11px] font-semibold text-neon-purple cursor-pointer">
                <Eye size={10} /> Show Answer
              </button>
            )}
            <button onClick={handleSkip}
              className="flex items-center justify-center gap-1 rounded-lg border border-terminal-border/30 px-3 py-2 text-[10px] text-terminal-muted cursor-pointer">
              Skip <ArrowRight size={9} />
            </button>
          </>
        ) : result?.correct ? (
          <div className="flex-1 text-center py-1">
            <span className="text-[10px] text-neon-green animate-pulse">Advancing to next step...</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
