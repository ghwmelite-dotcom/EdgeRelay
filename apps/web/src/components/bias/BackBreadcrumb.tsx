// Smart breadcrumb for the public bias pages. Points to /dashboard when
// the user is signed in, and to the landing page (/) when they aren't —
// so logged-out / expired-session visitors don't get punted into the
// login flow when they click "back".
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuthStore } from '@/stores/auth';

interface BackBreadcrumbProps {
  /** Secondary crumbs rendered after the home/dashboard root. */
  trail?: Array<{ label: string; to?: string }>;
}

export function BackBreadcrumb({ trail = [] }: BackBreadcrumbProps) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const rootTo    = isAuthenticated ? '/dashboard' : '/';
  const rootLabel = isAuthenticated ? 'Dashboard' : 'Home';

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-[11px] text-terminal-muted">
      <Link to={rootTo} className="inline-flex items-center gap-1 hover:text-neon-cyan transition-colors">
        <ChevronLeft size={12} />
        {rootLabel}
      </Link>
      {trail.map((crumb, i) => {
        const isLast = i === trail.length - 1;
        return (
          <span key={i} className="inline-flex items-center gap-2">
            <ChevronRight size={10} className="text-terminal-muted/60" />
            {crumb.to && !isLast ? (
              <Link to={crumb.to} className="hover:text-neon-cyan transition-colors">
                {crumb.label}
              </Link>
            ) : (
              <span className={isLast ? 'text-slate-300' : 'text-terminal-muted'}>
                {crumb.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
