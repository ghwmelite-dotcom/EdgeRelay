import { useState } from 'react';
import { BarChart3, CheckCircle2, XCircle, RotateCcw } from 'lucide-react';

interface Candle {
  open: number;
  close: number;
  high: number;
  low: number;
  label: string;
}

const CANDLES: Candle[] = [
  { open: 1.1050, close: 1.1120, high: 1.1135, low: 1.1030, label: 'Bullish candle with long lower wick' },
  { open: 1.2200, close: 1.2140, high: 1.2230, low: 1.2110, label: 'Bearish candle with upper and lower wicks' },
  { open: 1.0800, close: 1.0802, high: 1.0850, low: 1.0770, label: 'Doji — indecision candle (open ≈ close)' },
  { open: 1.1500, close: 1.1620, high: 1.1625, low: 1.1495, label: 'Strong bullish candle with almost no wicks (Marubozu)' },
];

const QUESTIONS = [
  { ask: 'Where is the OPEN?', key: 'open' as const },
  { ask: 'Where is the CLOSE?', key: 'close' as const },
  { ask: 'Is this candle BULLISH or BEARISH?', key: 'direction' as const },
];

export function CandlestickQuiz() {
  const [candleIdx, setCandleIdx] = useState(0);
  const [step, setStep] = useState(0);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState<boolean | null>(null);

  const candle = CANDLES[candleIdx];
  const isBullish = candle.close > candle.open;
  const bodyTop = Math.max(candle.open, candle.close);
  const bodyBottom = Math.min(candle.open, candle.close);
  const range = candle.high - candle.low;

  // Normalize to 0-200 SVG height
  const toY = (price: number) => 200 - ((price - candle.low) / range) * 180 - 10;

  const currentQ = QUESTIONS[step];

  const handleAnswer = (answer: string) => {
    let correct = false;
    if (currentQ.key === 'open') {
      correct = answer === candle.open.toFixed(4);
    } else if (currentQ.key === 'close') {
      correct = answer === candle.close.toFixed(4);
    } else if (currentQ.key === 'direction') {
      correct = (answer === 'bullish') === isBullish;
    }

    if (correct) setScore((s) => s + 1);
    setAnswered(correct);

    setTimeout(() => {
      setAnswered(null);
      if (step < QUESTIONS.length - 1) {
        setStep((s) => s + 1);
      } else {
        // Move to next candle or finish
        if (candleIdx < CANDLES.length - 1) {
          setCandleIdx((c) => c + 1);
          setStep(0);
        }
      }
    }, 1200);
  };

  const isFinished = candleIdx === CANDLES.length - 1 && step === QUESTIONS.length - 1 && answered !== null;
  const totalQuestions = CANDLES.length * QUESTIONS.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 size={16} className="text-neon-cyan" />
          <h4 className="text-sm font-semibold text-white">Candlestick Reading Exercise</h4>
        </div>
        <span className="font-mono-nums text-[11px] text-terminal-muted">
          Candle {candleIdx + 1}/{CANDLES.length} · Q{step + 1}/{QUESTIONS.length}
        </span>
      </div>

      <div className="flex gap-6 items-start">
        {/* SVG Candle */}
        <div className="shrink-0">
          <svg width="80" height="220" viewBox="0 0 80 220" className="rounded-lg bg-terminal-bg/50 border border-terminal-border/20 p-2">
            {/* Upper wick */}
            <line x1="40" y1={toY(candle.high)} x2="40" y2={toY(bodyTop)} stroke={isBullish ? '#00ff9d' : '#ff3d57'} strokeWidth="2" />
            {/* Body */}
            <rect
              x="20" y={toY(bodyTop)}
              width="40" height={Math.max(toY(bodyBottom) - toY(bodyTop), 3)}
              fill={isBullish ? '#00ff9d30' : '#ff3d5730'}
              stroke={isBullish ? '#00ff9d' : '#ff3d57'} strokeWidth="2" rx="2"
            />
            {/* Lower wick */}
            <line x1="40" y1={toY(bodyBottom)} x2="40" y2={toY(candle.low)} stroke={isBullish ? '#00ff9d' : '#ff3d57'} strokeWidth="2" />

            {/* Price labels */}
            <text x="68" y={toY(candle.high) + 4} className="fill-terminal-muted" fontSize="8" fontFamily="monospace">{candle.high.toFixed(4)}</text>
            <text x="68" y={toY(candle.low) + 4} className="fill-terminal-muted" fontSize="8" fontFamily="monospace">{candle.low.toFixed(4)}</text>
          </svg>
        </div>

        {/* Question area */}
        <div className="flex-1 space-y-3">
          <p className="text-sm font-semibold text-white">{currentQ.ask}</p>

          {answered !== null ? (
            <div className={`rounded-xl p-4 flex items-center gap-2 ${answered ? 'bg-neon-green/10 border border-neon-green/20' : 'bg-neon-red/10 border border-neon-red/20'}`}>
              {answered ? <CheckCircle2 size={18} className="text-neon-green" /> : <XCircle size={18} className="text-neon-red" />}
              <span className={`text-sm font-semibold ${answered ? 'text-neon-green' : 'text-neon-red'}`}>
                {answered ? 'Correct!' : 'Not quite'}
              </span>
            </div>
          ) : currentQ.key === 'direction' ? (
            <div className="flex gap-2">
              <button onClick={() => handleAnswer('bullish')} className="flex-1 rounded-xl border border-neon-green/30 bg-neon-green/10 py-3 text-sm font-semibold text-neon-green hover:bg-neon-green/20 transition-all cursor-pointer">
                Bullish (Up)
              </button>
              <button onClick={() => handleAnswer('bearish')} className="flex-1 rounded-xl border border-neon-red/30 bg-neon-red/10 py-3 text-sm font-semibold text-neon-red hover:bg-neon-red/20 transition-all cursor-pointer">
                Bearish (Down)
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {[candle.open, candle.close, candle.high, candle.low]
                .sort(() => Math.random() - 0.5)
                .map((price) => (
                  <button
                    key={price}
                    onClick={() => handleAnswer(price.toFixed(4))}
                    className="rounded-xl border border-terminal-border/30 bg-terminal-card/30 py-2.5 font-mono-nums text-sm text-slate-300 hover:border-neon-cyan/30 hover:text-neon-cyan transition-all cursor-pointer"
                  >
                    {price.toFixed(4)}
                  </button>
                ))}
            </div>
          )}

          {/* Score */}
          <p className="font-mono-nums text-[10px] text-terminal-muted">Score: {score}/{step + candleIdx * QUESTIONS.length + (answered !== null ? 1 : 0)}</p>
        </div>
      </div>

      {isFinished && (
        <div className="rounded-xl border border-neon-cyan/20 bg-neon-cyan/[0.04] p-4 text-center">
          <p className="text-sm font-semibold text-white">Exercise Complete!</p>
          <p className="font-mono-nums text-lg font-bold text-neon-cyan mt-1">{score}/{totalQuestions} correct</p>
          <button
            onClick={() => { setCandleIdx(0); setStep(0); setScore(0); setAnswered(null); }}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-terminal-border bg-terminal-card/60 px-4 py-2 text-[12px] text-slate-300 cursor-pointer"
          >
            <RotateCcw size={12} /> Try Again
          </button>
        </div>
      )}

      <p className="text-[11px] text-terminal-muted italic">{candle.label}</p>
    </div>
  );
}
