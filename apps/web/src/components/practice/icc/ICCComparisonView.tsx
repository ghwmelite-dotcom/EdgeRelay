import { useState } from 'react';
import { GitCompare, ChevronDown, CheckCircle2, XCircle } from 'lucide-react';
import type { ICCMark } from '@/stores/iccStudio';
import type { ICCAnswer } from '@/data/icc-scenarios';
import { overlapPercentage } from '@/lib/icc-scoring-engine';

interface Props {
  marks: ICCMark[];
  biasSelection: 'bullish' | 'bearish' | null;
  answer: ICCAnswer;
}

interface DimensionComparison {
  dimension: string;
  label: string;
  userRange: [number, number] | null;
  answerRange: [number, number];
  overlapPct: number;
  color: string;
  answerColor: string;
  feedback: string;
}

export function ICCComparisonView({ marks, biasSelection, answer }: Props) {
  const [expanded, setExpanded] = useState(true);

  const indMark = marks.find(m => m.type === 'indication');
  const corMark = marks.find(m => m.type === 'correction');
  const conMark = marks.find(m => m.type === 'continuation');

  const comparisons: DimensionComparison[] = [
    {
      dimension: 'bias',
      label: 'Bias (4H)',
      userRange: null,
      answerRange: [0, 0],
      overlapPct: biasSelection === answer.bias ? 100 : 0,
      color: '#b18cff',
      answerColor: '#b18cff',
      feedback: biasSelection === answer.bias
        ? `Correct — ${answer.bias} bias`
        : biasSelection
          ? `You said ${biasSelection}, correct was ${answer.bias}`
          : 'Not marked',
    },
    {
      dimension: 'indication',
      label: 'Indication (1H)',
      userRange: indMark ? [indMark.startIndex, indMark.endIndex] : null,
      answerRange: answer.indicationRange,
      overlapPct: indMark ? overlapPercentage([indMark.startIndex, indMark.endIndex], answer.indicationRange) : 0,
      color: '#00e5ff',
      answerColor: '#00ff9d',
      feedback: indMark
        ? `You marked [${indMark.startIndex}-${indMark.endIndex}], optimal [${answer.indicationRange.join('-')}]`
        : 'Not marked',
    },
    {
      dimension: 'correction',
      label: 'Correction (15M)',
      userRange: corMark ? [corMark.startIndex, corMark.endIndex] : null,
      answerRange: answer.correctionRange,
      overlapPct: corMark ? overlapPercentage([corMark.startIndex, corMark.endIndex], answer.correctionRange) : 0,
      color: '#ffb800',
      answerColor: '#00ff9d',
      feedback: corMark
        ? `You marked [${corMark.startIndex}-${corMark.endIndex}], optimal [${answer.correctionRange.join('-')}]`
        : 'Not marked',
    },
    {
      dimension: 'continuation',
      label: 'Continuation (5M)',
      userRange: conMark ? [conMark.startIndex, conMark.startIndex] : null,
      answerRange: [answer.continuationCandle, answer.continuationCandle],
      overlapPct: conMark ? Math.max(0, 100 - Math.abs(conMark.startIndex - answer.continuationCandle) * 10) : 0,
      color: '#00ff9d',
      answerColor: '#00ff9d',
      feedback: conMark
        ? `Your entry: candle ${conMark.startIndex}, optimal: ${answer.continuationCandle}. ${Math.abs(conMark.startIndex - answer.continuationCandle)} candles ${conMark.startIndex > answer.continuationCandle ? 'late' : conMark.startIndex < answer.continuationCandle ? 'early' : 'perfect'}.`
        : 'Not marked',
    },
  ];

  return (
    <div className="rounded-2xl border border-neon-cyan/20 bg-gradient-to-br from-neon-cyan/[0.03] to-transparent overflow-hidden animate-fade-in-up">
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center justify-between px-5 py-3 cursor-pointer">
        <div className="flex items-center gap-2">
          <GitCompare size={16} className="text-neon-cyan" />
          <span className="text-sm font-semibold text-white">Your Marks vs. Correct Answer</span>
        </div>
        <ChevronDown size={14} className={`text-terminal-muted transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {expanded && (
        <div className="border-t border-neon-cyan/10 px-5 py-4 space-y-4">
          {comparisons.map(comp => {
            const isGood = comp.overlapPct >= 60;
            const isPartial = comp.overlapPct >= 30;
            return (
              <div key={comp.dimension} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isGood ? <CheckCircle2 size={12} className="text-neon-green" /> : <XCircle size={12} className="text-neon-red" />}
                    <span className="text-[12px] font-semibold text-white">{comp.label}</span>
                  </div>
                  <span className="font-mono-nums text-[11px] font-bold" style={{ color: isGood ? '#00ff9d' : isPartial ? '#ffb800' : '#ff3d57' }}>
                    {comp.dimension === 'bias' ? (comp.overlapPct === 100 ? 'Correct' : 'Wrong') : `${Math.round(comp.overlapPct)}% match`}
                  </span>
                </div>

                {/* Visual range comparison bar */}
                {comp.dimension !== 'bias' && comp.userRange && (
                  <div className="relative h-6 rounded-lg bg-terminal-bg/60 overflow-hidden">
                    {/* Answer range */}
                    {(() => {
                      const totalRange = Math.max(
                        (comp.userRange?.[1] ?? 0) + 10,
                        comp.answerRange[1] + 10,
                      );
                      const aStart = (comp.answerRange[0] / totalRange) * 100;
                      const aWidth = ((comp.answerRange[1] - comp.answerRange[0] + 1) / totalRange) * 100;
                      const uStart = comp.userRange ? (comp.userRange[0] / totalRange) * 100 : 0;
                      const uWidth = comp.userRange ? ((comp.userRange[1] - comp.userRange[0] + 1) / totalRange) * 100 : 0;
                      return (
                        <>
                          <div className="absolute h-full rounded" style={{ left: `${aStart}%`, width: `${Math.max(aWidth, 1)}%`, backgroundColor: `${comp.answerColor}25`, border: `1px solid ${comp.answerColor}40` }} />
                          <div className="absolute h-full rounded" style={{ left: `${uStart}%`, width: `${Math.max(uWidth, 1)}%`, backgroundColor: `${comp.color}25`, border: `1px solid ${comp.color}40` }} />
                          <div className="absolute bottom-0.5 left-1 flex gap-3">
                            <span className="text-[7px] font-mono-nums" style={{ color: comp.color }}>You</span>
                            <span className="text-[7px] font-mono-nums" style={{ color: comp.answerColor }}>Answer</span>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}

                <p className="text-[10px] text-slate-400">{comp.feedback}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
