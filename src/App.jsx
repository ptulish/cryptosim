import { useEffect, useMemo } from 'react';
import { Route, Routes } from 'react-router-dom';
import { Toaster, toast } from 'sonner';
import { Navbar } from './components/Navbar.jsx';
import { RequireAuth } from './components/RequireAuth.jsx';
import { Dashboard } from './pages/Dashboard.jsx';
import { Market } from './pages/Market.jsx';
import { History } from './pages/History.jsx';
import { Login } from './pages/Login.jsx';
import { Register } from './pages/Register.jsx';
import { useCoinList } from './hooks/useCoinList.js';
import { useCryptoPrice } from './hooks/useCryptoPrice.js';
import { usePortfolioMetrics } from './hooks/usePortfolioMetrics.js';
import { useMyHoldings } from './store/portfolioStore.js';
import { useAuthStore } from './store/authStore.js';

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/*"
          element={
            <RequireAuth>
              <AuthenticatedApp />
            </RequireAuth>
          }
        />
      </Routes>

      <Toaster
        theme="dark"
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#11131a',
            border: '1px solid #1f2230',
            color: '#e2e8f0',
          },
        }}
      />
    </>
  );
}

/**
 * The main authenticated experience. Mounts only when a user is signed in,
 * which keeps the API/WebSocket lifecycles off the login screen and means
 * data hooks can safely assume `user` exists downstream.
 */
function AuthenticatedApp() {
  const userId = useAuthStore((s) => s.user.id);
  const { coins, loading, error, refresh } = useCoinList({ perPage: 50 });

  const holdings = useMyHoldings();
  const subscribed = useMemo(() => {
    const seen = new Set();
    const list = [];
    for (const c of coins) {
      if (seen.has(c.id)) continue;
      seen.add(c.id);
      list.push({ id: c.id, symbol: c.symbol });
    }
    for (const h of Object.values(holdings)) {
      if (seen.has(h.id)) continue;
      seen.add(h.id);
      list.push({ id: h.id, symbol: h.symbol });
    }
    return list;
  }, [coins, holdings]);

  const { prices, status } = useCryptoPrice(subscribed);

  const coinsById = useMemo(() => {
    const map = {};
    for (const c of coins) map[c.id] = c;
    return map;
  }, [coins]);

  const metrics = usePortfolioMetrics(prices, coinsById);

  useEffect(() => {
    if (!error) return;
    toast.error('Market data unavailable', {
      id: 'coingecko-error',
      description: error.message ?? 'CoinGecko request failed',
      action: { label: 'Retry', onClick: () => refresh() },
    });
  }, [error, refresh]);

  // Touching userId here keeps the linter happy and makes intent explicit:
  // every hook above is implicitly scoped to the signed-in user's slice.
  void userId;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar wsStatus={status} />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <Routes>
          <Route
            path="/"
            element={
              <Dashboard
                coinsById={coinsById}
                prices={prices}
                metrics={metrics}
                loading={loading && coins.length === 0}
              />
            }
          />
          <Route
            path="/market"
            element={
              <Market
                coins={coins}
                prices={prices}
                loading={loading}
                error={error}
                onRefresh={refresh}
              />
            }
          />
          <Route path="/history" element={<History />} />
        </Routes>
      </main>

      <footer className="border-t border-border-subtle px-4 py-4 text-center text-xs text-slate-500 sm:px-6">
        CryptoSim · Paper trading only — data via{' '}
        <a
          href="https://www.coingecko.com/en/api"
          target="_blank"
          rel="noreferrer"
          className="underline-offset-2 hover:text-slate-300 hover:underline"
        >
          CoinGecko
        </a>{' '}
        and{' '}
        <a
          href="https://binance-docs.github.io/apidocs/spot/en/"
          target="_blank"
          rel="noreferrer"
          className="underline-offset-2 hover:text-slate-300 hover:underline"
        >
          Binance
        </a>
      </footer>
    </div>
  );
}
