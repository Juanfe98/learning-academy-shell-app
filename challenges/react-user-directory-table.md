# React: User Directory Table

**Difficulty:** Medium
**Time Limit:** 45 minutes
**Framework:** React + TypeScript
**Topics:** API Fetching, Dynamic Table Columns, Search, Filter, Sort, Reusable Components

---

## Problem Statement

Build a **User Directory** that fetches a list of users from a mock REST endpoint and renders them in a **dynamic table**. The visible columns are driven by a `columns` config array returned alongside the data — not hardcoded in the UI. Users can search by name or email, filter by department, and sort by clicking any column header.

---

## Functional Requirements

- [ ] On mount, fetch from `fetchDirectory()` which returns `{ columns, users }`
- [ ] Render a `<table>` whose headers are generated from the `columns` array
- [ ] Each row renders a `UserRow` component — reusable, accepts a single user object
- [ ] Search input filters rows by `name` or `email` (case-insensitive, real-time)
- [ ] Department dropdown filters to a single department (`"All Departments"` shows all)
- [ ] Clicking a column header sorts the table by that column (ascending first, then toggle to descending)
- [ ] Active sort column shows an arrow indicator (↑ / ↓)
- [ ] Show loading state while data is fetched
- [ ] Show `"No users match your search."` when result is empty
- [ ] Show total visible row count: `"X users"`

---

## UI / Visual Specification

```
┌──────────────────────────────────────────────────────────────────────┐
│  User Directory                                          14 users     │
│                                                                       │
│  [🔍 Search by name or email... ]    [Department ▼]                  │
│                                                                       │
│  ┌────────────────┬──────────────────────┬─────────────┬──────────┐  │
│  │ Name ↑         │ Email                │ Department  │ Role     │  │
│  ├────────────────┼──────────────────────┼─────────────┼──────────┤  │
│  │ Alice Brown    │ alice@corp.com        │ Engineering │ SDE II   │  │
│  │ Bob Carter     │ bob@corp.com          │ Product     │ PM       │  │
│  │ Carol Davis    │ carol@corp.com        │ Design      │ UI/UX    │  │
│  │ ...            │ ...                  │ ...         │ ...      │  │
│  └────────────────┴──────────────────────┴─────────────┴──────────┘  │
└──────────────────────────────────────────────────────────────────────┘
```

**Column sort behavior:**
- First click on a column header → sort ascending (A→Z or 0→9)
- Second click → sort descending
- Clicking a different column → resets to ascending on that column

---

## Technical Requirements

**Must use:**
- `useState`, `useEffect`
- A reusable `UserRow` component
- Dynamic column rendering driven by the `columns` array — no hardcoded `<th>Name</th>` etc.
- TypeScript — all props and state typed

**Must NOT use:**
- External table libraries (react-table, tanstack, ag-grid, etc.)

**Constraints:**
- Column keys in `columns` match property names on the `User` object exactly
- Sorting must be stable — rows with equal sort values keep their original relative order
- `fetchDirectory()` simulates 300ms delay — do not modify it

---

## Starter Files

