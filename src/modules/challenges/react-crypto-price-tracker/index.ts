import type { Challenge } from "@/lib/challenges/types";

const reactCryptoPriceTracker: Challenge = {
  slug: "react-crypto-price-tracker",
  title: "Crypto Price Tracker",
  description:
    "Build a live crypto table that polls every 10 seconds. Use useMemo for the filtered+sorted list, useRef to track previous prices for ▲/▼ indicators, and useCallback for column sort handlers. Polling must stop on unmount.",
  difficulty: "advanced",
  tags: ["react", "typescript", "polling", "useMemo", "useCallback", "useRef", "dynamic-table", "performance"],
  environment: "react-ts",
  entryFile: "App.tsx",
  problemStatement: `# Crypto Price Tracker

**Difficulty:** Advanced | **Time Limit:** 60 minutes

---

## Problem Statement

Build a **Crypto Price Tracker** that fetches price data from a mock endpoint and **auto-refreshes every 10 seconds** (polling). Render in a sortable table. Optimize re-renders — use \`useMemo\` so the filtered+sorted list only recomputes when filters change, not on every render.

---

## Functional Requirements

- On mount, fetch from \`fetchPrices()\` and start a 10-second polling interval
- Show initial loading state; **do NOT** show loading on subsequent polls (silent refresh)
- Rows where price **increased** since last poll → price in green with ▲
- Rows where price **decreased** → red with ▼; unchanged → neutral
- Search filters by coin name or symbol (case-insensitive, real-time)
- Market cap tier: \`"All"\`, \`"Large Cap (>$10B)"\`, \`"Mid Cap ($1B–$10B)"\`, \`"Small Cap (<$1B)"\`
- Clicking a column header sorts by that column; toggle asc/desc; sort icon shown
- Sortable: Name, Symbol, Price (USD), 24h Change (%), Market Cap, Volume (24h)
- \`"X coins"\` count label; "Last updated" timestamp on each poll
- Stop polling on unmount (cleanup in \`useEffect\`)

---

## Technical Requirements

**Must use:**
- \`useState\`, \`useEffect\`, \`useMemo\`, \`useCallback\`, \`useRef\`
- \`useMemo\` for filtered+sorted list — dependencies: coins, search, tier, sortConfig
- \`useRef\` to store previous price snapshot for ▲/▼ detection
- \`useCallback\` for the column header click handler
- TypeScript — all props and state typed

**Constraints:**
- Polling interval exactly 10 seconds; \`setInterval\` with cleanup
- \`fetchPrices()\` returns mutated prices each call — do not modify it
- No loading spinner after the first successful fetch

---

## Acceptance Criteria

| # | Action | Expected Result |
|---|---|---|
| 1 | Page loads | Spinner once; table with 12 rows |
| 2 | After 10s | Table updates silently |
| 3 | Price up on poll | Green ▲ in price cell |
| 4 | Price down on poll | Red ▼ in price cell |
| 5 | Search \`"bit"\` | Only Bitcoin row |
| 6 | Filter \`"Large Cap (>$10B)"\` | BTC, ETH, SOL, BNB, DOGE, XRP visible |
| 7 | Click "Price" header | Sorted descending (BTC first) |
| 8 | Click "Price" again | Sorted ascending (cheapest first) |
| 9 | Unmount | Polling stops; no errors |
| 10 | Search + filter + sort combined | All three apply |
`,
  files: [
    {
      filename: "App.tsx",
      language: "tsx",
      content: `import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import "./styles.css";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Coin {
  id: string;
  name: string;
  symbol: string;
  priceUsd: number;
  change24h: number;
  marketCapUsd: number;
  volumeUsd24h: number;
}

type SortKey = keyof Pick<Coin, "name" | "symbol" | "priceUsd" | "change24h" | "marketCapUsd" | "volumeUsd24h">;
type SortDir = "asc" | "desc";
type CapTier = "All" | "Large Cap (>$10B)" | "Mid Cap ($1B-$10B)" | "Small Cap (<$1B)";

interface SortConfig {
  key: SortKey;
  dir: SortDir;
}

// ─── Mock API — do not modify ─────────────────────────────────────────────────

const BASE_DATA: Coin[] = [
  { id: "btc",  name: "Bitcoin",   symbol: "BTC",  priceUsd: 62450,  change24h: 2.34,  marketCapUsd: 1_230_000_000_000, volumeUsd24h: 28_000_000_000 },
  { id: "eth",  name: "Ethereum",  symbol: "ETH",  priceUsd: 3120,   change24h: -0.87, marketCapUsd: 374_000_000_000,  volumeUsd24h: 12_000_000_000 },
  { id: "sol",  name: "Solana",    symbol: "SOL",  priceUsd: 145.32, change24h: 5.12,  marketCapUsd: 66_000_000_000,   volumeUsd24h: 3_000_000_000  },
  { id: "bnb",  name: "BNB",       symbol: "BNB",  priceUsd: 582.10, change24h: 1.20,  marketCapUsd: 85_000_000_000,   volumeUsd24h: 1_500_000_000  },
  { id: "xrp",  name: "XRP",       symbol: "XRP",  priceUsd: 0.62,   change24h: -2.10, marketCapUsd: 34_000_000_000,   volumeUsd24h: 900_000_000    },
  { id: "ada",  name: "Cardano",   symbol: "ADA",  priceUsd: 0.48,   change24h: 0.55,  marketCapUsd: 17_000_000_000,   volumeUsd24h: 400_000_000    },
  { id: "avax", name: "Avalanche", symbol: "AVAX", priceUsd: 38.10,  change24h: -1.40, marketCapUsd: 15_000_000_000,   volumeUsd24h: 350_000_000    },
  { id: "doge", name: "Dogecoin",  symbol: "DOGE", priceUsd: 0.165,  change24h: 3.80,  marketCapUsd: 23_000_000_000,   volumeUsd24h: 700_000_000    },
  { id: "dot",  name: "Polkadot",  symbol: "DOT",  priceUsd: 7.42,   change24h: -0.30, marketCapUsd: 9_500_000_000,    volumeUsd24h: 200_000_000    },
  { id: "link", name: "Chainlink", symbol: "LINK", priceUsd: 14.80,  change24h: 2.90,  marketCapUsd: 8_700_000_000,    volumeUsd24h: 450_000_000    },
  { id: "matic",name: "Polygon",   symbol: "MATIC",priceUsd: 0.95,   change24h: -0.60, marketCapUsd: 9_000_000_000,    volumeUsd24h: 380_000_000    },
  { id: "uni",  name: "Uniswap",   symbol: "UNI",  priceUsd: 9.20,   change24h: 1.10,  marketCapUsd: 6_900_000_000,    volumeUsd24h: 150_000_000    },
];

let _callCount = 0;
async function fetchPrices(): Promise<Coin[]> {
  await new Promise((res) => setTimeout(res, 200));
  _callCount++;
  return BASE_DATA.map((c) => ({
    ...c,
    priceUsd: c.priceUsd * (1 + (Math.random() - 0.5) * 0.004 * (_callCount % 2)),
    change24h: c.change24h + (Math.random() - 0.5) * 0.2,
  }));
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatUsd(n: number): string {
  if (n >= 1_000_000_000_000) return \`$\${(n / 1_000_000_000_000).toFixed(2)}T\`;
  if (n >= 1_000_000_000)     return \`$\${(n / 1_000_000_000).toFixed(1)}B\`;
  if (n >= 1_000_000)         return \`$\${(n / 1_000_000).toFixed(1)}M\`;
  return \`$\${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}\`;
}

// ─── Main component ───────────────────────────────────────────────────────────

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: "name",          label: "Name"         },
  { key: "symbol",        label: "Symbol"       },
  { key: "priceUsd",      label: "Price (USD)"  },
  { key: "change24h",     label: "24h Change"   },
  { key: "marketCapUsd",  label: "Market Cap"   },
  { key: "volumeUsd24h",  label: "Volume (24h)" },
];

export default function App() {
  const [coins, setCoins] = useState<Coin[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const [search, setSearch] = useState("");
  const [capTier, setCapTier] = useState<CapTier>("All");
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: "marketCapUsd", dir: "desc" });

  // useRef to store the previous price snapshot for ▲/▼ detection
  // prevPricesRef.current is a Record<coinId, priceUsd>
  const prevPricesRef = useRef<Record<string, number>>({});

  useEffect(() => {
    // TODO: fetch once immediately, then set up a 10-second interval
    // On each successful fetch:
    //   1. Update prevPricesRef.current with the OLD coin prices before calling setCoins
    //   2. Call setCoins(newData)
    //   3. Call setLastUpdated(new Date())
    //   4. Only call setLoading(false) if this is the first fetch
    // Return a cleanup function that clears the interval
  }, []);

  // TODO: implement handleHeaderClick with useCallback
  // If clicking the same column: toggle dir; different column: set asc
  const handleHeaderClick = useCallback((key: SortKey) => {
    // TODO
  }, [sortConfig]);

  // TODO: compute filteredCoins with useMemo
  // Dependencies: coins, search, capTier, sortConfig
  // 1. Filter by search (name or symbol, case-insensitive)
  // 2. Filter by capTier:
  //    - "Large Cap (>$10B)": marketCapUsd > 10_000_000_000
  //    - "Mid Cap ($1B-$10B)": between 1B and 10B
  //    - "Small Cap (<$1B)": < 1_000_000_000
  // 3. Sort by sortConfig.key and sortConfig.dir
  const filteredCoins = useMemo<Coin[]>(() => {
    return []; // TODO: replace with real implementation
  }, [coins, search, capTier, sortConfig]);

  if (loading) return <div className="status-msg">Loading prices...</div>;

  return (
    <div className="tracker">
      <div className="tracker-header">
        <h1>Crypto Price Tracker</h1>
        <div className="header-right">
          {lastUpdated && (
            <span className="last-updated">
              🔄 Last updated: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <span className="count">{filteredCoins.length} coins</span>
        </div>
      </div>

      <div className="controls">
        <input
          className="search-input"
          placeholder="Search by name or symbol..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="tier-select"
          value={capTier}
          onChange={(e) => setCapTier(e.target.value as CapTier)}
        >
          <option value="All">All</option>
          <option value="Large Cap (>$10B)">Large Cap (&gt;$10B)</option>
          <option value="Mid Cap ($1B-$10B)">Mid Cap ($1B–$10B)</option>
          <option value="Small Cap (<$1B)">Small Cap (&lt;$1B)</option>
        </select>
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              {COLUMNS.map((col) => {
                const isActive = sortConfig.key === col.key;
                const arrow = isActive ? (sortConfig.dir === "asc" ? " ↑" : " ↓") : "";
                return (
                  <th
                    key={col.key}
                    className="sortable"
                    onClick={() => handleHeaderClick(col.key)}
                  >
                    {col.label}{arrow}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {filteredCoins.map((coin) => {
              const prevPrice = prevPricesRef.current[coin.id];
              const trend = prevPrice === undefined ? "neutral"
                : coin.priceUsd > prevPrice ? "up"
                : coin.priceUsd < prevPrice ? "down"
                : "neutral";

              return (
                <tr key={coin.id}>
                  <td>{coin.name}</td>
                  <td className="symbol">{coin.symbol}</td>
                  {/* TODO: render price cell with trend class and ▲/▼ indicator */}
                  <td className={\`price \${trend}\`}>
                    {formatUsd(coin.priceUsd)}
                    {trend === "up" && " ▲"}
                    {trend === "down" && " ▼"}
                  </td>
                  {/* TODO: render 24h change % with green/red color */}
                  <td className={coin.change24h >= 0 ? "positive" : "negative"}>
                    {coin.change24h >= 0 ? "+" : ""}{coin.change24h.toFixed(2)}%
                  </td>
                  <td>{formatUsd(coin.marketCapUsd)}</td>
                  <td>{formatUsd(coin.volumeUsd24h)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {filteredCoins.length === 0 && (
        <p className="status-msg">No coins match your search.</p>
      )}
    </div>
  );
}
`,
    },
    {
      filename: "styles.css",
      language: "css",
      content: `* { box-sizing: border-box; }

body {
  margin: 0;
  padding: 16px;
  font-family: system-ui, sans-serif;
  background: #0f172a;
  color: #e2e8f0;
}

.tracker-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}

h1 { margin: 0; font-size: 1.4rem; }

.header-right {
  display: flex;
  align-items: center;
  gap: 14px;
}

.last-updated { font-size: 12px; color: #94a3b8; }
.count { font-size: 13px; color: #94a3b8; }

.controls {
  display: flex;
  gap: 10px;
  margin-bottom: 14px;
}

.search-input,
.tier-select {
  padding: 7px 11px;
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 6px;
  color: #e2e8f0;
  font-size: 13px;
}

.search-input { flex: 1; }

.table-wrapper {
  overflow-x: auto;
  border: 1px solid #1e293b;
  border-radius: 8px;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

thead { background: #1e293b; }

th {
  padding: 10px 14px;
  text-align: left;
  font-weight: 600;
  color: #94a3b8;
  border-bottom: 1px solid #334155;
  white-space: nowrap;
  cursor: pointer;
  user-select: none;
}

th:hover { color: #e2e8f0; }
th.sortable.active { color: #818cf8; }

td {
  padding: 10px 14px;
  border-bottom: 1px solid #1e293b;
}

tr:last-child td { border-bottom: none; }
tr:hover td { background: #1e293b44; }

.symbol { color: #94a3b8; font-family: monospace; }

.price.up { color: #4ade80; }
.price.down { color: #f87171; }

.positive { color: #4ade80; }
.negative { color: #f87171; }

.status-msg {
  text-align: center;
  padding: 40px;
  color: #64748b;
  font-size: 15px;
}
`,
    },
  ],
};

export default reactCryptoPriceTracker;
