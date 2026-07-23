import { useState } from 'react';
import { AlertTriangle, ChevronDown, SkipForward, CheckCircle2 } from 'lucide-react';
import type { ICCScore, ScoreComponent } from '@/lib/icc-scoring-engine';
import type { ICCScenario } from '@/data/icc-scenarios';
import type { Candle } from '@/lib/chart-simulator-engine';
import type { Timeframe } from '@/lib/icc-candle-generator';

interface Props {
  score: ICCScore;
  scenario: ICCScenario;
  candles: Record<Timeframe, Candle[]>;
}

interface ReplaySection {
  dimension: string;
  comp: ScoreComponent;
  timeframe: Timeframe;
  answerStart: number;
  answerEnd: number;
  explanation: string;
}

function generateExplanation(dimension: string, scenario: ICCScenario, candles: Record<Timeframe, Candle[]>): string {
  const a = scenario.answer;

  if (dimension.toLowerCase().startsWith('bias')) {
    return `The 4H chart shows a clear ${a.bias} structure. Look at the swing points — ${a.bias === 'bullish' ? 'higher highs and higher lows indicate buyers are in control' : 'lower highs and lower lows indicate sellers are in control'}. Always determine bias first before looking at lower timeframes.`;
  }

  if (dimension.toLowerCase().startsWith('indication')) {
    const h1 = candles['1H'];
    const start = a.indicationRange[0];
    const end = a.indicationRange[1];
    if (start < h1.length && end < h1.length) {
      const move = Math.abs(h1[end].c - h1[start].o);
      const candle_count = end - start + 1;
      const direction = h1[end].c > h1[start].o ? 'bullish' : 'bearish';
      return `The indication spans candles ${start}-${end} on the 1H chart — ${candle_count} ${direction} candles moving ${move.toFixed(direction === 'bullish' ? 4 : 2)} with strong momentum and minimal pullback. This is the impulse move that confirms the 4H bias.`;
    }
    return 'The indication is the strong impulse move on the 1H chart that confirms the bias direction.';
  }

  if (dimension.toLowerCase().startsWith('correction')) {
    const m15 = candles['15M'];
    const start = a.correctionRange[0];
    const end = a.correctionRange[1];
    if (start < m15.length && end < m15.length) {
      const candle_count = end - start + 1;
      return `The correction spans candles ${start}-${end} on the 15M chart — ${candle_count} candles pulling back against the indication direction. Notice the smaller candle bodies and decreasing momentum compared to the indication. The pullback stays within the valid retracement zone (38-78%).`;
    }
    return 'The correction is the pullback on the 15M chart that retraces part of the indication move.';
  }

  if (dimension.toLowerCase().startsWith('continuation')) {
    return `The optimal continuation entry was at candle ${a.continuationCandle} on the 5M chart. This is where price resumed moving in the indication direction after the correction completed. Look for a strong candle that breaks the correction structure — that is your entry signal.`;
  }

  return 'Review the correct answer zones and compare with your marks to improve.';
}

function getTimeframeForDimension(dimension: string): Timeframe {
  if (dimension.toLowerCase().includes('bias') || dimension.toLowerCase().includes('4h')) return '4H';
  if (dimension.toLowerCase().includes('indication') || dimension.toLowerCase().includes('1h')) return '1H';
  if (dimension.toLowerCase().includes('correction') || dimension.toLowerCase().includes('15m')) return '15M';
  return '5M';
}

function getAnswerRange(dimension: string, answer: ICCScenario['answer']): [number, number] {
  if (dimension.toLowerCase().includes('indication')) return answer.indicationRange;
  if (dimension.toLowerCase().includes('correction')) return answer.correctionRange;
  if (dimension.toLowerCase().includes('continuation')) return [answer.continuationCandle, answer.continuationCandle];
  return [0, 0];
}

