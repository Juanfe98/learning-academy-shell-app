import type { Challenge } from "@/lib/challenges/types";

const reactUserDirectoryTable: Challenge = {
  slug: "react-user-directory-table",
  title: "User Directory Table",
  description:
    "Fetch a directory response that includes both a columns config and user list. Render a dynamic table whose headers are driven by the columns array — no hardcoded <th> elements. Add search, department filter, and column-header sort with ascending/descending toggle.",
  difficulty: "intermediate",
  tags: ["react", "typescript", "hooks", "api-fetching", "dynamic-table", "search", "filter", "sort"],
  environment: "react-ts",
  entryFile: "App.tsx",
  problemStatement: `# User Directory Table

**Difficulty:** Intermediate | **Time Limit:** 45 minutes

---

## Problem Statement

Build a **User Directory** that fetches a list of users from a mock REST endpoint and renders them in a **dynamic table**. The visible columns are driven by a \`columns\` config array returned alongside the data — not hardcoded in the UI. Users can search by name or email, filter by department, and sort by clicking any column header.

---

## Functional Requirements

- On mount, fetch from \`fetchDirectory()\` which returns \`{ columns, users }\`
- Render a \`<table>\` whose headers are generated from the \`columns\` array
- Each row renders a \`UserRow\` component — reusable, accepts a single user object
- Search input filters rows by \`name\` or \`email\` (case-insensitive, real-time)
- Department dropdown filters to a single department (\`"All Departments"\` shows all)
- Clicking a column header sorts the table by that column (ascending first, then toggle to descending)
- Active sort column shows an arrow indicator (↑ / ↓)
- Show loading state while data is fetched
- Show \`"No users match your search."\` when result is empty
- Show total visible row count: \`"X users"\`

---

## Technical Requirements

**Must use:**
- \`useState\`, \`useEffect\`
- A reusable \`UserRow\` component
- Dynamic column rendering driven by the \`columns\` array — no hardcoded \`<th>Name</th>\` etc.
- TypeScript — all props and state typed

**Constraints:**
- Column keys in \`columns\` match property names on the \`User\` object exactly
- Sorting must be stable — rows with equal sort values keep their original relative order
- \`fetchDirectory()\` simulates 300ms delay — do not modify it

---

## Column Sort Behavior

- First click on a column header → sort ascending (A→Z or 0→9)
- Second click → sort descending
- Clicking a different column → resets to ascending on that column
- Non-sortable columns (e.g. Email) do nothing on click

---

## Acceptance Criteria

| # | Action | Expected Result |
|---|---|---|
| 1 | Page loads | 14 user rows rendered; columns match MOCK_COLUMNS labels |
| 2 | Search \`"ali"\` | Only Alice Brown row visible |
| 3 | Search \`"corp.com"\` | All 14 rows (all emails match) |
| 4 | Select \`"Engineering"\` dept | 5 rows visible (Alice, Dan, Frank, Jake, Nick) |
| 5 | Search \`"sde"\` + dept \`"Engineering"\` | Rows where role contains "SDE" in Engineering |
| 6 | Click "Name" header | Rows sort A→Z by name |
| 7 | Click "Name" header again | Rows sort Z→A by name |
| 8 | Click "Join Date" header | Sorted by date ascending (oldest first) |
| 9 | Click "Email" header | Not sortable — no change |
| 10 | Search \`"zzzz"\` | \`"No users match your search."\` message |
`,
  files: [
    {
      filename: "App.tsx",
      language: "tsx",
      content: `import { useState, useEffect } from "react";
import "./styles.css";

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

type SortDir = "asc" | "desc";

interface SortConfig {
  key: string;
  dir: SortDir;
}

// ─── Mock API — do not modify ─────────────────────────────────────────────────

const MOCK_COLUMNS: Column[] = [
  { key: "name",       label: "Name",       sortable: true  },
  { key: "email",      label: "Email",      sortable: false },
  { key: "department", label: "Department", sortable: true  },
  { key: "role",       label: "Role",       sortable: true  },
  { key: "joinDate",   label: "Join Date",  sortable: true  },
];

const MOCK_USERS: User[] = [
  { id: 1,  name: "Alice Brown",  email: "alice@corp.com",  department: "Engineering", role: "SDE II",         joinDate: "2021-03-15" },
  { id: 2,  name: "Bob Carter",   email: "bob@corp.com",    department: "Product",     role: "PM",             joinDate: "2020-07-01" },
  { id: 3,  name: "Carol Davis",  email: "carol@corp.com",  department: "Design",      role: "UI/UX Designer", joinDate: "2022-01-20" },
  { id: 4,  name: "Dan Evans",    email: "dan@corp.com",    department: "Engineering", role: "SDE III",        joinDate: "2019-11-05" },
  { id: 5,  name: "Eva Foster",   email: "eva@corp.com",    department: "Data",        role: "Data Engineer",  joinDate: "2021-08-30" },
  { id: 6,  name: "Frank Green",  email: "frank@corp.com",  department: "Engineering", role: "Staff SDE",      joinDate: "2018-04-12" },
  { id: 7,  name: "Grace Hill",   email: "grace@corp.com",  department: "Design",      role: "Brand Designer", joinDate: "2023-02-14" },
  { id: 8,  name: "Hank Irwin",   email: "hank@corp.com",   department: "Product",     role: "APM",            joinDate: "2022-09-01" },
  { id: 9,  name: "Iris Jones",   email: "iris@corp.com",   department: "Data",        role: "ML Engineer",    joinDate: "2020-03-22" },
  { id: 10, name: "Jake King",    email: "jake@corp.com",   department: "Engineering", role: "SDE I",          joinDate: "2023-06-05" },
  { id: 11, name: "Karen Lee",    email: "karen@corp.com",  department: "Design",      role: "Design Lead",    joinDate: "2019-07-18" },
  { id: 12, name: "Leo Martin",   email: "leo@corp.com",    department: "Product",     role: "Senior PM",      joinDate: "2021-12-01" },
  { id: 13, name: "Mia Nelson",   email: "mia@corp.com",    department: "Data",        role: "Data Scientist", joinDate: "2022-05-10" },
  { id: 14, name: "Nick Owen",    email: "nick@corp.com",   department: "Engineering", role: "SDE II",         joinDate: "2020-10-28" },
];

async function fetchDirectory(): Promise<DirectoryResponse> {
  await new Promise((res) => setTimeout(res, 300));
  return { columns: MOCK_COLUMNS, users: MOCK_USERS };
}

// ─── UserRow component ────────────────────────────────────────────────────────

interface UserRowProps {
  user: User;
  columns: Column[];
}

function UserRow({ user, columns }: UserRowProps) {
  // TODO: render one <tr> with a <td> for each column
  // Hint: columns.map(col => <td key={col.key}>{user[col.key as keyof User]}</td>)
  return (
    <tr>
      <td>{user.name}</td>
    </tr>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function App() {
  const [columns, setColumns] = useState<Column[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("All Departments");
  const [sort, setSort] = useState<SortConfig | null>(null);

  useEffect(() => {
    // TODO: call fetchDirectory(), update columns/users/loading state
  }, []);

  // TODO: derive unique departments from users for the dropdown
  const departments: string[] = [];

  // TODO: apply search filter (name or email), department filter, and sort
  // For sort: use .slice() before .sort() to avoid mutating state
  // Stable sort tip: compare indices as tiebreaker
  const filteredUsers: User[] = [];

  // TODO: implement handleHeaderClick(col: Column)
  // If col is not sortable → do nothing
  // If same col clicked → toggle dir; different col → set asc
  function handleHeaderClick(col: Column) {
    // TODO
  }

  if (loading) return <div className="status-msg">Loading directory...</div>;

  return (
    <div className="directory">
      <div className="directory-header">
        <h1>User Directory</h1>
        <span className="count">{filteredUsers.length} users</span>
      </div>

      <div className="controls">
        <input
          className="search-input"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {/* TODO: department <select> bound to department state */}
      </div>

      {filteredUsers.length === 0 ? (
        <p className="status-msg">No users match your search.</p>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                {/* TODO: render <th> for each column using columns.map()
                    - show sort arrow if col is the active sort col
                    - add onClick that calls handleHeaderClick(col)
                    - style sortable columns with cursor: pointer */}
                <th>Name</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <UserRow key={user.id} user={user} columns={columns} />
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

.directory-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

h1 { margin: 0; font-size: 1.5rem; }

.count {
  font-size: 14px;
  color: #6b7280;
  font-weight: 500;
}

.controls {
  display: flex;
  gap: 10px;
  margin-bottom: 16px;
}

.search-input,
.dept-select {
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
}

.search-input { flex: 1; }

.table-wrapper {
  overflow-x: auto;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

thead {
  background: #f3f4f6;
}

th {
  padding: 10px 14px;
  text-align: left;
  font-weight: 600;
  color: #374151;
  border-bottom: 1px solid #e5e7eb;
  white-space: nowrap;
}

th.sortable {
  cursor: pointer;
  user-select: none;
}

th.sortable:hover { background: #e9eaec; }

th.active { color: #4f46e5; }

td {
  padding: 10px 14px;
  border-bottom: 1px solid #f3f4f6;
  color: #374151;
}

tr:last-child td { border-bottom: none; }
tr:hover td { background: #fafafa; }

.status-msg {
  text-align: center;
  padding: 40px;
  color: #6b7280;
  font-size: 15px;
}
`,
    },
  ],
};

export default reactUserDirectoryTable;
