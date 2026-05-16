# React: Crypto Price Tracker

**Difficulty:** Hard
**Time Limit:** 60 minutes
**Framework:** React + TypeScript
**Topics:** Polling, Dynamic Table, Search, Filter, Sort, useCallback, useMemo, Performance

---

## Problem Statement

Build a **Crypto Price Tracker** that fetches current price data from a mock endpoint and **auto-refreshes every 10 seconds** (polling). Render the data in a sortable table. Users can search by name or symbol, filter by market cap tier, and sort by any column. Optimize re-renders — the table must not recompute the filtered+sorted list on every poll if the filters haven't changed.

---

## Functional Requirements

- [ ] On mount, fetch from `fetchPrices()` and start a 10-second polling interval
- [ ] Show initial loading state; do NOT show loading on subsequent polls (silent refresh)
- [ ] Rows where price **increased** since last poll show the price in green with a ▲ indicator
- [ ] Rows where price **decreased** show in red with a ▼ indicator
- [ ] Unchanged rows show neutral color
- [ ] Search input filters by coin name or symbol (case-insensitive, real-time)
- [ ] Market cap tier filter: `"All"`, `"Large Cap (>$10B)"`, `"Mid Cap ($1B–$10B)"`, `"Small Cap (<$1B)"`
- [ ] Clicking a column header sorts by that column; toggle ascending/descending; sort icon shown
- [ ] Sortable columns: Name, Symbol, Price (USD), 24h Change (%), Market Cap, Volume (24h)
- [ ] Price change column shows formatted percentage with color (green = positive, red = negative)
- [ ] `"X coins"` count label
- [ ] Stop polling when component unmounts (cleanup)
- [ ] Use `useMemo` for the derived filtered+sorted list

---

## UI / Visual Specification

```
┌────────────────────────────────────────────────────────────────────────────┐
│  Crypto Price Tracker                  🔄 Last updated: 14:32:05  52 coins │
│                                                                             │
│  [🔍 Search by name or symbol...]    [Market Cap Tier ▼]                  │
│                                                                             │
│  ┌──────────┬────────┬──────────────┬───────────────┬────────────┬───────┐ │
│  │ Name ↑   │ Symbol │ Price (USD) ▼│  24h Change   │ Market Cap │ Vol.  │ │
│  ├──────────┼────────┼──────────────┼───────────────┼────────────┼───────┤ │
│  │ Bitcoin  │  BTC   │  $62,450.12  │  ▲ +2.34%    │ $1.23T     │ $28B  │ │
│  │ Ethereum │  ETH   │   $3,120.45  │  ▼ -0.87%    │  $374B     │ $12B  │ │
│  │ Solana   │  SOL   │     $145.32  │  ▲ +5.12%    │   $66B     │  $3B  │ │
│  │ ...      │        │              │               │            │       │ │
│  └──────────┴────────┴──────────────┴───────────────┴────────────┴───────┘ │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## Technical Requirements

**Must use:**
- `useState`, `useEffect`, `useMemo`, `useCallback`, `useRef`
- `useMemo` for the filtered + sorted list (dependencies: raw data, search, tier filter, sort config)
- `useRef` to hold the previous price snapshot for change detection (▲/▼)
- `useCallback` for sort header click handler
- TypeScript — all props and state typed

**Must NOT use:**
- External table libraries
- External state management libraries

**Constraints:**
- Polling interval is exactly 10 seconds; use `setInterval` with cleanup in `useEffect`
- The "last updated" timestamp updates on every successful poll
- Do NOT re-show the loading spinner on poll refreshes — only on the initial fetch
- `fetchPrices()` returns slightly mutated prices on each call to simulate live data — do not modify it

---

## Starter Files

**`CryptoPriceTracker.tsx`**
```tsx
import { useState, useEffect, useMemo, useCallback, useRef } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Coin {
  id: string;
  name: string;
  symbol: string;
  priceUsd: number;
  change24h: number;    // percentage, can be negative
  marketCapUsd: number;
  volumeUsd24h: number;
}

// ─── Mock API — do not modify ─────────────────────────────────────────────────

