import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth';
import { api } from '@/lib/api';

export function AuthCallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
    // Parse token from URL hash fragment
    const hash = window.location.hash.slice(1); // remove #
    const params = new URLSearchParams(hash);
    const token = params.get('token');
    const userStr = params.get('user');

    if (token && userStr) {
      try {
        const user = JSON.parse(decodeURIComponent(userStr));
        api.setToken(token);
        useAuthStore.setState({
          user,
          token,
          isAuthenticated: true,
        });
        navigate('/dashboard', { replace: true });
      } catch {
        navigate('/login?error=invalid_callback', { replace: true });
      }
    } else {
      navigate('/login?error=missing_token', { replace: true });
    }
  }, [navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-terminal-bg">
      <div className="flex items-center gap-3 text-terminal-muted">
        <div className="h-2 w-2 rounded-full bg-neon-cyan animate-pulse" />
        Signing you in...
      </div>
    </div>
  );
}
