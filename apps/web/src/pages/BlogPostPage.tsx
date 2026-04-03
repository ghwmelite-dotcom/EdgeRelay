import { useParams, Link, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { ArrowLeft, ArrowRight, Clock, ChevronRight, BookOpen, Share2, CheckCircle2 } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { getBlogPostBySlug, getRelatedPosts } from '@/data/blog-posts';
import type { BlogPost, FaqItem } from '@/data/blog-posts';

const ACCENT_MAP: Record<string, string> = {
  'neon-cyan': '#00e5ff',
  'neon-green': '#00ff9d',
  'neon-purple': '#b18cff',
  'neon-amber': '#ffb800',
  'neon-red': '#ff3d57',
};

function ArticleJsonLd({ post }: { post: BlogPost }) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.metaDescription,
    datePublished: post.date,
    dateModified: post.date,
    author: { '@type': 'Organization', name: 'TradeMetrics Pro', url: 'https://trademetrics.pro' },
    publisher: {
      '@type': 'Organization',
      name: 'TradeMetrics Pro',
      url: 'https://trademetrics.pro',
      logo: { '@type': 'ImageObject', url: 'https://trademetrics.pro/logo-512.png' },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': `https://trademetrics.pro/blog/${post.slug}` },
    articleSection: post.category,
    keywords: post.keywords.join(', '),
    timeRequired: `PT${parseInt(post.readTime)}M`,
    wordCount: post.sections.reduce((acc, s) => acc + s.content.split(/\s+/).length, 0),
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

function FaqJsonLd({ faq }: { faq: FaqItem[] }) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

function BreadcrumbJsonLd({ post }: { post: BlogPost }) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://trademetrics.pro' },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: 'https://trademetrics.pro/blog' },
      { '@type': 'ListItem', position: 3, name: post.title, item: `https://trademetrics.pro/blog/${post.slug}` },
    ],
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const post = slug ? getBlogPostBySlug(slug) : undefined;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [slug]);

  // Update page title
  useEffect(() => {
    if (post) {
      document.title = `${post.title} | TradeMetrics Pro Blog`;
      // Update meta description
      const meta = document.querySelector('meta[name="description"]');
      if (meta) meta.setAttribute('content', post.metaDescription);
      else {
        const newMeta = document.createElement('meta');
        newMeta.name = 'description';
        newMeta.content = post.metaDescription;
        document.head.appendChild(newMeta);
      }
    }
    return () => { document.title = 'TradeMetrics Pro'; };
  }, [post]);

  if (!post) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-terminal-bg px-6 text-center">
        <h1 className="font-display text-3xl font-bold text-white">Article Not Found</h1>
        <p className="mt-3 text-slate-400">The article you're looking for doesn't exist.</p>
        <Link
          to="/blog"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-neon-cyan px-6 py-3 text-sm font-semibold text-terminal-bg"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Blog
        </Link>
      </div>
    );
  }

  const accent = ACCENT_MAP[post.accentColor] || '#00e5ff';
  const relatedPosts = getRelatedPosts(post);

  // Table of Contents from sections
  const toc = post.sections.map((s, i) => ({
    id: `section-${i}`,
    label: s.heading,
  }));

  return (
    <div className="scan-line relative min-h-screen bg-terminal-bg text-slate-100">
      <div className="ambient-glow" />
      <div className="noise-overlay pointer-events-none fixed inset-0 z-[9999]" />

      {/* Structured Data */}
      <ArticleJsonLd post={post} />
      <FaqJsonLd faq={post.faq} />
      <BreadcrumbJsonLd post={post} />

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
            <Link to="/blog" className="text-[12px] font-medium text-terminal-muted hover:text-neon-cyan transition-colors">
              All Articles
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </nav>

      {/* ─── Hero ────────────────────────────────────────── */}
      <header className="relative overflow-hidden px-6 pt-12 pb-16 md:pt-20 md:pb-24">
        <div className="bg-grid pointer-events-none absolute inset-0" />
        <div className="relative z-10 mx-auto max-w-3xl">
          {/* Breadcrumb */}
          <nav className="mb-8 flex items-center gap-2 text-[11px] font-mono-nums text-terminal-muted" aria-label="Breadcrumb">
            <Link to="/" className="hover:text-neon-cyan transition-colors">Home</Link>
            <ChevronRight className="h-3 w-3" />
            <Link to="/blog" className="hover:text-neon-cyan transition-colors">Blog</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-slate-400 truncate max-w-[200px]">{post.title}</span>
          </nav>

          {/* Tag + Meta */}
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <span
              className="rounded-full border px-3 py-1 font-mono-nums text-[10px] uppercase tracking-wider"
              style={{ borderColor: `${accent}30`, color: accent, backgroundColor: `${accent}10` }}
            >
              {post.tag}
            </span>
            <span className="flex items-center gap-1 font-mono-nums text-[11px] text-terminal-muted">
              <Clock className="h-3 w-3" />
              {post.readTime} read
            </span>
            <time className="font-mono-nums text-[11px] text-terminal-muted" dateTime={post.date}>
              {new Date(post.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </time>
          </div>

          {/* Title */}
          <h1 className="animate-fade-in-up font-display text-3xl font-black leading-tight tracking-tight text-white md:text-4xl lg:text-5xl">
            {post.title}
          </h1>

          {/* Excerpt */}
          <p className="animate-fade-in-up mt-6 text-lg leading-relaxed text-slate-400" style={{ animationDelay: '100ms' }}>
            {post.excerpt}
          </p>

          {/* Author + Share */}
          <div className="animate-fade-in-up mt-8 flex items-center justify-between" style={{ animationDelay: '200ms' }}>
            <div className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-full border"
                style={{ borderColor: `${accent}25`, backgroundColor: `${accent}10` }}
              >
                <span className="font-display text-sm font-bold" style={{ color: accent }}>TM</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{post.author}</p>
                <p className="font-mono-nums text-[10px] text-terminal-muted">Trading Education Team</p>
              </div>
            </div>
            <button
              onClick={() => navigator.clipboard?.writeText(window.location.href)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-terminal-border bg-terminal-card/60 px-3 py-1.5 text-[11px] font-medium text-terminal-muted hover:border-neon-cyan/30 hover:text-neon-cyan transition-all cursor-pointer"
            >
              <Share2 className="h-3 w-3" /> Share
            </button>
          </div>
        </div>
      </header>

      {/* ─── Content Grid ────────────────────────────────── */}
      <div className="mx-auto max-w-7xl px-6 pb-20">
        <div className="flex gap-12 lg:gap-16">

          {/* Sidebar — Table of Contents (desktop) */}
          <aside className="hidden lg:block w-56 shrink-0">
            <div className="sticky top-24">
              <p className="mb-4 font-mono-nums text-[9px] uppercase tracking-[2px] text-terminal-muted">In This Article</p>
              <nav className="space-y-2" aria-label="Table of contents">
                {toc.map((item) => (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    className="block text-[12px] leading-snug text-terminal-muted/70 hover:text-neon-cyan transition-colors"
                  >
                    {item.label}
                  </a>
                ))}
                <div className="my-3 h-px bg-terminal-border/30" />
                <a href="#key-takeaways" className="block text-[12px] text-terminal-muted/70 hover:text-neon-cyan transition-colors">Key Takeaways</a>
                <a href="#faq" className="block text-[12px] text-terminal-muted/70 hover:text-neon-cyan transition-colors">FAQ</a>
              </nav>
            </div>
          </aside>

          {/* Main content */}
          <article className="min-w-0 flex-1 max-w-3xl">

            {/* Key Takeaways Box */}
            <section
              id="key-takeaways"
              className="mb-12 rounded-2xl border p-6 md:p-8"
              style={{
                borderColor: `${accent}20`,
                backgroundColor: `${accent}05`,
                boxShadow: `0 0 30px ${accent}08`,
              }}
            >
              <h2 className="flex items-center gap-2 font-display text-lg font-bold text-white">
                <CheckCircle2 className="h-5 w-5" style={{ color: accent }} />
                Key Takeaways
              </h2>
              <ul className="mt-4 space-y-3">
                {post.keyTakeaways.map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm leading-relaxed text-slate-300">
                    <span
                      className="mt-1.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full font-mono-nums text-[10px] font-bold"
                      style={{ backgroundColor: `${accent}15`, color: accent }}
                    >
                      {i + 1}
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </section>

            {/* Article Sections */}
            {post.sections.map((section, i) => (
              <section key={i} id={`section-${i}`} className="mb-10 scroll-mt-24">
                <h2
                  className="mb-4 font-display text-xl font-bold text-white md:text-2xl"
                  style={{ borderLeft: `3px solid ${accent}`, paddingLeft: '16px' }}
                >
                  {section.heading}
                </h2>
                <div
                  className="prose-blog text-[15px] leading-[1.8] text-slate-300"
                  dangerouslySetInnerHTML={{ __html: section.content }}
                />
              </section>
            ))}

            {/* FAQ Section */}
            <section id="faq" className="mt-16 scroll-mt-24">
              <div className="mb-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-terminal-border/30" />
                <span className="font-mono-nums text-[10px] uppercase tracking-[0.3em] text-terminal-muted">FAQ</span>
                <div className="h-px flex-1 bg-terminal-border/30" />
              </div>
              <h2 className="mb-8 text-center font-display text-2xl font-bold text-white">
                Frequently Asked Questions
              </h2>
              <div className="space-y-4">
                {post.faq.map((item, i) => (
                  <details
                    key={i}
                    className="group rounded-xl border border-terminal-border/40 bg-terminal-card/30 transition-all hover:border-terminal-border-hover open:border-neon-cyan/20 open:bg-neon-cyan/[0.02]"
                  >
                    <summary className="flex cursor-pointer items-center justify-between px-6 py-4 text-[15px] font-semibold text-white transition-colors group-hover:text-neon-cyan list-none [&::-webkit-details-marker]:hidden">
                      <span className="pr-4">{item.question}</span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-terminal-muted transition-transform duration-200 group-open:rotate-90" />
                    </summary>
                    <div className="px-6 pb-5 text-[14px] leading-relaxed text-slate-400">
                      {item.answer}
                    </div>
                  </details>
                ))}
              </div>
            </section>

            {/* CTA Box */}
            <section className="mt-16 rounded-2xl border border-neon-cyan/20 bg-gradient-to-br from-neon-cyan/[0.05] to-transparent p-8 text-center">
              <h3 className="font-display text-xl font-bold text-white">Ready to Trade Smarter?</h3>
              <p className="mx-auto mt-3 max-w-md text-sm text-slate-400">
                TradeMetrics Pro gives you AI-powered analytics, automated PropGuard protection, and the world's only free cross-VPS trade copier.
              </p>
              <Link
                to="/"
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-neon-cyan px-8 py-3 text-sm font-semibold text-terminal-bg shadow-[0_0_24px_rgba(0,229,255,0.3)] transition-all hover:shadow-[0_0_40px_rgba(0,229,255,0.5)]"
              >
                Get Started Free <ArrowRight className="h-4 w-4" />
              </Link>
            </section>

            {/* Related Articles */}
            {relatedPosts.length > 0 && (
              <section className="mt-16">
                <h3 className="mb-6 font-display text-lg font-bold text-white">Related Articles</h3>
                <div className="grid gap-4 md:grid-cols-3">
                  {relatedPosts.map((rp) => {
                    const rpAccent = ACCENT_MAP[rp.accentColor] || '#00e5ff';
                    return (
                      <Link
                        key={rp.slug}
                        to={`/blog/${rp.slug}`}
                        className="glass-premium card-hover-premium group flex flex-col rounded-xl p-5"
                      >
                        <span
                          className="mb-3 inline-flex self-start rounded-full border px-2.5 py-0.5 font-mono-nums text-[9px] uppercase tracking-wider"
                          style={{ borderColor: `${rpAccent}25`, color: rpAccent }}
                        >
                          {rp.tag}
                        </span>
                        <h4 className="font-display text-[14px] font-semibold leading-snug text-white group-hover:text-neon-cyan transition-colors">
                          {rp.title}
                        </h4>
                        <div className="mt-auto pt-3 flex items-center gap-1 font-mono-nums text-[10px]" style={{ color: rpAccent }}>
                          Read <ChevronRight className="h-3 w-3" />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            )}
          </article>
        </div>
      </div>

      {/* ─── Footer ──────────────────────────────────────── */}
      <footer className="border-t border-terminal-border/30 px-6 py-6">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 sm:flex-row">
          <Link to="/blog" className="inline-flex items-center gap-2 text-[12px] text-terminal-muted hover:text-neon-cyan transition-colors">
            <ArrowLeft className="h-3 w-3" /> Back to all articles
          </Link>
          <span className="text-[10px] text-terminal-muted/40">&copy; 2026 Hodges &amp; Co. Limited</span>
        </div>
      </footer>
    </div>
  );
}
