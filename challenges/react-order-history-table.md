# React: Order History Table

**Difficulty:** Hard
**Time Limit:** 60 minutes
**Framework:** React + TypeScript
**Topics:** Dynamic Table Columns, API Fetching, Date Range Filter, Status Filter, Sort, Aggregate Stats, Custom Hook

---

## Problem Statement

Build an **Order History** dashboard for an e-commerce admin panel. Fetch orders from a mock endpoint and display them in a dynamic table. The visible columns are determined by the API response. Users can search by order ID or customer name, filter by status, filter by date range, and sort any column. Show aggregate stats (total revenue, order count) above the table — they must update as filters change.

---

## Functional Requirements

- [ ] On mount, fetch from `fetchOrders()` which returns `{ columns, orders }`
- [ ] Render a dynamic table with headers from the `columns` config
- [ ] Each row is a reusable `OrderRow` component
- [ ] Search input filters by order ID (exact prefix match) or customer name (case-insensitive substring)
- [ ] Status filter: tabs or dropdown for `"All"`, `"Pending"`, `"Processing"`, `"Shipped"`, `"Delivered"`, `"Cancelled"`
- [ ] Date range filter: two `<input type="date">` fields for "From" and "To" (inclusive)
- [ ] Clicking sortable column headers sorts ascending then descending; arrow indicator shown
- [ ] Aggregate stats bar above the table updates on every filter change:
  - `Total Orders: X`
  - `Revenue: $X,XXX.XX` (sum of `totalUsd` for non-cancelled filtered orders)
  - `Avg Order Value: $XXX.XX`
- [ ] Show `"No orders match your filters."` when empty
- [ ] Show loading state; show error state

---

## UI / Visual Specification

```
┌────────────────────────────────────────────────────────────────────────────┐
│  Order History                                                             │
│                                                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │  Total Orders: 8   Revenue: $4,219.50   Avg Order Value: $527.44   │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│  [🔍 Order ID or customer...]  [All ▼ Status]  From: [──────]  To:[─────] │
│                                                                            │
│  [All] [Pending] [Processing] [Shipped] [Delivered] [Cancelled]           │
│                                                                            │
│  ┌──────────────┬───────────────┬──────────────┬──────────┬────────────┐  │
│  │ Order ID ↑   │ Customer      │ Date         │ Total    │ Status     │  │
│  ├──────────────┼───────────────┼──────────────┼──────────┼────────────┤  │
│  │ ORD-0001     │ Alice Brown   │ Jan 15, 2024 │ $129.99  │ Delivered  │  │
│  │ ORD-0002     │ Bob Carter    │ Jan 14, 2024 │ $499.00  │ Shipped    │  │
│  │ ...          │               │              │          │            │  │
│  └──────────────┴───────────────┴──────────────┴──────────┴────────────┘  │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## Technical Requirements

**Must use:**
- A custom `useOrderHistory()` hook owning: fetch state, all filter/sort state, derived filtered list, and computed aggregates
- A reusable `OrderRow` component
- Dynamic column rendering from the `columns` config
- TypeScript — all props and state typed

**Must NOT use:**
- External table/date-picker libraries

**Constraints:**
- Date range filter compares `order.date` (YYYY-MM-DD) string lexicographically — no `Date` object parsing required but allowed
- Revenue aggregate excludes `"Cancelled"` orders even when `"All"` status is selected
- Column sort must be stable
- `fetchOrders()` simulates 300ms delay — do not modify it

---

## Starter Files

**`OrderHistory.tsx`**
```tsx
import { useState, useEffect, useMemo } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type OrderStatus = "Pending" | "Processing" | "Shipped" | "Delivered" | "Cancelled";

interface Column {
  key: string;
  label: string;
  sortable: boolean;
}

interface Order {
  id: string;
  customer: string;
  date: string;         // YYYY-MM-DD
  totalUsd: number;
  status: OrderStatus;
  itemCount: number;
}