function MiniReplayChart({ candles, answerStart, answerEnd, color }: { candles: Candle[]; answerStart: number; answerEnd: number; color: string }) {
  const contextStart = Math.max(0, answerStart - 5);
  const contextEnd = Math.min(candles.length - 1, answerEnd + 5);
  const visible = candles.slice(contextStart, contextEnd + 1);
  if (visible.length === 0) return null;

  const min = Math.min(...visible.map(c => c.l));
  const max = Math.max(...visible.map(c => c.h));
  const range = max - min || 1;
  const cw = 10;
  const w = visible.length * cw + 16;
  const h = 80;
  const toY = (p: number) => 6 + ((max - p) / range) * (h - 16);

  const zoneStart = answerStart - contextStart;
  const zoneEnd = answerEnd - contextStart;

  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} className="rounded-lg bg-[#0a0f16]">
      {/* Answer zone */}
      <rect
        x={8 + zoneStart * cw - 2} y={0}
        width={(zoneEnd - zoneStart + 1) * cw + 4} height={h}
        fill={color} opacity={0.1} rx={3}
      />
      <line x1={8 + zoneStart * cw - 2} y1={0} x2={8 + zoneStart * cw - 2} y2={h} stroke={color} strokeWidth={1.5} strokeDasharray="4,2" opacity={0.6} />
      <line x1={8 + (zoneEnd + 1) * cw + 2} y1={0} x2={8 + (zoneEnd + 1) * cw + 2} y2={h} stroke={color} strokeWidth={1.5} strokeDasharray="4,2" opacity={0.6} />

      {/* Candles */}
      {visible.map((c, i) => {
        const x = 8 + i * cw;
        const isBull = c.c >= c.o;
        const clr = isBull ? '#00ff9d' : '#ff3d57';
        const bodyTop = toY(Math.max(c.o, c.c));
        const bodyH = Math.max(1, Math.abs(toY(c.o) - toY(c.c)));
        const inZone = i >= zoneStart && i <= zoneEnd;
        return (
          <g key={i} opacity={inZone ? 1 : 0.4}>
            <line x1={x + 3} y1={toY(c.h)} x2={x + 3} y2={toY(c.l)} stroke={clr} strokeWidth={0.7} />
            <rect x={x} y={bodyTop} width={6} height={bodyH} fill={clr} rx={0.5} />
          </g>
        );
      })}
    </svg>
  );
}

export function ICCMistakeReplay({ score, scenario, candles }: Props) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  // Find weak dimensions (below 50%)
  const weakDimensions: ReplaySection[] = score.components
    .filter(comp => (comp.score / comp.maxScore) < 0.5)
    .filter(comp => !comp.dimension.toLowerCase().includes('risk'))
    .map(comp => {
      const tf = getTimeframeForDimension(comp.dimension);
      const [start, end] = getAnswerRange(comp.dimension, scenario.answer);
      return {
        dimension: comp.dimension,
        comp,
        timeframe: tf,
        answerStart: start,
        answerEnd: end,
        explanation: generateExplanation(comp.dimension, scenario, candles),
      };
    });

  const visible = weakDimensions.filter(d => !dismissed.has(d.dimension));
  if (visible.length === 0) return null;

  return (
    <div className="rounded-2xl border border-neon-amber/20 bg-gradient-to-br from-neon-amber/[0.03] to-transparent overflow-hidden animate-fade-in-up">
      <div className="flex items-center gap-2 border-b border-neon-amber/15 px-5 py-3">
        <AlertTriangle size={16} className="text-neon-amber" />
        <span className="text-sm font-semibold text-white">Review Your Weak Areas</span>
        <span className="font-mono-nums text-[9px] text-neon-amber">{visible.length} area{visible.length !== 1 ? 's' : ''} to improve</span>
      </div>

      <div className="px-5 py-4 space-y-4">
        {visible.map(section => (
          <div key={section.dimension} className="rounded-xl border border-terminal-border/25 bg-terminal-bg/30 overflow-hidden">
            <div className="px-4 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[12px] font-semibold text-white">{section.comp.dimension}</span>
                <span className="font-mono-nums text-[10px] font-bold" style={{ color: section.comp.color }}>
                  {section.comp.score}/{section.comp.maxScore}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono-nums text-[9px] text-terminal-muted">{section.timeframe}</span>
                <button onClick={() => setDismissed(s => new Set(s).add(section.dimension))}
                  className="flex items-center gap-1 text-[10px] text-neon-green cursor-pointer hover:text-neon-green/80">
                  <CheckCircle2 size={10} /> Got it
                </button>
              </div>
            </div>

            {/* Mini chart showing correct zone */}
            {section.answerStart > 0 && (
              <div className="px-4 pb-2">
                <MiniReplayChart
                  candles={candles[section.timeframe]}
                  answerStart={section.answerStart}
                  answerEnd={section.answerEnd}
                  color={section.comp.color}
                />
              </div>
            )}

            <div className="px-4 pb-3">
              <p className="text-[11px] text-slate-400 leading-relaxed">{section.explanation}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
