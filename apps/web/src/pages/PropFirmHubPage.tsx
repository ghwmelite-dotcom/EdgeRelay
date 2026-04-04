import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Target,
  FlaskConical,
  ArrowRight,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Zap,
  TrendingUp,
  Building2,
  BarChart3,
  Sparkles,
  Radio,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { useAccountsStore } from '@/stores/accounts';
import { usePropGuardStore } from '@/stores/propguard';
import { useJournalStore } from '@/stores/journal';
import { FundedBlueprintWidget } from '@/components/propguard/FundedBlueprintWidget';
import type { Account } from '@/stores/accounts';

/* ────────────────────────────────────────────────────────────── */
/*  Firm preset display data                                     */
/* ────────────────────────────────────────────────────────────── */

interface FirmPreset {
  key: string;
  firm: string;
  phase: string;
  target: number;
  dailyLoss: number;
  maxDD: number;
  ddType: string;
  color: string;
  extras?: string[];
}

const FIRM_PRESETS: FirmPreset[] = [
  { key: 'FTMO_Evaluation', firm: 'FTMO', phase: 'Evaluation', target: 10, dailyLoss: 5, maxDD: 10, ddType: 'Static', color: '#0094ff', extras: ['Min 4 days'] },
  { key: 'FTMO_Verification', firm: 'FTMO', phase: 'Verification', target: 5, dailyLoss: 5, maxDD: 10, ddType: 'Static', color: '#0094ff', extras: ['Min 4 days'] },
  { key: 'FundedNext_Evaluation', firm: 'FundedNext', phase: 'Evaluation', target: 10, dailyLoss: 5, maxDD: 10, ddType: 'Static', color: '#6c5ce7', extras: ['Consistency', 'News block'] },
  { key: 'The5ers_HighStakes', firm: 'The5ers', phase: 'High Stakes', target: 8, dailyLoss: 5, maxDD: 6, ddType: 'Trailing', color: '#00b894', extras: ['Lock at BE'] },
  { key: 'Apex_Evaluation', firm: 'Apex', phase: 'Evaluation', target: 6, dailyLoss: 2.5, maxDD: 6, ddType: 'EOD Trailing', color: '#e17055', extras: ['No weekends'] },
  { key: 'TopStep_Combine', firm: 'TopStep', phase: 'Combine', target: 6, dailyLoss: 2, maxDD: 4.5, ddType: 'EOD Trailing', color: '#fdcb6e' },
  { key: 'MyFundedFutures', firm: 'MyFundedFutures', phase: 'Challenge', target: 9, dailyLoss: 4, maxDD: 6, ddType: 'EOD Trailing', color: '#a29bfe', extras: ['Consistency'] },
];

/* ────────────────────────────────────────────────────────────── */
/*  Component                                                    */
/* ────────────────────────────────────────────────────────────── */

