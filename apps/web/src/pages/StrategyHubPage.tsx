import { Link } from "react-router-dom";
import {
  STRATEGIES,
  STRATEGY_VERSION,
  MARKET_ADAPTATION,
} from "@edgerelay/shared";
import { StrategyReview } from "@/components/three-strategies/StrategyReview";
import { useAuthStore } from "@/stores/auth";
export function StrategyHubPage() {
  const user = useAuthStore((s) => s.user);
  return (
    <main className="max-w-5xl mx-auto p-4 space-y-8 text-slate-300">
      <header className="space-y-3">
        <p className="text-neon-cyan text-xs uppercase tracking-widest">
          {STRATEGY_VERSION} · Learn / prepare / replay / review
        </p>
        <h1 className="text-3xl font-bold text-white">Three Strategies</h1>
        <p>{MARKET_ADAPTATION}</p>
        <p className="text-sm">
          One selected setup per day. The first cancelled or expired attempt
          ends that setup for the day. Missing calendar, feed or contract
          verification means skip.
        </p>
      </header>
      <div className="grid md:grid-cols-3 gap-4">
        {STRATEGIES.map((s) => (
          <article
            key={s.id}
            className="rounded-xl border border-terminal-border p-5 space-y-4"
          >
            <p className="text-neon-cyan text-xs">{s.level}</p>
            <h2 className="text-lg font-bold text-white">{s.name}</h2>
            <p className="text-sm">{s.description}</p>
            <p className="text-xs">
              Earliest breakout confirmation: {s.firstConfirmation}
            </p>
            <Link
              className="text-neon-cyan underline min-h-11 flex items-center"
              to={`/academy/three-strategies?strategy=${s.id}`}
            >
              Open practice setup
            </Link>
          </article>
        ))}
      </div>
      <section className="rounded-xl border border-terminal-border p-5 space-y-3">
        <h2 className="font-bold text-white">One fixed execution sequence</h2>
        <p>
          Confirmed 15m pivots → strict 5m close beyond the frozen edge → later
          1m retest within five candles → next-open entry → one-tick stop →
          cost-aware size → fixed 2R or declared UTC cutoff exit.
        </p>
        <p>
          Max 0.5% demo equity including costs. Stop after 1% daily net loss or
          one entry across accounts and symbols. No trailing, break-even
          changes, martingale or grid.
        </p>
        <div className="flex flex-wrap gap-5">
          <Link to="/academy" className="text-neon-cyan underline">
            Study the 12 lessons and credited course
          </Link>
          <a
            href="/playbook/three-strategies.pdf"
            className="text-neon-cyan underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Download source playbook
          </a>
        </div>
        <p className="text-xs text-terminal-muted">
          Existing generated-EA history is retained. New AI strategy variants
          and paid EA generation have been retired for this fixed practice
          framework.
        </p>
      </section>
      {user ? (
        <StrategyReview />
      ) : (
        <Link className="text-neon-cyan underline" to="/login">
          Sign in to save preparation and journal reviews
        </Link>
      )}
    </main>
  );
}
