import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Shield } from 'lucide-react';
import { useAuthStore } from '@/stores/auth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register';
}

export function AuthModal({ isOpen, onClose, initialMode = 'register' }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [validationError, setValidationError] = useState('');
  const { login, register, isLoading, error, clearError } = useAuthStore();
  const navigate = useNavigate();

  if (!isOpen) return null;

  const resetForm = () => {
    setName('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setValidationError('');
    clearError();
  };

  const switchMode = (newMode: 'login' | 'register') => {
    resetForm();
    setMode(newMode);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setValidationError('');
    clearError();

    if (mode === 'register') {
      if (password !== confirmPassword) {
        setValidationError('Passwords do not match');
        return;
      }
      if (password.length < 8) {
        setValidationError('Password must be at least 8 characters');
        return;
      }
      const success = await register(email, password, name);
      if (success) {
        onClose();
        navigate('/dashboard');
      }
    } else {
      const success = await login(email, password);
      if (success) {
        onClose();
        navigate('/dashboard');
      }
    }
  };

  const displayError = validationError || error;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-xl"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-md animate-fade-in-scale">
        {/* Glass card */}
        <div className="glass-premium border-gradient rounded-2xl p-8 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)]">
          {/* Scan line effect */}
          <div
            className="pointer-events-none absolute inset-0 z-0 rounded-2xl overflow-hidden"
            style={{
              backgroundImage:
                'repeating-linear-gradient(0deg, transparent, transparent 2px, #00e5ff03 2px, #00e5ff03 4px)',
            }}
          />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-20 rounded-xl p-1.5 text-terminal-muted hover:text-neon-cyan hover:bg-neon-cyan/5 transition-all"
          >
            <X size={18} />
          </button>

          {/* Logo */}
          <div className="relative z-10 text-center mb-6">
            <div className="inline-flex items-center gap-2 mb-3">
              <Shield className="h-5 w-5 text-neon-cyan" />
              <span className="font-display text-xl font-black tracking-tight">
                <span className="text-white">TRADE</span>
                <span className="text-neon-cyan glow-text-cyan">METRICS</span>
                <span className="ml-1 text-xs font-semibold text-terminal-muted uppercase tracking-widest">Pro</span>
              </span>
            </div>
            <p className="text-sm text-terminal-muted">
              {mode === 'login' ? 'Sign in to your trading terminal' : 'Create your free account'}
            </p>
          </div>

          {/* Tab switcher */}
          <div className="relative z-10 flex mb-6 glass rounded-xl p-1">
            <button
              type="button"
              onClick={() => switchMode('login')}
              className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-all ${
                mode === 'login'
                  ? 'bg-neon-cyan/10 text-neon-cyan shadow-[0_0_8px_#00e5ff15]'
                  : 'text-terminal-muted hover:text-slate-300'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => switchMode('register')}
              className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-all ${
                mode === 'register'
                  ? 'bg-neon-cyan/10 text-neon-cyan shadow-[0_0_8px_#00e5ff15]'
                  : 'text-terminal-muted hover:text-slate-300'
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Error */}
          {displayError && (
            <div className="relative z-10 glass rounded-xl border border-neon-red/30 bg-neon-red/5 px-4 py-3 text-sm text-neon-red mb-4">
              {displayError}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="relative z-10 space-y-4">
            {mode === 'register' && (
              <Input
                label="Name"
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name"
              />
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
              placeholder={mode === 'register' ? 'At least 8 characters' : 'Enter your password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
            />

            {mode === 'register' && (
              <Input
                label="Confirm Password"
                type="password"
                placeholder="Repeat your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
            )}

            <Button type="submit" isLoading={isLoading} className="w-full shadow-[0_0_20px_#00e5ff25]">
              {mode === 'login' ? 'Sign In' : 'Create Free Account'}
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

          {/* Secure badge */}
          <div className="relative z-10 flex items-center justify-center gap-2 mt-6">
            <div className="live-dot" style={{ width: 4, height: 4 }} />
            <span className="text-[10px] uppercase tracking-[0.2em] text-terminal-muted/60">
              Secure Connection · Free Until 2027
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
