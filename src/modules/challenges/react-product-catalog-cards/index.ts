import type { Challenge } from "@/lib/challenges/types";

const reactProductCatalogCards: Challenge = {
  slug: "react-product-catalog-cards",
  title: "Product Catalog Cards",
  description:
    "Fetch products from a mock REST endpoint and render them as a responsive card grid. Implement real-time search by name, category dropdown filter, and sort by price or rating — all applied simultaneously to the same derived list.",
  difficulty: "intermediate",
  tags: ["react", "typescript", "hooks", "api-fetching", "search", "filter", "sort"],
  environment: "react-ts",
  entryFile: "App.tsx",
  problemStatement: `# Product Catalog Cards

**Difficulty:** Intermediate | **Time Limit:** 45 minutes

---

## Problem Statement

Build a **Product Catalog** page that fetches a list of products from a mock REST endpoint and renders them as a responsive grid of product cards. Users must be able to search by product name, filter by category, and sort by price or rating.

---

## Functional Requirements

- On mount, fetch products from \`fetchProducts()\` and render as cards
- Show a loading state while the fetch is in progress
- Show an error message if the fetch fails
- Each card displays: product image, name, category badge, price, and rating (stars out of 5)
- Search input filters cards by product name (case-insensitive, real-time)
- Category dropdown filters cards to a single category (\`"All"\` shows everything)
- Sort dropdown supports: \`"Price: Low to High"\`, \`"Price: High to Low"\`, \`"Rating: Best First"\`
- Search + filter + sort all apply **simultaneously**
- Show \`"No products found."\` when the combined result is empty
- Card count label: \`"Showing X of Y products"\`

---

## Technical Requirements

**Must use:**
- \`useState\`, \`useEffect\`
- A reusable \`ProductCard\` component (extracted from the catalog)
- TypeScript — all props and state typed

**Constraints:**
- All three controls must operate on the same derived list — do NOT run three separate fetches
- \`fetchProducts()\` simulates a 400ms delay — do not modify it

---

## Acceptance Criteria

| # | Action | Expected Result |
|---|---|---|
| 1 | Page loads | Loading state shown, then 12 product cards rendered |
| 2 | Type \`"key"\` in search | Cards filtered to Wireless Keyboard + Mechanical Keyboard |
| 3 | Select category \`"Furniture"\` | Cards filtered to Standing Desk, Ergonomic Chair, Desk Lamp |
| 4 | Type \`"key"\` AND select \`"Tech"\` | Both filters apply simultaneously |
| 5 | Sort \`"Price: Low to High"\` | Cards reorder cheapest first |
| 6 | Sort \`"Rating: Best First"\` | Mechanical Keyboard (4.9) appears first |
| 7 | Type \`"zzz"\` | \`"No products found."\` message shown |
| 9 | Count label | Reflects current filtered count vs total |
`,
  files: [
    {
      filename: "App.tsx",
      language: "tsx",
      content: `import { useState, useEffect } from "react";
import "./styles.css";

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
  { id: 1,  name: "Wireless Keyboard",        category: "Tech",      price: 79.99,   rating: 4.8, imageUrl: "https://placehold.co/200x140?text=Keyboard" },
  { id: 2,  name: "Gaming Laptop",            category: "Tech",      price: 1299.99, rating: 4.5, imageUrl: "https://placehold.co/200x140?text=Laptop"   },
  { id: 3,  name: "Standing Desk",            category: "Furniture", price: 449.00,  rating: 4.2, imageUrl: "https://placehold.co/200x140?text=Desk"     },
  { id: 4,  name: 'Monitor 27"',              category: "Tech",      price: 349.00,  rating: 3.9, imageUrl: "https://placehold.co/200x140?text=Monitor"  },
  { id: 5,  name: "Noise Cancelling Headset", category: "Accessory", price: 59.99,   rating: 4.6, imageUrl: "https://placehold.co/200x140?text=Headset"  },
  { id: 6,  name: "Ergonomic Chair",          category: "Furniture", price: 599.00,  rating: 4.7, imageUrl: "https://placehold.co/200x140?text=Chair"    },
  { id: 7,  name: "USB-C Hub",                category: "Accessory", price: 39.99,   rating: 4.1, imageUrl: "https://placehold.co/200x140?text=Hub"      },
  { id: 8,  name: "Mechanical Keyboard",      category: "Tech",      price: 129.99,  rating: 4.9, imageUrl: "https://placehold.co/200x140?text=Mech"     },
  { id: 9,  name: "Desk Lamp",                category: "Furniture", price: 34.99,   rating: 3.7, imageUrl: "https://placehold.co/200x140?text=Lamp"     },
  { id: 10, name: "Webcam 4K",                category: "Tech",      price: 199.99,  rating: 4.4, imageUrl: "https://placehold.co/200x140?text=Webcam"   },
  { id: 11, name: "Mouse Pad XL",             category: "Accessory", price: 19.99,   rating: 4.3, imageUrl: "https://placehold.co/200x140?text=Pad"      },
  { id: 12, name: "Monitor Arm",              category: "Accessory", price: 89.99,   rating: 4.0, imageUrl: "https://placehold.co/200x140?text=Arm"      },
];

async function fetchProducts(): Promise<Product[]> {
  await new Promise((res) => setTimeout(res, 400));
  return MOCK_PRODUCTS;
}

// ─── ProductCard component ────────────────────────────────────────────────────

interface ProductCardProps {
  product: Product;
}

function ProductCard({ product }: ProductCardProps) {
  // TODO: render product image, name, category badge, price, and star rating
  // Tip: Math.round(product.rating) gives integer stars out of 5
  return (
    <div className="product-card">
      <p>{product.name}</p>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

type SortOption = "price-asc" | "price-desc" | "rating-desc";

export default function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // TODO: add state for search, selectedCategory, and sortOption
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [sortOption, setSortOption] = useState<SortOption>("price-asc");

  useEffect(() => {
    // TODO: call fetchProducts(), update products/loading/error state
  }, []);

  // TODO: derive the list of unique categories from products
  const categories: string[] = [];

  // TODO: compute filteredProducts by applying search + category filter + sort
  // Hint: filter first, then sort — avoid mutating state directly (use .slice() before .sort())
  const filteredProducts: Product[] = [];

  if (loading) return <div className="status-msg">Loading products...</div>;
  if (error) return <div className="status-msg error">{error}</div>;

  return (
    <div className="catalog">
      <div className="catalog-header">
        <h1>Product Catalog</h1>
        {/* TODO: render count label — "Showing X of Y products" */}
      </div>

      <div className="controls">
        {/* TODO: search <input> bound to search state */}
        {/* TODO: category <select> bound to selectedCategory state, options from categories */}
        {/* TODO: sort <select> bound to sortOption state */}
      </div>

      {filteredProducts.length === 0 ? (
        <p className="status-msg">No products found.</p>
      ) : (
        <div className="product-grid">
          {filteredProducts.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
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
  background: #f9fafb;
  color: #111;
}

.catalog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

h1 { margin: 0; font-size: 1.5rem; }

.controls {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 20px;
}

.controls input,
.controls select {
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
}

.controls input { flex: 1; min-width: 160px; }

.product-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 16px;
}

.product-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.product-card img {
  width: 100%;
  border-radius: 6px;
}

.category-badge {
  display: inline-block;
  padding: 2px 8px;
  background: #ede9fe;
  color: #5b21b6;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
}

.product-name { font-weight: 600; font-size: 14px; }
.product-price { font-size: 15px; color: #059669; font-weight: 700; }
.product-rating { font-size: 13px; color: #f59e0b; }

.status-msg {
  text-align: center;
  padding: 40px;
  color: #6b7280;
  font-size: 15px;
}

.status-msg.error { color: #ef4444; }
`,
    },
  ],
};

export default reactProductCatalogCards;
