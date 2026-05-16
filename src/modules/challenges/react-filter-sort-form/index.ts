import type { Challenge } from "@/lib/challenges/types";

const reactFilterSortForm: Challenge = {
  slug: "react-filter-sort-form",
  title: "React: Filter, Sort & Dropdown Form",
  description:
    "Given a products dataset, build a filter form where dropdown options are derived dynamically from the data. Filter by category and brand, sort by price or name, and show a live count of results.",
  difficulty: "intermediate",
  tags: ["react", "filtering", "sorting", "forms", "dropdowns", "useMemo", "controlled-components"],
  environment: "react-js",
  entryFile: "App.jsx",
  problemStatement: `## Problem Statement

You have a **products dataset** already imported. Build a filter form whose dropdown options are **derived dynamically** from the data — no hardcoded option lists.

Edit:
- \`FilterForm.jsx\` — controlled dropdowns + Clear button
- \`ProductList.jsx\` — filtered/sorted results + count
- \`App.jsx\` — state + filtering/sorting logic

---

## Dropdowns Required

| Dropdown | Options derived from | Default option |
|---|---|---|
| **Category** | unique \`category\` values in data | \`"All Categories"\` |
| **Brand** | unique \`brand\` values **matching current category** | \`"All Brands"\` |
| **Sort By** | hardcoded list | \`"Default"\` |

Sort options: \`"Price: Low → High"\`, \`"Price: High → Low"\`, \`"Name: A → Z"\`, \`"Rating: Best First"\`

---

## Filter Behavior

- Category and Brand filters work **together** (AND logic).
- When Category changes → reset Brand to \`""\`.
- Brand dropdown shows only brands available **within the selected category** (not all brands in the dataset).
- Sort applies **after** filtering.

---

## Results Display

- Show each product: name, brand, category, price, rating (stars ★).
- Show count: **"Showing X of Y products"** above the list.
- When no products match: show **"No products match the current filters."**

---

## Clear Filters

A **Clear Filters** button resets all dropdowns to their default empty values.

---

## Constraints

- Derive unique option values with \`Array.from(new Set(...))\` or similar — do not hardcode.
- The Brand dropdown must be **context-aware**: if Category = "Electronics", Brand only shows electronics brands.
`,
  files: [
    {
      filename: "App.jsx",
      language: "jsx",
      content: `import { useState, useMemo } from "react";
import FilterForm from "./FilterForm";
import ProductList from "./ProductList";
import { PRODUCTS } from "./data";

export default function App() {
  // TODO: state for category (""), brand (""), sortBy ("")
  const category = "";
  const brand = "";
  const sortBy = "";

  // TODO: derive unique categories from PRODUCTS (sorted A-Z)
  const categories = [];

  // TODO: derive unique brands — only from products matching current category
  // If category === "", show all brands
  const brands = [];

  // TODO: compute filteredAndSorted from PRODUCTS:
  //   1. filter by category (if set)
  //   2. filter by brand (if set)
  //   3. sort based on sortBy value
  const filteredAndSorted = PRODUCTS;

  function handleCategoryChange(value) {
    // TODO: set category, reset brand to ""
  }

  function handleBrandChange(value) {
    // TODO: set brand
  }

  function handleSortChange(value) {
    // TODO: set sortBy
  }

  function handleClear() {
    // TODO: reset all three to ""
  }

  return (
    <div className="app">
      <h1>Product Catalog</h1>
      <FilterForm
        category={category}
        brand={brand}
        sortBy={sortBy}
        categories={categories}
        brands={brands}
        onCategoryChange={handleCategoryChange}
        onBrandChange={handleBrandChange}
        onSortChange={handleSortChange}
        onClear={handleClear}
      />
      <ProductList products={filteredAndSorted} total={PRODUCTS.length} />
    </div>
  );
}
`,
    },
    {
      filename: "FilterForm.jsx",
      language: "jsx",
      content: `const SORT_OPTIONS = [
  { value: "price-asc",   label: "Price: Low → High" },
  { value: "price-desc",  label: "Price: High → Low" },
  { value: "name-asc",    label: "Name: A → Z" },
  { value: "rating-desc", label: "Rating: Best First" },
];

export default function FilterForm({
  category, brand, sortBy,
  categories, brands,
  onCategoryChange, onBrandChange, onSortChange, onClear,
}) {
  return (
    <div className="filter-form">
      {/* TODO: Category <select> — value={category}, onChange calls onCategoryChange */}
      {/* Options: "All Categories" as default + categories.map(...) */}
      <select value={category} onChange={() => {}}>
        <option value="">All Categories</option>
      </select>

      {/* TODO: Brand <select> — value={brand}, onChange calls onBrandChange */}
      {/* Options: "All Brands" as default + brands.map(...) */}
      <select value={brand} onChange={() => {}}>
        <option value="">All Brands</option>
      </select>

      {/* TODO: Sort By <select> — value={sortBy}, onChange calls onSortChange */}
      {/* Options: "Default" as default + SORT_OPTIONS.map(...) */}
      <select value={sortBy} onChange={() => {}}>
        <option value="">Default</option>
      </select>

      {/* TODO: Clear Filters button — calls onClear */}
      <button onClick={onClear}>Clear Filters</button>
    </div>
  );
}
`,
    },
    {
      filename: "ProductList.jsx",
      language: "jsx",
      content: `export default function ProductList({ products, total }) {
  // TODO: show "Showing X of Y products" above the list
  // TODO: if products.length === 0 show "No products match the current filters."
  // TODO: map products to cards showing: name, brand, category, price ($X.XX), rating (★X.X)
  return (
    <div>
      <p className="count">Showing {products.length} of {total} products</p>
      <div className="product-grid">
        {products.map((p) => (
          <div key={p.id} className="product-card">
            <p className="product-name">{p.name}</p>
            <p className="product-meta">{p.brand} · {p.category}</p>
            <p className="product-price">{"$"}{p.price.toFixed(2)}</p>
            <p className="product-rating">{"★"}{p.rating.toFixed(1)}</p>
          </div>
        ))}
        {products.length === 0 && (
          <p className="empty">No products match the current filters.</p>
        )}
      </div>
    </div>
  );
}
`,
    },
    {
      filename: "data.js",
      language: "js",
      readOnly: true,
      content: `export const PRODUCTS = [
  { id:  1, name: "MacBook Pro 14",      category: "Electronics", brand: "Apple",   price: 1999, rating: 4.8 },
  { id:  2, name: "iPhone 15 Pro",        category: "Electronics", brand: "Apple",   price: 1099, rating: 4.7 },
  { id:  3, name: "AirPods Pro",          category: "Electronics", brand: "Apple",   price:  249, rating: 4.6 },
  { id:  4, name: "Galaxy S24 Ultra",     category: "Electronics", brand: "Samsung", price: 1299, rating: 4.5 },
  { id:  5, name: "65\" QLED TV",         category: "Electronics", brand: "Samsung", price:  799, rating: 4.4 },
  { id:  6, name: "USB-C Hub 7-in-1",    category: "Electronics", brand: "Anker",   price:   49, rating: 4.5 },
  { id:  7, name: "PowerBank 26800mAh",  category: "Electronics", brand: "Anker",   price:   69, rating: 4.6 },
  { id:  8, name: "Running Shoes Air",   category: "Sports",      brand: "Nike",    price:  129, rating: 4.3 },
  { id:  9, name: "Training Shorts",     category: "Sports",      brand: "Nike",    price:   45, rating: 4.2 },
  { id: 10, name: "Ultraboost Shoes",    category: "Sports",      brand: "Adidas",  price:  189, rating: 4.4 },
  { id: 11, name: "Yoga Mat Premium",    category: "Sports",      brand: "Adidas",  price:   59, rating: 4.5 },
  { id: 12, name: "Resistance Bands",    category: "Sports",      brand: "TRX",     price:   39, rating: 4.3 },
  { id: 13, name: "Clean Code",          category: "Books",       brand: "O'Reilly",price:   45, rating: 4.8 },
  { id: 14, name: "The Pragmatic Programmer", category: "Books",  brand: "O'Reilly",price:   49, rating: 4.7 },
  { id: 15, name: "You Don't Know JS",   category: "Books",       brand: "O'Reilly",price:   39, rating: 4.6 },
  { id: 16, name: "JavaScript: The Good Parts", category: "Books", brand: "O'Reilly",price: 29, rating: 4.5 },
  { id: 17, name: "Design Patterns",     category: "Books",       brand: "GoF",     price:   55, rating: 4.7 },
  { id: 18, name: "Coffee Maker Pro",    category: "Home",        brand: "Breville",price:  299, rating: 4.6 },
  { id: 19, name: "Air Purifier 400",    category: "Home",        brand: "Dyson",   price:  349, rating: 4.5 },
  { id: 20, name: "Robot Vacuum V15",    category: "Home",        brand: "Dyson",   price:  749, rating: 4.7 },
  { id: 21, name: "Stand Mixer KitchenAid", category: "Home",    brand: "Breville",price:  449, rating: 4.8 },
];
`,
    },
    {
      filename: "styles.css",
      language: "css",
      content: `* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: system-ui, -apple-system, sans-serif;
  background: #f3f4f6;
  color: #111827;
  padding: 24px;
}

.app { max-width: 900px; margin: 0 auto; }

h1 {
  font-size: 1.75rem;
  font-weight: 700;
  margin-bottom: 20px;
  color: #111827;
}

.filter-form {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  padding: 16px;
  background: #fff;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  margin-bottom: 20px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
}

.filter-form select {
  flex: 1 1 160px;
  padding: 9px 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  background: #fff;
  color: #374151;
  cursor: pointer;
  outline: none;
}

.filter-form select:focus { border-color: #6366f1; box-shadow: 0 0 0 2px rgba(99,102,241,0.2); }

.filter-form button {
  padding: 9px 18px;
  background: #f3f4f6;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  color: #374151;
  cursor: pointer;
  font-weight: 500;
  transition: background 150ms;
}

.filter-form button:hover { background: #e5e7eb; }

.count {
  font-size: 14px;
  color: #6b7280;
  margin-bottom: 12px;
  font-weight: 500;
}

.product-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
}

.product-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.04);
  transition: box-shadow 150ms;
}

.product-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
.product-name { font-weight: 600; font-size: 14px; color: #111827; }
.product-meta { font-size: 12px; color: #9ca3af; }
.product-price { font-size: 16px; font-weight: 700; color: #6366f1; margin-top: 4px; }
.product-rating { font-size: 13px; color: #f59e0b; }
.empty { color: #9ca3af; font-style: italic; padding: 24px; text-align: center; grid-column: 1/-1; }
`,
    },
  ],
};

export default reactFilterSortForm;
