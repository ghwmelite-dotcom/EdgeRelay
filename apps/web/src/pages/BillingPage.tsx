import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { useAuthStore } from '@/stores/auth';
import { useBillingStore } from '@/stores/billing';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';

const PLAN_ORDER = ['free', 'starter', 'pro', 'unlimited', 'provider'];

const planBadgeVariant = (tier: string) => {
  switch (tier.toLowerCase()) {
    case 'starter':
      return 'cyan' as const;
    case 'pro':
      return 'green' as const;
    case 'unlimited':
      return 'purple' as const;
    case 'provider':
      return 'amber' as const;
    default:
      return 'muted' as const;
  }
};

interface PlanDisplay {
  tier: string;
  name: string;
  price: number;
  features: string[];
  popular?: boolean;
}

const PLANS_DISPLAY: PlanDisplay[] = [
  {
    tier: 'starter',
    name: 'Starter',
    price: 19,
    features: ['1 master account', '3 follower accounts', 'Real-time copy trading', 'Email support'],
  },
  {
    tier: 'pro',
    name: 'Pro',
    price: 49,
    popular: true,
    features: [
      '1 master account',
      '10 follower accounts',
      'Equity protection',
      'News filter',
      'Priority support',
    ],
  },
  {
    tier: 'unlimited',
    name: 'Unlimited',
    price: 99,
    features: [
      'Unlimited accounts',
      'API access',
      'Equity protection',
      'News filter',
      'Dedicated support',
    ],
  },
  {
    tier: 'provider',
    name: 'Signal Provider',
    price: 149,
    features: [
      'Broadcast to subscribers',
      'Unlimited accounts',
      'API access',
      'Revenue dashboard',
      'White-glove onboarding',
    ],
  },
];