export function PropFirmHubPage() {
  const navigate = useNavigate();
  const { accounts, fetchAccounts, isLoading: accountsLoading } = useAccountsStore();
  const { rules, applyPreset, fetchRules, loading: pgLoading } = usePropGuardStore();
  const { trades: journalTrades, fetchTrades: fetchJournalTrades } = useJournalStore();

  // Local state
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [initialBalance, setInitialBalance] = useState('100000');
  const [setupStep, setSetupStep] = useState<'idle' | 'select-account' | 'confirm' | 'done'>('idle');
  const [applyError, setApplyError] = useState<string | null>(null);

  const followers = accounts.filter((a) => a.role === 'follower');
  const protectedAccounts = followers.filter((a) => rules[a.id]);
  const unprotectedAccounts = followers.filter((a) => !rules[a.id]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  // Load journal trades for Funded Blueprint widget
  useEffect(() => {
    if (followers.length > 0 && journalTrades.length === 0) {
      fetchJournalTrades(followers[0].id);
    }
  }, [accounts]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch PropGuard rules for all followers
  useEffect(() => {
    followers.forEach((f) => {
      if (!rules[f.id]) fetchRules(f.id);
    });
  }, [accounts]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleApplyPreset = async () => {
    if (!selectedAccountId || !selectedPreset) return;
    setApplyError(null);
    await applyPreset(selectedAccountId, selectedPreset, parseFloat(initialBalance) || 100000);
    // Check if the preset was actually saved by verifying rules state
    const { rules: updatedRules, error: pgError } = usePropGuardStore.getState();
    if (updatedRules[selectedAccountId]) {
      setSetupStep('done');
    } else {
      setApplyError(pgError || 'Failed to apply preset. Please try again.');
    }
  };

  const selectedFirm = FIRM_PRESETS.find((p) => p.key === selectedPreset);

  return (
    <div className="page-enter space-y-8 pb-12">

      {/* ══════════ HERO BANNER ══════════ */}
      <section
        className="relative overflow-hidden rounded-2xl border border-neon-green/15 p-8 md:p-10"
        style={{
          background: 'linear-gradient(135deg, rgba(0,255,157,0.04) 0%, rgba(0,229,255,0.02) 50%, rgba(177,140,255,0.02) 100%)',
        }}
      >
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-neon-green/5 blur-3xl" />

        <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <ShieldCheck className="h-6 w-6 text-neon-green" />
              <h1 className="font-display text-2xl font-bold text-white">Prop Firm Hub</h1>
            </div>
            <p className="max-w-lg text-sm leading-relaxed text-slate-400">
              Your command center for prop firm challenges. Choose your firm, protect your account with PropGuard,
              generate an optimized strategy, and monitor your progress — all in one place.
            </p>
          </div>

          {/* Quick stats */}
          <div className="flex gap-6">
            <div className="text-center">
              <p className="font-mono-nums text-2xl font-bold text-neon-green">{protectedAccounts.length}</p>
              <p className="font-mono-nums text-[10px] uppercase tracking-wider text-terminal-muted">Protected</p>
            </div>
            <div className="h-12 w-px bg-terminal-border/30" />
            <div className="text-center">
              <p className="font-mono-nums text-2xl font-bold text-neon-amber">{unprotectedAccounts.length}</p>
              <p className="font-mono-nums text-[10px] uppercase tracking-wider text-terminal-muted">Unprotected</p>
            </div>
            <div className="h-12 w-px bg-terminal-border/30" />
            <div className="text-center">
              <p className="font-mono-nums text-2xl font-bold text-neon-cyan">{FIRM_PRESETS.length}</p>
              <p className="font-mono-nums text-[10px] uppercase tracking-wider text-terminal-muted">Firm Presets</p>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════ GUIDED JOURNEY — 3 LANES ══════════ */}
      <div className="grid gap-6 lg:grid-cols-3">

        {/* ── Lane 1: Choose Firm & Apply ──────────────── */}
        <section className="lg:col-span-2 space-y-6">

          {/* Step 1: Select Firm Preset */}
          <div className="rounded-2xl border border-terminal-border/40 bg-terminal-card/20 overflow-hidden">
            <div className="flex items-center gap-3 border-b border-terminal-border/30 px-6 py-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-neon-cyan/20 bg-neon-cyan/10">
                <Target className="h-4 w-4 text-neon-cyan" />
              </div>
              <div>
                <h2 className="font-display text-base font-semibold text-white">Step 1 — Choose Your Prop Firm</h2>
                <p className="text-[11px] text-terminal-muted">Select the firm and phase to load exact challenge rules</p>
              </div>
            </div>

            <div className="grid gap-3 p-5 sm:grid-cols-2">
              {FIRM_PRESETS.map((preset) => {
                const isSelected = selectedPreset === preset.key;
                return (
                  <button
                    key={preset.key}
                    onClick={() => {
                      setSelectedPreset(preset.key);
                      if (setupStep === 'done') setSetupStep('idle');
                    }}
                    className={`group flex items-start gap-3 rounded-xl border p-4 text-left transition-all duration-200 cursor-pointer ${
                      isSelected
                        ? 'border-opacity-40 bg-opacity-10 shadow-[0_0_20px_var(--glow)]'
                        : 'border-terminal-border/30 bg-terminal-card/30 hover:border-terminal-border-hover'
                    }`}
                    style={
                      isSelected
                        ? { borderColor: `${preset.color}40`, backgroundColor: `${preset.color}08`, '--glow': `${preset.color}15` } as React.CSSProperties
                        : undefined
                    }
                  >
                    {/* Logo */}
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg font-mono-nums text-[11px] font-bold transition-shadow"
                      style={{ backgroundColor: `${preset.color}12`, color: preset.color, border: `1px solid ${preset.color}20` }}
                    >
                      {preset.firm.slice(0, 2).toUpperCase()}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-display text-sm font-semibold text-white">{preset.firm}</p>
                      <p className="font-mono-nums text-[10px] text-terminal-muted">{preset.phase}</p>

                      {/* Stats row */}
                      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 font-mono-nums text-[10px]">
                        <span className="text-neon-green">Target {preset.target}%</span>
                        <span className="text-neon-red">Daily -{preset.dailyLoss}%</span>
                        <span className="text-neon-amber">DD {preset.maxDD}%</span>
                      </div>

                      {/* DD type + extras */}
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        <span className="rounded-full bg-terminal-border/30 px-2 py-0.5 font-mono-nums text-[9px] text-slate-400">
                          {preset.ddType}
                        </span>
                        {preset.extras?.map((e) => (
                          <span key={e} className="rounded-full bg-neon-purple/10 px-2 py-0.5 font-mono-nums text-[9px] text-neon-purple">
                            {e}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Check */}
                    {isSelected && <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" style={{ color: preset.color }} />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Apply to Account */}
          {selectedPreset && (
            <div className="animate-fade-in-up rounded-2xl border border-terminal-border/40 bg-terminal-card/20 overflow-hidden">
              <div className="flex items-center gap-3 border-b border-terminal-border/30 px-6 py-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-neon-green/20 bg-neon-green/10">
                  <ShieldCheck className="h-4 w-4 text-neon-green" />
                </div>
                <div>
                  <h2 className="font-display text-base font-semibold text-white">Step 2 — Protect Your Account</h2>
                  <p className="text-[11px] text-terminal-muted">
                    Apply <span style={{ color: selectedFirm?.color }}>{selectedFirm?.firm} {selectedFirm?.phase}</span> rules to a follower account
                  </p>
                </div>
              </div>

              <div className="p-5 space-y-4">
                {/* No followers state */}
                {followers.length === 0 && !accountsLoading && (
                  <div className="rounded-xl border border-terminal-border/30 bg-terminal-card/30 p-6 text-center">
                    <AlertTriangle className="mx-auto h-8 w-8 text-neon-amber/50" />
                    <p className="mt-3 text-sm text-slate-400">You don't have any follower accounts yet.</p>
                    <p className="mt-1 text-[12px] text-terminal-muted">Create a copier setup first, then come back to apply PropGuard.</p>
                    <Link
                      to="/accounts"
                      className="mt-4 inline-flex items-center gap-2 rounded-lg bg-neon-cyan px-5 py-2.5 text-sm font-semibold text-terminal-bg"
                    >
                      Set Up Copier <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                )}

                {/* Account selector */}
                {followers.length > 0 && setupStep !== 'done' && (
                  <>
                    <div>
                      <label className="mb-2 block font-mono-nums text-[10px] uppercase tracking-wider text-terminal-muted">
                        Select Follower Account
                      </label>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {followers.map((acct) => {
                          const isProtected = !!rules[acct.id];
                          const isSelected = selectedAccountId === acct.id;
                          return (
                            <button
                              key={acct.id}
                              onClick={() => { setSelectedAccountId(acct.id); setSetupStep('select-account'); }}
                              className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-all cursor-pointer ${
                                isSelected
                                  ? 'border-neon-cyan/40 bg-neon-cyan/5'
                                  : 'border-terminal-border/30 bg-terminal-card/30 hover:border-terminal-border-hover'
                              }`}
                            >
                              <div className={`flex h-8 w-8 items-center justify-center rounded-lg border ${
                                isProtected ? 'border-neon-green/30 bg-neon-green/10' : 'border-terminal-border/30 bg-terminal-card/50'
                              }`}>
                                {isProtected ? (
                                  <ShieldCheck className="h-4 w-4 text-neon-green" />
                                ) : (
                                  <AlertTriangle className="h-4 w-4 text-neon-amber/50" />
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-white truncate">{acct.alias}</p>
                                <p className="font-mono-nums text-[10px] text-terminal-muted">
                                  {acct.broker_name || 'No broker'} · {acct.mt5_login || 'No login'}
                                  {isProtected && <span className="ml-1 text-neon-green">· Protected</span>}
                                </p>
                              </div>
                              {isSelected && <CheckCircle2 className="h-4 w-4 text-neon-cyan shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Balance input + confirm */}
                    {selectedAccountId && setupStep === 'select-account' && (
                      <div className="animate-fade-in-up space-y-4 rounded-xl border border-terminal-border/20 bg-terminal-card/20 p-4">
                        <div>
                          <label className="mb-1.5 block font-mono-nums text-[10px] uppercase tracking-wider text-terminal-muted">
                            Challenge Starting Balance ($)
                          </label>
                          <input
                            type="number"
                            value={initialBalance}
                            onChange={(e) => setInitialBalance(e.target.value)}
                            className="w-full rounded-lg border border-terminal-border bg-terminal-bg px-4 py-2.5 font-mono-nums text-white focus:border-neon-cyan/40 focus:outline-none focus:ring-1 focus:ring-neon-cyan/20"
                            placeholder="100000"
                          />
                        </div>

                        {/* Summary */}
                        {selectedFirm && (
                          <div className="rounded-lg border border-terminal-border/20 bg-terminal-bg/50 p-3 space-y-1.5">
                            <p className="font-mono-nums text-[10px] uppercase tracking-wider text-terminal-muted">Protection Summary</p>
                            <div className="grid grid-cols-2 gap-2 font-mono-nums text-[12px]">
                              <span className="text-slate-400">Firm:</span>
                              <span className="text-white font-semibold">{selectedFirm.firm} — {selectedFirm.phase}</span>
                              <span className="text-slate-400">Daily Loss Limit:</span>
                              <span className="text-neon-red">${((parseFloat(initialBalance) || 0) * selectedFirm.dailyLoss / 100).toLocaleString()}</span>
                              <span className="text-slate-400">Max Drawdown:</span>
                              <span className="text-neon-amber">${((parseFloat(initialBalance) || 0) * selectedFirm.maxDD / 100).toLocaleString()}</span>
                              <span className="text-slate-400">Equity Floor:</span>
                              <span className="text-neon-green">${((parseFloat(initialBalance) || 0) * (1 - selectedFirm.maxDD / 100)).toLocaleString()}</span>
                            </div>
                          </div>
                        )}

                        {applyError && (
                          <p className="text-sm text-neon-red">{applyError}</p>
                        )}

                        <button
                          onClick={handleApplyPreset}
                          disabled={pgLoading}
                          className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-neon-green px-6 py-3 text-sm font-semibold text-terminal-bg shadow-[0_0_16px_rgba(0,255,157,0.2)] transition-all hover:shadow-[0_0_24px_rgba(0,255,157,0.35)] disabled:opacity-50 cursor-pointer"
                        >
                          {pgLoading ? (
                            <><Loader2 className="h-4 w-4 animate-spin" /> Applying...</>
                          ) : (
                            <><ShieldCheck className="h-4 w-4" /> Activate PropGuard</>
                          )}
                        </button>
                      </div>
                    )}
                  </>
                )}

                {/* Success state */}
                {setupStep === 'done' && (
                  <div className="animate-fade-in-up rounded-xl border border-neon-green/20 bg-neon-green/[0.04] p-6 text-center">
                    <CheckCircle2 className="mx-auto h-10 w-10 text-neon-green" />
                    <p className="mt-3 font-display text-lg font-bold text-white">PropGuard Activated!</p>
                    <p className="mt-1 text-sm text-slate-400">
                      {selectedFirm?.firm} {selectedFirm?.phase} rules are now enforcing on your account.
                    </p>
                    <div className="mt-5 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                      <Link
                        to="/app/strategy-hub"
                        className="inline-flex items-center gap-2 rounded-lg bg-neon-cyan px-5 py-2.5 text-sm font-semibold text-terminal-bg"
                      >
                        <FlaskConical className="h-4 w-4" /> Generate Strategy EA
                      </Link>
                      <button
                        onClick={() => { setSetupStep('idle'); setSelectedAccountId(null); }}
                        className="inline-flex items-center gap-2 rounded-lg border border-terminal-border bg-terminal-card/60 px-5 py-2.5 text-sm font-semibold text-slate-300 cursor-pointer"
                      >
                        Protect Another Account
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Next Steps */}
          {selectedPreset && (
            <div className="animate-fade-in-up rounded-2xl border border-terminal-border/40 bg-terminal-card/20 overflow-hidden">
              <div className="flex items-center gap-3 border-b border-terminal-border/30 px-6 py-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-neon-purple/20 bg-neon-purple/10">
                  <Sparkles className="h-4 w-4 text-neon-purple" />
                </div>
                <div>
                  <h2 className="font-display text-base font-semibold text-white">Step 3 — Optimize & Trade</h2>
                  <p className="text-[11px] text-terminal-muted">Generate a strategy, copy signals, and monitor performance</p>
                </div>
              </div>

              <div className="grid gap-3 p-5 sm:grid-cols-3">
                <Link
                  to="/app/strategy-hub"
                  className="group flex items-start gap-3 rounded-xl border border-terminal-border/30 bg-terminal-card/30 p-4 transition-all hover:border-neon-cyan/30 hover:bg-neon-cyan/[0.03]"
                >
                  <FlaskConical className="h-5 w-5 shrink-0 text-neon-cyan" />
                  <div>
                    <p className="text-sm font-semibold text-white group-hover:text-neon-cyan transition-colors">Strategy Hub</p>
                    <p className="mt-0.5 text-[11px] text-terminal-muted">Generate an EA with prop firm presets</p>
                  </div>
                </Link>
                <Link
                  to="/accounts"
                  className="group flex items-start gap-3 rounded-xl border border-terminal-border/30 bg-terminal-card/30 p-4 transition-all hover:border-neon-green/30 hover:bg-neon-green/[0.03]"
                >
                  <Radio className="h-5 w-5 shrink-0 text-neon-green" />
                  <div>
                    <p className="text-sm font-semibold text-white group-hover:text-neon-green transition-colors">Signal Copier</p>
                    <p className="mt-0.5 text-[11px] text-terminal-muted">Copy trades to funded accounts</p>
                  </div>
                </Link>
                <Link
                  to="/analytics"
                  className="group flex items-start gap-3 rounded-xl border border-terminal-border/30 bg-terminal-card/30 p-4 transition-all hover:border-neon-amber/30 hover:bg-neon-amber/[0.03]"
                >
                  <BarChart3 className="h-5 w-5 shrink-0 text-neon-amber" />
                  <div>
                    <p className="text-sm font-semibold text-white group-hover:text-neon-amber transition-colors">Analytics</p>
                    <p className="mt-0.5 text-[11px] text-terminal-muted">Edge validation & Monte Carlo</p>
                  </div>
                </Link>
              </div>
            </div>
          )}
        </section>

        {/* ── Lane 2: Active Protections Sidebar ──────── */}
        <aside className="space-y-6">

          {/* Active protections */}
          <div className="rounded-2xl border border-terminal-border/40 bg-terminal-card/20 overflow-hidden">
            <div className="flex items-center justify-between border-b border-terminal-border/30 px-5 py-3">
              <h3 className="font-display text-sm font-semibold text-white">Active Protections</h3>
              <span className="font-mono-nums text-[10px] text-terminal-muted">{protectedAccounts.length} account{protectedAccounts.length !== 1 ? 's' : ''}</span>
            </div>

            {protectedAccounts.length === 0 && (
              <div className="p-5 text-center">
                <ShieldCheck className="mx-auto h-8 w-8 text-terminal-muted/20" />
                <p className="mt-2 text-[12px] text-terminal-muted">No accounts protected yet</p>
                <p className="mt-1 text-[11px] text-terminal-muted/60">Select a firm above to get started</p>
              </div>
            )}

            <div className="divide-y divide-terminal-border/15">
              {protectedAccounts.map((acct) => {
                const acctRules = rules[acct.id];
                const presetInfo = acctRules ? FIRM_PRESETS.find((p) => p.key === acctRules.preset_name) : null;
                return (
                  <div key={acct.id} className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-neon-green" />
                      <span className="text-sm font-semibold text-white truncate">{acct.alias}</span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-x-3 font-mono-nums text-[10px]">
                      <span className="text-slate-400">{presetInfo?.firm || acctRules?.preset_name || 'Custom'}</span>
                      {acctRules?.profit_target_percent && (
                        <span className="text-neon-green">Target {acctRules.profit_target_percent}%</span>
                      )}
                      {acctRules?.max_daily_loss_percent && (
                        <span className="text-neon-red">Daily -{acctRules.max_daily_loss_percent}%</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Unprotected accounts warning */}
          {unprotectedAccounts.length > 0 && (
            <div className="rounded-2xl border border-neon-amber/20 bg-neon-amber/[0.03] p-5">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="h-4 w-4 text-neon-amber" />
                <h3 className="text-sm font-semibold text-neon-amber">Unprotected Accounts</h3>
              </div>
              <div className="space-y-2">
                {unprotectedAccounts.map((acct) => (
                  <div key={acct.id} className="flex items-center justify-between rounded-lg border border-terminal-border/20 bg-terminal-card/30 px-3 py-2">
                    <span className="text-[12px] text-slate-300 truncate">{acct.alias}</span>
                    <button
                      onClick={() => {
                        setSelectedAccountId(acct.id);
                        setSetupStep('select-account');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="text-[11px] font-semibold text-neon-amber hover:text-neon-amber/80 cursor-pointer"
                    >
                      Protect
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Funded Trader Blueprint */}
          <FundedBlueprintWidget />

          {/* Quick links */}
          <div className="rounded-2xl border border-terminal-border/40 bg-terminal-card/20 overflow-hidden">
            <div className="border-b border-terminal-border/30 px-5 py-3">
              <h3 className="font-display text-sm font-semibold text-white">Quick Links</h3>
            </div>
            <div className="p-3 space-y-1">
              {[
                { label: 'Firm Directory', to: '/app/firms', icon: Building2 },
                { label: 'Risk Monitor', to: '/risk', icon: BarChart3 },
                { label: 'Strategy Hub', to: '/app/strategy-hub', icon: FlaskConical },
                { label: 'Discipline Score', to: '/discipline', icon: TrendingUp },
                { label: 'Challenge Guide', href: '/blog/pass-prop-firm-challenge-guide', icon: ExternalLink },
              ].map((link) => (
                <Link
                  key={link.label}
                  to={link.to || link.href || '#'}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-[12px] text-terminal-muted transition-all hover:bg-terminal-card/50 hover:text-neon-cyan"
                >
                  <link.icon className="h-3.5 w-3.5" />
                  {link.label}
                  <ChevronRight className="ml-auto h-3 w-3 opacity-30" />
                </Link>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