const BASE_DATA: Coin[] = [
  { id: "btc",  name: "Bitcoin",    symbol: "BTC",  priceUsd: 62450,  change24h: 2.34,   marketCapUsd: 1_230_000_000_000, volumeUsd24h: 28_000_000_000 },
  { id: "eth",  name: "Ethereum",   symbol: "ETH",  priceUsd: 3120,   change24h: -0.87,  marketCapUsd: 374_000_000_000,  volumeUsd24h: 12_000_000_000 },
  { id: "sol",  name: "Solana",     symbol: "SOL",  priceUsd: 145.32, change24h: 5.12,   marketCapUsd: 66_000_000_000,   volumeUsd24h: 3_000_000_000  },
  { id: "bnb",  name: "BNB",        symbol: "BNB",  priceUsd: 582.10, change24h: 1.20,   marketCapUsd: 85_000_000_000,   volumeUsd24h: 1_500_000_000  },
  { id: "xrp",  name: "XRP",        symbol: "XRP",  priceUsd: 0.62,   change24h: -2.10,  marketCapUsd: 34_000_000_000,   volumeUsd24h: 900_000_000    },
  { id: "ada",  name: "Cardano",    symbol: "ADA",  priceUsd: 0.48,   change24h: 0.55,   marketCapUsd: 17_000_000_000,   volumeUsd24h: 400_000_000    },
  { id: "avax", name: "Avalanche",  symbol: "AVAX", priceUsd: 38.10,  change24h: -1.40,  marketCapUsd: 15_000_000_000,   volumeUsd24h: 350_000_000    },
  { id: "doge", name: "Dogecoin",   symbol: "DOGE", priceUsd: 0.165,  change24h: 3.80,   marketCapUsd: 23_000_000_000,   volumeUsd24h: 700_000_000    },
  { id: "dot",  name: "Polkadot",   symbol: "DOT",  priceUsd: 7.42,   change24h: -0.30,  marketCapUsd: 9_500_000_000,    volumeUsd24h: 200_000_000    },
  { id: "link", name: "Chainlink",  symbol: "LINK", priceUsd: 14.80,  change24h: 2.90,   marketCapUsd: 8_700_000_000,    volumeUsd24h: 450_000_000    },
  { id: "matic",name: "Polygon",    symbol: "MATIC",priceUsd: 0.95,   change24h: -0.60,  marketCapUsd: 9_000_000_000,    volumeUsd24h: 380_000_000    },
  { id: "uni",  name: "Uniswap",    symbol: "UNI",  priceUsd: 9.20,   change24h: 1.10,   marketCapUsd: 6_900_000_000,    volumeUsd24h: 150_000_000    },
];

let _callCount = 0;
async function fetchPrices(): Promise<Coin[]> {
  await new Promise((res) => setTimeout(res, 200));
  _callCount++;
  return BASE_DATA.map((c) => ({
    ...c,
    priceUsd: c.priceUsd * (1 + (Math.random() - 0.5) * 0.004 * _callCount % 2),
    change24h: c.change24h + (Math.random() - 0.5) * 0.2,
  }));
}

// ─── Your implementation ──────────────────────────────────────────────────────

type SortKey = keyof Pick<Coin, "name" | "symbol" | "priceUsd" | "change24h" | "marketCapUsd" | "volumeUsd24h">;
type SortDir = "asc" | "desc";

interface SortConfig {
  key: SortKey;
  dir: SortDir;
}

export default function CryptoPriceTracker() {
  // TODO: implement
  return (
    <div>
      <h1>Crypto Price Tracker</h1>
    </div>
  );
}
```

---

## Acceptance Criteria / Test Cases

| # | Action | Expected Result |
|---|---|---|
| 1 | Page loads | Loading spinner once; table renders with 12 rows |
| 2 | After 10 seconds | Table updates silently — no spinner shown |
| 3 | Price went up on poll | Price cell shows green + ▲ indicator |
| 4 | Price went down on poll | Price cell shows red + ▼ indicator |
| 5 | Search `"bit"` | Only Bitcoin row visible |
| 6 | Filter `"Large Cap (>$10B)"` | Only BTC, ETH, SOL, BNB, others above $10B |
| 7 | Click "Price" header | Sorted by price descending (BTC first) |
| 8 | Click "Price" again | Ascending (cheapest coin first) |
| 9 | Unmount component | Polling stops; no console errors |
| 10 | Search + filter + sort all active | All three apply to displayed rows |

---

## Bonus (if time allows)

- Add a sparkline-style percentage bar behind the 24h change cell
- Show a `"LIVE"` indicator that pulses on each successful poll
- Allow pausing/resuming the auto-refresh via a button
