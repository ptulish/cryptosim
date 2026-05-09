# CryptoSim — Paper Trading Platform

A real-time crypto **paper trading** simulator with multi-account support.
Create an account, get a virtual $10,000, build a portfolio from the live
market, and watch your equity curve update second by second. Each account
gets a fully isolated portfolio — perfect for comparing strategies on the
same machine. No real money involved.

Built as a portfolio project to show off the things juniors usually skip:
WebSockets, custom hooks with proper cleanup, persistence, real auth via
Supabase, route guards, skeleton loading states, optimistic UI, and a
polished dark UI with glassmorphism modals.

![CryptoSim](public/favicon.svg)

## Highlights

- **Email + password accounts via Supabase Auth** — registration, sign-in
  and session refresh are delegated to Supabase, so passwords are hashed
  server-side and JWTs are auto-rotated. Sessions persist across refreshes
  and tabs; route guards bounce unauthenticated visitors to `/login`. Each
  account gets its own isolated cash, holdings, trades and equity curve —
  switch users on the same device and you'll see two completely independent
  portfolios.
- **Live prices via Binance WebSocket** — `wss://stream.binance.com:9443/stream`
  combined `@miniTicker` streams. The custom `useCryptoPrice` hook owns the
  socket lifecycle (open on mount, close on unmount, exponential-backoff
  reconnect) and flashes price tags green/red on every tick.
- **Top-50 market data via CoinGecko REST** — public endpoint, no API key.
  Cached in a `useCoinList` hook with `AbortController` cancellation and
  60-second background refresh.
- **Equity curve over time** — sampled every ~30 seconds with **adaptive
  multi-resolution storage** (30s for the last hour, 5min for the day, 1h
  for the week, 6h beyond). A 1H / 1D / 1W / 1M / ALL range selector filters
  the visible window, and the chart switches to date labels for ranges past
  two days. Total localStorage footprint stays ~1 KB regardless of how long
  the account has lived.
- **Portfolio allocation donut** — Recharts pie chart showing how equity is
  split across cash and each holding. Hover tooltips, color-coded legend
  with USD value + percentage per slice, total equity displayed in the
  donut hole.
- **Portfolio persistence** — Zustand + `persist` middleware writes cash,
  holdings, trades and equity history to `localStorage`, keyed per user.
  Refresh the page, everything is still there.
- **Glassmorphism Buy/Sell modal** — coupled USD ↔ token amount inputs,
  Max / 25 / 50 / 75% quick fills, ESC + backdrop close, scroll lock.
- **Skeleton loaders, animated counters, toast errors** (`sonner`) — every
  edge case has a polished UI state, including a network-error retry banner
  on the market page and a password-strength meter on the register form.

## Tech stack

