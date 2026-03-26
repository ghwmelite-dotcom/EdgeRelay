import { useEffect, useState } from 'react';
import { Link, useParams, useLocation } from 'react-router-dom';
import { ArrowLeft, ArrowRight, ExternalLink, Check, X } from 'lucide-react';

interface FirmTemplate {
  id: string;
  firm_name: string;
  plan_name: string;
  challenge_phase: string;
  initial_balance: number;
  profit_target_percent: number | null;
  daily_loss_percent: number;
  max_drawdown_percent: number;
  drawdown_type: string;
  daily_loss_type: string;
  min_trading_days: number | null;
  max_calendar_days: number | null;
  news_trading_restricted: number;
  consistency_rule: number;
  source_url: string | null;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function ddTypeBadgeColor(type: string): string {
  switch (type.toLowerCase()) {
    case 'static':
      return 'bg-neon-green/10 text-neon-green';
    case 'trailing':
      return 'bg-neon-amber/10 text-neon-amber';
    case 'eod':
      return 'bg-neon-cyan/10 text-neon-cyan';
    default:
      return 'bg-terminal-border text-terminal-muted';
  }
}

export function FirmDetailPage() {
  const { firmName } = useParams<{ firmName: string }>();
  const location = useLocation();
  const isInApp = location.pathname.startsWith('/app');
  const firmsPath = isInApp ? '/app/firms' : '/firms';
  const [templates, setTemplates] = useState<FirmTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!firmName) return;
    async function fetchTemplates() {
      try {
        const res = await fetch(
          `https://edgerelay-api.ghwmelite.workers.dev/v1/firms/${encodeURIComponent(firmName!)}/templates`,
        );
        const json = await res.json();
        setTemplates(json.data?.templates ?? []);
      } catch {
        setError('Failed to load firm templates. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }
    fetchTemplates();
  }, [firmName]);

  const decodedName = firmName ? decodeURIComponent(firmName) : '';

  // Group templates by challenge phase
  const phaseGroups = templates.reduce<Record<string, FirmTemplate[]>>((acc, t) => {
    const phase = t.challenge_phase || 'Uncategorized';
    if (!acc[phase]) acc[phase] = [];
    acc[phase].push(t);
    return acc;
  }, {});

  const sourceUrl = templates.find((t) => t.source_url)?.source_url ?? null;

  return (
    <div className="min-h-screen bg-terminal-bg text-slate-100">
      {/* Noise texture */}
      <div className="noise-overlay pointer-events-none fixed inset-0 z-[9999]" />

      {/* ── Nav (hidden when inside app layout) ──────────────────── */}
      {!isInApp && <nav
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
              to="/register"
              className="btn-premium inline-flex items-center gap-1.5 rounded-lg bg-neon-cyan px-5 py-2.5 text-sm font-semibold text-terminal-bg shadow-[0_0_20px_rgba(0,229,255,0.3)] transition-all hover:shadow-[0_0_32px_rgba(0,229,255,0.5)]"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </nav>}

      {/* ── Content ──────────────────────────────────────────────── */}
      <main className="mx-auto max-w-7xl px-6 py-12">
        {/* Back link */}
        <Link
          to={firmsPath}
          className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-neon-cyan transition-colors mb-8"
        >
          <ArrowLeft size={14} />
          Back to Directory
        </Link>

        {/* Firm name heading */}
        <div className="mb-10 animate-fade-in-up">
          <h1 className="text-3xl font-black tracking-tight text-white md:text-4xl font-display">
            {decodedName}
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            {templates.length} plan{templates.length !== 1 ? 's' : ''} available
          </p>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="glass-premium rounded-2xl p-6 animate-fade-in-up">
            <div className="skeleton h-6 w-48 rounded mb-4" />
            <div className="skeleton h-4 w-full rounded mb-2" />
            <div className="skeleton h-4 w-full rounded mb-2" />
            <div className="skeleton h-4 w-3/4 rounded" />
          </div>
        )}

        {/* Error */}
        {error && !isLoading && (
          <div className="glass-premium rounded-2xl p-8 text-center animate-fade-in-up">
            <p className="text-neon-red text-sm">{error}</p>
          </div>
        )}

