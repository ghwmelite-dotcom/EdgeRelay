import { useState, useEffect } from 'react';
import { Upload, Download, ChevronDown, ChevronRight, AlertTriangle, CheckCircle } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useAccountsStore, type Account } from '@/stores/accounts';
import { useAuthStore } from '@/stores/auth';

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
          EdgeRelay account created with at least one master or follower account
        </li>
        <li className="flex items-start gap-2">
          <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-neon-green" />
          API Key and Secret from the Accounts page
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
            Go to <span className="font-mono-nums text-neon-cyan">Tools → Options → Expert Advisors</span>
          </li>
          <li>
            Check <span className="font-mono-nums text-neon-cyan">"Allow WebRequest for listed URL"</span>
          </li>
          <li>Add the following URL:</li>
        </ol>
        <div className="rounded-lg border border-terminal-border bg-terminal-bg px-4 py-3">
          <code className="font-mono-nums text-sm text-neon-green">https://signal.edgerelay.io</code>
        </div>
        <p className="text-sm text-slate-400">Click OK to save the settings.</p>
      </div>
    ),
  },
  {
    title: 'Step 3: Install Master EA',
    content: (
      <div className="space-y-3">
        <ol className="space-y-2 text-sm text-slate-300 list-decimal list-inside">
          <li>Copy the downloaded <span className="font-mono-nums text-neon-cyan">.ex5</span> file to:</li>
        </ol>
        <div className="rounded-lg border border-terminal-border bg-terminal-bg px-4 py-3">
          <code className="font-mono-nums text-sm text-neon-green">[MT5 Data Folder]\MQL5\Experts\</code>
        </div>
        <p className="text-sm text-slate-400">
          Tip: In MT5, go to <span className="font-mono-nums text-neon-cyan">File → Open Data Folder</span> to find
          the path.
        </p>
        <ol className="space-y-2 text-sm text-slate-300 list-decimal list-inside" start={3}>
          <li>Restart MT5 or right-click in Navigator → Refresh</li>
          <li>Drag "EdgeRelay_Master" onto any chart</li>
        </ol>
      </div>
    ),
  },
  {
    title: 'Step 4: Configure Master EA',
    content: (
      <div className="space-y-3">
        <p className="text-sm text-slate-300">Set the following input parameters when attaching the EA:</p>
        <div className="overflow-x-auto rounded-lg border border-terminal-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-terminal-border bg-terminal-bg">
                <th className="px-4 py-2.5 text-left font-medium text-slate-400">Parameter</th>
                <th className="px-4 py-2.5 text-left font-medium text-slate-400">Description</th>
                <th className="px-4 py-2.5 text-left font-medium text-slate-400">Example</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-terminal-border">
              <tr>
                <td className="px-4 py-2.5 font-mono-nums text-neon-cyan">API_Key</td>
                <td className="px-4 py-2.5 text-slate-300">Your API key from dashboard</td>
                <td className="px-4 py-2.5 font-mono-nums text-slate-400">er_abc123...</td>
              </tr>
              <tr>
                <td className="px-4 py-2.5 font-mono-nums text-neon-cyan">API_Secret</td>
                <td className="px-4 py-2.5 text-slate-300">Your API secret</td>
                <td className="px-4 py-2.5 font-mono-nums text-slate-400">(shown once at creation)</td>
              </tr>
              <tr>
                <td className="px-4 py-2.5 font-mono-nums text-neon-cyan">API_Endpoint</td>
                <td className="px-4 py-2.5 text-slate-300">EdgeRelay server</td>
                <td className="px-4 py-2.5 font-mono-nums text-slate-400">https://signal.edgerelay.io</td>
              </tr>
              <tr>
                <td className="px-4 py-2.5 font-mono-nums text-neon-cyan">AccountID</td>
                <td className="px-4 py-2.5 text-slate-300">Your master account ID</td>
                <td className="px-4 py-2.5 font-mono-nums text-slate-400">(from dashboard)</td>
              </tr>
            </tbody>
          </table>
        </div>
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
        <div className="overflow-x-auto rounded-lg border border-terminal-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-terminal-border bg-terminal-bg">
                <th className="px-4 py-2.5 text-left font-medium text-slate-400">Parameter</th>
                <th className="px-4 py-2.5 text-left font-medium text-slate-400">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-terminal-border">
              <tr>
                <td className="px-4 py-2.5 font-mono-nums text-neon-cyan">MasterAccountID</td>
                <td className="px-4 py-2.5 text-slate-300">The master account this follower is linked to</td>
              </tr>
              <tr>
                <td className="px-4 py-2.5 font-mono-nums text-neon-cyan">LotMode</td>
                <td className="px-4 py-2.5 text-slate-300">How to calculate lot size (mirror, fixed, multiplier, risk_percent)</td>
              </tr>
              <tr>
                <td className="px-4 py-2.5 font-mono-nums text-neon-cyan">MaxDailyLossPercent</td>
                <td className="px-4 py-2.5 text-slate-300">Maximum daily loss before stopping (e.g. 5.0)</td>
              </tr>
              <tr>
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
    title: 'Step 6: Verify Connection',
    content: (
      <ol className="space-y-2 text-sm text-slate-300 list-decimal list-inside">
        <li>
          Check the on-chart display panel — <span className="text-neon-green">green dot</span> = connected
        </li>
        <li>Send a test trade on master account</li>
        <li>Verify it appears in the Signal Log on the dashboard</li>
        <li>Check follower MT5 for the copied trade</li>
      </ol>
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
}: {
  title: string;
  children: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <Card className="overflow-hidden">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between text-left focus:outline-none focus:ring-2 focus:ring-neon-cyan/40 rounded-lg"
      >
        <span className="text-sm font-medium text-slate-200">{title}</span>
        {isOpen ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-slate-400 transition-transform" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 transition-transform" />
        )}
      </button>
      {isOpen && <div className="mt-4 border-t border-terminal-border pt-4">{children}</div>}
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  EA Download Card                                                   */
/* ------------------------------------------------------------------ */

function EADownloadCard({
  type,
  accounts,
}: {
  type: 'master' | 'follower';
  accounts: Account[];
}) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const token = useAuthStore((s) => s.token);

  const isMaster = type === 'master';
  const Icon = isMaster ? Upload : Download;
  const iconColor = isMaster ? 'text-neon-cyan' : 'text-neon-green';
  const iconBg = isMaster ? 'bg-neon-cyan/10' : 'bg-neon-green/10';

  const matchingAccount = accounts.find((a) => a.role === type && a.is_active);

  const handleDownload = async () => {
    if (!matchingAccount) {
      setError(`Create a ${type} account first on the Accounts page.`);
      return;
    }

    setError(null);
    setDownloading(true);

    try {
      const res = await fetch(`/v1/accounts/${matchingAccount.id}/ea-download/${type}`, {
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
      a.download = `EdgeRelay_${isMaster ? 'Master' : 'Follower'}.ex5`;
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
    <Card className="flex flex-col">
      <div className="flex items-start gap-4">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
          <Icon className={`h-6 w-6 ${iconColor}`} />
        </div>
        <div className="flex-1 space-y-1">
          <h3 className="font-display text-base font-semibold text-slate-100">
            EdgeRelay {isMaster ? 'Master' : 'Follower'} EA
          </h3>
          <p className="text-sm text-slate-400">
            {isMaster
              ? 'Install on your master MT5 account. Captures and sends trade signals to the edge network.'
              : 'Install on each follower account. Receives signals and executes trades automatically.'}
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <Badge variant={isMaster ? 'cyan' : 'green'}>v1.0.0</Badge>
        <span className="text-xs text-slate-500">{isMaster ? '~45 KB' : '~52 KB'}</span>
      </div>

      <div className="mt-4">
        <Button
          variant={isMaster ? 'primary' : 'secondary'}
          size="md"
          isLoading={downloading}
          onClick={handleDownload}
          className="w-full"
        >
          <Download className="h-4 w-4" />
          Download .ex5
        </Button>
      </div>

      {error && (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-neon-amber/20 bg-neon-amber-dim px-3 py-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-neon-amber" />
          <p className="text-xs text-neon-amber">{error}</p>
        </div>
      )}
    </Card>
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
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-100">Downloads &amp; Setup</h1>
        <p className="mt-1 text-sm text-slate-400">
          Get your Expert Advisors configured and running in minutes
        </p>
      </div>

      {/* EA Download Cards */}
      <div className="grid gap-6 sm:grid-cols-2">
        <EADownloadCard type="master" accounts={accounts} />
        <EADownloadCard type="follower" accounts={accounts} />
      </div>

      {/* Setup Guide */}
      <div className="space-y-3">
        <h2 className="font-display text-lg font-semibold text-slate-200">Setup Guide</h2>
        <div className="space-y-2">
          {setupSteps.map((step, i) => (
            <AccordionItem key={i} title={step.title} isOpen={openSteps.has(i)} onToggle={() => toggleStep(i)}>
              {step.content}
            </AccordionItem>
          ))}
        </div>
      </div>

      {/* Troubleshooting */}
      <div className="space-y-3">
        <h2 className="font-display text-lg font-semibold text-slate-200">Troubleshooting</h2>
        <div className="space-y-2">
          {troubleshootingItems.map((item, i) => (
            <AccordionItem key={i} title={item.problem} isOpen={openFAQ.has(i)} onToggle={() => toggleFAQ(i)}>
              <p className="text-sm text-slate-300">{item.solution}</p>
            </AccordionItem>
          ))}
        </div>
      </div>
    </div>
  );
}
