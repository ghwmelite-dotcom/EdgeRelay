// Settings card that lets a user opt into per-asset, per-phase Telegram
// alerts from the ICC Bias Engine. Saves happen via bulk PUT for speed.
import { useCallback, useEffect, useState } from 'react';
import { Compass, CheckCircle2, AlertTriangle, Mail } from 'lucide-react';
import { api } from '@/lib/api';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useNotificationStore } from '@/stores/notifications';
import { BrowserPushToggle } from './BrowserPushToggle';

type PhaseKey =
  | 'alert_on_indication'
  | 'alert_on_correction'
  | 'alert_on_continuation'
  | 'alert_on_consolidation';

interface PrefRow {
  symbol: string;
  alert_on_indication: number;
  alert_on_correction: number;
  alert_on_continuation: number;
  alert_on_consolidation: number;
}

interface AssetMeta {
  symbol: string;
  label: string;
  category: 'Metal' | 'Index' | 'Forex';
}

interface PrefsResponse {
  prefs: PrefRow[];
  assets: AssetMeta[];
}

const PHASES: Array<{ key: PhaseKey; label: string; color: string; blurb: string }> = [
  { key: 'alert_on_indication',    label: 'Indication',    color: '#ffb800', blurb: 'Break evidence — don\'t enter yet' },
  { key: 'alert_on_correction',    label: 'Correction',    color: '#00e5ff', blurb: 'Pullback in progress' },
  { key: 'alert_on_continuation',  label: 'Continuation',  color: '#00ff9d', blurb: 'Entry window — the big one' },
  { key: 'alert_on_consolidation', label: 'Consolidation', color: '#f59e0b', blurb: 'Trend broken — stay flat' },
];

interface BiasAlertsCardProps {
  telegramConnected: boolean;
}

