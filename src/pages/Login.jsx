import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { toast } from 'sonner';
import { AuthLayout } from '../components/AuthLayout.jsx';
import { useAuthStore } from '../store/authStore.js';

export function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const submitting = useAuthStore((s) => s.status === 'submitting');
  const login = useAuthStore((s) => s.login);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [reveal, setReveal] = useState(false);
  const [error, setError] = useState(null);

  if (user) {
    return <Navigate to={location.state?.from ?? '/'} replace />;
  }

  const onSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    const result = await login({ email, password });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    toast.success(`Welcome back, ${result.user.displayName}`);
    navigate(location.state?.from ?? '/', { replace: true });
  };

  return (
    <AuthLayout
      title="Sign in to CryptoSim"
      subtitle="Access your virtual portfolio and trade history."
      footer={
        <>
          New here?{' '}
          <Link to="/register" className="text-brand-400 hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Email">
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="input"
          />
        </Field>

        <Field label="Password">
          <div className="relative">
            <input
              type={reveal ? 'text' : 'password'}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="input pr-10"
            />
            <button
              type="button"
              onClick={() => setReveal((r) => !r)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-500 transition-colors hover:bg-bg-elevated hover:text-slate-200"
              aria-label={reveal ? 'Hide password' : 'Show password'}
            >
              {reveal ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </Field>

        {error && (
          <div className="rounded-lg border border-danger-500/30 bg-danger-500/10 px-3 py-2 text-xs text-danger-400">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="btn-primary w-full"
        >
          <LogIn className="h-4 w-4" />
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </AuthLayout>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </span>
      {children}
    </label>
  );
}
