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
