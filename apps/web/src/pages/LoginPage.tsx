import { useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading, error, clearError } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const googleError = searchParams.get('error');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    clearError();
    const success = await login(email, password);
    if (success) {
      navigate('/dashboard');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <h2 className="text-3xl font-black tracking-tight text-white font-display">Sign In</h2>

      {googleError && (
        <div className="rounded-xl border border-neon-red/30 bg-neon-red/5 p-3 mb-4">
          <p className="text-sm text-neon-red">
            {googleError === 'google_denied' ? 'Google sign-in was cancelled' :
             googleError === 'google_token_failed' ? 'Google authentication failed' :
             'Sign-in failed. Please try again.'}
          </p>
        </div>
      )}

      {error && (
        <div className="glass rounded-2xl border border-neon-red/30 bg-neon-red/5 px-4 py-3 text-sm text-neon-red">
          {error}
        </div>
      )}

      <Input
        label="Email"
        type="email"
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        autoComplete="email"
      />

      <Input
        label="Password"
        type="password"
        placeholder="Enter your password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        autoComplete="current-password"
      />

      <Button type="submit" isLoading={isLoading} className="w-full shadow-[0_0_20px_#00e5ff25]">
        Sign In
      </Button>

      {/* Divider */}
      <div className="flex items-center gap-3 my-4">
        <div className="flex-1 h-px bg-terminal-border" />
        <span className="text-xs text-terminal-muted uppercase tracking-wider">or</span>
        <div className="flex-1 h-px bg-terminal-border" />
      </div>

      {/* Google Sign In */}
      <a
        href="https://edgerelay-api.ghwmelite.workers.dev/v1/auth/google"
        className="flex w-full items-center justify-center gap-3 rounded-xl border border-terminal-border bg-terminal-surface/50 px-4 py-3 text-sm font-medium text-terminal-text hover:bg-terminal-card/50 hover:border-terminal-border-hover transition-all"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
          <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
          <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
          <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
        </svg>
        Continue with Google
      </a>
    </form>
  );
}
