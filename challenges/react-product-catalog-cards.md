# React: Product Catalog Cards

**Difficulty:** Easy/Medium
**Time Limit:** 45 minutes
**Framework:** React + TypeScript
**Topics:** API Fetching, useState, useEffect, Reusable Components, Search, Filter, Sort

---

## Problem Statement

Build a **Product Catalog** page that fetches a list of products from a mock REST endpoint and renders them as a responsive grid of product cards. Users must be able to search by product name, filter by category, and sort by price.

---

## Functional Requirements

- [ ] On mount, fetch products from `fetchProducts()` and render as cards
- [ ] Show a loading state while the fetch is in progress
- [ ] Show an error message if the fetch fails
- [ ] Each card displays: product image (placeholder), name, category badge, price, and rating (stars out of 5)
- [ ] Search input filters cards by product name (case-insensitive, real-time)
- [ ] Category dropdown filters cards to a single category (`"All"` shows everything)
- [ ] Sort dropdown supports: `"Price: Low to High"`, `"Price: High to Low"`, `"Rating: Best First"`
- [ ] Search + filter + sort all apply simultaneously
- [ ] Show `"No products found."` when the combined result is empty
- [ ] Card count label: `"Showing X of Y products"`

---

## UI / Visual Specification

```
┌────────────────────────────────────────────────────────────────┐
│  Product Catalog                       Showing 6 of 12 products │
│                                                                  │
│  [🔍 Search products...  ]  [Category ▼]  [Sort by ▼]          │
│                                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │  [img]   │  │  [img]   │  │  [img]   │  │  [img]   │       │
│  │ Laptop   │  │ Keyboard │  │ Monitor  │  │ Headset  │       │
│  │ [Tech]   │  │ [Tech]   │  │ [Tech]   │  │[Accessory│       │
│  │ $999.99  │  │ $79.99   │  │ $349.00  │  │ $59.99   │       │
│  │ ★★★★☆    │  │ ★★★★★    │  │ ★★★☆☆    │  │ ★★★★☆    │       │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
└────────────────────────────────────────────────────────────────┘
```

**States & Behavior:**
- **Loading:** skeleton cards or spinner shown in place of grid
- **Error:** error banner with message, grid hidden
- **Empty search/filter result:** `"No products found."` centered in grid area
- **Active filter chip (optional bonus):** show applied category badge next to count

---

## Technical Requirements

**Must use:**
- `useState`, `useEffect`
- A reusable `ProductCard` component (extracted from the catalog)
- TypeScript — all props and state typed

**Must NOT use:**
- External component libraries (MUI, Chakra, etc.)
- External filter/sort utilities

**Constraints:**
- All three controls (search, filter, sort) must operate on the same derived list — do NOT run three separate fetches
- `fetchProducts()` simulates a 400ms delay — do not modify it

---

## Starter Files

**`ProductCatalog.tsx`**
```tsx
import { useState, useEffect } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
  rating: number;
  imageUrl: string;
}

// ─── Mock API — do not modify ─────────────────────────────────────────────────

const MOCK_PRODUCTS: Product[] = [
  { id: 1,  name: "Wireless Keyboard",   category: "Tech",       price: 79.99,  rating: 4.8, imageUrl: "https://placehold.co/200x140?text=Keyboard" },
  { id: 2,  name: "Gaming Laptop",       category: "Tech",       price: 1299.99, rating: 4.5, imageUrl: "https://placehold.co/200x140?text=Laptop" },
  { id: 3,  name: "Standing Desk",       category: "Furniture",  price: 449.00, rating: 4.2, imageUrl: "https://placehold.co/200x140?text=Desk" },
  { id: 4,  name: "Monitor 27\"",        category: "Tech",       price: 349.00, rating: 3.9, imageUrl: "https://placehold.co/200x140?text=Monitor" },
  { id: 5,  name: "Noise Cancelling Headset", category: "Accessory", price: 59.99, rating: 4.6, imageUrl: "https://placehold.co/200x140?text=Headset" },
  { id: 6,  name: "Ergonomic Chair",     category: "Furniture",  price: 599.00, rating: 4.7, imageUrl: "https://placehold.co/200x140?text=Chair" },
  { id: 7,  name: "USB-C Hub",           category: "Accessory",  price: 39.99,  rating: 4.1, imageUrl: "https://placehold.co/200x140?text=Hub" },
  { id: 8,  name: "Mechanical Keyboard", category: "Tech",       price: 129.99, rating: 4.9, imageUrl: "https://placehold.co/200x140?text=Mech" },
  { id: 9,  name: "Desk Lamp",           category: "Furniture",  price: 34.99,  rating: 3.7, imageUrl: "https://placehold.co/200x140?text=Lamp" },
  { id: 10, name: "Webcam 4K",           category: "Tech",       price: 199.99, rating: 4.4, imageUrl: "https://placehold.co/200x140?text=Webcam" },
  { id: 11, name: "Mouse Pad XL",        category: "Accessory",  price: 19.99,  rating: 4.3, imageUrl: "https://placehold.co/200x140?text=Pad" },
  { id: 12, name: "Monitor Arm",         category: "Accessory",  price: 89.99,  rating: 4.0, imageUrl: "https://placehold.co/200x140?text=Arm" },
];

async function fetchProducts(): Promise<Product[]> {
  await new Promise((res) => setTimeout(res, 400));
  return MOCK_PRODUCTS;
}

// ─── Your implementation ──────────────────────────────────────────────────────

interface ProductCardProps {
  product: Product;
}

function ProductCard({ product }: ProductCardProps) {
  // TODO: implement card
  return <div>{product.name}</div>;
}

export default function ProductCatalog() {
  // TODO: implement

  return (
    <div>
      <h1>Product Catalog</h1>
      {/* TODO: search input, category dropdown, sort dropdown */}
      {/* TODO: product grid */}
    </div>
  );
}
```

---

## Acceptance Criteria / Test Cases

| # | Action | Expected Result |
|---|---|---|
| 1 | Page loads | Loading state shown, then 12 product cards rendered |
| 2 | Type `"key"` in search | Cards filtered to Wireless Keyboard + Mechanical Keyboard |
| 3 | Select category `"Furniture"` | Cards filtered to Standing Desk, Ergonomic Chair, Desk Lamp |
| 4 | Type `"key"` AND select category `"Tech"` | Both filters apply simultaneously |
| 5 | Select sort `"Price: Low to High"` | Cards reorder cheapest first ($19.99 → ...) |
| 6 | Select sort `"Rating: Best First"` | Mechanical Keyboard (4.9) appears first |
| 7 | Type `"zzz"` | `"No products found."` message shown |
| 8 | Type `"key"`, then clear input | All 12 cards shown again |
| 9 | Count label shown at all times | Reflects current filtered count vs total |
