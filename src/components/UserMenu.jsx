import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, LogOut, User } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '../store/authStore.js';
import { classNames } from '../utils/format.js';

export function UserMenu() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onClick = (e) => {
      if (!ref.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!user) return null;

  const initials = (user.displayName || user.email || '?')
    .split(/[\s@.]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={classNames(
          'flex items-center gap-2 rounded-lg border border-border-subtle bg-bg-elevated/60 py-1.5 pl-1.5 pr-2 text-sm transition-colors',
          'hover:border-border-strong hover:bg-bg-elevated',
        )}
      >
        <span className="grid h-6 w-6 place-items-center rounded-md bg-gradient-to-br from-brand-500 to-accent-500 text-[11px] font-semibold text-bg-base">
          {initials || <User className="h-3 w-3" />}
        </span>
        <span className="hidden max-w-[120px] truncate sm:inline">
          {user.displayName}
        </span>
        <ChevronDown
          className={classNames(
            'h-3.5 w-3.5 text-slate-400 transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-60 origin-top-right animate-scale-in overflow-hidden rounded-xl border border-border-subtle bg-bg-elevated shadow-2xl">
          <div className="border-b border-border-subtle px-4 py-3">
            <div className="text-sm font-medium text-slate-100">
              {user.displayName}
            </div>
            <div className="mt-0.5 truncate text-xs text-slate-500">
              {user.email}
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              logout();
              setOpen(false);
              toast.success('Signed out');
              navigate('/login', { replace: true });
            }}
            className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-slate-300 transition-colors hover:bg-bg-base/50 hover:text-slate-100"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
