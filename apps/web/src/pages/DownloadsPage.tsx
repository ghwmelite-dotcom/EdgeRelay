import { useState, useEffect } from 'react';
import { Upload, Download, BookOpen, ChevronDown, ChevronRight, AlertTriangle, CheckCircle, Package, FileCode2, KeyRound, RefreshCw, Check, Copy } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { API_BASE } from '@/lib/constants';
import { api } from '@/lib/api';
import { useAccountsStore, type Account } from '@/stores/accounts';
import { useAuthStore } from '@/stores/auth';

/** Server-side ZIP filenames, keyed by EA card type. */
const SOURCE_ZIP_NAMES: Record<'master' | 'follower' | 'journal', string> = {
  master: 'EdgeRelay_Master_Source.zip',
  follower: 'EdgeRelay_Follower_Source.zip',
  journal: 'TradeJournal_Sync_Source.zip',
};

/** Shared "where to find your credentials" callout, reused across the config steps. */
const credentialsHint = (
  <div className="flex items-start gap-2 rounded-xl border border-neon-cyan/20 bg-neon-cyan/5 px-3 py-2.5">
    <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-neon-cyan" />
    <div className="space-y-1.5 text-xs text-slate-300">
      <p className="font-semibold text-neon-cyan">Where to find these</p>
      <p>
        Open the{' '}
        <a href="/accounts" className="text-neon-cyan hover:underline font-medium">Copier</a>{' '}
        page. On each account card, your <strong>Account ID</strong> and <strong>API Key</strong> are shown with a one-tap <strong>Copy</strong> button.
      </p>
      <p>
        Your <strong>API Secret</strong> is revealed <strong>only once</strong> &mdash; on the credentials screen shown immediately after you create the account. If you did not save it, click <strong>Regenerate keys</strong> on the account card to issue a fresh API Key + Secret (again shown once).
      </p>
    </div>
  </div>
);

/* ------------------------------------------------------------------ */
/*  Setup Guide Data                                                   */
/* ------------------------------------------------------------------ */

interface SetupStep {
  title: string;
  content: React.ReactNode;
}

