import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  Gift,
  Users,
  DollarSign,
  Clock,
  Copy,
  Check,
  ArrowRight,
  Share2,
  Sparkles,
  TrendingUp,
} from 'lucide-react';

/* ────────────────────────────────────────────────────────────── */
/*  Types                                                         */
/* ────────────────────────────────────────────────────────────── */

interface ReferralInfo {
  referral_code: string;
  referral_link: string;
  total_referrals: number;
  total_earned_cents: number;
  pending_cents: number;
}

interface CommissionEntry {
  id: string;
  event_type: string;
  source_amount_cents: number;
  commission_cents: number;
  status: string;
  created_at: string;
  referred_email: string;
}

/* ────────────────────────────────────────────────────────────── */
/*  Helpers                                                       */
/* ────────────────────────────────────────────────────────────── */

function formatUsd(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '***';
  const visible = local.slice(0, 3);
  return `${visible}***@${domain}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/* ────────────────────────────────────────────────────────────── */
/*  Component                                                     */
/* ────────────────────────────────────────────────────────────── */

export function ReferralPage() {
  const [info, setInfo] = useState<ReferralInfo | null>(null);
  const [history, setHistory] = useState<CommissionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [infoRes, historyRes] = await Promise.all([
      api.get<ReferralInfo>('/referral/me'),
      api.get<CommissionEntry[]>('/referral/history'),
    ]);
    if (infoRes.data) setInfo(infoRes.data);
    if (historyRes.data) setHistory(historyRes.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCopy = async () => {
    if (!info) return;
    await navigator.clipboard.writeText(info.referral_link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-terminal-muted">Loading referral data...</div>
      </div>
    );
  }

  if (!info) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-neon-red">Failed to load referral info</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <Gift className="h-6 w-6 text-neon-cyan" />
          <h1 className="text-2xl font-black text-white tracking-tight">Referral Program</h1>
        </div>
        <p className="text-terminal-muted text-sm">
          Earn <span className="text-neon-green font-semibold">$0.50</span> for every EA your referrals purchase
        </p>
      </div>

      {/* Referral Link Card */}
      <div className="relative rounded-2xl border-2 border-neon-cyan/40 bg-terminal-surface/80 backdrop-blur-xl p-6 overflow-hidden">
        {/* Glow effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-neon-cyan/5 via-transparent to-neon-cyan/3 pointer-events-none" />
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-neon-cyan/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-3">
            <Share2 className="h-5 w-5 text-neon-cyan" />
            <h2 className="text-lg font-bold text-white">Your Referral Link</h2>
          </div>

          <div className="flex items-stretch gap-3">
            <div className="flex-1 rounded-xl bg-terminal-bg/80 border border-terminal-border/60 px-4 py-3 font-mono text-sm text-neon-cyan truncate">
              {info.referral_link}
            </div>
            <button
              onClick={handleCopy}
              className={`
                flex items-center gap-2 rounded-xl px-5 py-3 font-semibold text-sm transition-all duration-200
                ${copied
                  ? 'bg-neon-green/20 text-neon-green border border-neon-green/40'
                  : 'bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/40 hover:bg-neon-cyan/20 hover:shadow-[0_0_20px_rgba(0,229,255,0.15)]'
                }
              `}
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copied!' : 'Copy Link'}
            </button>
          </div>

          <p className="mt-3 text-xs text-terminal-muted">
            Share this link on social media, Telegram groups, or with trading friends
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl bg-terminal-surface/60 backdrop-blur-xl border border-terminal-border/40 p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="rounded-lg bg-neon-cyan/10 p-2">
              <Users className="h-4 w-4 text-neon-cyan" />
            </div>
            <span className="text-xs font-medium text-terminal-muted uppercase tracking-wider">
              Total Referrals
            </span>
          </div>
          <p className="text-3xl font-black text-white">{info.total_referrals}</p>
        </div>

        <div className="rounded-2xl bg-terminal-surface/60 backdrop-blur-xl border border-terminal-border/40 p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="rounded-lg bg-neon-green/10 p-2">
              <DollarSign className="h-4 w-4 text-neon-green" />
            </div>
            <span className="text-xs font-medium text-terminal-muted uppercase tracking-wider">
              Total Earned
            </span>
          </div>
          <p className="text-3xl font-black text-neon-green">
            {formatUsd(info.total_earned_cents)}
          </p>
        </div>

        <div className="rounded-2xl bg-terminal-surface/60 backdrop-blur-xl border border-terminal-border/40 p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="rounded-lg bg-amber-500/10 p-2">
              <Clock className="h-4 w-4 text-amber-400" />
            </div>
            <span className="text-xs font-medium text-terminal-muted uppercase tracking-wider">
              Pending Payout
            </span>
          </div>
          <p className="text-3xl font-black text-amber-400">
            {formatUsd(info.pending_cents)}
          </p>
        </div>
      </div>

      {/* How It Works */}
      <div className="rounded-2xl bg-terminal-surface/60 backdrop-blur-xl border border-terminal-border/40 p-6">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-neon-cyan" />
          How It Works
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              step: '01',
              icon: Share2,
              title: 'Share Your Link',
              desc: 'Send your unique referral link to friends, trading groups, or social media',
            },
            {
              step: '02',
              icon: TrendingUp,
              title: 'They Purchase an EA',
              desc: 'When your referral buys an EA generation ($1.99), you earn $0.50',
            },
            {
              step: '03',
              icon: DollarSign,
              title: 'Get Paid',
              desc: 'Commissions accumulate and are paid out when you reach $10',
            },
          ].map((item) => (
            <div
              key={item.step}
              className="relative rounded-xl bg-terminal-bg/50 border border-terminal-border/30 p-5 group hover:border-neon-cyan/30 transition-all duration-300"
            >
              <span className="absolute top-3 right-4 text-4xl font-black text-terminal-border/20 group-hover:text-neon-cyan/10 transition-colors">
                {item.step}
              </span>
              <div className="rounded-lg bg-neon-cyan/10 p-2 w-fit mb-3">
                <item.icon className="h-4 w-4 text-neon-cyan" />
              </div>
              <h4 className="text-sm font-bold text-white mb-1">{item.title}</h4>
              <p className="text-xs text-terminal-muted leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Commission History */}
      <div className="rounded-2xl bg-terminal-surface/60 backdrop-blur-xl border border-terminal-border/40 p-6">
        <h3 className="text-lg font-bold text-white mb-4">Commission History</h3>

        {history.length === 0 ? (
          <div className="text-center py-12">
            <Gift className="h-12 w-12 text-terminal-border/40 mx-auto mb-3" />
            <p className="text-terminal-muted text-sm">No commissions yet</p>
            <p className="text-terminal-muted/60 text-xs mt-1">
              Share your referral link to start earning
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-terminal-border/30 text-terminal-muted text-xs uppercase tracking-wider">
                  <th className="text-left pb-3 pr-4">Date</th>
                  <th className="text-left pb-3 pr-4">Referred User</th>
                  <th className="text-left pb-3 pr-4">Event</th>
                  <th className="text-right pb-3 pr-4">Amount</th>
                  <th className="text-right pb-3 pr-4">Commission</th>
                  <th className="text-right pb-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {history.map((entry) => (
                  <tr
                    key={entry.id}
                    className="border-b border-terminal-border/10 hover:bg-terminal-card/30 transition-colors"
                  >
                    <td className="py-3 pr-4 text-slate-400">{formatDate(entry.created_at)}</td>
                    <td className="py-3 pr-4 font-mono text-xs text-slate-400">
                      {maskEmail(entry.referred_email)}
                    </td>
                    <td className="py-3 pr-4">
                      <span className="inline-flex items-center gap-1 rounded-lg bg-neon-cyan/10 px-2 py-0.5 text-xs font-medium text-neon-cyan">
                        {entry.event_type === 'ea_purchase' ? 'EA Purchase' : 'Subscription'}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-right text-slate-300">
                      {formatUsd(entry.source_amount_cents)}
                    </td>
                    <td className="py-3 pr-4 text-right font-semibold text-neon-green">
                      +{formatUsd(entry.commission_cents)}
                    </td>
                    <td className="py-3 text-right">
                      <span
                        className={`
                          inline-flex rounded-full px-2 py-0.5 text-xs font-medium
                          ${entry.status === 'paid'
                            ? 'bg-neon-green/10 text-neon-green'
                            : entry.status === 'pending'
                              ? 'bg-amber-500/10 text-amber-400'
                              : 'bg-neon-red/10 text-neon-red'
                          }
                        `}
                      >
                        {entry.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
