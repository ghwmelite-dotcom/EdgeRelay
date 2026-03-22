import { Outlet, useLocation, Link } from 'react-router-dom';

export function AuthLayout() {
  const location = useLocation();
  const isLogin = location.pathname === '/login';

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-terminal-bg px-4">
      {/* Atmospheric layers */}
      <div className="bg-grid absolute inset-0 pointer-events-none" />
      <div className="ambient-glow" />
      <div className="noise-overlay" />
      <div className="scan-line" />

      <div className="relative z-10 w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="text-center animate-fade-in-up" style={{ animationDelay: '0ms' }}>
          <h1 className="font-display text-3xl font-black tracking-tight">
            <span className="text-white">Edge</span>
            <span className="glow-text-cyan text-neon-cyan">Relay</span>
          </h1>
          <p className="mt-2 text-sm text-terminal-muted">
            {isLogin ? 'Sign in to your trading terminal' : 'Create your trading account'}
          </p>
        </div>

        {/* Form card */}
        <div className="glass border-gradient rounded-2xl p-6 shadow-2xl animate-fade-in-scale">
          <Outlet />
        </div>

        {/* Footer link */}
        <p className="text-center text-sm text-terminal-muted animate-fade-in-up" style={{ animationDelay: '120ms' }}>
          {isLogin ? (
            <>
              Need an account?{' '}
              <Link to="/register" className="text-neon-cyan hover:underline focus-ring rounded">
                Register
              </Link>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <Link to="/login" className="text-neon-cyan hover:underline focus-ring rounded">
                Login
              </Link>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
