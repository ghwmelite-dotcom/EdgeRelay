import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

export function TermsOfServicePage() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-terminal-bg text-slate-100">
      {/* Noise texture */}
      <div className="noise-overlay pointer-events-none fixed inset-0 z-[9999]" />

      {/* Nav */}
      <nav
        className={`sticky top-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'glass-premium border-b border-white/[0.04] shadow-lg shadow-black/30'
            : 'bg-transparent'
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2 font-display text-xl tracking-tight">
            <span className="font-bold text-white">TRADE</span>
            <span className="logo-shimmer font-bold text-neon-cyan glow-text-cyan">METRICS</span>
            <span className="ml-1 text-xs font-semibold text-terminal-muted uppercase tracking-widest">Pro</span>
          </Link>

          <Link
            to="/"
            className="text-[13px] uppercase tracking-widest text-slate-400 transition-colors duration-200 hover:text-neon-cyan"
          >
            &larr; Back to Home
          </Link>
        </div>
      </nav>

      {/* Content */}
      <main className="mx-auto max-w-4xl px-6 py-16">
        <div className="glass-premium rounded-2xl p-8 md:p-12 animate-fade-in-up">
          <h1 className="text-3xl font-black tracking-tight text-white md:text-4xl font-display mb-2">
            Terms of Service
          </h1>
          <p className="text-sm text-terminal-muted mb-10">
            Last updated: March 29, 2026
          </p>

          {/* 1. Agreement */}
          <Section title="Agreement">
            <p>
              By accessing or using TradeMetrics Pro, you agree to be bound by these Terms of
              Service. If you do not agree to these terms, please do not use our services.
            </p>
          </Section>

          {/* 2. Service Description */}
          <Section title="Service Description">
            <BulletList items={[
              'TradeMetrics Pro provides forex trade copying, Expert Advisor (EA) generation, a signal marketplace, and analytics tools.',
              <>We are a <strong className="text-white">technology provider</strong>, NOT a financial advisor.</>,
              'We do not provide trading advice or guarantees of profit.',
            ]} />
          </Section>

          {/* 3. Account Responsibilities */}
          <Section title="Account Responsibilities">
            <BulletList items={[
              'You are responsible for maintaining the security of your account credentials.',
              'You must be 18 years of age or older to use the service.',
              'You are responsible for all trades executed through our platform.',
              "You must comply with your broker's terms of service.",
            ]} />
          </Section>

          {/* 4. Trading Disclaimer */}
          <Section title="Trading Disclaimer">
            <div className="rounded-xl border border-neon-red/20 bg-neon-red/5 p-4 mb-4">
              <p className="text-neon-red font-semibold text-xs uppercase tracking-wider mb-2">Important Risk Warning</p>
              <p className="text-sm text-terminal-text">
                Forex trading involves substantial risk of loss and is not suitable for all
                investors. You should carefully consider whether trading is appropriate for you
                in light of your financial condition.
              </p>
            </div>
            <BulletList items={[
              'Past performance does not guarantee future results.',
              'Generated EAs are tools, not guarantees of profit.',
              "Signal marketplace providers' past performance is not a guarantee of future returns.",
              'You trade at your own risk.',
            ]} />
          </Section>

          {/* 5. EA Generator Terms */}
          <Section title="EA Generator Terms">
            <BulletList items={[
              'Your first 3 EA generations are free.',
              'Additional generations cost $1.99 each, processed via Paystack.',
              'Generated EAs are for personal use only.',
              'We do not guarantee that EAs will be profitable.',
              'EAs require MetaTrader 5 and proper broker setup to operate.',
            ]} />
          </Section>

          {/* 6. Signal Marketplace Terms */}
          <Section title="Signal Marketplace Terms">
            <BulletList items={[
              "Providers' performance is verified from journal data.",
              'We do not guarantee that provider performance will continue.',
              'Subscribers copy signals at their own risk.',
              'We may remove providers who manipulate their statistics.',
            ]} />
          </Section>

          {/* 7. Intellectual Property */}
          <Section title="Intellectual Property">
            <BulletList items={[
              'TradeMetrics Pro, its code, design, and branding are owned by Hodges & Co. Limited.',
              'Generated EAs may be used by the user but may not be resold or redistributed.',
              'Strategy templates are proprietary and may not be copied or reverse-engineered.',
            ]} />
          </Section>

          {/* 8. Limitation of Liability */}
          <Section title="Limitation of Liability">
            <BulletList items={[
              'We are not liable for trading losses incurred through use of our platform.',
              'We are not liable for EA errors, failures, or unexpected behavior.',
              'We are not liable for signal delays or missed trades.',
              'Our maximum liability is limited to the total fees paid by you in the preceding 12 months.',
            ]} />
          </Section>

          {/* 9. Service Availability */}
          <Section title="Service Availability">
            <BulletList items={[
              'We strive for 99.9% uptime but do not guarantee uninterrupted service.',
              'We may suspend or terminate accounts that violate these terms.',
              'We may modify or discontinue features with reasonable notice.',
            ]} />
          </Section>

          {/* 10. Governing Law */}
          <Section title="Governing Law">
            <p>
              These terms are governed by and construed in accordance with the laws of the
              jurisdiction in which Hodges &amp; Co. Limited is incorporated. Any disputes
              arising from these terms shall be subject to the exclusive jurisdiction of the
              courts in that jurisdiction.
            </p>
          </Section>

          {/* 11. Contact */}
          <Section title="Contact" last>
            <p>
              If you have any questions about these terms, please contact us:
            </p>
            <BulletList items={[
              <>Email: <a href="mailto:oh84dev@gmail.com" className="text-neon-cyan hover:underline">oh84dev@gmail.com</a></>,
              <>Company: <strong className="text-white">Hodges &amp; Co. Limited</strong></>,
            ]} />
          </Section>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-terminal-border">
        <div className="px-6 py-8">
          <p className="text-center text-xs text-terminal-muted">
            &copy; 2026 Hodges &amp; Co. Limited &middot; Built on Cloudflare
          </p>
        </div>
      </footer>
    </div>
  );
}

/* ── Reusable sub-components ── */

function Section({ title, children, last = false }: { title: string; children: React.ReactNode; last?: boolean }) {
  return (
    <section className={last ? '' : 'mb-10'}>
      <h2 className="flex items-center gap-2.5 text-lg font-bold text-white font-display mb-4">
        <span className="inline-block h-2 w-2 rounded-full bg-neon-cyan shadow-[0_0_8px_rgba(0,229,255,0.6)]" />
        {title}
      </h2>
      <div className="text-terminal-text leading-relaxed text-sm">{children}</div>
    </section>
  );
}

function BulletList({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="space-y-2 pl-1">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-3">
          <span className="mt-1.5 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-neon-cyan/70" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
