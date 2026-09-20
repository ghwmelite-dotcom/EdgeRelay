import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  STRATEGIES,
  MARKET_ADAPTATION,
  teachingReplay,
  parseReplay,
  evaluateReplay,
  aggregate,
  confirmedDirection,
  isStrategyId,
  type Candle,
  type ReplayInput,
  type StrategyId,
} from "@edgerelay/shared";
import { CourseVideo } from "@/components/academy/CourseVideo";
function utc(time: number) {
  return (
    new Date(time * 1000).toISOString().replace("T", " ").slice(0, 16) + " UTC"
  );
}
function CandleChart({
  candles,
  title,
  edge,
}: {
  candles: Candle[];
  title: string;
  edge?: number;
}) {
  const data = candles.slice(-48),
    hi = Math.max(...data.map((c) => c.high), edge ?? 0),
    lo = Math.min(...data.map((c) => c.low), edge ?? Infinity),
    span = hi - lo || 1;
  const y = (v: number) => 180 - ((v - lo) / span) * 155,
    step = 620 / Math.max(data.length, 1);
  return (
    <figure className="min-w-0 rounded-xl border border-terminal-border p-3">
      <figcaption className="text-sm font-semibold mb-2">
        {title} · completed candles only
      </figcaption>
      {data.length ? (
        <svg
          role="img"
          aria-label={`${title}, ${data.length} completed candles. Last close ${data.at(-1)!.close}`}
          viewBox="0 0 680 215"
          className="w-full"
        >
          <text x="630" y="24" fill="currentColor" fontSize="10">
            {hi.toFixed(3)}
          </text>
          <text x="630" y="180" fill="currentColor" fontSize="10">
            {lo.toFixed(3)}
          </text>
          {edge !== undefined && (
            <line
              x1="0"
              x2="620"
              y1={y(edge)}
              y2={y(edge)}
              stroke="currentColor"
              strokeDasharray="4 4"
            />
          )}
          {data.map((c, i) => {
            const x = i * step + step / 2;
            return (
              <g
                key={c.time}
                className={
                  c.close >= c.open ? "text-neon-green" : "text-neon-red"
                }
              >
                <line
                  x1={x}
                  x2={x}
                  y1={y(c.high)}
                  y2={y(c.low)}
                  stroke="currentColor"
                />
                <rect
                  x={x - step * 0.3}
                  y={Math.min(y(c.open), y(c.close))}
                  width={step * 0.6}
                  height={Math.max(1, Math.abs(y(c.open) - y(c.close)))}
                  fill="currentColor"
                />
              </g>
            );
          })}
          <text x="0" y="207" fill="currentColor" fontSize="10">
            {utc(data[0]!.time)}
          </text>
          <text x="380" y="207" fill="currentColor" fontSize="10">
            {utc(data.at(-1)!.time)}
          </text>
        </svg>
      ) : (
        <p className="text-sm text-terminal-muted p-8">
          Await completed candles.
        </p>
      )}
    </figure>
  );
}
export function ThreeStrategiesStudioPage() {
  const [params] = useSearchParams();
  const query = params.get("strategy");
  const [strategy, setStrategy] = useState<StrategyId>(
    isStrategyId(query) ? query : "opening-range",
  );
  const [symbol, setSymbol] = useState("XAUUSD");
  const [scenario, setScenario] = useState("valid");
  const [imported, setImported] = useState<ReplayInput | null>(null);
  const [minute, setMinute] = useState(0);
  const [error, setError] = useState("");
  const [decision, setDecision] = useState("");
  const fixture = useMemo(
    () => teachingReplay(strategy, symbol, scenario),
    [strategy, symbol, scenario],
  );
  const source = imported ?? fixture;
  const maxMinute = Math.min(
    1440,
    Math.floor((source.session.cutoff - source.session.open) / 60),
  );
  const asOf = source.session.open + minute * 60;
  const result = evaluateReplay({ ...source, asOf });
  const closed = source.m1.filter((c) => c.time + 60 <= asOf);
  const five = aggregate(closed, 300, asOf, source.session.open);
  const fifteen = source.m15.filter((c) => c.time + 900 <= asOf);
  const cls =
    "rounded-lg border border-terminal-border bg-terminal-bg px-3 py-3 text-sm";
  function reset() {
    setMinute(0);
    setDecision("");
  }
  async function importFile(file?: File) {
    if (!file) return;
    if (file.size > 5_000_000) {
      setError("Maximum import size is 5 MB.");
      return;
    }
    try {
      const data = parseReplay(JSON.parse(await file.text()));
      setImported(data);
      reset();
      setError("");
    } catch {
      setError(
        "Invalid replay JSON. Use the downloadable schema example with one provider, verified UTC session and sorted ordinary candles.",
      );
    }
  }
  function download() {
    const blob = new Blob([JSON.stringify(source, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "three-strategies-replay-example.json";
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <main className="max-w-6xl mx-auto p-4 md:p-6 space-y-6 text-slate-300">
      <header className="space-y-3">
        <Link to="/academy" className="text-neon-cyan underline">
          Academy
        </Link>
        <h1 className="text-3xl font-bold text-white">
          Three Strategies Studio
        </h1>
        <p>{MARKET_ADAPTATION}</p>
      </header>
      <section className="border border-neon-amber/30 rounded-xl p-4 text-sm space-y-2">
        <strong>
          {imported
            ? "Imported practice data — provenance is user-declared"
            : "Synthetic teaching replay — invented candles, hours and contract economics"}
        </strong>
        <p>
          No live market feed, order execution or performance claim. Built-in
          fixtures demonstrate mechanics only; their 22:02 UTC anchor and
          90-minute cutoff are invented. Replace them with verified
          instrument-specific data before historical testing.
        </p>
      </section>
      <div className="flex flex-wrap gap-4">
        <label>
          Setup
          <select
            aria-label="Setup"
            className={cls + " block"}
            disabled={!!imported}
            value={strategy}
            onChange={(e) => {
              setStrategy(e.target.value as StrategyId);
              reset();
            }}
          >
            {STRATEGIES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.short}
              </option>
            ))}
          </select>
        </label>
        <label>
          Teaching instrument
          <select
            aria-label="Teaching instrument"
            className={cls + " block"}
            disabled={!!imported}
            value={symbol}
            onChange={(e) => {
              setSymbol(e.target.value);
              reset();
            }}
          >
            <option>XAUUSD</option>
            <option>USDJPY</option>
          </select>
        </label>
        <label>
          Exercise
          <select
            aria-label="Exercise"
            className={cls + " block"}
            disabled={!!imported}
            value={scenario}
            onChange={(e) => {
              setScenario(e.target.value);
              reset();
            }}
          >
            <option value="valid">Breakout and retest</option>
            <option value="cancel">Wrong-side close</option>
            <option value="expire">Retest expires</option>
            <option value="wick">Wick is not a breakout</option>
            <option value="news">News blackout</option>
            <option value="obstacle">Target meets obstacle</option>
          </select>
        </label>
      </div>
      <section className="rounded-xl border border-terminal-border p-4 space-y-2 text-sm">
        <h2 className="font-bold text-white">Session and evidence</h2>
        <p>
          {source.symbol} · {source.provider} · {source.session.kind} ·{" "}
          {source.session.label}
        </p>
        <p>
          Anchor: {utc(source.session.open)} · Cutoff:{" "}
          {utc(source.session.cutoff)} · Venue close:{" "}
          {utc(source.session.close)}
        </p>
        <p>
          Pre-session:{" "}
          {source.session.preStart
            ? utc(source.session.preStart) + " to anchor (exclusive)"
            : "Unavailable — pre-session setup disabled"}
        </p>
        <p>Schedule source: {source.session.source}</p>
        <p>
          Risk day: UTC calendar day; one entry across all accounts and symbols.
          Recorded previous-day cutoff:{" "}
          {source.previousDay?.cutoff ?? "Missing"}
        </p>
      </section>
      <div className="flex flex-wrap gap-3 items-center">
        <button className={cls} onClick={reset}>
          Reset replay
        </button>
        <button
          className={cls}
          disabled={minute >= maxMinute}
          onClick={() => {
            setMinute((v) => Math.min(v + 1, maxMinute));
            setDecision("");
          }}
        >
          Next minute
        </button>
        <button
          className={cls}
          disabled={minute >= maxMinute}
          onClick={() => {
            setMinute((v) => Math.min(v + 5, maxMinute));
            setDecision("");
          }}
        >
          Next 5 minutes
        </button>
        <strong>{utc(asOf)}</strong>
        <span className="text-sm">
          15m direction:{" "}
          {confirmedDirection(source.m15, asOf) ?? "unconfirmed — skip"}
        </span>
      </div>
      <input
        aria-label="Replay minute"
        className="w-full"
        type="range"
        min={0}
        max={maxMinute}
        step={1}
        value={minute}
        onChange={(e) => {
          setMinute(Number(e.target.value));
          setDecision("");
        }}
      />
      <div className="grid lg:grid-cols-3 gap-4">
        <CandleChart title="15m direction" candles={fifteen} />
        <CandleChart
          title="5m breakout (session-aligned)"
          candles={five}
          edge={result.range?.high}
        />
        <CandleChart
          title="1m retest"
          candles={closed.filter((c) => c.time >= source.session.open)}
          edge={result.range?.high}
        />
      </div>
      <section
        className="rounded-xl border border-terminal-border p-5 space-y-3"
        aria-live="polite"
      >
        <h2 className="font-bold text-white">Rule state: {result.phase}</h2>
        <p>{result.reason}</p>
        {result.range && (
          <p>
            Frozen high {result.range.high} · low {result.range.low}
          </p>
        )}
        {result.plan && (
          <dl className="grid sm:grid-cols-3 gap-3 text-sm">
            {Object.entries(result.plan).map(([k, v]) => (
              <div key={k}>
                <dt className="text-terminal-muted">{k}</dt>
                <dd>{Number(v.toFixed(6))}</dd>
              </div>
            ))}
          </dl>
        )}
        {result.exit && (
          <p>
            Exit: {result.exit.reason} at {result.exit.price}.{" "}
            {result.exit.ambiguous
              ? "Intrabar order unknown: conservative stop-first outcome."
              : ""}
          </p>
        )}
        <p className="text-sm">
          Decision exercise: is a new entry allowed at this exact replay
          instant?
        </p>
        <div className="flex gap-3">
          <button
            className={cls}
            onClick={() =>
              setDecision(
                result.phase === "ready"
                  ? "Correct: eligible in this practice model. No real order is sent."
                  : "Not yet or no longer eligible. " + result.reason,
              )
            }
          >
            Entry permitted
          </button>
          <button
            className={cls}
            onClick={() =>
              setDecision(
                result.phase === "ready"
                  ? "The model is ready at this next open; review all verified inputs before acting."
                  : "Correct: wait, skip or manage the existing replay position. " +
                      result.reason,
              )
            }
          >
            Wait / no new entry
          </button>
        </div>
        <p>{decision}</p>
      </section>
      <section className="rounded-xl border border-terminal-border p-4 space-y-3">
        <h2 className="font-bold">Use your own historical evidence</h2>
        <p className="text-sm">
          Import the same-provider JSON schema with epoch-second candle-open
          times, a verified UTC session, instrument calendar, relevant news and
          account-currency contract economics. Imported booleans are
          declarations, not independent verification. Keep each provider
          separate.
        </p>
        <button className={cls} onClick={download}>
          Download replay JSON example
        </button>
        <label className="block">
          Import replay JSON
          <input
            className="block mt-2"
            type="file"
            accept=".json,application/json"
            onChange={(e) => void importFile(e.target.files?.[0])}
          />
        </label>
        {imported && (
          <button
            className={cls}
            onClick={() => {
              setImported(null);
              reset();
            }}
          >
            Return to synthetic exercises
          </button>
        )}
        <p role="alert" className="text-neon-amber">
          {error}
        </p>
      </section>
      <CourseVideo
        chapter={
          source.strategy === "opening-range"
            ? 790
            : source.strategy === "previous-day"
              ? 1021
              : 1203
        }
      />
      <Link to="/app/strategy-hub" className="text-neon-cyan underline">
        Record preparation, a skip or review
      </Link>
    </main>
  );
}
