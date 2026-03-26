import { Outlet, useLocation, Link } from 'react-router-dom';
import { Shield } from 'lucide-react';

const PARTICLES = Array.from({ length: 24 }, (_, i) => ({
  id: i,
  size: 3 + Math.random() * 4,
  x: Math.random() * 100,
  y: Math.random() * 100,
  opacity: 0.08 + Math.random() * 0.15,
  delay: Math.random() * 8,
  duration: 5 + Math.random() * 6,
}));

export function AuthLayout() {
  const location = useLocation();
  const isLogin = location.pathname === '/login';

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-terminal-bg px-4 overflow-hidden">
      {/* Layer 1: Hex pattern */}
      <div className="bg-hex absolute inset-0 pointer-events-none" />

      {/* Layer 2: Grid */}
      <div className="bg-grid absolute inset-0 pointer-events-none opacity-50" />

      {/* Layer 3: Ambient glow orbs */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute left-1/2 top-1/3 h-[500px] w-[500px] -translate-x-1/2 rounded-full"
          style={{
            background: 'radial-gradient(circle, #00e5ff06 0%, transparent 70%)',
            animation: 'breathe 6s ease-in-out infinite',
          }}
        />
        <div
          className="absolute bottom-1/4 right-1/4 h-[350px] w-[350px] rounded-full"
          style={{
            background: 'radial-gradient(circle, #b18cff05 0%, transparent 70%)',
            animation: 'breathe 8s ease-in-out infinite 2s',
          }}
        />
        <div
          className="absolute top-1/4 left-1/4 h-[300px] w-[300px] rounded-full"
          style={{
            background: 'radial-gradient(circle, #00ff9d03 0%, transparent 70%)',
            animation: 'breathe 10s ease-in-out infinite 4s',
          }}
        />
      </div>

      {/* Layer 4: Floating particles */}
      <div className="pointer-events-none absolute inset-0">
        {PARTICLES.map((p) => (
          <div
            key={p.id}
            className="absolute rounded-full bg-neon-cyan"
            style={{
              width: p.size,
              height: p.size,
              left: `${p.x}%`,
              top: `${p.y}%`,
              opacity: p.opacity,
              animation: `float ${p.duration}s ease-in-out ${p.delay}s infinite`,
            }}
          />
        ))}
      </div>

      {/* Layer 5: Scan line */}
      <div className="scan-line" />

      {/* Layer 6: Noise */}
      <div className="noise-overlay pointer-events-none fixed inset-0 z-[9999]" />

      {/* Content */}
      <div className="relative z-10 w-full max-w-md space-y-8">
        {/* Logo with signal visualization */}
        <div className="text-center animate-fade-in-up" style={{ animationDelay: '0ms' }}>
          {/* Signal rings behind logo */}
          <div className="relative inline-block mb-4">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-20 w-20 rounded-full border border-neon-cyan/10" style={{ animation: 'signal-pulse 3s ease-out infinite' }} />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-14 w-14 rounded-full border border-neon-cyan/20" style={{ animation: 'signal-pulse 3s ease-out infinite 0.5s' }} />
            </div>
            <div className="relative flex h-12 w-12 mx-auto items-center justify-center rounded-full bg-neon-cyan/10 border border-neon-cyan/30 shadow-[0_0_20px_#00e5ff20]">
              <div className="h-3 w-3 rounded-full bg-neon-cyan shadow-[0_0_8px_#00e5ff80]" />
            </div>
          </div>

          <h1 className="font-display text-4xl font-black tracking-tight">
            <span className="text-white">TRADE</span>
            <span className="glow-text-cyan text-neon-cyan logo-shimmer">METRICS</span>
            <span className="ml-1 text-xs font-semibold text-terminal-muted uppercase tracking-widest">Pro</span>
          </h1>
          <p className="mt-3 text-sm text-terminal-muted">
            {isLogin ? 'Sign in to your trading terminal' : 'Create your trading account'}
          </p>
        </div>

        {/* Form card with premium glass */}
        <div
          className="glass-premium border-gradient rounded-2xl p-8 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] animate-fade-in-scale"
          style={{ animationDelay: '100ms' }}
        >
          <Outlet />
        </div>

        {/* Footer link */}
        <p className="text-center text-sm text-terminal-muted animate-fade-in-up" style={{ animationDelay: '200ms' }}>
          {isLogin ? (
            <>
              Need an account?{' '}
              <Link to="/register" className="text-neon-cyan hover:underline hover:glow-text-cyan transition-all focus-ring rounded">
                Register
              </Link>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <Link to="/login" className="text-neon-cyan hover:underline hover:glow-text-cyan transition-all focus-ring rounded">
                Login
              </Link>
            </>
          )}
        </p>

        {/* Secure connection indicator */}
        <div className="flex items-center justify-center gap-2 animate-fade-in-up" style={{ animationDelay: '300ms' }}>
          <Shield className="h-3 w-3 text-neon-green/60" />
          <span className="text-[10px] uppercase tracking-[0.2em] text-terminal-muted/60">
            Secure Connection · Cloudflare Edge
          </span>
          <span className="live-dot" style={{ width: 4, height: 4 }} />
        </div>
      </div>
    </div>
  );
}
