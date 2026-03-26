import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Search, Building2, ArrowRight } from 'lucide-react';

interface Firm {
  firm_name: string;
  plan_count: number;
}

export function FirmDirectoryPage() {
  const location = useLocation();
  const basePath = location.pathname.startsWith('/app') ? '/app/firms' : '/firms';
  const isInApp = location.pathname.startsWith('/app');
  const [firms, setFirms] = useState<Firm[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    async function fetchFirms() {
      try {
        const res = await fetch('https://edgerelay-api.ghwmelite.workers.dev/v1/firms');
        const json = await res.json();
        setFirms(json.data?.firms ?? []);
      } catch {
        setError('Failed to load firms. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }
    fetchFirms();
  }, []);

  const filtered = firms.filter((f) =>
    f.firm_name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-terminal-bg text-slate-100">
      {/* Noise texture */}
      <div className="noise-overlay pointer-events-none fixed inset-0 z-[9999]" />

      {/* ── Nav (only shown on public page, hidden when in app layout) ── */}
      {!isInApp && (
      <nav
        className={`sticky top-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'glass-premium border-b border-white/[0.04] shadow-lg shadow-black/30'
            : 'bg-transparent'
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2 font-display text-xl tracking-tight">
            <span className="font-bold text-white">EDGE</span>
            <span className="logo-shimmer font-bold text-neon-cyan glow-text-cyan">RELAY</span>
          </Link>

          <div className="flex items-center gap-8">
            <Link
              to="/login"
              className="nav-glow-line hidden text-[13px] uppercase tracking-widest text-slate-400 transition-colors duration-200 hover:text-neon-cyan sm:inline"
            >
              Login
            </Link>
            <Link
              to={isInApp ? "/command-center" : "/register"}
              className="btn-premium inline-flex items-center gap-1.5 rounded-lg bg-neon-cyan px-5 py-2.5 text-sm font-semibold text-terminal-bg shadow-[0_0_20px_rgba(0,229,255,0.3)] transition-all hover:shadow-[0_0_32px_rgba(0,229,255,0.5)]"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </nav>
      )}

      {/* ── Content ──────────────────────────────────────────────── */}
      <main className="mx-auto max-w-7xl px-6 py-16">
        {/* Header */}
        <div className="mb-12 text-center animate-fade-in-up">
          <h1 className="text-4xl font-black tracking-tight text-white md:text-5xl font-display">
            Prop Firm Rules Directory
          </h1>
          <p className="mt-4 text-lg text-slate-400">
            Compare rules across top prop firms — always up to date
          </p>
        </div>

        {/* Search */}
        <div className="mx-auto mb-10 max-w-md animate-fade-in-up" style={{ animationDelay: '80ms' }}>
          <div className="relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-terminal-muted" />
            <input
              type="text"
              placeholder="Search firms..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-terminal-border bg-terminal-card pl-11 pr-4 py-3 text-sm text-slate-100 placeholder:text-terminal-muted focus:border-neon-cyan/40 focus:outline-none focus:ring-1 focus:ring-neon-cyan/30 transition-colors"
            />
          </div>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="glass-premium rounded-2xl p-6 animate-fade-in-up"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="skeleton h-6 w-40 rounded mb-3" />
                <div className="skeleton h-4 w-24 rounded" />
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {error && !isLoading && (
          <div className="glass-premium rounded-2xl p-8 text-center animate-fade-in-up">
            <p className="text-neon-red text-sm">{error}</p>
          </div>
        )}

        {/* Firm Grid */}
        {!isLoading && !error && (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filtered.map((firm, i) => (
                <Link
                  key={firm.firm_name}
                  to={`${basePath}/${encodeURIComponent(firm.firm_name)}`}
                  className="glass-premium card-hover-premium rounded-2xl p-6 group animate-fade-in-up block"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neon-cyan/10">
                        <Building2 size={20} className="text-neon-cyan" />
                      </div>
                      <h2 className="text-lg font-bold text-white group-hover:text-neon-cyan transition-colors">
                        {firm.firm_name}
                      </h2>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-neon-cyan/10 px-3 py-1 text-xs font-semibold text-neon-cyan">
                      {firm.plan_count} plan{firm.plan_count !== 1 ? 's' : ''}
                    </span>
                    <span className="flex items-center gap-1 text-sm text-slate-400 group-hover:text-neon-cyan transition-colors">
                      View Rules
                      <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>

            {filtered.length === 0 && firms.length > 0 && (
              <div className="glass-premium rounded-2xl p-8 text-center animate-fade-in-up">
                <p className="text-slate-400 text-sm">No firms match your search.</p>
              </div>
            )}
          </>
        )}

        {/* CTA */}
        <div className="mt-16 text-center animate-fade-in-up" style={{ animationDelay: '200ms' }}>
          <div className="glass-premium rounded-2xl p-8 inline-block">
            <p className="text-slate-300 mb-4 text-sm">Know a firm we&rsquo;re missing?</p>
            {isInApp ? (
              <a
                href="https://t.me/edgerelay"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-premium inline-flex items-center gap-2 rounded-lg bg-neon-cyan px-6 py-3 text-sm font-semibold text-terminal-bg shadow-[0_0_20px_rgba(0,229,255,0.3)] transition-all hover:shadow-[0_0_32px_rgba(0,229,255,0.5)]"
              >
                Request via Telegram
                <ArrowRight size={14} />
              </a>
            ) : (
              <Link
                to="/register"
                className="btn-premium inline-flex items-center gap-2 rounded-lg bg-neon-cyan px-6 py-3 text-sm font-semibold text-terminal-bg shadow-[0_0_20px_rgba(0,229,255,0.3)] transition-all hover:shadow-[0_0_32px_rgba(0,229,255,0.5)]"
              >
                Sign up to submit firm rules
                <ArrowRight size={14} />
              </Link>
            )}
          </div>
        </div>
      </main>

      {/* ── Footer ───────────────────────────────────────────────── */}
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