export function BiasAlertsCard({ telegramConnected }: BiasAlertsCardProps) {
  const [prefs, setPrefs] = useState<Record<string, PrefRow>>({});
  const [assets, setAssets] = useState<AssetMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Daily ICC Brief toggle lives in notification_preferences, which the
  // notifications store already owns — reuse that pipeline.
  const notifPrefs = useNotificationStore((s) => s.preferences);
  const updateNotifPrefs = useNotificationStore((s) => s.updatePreferences);

  useEffect(() => {
    (async () => {
      const res = await api.get<PrefsResponse>('/bias-alerts');
      if (res.data) {
        const map: Record<string, PrefRow> = {};
        for (const p of res.data.prefs) map[p.symbol] = p;
        setPrefs(map);
        setAssets(res.data.assets);
      }
      setLoading(false);
    })();
  }, []);

  const togglePhase = useCallback((symbol: string, key: PhaseKey) => {
    setPrefs((prior) => {
      const existing = prior[symbol] ?? {
        symbol,
        alert_on_indication: 0,
        alert_on_correction: 0,
        alert_on_continuation: 0,
        alert_on_consolidation: 0,
      };
      return { ...prior, [symbol]: { ...existing, [key]: existing[key] ? 0 : 1 } };
    });
    setDirty(true);
    setMessage(null);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      prefs: Object.values(prefs).map((p) => ({
        symbol: p.symbol,
        alert_on_indication:   !!p.alert_on_indication,
        alert_on_correction:   !!p.alert_on_correction,
        alert_on_continuation: !!p.alert_on_continuation,
        alert_on_consolidation: !!p.alert_on_consolidation,
      })),
    };
    const res = await api.put<{ ok: boolean; saved: number }>('/bias-alerts/bulk', payload);
    setSaving(false);
    if (res.data?.ok) {
      setMessage({ text: `Saved ${res.data.saved} preference${res.data.saved === 1 ? '' : 's'}`, type: 'success' });
      setDirty(false);
    } else {
      setMessage({ text: res.error?.message ?? 'Save failed', type: 'error' });
    }
  };

  return (
    <Card className="animate-fade-in-up" style={{ animationDelay: '150ms' }}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-neon-cyan/10">
            <Compass size={16} className="text-neon-cyan" />
          </span>
          ICC Bias Alerts
        </CardTitle>
      </CardHeader>

      <p className="text-xs text-terminal-muted mb-4">
        Get a Telegram ping the moment any tracked asset transitions to a phase you care about.
        <strong className="text-neon-green"> Continuation</strong> is on by default — that's the entry window.
      </p>

      {!telegramConnected && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-neon-amber/25 bg-neon-amber/[0.05] px-3 py-2">
          <AlertTriangle size={14} className="text-neon-amber mt-0.5" />
          <p className="text-[11px] text-neon-amber/90">
            Connect Telegram above to enable these alerts. You can still save preferences now.
          </p>
        </div>
      )}

      {/* Browser push — OS-level notifications that fire even when the
          site isn't open. Independent of Telegram, drives off the same
          phase-alert preferences below. */}
      <BrowserPushToggle />

      {/* Daily ICC Brief — separate from phase alerts because it's a
          once-a-day scheduled push rather than a phase-transition trigger.
          Toggle is disabled until the user's notification_preferences row
          exists (created automatically when Telegram is linked). */}
      <div
        className={`mb-4 rounded-xl border px-4 py-3 ${
          notifPrefs
            ? 'border-neon-cyan/20 bg-neon-cyan/[0.03]'
            : 'border-terminal-border/40 bg-terminal-surface/20 opacity-60'
        }`}
      >
        <label className={`flex items-center justify-between gap-3 select-none ${notifPrefs ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
          <div className="flex items-start gap-2.5">
            <Mail size={14} className="text-neon-cyan mt-0.5" />
            <div>
              <p className="text-[12px] font-semibold text-slate-200">Daily ICC Brief</p>
              <p className="text-[10px] text-terminal-muted mt-0.5 leading-snug">
                07:00 UTC Telegram digest — all 5 assets, one-sentence AI read each, plus any A+ setups.
                {!notifPrefs && <span className="text-neon-amber"> Connect Telegram first to enable.</span>}
              </p>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={!!notifPrefs?.icc_brief}
            disabled={!notifPrefs}
            onClick={() => notifPrefs && updateNotifPrefs({ icc_brief: !notifPrefs.icc_brief })}
            className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-all duration-300 ${
              notifPrefs?.icc_brief
                ? 'bg-neon-cyan shadow-[0_0_8px_#00e5ff40]'
                : 'bg-terminal-border'
            } ${!notifPrefs ? 'cursor-not-allowed' : ''}`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg transition-transform duration-200 ${
                notifPrefs?.icc_brief ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </label>
      </div>

      <p className="text-[10px] uppercase tracking-[0.15em] text-terminal-muted font-semibold mb-2">
        Phase-change alerts (per asset)
      </p>

      {loading ? (
        <div className="rounded-xl border border-terminal-border/40 bg-terminal-surface/30 h-[180px] animate-pulse" />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-terminal-border/40">
                <th className="text-left py-2 pr-3 text-[10px] uppercase tracking-[0.15em] text-terminal-muted font-semibold">
                  Asset
                </th>
                {PHASES.map((p) => (
                  <th
                    key={p.key}
                    className="text-center py-2 px-2 text-[10px] uppercase tracking-[0.12em] font-bold"
                    style={{ color: p.color }}
                  >
                    {p.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {assets.map((asset) => {
                const row = prefs[asset.symbol];
                return (
                  <tr key={asset.symbol} className="border-b border-terminal-border/20 last:border-0">
                    <td className="py-2.5 pr-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono-nums font-bold text-[12px] text-slate-200">
                          {asset.symbol}
                        </span>
                        <span className="text-[9px] uppercase tracking-[0.12em] text-terminal-muted">
                          {asset.category}
                        </span>
                      </div>
                    </td>
                    {PHASES.map((phase) => {
                      const on = !!(row && row[phase.key]);
                      return (
                        <td key={phase.key} className="text-center py-2 px-2">
                          <button
                            type="button"
                            role="switch"
                            aria-checked={on}
                            aria-label={`${asset.symbol} ${phase.label} alert`}
                            onClick={() => togglePhase(asset.symbol, phase.key)}
                            className="group relative inline-flex h-6 w-11 rounded-full border transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-neon-cyan"
                            style={{
                              background: on ? `${phase.color}25` : '#1a1a1a',
                              borderColor: on ? `${phase.color}80` : '#262626',
                              boxShadow: on ? `0 0 10px ${phase.color}25` : 'none',
                            }}
                          >
                            <span
                              className="inline-block h-4 w-4 rounded-full bg-white transition-all"
                              style={{
                                transform: on ? 'translate(22px, 2px)' : 'translate(2px, 2px)',
                                background: on ? phase.color : '#525252',
                                boxShadow: on ? `0 0 6px ${phase.color}` : 'none',
                              }}
                            />
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-[10px] text-terminal-muted leading-relaxed max-w-md">
              {PHASES.map((p) => (
                <span key={p.key} className="mr-2">
                  <span style={{ color: p.color }}>●</span> {p.label} — {p.blurb}
                </span>
              ))}
            </p>

            <div className="flex items-center gap-2">
              {message && (
                <span
                  className={`inline-flex items-center gap-1 text-[10px] font-semibold ${
                    message.type === 'success' ? 'text-neon-green' : 'text-neon-red'
                  }`}
                >
                  {message.type === 'success' && <CheckCircle2 size={11} />}
                  {message.text}
                </span>
              )}
              <Button
                variant="primary"
                disabled={!dirty || saving}
                onClick={handleSave}
              >
                {saving ? 'Saving…' : 'Save Alert Prefs'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