const setupSteps: SetupStep[] = [
  {
    title: 'Step 1: Prerequisites',
    content: (
      <ul className="space-y-2 text-sm text-slate-300">
        <li className="flex items-start gap-2">
          <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-neon-green" />
          MT5 terminal installed and logged into your broker account
        </li>
        <li className="flex items-start gap-2">
          <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-neon-green" />
          TradeMetrics Pro account created with at least one master or follower account
        </li>
        <li className="flex items-start gap-2">
          <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-neon-green" />
          API Key, API Secret and Account ID from the Copier page (see Step 4)
        </li>
      </ul>
    ),
  },
  {
    title: 'Step 2: Allow WebRequest',
    content: (
      <div className="space-y-3">
        <p className="text-sm text-slate-300">Enable WebRequest in your MT5 terminal:</p>
        <ol className="space-y-2 text-sm text-slate-300 list-decimal list-inside">
          <li>
            Go to <span className="font-mono-nums text-neon-cyan">Tools &rarr; Options &rarr; Expert Advisors</span>
          </li>
          <li>
            Check <span className="font-mono-nums text-neon-cyan">"Allow WebRequest for listed URL"</span>
          </li>
          <li>Add the following URL:</li>
        </ol>
        <div className="font-mono-nums bg-terminal-bg/80 rounded-lg px-3 py-2 border border-terminal-border/50 space-y-1">
          <code className="block text-sm text-neon-green">https://edgerelay-signal-ingestion.ghwmelite.workers.dev</code>
          <code className="block text-sm text-neon-green">https://edgerelay-api.ghwmelite.workers.dev</code>
          <code className="block text-sm text-neon-green">https://edgerelay-journal-sync.ghwmelite.workers.dev</code>
        </div>
        <p className="text-sm text-slate-400">Click OK to save the settings.</p>
      </div>
    ),
  },
  {
    title: 'Step 3: Install EA Files',
    content: (
      <div className="space-y-3">
        <p className="text-sm text-slate-300">
          In MT5, go to <span className="font-mono-nums text-neon-cyan">File &rarr; Open Data Folder</span> to find your MQL5 folder. Copy the files as follows:
        </p>

        <div className="space-y-2">
          <p className="text-xs font-semibold text-terminal-muted uppercase tracking-wider">Expert Advisors &rarr; MQL5\Experts\</p>
          <div className="font-mono-nums bg-terminal-bg/80 rounded-lg px-4 py-2 border border-terminal-border/50 space-y-1">
            <code className="block text-sm text-neon-green">EdgeRelay_Master.mq5</code>
            <code className="block text-sm text-neon-green">EdgeRelay_Follower.mq5</code>
            <code className="block text-sm text-neon-green">TradeJournal_Sync.mq5</code>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold text-terminal-muted uppercase tracking-wider">Include Files &rarr; MQL5\Include\</p>
          <div className="font-mono-nums bg-terminal-bg/80 rounded-lg px-4 py-2 border border-terminal-border/50 space-y-1">
            <code className="block text-sm text-neon-cyan">EdgeRelay_Common.mqh</code>
            <code className="block text-sm text-neon-cyan">EdgeRelay_Crypto.mqh</code>
            <code className="block text-sm text-neon-cyan">EdgeRelay_Display.mqh</code>
            <code className="block text-sm text-neon-cyan">EdgeRelay_Equity.mqh</code>
            <code className="block text-sm text-neon-cyan">EdgeRelay_Http.mqh</code>
            <code className="block text-sm text-neon-cyan">EdgeRelay_JournalQueue.mqh</code>
            <code className="block text-sm text-neon-cyan">EdgeRelay_JournalSync.mqh</code>
            <code className="block text-sm text-neon-cyan">EdgeRelay_JsonParser.mqh</code>
            <code className="block text-sm text-neon-cyan">EdgeRelay_PropGuard.mqh</code>
            <code className="block text-sm text-neon-cyan">EdgeRelay_PropGuardDisplay.mqh</code>
            <code className="block text-sm text-neon-cyan">EdgeRelay_Queue.mqh</code>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold text-terminal-muted uppercase tracking-wider">Setup Script &rarr; MQL5\Scripts\</p>
          <div className="font-mono-nums bg-terminal-bg/80 rounded-lg px-4 py-2 border border-terminal-border/50">
            <code className="block text-sm text-neon-amber">EdgeRelay_Setup.mq5</code>
          </div>
        </div>

        <div className="flex items-start gap-2 rounded-xl border border-neon-amber/20 bg-neon-amber/5 px-3 py-2 mt-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-neon-amber" />
          <p className="text-xs text-neon-amber">
            The Include files are <strong>required</strong>. Without them in MQL5\Include\, the EAs will not compile.
          </p>
        </div>

        <ol className="space-y-2 text-sm text-slate-300 list-decimal list-inside mt-2">
          <li>After copying all files, restart MT5 or right-click in Navigator &rarr; Refresh</li>
          <li>Right-click each EA in Navigator &rarr; Compile (or press F7 in MetaEditor)</li>
          <li>Drag the EA onto a chart to attach it</li>
        </ol>
      </div>
    ),
  },
  {
    title: 'Step 4: Configure Master EA',
    content: (
      <div className="space-y-3">
        <p className="text-sm text-slate-300">Set the following input parameters when attaching the EA:</p>
        <div className="glass rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-terminal-surface/80">
                <th className="px-4 py-2.5 text-left text-[10px] font-medium uppercase tracking-[0.15em] text-terminal-muted">Parameter</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-medium uppercase tracking-[0.15em] text-terminal-muted">Description</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-medium uppercase tracking-[0.15em] text-terminal-muted">Example</th>
              </tr>
            </thead>
            <tbody>
              <tr className="data-row border-b border-terminal-border/50">
                <td className="px-4 py-2.5 font-mono-nums text-neon-cyan">API_Key</td>
                <td className="px-4 py-2.5 text-slate-300">From the Copier page (Copy button)</td>
                <td className="px-4 py-2.5 font-mono-nums text-slate-400">er_abc123...</td>
              </tr>
              <tr className="data-row border-b border-terminal-border/50">
                <td className="px-4 py-2.5 font-mono-nums text-neon-cyan">API_Secret</td>
                <td className="px-4 py-2.5 text-slate-300">Your API secret</td>
                <td className="px-4 py-2.5 font-mono-nums text-slate-400">(shown once at creation)</td>
              </tr>
              <tr className="data-row border-b border-terminal-border/50">
                <td className="px-4 py-2.5 font-mono-nums text-neon-cyan">API_Endpoint</td>
                <td className="px-4 py-2.5 text-slate-300">TradeMetrics Pro server</td>
                <td className="px-4 py-2.5 font-mono-nums text-slate-400">https://signal.edgerelay.io</td>
              </tr>
              <tr className="data-row">
                <td className="px-4 py-2.5 font-mono-nums text-neon-cyan">AccountID</td>
                <td className="px-4 py-2.5 text-slate-300">Your master account ID</td>
                <td className="px-4 py-2.5 font-mono-nums text-slate-400">(Copier page)</td>
              </tr>
            </tbody>
          </table>
        </div>
        {credentialsHint}
      </div>
    ),
  },
  {
    title: 'Step 5: Install & Configure Follower EA',
    content: (
      <div className="space-y-3">
        <p className="text-sm text-slate-300">
          Follow the same installation process as the Master EA, but use the Follower EA file instead.
        </p>
        <p className="text-sm text-slate-300">Additional input parameters for the Follower EA:</p>
        <div className="glass rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-terminal-surface/80">
                <th className="px-4 py-2.5 text-left text-[10px] font-medium uppercase tracking-[0.15em] text-terminal-muted">Parameter</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-medium uppercase tracking-[0.15em] text-terminal-muted">Description</th>
              </tr>
            </thead>
            <tbody>
              <tr className="data-row border-b border-terminal-border/50">
                <td className="px-4 py-2.5 font-mono-nums text-neon-cyan">MasterAccountID</td>
                <td className="px-4 py-2.5 text-slate-300">The master account this follower is linked to</td>
              </tr>
              <tr className="data-row border-b border-terminal-border/50">
                <td className="px-4 py-2.5 font-mono-nums text-neon-cyan">LotMode</td>
                <td className="px-4 py-2.5 text-slate-300">How to calculate lot size (mirror, fixed, multiplier, risk_percent)</td>
              </tr>
              <tr className="data-row border-b border-terminal-border/50">
                <td className="px-4 py-2.5 font-mono-nums text-neon-cyan">MaxDailyLossPercent</td>
                <td className="px-4 py-2.5 text-slate-300">Maximum daily loss before stopping (e.g. 5.0)</td>
              </tr>
              <tr className="data-row">
                <td className="px-4 py-2.5 font-mono-nums text-neon-cyan">SymbolSuffix</td>
                <td className="px-4 py-2.5 text-slate-300">Broker-specific suffix (e.g. ".m" or "_raw")</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    ),
  },
  {
    title: 'Step 6: Install & Configure TradeJournal Sync EA',
    content: (
      <div className="space-y-3">
        <div className="flex items-start gap-2 rounded-xl border border-neon-purple/20 bg-neon-purple/5 px-3 py-2">
          <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-neon-purple" />
          <p className="text-xs text-slate-300">
            The TradeJournal Sync EA is <strong>independent of copy trading</strong> &mdash; attach it to <strong>any</strong> MT5 account (run it standalone; no master or follower needed). It captures every trade on that account &mdash; in real time, plus a one-time history catch-up &mdash; and streams them to your dashboard Journal.
          </p>
        </div>

        <p className="text-sm text-slate-300">
          Install it exactly like the other EAs (<span className="font-mono-nums text-neon-cyan">TradeJournal_Sync.mq5</span> plus the same Include files from Step 3), then compile and drag it onto <strong>one chart per account</strong>. A single instance captures the whole account &mdash; you do not need it on every symbol.
        </p>

        <p className="text-sm text-slate-300">Set the following input parameters when attaching the EA:</p>
        <div className="glass rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-terminal-surface/80">
                <th className="px-4 py-2.5 text-left text-[10px] font-medium uppercase tracking-[0.15em] text-terminal-muted">Parameter</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-medium uppercase tracking-[0.15em] text-terminal-muted">Description</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-medium uppercase tracking-[0.15em] text-terminal-muted">Example / Default</th>
              </tr>
            </thead>
            <tbody>
              <tr className="data-row border-b border-terminal-border/50">
                <td className="px-4 py-2.5 font-mono-nums text-neon-cyan">API_Key</td>
                <td className="px-4 py-2.5 text-slate-300">API key from the Accounts page <span className="text-neon-amber">(required)</span></td>
                <td className="px-4 py-2.5 font-mono-nums text-slate-400">er_abc123...</td>
              </tr>
              <tr className="data-row border-b border-terminal-border/50">
                <td className="px-4 py-2.5 font-mono-nums text-neon-cyan">API_Secret</td>
                <td className="px-4 py-2.5 text-slate-300">API secret <span className="text-neon-amber">(required)</span></td>
                <td className="px-4 py-2.5 font-mono-nums text-slate-400">(shown once at creation)</td>
              </tr>
              <tr className="data-row border-b border-terminal-border/50">
                <td className="px-4 py-2.5 font-mono-nums text-neon-cyan">API_Endpoint</td>
                <td className="px-4 py-2.5 text-slate-300">Journal sync server</td>
                <td className="px-4 py-2.5 font-mono-nums text-slate-400 break-all">https://edgerelay-journal-sync.ghwmelite.workers.dev</td>
              </tr>
              <tr className="data-row border-b border-terminal-border/50">
                <td className="px-4 py-2.5 font-mono-nums text-neon-cyan">AccountID</td>
                <td className="px-4 py-2.5 text-slate-300">The account to journal <span className="text-neon-amber">(required)</span></td>
                <td className="px-4 py-2.5 font-mono-nums text-slate-400">(from dashboard)</td>
              </tr>
              <tr className="data-row border-b border-terminal-border/50">
                <td className="px-4 py-2.5 font-mono-nums text-neon-cyan">SyncIntervalSeconds</td>
                <td className="px-4 py-2.5 text-slate-300">History catch-up scan interval (seconds)</td>
                <td className="px-4 py-2.5 font-mono-nums text-slate-400">60</td>
              </tr>
              <tr className="data-row">
                <td className="px-4 py-2.5 font-mono-nums text-neon-cyan">HeartbeatIntervalMs</td>
                <td className="px-4 py-2.5 text-slate-300">Connection heartbeat interval (ms)</td>
                <td className="px-4 py-2.5 font-mono-nums text-slate-400">30000</td>
              </tr>
            </tbody>
          </table>
        </div>

        {credentialsHint}

        <div className="flex items-start gap-2 rounded-xl border border-neon-amber/20 bg-neon-amber/5 px-3 py-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-neon-amber" />
          <p className="text-xs text-neon-amber">
            <strong>API_Key</strong>, <strong>API_Secret</strong>, and <strong>AccountID</strong> are required &mdash; the EA refuses to start without them. Make sure the <span className="font-mono-nums">edgerelay-journal-sync</span> URL from Step 2 is whitelisted under WebRequest.
          </p>
        </div>
      </div>
    ),
  },
  {
    title: 'Step 7: Verify Connection',
    content: (
      <div className="space-y-4">
        <div>
          <p className="text-xs font-semibold text-terminal-muted uppercase tracking-wider mb-2">Master / Follower EAs</p>
          <ol className="space-y-2 text-sm text-slate-300 list-decimal list-inside">
            <li>
              Check the on-chart display panel &mdash; <span className="text-neon-green">green dot</span> = connected
            </li>
            <li>Send a test trade on master account</li>
            <li>Verify it appears in the Signal Log on the dashboard</li>
            <li>Check follower MT5 for the copied trade</li>
          </ol>
        </div>
        <div>
          <p className="text-xs font-semibold text-terminal-muted uppercase tracking-wider mb-2">TradeJournal Sync EA</p>
          <ol className="space-y-2 text-sm text-slate-300 list-decimal list-inside">
            <li>
              This EA has <strong>no on-chart panel</strong> &mdash; open the <span className="font-mono-nums text-neon-cyan">Experts</span> tab and look for <span className="font-mono-nums text-neon-purple">[Journal]</span> heartbeat log lines
            </li>
            <li>Place or close a trade on the account</li>
            <li>Confirm it appears in your dashboard <strong>Journal</strong> &mdash; prior history is backfilled on the first run</li>
          </ol>
        </div>
      </div>
    ),
  },
];

