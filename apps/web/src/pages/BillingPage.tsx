import { Gift, Check, Shield } from 'lucide-react';
import { useAuthStore } from '@/stores/auth';

export function BillingPage() {
  const user = useAuthStore((s) => s.user);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      {/* Header */}
      <div className="animate-fade-in-up">
        <h1 className="text-3xl font-black tracking-tight text-white font-display">
          Billing
        </h1>
        <p className="mt-1 text-sm text-terminal-muted">
          Your subscription and payment details
        </p>
      </div>

      {/* Current Plan */}
      <div
        className="glass-premium glow-cyan-strong border-gradient rounded-2xl p-8 text-center animate-fade-in-up"
        style={{ animationDelay: '60ms' }}
      >
        <div className="flex items-center justify-center gap-3 mb-4">
          <Gift className="h-8 w-8 text-neon-cyan" />
          <h2 className="font-display text-2xl font-bold text-white">Free Plan</h2>
        </div>

        <div className="flex items-baseline justify-center gap-2 mb-6">
          <span className="font-mono-nums text-6xl font-black text-neon-green glow-text-green">$0</span>
          <span className="text-lg text-terminal-muted">/month</span>
        </div>

        <p className="text-lg text-slate-300 mb-2">
          You&rsquo;re on the <span className="text-neon-cyan font-semibold">Free Launch Plan</span>
        </p>
        <p className="text-slate-400 mb-8">
          All features unlocked, unlimited accounts — completely free until 2027. No credit card required.
        </p>

        <div className="divider-diamond mb-8" />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left max-w-lg mx-auto">
          {[
            'Unlimited trade copying',
            'Cross-VPS support',
            'PropGuard equity protection',
            'AI Trade Journal',
            'Command Center',
            'Risk Dashboard',
            'Monte Carlo Simulator',
            'Firm Directory & Monitoring',
            'TOS Change Alerts',
            'All future features during launch',
          ].map((feature) => (
            <div key={feature} className="flex items-start gap-2">
              <Check className="h-4 w-4 mt-0.5 shrink-0 text-neon-green" />
              <span className="text-sm text-slate-300">{feature}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Account Info */}
      <div
        className="glass rounded-2xl p-6 animate-fade-in-up"
        style={{ animationDelay: '120ms' }}
      >
        <h3 className="font-display text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Shield className="h-4 w-4 text-neon-cyan" />
          Account Details
        </h3>
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-terminal-muted">Email</span>
            <span className="text-slate-300 font-mono-nums">{user?.email ?? '—'}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-terminal-muted">Plan</span>
            <span className="chip border border-neon-green/30 bg-neon-green/20 text-neon-green">FREE</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-terminal-muted">Valid Until</span>
            <span className="text-slate-300 font-mono-nums">March 2027</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-terminal-muted">Payment Method</span>
            <span className="text-slate-400">None required</span>
          </div>
        </div>
      </div>

      {/* Note */}
      <p
        className="text-center text-xs text-terminal-muted animate-fade-in-up"
        style={{ animationDelay: '180ms' }}
      >
        Paid plans will be available after the free launch period ends. You&rsquo;ll be notified in advance.
      </p>
    </div>
  );
}
