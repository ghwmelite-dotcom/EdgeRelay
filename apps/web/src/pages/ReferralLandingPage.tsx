import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import {
  ArrowRight,
  Gift,
  Link2,
  Share2,
  DollarSign,
  TrendingUp,
  Infinity,
  BarChart3,
  Zap,
  Users,
  ChevronRight,
} from 'lucide-react';

/* ────────────────────────────────────────────────────────────── */
/*  Floating Particles                                            */
/* ────────────────────────────────────────────────────────────── */

const PARTICLES = Array.from({ length: 20 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  y: Math.random() * 100,
  size: 2 + Math.random() * 3,
  duration: 15 + Math.random() * 20,
  delay: Math.random() * 10,
}));

function FloatingParticles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {PARTICLES.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full bg-neon-cyan/20"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            animation: `floatParticle ${p.duration}s ease-in-out ${p.delay}s infinite`,
          }}
        />
      ))}
      <style>{`
        @keyframes floatParticle {
          0%, 100% { transform: translateY(0) translateX(0); opacity: 0.3; }
          25% { transform: translateY(-30px) translateX(15px); opacity: 0.7; }
          50% { transform: translateY(-10px) translateX(-10px); opacity: 0.4; }
          75% { transform: translateY(-40px) translateX(5px); opacity: 0.6; }
        }
      `}</style>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────── */
/*  Earnings Calculator                                           */
/* ────────────────────────────────────────────────────────────── */

