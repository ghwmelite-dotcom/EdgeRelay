import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Clock, ChevronRight, BookOpen, Search, ShieldCheck, Sparkle } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { BLOG_POSTS_FULL } from '@/data/blog-posts';
import type { BlogPost } from '@/data/blog-posts';

const ACCENT_MAP: Record<string, string> = {
  'neon-cyan': '#00e5ff',
  'neon-green': '#00ff9d',
  'neon-purple': '#b18cff',
  'neon-amber': '#ffb800',
  'neon-red': '#ff3d57',
};

const CATEGORIES = [
  { label: 'All', value: 'all' },
  { label: 'Strategy', value: 'strategy' },
  { label: 'Risk Management', value: 'risk' },
  { label: 'Psychology', value: 'psychology' },
  { label: 'Education', value: 'education' },
  { label: 'Analysis', value: 'analysis' },
];

export function BlogListPage() {
  const [category, setCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    document.title = 'Trading Blog — Expert Guides & Education | TradeMetrics Pro';
    window.scrollTo(0, 0);
    return () => { document.title = 'TradeMetrics Pro'; };
  }, []);

  const filtered = BLOG_POSTS_FULL.filter((p) => {
    const matchesCategory = category === 'all' || p.category === category;
    const matchesSearch = searchQuery === '' ||
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.tag.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const featured = BLOG_POSTS_FULL.filter((p) => p.featured);
  const showFeatured = category === 'all' && searchQuery === '';

  return (
    <div className="scan-line relative min-h-screen bg-terminal-bg text-slate-100">
      <div className="ambient-glow" />
      <div className="noise-overlay pointer-events-none fixed inset-0 z-[9999]" />

      {/* JSON-LD for Blog listing */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Blog',
            name: 'TradeMetrics Pro Trading Blog',
            description: 'Expert trading education, strategy guides, risk management tips, and market analysis for forex and CFD traders.',
            url: 'https://trademetrics.pro/blog',
            publisher: { '@type': 'Organization', name: 'TradeMetrics Pro' },
            blogPost: BLOG_POSTS_FULL.map((p) => ({
              '@type': 'BlogPosting',
              headline: p.title,
              description: p.metaDescription,
              datePublished: p.date,
              url: `https://trademetrics.pro/blog/${p.slug}`,
              author: { '@type': 'Organization', name: 'TradeMetrics Pro' },
            })),
          }),
        }}
      />

      {/* ─── Nav ─────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 glass-premium border-b border-white/[0.04] shadow-lg shadow-black/30">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <Link to="/" className="flex items-center gap-3 font-display tracking-tight">
            <div className="relative">
              <div className="flex h-9 w-9 items-center justify-center rounded-[9px] border border-neon-cyan/30 bg-terminal-surface">
                <span className="text-[13px] font-black text-neon-cyan" style={{ textShadow: '0 0 12px var(--color-neon-cyan)' }}>TM</span>
              </div>
            </div>
            <span className="text-[14px] font-bold text-white">TradeMetrics <span className="text-[9px] font-semibold text-terminal-muted uppercase tracking-widest">Pro</span></span>
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/" className="text-[12px] font-medium text-terminal-muted hover:text-neon-cyan transition-colors">
              Home
            </Link>
            <ThemeToggle />
            <Link
              to="/"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-lg bg-neon-cyan px-4 py-2 text-[12px] font-bold text-terminal-bg"
            >
              Launch App <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </nav>

      {/* ─── Hero ────────────────────────────────────────── */}
      <header className="relative overflow-hidden px-6 pt-16 pb-12 md:pt-24 md:pb-16">
        <div className="bg-grid pointer-events-none absolute inset-0" />
        <div className="relative z-10 mx-auto max-w-4xl text-center">
          <div className="mb-4 flex items-center justify-center gap-3">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-terminal-border" />
            <span className="font-mono-nums text-[10px] uppercase tracking-[0.3em] text-terminal-muted">Knowledge Base</span>
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-terminal-border" />
          </div>
          <h1 className="animate-fade-in-up font-display text-4xl font-black tracking-tight text-white md:text-5xl">
            Trading Insights & Education
          </h1>
          <p className="animate-fade-in-up mx-auto mt-5 max-w-xl text-lg text-slate-400" style={{ animationDelay: '80ms' }}>
            Expert guides on strategy, risk management, psychology, and market analysis to level up your trading
          </p>

          {/* Search bar */}
          <div className="animate-fade-in-up mx-auto mt-8 max-w-md" style={{ animationDelay: '150ms' }}>
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-terminal-muted" />
              <input
                type="search"
                placeholder="Search articles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-terminal-border bg-terminal-card/60 py-3 pl-11 pr-4 text-sm text-white placeholder:text-terminal-muted/50 focus:border-neon-cyan/40 focus:outline-none focus:ring-1 focus:ring-neon-cyan/20 transition-all"
              />
            </div>
          </div>
        </div>
      </header>

      {/* ─── Category Filters ────────────────────────────── */}
      <div className="mx-auto max-w-6xl px-6">
        <nav className="flex flex-wrap items-center justify-center gap-2" aria-label="Blog categories">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setCategory(cat.value)}
              className={`rounded-full px-4 py-1.5 font-mono-nums text-[11px] uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                category === cat.value
                  ? 'border border-neon-cyan/40 bg-neon-cyan/15 text-neon-cyan shadow-[0_0_12px_rgba(0,229,255,0.15)]'
                  : 'border border-terminal-border/40 bg-terminal-card/30 text-terminal-muted hover:border-terminal-border-hover hover:text-terminal-text'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </nav>
      </div>

      {/* ─── Flagship Spotlight ────────────────────────── */}
      {showFeatured && BLOG_POSTS_FULL[0] && (
        <section className="mx-auto max-w-6xl px-6 pt-12">
          <Link
            to={`/blog/${BLOG_POSTS_FULL[0].slug}`}
            className="group relative block overflow-hidden rounded-2xl border border-neon-green/20 transition-all duration-300 hover:border-neon-green/40 hover:shadow-[0_0_40px_rgba(0,255,157,0.08)]"
            style={{
              background: 'linear-gradient(135deg, rgba(0,255,157,0.05) 0%, rgba(0,229,255,0.03) 50%, rgba(177,140,255,0.03) 100%)',
            }}
          >
            {/* Top accent */}
            <div className="h-[3px] w-full" style={{ background: 'linear-gradient(90deg, #00ff9d80, #00e5ff40, transparent)' }} />

            <div className="flex flex-col gap-6 p-8 md:flex-row md:items-center md:p-10">
              {/* Left — Icon */}
              <div className="hidden md:flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-neon-green/25 bg-neon-green/10 shadow-[0_0_30px_rgba(0,255,157,0.1)] transition-shadow duration-300 group-hover:shadow-[0_0_40px_rgba(0,255,157,0.2)]">
                <ShieldCheck className="h-10 w-10 text-neon-green" />
              </div>

              {/* Center — Content */}
              <div className="flex-1">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-neon-green/30 bg-neon-green/10 px-3 py-1 font-mono-nums text-[10px] font-semibold uppercase tracking-wider text-neon-green">
                    <Sparkle className="h-3 w-3" />
                    Flagship Guide
                  </span>
                  <span className="rounded-full border border-neon-red/25 bg-neon-red/10 px-2.5 py-0.5 font-mono-nums text-[9px] uppercase tracking-wider text-neon-red">
                    87% fail rate
                  </span>
                  <span className="flex items-center gap-1 font-mono-nums text-[10px] text-terminal-muted">
                    <Clock className="h-3 w-3" />
                    {BLOG_POSTS_FULL[0].readTime}
                  </span>
                </div>
                <h2 className="font-display text-xl font-bold leading-snug text-white group-hover:text-neon-green transition-colors duration-200 md:text-2xl">
                  {BLOG_POSTS_FULL[0].title}
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
                  {BLOG_POSTS_FULL[0].excerpt}
                </p>
              </div>

              {/* Right — CTA */}
              <div className="flex shrink-0 items-center">
                <span className="inline-flex items-center gap-2 rounded-xl bg-neon-green/15 border border-neon-green/25 px-5 py-2.5 text-sm font-semibold text-neon-green transition-all group-hover:bg-neon-green group-hover:text-terminal-bg group-hover:shadow-[0_0_20px_rgba(0,255,157,0.3)]">
                  Read Now
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </div>
            </div>
          </Link>
        </section>
      )}

      {/* ─── Featured Posts ──────────────────────────────── */}
      {showFeatured && (
        <section className="mx-auto max-w-6xl px-6 pt-8">
          <div className="grid gap-6 md:grid-cols-3">
            {featured.filter((_, i) => i > 0).map((post, i) => (
              <FeaturedCard key={post.slug} post={post} delay={i * 100} />
            ))}
          </div>
        </section>
      )}

      {/* ─── All Posts ───────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 py-12">
        {!showFeatured && (
          <p className="mb-6 font-mono-nums text-[11px] uppercase tracking-wider text-terminal-muted">
            {filtered.length} article{filtered.length !== 1 ? 's' : ''} found
          </p>
        )}
        {showFeatured && (
          <h2 className="mb-6 font-display text-lg font-bold text-white">All Articles</h2>
        )}
        <div className="grid gap-4 md:grid-cols-2">
          {(showFeatured ? BLOG_POSTS_FULL.filter((p) => !p.featured) : filtered).map((post, i) => (
            <CompactCard key={post.slug} post={post} delay={i * 60} />
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="py-20 text-center">
            <BookOpen className="mx-auto h-12 w-12 text-terminal-muted/30" />
            <p className="mt-4 text-lg text-terminal-muted">No articles match your search</p>
            <button
              onClick={() => { setCategory('all'); setSearchQuery(''); }}
              className="mt-3 text-sm text-neon-cyan hover:underline cursor-pointer"
            >
              Clear filters
            </button>
          </div>
        )}
      </section>

      {/* ─── Newsletter CTA ──────────────────────────────── */}
      <section className="mx-auto max-w-4xl px-6 pb-20">
        <div className="rounded-2xl border border-neon-cyan/15 bg-gradient-to-br from-neon-cyan/[0.04] to-transparent p-8 text-center md:p-12">
          <h2 className="font-display text-2xl font-bold text-white">Trade Smarter, Not Harder</h2>
          <p className="mx-auto mt-3 max-w-lg text-sm text-slate-400">
            Join 300+ traders using TradeMetrics Pro's AI-powered analytics, automated PropGuard protection, and the world's only free cross-VPS trade copier.
          </p>
          <Link
            to="/"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-neon-cyan px-10 py-4 text-base font-semibold text-terminal-bg shadow-[0_0_32px_rgba(0,229,255,0.4)] transition-all hover:shadow-[0_0_60px_rgba(0,229,255,0.6)]"
          >
            Get Started Free <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* ─── Footer ──────────────────────────────────────── */}
      <footer className="border-t border-terminal-border/30 px-6 py-6">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 sm:flex-row">
          <Link to="/" className="text-[12px] text-terminal-muted hover:text-neon-cyan transition-colors">
            &larr; Back to TradeMetrics Pro
          </Link>
          <span className="text-[10px] text-terminal-muted/40">&copy; 2026 Hodges &amp; Co. Limited</span>
        </div>
      </footer>
    </div>
  );
}

function FeaturedCard({ post, delay }: { post: BlogPost; delay: number }) {
  const accent = ACCENT_MAP[post.accentColor] || '#00e5ff';
  return (
    <Link
      to={`/blog/${post.slug}`}
      className="glass-premium card-hover-premium animate-fade-in-up group relative flex flex-col overflow-hidden rounded-2xl"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="h-[3px] w-full" style={{ background: `linear-gradient(90deg, ${accent}60, ${accent}20, transparent)` }} />
      <div className="absolute right-4 top-5">
        <span className="chip border text-[9px]" style={{ borderColor: `${accent}30`, backgroundColor: `${accent}10`, color: accent }}>Featured</span>
      </div>
      <div className="flex flex-1 flex-col p-6">
        <span className="mb-3 font-mono-nums text-[10px] uppercase tracking-widest text-terminal-muted">{post.tag}</span>
        <h3 className="font-display text-lg font-semibold leading-snug text-white group-hover:text-neon-cyan transition-colors">{post.title}</h3>
        <p className="mt-3 flex-1 text-sm leading-relaxed text-slate-400">{post.excerpt}</p>
        <div className="mt-5 flex items-center justify-between border-t border-terminal-border/30 pt-4">
          <div className="flex items-center gap-3 font-mono-nums text-[10px] text-terminal-muted">
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{post.readTime}</span>
            <span className="text-terminal-border">|</span>
            <time dateTime={post.date}>{new Date(post.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</time>
          </div>
          <span className="flex items-center gap-1 font-mono-nums text-[10px] font-medium group-hover:gap-2 transition-all" style={{ color: accent }}>
            Read <ChevronRight className="h-3 w-3" />
          </span>
        </div>
      </div>
    </Link>
  );
}

function CompactCard({ post, delay }: { post: BlogPost; delay: number }) {
  const accent = ACCENT_MAP[post.accentColor] || '#00e5ff';
  return (
    <Link
      to={`/blog/${post.slug}`}
      className="glass-premium card-hover-premium animate-fade-in-up group flex items-start gap-4 overflow-hidden rounded-xl p-5"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 font-mono-nums text-[10px] text-terminal-muted">
          <span className="rounded-full border px-2 py-0.5" style={{ borderColor: `${accent}20`, color: accent }}>{post.tag}</span>
          <span className="flex items-center gap-1"><Clock className="h-2.5 w-2.5" />{post.readTime}</span>
          <span className="text-terminal-border">|</span>
          <time dateTime={post.date}>{new Date(post.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</time>
        </div>
        <h3 className="mt-2 font-display text-[15px] font-semibold leading-snug text-white group-hover:text-neon-cyan transition-colors">{post.title}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-500 line-clamp-2">{post.excerpt}</p>
      </div>
      <ChevronRight className="mt-6 h-4 w-4 shrink-0 text-terminal-muted group-hover:text-neon-cyan transition-colors" />
    </Link>
  );
}