        {/* Template tables by phase */}
        {!isLoading && !error && (
          <div className="space-y-10">
            {Object.entries(phaseGroups).map(([phase, planTemplates], gi) => (
              <section
                key={phase}
                className="animate-fade-in-up"
                style={{ animationDelay: `${gi * 80}ms` }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-2 w-2 rounded-full bg-neon-cyan"
                      style={{ boxShadow: '0 0 8px #00e5ff80' }}
                    />
                    <h2 className="text-xs uppercase tracking-[0.18em] text-terminal-muted font-semibold">
                      {phase}
                    </h2>
                  </div>
                  <div className="flex-1 h-px bg-gradient-to-r from-neon-cyan/15 to-transparent" />
                </div>

                <div className="glass-premium rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-terminal-border">
                          <th className="px-4 py-3 text-left text-[10px] uppercase tracking-[0.15em] text-terminal-muted font-semibold whitespace-nowrap">
                            Plan Name
                          </th>
                          <th className="px-4 py-3 text-left text-[10px] uppercase tracking-[0.15em] text-terminal-muted font-semibold whitespace-nowrap">
                            Phase
                          </th>
                          <th className="px-4 py-3 text-right text-[10px] uppercase tracking-[0.15em] text-terminal-muted font-semibold whitespace-nowrap">
                            Balance
                          </th>
                          <th className="px-4 py-3 text-right text-[10px] uppercase tracking-[0.15em] text-terminal-muted font-semibold whitespace-nowrap">
                            Profit Target
                          </th>
                          <th className="px-4 py-3 text-right text-[10px] uppercase tracking-[0.15em] text-terminal-muted font-semibold whitespace-nowrap">
                            Daily Loss
                          </th>
                          <th className="px-4 py-3 text-right text-[10px] uppercase tracking-[0.15em] text-terminal-muted font-semibold whitespace-nowrap">
                            Max DD
                          </th>
                          <th className="px-4 py-3 text-center text-[10px] uppercase tracking-[0.15em] text-terminal-muted font-semibold whitespace-nowrap">
                            DD Type
                          </th>
                          <th className="px-4 py-3 text-center text-[10px] uppercase tracking-[0.15em] text-terminal-muted font-semibold whitespace-nowrap">
                            Daily Loss Type
                          </th>
                          <th className="px-4 py-3 text-right text-[10px] uppercase tracking-[0.15em] text-terminal-muted font-semibold whitespace-nowrap">
                            Min Days
                          </th>
                          <th className="px-4 py-3 text-right text-[10px] uppercase tracking-[0.15em] text-terminal-muted font-semibold whitespace-nowrap">
                            Max Days
                          </th>
                          <th className="px-4 py-3 text-center text-[10px] uppercase tracking-[0.15em] text-terminal-muted font-semibold whitespace-nowrap">
                            News
                          </th>
                          <th className="px-4 py-3 text-center text-[10px] uppercase tracking-[0.15em] text-terminal-muted font-semibold whitespace-nowrap">
                            Consistency
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-terminal-border/50">
                        {planTemplates.map((t, i) => (
                          <tr
                            key={`${t.plan_name}-${t.challenge_phase}-${i}`}
                            className="hover:bg-white/[0.02] transition-colors"
                          >
                            <td className="px-4 py-3 font-medium text-slate-100 whitespace-nowrap">
                              {t.plan_name}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className="inline-flex rounded-full bg-neon-cyan/10 px-2.5 py-0.5 text-xs font-semibold text-neon-cyan">
                                {t.challenge_phase}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right font-mono-nums text-slate-300 whitespace-nowrap">
                              {formatCurrency(t.initial_balance)}
                            </td>
                            <td className="px-4 py-3 text-right font-mono-nums text-slate-300 whitespace-nowrap">
                              {t.profit_target_percent != null ? `${t.profit_target_percent}%` : '—'}
                            </td>
                            <td className="px-4 py-3 text-right font-mono-nums text-neon-amber whitespace-nowrap">
                              {t.daily_loss_percent}%
                            </td>
                            <td className="px-4 py-3 text-right font-mono-nums text-neon-red whitespace-nowrap">
                              {t.max_drawdown_percent}%
                            </td>
                            <td className="px-4 py-3 text-center whitespace-nowrap">
                              <span
                                className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${ddTypeBadgeColor(t.drawdown_type)}`}
                              >
                                {t.drawdown_type}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center whitespace-nowrap">
                              <span className="inline-flex rounded-full bg-terminal-border px-2.5 py-0.5 text-xs font-semibold text-slate-300">
                                {t.daily_loss_type}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right font-mono-nums text-slate-300 whitespace-nowrap">
                              {t.min_trading_days != null ? t.min_trading_days : '—'}
                            </td>
                            <td className="px-4 py-3 text-right font-mono-nums text-slate-300 whitespace-nowrap">
                              {t.max_calendar_days != null ? t.max_calendar_days : '—'}
                            </td>
                            <td className="px-4 py-3 text-center whitespace-nowrap">
                              {t.news_trading_restricted ? (
                                <Check size={16} className="inline text-neon-green" />
                              ) : (
                                <X size={16} className="inline text-terminal-muted" />
                              )}
                            </td>
                            <td className="px-4 py-3 text-center whitespace-nowrap">
                              {t.consistency_rule ? (
                                <Check size={16} className="inline text-neon-green" />
                              ) : (
                                <X size={16} className="inline text-terminal-muted" />
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            ))}

            {templates.length === 0 && (
              <div className="glass-premium rounded-2xl p-8 text-center animate-fade-in-up">
                <p className="text-slate-400 text-sm">No templates found for this firm.</p>
              </div>
            )}
          </div>
        )}

        {/* Source URL */}
        {sourceUrl && (
          <div className="mt-8 animate-fade-in-up">
            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-neon-cyan transition-colors"
            >
              <ExternalLink size={14} />
              Source: {new URL(sourceUrl).hostname}
            </a>
          </div>
        )}

        {/* CTA */}
        <div className="mt-12 text-center animate-fade-in-up" style={{ animationDelay: '200ms' }}>
          <div className="glass-premium rounded-2xl p-8 inline-block">
            <p className="text-slate-300 mb-4 text-sm">
              Monitor this firm with EdgeRelay
            </p>
            <Link
              to="/register"
              className="btn-premium inline-flex items-center gap-2 rounded-lg bg-neon-cyan px-6 py-3 text-sm font-semibold text-terminal-bg shadow-[0_0_20px_rgba(0,229,255,0.3)] transition-all hover:shadow-[0_0_32px_rgba(0,229,255,0.5)]"
            >
              Get Started Free
              <ArrowRight size={14} />
            </Link>
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