function formatCurrency(cents: number): string {
  return (cents / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function BillingPage() {
  const user = useAuthStore((s) => s.user);
  const { subscription, isLoading, error, fetchSubscription, initializePayment, cancelSubscription } =
    useBillingStore();

  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [initializingTier, setInitializingTier] = useState<string | null>(null);

  const currentTier = subscription?.plan_tier ?? user?.plan ?? 'free';
  const currentIndex = PLAN_ORDER.indexOf(currentTier.toLowerCase());
  const isPaid = currentTier.toLowerCase() !== 'free';

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  const handleUpgrade = async (tier: string) => {
    setInitializingTier(tier);
    const url = await initializePayment(tier);
    if (url) {
      window.location.href = url;
    }
    setInitializingTier(null);
  };

  const handleCancel = async () => {
    setIsCancelling(true);
    const success = await cancelSubscription();
    setIsCancelling(false);
    if (success) {
      setCancelModalOpen(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* Page header */}
      <div
        className="animate-fade-in-up"
        style={{ animationDelay: '0ms' }}
      >
        <h1 className="text-3xl font-black tracking-tight text-white font-display">Billing</h1>
        <p className="mt-1 text-sm text-terminal-muted">Manage your subscription and billing</p>
      </div>

      {/* Error banner */}
      {error && (
        <div className="glass rounded-2xl border border-neon-red/30 px-4 py-3 text-sm text-neon-red">
          {error}
        </div>
      )}

      {/* Current Plan Section */}
      <div
        className="animate-fade-in-up"
        style={{ animationDelay: '60ms' }}
      >
        <Card className={isPaid ? 'border-gradient' : ''}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-[0.15em] text-terminal-muted font-medium flex items-center gap-1.5">
                <span className="h-1 w-1 rounded-full bg-neon-cyan" />
                Current Plan
              </p>
              <div className="flex items-center gap-3">
                <span className="font-display text-xl font-bold text-slate-100 capitalize">
                  {currentTier}
                </span>
                <Badge variant={planBadgeVariant(currentTier)}>{currentTier}</Badge>
              </div>

              {subscription && subscription.status === 'active' ? (
                <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-terminal-muted">
                  <span>
                    Next billing:{' '}
                    <span className="font-mono-nums text-slate-300">
                      {formatDate(subscription.next_payment_date)}
                    </span>
                  </span>
                  <span>
                    Amount:{' '}
                    <span className="font-mono-nums text-slate-300">
                      {formatCurrency(subscription.amount)}
                    </span>
                    /mo
                  </span>
                  <span>
                    Status:{' '}
                    <Badge variant="green" className="ml-1">
                      {subscription.status}
                    </Badge>
                  </span>
                </div>
              ) : (
                <p className="text-sm text-terminal-muted">
                  {currentTier.toLowerCase() === 'free'
                    ? 'Upgrade your plan to unlock more features'
                    : 'No active subscription found'}
                </p>
              )}
            </div>

            {subscription && subscription.status === 'active' && (
              <Button variant="danger" size="sm" onClick={() => setCancelModalOpen(true)}>
                Cancel Subscription
              </Button>
            )}
          </div>
        </Card>
      </div>

      {/* Plan Cards Grid */}
      <div
        className="animate-fade-in-up"
        style={{ animationDelay: '120ms' }}
      >
        <h2 className="text-[10px] uppercase tracking-[0.15em] text-terminal-muted font-medium flex items-center gap-1.5 mb-4">
          <span className="h-1 w-1 rounded-full bg-neon-cyan" />
          Choose a Plan
        </h2>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {PLANS_DISPLAY.map((plan, planIdx) => {
            const planIndex = PLAN_ORDER.indexOf(plan.tier);
            const isCurrent = plan.tier === currentTier.toLowerCase();
            const isUpgrade = planIndex > currentIndex;
            const isDowngrade = planIndex < currentIndex;
            const isInitializing = initializingTier === plan.tier;

            return (
              <div
                key={plan.tier}
                className="animate-fade-in-up"
                style={{ animationDelay: `${180 + planIdx * 60}ms` }}
              >
                <Card
                  glow={plan.popular}
                  className={`relative flex flex-col transition-transform duration-300 ${
                    plan.popular
                      ? 'sm:scale-[1.02] glow-cyan-strong border-gradient'
                      : ''
                  }`}
                >
                  {plan.popular && (
                    <span className="chip absolute -top-3 left-1/2 -translate-x-1/2 bg-neon-cyan text-terminal-bg font-bold animate-shimmer shadow-[0_0_12px_#00e5ff40]">
                      POPULAR
                    </span>
                  )}

                  <div className="mb-4">
                    <h3 className="font-display text-lg font-semibold text-slate-100">{plan.name}</h3>
                    <div className="mt-2 flex items-baseline gap-1">
                      <span className="font-mono-nums text-4xl font-black text-slate-100">
                        ${plan.price}
                      </span>
                      <span className="text-sm text-terminal-muted">/mo</span>
                    </div>
                  </div>

                  <ul className="mb-6 flex-1 space-y-2.5">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-sm text-slate-300">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-neon-cyan shadow-[0_0_4px_#00e5ff40]" />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  {isCurrent ? (
                    <Button variant="secondary" disabled className="w-full">
                      Current Plan
                    </Button>
                  ) : isUpgrade ? (
                    <Button
                      variant="primary"
                      className="w-full"
                      isLoading={isInitializing}
                      disabled={isLoading}
                      onClick={() => handleUpgrade(plan.tier)}
                    >
                      Upgrade
                    </Button>
                  ) : isDowngrade ? (
                    <Button
                      variant="secondary"
                      className="w-full"
                      isLoading={isInitializing}
                      disabled={isLoading}
                      onClick={() => handleUpgrade(plan.tier)}
                    >
                      Downgrade
                    </Button>
                  ) : (
                    <Button
                      variant="primary"
                      className="w-full"
                      isLoading={isInitializing}
                      disabled={isLoading}
                      onClick={() => handleUpgrade(plan.tier)}
                    >
                      Select Plan
                    </Button>
                  )}
                </Card>
              </div>
            );
          })}
        </div>
      </div>

      {/* Payment History Placeholder */}
      <div
        className="animate-fade-in-up"
        style={{ animationDelay: '420ms' }}
      >
        <Card>
          <p className="text-sm text-terminal-muted text-center py-4">
            Payment history coming soon
          </p>
        </Card>
      </div>

      {/* Cancel Confirmation Modal */}
      <Modal
        open={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        title="Cancel Subscription"
        className="border-neon-red/20"
      >
        <div className="space-y-4">
          <div className="glass rounded-2xl border border-neon-red/20 bg-neon-red/5 p-4">
            <p className="text-sm text-slate-300">
              Are you sure you want to cancel your subscription? Your access will continue until the
              end of your current billing period.
            </p>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" size="sm" onClick={() => setCancelModalOpen(false)}>
              Keep Subscription
            </Button>
            <Button
              variant="danger"
              size="sm"
              isLoading={isCancelling}
              onClick={handleCancel}
            >
              Yes, Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
