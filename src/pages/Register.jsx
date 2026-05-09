import { useMemo, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Sparkles, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { AuthLayout } from '../components/AuthLayout.jsx';
import { useAuthStore } from '../store/authStore.js';
import { classNames } from '../utils/format.js';

export function Register() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const submitting = useAuthStore((s) => s.status === 'submitting');
  const register = useAuthStore((s) => s.register);

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [reveal, setReveal] = useState(false);
  const [error, setError] = useState(null);

  const strength = useMemo(() => scorePassword(password), [password]);

  if (user) return <Navigate to="/" replace />;

  const onSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    const result = await register({ email, password, displayName });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    toast.success(`Account created · welcome, ${result.user.displayName}!`, {
      description: "You've been credited with $10,000 of virtual cash.",
    });
    navigate('/', { replace: true });
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Start with $10,000 virtual cash and build your paper portfolio."
      footer={
        <>
          Already have one?{' '}
          <Link to="/login" className="text-brand-400 hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Display name (optional)">
          <input
            type="text"
            autoComplete="nickname"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Satoshi"
            className="input"
          />
        </Field>

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
              autoComplete="new-password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
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
          <PasswordMeter strength={strength} hasInput={password.length > 0} />
        </Field>

        <Field label="Confirm password">
          <input
            type={reveal ? 'text' : 'password'}
            autoComplete="new-password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Type it again"
            className="input"
          />
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
          <UserPlus className="h-4 w-4" />
          {submitting ? 'Creating account…' : 'Create account'}
        </button>

        <p className="flex items-center justify-center gap-1.5 text-xs text-slate-500">
          <Sparkles className="h-3 w-3" />
          Accounts are stored locally · no server, no real money
        </p>
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

function scorePassword(pwd) {
  if (!pwd) return 0;
  let score = 0;
  if (pwd.length >= 6) score += 1;
  if (pwd.length >= 10) score += 1;
  if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score += 1;
  if (/\d/.test(pwd)) score += 1;
  if (/[^A-Za-z0-9]/.test(pwd)) score += 1;
  return Math.min(score, 4);
}

function PasswordMeter({ strength, hasInput }) {
  if (!hasInput) return null;
  const colors = [
    'bg-danger-500',
    'bg-amber-400',
    'bg-amber-300',
    'bg-brand-400',
    'bg-brand-500',
  ];
  const labels = ['Too weak', 'Weak', 'Fair', 'Good', 'Strong'];
  return (
    <div className="mt-2 space-y-1">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={classNames(
              'h-1 flex-1 rounded-full transition-colors',
              i < strength ? colors[strength] : 'bg-border-subtle',
            )}
          />
        ))}
      </div>
      <div className="text-[11px] text-slate-500">{labels[strength]}</div>
    </div>
  );
}
