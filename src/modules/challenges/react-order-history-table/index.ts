import type { Challenge } from "@/lib/challenges/types";

const reactOrderHistoryTable: Challenge = {
  slug: "react-order-history-table",
  title: "Order History Table",
  description:
    "Fetch an orders response that includes a dynamic columns config. Render a sortable table with search, status filter tabs, and date range inputs. A stats bar above the table (total orders, revenue, avg order value) must update with every filter change. Revenue excludes Cancelled orders.",
  difficulty: "advanced",
  tags: ["react", "typescript", "custom-hook", "dynamic-table", "date-range-filter", "aggregate-stats", "sort"],
  environment: "react-ts",
  entryFile: "App.tsx",
  problemStatement: `# Order History Table

**Difficulty:** Advanced | **Time Limit:** 60 minutes

---

## Problem Statement

Build an **Order History** dashboard. Fetch orders from a mock endpoint that returns \`{ columns, orders }\`. Render a dynamic table driven by the columns config. Add search, status tabs, date range, and column sort. Show live aggregate stats above the table.

---

## Functional Requirements

- On mount, fetch from \`fetchOrders()\` which returns \`{ columns, orders }\`
- Render a dynamic table — headers from the \`columns\` config, no hardcoded \`<th>\`
- Each row is a reusable \`OrderRow\` component
- Search by order ID (prefix match) or customer name (case-insensitive substring)
- Status filter tabs: \`"All"\`, \`"Pending"\`, \`"Processing"\`, \`"Shipped"\`, \`"Delivered"\`, \`"Cancelled"\`
- Date range: two \`<input type="date">\` for From and To (inclusive, compare YYYY-MM-DD strings)
- Sortable column headers: ascending → descending toggle; arrow indicator
- **Aggregate stats bar** (updates with every filter change):
  - Total Orders: count of filtered rows
  - Revenue: sum of \`totalUsd\` for non-Cancelled filtered orders
  - Avg Order Value: Revenue / non-Cancelled count
- \`"No orders match your filters."\` when empty
- Show loading and error states

---

## Technical Requirements

**Must use:**
- A custom \`useOrderHistory()\` hook — owns all fetch, filter, sort state, derived list, and aggregates
- A reusable \`OrderRow\` component
- Dynamic column rendering from the \`columns\` config
- TypeScript — all props and state typed

**Constraints:**
- Revenue aggregate excludes \`"Cancelled"\` orders even when status = \`"All"\`
- Date sort compares YYYY-MM-DD strings lexicographically (string comparison works correctly)
- Column sort must be stable
- \`fetchOrders()\` simulates 300ms delay — do not modify it

---

## Acceptance Criteria

| # | Action | Expected Result |
|---|---|---|
| 1 | Page loads | 15 orders; non-cancelled revenue shown |
| 2 | Status \`"Delivered"\` | 6 orders; revenue = sum of delivered |
| 3 | Status \`"Cancelled"\` | 2 orders; revenue = $0.00 |
| 4 | Date range Jan 10–Jan 15 | Orders from Jan 10 to Jan 15 inclusive |
| 5 | Search \`"alice"\` | Both Alice Brown orders |
| 6 | Sort \`"Total (USD)"\` asc | $19.99 first |
| 7 | Sort \`"Date"\` desc | Jan 15 first |
| 8 | Status + date range | Intersection applies |
| 9 | Clear all filters | 15 orders; aggregates restored |
`,
  files: [
    {
      filename: "App.tsx",
      language: "tsx",
      content: `import { useState, useEffect, useMemo } from "react";
import "./styles.css";

// ─── Types ────────────────────────────────────────────────────────────────────

type OrderStatus = "Pending" | "Processing" | "Shipped" | "Delivered" | "Cancelled";
type SortDir = "asc" | "desc";

interface Column {
  key: string;
  label: string;
  sortable: boolean;
}

interface Order {
  id: string;
  customer: string;
  date: string;       // YYYY-MM-DD
  totalUsd: number;
  status: OrderStatus;
  itemCount: number;
}

interface OrdersResponse {
  columns: Column[];
  orders: Order[];
}

interface SortConfig {
  key: string;
  dir: SortDir;
}

interface Aggregates {
  count: number;
  revenue: number;
  avgOrderValue: number;
}

// ─── Mock API — do not modify ─────────────────────────────────────────────────

const MOCK_COLUMNS: Column[] = [
  { key: "id",        label: "Order ID",    sortable: true  },
  { key: "customer",  label: "Customer",    sortable: true  },
  { key: "date",      label: "Date",        sortable: true  },
  { key: "itemCount", label: "Items",       sortable: true  },
  { key: "totalUsd",  label: "Total (USD)", sortable: true  },
  { key: "status",    label: "Status",      sortable: false },
];

const MOCK_ORDERS: Order[] = [
  { id: "ORD-0001", customer: "Alice Brown",  date: "2024-01-15", totalUsd: 129.99,  status: "Delivered",  itemCount: 2 },
  { id: "ORD-0002", customer: "Bob Carter",   date: "2024-01-14", totalUsd: 499.00,  status: "Shipped",    itemCount: 1 },
  { id: "ORD-0003", customer: "Carol Davis",  date: "2024-01-13", totalUsd: 75.50,   status: "Processing", itemCount: 3 },
  { id: "ORD-0004", customer: "Dan Evans",    date: "2024-01-12", totalUsd: 220.00,  status: "Delivered",  itemCount: 4 },
  { id: "ORD-0005", customer: "Eva Foster",   date: "2024-01-11", totalUsd: 49.99,   status: "Cancelled",  itemCount: 1 },
  { id: "ORD-0006", customer: "Frank Green",  date: "2024-01-10", totalUsd: 1899.00, status: "Delivered",  itemCount: 2 },
  { id: "ORD-0007", customer: "Grace Hill",   date: "2024-01-09", totalUsd: 34.99,   status: "Pending",    itemCount: 1 },
  { id: "ORD-0008", customer: "Hank Irwin",   date: "2024-01-08", totalUsd: 320.00,  status: "Shipped",    itemCount: 5 },
  { id: "ORD-0009", customer: "Iris Jones",   date: "2024-01-07", totalUsd: 89.00,   status: "Delivered",  itemCount: 2 },
  { id: "ORD-0010", customer: "Jake King",    date: "2024-01-06", totalUsd: 560.00,  status: "Processing", itemCount: 3 },
  { id: "ORD-0011", customer: "Karen Lee",    date: "2024-01-05", totalUsd: 19.99,   status: "Cancelled",  itemCount: 1 },
  { id: "ORD-0012", customer: "Leo Martin",   date: "2024-01-04", totalUsd: 749.00,  status: "Delivered",  itemCount: 6 },
  { id: "ORD-0013", customer: "Mia Nelson",   date: "2024-01-03", totalUsd: 95.00,   status: "Shipped",    itemCount: 2 },
  { id: "ORD-0014", customer: "Nick Owen",    date: "2024-01-02", totalUsd: 430.00,  status: "Delivered",  itemCount: 4 },
  { id: "ORD-0015", customer: "Alice Brown",  date: "2024-01-01", totalUsd: 199.99,  status: "Pending",    itemCount: 2 },
];

async function fetchOrders(): Promise<OrdersResponse> {
  await new Promise((res) => setTimeout(res, 300));
  return { columns: MOCK_COLUMNS, orders: MOCK_ORDERS };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatUsd(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

// ─── OrderRow component ───────────────────────────────────────────────────────

interface OrderRowProps {
  order: Order;
  columns: Column[];
}

function OrderRow({ order, columns }: OrderRowProps) {
  // TODO: render one <tr> with a <td> per column
  // Hint: columns.map(col => <td key={col.key}>{order[col.key as keyof Order]}</td>)
  // For totalUsd column use formatUsd(); for status column add a colored badge
  return (
    <tr>
      <td>{order.id}</td>
    </tr>
  );
}

// ─── Custom hook ──────────────────────────────────────────────────────────────

const ALL_STATUSES: Array<"All" | OrderStatus> = [
  "All", "Pending", "Processing", "Shipped", "Delivered", "Cancelled",
];

function useOrderHistory() {
  const [columns, setColumns] = useState<Column[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"All" | OrderStatus>("All");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sort, setSort] = useState<SortConfig>({ key: "date", dir: "desc" });

  useEffect(() => {
    // TODO: call fetchOrders(), update columns/orders/loading/error state
  }, []);

  function handleHeaderClick(col: Column) {
    // TODO: if col is not sortable → return
    // if same col → toggle dir; different col → set asc
  }

  // TODO: compute filteredOrders with useMemo
  // Apply: search (prefix match on id OR substring on customer) → status → date range → sort
  // Date range: order.date >= dateFrom (if set) AND order.date <= dateTo (if set)
  const filteredOrders = useMemo<Order[]>(() => {
    return []; // TODO: replace
  }, [orders, search, status, dateFrom, dateTo, sort]);

  // TODO: compute aggregates from filteredOrders
  // Revenue = sum of totalUsd where status !== "Cancelled"
  // avgOrderValue = revenue / non-cancelled count (avoid divide-by-zero)
  const aggregates = useMemo<Aggregates>(() => {
    return { count: 0, revenue: 0, avgOrderValue: 0 }; // TODO: replace
  }, [filteredOrders]);

  return {
    columns, loading, error, filteredOrders, aggregates,
    search, setSearch, status, setStatus,
    dateFrom, setDateFrom, dateTo, setDateTo,
    sort, handleHeaderClick,
  };
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function App() {
  const {
    columns, loading, error, filteredOrders, aggregates,
    search, setSearch, status, setStatus,
    dateFrom, setDateFrom, dateTo, setDateTo,
    sort, handleHeaderClick,
  } = useOrderHistory();

  if (loading) return <div className="status-msg">Loading orders...</div>;
  if (error) return <div className="status-msg error">{error}</div>;

  return (
    <div className="dashboard">
      <h1>Order History</h1>

      {/* Aggregate stats bar */}
      <div className="stats-bar">
        <span>Total Orders: <strong>{aggregates.count}</strong></span>
        <span>Revenue: <strong>{formatUsd(aggregates.revenue)}</strong></span>
        <span>Avg Order Value: <strong>{formatUsd(aggregates.avgOrderValue)}</strong></span>
      </div>

      {/* Filters */}
      <div className="controls">
        <input
          className="search-input"
          placeholder="Order ID or customer name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="date-range">
          <label>From: <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} /></label>
          <label>To: <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} /></label>
        </div>
      </div>

      {/* Status tabs */}
      <div className="status-tabs">
        {ALL_STATUSES.map((s) => (
          <button
            key={s}
            className={\`status-tab\${status === s ? " active" : ""}\`}
            onClick={() => setStatus(s)}
          >
            {s}
          </button>
        ))}
      </div>

      {filteredOrders.length === 0 ? (
        <p className="status-msg">No orders match your filters.</p>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                {/* TODO: render <th> for each column
                    - if col.sortable: add onClick, cursor pointer, sort arrow if active */}
                {columns.map((col) => {
                  const isActive = sort.key === col.key;
                  return (
                    <th
                      key={col.key}
                      className={col.sortable ? "sortable" : ""}
                      onClick={() => handleHeaderClick(col)}
                    >
                      {col.label}
                      {isActive && (sort.dir === "asc" ? " ↑" : " ↓")}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => (
                <OrderRow key={order.id} order={order} columns={columns} />
              ))}
            </tbody>
          </table>
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

h1 { margin: 0 0 14px; font-size: 1.5rem; }

.stats-bar {
  display: flex;
  gap: 24px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 14px;
  font-size: 14px;
  flex-wrap: wrap;
}

.stats-bar strong { color: #4f46e5; }

.controls {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 10px;
}

.search-input {
  flex: 1;
  min-width: 160px;
  padding: 7px 11px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 13px;
}

.date-range {
  display: flex;
  gap: 10px;
  align-items: center;
  font-size: 13px;
}

.date-range input[type="date"] {
  padding: 6px 8px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 13px;
}

.status-tabs {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 14px;
}

.status-tab {
  padding: 5px 12px;
  border: 1px solid #d1d5db;
  border-radius: 999px;
  background: #fff;
  font-size: 12px;
  cursor: pointer;
}

.status-tab:hover { border-color: #6366f1; color: #6366f1; }
.status-tab.active { background: #6366f1; color: #fff; border-color: #6366f1; }

.table-wrapper {
  overflow-x: auto;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

thead { background: #f3f4f6; }

th {
  padding: 10px 14px;
  text-align: left;
  font-weight: 600;
  color: #374151;
  border-bottom: 1px solid #e5e7eb;
  white-space: nowrap;
}

th.sortable { cursor: pointer; user-select: none; }
th.sortable:hover { background: #eaebec; }

td {
  padding: 10px 14px;
  border-bottom: 1px solid #f3f4f6;
  color: #374151;
}

tr:last-child td { border-bottom: none; }
tr:hover td { background: #fafafa; }

.status-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
}

.status-Delivered  { background: #d1fae5; color: #065f46; }
.status-Shipped    { background: #dbeafe; color: #1e40af; }
.status-Processing { background: #fef3c7; color: #92400e; }
.status-Pending    { background: #f3f4f6; color: #374151; }
.status-Cancelled  { background: #fee2e2; color: #991b1b; }

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

export default reactOrderHistoryTable;
