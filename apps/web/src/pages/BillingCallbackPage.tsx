import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

type CallbackStatus = 'verifying' | 'success' | 'error';

interface VerifyResponse {
  plan_tier: string;
  status: string;
}

export function BillingCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const [status, setStatus] = useState<CallbackStatus>('verifying');
  const [planTier, setPlanTier] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    const reference = searchParams.get('reference') || searchParams.get('trxref');
    if (!reference) {
      setStatus('error');
      setErrorMessage('No payment reference found. Please try again.');
      return;
    }

    let redirectTimer: ReturnType<typeof setTimeout>;

    const verify = async () => {
      const res = await api.get<VerifyResponse>(`/billing/verify/${reference}`);
      if (res.error) {
        setStatus('error');
        setErrorMessage(res.error.message || 'Payment verification failed. Please contact support.');
        return;
      }

      setStatus('success');
      setPlanTier(res.data!.plan_tier);

      // Update the local auth store plan
      if (user) {
        useAuthStore.setState({
          user: { ...user, plan: res.data!.plan_tier },
        });
      }

      redirectTimer = setTimeout(() => {
        navigate('/dashboard', { replace: true });
      }, 3000);
    };

    verify();

    return () => {
      if (redirectTimer) clearTimeout(redirectTimer);
    };
  }, [searchParams, navigate, user]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="w-full max-w-md text-center">
        {status === 'verifying' && (
          <div className="space-y-4 py-8">
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-neon-cyan" />
            <p className="font-display text-lg font-semibold text-slate-100">
              Verifying your payment...
            </p>
            <p className="text-sm text-terminal-muted">
              Please wait while we confirm your transaction
            </p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-4 py-8">
            <CheckCircle2 className="mx-auto h-12 w-12 text-neon-green" />
            <p className="font-display text-lg font-semibold text-slate-100">
              Payment Successful!
            </p>
            <p className="text-sm text-slate-300">
              Your plan has been upgraded to{' '}
              <span className="font-semibold capitalize text-neon-cyan">{planTier}</span>!
            </p>
            <p className="text-xs text-terminal-muted">Redirecting to dashboard...</p>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4 py-8">
            <XCircle className="mx-auto h-12 w-12 text-neon-red" />
            <p className="font-display text-lg font-semibold text-slate-100">
              Verification Failed
            </p>
            <p className="text-sm text-slate-300">{errorMessage}</p>
            <div className="flex justify-center gap-3 pt-2">
              <Button variant="secondary" size="sm" onClick={() => navigate('/billing')}>
                Back to Billing
              </Button>
              <Button variant="primary" size="sm" onClick={() => window.location.reload()}>
                Retry
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
