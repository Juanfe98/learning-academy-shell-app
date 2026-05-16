import type { Challenge } from "@/lib/challenges/types";

const reactMemoization: Challenge = {
  slug: "react-memoization",
  title: "React: Memoization — useMemo, useCallback & React.memo",
  description:
    "Fix a deliberately unoptimized component tree. Use React.memo, useMemo, and useCallback correctly to prevent unnecessary re-renders. A render counter helps you verify the optimization is working.",
  difficulty: "intermediate",
  tags: ["react", "memoization", "useMemo", "useCallback", "React.memo", "performance", "hooks"],
  environment: "react-js",
  entryFile: "App.jsx",
  problemStatement: `## Problem Statement

The app renders a searchable product list. The **starter code has three deliberate performance bugs**. Your job is to identify and fix all three using the correct memoization tool.

A **render counter badge** on each component shows how many times it has re-rendered. Your goal: make each component re-render **only when its data actually changes**.

---

## The Three Bugs

### Bug 1 — \`StatsSummary\` re-renders on every keystroke
\`StatsSummary\` displays average price and count. These values depend only on \`products\` (the full dataset), yet the component re-renders every time the search input changes.

**Fix:** Memoize the derived stats with \`useMemo\` AND prevent the component re-rendering with \`React.memo\`.

---

### Bug 2 — \`ProductCard\` re-renders for all cards when one changes
Each \`ProductCard\` only needs its own \`product\` and \`onToggleFavorite\`. But every card re-renders whenever ANY card is favorited.

**Fix:** Wrap \`ProductCard\` with \`React.memo\`. Verify the card's props are stable.

---

### Bug 3 — \`onToggleFavorite\` callback is recreated every render
The \`onToggleFavorite\` function is defined inline, so it gets a new reference on every parent render — defeating \`React.memo\` on \`ProductCard\`.

**Fix:** Wrap \`onToggleFavorite\` in \`useCallback\` with the correct dependency array.

---

## Success Criteria

After your fixes:
1. Typing in the search input → **only** \`SearchInput\` and \`ProductList\` re-render (NOT \`StatsSummary\`).
2. Favoriting a card → **only that card** re-renders (NOT all other cards).
3. The render counters in the UI confirm this behavior.

---

## Rules

- Do **not** change the component structure or split/merge files.
- Do **not** move state up or down.
- Only add \`React.memo\`, \`useMemo\`, and \`useCallback\` where needed.
`,
  files: [
    {
      filename: "App.jsx",
      language: "jsx",
      content: `import { useState } from "react";
import SearchInput from "./SearchInput";
import StatsSummary from "./StatsSummary";
import ProductList from "./ProductList";
import { PRODUCTS } from "./data";

export default function App() {
  const [search, setSearch] = useState("");
  const [favorites, setFavorites] = useState(new Set());

  // BUG 3: This function is recreated on every render → breaks React.memo on ProductCard
  // TODO: wrap in useCallback with correct deps
  function handleToggleFavorite(id) {
    setFavorites((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  // BUG 1: These values are recomputed on every render (including search keystrokes)
  // TODO: wrap in useMemo — depends only on PRODUCTS (stable)
  const avgPrice = PRODUCTS.reduce((sum, p) => sum + p.price, 0) / PRODUCTS.length;
  const totalCount = PRODUCTS.length;

  const filtered = PRODUCTS.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="app">
      <h1>Product Catalog</h1>
      {/* BUG 1: StatsSummary re-renders on every keystroke — fix with React.memo */}
      <StatsSummary avgPrice={avgPrice} totalCount={totalCount} />
      <SearchInput value={search} onChange={setSearch} />
      <ProductList
        products={filtered}
        favorites={favorites}
        onToggleFavorite={handleToggleFavorite}
      />
    </div>
  );
}
`,
    },
    {
      filename: "StatsSummary.jsx",
      language: "jsx",
      content: `import { useRenderCount } from "./useRenderCount";

// BUG 1: This component re-renders on every parent render.
// TODO: wrap with React.memo so it only re-renders when avgPrice or totalCount change.
function StatsSummary({ avgPrice, totalCount }) {
  const count = useRenderCount();
  return (
    <div className="stats">
      <RenderBadge count={count} label="StatsSummary" />
      <div className="stat">
        <span className="stat-label">Total Products</span>
        <span className="stat-value">{totalCount}</span>
      </div>
      <div className="stat">
        <span className="stat-label">Avg Price</span>
        <span className="stat-value">${"{"}avgPrice.toFixed(2){"}"}</span>
      </div>
    </div>
  );
}

function RenderBadge({ count, label }) {
  return (
    <div className="render-badge" title={\`\${label} has rendered \${count} time(s)\`}>
      🔄 {count}
    </div>
  );
}

export default StatsSummary;
`,
    },
    {
      filename: "SearchInput.jsx",
      language: "jsx",
      content: `import { useRenderCount } from "./useRenderCount";

export default function SearchInput({ value, onChange }) {
  const count = useRenderCount();
  return (
    <div className="search-wrapper">
      <span className="render-badge">🔄 {count}</span>
      <input
        className="search-input"
        type="text"
        placeholder="Search products…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
`,
    },
    {
      filename: "ProductList.jsx",
      language: "jsx",
      content: `import ProductCard from "./ProductCard";

export default function ProductList({ products, favorites, onToggleFavorite }) {
  return (
    <div className="product-list">
      {products.length === 0 && <p className="empty">No products found.</p>}
      {products.map((p) => (
        <ProductCard
          key={p.id}
          product={p}
          isFavorite={favorites.has(p.id)}
          onToggleFavorite={onToggleFavorite}
        />
      ))}
    </div>
  );
}
`,
    },
    {
      filename: "ProductCard.jsx",
      language: "jsx",
      content: `import { useRenderCount } from "./useRenderCount";

// BUG 2: Every card re-renders when ANY card is favorited.
// TODO: wrap with React.memo so each card only re-renders when its own props change.
function ProductCard({ product, isFavorite, onToggleFavorite }) {
  const count = useRenderCount();
  return (
    <div className={\`product-card \${isFavorite ? "favorited" : ""}\`}>
      <span className="render-badge">🔄 {count}</span>
      <div className="card-info">
        <span className="card-name">{product.name}</span>
        <span className="card-meta">{product.category} · ${"{"}product.price{"}"}</span>
      </div>
      <button
        className={\`fav-btn \${isFavorite ? "active" : ""}\`}
        onClick={() => onToggleFavorite(product.id)}
      >
        {isFavorite ? "★" : "☆"}
      </button>
    </div>
  );
}

export default ProductCard;
`,
    },
    {
      filename: "useRenderCount.js",
      language: "js",
      readOnly: true,
      content: `import { useRef } from "react";

/** Returns how many times the calling component has rendered. */
export function useRenderCount() {
  const count = useRef(0);
  count.current += 1;
  return count.current;
}
`,
    },
    {
      filename: "data.js",
      language: "js",
      readOnly: true,
      content: `export const PRODUCTS = [
  { id:  1, name: "MacBook Pro",       category: "Electronics", price: 1999 },
  { id:  2, name: "AirPods Pro",       category: "Electronics", price:  249 },
  { id:  3, name: "iPad Mini",         category: "Electronics", price:  499 },
  { id:  4, name: "Galaxy S24",        category: "Electronics", price: 1099 },
  { id:  5, name: "USB-C Hub",         category: "Accessories", price:   49 },
  { id:  6, name: "Running Shoes",     category: "Sports",      price:  129 },
  { id:  7, name: "Yoga Mat",          category: "Sports",      price:   39 },
  { id:  8, name: "Resistance Bands",  category: "Sports",      price:   29 },
  { id:  9, name: "Protein Powder",    category: "Health",      price:   55 },
  { id: 10, name: "Clean Code (book)", category: "Books",       price:   45 },
  { id: 11, name: "The Pragmatic Programmer", category: "Books", price:  49 },
  { id: 12, name: "Coffee Maker",      category: "Home",        price:  299 },
  { id: 13, name: "Air Purifier",      category: "Home",        price:  349 },
  { id: 14, name: "Desk Lamp",         category: "Home",        price:   59 },
  { id: 15, name: "Mechanical Keyboard", category: "Accessories", price: 159 },
];
`,
    },
    {
      filename: "styles.css",
      language: "css",
      content: `* { box-sizing: border-box; margin: 0; padding: 0; }

body { font-family: system-ui, sans-serif; background: #f3f4f6; color: #111827; padding: 20px; }

.app { max-width: 700px; margin: 0 auto; }
h1 { font-size: 1.5rem; font-weight: 700; margin-bottom: 16px; }

.render-badge {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 7px;
  background: #fef3c7;
  border: 1px solid #fcd34d;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  color: #92400e;
  position: absolute;
  top: 8px;
  right: 8px;
}

.stats {
  position: relative;
  display: flex;
  gap: 24px;
  padding: 14px 16px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  margin-bottom: 12px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.04);
}
.stat { display: flex; flex-direction: column; gap: 2px; }
.stat-label { font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.04em; font-weight: 600; }
.stat-value { font-size: 18px; font-weight: 700; color: #111827; }

.search-wrapper { position: relative; margin-bottom: 12px; }
.search-input {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid #d1d5db;
  border-radius: 10px;
  font-size: 14px;
  outline: none;
  background: #fff;
}
.search-input:focus { border-color: #6366f1; box-shadow: 0 0 0 2px rgba(99,102,241,0.15); }

.product-list { display: flex; flex-direction: column; gap: 8px; }

.product-card {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  padding-right: 50px; /* room for badge */
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.04);
  transition: border-color 150ms;
}
.product-card.favorited { border-color: #fcd34d; background: #fffbeb; }
.card-info { display: flex; flex-direction: column; gap: 2px; }
.card-name { font-weight: 600; font-size: 14px; }
.card-meta { font-size: 12px; color: #6b7280; }

.fav-btn {
  font-size: 20px;
  background: none;
  border: none;
  cursor: pointer;
  color: #d1d5db;
  transition: color 150ms, transform 150ms;
  padding: 4px;
  flex-shrink: 0;
}
.fav-btn:hover { color: #fbbf24; transform: scale(1.2); }
.fav-btn.active { color: #f59e0b; }

.empty { color: #9ca3af; font-style: italic; padding: 20px; text-align: center; }
`,
    },
  ],
};

export default reactMemoization;
