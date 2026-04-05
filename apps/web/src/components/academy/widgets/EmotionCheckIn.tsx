import { useState } from 'react';
import { Heart, Brain, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Emotion {
  label: string;
  emoji: string;
  color: string;
  risk: 'low' | 'medium' | 'high';
  advice: string;
  tradingImpact: string;
}

const EMOTIONS: Emotion[] = [
  { label: 'Calm & Focused', emoji: '😌', color: '#00ff9d', risk: 'low', advice: 'This is your optimal trading state. Your decision-making is clear, and you\'re most likely to follow your rules.', tradingImpact: 'Best state for trading. Take your setups with confidence.' },
  { label: 'Confident', emoji: '😊', color: '#00e5ff', risk: 'low', advice: 'Confidence from preparation is great. Watch that it doesn\'t tip into overconfidence — stick to your position sizing.', tradingImpact: 'Good state, but monitor for oversizing or taking B-grade setups.' },
  { label: 'Anxious', emoji: '😰', color: '#ffb800', risk: 'medium', advice: 'Anxiety often comes from risking too much or trading without a plan. Check: is your position size within your 1% rule? Is this a setup you\'ve documented?', tradingImpact: 'May cause hesitation on valid setups or premature exits. Reduce size by 50%.' },
  { label: 'Frustrated', emoji: '😤', color: '#ff3d57', risk: 'high', advice: 'Frustration after losses is the #1 trigger for revenge trading. This is the moment to step away, not to "make it back."', tradingImpact: 'HIGH RISK of revenge trading. Stop trading for at least 30 minutes.' },
  { label: 'Excited / Euphoric', emoji: '🤩', color: '#b18cff', risk: 'medium', advice: 'Euphoria after a big win is just as dangerous as despair after a loss. It leads to oversizing, taking marginal setups, and feeling "invincible."', tradingImpact: 'Risk of overtrading and oversizing. Stick strictly to your plan.' },
  { label: 'Bored', emoji: '😒', color: '#ffb800', risk: 'medium', advice: 'Boredom is one of the most underestimated dangers in trading. It creates an urge to trade for stimulation, not for edge.', tradingImpact: 'Will invent setups that don\'t exist. Only trade A+ setups today.' },
  { label: 'Fearful', emoji: '😨', color: '#ff3d57', risk: 'high', advice: 'Fear of losing prevents you from taking valid setups and makes you close winners too early. The antidote is smaller position sizes — risk an amount that doesn\'t trigger your fear response.', tradingImpact: 'Will miss valid entries or exit winners early. Cut your size in half.' },
  { label: 'Revenge Mode', emoji: '🔥', color: '#ff3d57', risk: 'high', advice: 'You\'re trying to "get back" what the market took. The market doesn\'t owe you anything. Every trade is independent. This is the single most destructive emotional state in trading.', tradingImpact: 'STOP TRADING IMMEDIATELY. Close your platform. Come back tomorrow.' },
];

export function EmotionCheckIn() {
  const [selected, setSelected] = useState<Emotion | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Heart size={16} className="text-neon-purple" />
        <h4 className="text-sm font-semibold text-white">Pre-Trade Emotion Check-In</h4>
      </div>

      <p className="text-[13px] text-slate-400">How are you feeling right now? Be honest — your P&L depends on it.</p>

      {/* Emotion grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {EMOTIONS.map((e) => (
          <button
            key={e.label}
            onClick={() => setSelected(e)}
            className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 transition-all cursor-pointer ${
              selected?.label === e.label
                ? 'shadow-[0_0_16px_var(--glow)]'
                : 'border-terminal-border/30 bg-terminal-card/30 hover:border-terminal-border-hover'
            }`}
            style={
              selected?.label === e.label
                ? { borderColor: `${e.color}40`, backgroundColor: `${e.color}08`, '--glow': `${e.color}15` } as React.CSSProperties
                : undefined
            }
          >
            <span className="text-2xl">{e.emoji}</span>
            <span className={`text-[10px] font-medium ${selected?.label === e.label ? 'text-white' : 'text-terminal-muted'}`}>
              {e.label}
            </span>
          </button>
        ))}
      </div>

      {/* Result */}
      {selected && (
        <div className="animate-fade-in-up space-y-3">
          {/* Risk level */}
          <div
            className="rounded-xl border p-4"
            style={{
              borderColor: `${selected.color}25`,
              backgroundColor: `${selected.color}05`,
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              {selected.risk === 'low' ? (
                <CheckCircle2 size={16} style={{ color: selected.color }} />
              ) : selected.risk === 'medium' ? (
                <AlertTriangle size={16} style={{ color: selected.color }} />
              ) : (
                <AlertTriangle size={16} className="text-neon-red" />
              )}
              <span className="text-sm font-semibold text-white">
                Trading Risk: <span style={{ color: selected.color }}>
                  {selected.risk === 'low' ? 'Low' : selected.risk === 'medium' ? 'Elevated' : 'HIGH — Consider Not Trading'}
                </span>
              </span>
            </div>
            <p className="text-[13px] leading-relaxed text-slate-400">{selected.advice}</p>
          </div>

          {/* Trading impact */}
          <div className="rounded-xl border border-terminal-border/20 bg-terminal-bg/50 p-4">
            <p className="font-mono-nums text-[9px] uppercase tracking-widest text-terminal-muted mb-1.5">Impact on Your Trading</p>
            <p className="text-[13px] leading-relaxed text-slate-300">{selected.tradingImpact}</p>
          </div>

          {/* Sage link for high risk */}
          {selected.risk === 'high' && (
            <Link
              to="/counselor"
              className="flex items-center gap-3 rounded-xl border border-neon-purple/20 bg-neon-purple/[0.04] p-4 hover:bg-neon-purple/[0.08] transition-all"
            >
              <Brain size={18} className="text-neon-purple shrink-0" />
              <div>
                <p className="text-[13px] font-semibold text-white">Talk to Sage</p>
                <p className="text-[11px] text-terminal-muted">Your AI counselor can help you process this before you trade</p>
              </div>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