| Concern        | Choice                                              |
| -------------- | --------------------------------------------------- |
| Framework      | React 18 + Vite 5                                   |
| Styling        | Tailwind CSS 3 (custom dark palette + animations)   |
| Routing        | React Router 6                                      |
| State          | Zustand (portfolio in `localStorage`, session via Supabase) |
| Auth           | [Supabase Auth](https://supabase.com/docs/guides/auth) (email + password) |
| Charts         | Recharts (sparklines + portfolio area chart)        |
| Icons          | lucide-react                                        |
| Notifications  | sonner                                              |
| Market data    | [CoinGecko](https://www.coingecko.com/en/api) REST  |
| Live prices    | [Binance](https://binance-docs.github.io/apidocs/spot/en/) WebSocket |

## Getting started

### 1. Create a free Supabase project

1. Go to <https://supabase.com>, sign up, and click **New project**. Pick any
   name and password, choose the closest region, hit **Create**.
2. Once the project is provisioned, open **Project Settings → API** and copy
   the **Project URL** and the **anon / public** key.
3. (Recommended for local dev) Open **Authentication → Providers → Email**
   and turn **Confirm email** off. Otherwise every new account has to click
   a confirmation link before signing in.

### 2. Configure the app

```bash
cp .env.example .env
# then edit .env and paste in the URL + anon key from step 1
```

### 3. Run it

```bash
npm install
npm run dev      # start Vite on http://localhost:5173
npm run build    # production bundle in dist/
npm run preview  # serve the built bundle

# Optional: smoke-test multi-resolution equity compaction
node scripts/smoke-equity.mjs
```

CoinGecko and Binance both work without API keys. The only env vars are the
Supabase ones.

On first visit you'll land on the register screen. Create an account, get
$10,000 of virtual cash, and start trading. Sign out from the user menu in
the top-right at any time; sign back in and your portfolio is exactly where
you left it.

## Project structure

```
src/
├── App.jsx                    # Routes (public + guarded) + data wiring
├── main.jsx
├── index.css                  # Tailwind layers + design tokens
├── components/
│   ├── AllocationChart.jsx    # Donut chart of holdings + cash
│   ├── AnimatedCounter.jsx    # rAF tween for big balance numbers
│   ├── AuthLayout.jsx         # Centered shell for login / register
│   ├── Modal.jsx              # Glassmorphism modal with ESC + scroll lock
│   ├── Navbar.jsx             # Top nav, WS status pulse, user menu
│   ├── PortfolioChart.jsx     # Equity-over-time area chart
│   ├── PriceTag.jsx           # Flashes green/red on tick
│   ├── RangeSelector.jsx      # 1H / 1D / 1W / 1M / ALL pills
│   ├── RequireAuth.jsx        # Route guard
│   ├── Skeleton.jsx           # Shimmer placeholders
│   ├── Sparkline.jsx          # Inline 7d charts
│   ├── TradeModal.jsx         # Buy / Sell flow
│   └── UserMenu.jsx           # Avatar dropdown with sign-out
├── hooks/
│   ├── useCoinList.js         # CoinGecko REST + interval refresh
│   ├── useCryptoPrice.js      # Binance WS subscription + cleanup
│   └── usePortfolioMetrics.js # Live valuation + equity sampling
├── lib/
│   ├── binance.js             # Combined-stream WebSocket client
│   ├── supabase.js            # Supabase client (reads VITE_SUPABASE_* env)
│   └── userRepo.js            # Supabase Auth wrapper (signUp / signIn / etc.)
├── pages/
│   ├── Dashboard.jsx          # Equity, positions, reset
│   ├── History.jsx            # Trade log table
│   ├── Login.jsx              # Sign-in flow
│   ├── Market.jsx             # Searchable + sortable top-50
│   └── Register.jsx           # Sign-up + strength meter
├── store/
│   ├── authStore.js           # Session + login/register/logout actions
│   └── portfolioStore.js      # Per-user wallets with persistence
└── utils/
    ├── api.js                 # CoinGecko fetch wrapper
    └── format.js              # USD / percent / date formatters
```

## Custom hooks worth a look

### `useCryptoPrice(coins)`

Subscribes to a Binance combined stream for the given coins. Internally:

1. Maps CoinGecko symbols to Binance pairs (e.g. `btc` → `btcusdt`), filtering
   out stablecoins that don't have a USDT pair.
2. Opens one WebSocket per unique pair-set, reusing the connection across
   re-renders by comparing the joined pair list.
3. On unmount or when the pair-set changes, the previous socket is closed and
   the reconnect timer is cancelled — no orphan sockets when navigating.

### `usePortfolioMetrics(prices, coinsById)`

Computes positions / total equity / PnL on every tick and pushes a sample to
the store every 4+ seconds so the equity-over-time chart has data without
growing unbounded.

## Authentication design

Auth runs through **Supabase Auth** (email + password). The Supabase client
takes care of password hashing, JWT issuance and silent token refresh; the
app code only sees a small, synchronous user record.

- `src/lib/supabase.js` — single Supabase client, reads
  `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from `.env`. Throws a
  loud, helpful error if either is missing.
- `src/lib/userRepo.js` — thin wrapper exposing `registerUser`,
  `authenticate`, `signOut`, `updateProfile`, `getCurrentUser` and a
  `subscribeAuth(cb)` helper. Maps the Supabase user into the public
  shape the UI expects: `{ id, email, displayName, createdAt }`. The
  `displayName` lives in `auth.users.user_metadata.display_name`.
- `src/store/authStore.js` — Zustand session store. On boot it hydrates
  from `supabase.auth.getSession()` and subscribes to
  `onAuthStateChange`, so cross-tab sign-out and silent token refresh
  are picked up automatically. No `persist` middleware here — Supabase
  already persists the session in `localStorage`.
- `src/components/RequireAuth.jsx` — route guard. Renders nothing while
  the initial session hydration is in flight (otherwise every refresh
  flashes `/login`), then either passes through or redirects while
  remembering the originally-requested path.
- `src/store/portfolioStore.js` — wallets are keyed by `userId` (now the
  Supabase user UUID), so two accounts on the same device still get
  fully isolated cash, holdings, trade history and equity curves.

> The anon key is safe to ship to clients: it only grants whatever your
> Supabase Row Level Security policies allow. Never put the
> `service_role` key in the front-end bundle.

## Going further

The portfolio data (cash, holdings, trades, equity history) still lives in
`localStorage` — that's intentional for now, so the app works offline and
keeps a fast feel. The persistence layer is isolated in
`src/store/portfolioStore.js`, ready to be swapped for Supabase Postgres
tables (with RLS scoped to `auth.uid()`) when cross-device sync is needed.

Other ideas to extend:

- Move portfolios into Supabase Postgres for real cross-device sync
- Password reset flow (`supabase.auth.resetPasswordForEmail`)
- OAuth providers (Google / GitHub) via the same `userRepo` wrapper
- Limit / stop orders that match against the live ticker
- Public leaderboards comparing equity curves across users
- Per-asset detail page with the CoinGecko `/market_chart` data already wired

## License

MIT — use it as a portfolio piece, fork it, or rip out the hooks for your own
project.
