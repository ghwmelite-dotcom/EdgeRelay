import { Outlet, useLocation, Link } from 'react-router-dom';

export function AuthLayout() {
  const location = useLocation();
  const isLogin = location.pathname === '/login';

  return (
    <div className="noise-overlay relative flex min-h-screen items-center justify-center bg-terminal-bg px-4">
      <div className="bg-grid absolute inset-0 pointer-events-none" />

      <div className="relative z-10 w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="text-center">
          <h1 className="font-display text-3xl font-bold tracking-tight">
            <span className="text-white">Edge</span>
            <span className="text-neon-cyan">Relay</span>
          </h1>
          <p className="mt-2 text-sm text-terminal-muted">
            {isLogin ? 'Sign in to your trading terminal' : 'Create your trading account'}
          </p>
        </div>

        {/* Form card */}
        <div className="animate-fade-in-up rounded-xl border border-terminal-border bg-terminal-surface p-6 shadow-2xl">
          <Outlet />
        </div>

        {/* Footer link */}
        <p className="text-center text-sm text-terminal-muted">
          {isLogin ? (
            <>
              Need an account?{' '}
              <Link to="/register" className="text-neon-cyan hover:underline focus:outline-none focus:ring-2 focus:ring-neon-cyan/40 rounded">
                Register
              </Link>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <Link to="/login" className="text-neon-cyan hover:underline focus:outline-none focus:ring-2 focus:ring-neon-cyan/40 rounded">
                Login
              </Link>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