interface OrdersResponse {
  columns: Column[];
  orders: Order[];
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
  { id: "ORD-0001", customer: "Alice Brown",     date: "2024-01-15", totalUsd: 129.99,  status: "Delivered",   itemCount: 2 },
  { id: "ORD-0002", customer: "Bob Carter",      date: "2024-01-14", totalUsd: 499.00,  status: "Shipped",     itemCount: 1 },
  { id: "ORD-0003", customer: "Carol Davis",     date: "2024-01-13", totalUsd: 75.50,   status: "Processing",  itemCount: 3 },
  { id: "ORD-0004", customer: "Dan Evans",       date: "2024-01-12", totalUsd: 220.00,  status: "Delivered",   itemCount: 4 },
  { id: "ORD-0005", customer: "Eva Foster",      date: "2024-01-11", totalUsd: 49.99,   status: "Cancelled",   itemCount: 1 },
  { id: "ORD-0006", customer: "Frank Green",     date: "2024-01-10", totalUsd: 1899.00, status: "Delivered",   itemCount: 2 },
  { id: "ORD-0007", customer: "Grace Hill",      date: "2024-01-09", totalUsd: 34.99,   status: "Pending",     itemCount: 1 },
  { id: "ORD-0008", customer: "Hank Irwin",      date: "2024-01-08", totalUsd: 320.00,  status: "Shipped",     itemCount: 5 },
  { id: "ORD-0009", customer: "Iris Jones",      date: "2024-01-07", totalUsd: 89.00,   status: "Delivered",   itemCount: 2 },
  { id: "ORD-0010", customer: "Jake King",       date: "2024-01-06", totalUsd: 560.00,  status: "Processing",  itemCount: 3 },
  { id: "ORD-0011", customer: "Karen Lee",       date: "2024-01-05", totalUsd: 19.99,   status: "Cancelled",   itemCount: 1 },
  { id: "ORD-0012", customer: "Leo Martin",      date: "2024-01-04", totalUsd: 749.00,  status: "Delivered",   itemCount: 6 },
  { id: "ORD-0013", customer: "Mia Nelson",      date: "2024-01-03", totalUsd: 95.00,   status: "Shipped",     itemCount: 2 },
  { id: "ORD-0014", customer: "Nick Owen",       date: "2024-01-02", totalUsd: 430.00,  status: "Delivered",   itemCount: 4 },
  { id: "ORD-0015", customer: "Alice Brown",     date: "2024-01-01", totalUsd: 199.99,  status: "Pending",     itemCount: 2 },
];

async function fetchOrders(): Promise<OrdersResponse> {
  await new Promise((res) => setTimeout(res, 300));
  return { columns: MOCK_COLUMNS, orders: MOCK_ORDERS };
}

// ─── Your implementation ──────────────────────────────────────────────────────

interface Aggregates {
  count: number;
  revenue: number;
  avgOrderValue: number;
}

function useOrderHistory() {
  // TODO: fetch, filter states, sort state, derived list + aggregates
}

interface OrderRowProps {
  order: Order;
  columns: Column[];
}

function OrderRow({ order, columns }: OrderRowProps) {
  // TODO: implement
  return <tr><td>{order.id}</td></tr>;
}

export default function OrderHistory() {
  // TODO: use hook + build UI
  return (
    <div>
      <h1>Order History</h1>
    </div>
  );
}
```

---

## Acceptance Criteria / Test Cases

| # | Action | Expected Result |
|---|---|---|
| 1 | Page loads | 15 orders; aggregates show all non-cancelled revenue |
| 2 | Filter status `"Delivered"` | 6 orders; revenue updates to sum of delivered orders |
| 3 | Filter status `"Cancelled"` | 2 orders; revenue shows $0 (excluded from revenue) |
| 4 | Date range Jan 10–Jan 15 | Orders from Jan 10 to Jan 15 inclusive |
| 5 | Search `"alice"` | Both Alice Brown orders shown |
| 6 | Search `"ORD-001"` | ORD-0010 through ORD-0015? No — prefix match shows ORD-0010, ORD-0011... |
| 7 | Sort `"Total (USD)"` ascending | $19.99 (ORD-0011) first |
| 8 | Sort `"Date"` descending | Jan 15 first |
| 9 | Status + date range combined | Intersection applies |
| 10 | All filters cleared | 15 orders; original aggregates restored |
