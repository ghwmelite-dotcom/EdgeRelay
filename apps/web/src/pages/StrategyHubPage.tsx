import { useEffect, useState, useCallback } from 'react';
import {
  FlaskConical,
  Loader2,
  Check,
  ChevronRight,
  Clock,
  Download,
  RotateCcw,
  Zap,
  Shield,
  Target,
  AlertTriangle,
  Sparkles,
  X,
  ArrowRight,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';

const API_BASE = import.meta.env.PROD
  ? 'https://edgerelay-api.ghwmelite.workers.dev/v1'
  : '/v1';

// ── Types ──────────────────────────────────────────────────────────

interface StrategyParameter {
  key: string;
  label: string;
  type: 'int' | 'double' | 'enum' | 'bool';
  default: number | string | boolean;
  min?: number;
  max?: number;
  step?: number;
  options?: string[];
  labels?: string[];
  tooltip?: string;
}

interface Strategy {
  id: string;
  slug: string;
  name: string;
  category: string;
  difficulty: string;
  description: string;
  recommended_pairs: string[];
  recommended_timeframe: string;
  parameters_json: string;
  backtest_results_json: string;
}

interface Generation {
  id: string;
  strategy_id: string;
  strategy_name: string;
  strategy_slug: string;
  generated_at: string;
  parameters_json: string;
}

interface OptimizeRecommendation {
  param_key: string;
  current_value: number | string | boolean;
  recommended_value: number | string | boolean;
  reason: string;
}

interface OptimizeResult {
  summary: string;
  recommendations: OptimizeRecommendation[];
  projected_improvement: {
    estimated_win_rate_change: string;
    estimated_pf_change: string;
    confidence: string;
  };
  current_params: Record<string, number | string | boolean>;
  stats: Record<string, unknown>;
  model: string;
}

// ── Constants ──────────────────────────────────────────────────────

const CATEGORY_BADGE: Record<string, 'cyan' | 'purple' | 'amber' | 'green'> = {
  trend: 'cyan',
  reversal: 'purple',
  breakout: 'amber',
  scalp: 'green',
  swing: 'cyan',
};

const DIFFICULTY_BADGE: Record<string, 'green' | 'amber' | 'red'> = {
  beginner: 'green',
  intermediate: 'amber',
  advanced: 'red',
};

const TRADE_MGMT_KEYS = new Set([
  'LOT_SIZE',
  'SL_PIPS',
  'TP_PIPS',
  'MAX_SPREAD',
]);

const RISK_MGMT_KEYS = new Set([
  'MAX_DAILY_LOSS',
  'CONSEC_LOSS_LIMIT',
  'BE_TRIGGER_RR',
  'TRAILING_STOP',
  'USE_SESSION_FILTER',
  'SESSION_START',
  'SESSION_END',
]);

// ── Helpers ────────────────────────────────────────────────────────

function parseParams(json: string): StrategyParameter[] {
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function groupParameters(params: StrategyParameter[]) {
  const strategy: StrategyParameter[] = [];
  const trade: StrategyParameter[] = [];
  const risk: StrategyParameter[] = [];

  for (const p of params) {
    if (TRADE_MGMT_KEYS.has(p.key)) trade.push(p);
    else if (RISK_MGMT_KEYS.has(p.key)) risk.push(p);
    else strategy.push(p);
  }

  return { strategy, trade, risk };
}

function getPresetValues(
  params: StrategyParameter[],
  preset: 'conservative' | 'balanced' | 'aggressive',
): Record<string, number | string | boolean> {
  const values: Record<string, number | string | boolean> = {};
  for (const p of params) {
    let val = p.default;

    if (preset === 'conservative') {
      if (p.key === 'LOT_SIZE' && typeof p.min === 'number') val = p.min;
      if (p.key === 'SL_PIPS' && typeof p.max === 'number') val = Math.min(p.max, (p.default as number) * 1.5);
      if (p.key === 'TP_PIPS' && typeof p.default === 'number') val = p.default;
      if (p.key === 'USE_SESSION_FILTER') val = true;
      if (p.key === 'MAX_DAILY_LOSS' && typeof p.min === 'number') val = Math.max(p.min, (p.default as number) * 0.7);
    } else if (preset === 'aggressive') {
      if (p.key === 'LOT_SIZE' && typeof p.max === 'number') val = Math.min(p.max, (p.default as number) * 2);
      if (p.key === 'SL_PIPS' && typeof p.min === 'number') val = Math.max(p.min, (p.default as number) * 0.7);
      if (p.key === 'USE_SESSION_FILTER') val = false;
      if (p.key === 'SESSION_START' && typeof p.min === 'number') val = p.min;
      if (p.key === 'SESSION_END' && typeof p.max === 'number') val = p.max;
    }

    values[p.key] = val;
  }
  return values;
}

// ── Strategy Card ──────────────────────────────────────────────────

function StrategyCard({
  strategy,
  onConfigure,
}: {
  strategy: Strategy;
  onConfigure: () => void;
}) {
  const pairs: string[] = Array.isArray(strategy.recommended_pairs)
    ? strategy.recommended_pairs
    : typeof strategy.recommended_pairs === 'string'
      ? (strategy.recommended_pairs as string).split(',').map((s: string) => s.trim()).filter(Boolean)
      : [];

  return (
    <div className="glass-premium rounded-2xl p-5 animate-fade-in-up flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <h3 className="text-base font-semibold text-slate-100 font-display">
          {strategy.name}
        </h3>
        <div className="flex items-center gap-1.5 shrink-0">
          <Badge variant={CATEGORY_BADGE[strategy.category] ?? 'muted'}>
            {strategy.category}
          </Badge>
          <Badge variant={DIFFICULTY_BADGE[strategy.difficulty] ?? 'muted'}>
            {strategy.difficulty}
          </Badge>
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-terminal-muted leading-relaxed mb-4 flex-1">
        {strategy.description}
      </p>

      {/* Pairs */}
      {pairs.length > 0 && (
        <div className="mb-3">
          <p className="text-[10px] uppercase tracking-[0.15em] text-terminal-muted font-semibold mb-1.5">
            Recommended Pairs
          </p>
          <div className="flex flex-wrap gap-1">
            {pairs.map((pair) => (
              <span
                key={pair}
                className="inline-block rounded-md bg-terminal-bg/60 border border-terminal-border/40 px-2 py-0.5 text-[11px] font-mono-nums text-slate-400"
              >
                {pair}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Timeframe */}
      {strategy.recommended_timeframe && (
        <div className="flex items-center gap-1.5 mb-4 text-xs text-terminal-muted">
          <Clock size={12} />
          <span>{strategy.recommended_timeframe}</span>
        </div>
      )}

      {/* CTA */}
      <Button variant="primary" size="md" className="w-full mt-auto" onClick={onConfigure}>
        <FlaskConical size={14} />
        Customize &amp; Generate
      </Button>
    </div>
  );
}

// ── Parameter Input ────────────────────────────────────────────────

function ParameterInput({
  param,
  value,
  onChange,
}: {
  param: StrategyParameter;
  value: number | string | boolean;
  onChange: (key: string, val: number | string | boolean) => void;
}) {
  if (param.type === 'enum') {
    const options = (param.options ?? []).map((opt, i) => ({
      value: opt,
      label: param.labels?.[i] ?? opt,
    }));
    return (
      <div title={param.tooltip}>
        <Select
          label={param.label}
          options={options}
          value={String(value)}
          onChange={(e) => onChange(param.key, e.target.value)}
        />
        {param.tooltip && (
          <p className="text-[10px] text-terminal-muted mt-1">{param.tooltip}</p>
        )}
      </div>
    );
  }

  if (param.type === 'bool') {
    return (
      <div className="space-y-2" title={param.tooltip}>
        <label className="block text-xs font-semibold text-terminal-muted uppercase tracking-[0.12em]">
          {param.label}
        </label>
        <button
          type="button"
          role="switch"
          aria-checked={Boolean(value)}
          onClick={() => onChange(param.key, !value)}
          className={`
            relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent
            transition-colors duration-200 ease-in-out focus-ring
            ${value ? 'bg-neon-cyan/30' : 'bg-terminal-border/50'}
          `}
        >
          <span
            className={`
              pointer-events-none inline-block h-6 w-6 rounded-full shadow-lg
              transition-transform duration-200 ease-in-out
              ${value ? 'translate-x-5 bg-neon-cyan shadow-[0_0_8px_#00e5ff60]' : 'translate-x-0 bg-slate-500'}
            `}
          />
        </button>
        {param.tooltip && (
          <p className="text-[10px] text-terminal-muted">{param.tooltip}</p>
        )}
      </div>
    );
  }

  // int or double
  const step = param.step ?? (param.type === 'int' ? 1 : 0.01);
  return (
    <div title={param.tooltip}>
      <Input
        label={param.label}
        type="number"
        min={param.min}
        max={param.max}
        step={step}
        value={String(value)}
        onChange={(e) => {
          const v = param.type === 'int' ? parseInt(e.target.value, 10) : parseFloat(e.target.value);
          if (!isNaN(v)) onChange(param.key, v);
        }}
        className="font-mono-nums"
      />
      {param.tooltip && (
        <p className="text-[10px] text-terminal-muted mt-1">{param.tooltip}</p>
      )}
      {param.min != null && param.max != null && (
        <p className="text-[10px] text-terminal-muted/60 mt-0.5 font-mono-nums">
          Range: {param.min} &ndash; {param.max}
        </p>
      )}
    </div>
  );
}

// ── Parameter Section ──────────────────────────────────────────────

function ParamSection({
  title,
  params,
  values,
  onChange,
}: {
  title: string;
  params: StrategyParameter[];
  values: Record<string, number | string | boolean>;
  onChange: (key: string, val: number | string | boolean) => void;
}) {
  if (params.length === 0) return null;
  return (
    <div className="space-y-3">
      <h4 className="text-[11px] uppercase tracking-[0.15em] text-terminal-muted font-semibold border-b border-terminal-border/30 pb-2">
        {title}
      </h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {params.map((p) => (
          <ParameterInput
            key={p.key}
            param={p}
            value={values[p.key] ?? p.default}
            onChange={onChange}
          />
        ))}
      </div>
    </div>
  );
}

// ── Generator Modal ────────────────────────────────────────────────

function GeneratorModal({
  open,
  onClose,
  strategy,
}: {
  open: boolean;
  onClose: () => void;
  strategy: Strategy | null;
}) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const token = useAuthStore((s) => s.token);
  const [values, setValues] = useState<Record<string, number | string | boolean>>({});
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [genStatus, setGenStatus] = useState<{ free_remaining: number; total_generated: number; price_per_generation: number; requires_payment: boolean; exempt?: boolean } | null>(null);
  const [purchasing, setPurchasing] = useState(false);

  const params = strategy ? parseParams(strategy.parameters_json) : [];
  const grouped = groupParameters(params);

  // Fetch generation status
  useEffect(() => {
    if (isAuthenticated && strategy) {
      api.get<{ free_remaining: number; total_generated: number; free_limit: number; price_per_generation: number; requires_payment: boolean }>('/strategy-hub/generation-status').then((res) => {
        if (res.data) setGenStatus(res.data);
      });
    }
  }, [isAuthenticated, strategy?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset form when strategy changes
  useEffect(() => {
    if (strategy) {
      const defaults: Record<string, number | string | boolean> = {};
      for (const p of parseParams(strategy.parameters_json)) {
        defaults[p.key] = p.default;
      }
      setValues(defaults);
      setSuccess(false);
      setError(null);
    }
  }, [strategy?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleChange = useCallback((key: string, val: number | string | boolean) => {
    setValues((prev) => ({ ...prev, [key]: val }));
  }, []);

  const applyPreset = (preset: 'conservative' | 'balanced' | 'aggressive') => {
    if (!strategy) return;
    const presetValues = getPresetValues(parseParams(strategy.parameters_json), preset);
    setValues(presetValues);
  };

  const handleGenerate = async () => {
    if (!strategy || !token) return;
    setGenerating(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/strategy-hub/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          strategy_id: strategy.id,
          parameters: values,
        }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => null) as { error?: { code?: string; message?: string }; data?: { requires_payment?: boolean } } | null;
        if (json?.data?.requires_payment || json?.error?.code === 'GENERATION_LIMIT') {
          setGenStatus((prev) => prev ? { ...prev, requires_payment: true, free_remaining: 0 } : null);
          throw new Error(json?.error?.message ?? 'Free generations used. Payment required.');
        }
        throw new Error(json?.error?.message ?? `Generation failed (${res.status})`);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${strategy.slug ?? strategy.name.replace(/\s+/g, '_')}_EA.mq5`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const handleReset = () => {
    setSuccess(false);
    setError(null);
    if (strategy) {
      const defaults: Record<string, number | string | boolean> = {};
      for (const p of parseParams(strategy.parameters_json)) {
        defaults[p.key] = p.default;
      }
      setValues(defaults);
    }
  };

  const handlePurchase = async () => {
    setPurchasing(true);
    setError(null);
    try {
      const res = await api.post<{ authorization_url: string }>('/strategy-hub/purchase');
      if (res.data?.authorization_url) {
        window.location.href = res.data.authorization_url;
      } else {
        setError(res.error?.message ?? 'Payment initialization failed');
      }
    } catch {
      setError('Payment failed. Please try again.');
    } finally {
      setPurchasing(false);
    }
  };

  if (!strategy) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={success ? 'EA Generated' : strategy.name}
      className="max-w-2xl"
    >
      {success ? (
        /* ── Success Screen ── */
        <div className="space-y-6 py-4 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-neon-green/10 border border-neon-green/20">
            <Check size={32} className="text-neon-green" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-100 font-display mb-2">
              EA Generated Successfully!
            </h3>
            <p className="text-sm text-terminal-muted">
              Your custom Expert Advisor has been downloaded.
            </p>
          </div>

          <div className="rounded-xl border border-neon-amber/30 bg-neon-amber/5 p-5 text-left space-y-4">
            <p className="text-sm font-semibold text-neon-amber flex items-center gap-2">
              <AlertTriangle size={14} />
              Before you compile — complete these steps:
            </p>

            <div className="space-y-3">
              <div className="flex items-start gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-neon-cyan/10 text-[10px] font-bold text-neon-cyan">1</span>
                <p className="text-sm text-terminal-text">
                  <strong>Download the Include files</strong> &mdash; go to{' '}
                  <a href="/downloads" className="text-neon-cyan hover:underline font-medium">
                    Downloads &amp; Setup
                  </a>{' '}
                  and click <strong>"Download Full Package (.zip)"</strong>
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-neon-cyan/10 text-[10px] font-bold text-neon-cyan">2</span>
                <div className="text-sm text-terminal-text">
                  <p><strong>Extract the ZIP</strong> and copy the <strong>11 .mqh files</strong> from <code className="text-neon-cyan font-mono-nums">MQL5\Include\</code> to your MT5 Include folder:</p>
                  <code className="block mt-1.5 text-xs font-mono-nums text-terminal-muted bg-terminal-bg/50 rounded-lg px-3 py-2 border border-terminal-border/30">
                    [MT5 Data Folder]\MQL5\Include\
                  </code>
                  <p className="text-xs text-terminal-muted mt-1">
                    Find your data folder: MT5 &rarr; File &rarr; Open Data Folder
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-neon-cyan/10 text-[10px] font-bold text-neon-cyan">3</span>
                <p className="text-sm text-terminal-text">
                  <strong>Copy the generated .mq5 file</strong> to <code className="text-neon-amber font-mono-nums">MQL5\Experts\</code>
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-neon-cyan/10 text-[10px] font-bold text-neon-cyan">4</span>
                <p className="text-sm text-terminal-text">
                  <strong>Compile</strong> &mdash; right-click the EA in Navigator &rarr; Compile (or press F7 in MetaEditor). Should show <strong className="text-neon-green">0 errors</strong>.
                </p>
              </div>
            </div>

            <p className="text-xs text-neon-amber/70 italic">
              Without the Include files, compilation will fail with "file not found" errors.
            </p>
          </div>

          <div className="flex items-center gap-3 justify-center">
            <Button variant="secondary" onClick={handleReset}>
              <RotateCcw size={14} />
              Generate Another
            </Button>
            <Button variant="primary" onClick={onClose}>
              Done
            </Button>
          </div>
        </div>
      ) : (
        /* ── Configuration Form ── */
        <div className="space-y-6">
          {/* Strategy info */}
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant={CATEGORY_BADGE[strategy.category] ?? 'muted'}>
                  {strategy.category}
                </Badge>
                <Badge variant={DIFFICULTY_BADGE[strategy.difficulty] ?? 'muted'}>
                  {strategy.difficulty}
                </Badge>
              </div>
              <p className="text-sm text-terminal-muted leading-relaxed">
                {strategy.description}
              </p>
            </div>
          </div>

          {/* Quick Start Presets */}
          <div className="space-y-2">
            <h4 className="text-[11px] uppercase tracking-[0.15em] text-terminal-muted font-semibold">
              Quick Start Presets
            </h4>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => applyPreset('conservative')}
              >
                <Shield size={12} />
                Conservative
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => applyPreset('balanced')}
              >
                <Target size={12} />
                Balanced
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => applyPreset('aggressive')}
              >
                <Zap size={12} />
                Aggressive
              </Button>
            </div>
          </div>

          {/* Parameter Sections */}
          <ParamSection
            title="Strategy Parameters"
            params={grouped.strategy}
            values={values}
            onChange={handleChange}
          />
          <ParamSection
            title="Trade Management"
            params={grouped.trade}
            values={values}
            onChange={handleChange}
          />
          <ParamSection
            title="Risk Management"
            params={grouped.risk}
            values={values}
            onChange={handleChange}
          />

          {/* Error */}
          {error && (
            <div className="rounded-xl border border-neon-red/30 bg-neon-red/5 px-4 py-3">
              <p className="text-sm text-neon-red">{error}</p>
            </div>
          )}

          {/* Generation Status + Button */}
          {isAuthenticated && genStatus && !genStatus.exempt && (
            <div className="flex items-center justify-between rounded-xl border border-terminal-border/30 bg-terminal-surface/20 px-4 py-2.5">
              {genStatus.requires_payment ? (
                <>
                  <span className="text-sm text-neon-amber font-medium">Free generations used</span>
                  <span className="font-mono-nums text-sm text-terminal-muted">
                    ${genStatus.price_per_generation.toFixed(2)} per EA
                  </span>
                </>
              ) : (
                <>
                  <span className="text-sm text-terminal-muted">
                    Free generations remaining
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      {[0, 1, 2].map((i) => (
                        <div
                          key={i}
                          className={`h-2 w-5 rounded-full ${
                            i < genStatus.free_remaining
                              ? 'bg-neon-green shadow-[0_0_4px_var(--color-neon-green)]'
                              : 'bg-terminal-border/50'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="font-mono-nums text-sm font-bold text-neon-green">
                      {genStatus.free_remaining}/3
                    </span>
                  </div>
                </>
              )}
            </div>
          )}

          {isAuthenticated ? (
            genStatus?.requires_payment && !genStatus?.exempt ? (
              <div className="rounded-xl border border-neon-amber/30 bg-neon-amber/5 p-5 text-center space-y-3">
                <p className="text-sm text-neon-amber font-medium">
                  You've used all 3 free EA generations
                </p>
                <p className="text-xs text-terminal-muted">
                  Each additional EA costs <span className="font-mono-nums text-terminal-text font-bold">$1.99</span>
                </p>
                <Button
                  variant="primary"
                  className="w-full"
                  isLoading={purchasing}
                  onClick={handlePurchase}
                >
                  Pay $1.99 &amp; Generate
                </Button>
              </div>
            ) : (
              <Button
                variant="primary"
                size="lg"
                className="w-full"
                isLoading={generating}
                onClick={handleGenerate}
              >
                <Download size={16} />
                Generate Expert Advisor
              </Button>
            )
          ) : (
            <div className="rounded-xl border border-terminal-border/40 bg-terminal-surface/30 p-4 text-center">
              <p className="text-sm text-terminal-muted mb-3">
                Sign in to generate custom Expert Advisors
              </p>
              <a href="/login">
                <Button variant="primary" size="md">
                  Sign In
                </Button>
              </a>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

// ── Optimize Results Modal ──────────────────────────────────────────

function OptimizeResultsModal({
  open,
  onClose,
  result,
  onApplyAndRegenerate,
}: {
  open: boolean;
  onClose: () => void;
  result: OptimizeResult | null;
  onApplyAndRegenerate: (recommendedParams: Record<string, number | string | boolean>) => void;
}) {
  if (!result) return null;

  const handleApply = () => {
    const merged = { ...result.current_params };
    for (const rec of result.recommendations) {
      merged[rec.param_key] = rec.recommended_value;
    }
    onApplyAndRegenerate(merged);
    onClose();
  };

  const confidenceColor =
    result.projected_improvement.confidence === 'high'
      ? 'text-neon-green'
      : result.projected_improvement.confidence === 'medium'
        ? 'text-neon-amber'
        : 'text-terminal-muted';

  return (
    <Modal open={open} onClose={onClose} title="AI Optimization Results" className="max-w-3xl">
      <div className="space-y-6">
        {/* Summary */}
        <div className="glass-premium rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <Sparkles size={18} className="text-neon-cyan shrink-0 mt-0.5" />
            <p className="text-sm text-terminal-text leading-relaxed">{result.summary}</p>
          </div>
        </div>

        {/* Recommendations Table */}
        {result.recommendations.length > 0 && (
          <div className="glass-premium rounded-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-terminal-border/30">
              <h4 className="text-[11px] uppercase tracking-[0.15em] text-terminal-muted font-semibold">
                Parameter Recommendations
              </h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-terminal-border/30">
                    <th className="px-5 py-2.5 text-left text-[10px] uppercase tracking-[0.15em] text-terminal-muted font-semibold">
                      Parameter
                    </th>
                    <th className="px-5 py-2.5 text-left text-[10px] uppercase tracking-[0.15em] text-terminal-muted font-semibold">
                      Current
                    </th>
                    <th className="px-5 py-2.5 text-left text-[10px] uppercase tracking-[0.15em] text-terminal-muted font-semibold">
                      Recommended
                    </th>
                    <th className="px-5 py-2.5 text-left text-[10px] uppercase tracking-[0.15em] text-terminal-muted font-semibold">
                      Reason
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {result.recommendations.map((rec, i) => (
                    <tr
                      key={rec.param_key}
                      className={`${i < result.recommendations.length - 1 ? 'border-b border-terminal-border/20' : ''} hover:bg-terminal-card/30 transition-colors`}
                    >
                      <td className="px-5 py-3 text-slate-200 font-medium font-mono-nums text-xs">
                        {rec.param_key}
                      </td>
                      <td className="px-5 py-3 text-terminal-muted line-through font-mono-nums text-xs">
                        {String(rec.current_value)}
                      </td>
                      <td className="px-5 py-3 text-neon-green font-bold font-mono-nums text-xs">
                        {String(rec.recommended_value)}
                      </td>
                      <td className="px-5 py-3 text-terminal-muted text-xs max-w-xs">
                        {rec.reason}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Projected Improvement */}
        <div className="glass-premium rounded-2xl p-4">
          <h4 className="text-[11px] uppercase tracking-[0.15em] text-terminal-muted font-semibold mb-3">
            Projected Improvement
          </h4>
          <div className="flex flex-wrap gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-neon-green/10 border border-neon-green/20 px-3 py-1.5 text-xs font-semibold text-neon-green">
              Win Rate: {result.projected_improvement.estimated_win_rate_change}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-neon-green/10 border border-neon-green/20 px-3 py-1.5 text-xs font-semibold text-neon-green">
              Profit Factor: {result.projected_improvement.estimated_pf_change}
            </span>
            <span className={`inline-flex items-center gap-1.5 rounded-lg bg-terminal-surface/30 border border-terminal-border/30 px-3 py-1.5 text-xs font-semibold ${confidenceColor}`}>
              Confidence: {result.projected_improvement.confidence}
            </span>
          </div>
        </div>

        {/* Model info */}
        {result.model === 'template-fallback' && (
          <p className="text-[10px] text-terminal-muted/60 text-center italic">
            AI was unavailable — showing template-based recommendations
          </p>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 justify-end">
          <Button variant="secondary" onClick={onClose}>
            Dismiss
          </Button>
          <Button variant="primary" onClick={handleApply}>
            <ArrowRight size={14} />
            Apply &amp; Re-generate
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ── My Generations ─────────────────────────────────────────────────

function MyGenerations({
  strategies,
  setSelectedStrategy,
  setParamValues,
  setGeneratorOpen,
}: {
  strategies: Strategy[];
  setSelectedStrategy: (s: Strategy | null) => void;
  setParamValues: (v: Record<string, unknown>) => void;
  setGeneratorOpen: (open: boolean) => void;
}) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [loading, setLoading] = useState(false);
  const [optimizingId, setOptimizingId] = useState<string | null>(null);
  const [optimizeResult, setOptimizeResult] = useState<OptimizeResult | null>(null);
  const [optimizeError, setOptimizeError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    setLoading(true);

    api
      .get<Generation[]>('/strategy-hub/my-generations')
      .then((res) => {
        if (!cancelled && res.data) {
          setGenerations(Array.isArray(res.data) ? res.data : []);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  const handleOptimize = async (gen: Generation) => {
    setOptimizingId(gen.id);
    setOptimizeError(null);
    try {
      const res = await api.post<OptimizeResult>('/strategy-hub/optimize', {
        generation_id: gen.id,
      });
      if (res.error) {
        setOptimizeError(res.error.message ?? 'Optimization failed');
      } else if (res.data) {
        setOptimizeResult(res.data);
      }
    } catch {
      setOptimizeError('Optimization failed. Please try again.');
    } finally {
      setOptimizingId(null);
    }
  };

  const handleApplyAndRegenerate = (recommendedParams: Record<string, number | string | boolean>) => {
    // Find the strategy for the current optimize result
    // We need to match against a generation — use the first generation that matches
    const gen = generations.find((g) => {
      try {
        const params = JSON.parse(g.parameters_json);
        // Check if current_params from result matches this generation's params
        return optimizeResult && JSON.stringify(params) === JSON.stringify(optimizeResult.current_params);
      } catch {
        return false;
      }
    });

    const strategyId = gen?.strategy_id;
    const strategy = strategies.find((s) => s.id === strategyId);

    if (strategy) {
      setSelectedStrategy(strategy);
      setParamValues(recommendedParams as Record<string, unknown>);
      setGeneratorOpen(true);
    }

    setOptimizeResult(null);
  };

  if (!isAuthenticated || (!loading && generations.length === 0)) return null;

  return (
    <div className="mt-12 animate-fade-in-up">
      <h2 className="text-lg font-semibold text-slate-100 font-display mb-4">
        My Generations
      </h2>

      {/* Optimize error banner */}
      {optimizeError && (
        <div className="rounded-xl border border-neon-red/30 bg-neon-red/5 px-4 py-3 mb-4 flex items-center justify-between">
          <p className="text-sm text-neon-red">{optimizeError}</p>
          <button onClick={() => setOptimizeError(null)} className="text-neon-red/60 hover:text-neon-red">
            <X size={14} />
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-terminal-muted py-8 justify-center">
          <Loader2 size={16} className="animate-spin" />
          Loading generation history...
        </div>
      ) : (
        <div className="glass-premium rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-terminal-border/50">
                  <th className="px-5 py-3 text-left text-[10px] uppercase tracking-[0.15em] text-terminal-muted font-semibold">
                    Strategy
                  </th>
                  <th className="px-5 py-3 text-left text-[10px] uppercase tracking-[0.15em] text-terminal-muted font-semibold">
                    Generated
                  </th>
                  <th className="px-5 py-3 text-right text-[10px] uppercase tracking-[0.15em] text-terminal-muted font-semibold">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {generations.map((gen) => (
                  <tr
                    key={gen.id}
                    className="border-b border-terminal-border/20 hover:bg-terminal-card/30 transition-colors"
                  >
                    <td className="px-5 py-3 text-slate-200 font-medium">
                      {gen.strategy_name}
                    </td>
                    <td className="px-5 py-3 text-terminal-muted font-mono-nums">
                      {new Date(gen.generated_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center gap-2 justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={optimizingId === gen.id}
                          onClick={() => handleOptimize(gen)}
                        >
                          {optimizingId === gen.id ? (
                            <>
                              <Loader2 size={12} className="animate-spin" />
                              Analyzing...
                            </>
                          ) : (
                            <>
                              <Sparkles size={12} />
                              Optimize
                            </>
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const strategy = strategies.find((s) => s.id === gen.strategy_id);
                            if (strategy) {
                              try {
                                const savedParams = JSON.parse(gen.parameters_json);
                                setSelectedStrategy(strategy);
                                setParamValues(savedParams);
                                setGeneratorOpen(true);
                              } catch {
                                setSelectedStrategy(strategy);
                                setGeneratorOpen(true);
                              }
                            }
                          }}
                        >
                          <RotateCcw size={12} />
                          Re-generate
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Optimize Results Modal */}
      <OptimizeResultsModal
        open={optimizeResult !== null}
        onClose={() => setOptimizeResult(null)}
        result={optimizeResult}
        onApplyAndRegenerate={handleApplyAndRegenerate}
      />
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────

export function StrategyHubPage() {
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStrategy, setSelectedStrategy] = useState<Strategy | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`${API_BASE}/strategy-hub/strategies`);
        const json = await res.json();
        if (!cancelled) {
          setStrategies(json.data ?? []);
        }
      } catch {
        // fail silently
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const openGenerator = (strategy: Strategy) => {
    setSelectedStrategy(strategy);
    setModalOpen(true);
  };

  const closeGenerator = () => {
    setModalOpen(false);
    // Delay clearing strategy to allow close animation
    setTimeout(() => setSelectedStrategy(null), 300);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* ── Header ── */}
      <div className="animate-fade-in-up">
        <div className="flex items-center gap-3 mb-2">
          <FlaskConical size={24} className="text-neon-cyan" />
          <h1 className="text-2xl font-bold text-slate-100 font-display tracking-tight">
            Strategy Hub
          </h1>
          {!loading && (
            <Badge variant="cyan">{strategies.length} strategies</Badge>
          )}
        </div>
        <p className="text-sm text-terminal-muted">
          Generate custom Expert Advisors from battle-tested strategies
        </p>
      </div>

      {/* ── Loading ── */}
      {loading && (
        <div className="flex items-center justify-center py-20 gap-3 text-terminal-muted">
          <Loader2 size={20} className="animate-spin" />
          <span className="text-sm">Loading strategies...</span>
        </div>
      )}

      {/* ── Strategy Grid ── */}
      {!loading && strategies.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {strategies.map((s) => (
            <StrategyCard
              key={s.id}
              strategy={s}
              onConfigure={() => openGenerator(s)}
            />
          ))}
        </div>
      )}

      {/* ── Empty State ── */}
      {!loading && strategies.length === 0 && (
        <div className="glass-premium rounded-2xl p-12 text-center animate-fade-in-up">
          <FlaskConical size={40} className="mx-auto text-terminal-muted/50 mb-4" />
          <h3 className="text-lg font-semibold text-slate-200 font-display mb-2">
            No Strategies Available
          </h3>
          <p className="text-sm text-terminal-muted">
            Strategies are being prepared. Check back soon.
          </p>
        </div>
      )}

      {/* ── My Generations ── */}
      <MyGenerations
        strategies={strategies}
        setSelectedStrategy={setSelectedStrategy}
        setParamValues={() => {}}
        setGeneratorOpen={setModalOpen}
      />

      {/* ── Generator Modal ── */}
      <GeneratorModal
        open={modalOpen}
        onClose={closeGenerator}
        strategy={selectedStrategy}
      />
    </div>
  );
}
