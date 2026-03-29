import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

export function PrivacyPolicyPage() {
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
            Privacy Policy
          </h1>
          <p className="text-sm text-terminal-muted mb-10">
            Last updated: March 29, 2026
          </p>

          {/* 1. Introduction */}
          <Section title="Introduction">
            <p>
              TradeMetrics Pro (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;) is operated by
              Hodges &amp; Co. Limited. We respect your privacy and are committed to protecting
              your personal data. This privacy policy explains how we collect, use, and safeguard
              your information when you use our platform.
            </p>
          </Section>

          {/* 2. Information We Collect */}
          <Section title="Information We Collect">
            <BulletList items={[
              <><strong className="text-white">Account information:</strong> email address and name, provided via registration or Google OAuth.</>,
              <><strong className="text-white">Trading data:</strong> MT5 trade signals, journal entries, and equity data synced by the user&rsquo;s Expert Advisor (EA).</>,
              <><strong className="text-white">Usage data:</strong> pages visited, features used, and EA generations.</>,
              <><strong className="text-white">Payment information:</strong> processed securely by Paystack. We do not store your card details.</>,
            ]} />
          </Section>

          {/* 3. How We Use Your Information */}
          <Section title="How We Use Your Information">
            <BulletList items={[
              'Provide and improve our services.',
              'Process trade signals and copy trades across your accounts.',
              'Generate AI-powered analytics and insights.',
              'Process payments via Paystack.',
              'Send notifications via Telegram (opt-in only).',
              'Display anonymized performance statistics on the Signal Marketplace (only if you opt in as a provider).',
            ]} />
          </Section>

          {/* 4. Data Storage & Security */}
          <Section title="Data Storage & Security">
            <BulletList items={[
              "Data is stored on Cloudflare's global edge network (D1, KV, R2).",
              'All connections are encrypted via HTTPS/TLS.',
              'Passwords are hashed with PBKDF2 and never stored in plaintext.',
              'JWT tokens are used for authentication with automatic expiry.',
            ]} />
          </Section>

          {/* 5. Third-Party Services */}
          <Section title="Third-Party Services">
            <p className="mb-3">We integrate with the following third-party services:</p>
            <BulletList items={[
              <><strong className="text-white">Cloudflare</strong> — infrastructure and edge computing.</>,
              <><strong className="text-white">Paystack</strong> — payment processing.</>,
              <><strong className="text-white">Google</strong> — OAuth authentication.</>,
              <><strong className="text-white">Telegram</strong> — notifications (opt-in).</>,
              <><strong className="text-white">Cloudflare Workers AI</strong> — analytics. No personal data is sent to AI models; only aggregated statistics are used.</>,
            ]} />
          </Section>

          {/* 6. Your Rights */}
          <Section title="Your Rights">
            <p className="mb-3">You have the right to:</p>
            <BulletList items={[
              'Access, correct, or delete your personal data.',
              'Export your trading data.',
              'Opt out of marketplace visibility.',
              'Disconnect Telegram notifications.',
              'Delete your account by contacting support.',
            ]} />
          </Section>

          {/* 7. Cookies */}
          <Section title="Cookies">
            <BulletList items={[
              'We use localStorage for authentication tokens only.',
              'No third-party tracking cookies are used.',
              'No advertising cookies are used.',
            ]} />
          </Section>

          {/* 8. Data Retention */}
          <Section title="Data Retention">
            <BulletList items={[
              'Account data is retained while your account is active.',
              'Trading data is retained for analytics purposes.',
              'Deleted accounts: all data is removed within 30 days of deletion.',
            ]} />
          </Section>

          {/* 9. Changes to This Policy */}
          <Section title="Changes to This Policy">
            <p>
              We may update this privacy policy from time to time. Changes will be posted on this
              page with an updated revision date. We encourage you to review this policy
              periodically.
            </p>
          </Section>

          {/* 10. Contact */}
          <Section title="Contact" last>
            <p>
              If you have any questions about this privacy policy, please contact us:
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