**`UserDirectory.tsx`**
```tsx
import { useState, useEffect } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Column {
  key: string;
  label: string;
  sortable: boolean;
}

interface User {
  id: number;
  name: string;
  email: string;
  department: string;
  role: string;
  joinDate: string; // YYYY-MM-DD
}

interface DirectoryResponse {
  columns: Column[];
  users: User[];
}

// ─── Mock API — do not modify ─────────────────────────────────────────────────

const MOCK_COLUMNS: Column[] = [
  { key: "name",       label: "Name",        sortable: true },
  { key: "email",      label: "Email",       sortable: false },
  { key: "department", label: "Department",  sortable: true },
  { key: "role",       label: "Role",        sortable: true },
  { key: "joinDate",   label: "Join Date",   sortable: true },
];

const MOCK_USERS: User[] = [
  { id: 1,  name: "Alice Brown",    email: "alice@corp.com",    department: "Engineering", role: "SDE II",         joinDate: "2021-03-15" },
  { id: 2,  name: "Bob Carter",     email: "bob@corp.com",      department: "Product",     role: "PM",             joinDate: "2020-07-01" },
  { id: 3,  name: "Carol Davis",    email: "carol@corp.com",    department: "Design",      role: "UI/UX Designer", joinDate: "2022-01-20" },
  { id: 4,  name: "Dan Evans",      email: "dan@corp.com",      department: "Engineering", role: "SDE III",        joinDate: "2019-11-05" },
  { id: 5,  name: "Eva Foster",     email: "eva@corp.com",      department: "Data",        role: "Data Engineer",  joinDate: "2021-08-30" },
  { id: 6,  name: "Frank Green",    email: "frank@corp.com",    department: "Engineering", role: "Staff SDE",      joinDate: "2018-04-12" },
  { id: 7,  name: "Grace Hill",     email: "grace@corp.com",    department: "Design",      role: "Brand Designer", joinDate: "2023-02-14" },
  { id: 8,  name: "Hank Irwin",     email: "hank@corp.com",     department: "Product",     role: "APM",            joinDate: "2022-09-01" },
  { id: 9,  name: "Iris Jones",     email: "iris@corp.com",     department: "Data",        role: "ML Engineer",    joinDate: "2020-03-22" },
  { id: 10, name: "Jake King",      email: "jake@corp.com",     department: "Engineering", role: "SDE I",          joinDate: "2023-06-05" },
  { id: 11, name: "Karen Lee",      email: "karen@corp.com",    department: "Design",      role: "Design Lead",    joinDate: "2019-07-18" },
  { id: 12, name: "Leo Martin",     email: "leo@corp.com",      department: "Product",     role: "Senior PM",      joinDate: "2021-12-01" },
  { id: 13, name: "Mia Nelson",     email: "mia@corp.com",      department: "Data",        role: "Data Scientist", joinDate: "2022-05-10" },
  { id: 14, name: "Nick Owen",      email: "nick@corp.com",     department: "Engineering", role: "SDE II",         joinDate: "2020-10-28" },
];

async function fetchDirectory(): Promise<DirectoryResponse> {
  await new Promise((res) => setTimeout(res, 300));
  return { columns: MOCK_COLUMNS, users: MOCK_USERS };
}

// ─── Your implementation ──────────────────────────────────────────────────────

interface UserRowProps {
  user: User;
  columns: Column[];
}

function UserRow({ user, columns }: UserRowProps) {
  // TODO: implement — render one <tr> with a <td> per column
  return <tr><td>{user.name}</td></tr>;
}

export default function UserDirectory() {
  // TODO: implement

  return (
    <div>
      <h1>User Directory</h1>
      {/* TODO: search input, department dropdown */}
      {/* TODO: table with dynamic headers and UserRow instances */}
    </div>
  );
}
```

---

## Acceptance Criteria / Test Cases

| # | Action | Expected Result |
|---|---|---|
| 1 | Page loads | 14 user rows rendered; columns match MOCK_COLUMNS labels |
| 2 | Search `"ali"` | Only Alice Brown row visible |
| 3 | Search `"corp.com"` | All 14 rows (all emails match) |
| 4 | Select `"Engineering"` dept | 5 rows visible (Alice, Dan, Frank, Jake, Nick) |
| 5 | Search `"sde"` + dept `"Engineering"` | Rows where role contains "SDE" in Engineering |
| 6 | Click "Name" header | Rows sort A→Z by name |
| 7 | Click "Name" header again | Rows sort Z→A by name |
| 8 | Click "Join Date" header | Sorted by date ascending (oldest first) |
| 9 | Click "Email" header | Header is not sortable — no sort change |
| 10 | Search `"zzzz"` | `"No users match your search."` message |
