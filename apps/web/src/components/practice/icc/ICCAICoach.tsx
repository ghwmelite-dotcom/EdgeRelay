import { useState, useEffect } from 'react';
import { Brain, Loader2, X } from 'lucide-react';
import { api } from '@/lib/api';
import type { ICCMark } from '@/stores/iccStudio';
import type { ICCAnswer, ICCScenario } from '@/data/icc-scenarios';
import type { ICCScore } from '@/lib/icc-scoring-engine';

interface Props {
  scenario: ICCScenario;
  marks: ICCMark[];
  biasSelection: 'bullish' | 'bearish' | null;
  score: ICCScore;
  totalPnl: number;
  tradesTaken: number;
}

export function ICCAICoach({ scenario, marks, biasSelection, score, totalPnl, tradesTaken }: Props) {
  const [coaching, setCoaching] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (score.percentage > 0 && !coaching && !dismissed) {
      fetchCoaching(cancelled);
    }
    return () => { cancelled = true; };
  }, [score.percentage]); // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchCoaching(cancelled = false) {
    setLoading(true);
    try {
      // Use the counselor session endpoint with ICC-specific context
      const sessionRes = await api.post<{ id: string }>('/counselor/sessions');
      if (!sessionRes.data) { setLoading(false); return; }

      const indMark = marks.find(m => m.type === 'indication');
      const corMark = marks.find(m => m.type === 'correction');
      const conMark = marks.find(m => m.type === 'continuation');

      const weakest = score.components.reduce((a, b) => (a.score / a.maxScore) < (b.score / b.maxScore) ? a : b);

      const prompt = `[Context: ICC Practice Studio coaching. Be an ICC trading coach. Give specific, actionable advice in 3-4 sentences. Reference the student's actual marks and scores. Use emojis sparingly.]

The student just completed an ICC practice scenario:
- Asset: ${scenario.instrument} (${scenario.session})
- Difficulty: ${scenario.difficulty}
- Overall grade: ${score.grade} (${score.percentage}%)
- Bias selected: ${biasSelection || 'not set'} (correct: ${scenario.answer.bias})
- Indication marked: ${indMark ? `${indMark.timeframe} [${indMark.startIndex}-${indMark.endIndex}]` : 'not marked'} (answer: 1H [${scenario.answer.indicationRange.join('-')}])
- Correction marked: ${corMark ? `${corMark.timeframe} [${corMark.startIndex}-${corMark.endIndex}]` : 'not marked'} (answer: 15M [${scenario.answer.correctionRange.join('-')}])
- Continuation marked: ${conMark ? `${conMark.timeframe} [${conMark.startIndex}]` : 'not marked'} (answer: 5M [${scenario.answer.continuationCandle}])
- Trades taken: ${tradesTaken}, P&L: $${totalPnl.toFixed(2)}
- Weakest dimension: ${weakest.dimension} (${weakest.score}/${weakest.maxScore})
- Weakest feedback: ${weakest.feedback}

Give specific coaching on their weakest area. What should they focus on in the next attempt?`;

      const res = await api.post<{
        userMessage: { content: string };
        assistantMessage: { content: string };
      }>(`/counselor/sessions/${sessionRes.data.id}/messages`, { message: prompt });

      if (res.data && !cancelled) {
        setCoaching(res.data.assistantMessage.content);
      }
    } catch {}
    if (!cancelled) setLoading(false);
  }

  if (dismissed) return null;

  return (
    <div className="rounded-2xl border border-neon-purple/20 bg-gradient-to-br from-neon-purple/[0.04] to-transparent overflow-hidden animate-fade-in-up">
      <div className="flex items-center justify-between border-b border-neon-purple/15 px-5 py-3">
        <div className="flex items-center gap-2">
          <Brain size={16} className="text-neon-purple" />
          <span className="text-sm font-semibold text-white">AI ICC Coach</span>
          <span className="font-mono-nums text-[9px] text-neon-green">Powered by AI</span>
        </div>
        <button onClick={() => setDismissed(true)} className="text-terminal-muted hover:text-white cursor-pointer">
          <X size={14} />
        </button>
      </div>

      <div className="px-5 py-4">
        {loading ? (
          <div className="flex items-center gap-2 text-terminal-muted py-2">
            <Loader2 size={14} className="animate-spin" />
            <span className="text-[12px]">AI analyzing your ICC analysis...</span>
          </div>
        ) : coaching ? (
          <div className="text-[13px] leading-relaxed text-slate-300 whitespace-pre-line">
            {coaching}
          </div>
        ) : (
          <p className="text-[12px] text-terminal-muted">Coaching will appear after you complete a scenario.</p>
        )}
      </div>
    </div>
  );
}