function EarningsCalculator() {
  const [referrals, setReferrals] = useState(10);
  const easPerReferral = 3;

  const earnings = useMemo(() => {
    const firstEaPer = referrals * 0.5;
    const subsequentEasPer = referrals * (easPerReferral - 1) * 0.3;
    return firstEaPer + subsequentEasPer;
  }, [referrals]);

  return (
    <div className="rounded-2xl bg-terminal-surface/80 backdrop-blur-xl border border-terminal-border/40 p-8 max-w-lg mx-auto">
      <h3 className="text-lg font-bold text-white mb-6 text-center">Earnings Calculator</h3>

      <div className="space-y-6">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-terminal-muted">Number of referrals</span>
            <span className="text-lg font-bold text-neon-cyan">{referrals}</span>
          </div>
          <input
            type="range"
            min={1}
            max={100}
            value={referrals}
            onChange={(e) => setReferrals(Number(e.target.value))}
            className="w-full h-2 rounded-full appearance-none cursor-pointer
                       bg-terminal-border/40
                       [&::-webkit-slider-thumb]:appearance-none
                       [&::-webkit-slider-thumb]:w-5
                       [&::-webkit-slider-thumb]:h-5
                       [&::-webkit-slider-thumb]:rounded-full
                       [&::-webkit-slider-thumb]:bg-neon-cyan
                       [&::-webkit-slider-thumb]:shadow-[0_0_12px_rgba(0,229,255,0.5)]
                       [&::-webkit-slider-thumb]:cursor-pointer"
          />
          <div className="flex justify-between mt-1">
            <span className="text-[10px] text-terminal-muted/50">1</span>
            <span className="text-[10px] text-terminal-muted/50">100</span>
          </div>
        </div>

        <div className="rounded-xl bg-terminal-bg/60 border border-neon-green/20 p-5 text-center">
          <p className="text-xs text-terminal-muted mb-1">Estimated Monthly Earnings</p>
          <p className="text-4xl font-black text-neon-green glow-text-green">
            ${earnings.toFixed(2)}
          </p>
          <p className="text-xs text-terminal-muted/70 mt-2">
            {referrals} referrals x {easPerReferral} EAs each = {referrals * easPerReferral} purchases
          </p>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────── */
/*  Main Component                                                */
/* ────────────────────────────────────────────────────────────── */

export function ReferralLandingPage() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
  }, []);

  return (
    <div className="min-h-screen bg-terminal-bg text-white overflow-x-hidden">
      {/* ── Navigation ──────────────────────────────────────── */}
      <nav className="fixed top-0 inset-x-0 z-50 backdrop-blur-xl bg-terminal-bg/80 border-b border-terminal-border/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-xl tracking-tighter">
              <span className="text-white font-black">TRADE</span>
              <span className="text-neon-cyan font-black glow-text-cyan">METRICS</span>
              <span className="ml-1 text-xs font-semibold text-terminal-muted uppercase tracking-widest">
                Pro
              </span>
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              to="/login"
              className="text-sm text-terminal-muted hover:text-white transition-colors"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="rounded-xl bg-neon-cyan/10 border border-neon-cyan/30 px-4 py-2 text-sm font-semibold text-neon-cyan hover:bg-neon-cyan/20 transition-all"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────── */}
      <section className="relative pt-32 pb-20 px-4 sm:px-6 overflow-hidden">
        <FloatingParticles />

        {/* Ambient glow orbs */}
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-neon-cyan/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-neon-green/5 rounded-full blur-[100px] pointer-events-none" />

        <div
          className={`relative z-10 max-w-4xl mx-auto text-center transition-all duration-1000 ease-out ${
            visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="inline-flex items-center gap-2 rounded-full bg-neon-green/10 border border-neon-green/20 px-4 py-1.5 mb-6">
            <Gift className="h-4 w-4 text-neon-green" />
            <span className="text-xs font-semibold text-neon-green uppercase tracking-wider">
              Referral Program
            </span>
          </div>

          <h1 className="text-5xl sm:text-7xl font-black tracking-tight leading-[0.9] mb-6">
            <span className="text-white">Earn While</span>
            <br />
            <span className="bg-gradient-to-r from-neon-cyan via-neon-green to-neon-cyan bg-clip-text text-transparent">
              You Trade
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-terminal-muted max-w-2xl mx-auto mb-8 leading-relaxed">
            Share TradeMetrics Pro with fellow traders and earn{' '}
            <span className="text-neon-green font-semibold">$0.50</span> for every EA they generate.
            No limits, no caps — unlimited passive income.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/register"
              className="group relative inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-neon-cyan to-neon-green px-8 py-4 text-base font-bold text-terminal-bg transition-all duration-300 hover:shadow-[0_0_40px_rgba(0,229,255,0.3)] hover:scale-[1.02]"
            >
              Join the Program
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              to="/referrals"
              className="inline-flex items-center gap-2 rounded-2xl border border-terminal-border/40 px-6 py-4 text-sm text-terminal-muted hover:text-white hover:border-terminal-border/60 transition-all"
            >
              Already a member? Go to dashboard
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── How It Works ────────────────────────────────────── */}
      <section className="relative py-20 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-3">How It Works</h2>
            <p className="text-terminal-muted">Three simple steps to start earning</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: Link2,
                step: '01',
                title: 'Get Your Link',
                desc: 'Sign up for free and get your unique referral link instantly. It never expires.',
                color: 'neon-cyan',
              },
              {
                icon: Share2,
                step: '02',
                title: 'Share & Invite',
                desc: 'Share with trading groups, forums, social media, Telegram channels — anywhere traders gather.',
                color: 'neon-green',
              },
              {
                icon: DollarSign,
                step: '03',
                title: 'Earn Commissions',
                desc: '$0.50 per EA purchase from your referrals. Commissions paid out monthly when you reach $10.',
                color: 'neon-cyan',
              },
            ].map((item, i) => (
              <div
                key={i}
                className="group relative rounded-2xl bg-terminal-surface/60 backdrop-blur-xl border border-terminal-border/30 p-7 transition-all duration-300 hover:border-neon-cyan/30 hover:translate-y-[-4px] hover:shadow-[0_8px_32px_rgba(0,229,255,0.08)]"
              >
                <div className="absolute top-4 right-5 text-5xl font-black text-terminal-border/15 group-hover:text-neon-cyan/10 transition-colors">
                  {item.step}
                </div>

                <div
                  className={`rounded-xl bg-${item.color}/10 p-3 w-fit mb-4`}
                  style={{
                    backgroundColor:
                      item.color === 'neon-cyan'
                        ? 'rgba(0,229,255,0.1)'
                        : 'rgba(0,255,157,0.1)',
                  }}
                >
                  <item.icon
                    className="h-6 w-6"
                    style={{
                      color: item.color === 'neon-cyan' ? 'var(--color-neon-cyan)' : 'var(--color-neon-green)',
                    }}
                  />
                </div>

                <h3 className="text-lg font-bold text-white mb-2">{item.title}</h3>
                <p className="text-sm text-terminal-muted leading-relaxed">{item.desc}</p>

                {i < 2 && (
                  <div className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 z-10">
                    <ArrowRight className="h-5 w-5 text-terminal-border/30" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Commission Structure ────────────────────────────── */}
      <section className="relative py-20 px-4 sm:px-6">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-neon-cyan/[0.02] to-transparent pointer-events-none" />
        <div className="max-w-3xl mx-auto relative z-10">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-3">Commission Structure</h2>
            <p className="text-terminal-muted">Transparent earnings, no hidden terms</p>
          </div>

          <div className="rounded-2xl bg-terminal-surface/60 backdrop-blur-xl border border-terminal-border/40 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-terminal-border/30">
                  <th className="text-left text-xs uppercase tracking-wider text-terminal-muted font-semibold px-6 py-4">
                    Action
                  </th>
                  <th className="text-center text-xs uppercase tracking-wider text-terminal-muted font-semibold px-6 py-4">
                    You Earn
                  </th>
                  <th className="text-right text-xs uppercase tracking-wider text-terminal-muted font-semibold px-6 py-4">
                    Frequency
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-terminal-border/10 hover:bg-terminal-card/30 transition-colors">
                  <td className="px-6 py-4 text-sm text-white font-medium">
                    Referral's 1st EA
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-flex items-center rounded-full bg-neon-green/10 px-3 py-1 text-sm font-bold text-neon-green">
                      $0.50
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-sm text-terminal-muted">One-time</td>
                </tr>
                <tr className="border-b border-terminal-border/10 hover:bg-terminal-card/30 transition-colors">
                  <td className="px-6 py-4 text-sm text-white font-medium">
                    Referral's 2nd-10th EA
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-flex items-center rounded-full bg-neon-green/10 px-3 py-1 text-sm font-bold text-neon-green">
                      $0.30
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-sm text-terminal-muted">Per purchase</td>
                </tr>
                <tr className="hover:bg-terminal-card/30 transition-colors">
                  <td className="px-6 py-4 text-sm text-white font-medium">
                    <span className="flex items-center gap-2">
                      Marketplace subscription
                      <span className="rounded-md bg-neon-cyan/10 px-1.5 py-0.5 text-[10px] font-semibold text-neon-cyan uppercase">
                        Coming Soon
                      </span>
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-flex items-center rounded-full bg-neon-cyan/10 px-3 py-1 text-sm font-bold text-neon-cyan">
                      20%
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-sm text-terminal-muted">
                    Monthly recurring
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── Why Traders Love It ─────────────────────────────── */}
      <section className="relative py-20 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-3">Why Traders Love It</h2>
            <p className="text-terminal-muted">Built by traders, for traders</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: TrendingUp,
                title: 'Passive Income',
                desc: 'Earn while your referrals trade. Every EA they generate puts money in your pocket — automatically.',
              },
              {
                icon: Infinity,
                title: 'No Cap',
                desc: 'Unlimited referrals, unlimited earnings. There is no ceiling on how much you can earn from the program.',
              },
              {
                icon: BarChart3,
                title: 'Instant Tracking',
                desc: 'See every referral and commission in real-time from your dashboard. Full transparency, always.',
              },
            ].map((item, i) => (
              <div
                key={i}
                className="group rounded-2xl bg-terminal-surface/60 backdrop-blur-xl border border-terminal-border/30 p-7 transition-all duration-300 hover:border-neon-green/30 hover:translate-y-[-4px] hover:shadow-[0_8px_32px_rgba(0,255,157,0.08)]"
              >
                <div className="rounded-xl bg-neon-green/10 p-3 w-fit mb-4">
                  <item.icon className="h-6 w-6 text-neon-green" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{item.title}</h3>
                <p className="text-sm text-terminal-muted leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Earnings Calculator ─────────────────────────────── */}
      <section className="relative py-20 px-4 sm:px-6">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-neon-green/[0.02] to-transparent pointer-events-none" />
        <div className="max-w-5xl mx-auto relative z-10">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-3">
              Calculate Your Earnings
            </h2>
            <p className="text-terminal-muted">
              See how much you could earn by referring traders
            </p>
          </div>
          <EarningsCalculator />
        </div>
      </section>

      {/* ── CTA Section ─────────────────────────────────────── */}
      <section className="relative py-24 px-4 sm:px-6 overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 bg-gradient-to-t from-neon-cyan/5 via-transparent to-transparent pointer-events-none" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-neon-cyan/10 rounded-full blur-[150px] pointer-events-none" />

        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-neon-cyan/10 border border-neon-cyan/20 px-4 py-1.5 mb-6">
            <Zap className="h-4 w-4 text-neon-cyan" />
            <span className="text-xs font-semibold text-neon-cyan uppercase tracking-wider">
              Start Today
            </span>
          </div>

          <h2 className="text-4xl sm:text-5xl font-black text-white mb-4 tracking-tight">
            Start Earning Today
          </h2>
          <p className="text-lg text-terminal-muted mb-8 max-w-xl mx-auto">
            Join hundreds of traders already earning passive income through referrals.
            It's free to join, and you can start sharing immediately.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/register"
              className="group relative inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-neon-cyan to-neon-green px-8 py-4 text-base font-bold text-terminal-bg transition-all duration-300 hover:shadow-[0_0_40px_rgba(0,229,255,0.3)] hover:scale-[1.02]"
            >
              Get Started Free
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              to="/referrals"
              className="inline-flex items-center gap-2 text-sm text-terminal-muted hover:text-neon-cyan transition-colors"
            >
              Already have an account? Go to your dashboard
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────── */}
      <footer className="border-t border-terminal-border/20 py-8 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link to="/" className="text-sm tracking-tighter">
            <span className="text-white font-black">TRADE</span>
            <span className="text-neon-cyan font-black">METRICS</span>
            <span className="ml-1 text-xs font-semibold text-terminal-muted uppercase tracking-widest">
              Pro
            </span>
          </Link>
          <div className="flex items-center gap-6 text-xs text-terminal-muted">
            <Link to="/privacy" className="hover:text-white transition-colors">
              Privacy
            </Link>
            <Link to="/terms" className="hover:text-white transition-colors">
              Terms
            </Link>
            <Link to="/" className="hover:text-white transition-colors">
              Home
            </Link>
          </div>
          <p className="text-xs text-terminal-muted/50">
            &copy; {new Date().getFullYear()} TradeMetrics Pro
          </p>
        </div>
      </footer>
    </div>
  );
}
