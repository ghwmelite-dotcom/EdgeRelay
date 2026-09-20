import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, Clock, Shield, BarChart3 } from "lucide-react";
import { STRATEGIES, MARKET_ADAPTATION, COURSE_VIDEO } from "@edgerelay/shared";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
export function LandingPage() {
  return (
    <div className="min-h-screen bg-terminal-bg text-slate-300">
      <nav className="max-w-6xl mx-auto px-5 py-5 flex items-center gap-5 border-b border-terminal-border">
        <Link
          to="/"
          className="font-display text-lg font-bold text-white mr-auto"
        >
          TradeMetrics<span className="text-neon-cyan">Pro</span>
        </Link>
        <Link to="/strategy-hub" className="hidden sm:block text-sm">
          The playbook
        </Link>
        <ThemeToggle />
        <Link
          to="/login"
          className="text-sm text-neon-cyan min-h-11 flex items-center"
        >
          Sign in
        </Link>
      </nav>
      <main className="max-w-6xl mx-auto px-5">
        <section className="grid lg:grid-cols-5 gap-10 py-16 md:py-24 items-center">
          <div className="lg:col-span-3 space-y-6">
            <p className="font-mono text-xs uppercase tracking-widest text-neon-cyan">
              A repeatable process. A record you can review.
            </p>
            <h1 className="font-display text-4xl sm:text-6xl font-bold text-white leading-tight">
              Three setups.
              <br />
              <span className="text-neon-cyan">One disciplined workflow.</span>
            </h1>
            <p className="text-lg max-w-xl">
              Learn the break-and-retest framework, prepare your session,
              practise the rules and review your actual trading data. Start with
              XAUUSD and USDJPY; verify every market on its own terms.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                to="/register"
                className="min-h-12 rounded-xl px-6 bg-neon-cyan text-terminal-bg font-bold flex items-center gap-3"
              >
                Open your workspace <ArrowRight size={18} />
              </Link>
              <Link
                to="/three-strategies"
                className="min-h-12 border border-terminal-border rounded-xl px-6 flex items-center"
              >
                Try the practice studio
              </Link>
            </div>
            <p className="text-xs text-terminal-muted">
              Educational practice, not a promise of profit. No martingale. No
              grid.
            </p>
          </div>
          <aside className="lg:col-span-2 rounded-2xl border border-terminal-border bg-terminal-card p-6 space-y-6">
            <p className="text-xs text-neon-cyan uppercase tracking-widest">
              Your session sequence
            </p>
            {[
              [
                "01",
                "Mark",
                "Verify the instrument’s UTC session and freeze the selected range.",
              ],
              [
                "02",
                "Confirm",
                "15m direction → 5m breakout → later 1m retest.",
              ],
              [
                "03",
                "Size",
                "One-tick invalidation, costs included, quantity rounded down.",
              ],
              [
                "04",
                "Review",
                "Record the trade or the reason you correctly skipped.",
              ],
            ].map(([n, title, description]) => (
              <div key={n} className="flex gap-4">
                <span className="text-neon-cyan font-mono text-sm">{n}</span>
                <div>
                  <h2 className="font-semibold text-white">{title}</h2>
                  <p className="text-sm mt-1 text-terminal-muted">
                    {description}
                  </p>
                </div>
              </div>
            ))}
          </aside>
        </section>
        <section className="py-12 border-t border-terminal-border space-y-6">
          <div>
            <p className="text-neon-cyan text-xs uppercase tracking-widest">
              Choose one before the session
            </p>
            <h2 className="text-3xl font-bold text-white mt-3">
              The Three Strategies playbook
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {STRATEGIES.map((s, i) => (
              <Link
                key={s.id}
                to={`/three-strategies?strategy=${s.id}`}
                className="rounded-2xl border border-terminal-border p-6 space-y-4 hover:border-neon-cyan/50"
              >
                <p className="font-mono text-neon-cyan">
                  0{i + 1} / {s.level}
                </p>
                <h3 className="text-xl font-semibold text-white">{s.name}</h3>
                <p className="text-sm">{s.description}</p>
                <p className="text-neon-cyan text-sm">Explore the setup →</p>
              </Link>
            ))}
          </div>
          <p className="text-sm text-terminal-muted">{MARKET_ADAPTATION}</p>
        </section>
        <section className="py-12 grid md:grid-cols-2 gap-8 border-t border-terminal-border">
          {[
            {
              icon: BookOpen,
              title: "Learn from the source",
              text: "Twelve versioned lessons, illustrated rule cards, complete quizzes and chaptered video. Original course by Scarface Trades, visibly credited in every lesson.",
            },
            {
              icon: Clock,
              title: "Use the right market clock",
              text: "Record the actual broker or venue session in UTC, including the date, daylight-saving conversion and maintenance. A continuous market needs a declared daily reference.",
            },
            {
              icon: Shield,
              title: "Practise fixed risk rules",
              text: "At most 0.5% demo-equity risk including costs, one daily entry across accounts, a 1% daily net-loss stop and fixed 2R gross target. Real execution can differ from a replay.",
            },
            {
              icon: BarChart3,
              title: "Keep the evidence connected",
              text: "Connected-account positions and P/L, a trade journal, major market news and Telegram notifications support your review. Self-reported strategy notes remain separate from broker data.",
            },
          ].map((f) => (
            <article key={f.title} className="flex gap-4">
              <f.icon className="text-neon-cyan shrink-0" size={24} />
              <div>
                <h2 className="text-lg font-semibold text-white">{f.title}</h2>
                <p className="text-sm leading-relaxed mt-2">{f.text}</p>
              </div>
            </article>
          ))}
        </section>
        <section className="my-12 rounded-2xl border border-terminal-border p-8 space-y-4">
          <h2 className="text-2xl font-bold text-white">
            Study the lesson. Test the rule. Keep the record.
          </h2>
          <p>
            The video demonstrates stock examples. The exact cross-market
            practice rules and UTC session adaptation require independent
            historical and demo forward testing. Built-in replay candles are
            explicitly synthetic.
          </p>
          <div className="flex flex-wrap gap-5">
            <Link to="/academy" className="text-neon-cyan underline">
              Open the academy
            </Link>
            <a
              href={COURSE_VIDEO.channel}
              target="_blank"
              rel="noopener noreferrer"
              className="text-neon-cyan underline"
            >
              Video owner: Scarface Trades on YouTube
            </a>
            <Link
              to="/tools/position-size-calculator"
              className="text-neon-cyan underline"
            >
              Risk arithmetic calculator
            </Link>
          </div>
        </section>
      </main>
      <footer className="border-t border-terminal-border max-w-6xl mx-auto px-5 py-8 flex flex-wrap gap-6 text-sm">
        <span className="mr-auto">TradeMetrics Pro</span>
        <Link to="/terms">Terms</Link>
        <Link to="/privacy">Privacy</Link>
        <Link to="/login">Dashboard</Link>
      </footer>
    </div>
  );
}
