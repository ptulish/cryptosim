import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore.js';

/**
 * Route guard — redirects unauthenticated visitors to /login while remembering
 * the page they tried to reach so we can return them after sign-in.
 *
 * While Supabase is hydrating its session from localStorage we render nothing
 * for one paint, otherwise every page refresh would briefly flash the login
 * screen before the session resolves.
 */
export function RequireAuth({ children }) {
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.status === 'loading');
  const location = useLocation();
  if (loading) return null;
  if (!user) {
    return (
      <Navigate to="/login" replace state={{ from: location.pathname }} />
    );
  }
  return children;
}
