import { LineChart } from 'lucide-react';

/**
 * Centered shell used by Login + Register screens. The market data and
 * portfolio chrome are not rendered here on purpose — auth pages should
 * feel like a separate, distraction-free flow.
 */
export function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border-subtle bg-bg-base/60 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-brand-500 to-accent-500">
              <LineChart className="h-4 w-4 text-bg-base" strokeWidth={2.5} />
            </span>
            <span className="text-base font-semibold tracking-tight">
              Crypto<span className="text-brand-400">Sim</span>
            </span>
          </div>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-md animate-fade-in">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-semibold tracking-tight text-balance">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-1.5 text-sm text-slate-500">{subtitle}</p>
            )}
          </div>

          <div className="card-elevated p-6 sm:p-7">{children}</div>

          {footer && (
            <div className="mt-4 text-center text-sm text-slate-400">
              {footer}
            </div>
          )}
        </div>
      </main>

      <footer className="border-t border-border-subtle px-4 py-4 text-center text-xs text-slate-500">
        Demo paper-trading platform · Accounts stored locally on this device
      </footer>
    </div>
  );
}
