import { Link } from "react-router-dom";
import { STRATEGY_VERSION } from "@edgerelay/shared";
export function StrategyBrief() {
  return (
    <section className="rounded-2xl border border-neon-cyan/20 bg-terminal-card p-5 space-y-3">
      <p className="text-xs text-neon-cyan uppercase tracking-widest">
        Three Strategies · XAUUSD / USDJPY first
      </p>
      <h2 className="text-xl font-semibold text-white">
        Mark → Break → Retest → Size → Review
      </h2>
      <p className="text-sm text-slate-300">
        Choose one setup before the session. 15m direction · 5m breakout · 1m
        retest. Practice risk ≤0.5%, one entry, fixed 2R, instrument-specific
        UTC session.
      </p>
      <div className="flex gap-4 flex-wrap text-sm">
        <Link
          className="text-neon-cyan underline min-h-11 flex items-center"
          to="/app/strategy-hub"
        >
          Prepare / record a skip
        </Link>
        <Link
          className="text-neon-cyan underline min-h-11 flex items-center"
          to="/academy/three-strategies"
        >
          Replay studio
        </Link>
        <Link
          className="text-neon-cyan underline min-h-11 flex items-center"
          to="/academy"
        >
          Learn the playbook
        </Link>
      </div>
      <p className="text-xs text-terminal-muted">
        {STRATEGY_VERSION} · Unvalidated market adaptations. Broker positions
        and P/L below remain your actual account data.
      </p>
    </section>
  );
}
