# CryptoSim — Paper Trading Platform

A real-time crypto **paper trading** simulator with multi-account support.
Create an account, get a virtual $10,000, build a portfolio from the live
market, and watch your equity curve update second by second. Each account
gets a fully isolated portfolio — perfect for comparing strategies on the
same machine. No real money involved.

Built as a portfolio project to show off the things juniors usually skip:
WebSockets, custom hooks with proper cleanup, persistence, password hashing,
route guards, skeleton loading states, optimistic UI, and a polished dark UI
with glassmorphism modals.

![CryptoSim](public/favicon.svg)

## Highlights

- **Email + password accounts** — register / login flow with PBKDF2-SHA256
  password hashing via the Web Crypto API, per-user 16-byte salts, 120k
  iterations. Sessions persist across refreshes; route guards bounce
  unauthenticated visitors to `/login`. Each account gets its own isolated
  cash, holdings, trades and equity curve — switch users on the same device
  and you'll see two completely independent portfolios.
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
| State          | Zustand with `persist` (localStorage)               |
| Charts         | Recharts (sparklines + portfolio area chart)        |
| Icons          | lucide-react                                        |
| Notifications  | sonner                                              |
| Market data    | [CoinGecko](https://www.coingecko.com/en/api) REST  |
| Live prices    | [Binance](https://binance-docs.github.io/apidocs/spot/en/) WebSocket |

## Getting started

```bash
npm install
npm run dev      # start Vite on http://localhost:5173
npm run build    # production bundle in dist/
npm run preview  # serve the built bundle

# Optional: smoke-test the auth path (PBKDF2 + repo round-trip)
node scripts/smoke-auth.mjs
# Optional: smoke-test multi-resolution equity compaction
node scripts/smoke-equity.mjs
```

No environment variables needed — both APIs are public.

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
│   ├── passwordHash.js        # PBKDF2 hash / verify via Web Crypto
│   └── userRepo.js            # User CRUD (swap for Supabase here)
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

Auth is intentionally implemented client-side so the project keeps its
zero-config story (no env vars, no backend to host). The structure mirrors
what you'd build on a server:

- `src/lib/passwordHash.js` — wraps `crypto.subtle.deriveBits` with PBKDF2
  (SHA-256, 120 000 iterations, 16-byte salt, 32-byte key). Comparison is
  XOR-accumulated to discourage trivial timing attacks.
- `src/lib/userRepo.js` — the only file that touches `localStorage` for
  user records. Swap its body for a Supabase / REST client and the rest of
  the app keeps working unchanged.
- `src/store/authStore.js` — Zustand session store with `persist`
  middleware that **only** stores the public user record (id, email,
  displayName, createdAt). Password material never leaves `userRepo`.
- `src/components/RequireAuth.jsx` — route guard that redirects to
  `/login` while preserving the originally-requested path so the user
  lands back where they tried to go.
- `src/store/portfolioStore.js` — wallets are keyed by userId, so two
  accounts on the same device get fully isolated cash, holdings, trade
  history and equity curves.

> ⚠️ This is demo-grade auth: a real product would hash on the server,
> store records in a real database, and use HTTP-only session cookies.
> The shape is correct (per-user salt, slow KDF, never expose hashes),
> just the trust boundary is wrong for a production app.

## Going further

This project intentionally uses `localStorage` for persistence so it works
zero-config on a static host. The persistence layer is isolated in two
files — `src/lib/userRepo.js` (auth) and `src/store/portfolioStore.js`
(wallets) — so swapping for Supabase, Firebase or your own Express + SQL
backend is a contained change.

Other ideas to extend:

- Email verification + password reset flow on top of a real auth provider
- Limit / stop orders that match against the live ticker
- Public leaderboards comparing equity curves across users
- Per-asset detail page with the CoinGecko `/market_chart` data already wired
- Sync portfolios across devices via Supabase realtime

## License

MIT — use it as a portfolio piece, fork it, or rip out the hooks for your own
project.
