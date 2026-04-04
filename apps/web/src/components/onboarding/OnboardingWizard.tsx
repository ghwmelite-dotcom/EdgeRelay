import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Radio,
  ArrowLeftRight,
  ShieldCheck,
  ArrowRight,
  X,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';

const STEPS = [
  {
    step: 1,
    icon: Radio,
    color: '#00e5ff',
    title: 'Connect Your MT5',
    description: 'Create a Master account to start sending trade signals from your MetaTrader 5 terminal.',
    detail: 'Your Master EA runs on your VPS and sends every trade to the cloud. No port forwarding needed.',
    cta: 'Set Up Master Account',
    link: '/accounts',
  },
  {
    step: 2,
    icon: ArrowLeftRight,
    color: '#00ff9d',
    title: 'Set Up Trade Copier',
    description: 'Add a Follower account to copy your Master\'s trades to another MT5 terminal — different VPS, different broker.',
    detail: 'Signals travel through Cloudflare\'s edge network. Sub-500ms latency, HMAC authenticated.',
    cta: 'Add Follower Account',
    link: '/accounts',
  },
  {
    step: 3,
    icon: ShieldCheck,
    color: '#b18cff',
    title: 'Enable PropGuard',
    description: 'Protect your accounts with prop firm presets. FTMO, The5ers, FundedNext, Apex — one-click rule enforcement.',
    detail: 'Auto daily loss limits, max drawdown caps, Friday close, and news blackout. Never breach a funded account.',
    cta: 'Open Prop Firm Hub',
    link: '/app/prop-firms',
  },
];

interface Props {
  onDismiss: () => void;
}

export function OnboardingWizard({ onDismiss }: Props) {
  const [currentStep, setCurrentStep] = useState(0);

  const handleDismiss = () => {
    try { localStorage.setItem('onboarding_dismissed', '1'); } catch {}
    onDismiss();
  };

  return (
    <div className="animate-fade-in-up relative overflow-hidden rounded-2xl border border-neon-cyan/20 bg-gradient-to-br from-neon-cyan/[0.04] to-neon-purple/[0.02]" style={{ boxShadow: '0 0 40px rgba(0,229,255,0.06)' }}>
      {/* Dismiss button */}
      <button
        onClick={handleDismiss}
        className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-lg border border-terminal-border/30 text-terminal-muted hover:text-white hover:bg-terminal-card/50 transition-all cursor-pointer"
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>

      <div className="p-6 md:p-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 border border-neon-cyan/25">
            <Sparkles size={20} className="text-neon-cyan" />
          </div>
          <div>
            <h2 className="font-display text-lg font-bold text-white">Welcome to TradeMetrics Pro</h2>
            <p className="text-[12px] text-terminal-muted">Get set up in 3 steps — takes about 5 minutes</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s.step} className="flex items-center gap-2 flex-1">
              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-mono-nums text-[11px] font-bold transition-all ${
                  i <= currentStep
                    ? 'border-2 text-white'
                    : 'border border-terminal-border/40 text-terminal-muted'
                }`}
                style={i <= currentStep ? { borderColor: s.color, backgroundColor: `${s.color}15`, color: s.color } : undefined}
              >
                {i < currentStep ? <CheckCircle2 size={14} /> : s.step}
              </div>
              {i < STEPS.length - 1 && (
                <div className="flex-1 h-px" style={{ backgroundColor: i < currentStep ? STEPS[i + 1].color + '40' : 'var(--color-terminal-border)' }} />
              )}
            </div>
          ))}
        </div>

        {/* Current step content */}
        <div className="flex flex-col gap-6 md:flex-row md:items-center">
          {/* Left — Icon + content */}
          <div className="flex-1">
            <div
              className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl border transition-shadow"
              style={{ borderColor: `${STEPS[currentStep].color}25`, backgroundColor: `${STEPS[currentStep].color}10` }}
            >
              {(() => { const Icon = STEPS[currentStep].icon; return <Icon size={28} style={{ color: STEPS[currentStep].color }} />; })()}
            </div>
            <h3 className="font-display text-xl font-bold text-white">{STEPS[currentStep].title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">{STEPS[currentStep].description}</p>
            <p className="mt-2 text-[12px] leading-relaxed text-terminal-muted">{STEPS[currentStep].detail}</p>
          </div>

          {/* Right — CTA */}
          <div className="flex flex-col items-stretch gap-3 md:items-end md:w-56">
            <Link
              to={STEPS[currentStep].link}
              className="inline-flex items-center justify-center gap-2 rounded-xl py-3 px-6 text-sm font-semibold text-terminal-bg transition-all"
              style={{ backgroundColor: STEPS[currentStep].color, boxShadow: `0 0 20px ${STEPS[currentStep].color}30` }}
              onClick={() => {
                if (currentStep < STEPS.length - 1) {
                  setCurrentStep(currentStep + 1);
                }
              }}
            >
              {STEPS[currentStep].cta} <ArrowRight size={14} />
            </Link>
            <div className="flex gap-3 justify-center md:justify-end">
              {currentStep > 0 && (
                <button
                  onClick={() => setCurrentStep(currentStep - 1)}
                  className="text-[12px] text-terminal-muted hover:text-white transition-colors cursor-pointer"
                >
                  Back
                </button>
              )}
              <button
                onClick={() => {
                  if (currentStep < STEPS.length - 1) setCurrentStep(currentStep + 1);
                  else handleDismiss();
                }}
                className="text-[12px] text-terminal-muted hover:text-white transition-colors cursor-pointer"
              >
                {currentStep < STEPS.length - 1 ? 'Skip this step' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
