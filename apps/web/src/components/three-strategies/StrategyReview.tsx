import { useEffect, useState } from "react";
import {
  STRATEGIES,
  STRATEGY_VERSION,
  type StrategyId,
} from "@edgerelay/shared";
import { api } from "@/lib/api";
const CHECKS = [
  "Verified contract, costs and provider",
  "Normal session and relevant major-news calendar checked",
  "Confirmed 15m direction and frozen range",
  "Strict 5m breakout and later 1m trigger within five candles",
  "Next-open entry, one-tick stop and obstacle clearance",
  "Risk at most 0.5%, one entry, one position and daily loss below 1%",
  "Fixed 2R and declared UTC cutoff exit; no stop changes",
  "Before/after evidence and net costs recorded",
];
interface Review {
  id: string;
  strategy_id: string;
  session_date: string;
  symbol: string;
  outcome: string;
  notes: string;
  checks_json: string;
}
export function StrategyReview({
  accountId,
  dealTicket,
  symbol: initialSymbol = "XAUUSD",
}: {
  accountId?: string;
  dealTicket?: number;
  symbol?: string;
}) {
  const [open, setOpen] = useState("");
  const [close, setClose] = useState("");
  const [cutoff, setCutoff] = useState("");
  const [preStart, setPreStart] = useState("");
  const [kind, setKind] = useState<"venue-open" | "daily-reference">(
    "venue-open",
  );
  const [verified, setVerified] = useState(false);
  const [strategyId, setStrategy] = useState<StrategyId>("opening-range");
  const [symbol, setSymbol] = useState(initialSymbol);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [provider, setProvider] = useState("");
  const [outcome, setOutcome] = useState("preparation");
  const [notes, setNotes] = useState("");
  const [checks, setChecks] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState<Review[]>([]);
  const query =
    accountId && dealTicket
      ? `?accountId=${encodeURIComponent(accountId)}&dealTicket=${dealTicket}`
      : "";
  async function load() {
    const res = await api.get<{ reviews: Review[] }>(
      "/strategy-reviews" + query,
    );
    if (res.data) setRows(res.data.reviews);
    else setMessage(res.error?.message ?? "Unable to load reviews");
  }
  useEffect(() => {
    setSymbol(initialSymbol);
    void load();
  }, [query, initialSymbol]);
  async function save() {
    setBusy(true);
    const res = await api.post("/strategy-reviews", {
      version: STRATEGY_VERSION,
      strategyId,
      sessionDate: date,
      symbol,
      provider,
      outcome,
      checks,
      notes,
      session: {
        open: Date.parse(open + "Z") / 1000,
        close: Date.parse(close + "Z") / 1000,
        cutoff: Date.parse(cutoff + "Z") / 1000,
        ...(preStart ? { preStart: Date.parse(preStart + "Z") / 1000 } : {}),
        kind,
        verified,
        label: symbol + " practice session",
        source: provider,
      },
      ...(accountId && dealTicket ? { accountId, dealTicket } : {}),
    });
    setBusy(false);
    setMessage(res.error?.message ?? "Saved as a self-reported review.");
    if (res.data) {
      setNotes("");
      void load();
    }
  }
  const cls =
    "w-full rounded-lg border border-terminal-border bg-terminal-bg p-3 text-sm text-white";
  return (
    <section
      className="rounded-2xl border border-terminal-border p-5 space-y-4"
      aria-label="Strategy journal"
    >
      <h2 className="text-lg font-bold text-white">Prepare, skip or review</h2>
      <p className="text-sm text-terminal-muted">
        {STRATEGY_VERSION} · Your checklist is self-reported. It does not
        certify a broker fill or place an order. Historical trades are not
        automatically assigned a strategy.
      </p>
      <div className="grid sm:grid-cols-2 gap-4">
        <label>
          Strategy
          <select
            aria-label="Strategy"
            className={cls}
            value={strategyId}
            onChange={(e) => setStrategy(e.target.value as StrategyId)}
          >
            {STRATEGIES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.short}
              </option>
            ))}
          </select>
        </label>
        <label>
          UTC session-anchor date
          <input
            className={cls}
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
        <label>
          Exact symbol
          <input
            className={cls}
            value={symbol}
            disabled={!!accountId}
            onChange={(e) => setSymbol(e.target.value)}
            maxLength={40}
            list="practice-symbols"
          />
          <datalist id="practice-symbols">
            <option>XAUUSD</option>
            <option>USDJPY</option>
          </datalist>
        </label>
        <label>
          Provider / contract / day cutoff
          <input
            className={cls}
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            maxLength={120}
            placeholder="Record your actual feed and server cutoff"
          />
        </label>
      </div>
      <fieldset className="space-y-3">
        <legend className="font-semibold">
          Instrument session — all values UTC, including the date
        </legend>
        <p className="text-sm text-terminal-muted">
          Read the exact symbol schedule in MT5 Specification or the venue’s
          contract rules. Convert the broker timezone for this date. For
          continuous trading, declare a daily reference. Cutoff must be after
          the first ten minutes and no later than venue close.
        </p>
        <label className="block">
          Anchor type
          <select
            aria-label="Anchor type"
            className={cls}
            value={kind}
            onChange={(e) => setKind(e.target.value as typeof kind)}
          >
            <option value="venue-open">
              Verified venue / broker session opening
            </option>
            <option value="daily-reference">
              Declared continuous-market daily reference
            </option>
          </select>
        </label>
        <div className="grid sm:grid-cols-2 gap-3">
          {(
            [
              ["Open / reference", open, setOpen],
              ["Venue close / reference end", close, setClose],
              ["Practice cutoff", cutoff, setCutoff],
              ["Pre-session start (optional)", preStart, setPreStart],
            ] as const
          ).map(([title, value, set]) => (
            <label key={title}>
              {title}
              <input
                className={cls}
                type="datetime-local"
                value={value}
                onChange={(e) => set(e.target.value)}
              />
            </label>
          ))}
        </div>
        <label className="flex gap-3 min-h-11 items-center">
          <input
            type="checkbox"
            checked={verified}
            onChange={(e) => setVerified(e.target.checked)}
          />
          I checked the date-specific symbol schedule, UTC conversion and
          availability.
        </label>
      </fieldset>
      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold mb-2">
          Check only what you have verified
        </legend>
        {CHECKS.map((check) => (
          <label
            key={check}
            className="flex items-start gap-3 min-h-11 text-sm"
          >
            <input
              className="mt-1"
              type="checkbox"
              checked={checks.includes(check)}
              onChange={(e) =>
                setChecks(
                  e.target.checked
                    ? [...checks, check]
                    : checks.filter((c) => c !== check),
                )
              }
            />
            {check}
          </label>
        ))}
      </fieldset>
      <label className="block">
        Record type
        <select
          aria-label="Record type"
          className={cls}
          value={outcome}
          onChange={(e) => setOutcome(e.target.value)}
        >
          <option value="preparation">Preparation</option>
          <option value="skip">Skip / cancelled / expired</option>
          <option value="review">Post-session review</option>
        </select>
      </label>
      <label className="block">
        Evidence and notes
        <textarea
          className={cls}
          rows={3}
          maxLength={4000}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Frozen levels, times, skipped rule, screenshot references, actual fill/protection, fees and net result. Do not paste credentials."
        />
      </label>
      <button
        className="rounded-lg bg-neon-cyan text-terminal-bg font-semibold px-5 min-h-11 disabled:opacity-40"
        disabled={
          busy ||
          !notes.trim() ||
          !provider.trim() ||
          !symbol.trim() ||
          !date ||
          !open ||
          !close ||
          !cutoff ||
          !verified
        }
        onClick={save}
      >
        {busy ? "Saving…" : "Save review"}
      </button>
      <p role="status" className="text-sm text-neon-amber">
        {message}
      </p>
      <h3 className="font-semibold">Recent strategy records</h3>
      {!rows.length && (
        <p className="text-sm text-terminal-muted">No records loaded.</p>
      )}
      {rows.map((r) => (
        <article
          key={r.id}
          className="border-t border-terminal-border pt-3 text-sm"
        >
          <p className="font-semibold">
            {r.session_date} · {r.symbol} ·{" "}
            {STRATEGIES.find((s) => s.id === r.strategy_id)?.short} ·{" "}
            {r.outcome}
          </p>
          <p className="whitespace-pre-wrap text-slate-300">{r.notes}</p>
        </article>
      ))}
    </section>
  );
}