/* ------------------------------------------------------------------ */
/*  Troubleshooting Data                                               */
/* ------------------------------------------------------------------ */

const troubleshootingItems = [
  {
    problem: 'EA shows red dot (disconnected)',
    solution: 'Check WebRequest URL whitelist, verify API key is correct, and ensure your internet connection is stable.',
  },
  {
    problem: 'Signals sent but not executed on follower',
    solution: 'Check equity guard settings, verify symbol mapping between brokers, and confirm the follower EA has auto trading enabled.',
  },
  {
    problem: 'Error 4060 in Experts tab',
    solution: 'The URL is not whitelisted. Go to Tools → Options → Expert Advisors and add https://signal.edgerelay.io to the allowed URLs.',
  },
  {
    problem: "'Trade context busy' error",
    solution: 'Another EA or script is currently executing a trade. Enable "Allow auto trading" in the EA settings and ensure no other EA is blocking the trade context.',
  },
];

/* ------------------------------------------------------------------ */
/*  Accordion Component                                                */
/* ------------------------------------------------------------------ */

function AccordionItem({
  title,
  children,
  isOpen,
  onToggle,
  variant = 'default',
}: {
  title: string;
  children: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  variant?: 'default' | 'warning';
}) {
  return (
    <div className={`glass rounded-2xl p-5 transition-all duration-300 ${
      isOpen && variant === 'default' ? 'border-l-2 border-l-neon-cyan' : ''
    } ${variant === 'warning' ? 'border-l-2 border-l-neon-amber' : ''}`}>
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between text-left focus-ring rounded-lg"
      >
        <span className="text-sm font-medium text-slate-200">{title}</span>
        {isOpen ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-neon-cyan transition-transform" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 transition-transform" />
        )}
      </button>
      {isOpen && (
        <div className="mt-4 pt-4">
          <div className="divider mb-4" />
          {children}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  EA Download Card                                                   */
/* ------------------------------------------------------------------ */

function CredCopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable — ignore */
    }
  };
  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={`Copy ${label}`}
      className="inline-flex items-center gap-1 rounded px-1 py-0.5 text-[10px] text-terminal-muted transition-colors hover:text-neon-cyan focus-ring"
    >
      {copied ? <Check size={12} className="text-neon-green" /> : <Copy size={12} />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

function CredRow({ label, value, valueClass }: { label: string; value: string; valueClass: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="shrink-0 text-[10px] uppercase tracking-wider text-terminal-muted">{label}</span>
      <div className="flex min-w-0 items-center gap-1">
        <code className={`max-w-[150px] truncate font-mono-nums text-[11px] ${valueClass}`}>{value}</code>
        <CredCopyButton text={value} label={label} />
      </div>
    </div>
  );
}

/**
 * Inline EA credentials for a card's matching account: Account ID + API Key
 * are always available from the account list; the API Secret is one-time, so
 * we expose a Regenerate action that reveals a fresh Key + Secret once.
 */
function CredentialsPanel({ account }: { account: Account | undefined }) {
  const fetchAccounts = useAccountsStore((s) => s.fetchAccounts);
  const [revealed, setRevealed] = useState<{ api_key: string; api_secret: string } | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [regenError, setRegenError] = useState<string | null>(null);

  if (!account) {
    return (
      <div className="mt-4 rounded-xl border border-terminal-border/40 bg-terminal-bg/30 p-3">
        <div className="flex items-center gap-1.5">
          <KeyRound size={12} className="text-terminal-muted" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-terminal-muted">EA Credentials</span>
        </div>
        <p className="mt-2 text-[11px] text-terminal-muted">
          No account yet.{' '}
          <a href="/accounts" className="text-neon-cyan hover:underline">Create one on the Copier page</a>{' '}
          to generate your Account ID, API Key and Secret.
        </p>
      </div>
    );
  }

  const handleRegenerate = async () => {
    if (!window.confirm(`Regenerate API keys for "${account.alias}"?\n\nThe current API Key and Secret stop working immediately - any EA already using them must be updated with the new values.`)) return;
    setRegenError(null);
    setRegenerating(true);
    const res = await api.post<{ id: string; api_key: string; api_secret: string }>(`/accounts/${account.id}/regenerate-keys`);
    if (res.data) {
      setRevealed({ api_key: res.data.api_key, api_secret: res.data.api_secret });
      await fetchAccounts();
    } else {
      setRegenError(res.error?.message ?? 'Could not regenerate keys. Please try again.');
    }
    setRegenerating(false);
  };

  return (
    <div className="mt-4 space-y-2 rounded-xl border border-terminal-border/40 bg-terminal-bg/30 p-3">
      <div className="flex items-center gap-1.5">
        <KeyRound size={12} className="text-neon-cyan/60" />
        <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-terminal-muted">EA Credentials</span>
        <span className="ml-auto max-w-[90px] truncate text-[10px] text-terminal-muted" title={account.alias}>{account.alias}</span>
      </div>

      <CredRow label="Account ID" value={account.id} valueClass="text-neon-cyan" />
      <CredRow label="API Key" value={revealed?.api_key ?? account.api_key} valueClass="text-terminal-text" />

      {revealed ? (
        <>
          <CredRow label="API Secret" value={revealed.api_secret} valueClass="text-neon-amber" />
          <p className="text-[10px] text-neon-amber">Copy the secret now &mdash; it is shown only this once.</p>
        </>
      ) : (
        <div className="flex items-center justify-between gap-2">
          <span className="shrink-0 text-[10px] uppercase tracking-wider text-terminal-muted">API Secret</span>
          <span className="text-[10px] italic text-terminal-muted">shown once at creation</span>
        </div>
      )}

      <div className="pt-1">
        <button
          type="button"
          onClick={handleRegenerate}
          disabled={regenerating}
          className="inline-flex items-center gap-1.5 rounded-lg px-1 py-0.5 text-[11px] text-terminal-muted transition-colors hover:text-neon-cyan focus-ring disabled:opacity-50"
        >
          <RefreshCw size={12} className={regenerating ? 'animate-spin' : ''} />
          {regenerating ? 'Regenerating...' : revealed ? 'Regenerate again' : 'Regenerate to reveal secret'}
        </button>
      </div>

      {regenError && <p className="text-[10px] text-neon-red">{regenError}</p>}
    </div>
  );
}

function EADownloadCard({
  type,
  accounts,
}: {
  type: 'master' | 'follower' | 'journal';
  accounts: Account[];
}) {
  const [downloading, setDownloading] = useState(false);
  const [sourceDownloading, setSourceDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const token = useAuthStore((s) => s.token);

  const isMaster = type === 'master';
  const isJournal = type === 'journal';
  const Icon = isJournal ? BookOpen : isMaster ? Upload : Download;
  const iconColor = isJournal ? 'text-neon-purple' : isMaster ? 'text-neon-cyan' : 'text-neon-green';
  const iconGlow = isJournal
    ? 'shadow-[0_0_15px_#b18cff25,0_0_30px_#b18cff10]'
    : isMaster
    ? 'shadow-[0_0_15px_#00e5ff25,0_0_30px_#00e5ff10]'
    : 'shadow-[0_0_15px_#00ff9d25,0_0_30px_#00ff9d10]';

  const matchingAccount = isJournal
    ? accounts.find((a) => a.is_active)
    : accounts.find((a) => a.role === type && a.is_active);

  const handleDownload = async () => {
    if (!matchingAccount) {
      setError(`Create a ${type} account first on the Copier page.`);
      return;
    }

    setError(null);
    setDownloading(true);

    try {
      const downloadType = isJournal ? 'journal' : type;
      const res = await fetch(`/v1/accounts/${matchingAccount.id}/ea-download/${downloadType}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const json = await res.json().catch(() => null);
        const msg = (json as { error?: { message?: string } })?.error?.message || 'Download failed';
        setError(msg);
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = isJournal ? 'TradeJournal_Sync.ex5' : `TradeMetrics_${isMaster ? 'Master' : 'Follower'}.ex5`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  // Source ZIP is generic (no per-user credentials) - available to any
  // signed-in user without needing a matching account created first.
  const handleSourceDownload = async () => {
    setError(null);
    setSourceDownloading(true);

    try {
      const res = await fetch(`${API_BASE}/accounts/ea-source/${type}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const json = await res.json().catch(() => null);
        const msg = (json as { error?: { message?: string } })?.error?.message || 'Source download failed';
        setError(msg);
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = SOURCE_ZIP_NAMES[type];
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSourceDownloading(false);
    }
  };

  return (
    <Card hover className="flex flex-col">
      <div className="flex items-start gap-4">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full glass ${iconGlow}`}>
          <Icon className={`h-6 w-6 ${iconColor}`} />
        </div>
        <div className="flex-1 space-y-1">
          <h3 className="font-display text-base font-semibold text-slate-100">
            {isJournal ? 'TradeJournal Sync' : `TradeMetrics ${isMaster ? 'Master' : 'Follower'}`} EA
          </h3>
          <p className="text-sm text-slate-400">
            {isJournal
              ? 'Install on any MT5 account. Syncs every trade to your journal with zero drops — real-time capture + history catch-up.'
              : isMaster
              ? 'Install on your master MT5 account. Captures and sends trade signals to the edge network.'
              : 'Install on each follower account. Receives signals and executes trades automatically.'}
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <Badge variant={isJournal ? 'purple' : isMaster ? 'cyan' : 'green'}>v1.0.0</Badge>
        <span className="text-xs text-slate-500 font-mono-nums">{isJournal ? '~38 KB' : isMaster ? '~45 KB' : '~52 KB'}</span>
      </div>

      <div className="mt-4 space-y-2">
        <Button
          variant={isMaster || isJournal ? 'primary' : 'secondary'}
          size="md"
          isLoading={downloading}
          onClick={handleDownload}
          className="w-full"
        >
          <Download className="h-4 w-4" />
          Download .ex5
        </Button>
        <Button
          variant="ghost"
          size="md"
          isLoading={sourceDownloading}
          onClick={handleSourceDownload}
          className="w-full"
          title="Full MQL5 source + required include files, ready to compile in MetaEditor"
        >
          <FileCode2 className="h-4 w-4" />
          Source (.mq5)
        </Button>
      </div>

      <CredentialsPanel account={matchingAccount} />

      {error && (
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-neon-amber/20 bg-neon-amber/5 px-3 py-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-neon-amber" />
          <p className="text-xs text-neon-amber">{error}</p>
        </div>
      )}
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  EA Package Download Button                                         */
/* ------------------------------------------------------------------ */

function EAPackageDownload() {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const token = useAuthStore((s) => s.token);

  const handleDownload = async () => {
    setError(null);
    setDownloading(true);
    try {
      const base = import.meta.env.PROD
        ? 'https://edgerelay-api.ghwmelite.workers.dev'
        : '';
      const res = await fetch(`${base}/v1/accounts/ea-package`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        setError('Download failed. Please try again.');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'TradeMetrics_EA_Package.zip';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div>
      <Button onClick={handleDownload} isLoading={downloading} className="shadow-[0_0_20px_#00e5ff25]">
        <Download className="h-4 w-4" />
        Download Full Package (.zip)
      </Button>
      {error && (
        <p className="mt-2 text-xs text-neon-red">{error}</p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Downloads Page                                                     */
/* ------------------------------------------------------------------ */

export function DownloadsPage() {
  const { accounts, fetchAccounts } = useAccountsStore();
  const [openSteps, setOpenSteps] = useState<Set<number>>(new Set([0]));
  const [openFAQ, setOpenFAQ] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const toggleStep = (index: number) => {
    setOpenSteps((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const toggleFAQ = (index: number) => {
    setOpenFAQ((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {/* Header */}
      <div
        className="animate-fade-in-up"
        style={{ animationDelay: '0ms' }}
      >
        <h1 className="text-3xl font-black tracking-tight text-white font-display">
          Downloads & Setup
        </h1>
        <p className="mt-1 text-sm text-terminal-muted">
          Get your Expert Advisors configured and running in minutes
        </p>
      </div>

      {/* EA Download Cards */}
      <div
        className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 animate-fade-in-up"
        style={{ animationDelay: '60ms' }}
      >
        <EADownloadCard type="master" accounts={accounts} />
        <EADownloadCard type="follower" accounts={accounts} />
        <EADownloadCard type="journal" accounts={accounts} />
      </div>

      {/* Full Package Download */}
      <div
        className="glass-premium rounded-2xl p-6 animate-fade-in-up border border-neon-cyan/20"
        style={{ animationDelay: '90ms' }}
      >
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full glass shadow-[0_0_20px_#00e5ff25]">
            <Package className="h-6 w-6 text-neon-cyan" />
          </div>
          <div className="flex-1">
            <h3 className="font-display text-lg font-bold text-white">Complete EA Package</h3>
            <p className="text-sm text-terminal-muted mt-1">
              Everything you need in one ZIP &mdash; 3 Expert Advisors, 11 Include libraries, and the Setup Script.
              Extract directly into your MT5 Data Folder.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge variant="cyan">3 Expert Advisors (.mq5)</Badge>
              <Badge variant="purple">11 Include Files (.mqh)</Badge>
              <Badge variant="amber">1 Setup Script (.mq5)</Badge>
            </div>
            <div className="mt-4">
              <EAPackageDownload />
            </div>
          </div>
        </div>
      </div>

      {/* Setup Guide */}
      <div
        className="space-y-3 animate-fade-in-up"
        style={{ animationDelay: '120ms' }}
      >
        <h2 className="text-[10px] uppercase tracking-[0.15em] text-terminal-muted font-medium flex items-center gap-1.5">
          <span className="h-1 w-1 rounded-full bg-neon-cyan" />
          Setup Guide
        </h2>
        <div className="space-y-2">
          {setupSteps.map((step, i) => (
            <AccordionItem key={i} title={step.title} isOpen={openSteps.has(i)} onToggle={() => toggleStep(i)}>
              {step.content}
            </AccordionItem>
          ))}
        </div>
      </div>

      {/* Troubleshooting */}
      <div
        className="space-y-3 animate-fade-in-up"
        style={{ animationDelay: '180ms' }}
      >
        <h2 className="text-[10px] uppercase tracking-[0.15em] text-terminal-muted font-medium flex items-center gap-1.5">
          <span className="h-1 w-1 rounded-full bg-neon-amber" />
          Troubleshooting
        </h2>
        <div className="space-y-2">
          {troubleshootingItems.map((item, i) => (
            <AccordionItem key={i} title={item.problem} isOpen={openFAQ.has(i)} onToggle={() => toggleFAQ(i)} variant="warning">
              <p className="text-sm text-slate-300">{item.solution}</p>
            </AccordionItem>
          ))}
        </div>
      </div>
    </div>
  );
}
