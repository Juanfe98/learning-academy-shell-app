import type { Challenge } from "@/lib/challenges/types";

const reactTailwindForm: Challenge = {
  slug: "react-tailwind-form",
  title: "React: Tailwind CSS Styled Filter Form",
  description:
    "Build a styled employee filter form using Tailwind CSS utility classes. Practice applying Tailwind to a controlled React form with dropdowns, search input, badges, and responsive layout.",
  difficulty: "intermediate",
  tags: ["react", "tailwind", "forms", "dropdowns", "styling", "css", "controlled-components"],
  environment: "react-js",
  entryFile: "App.jsx",
  problemStatement: `## Problem Statement

Build a **styled employee filter form** using **Tailwind CSS utility classes**. Tailwind is already loaded via CDN in this environment — use \`className\` strings with Tailwind utilities.

The logic is already implemented. Your job: **replace every \`TODO_STYLE\` placeholder** with the correct Tailwind classes.

---

## Design Requirements

### Filter Form Card
- White background, rounded-xl, shadow-md, padding p-6
- Three dropdowns side by side on desktop, stacked on mobile (use flex-wrap or grid)
- Gap between inputs: gap-4
- A "Search" button: indigo background (bg-indigo-600), white text, rounded-lg, hover:bg-indigo-700

### Each \`<select>\`
- Full width (w-full), border border-gray-300, rounded-lg, py-2 px-3
- Focus ring: focus:outline-none focus:ring-2 focus:ring-indigo-500
- Cursor: cursor-pointer

### Results Section
- Show count as a small gray text (text-sm text-gray-500 font-medium)
- Each employee card: white bg, rounded-lg, border border-gray-200, p-4, hover:shadow-md transition

### Employee Card Layout
- Flex row, items-center, gap-4
- Avatar circle: 40×40px, bg-indigo-100, rounded-full, text-indigo-700 font-bold, flex items-center justify-center
- Name: font-semibold text-gray-900
- Role + Department: text-sm text-gray-500
- Status badge: rounded-full px-2.5 py-0.5 text-xs font-semibold
  - Active: bg-green-100 text-green-800
  - On Leave: bg-yellow-100 text-yellow-800
  - Inactive: bg-red-100 text-red-700

---

## Important

- Do **not** change logic in \`App.jsx\` — only add Tailwind classes.
- Use the Tailwind classes exactly as shown in the hints — the CDN version includes all standard utilities.
- You may add extra Tailwind classes beyond the hints if you want to improve the design.
`,
  files: [
    {
      filename: "App.jsx",
      language: "jsx",
      content: `import { useState } from "react";
import FilterForm from "./FilterForm";
import EmployeeGrid from "./EmployeeGrid";
import { EMPLOYEES } from "./data";

export default function App() {
  const [department, setDepartment] = useState("");
  const [status, setStatus] = useState("");
  const [location, setLocation] = useState("");

  const departments = Array.from(new Set(EMPLOYEES.map((e) => e.department))).sort();
  const statuses    = Array.from(new Set(EMPLOYEES.map((e) => e.status))).sort();
  const locations   = Array.from(new Set(EMPLOYEES.map((e) => e.location))).sort();

  const filtered = EMPLOYEES.filter((e) => {
    if (department && e.department !== department) return false;
    if (status    && e.status     !== status)     return false;
    if (location  && e.location   !== location)   return false;
    return true;
  });

  function handleClear() {
    setDepartment("");
    setStatus("");
    setLocation("");
  }

  // Hint: outer wrapper → "min-h-screen bg-gray-50 py-10 px-4"
  // Hint: inner container → "max-w-4xl mx-auto"
  // Hint: header section → "mb-8"
  // Hint: h1 → "text-3xl font-bold text-gray-900 mb-1"
  // Hint: subtitle → "text-gray-500 text-sm"
  // Hint: count paragraph → "mt-4 mb-3 text-sm text-gray-500 font-medium"
  return (
    <div className="">
      <div className="">
        <div className="">
          <h1 className="">Employee Directory</h1>
          <p className="">Filter and explore the team.</p>
        </div>

        <FilterForm
          department={department}
          status={status}
          location={location}
          departments={departments}
          statuses={statuses}
          locations={locations}
          onDepartmentChange={setDepartment}
          onStatusChange={setStatus}
          onLocationChange={setLocation}
          onClear={handleClear}
        />

        <p className="">
          Showing {filtered.length} of {EMPLOYEES.length} employees
        </p>

        <EmployeeGrid employees={filtered} />
      </div>
    </div>
  );
}
`,
    },
    {
      filename: "FilterForm.jsx",
      language: "jsx",
      content: `// Hint: form card wrapper → "bg-white rounded-xl shadow-md p-6 mb-6"
// Hint: fields row → "flex flex-wrap gap-4 items-end"
// Hint: each field wrapper → "flex flex-col gap-1 flex-1 min-w-[180px]"
// Hint: label → "text-xs font-semibold text-gray-500 uppercase tracking-wide"
// Hint: select → "w-full border border-gray-300 rounded-lg py-2 px-3 text-sm
//                  focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
// Hint: clear button → "px-5 py-2 text-sm font-medium text-gray-600 bg-white border
//                        border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"

export default function FilterForm({
  department, status, location,
  departments, statuses, locations,
  onDepartmentChange, onStatusChange, onLocationChange, onClear,
}) {
  return (
    <div className="">
      <div className="">

        <div className="">
          <label className="">Department</label>
          <select
            className=""
            value={department}
            onChange={(e) => onDepartmentChange(e.target.value)}
          >
            <option value="">All Departments</option>
            {departments.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>

        <div className="">
          <label className="">Status</label>
          <select
            className=""
            value={status}
            onChange={(e) => onStatusChange(e.target.value)}
          >
            <option value="">All Statuses</option>
            {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div className="">
          <label className="">Location</label>
          <select
            className=""
            value={location}
            onChange={(e) => onLocationChange(e.target.value)}
          >
            <option value="">All Locations</option>
            {locations.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>

        <button type="button" className="" onClick={onClear}>
          Clear
        </button>
      </div>
    </div>
  );
}
`,
    },
    {
      filename: "EmployeeGrid.jsx",
      language: "jsx",
      content: `// Hint: empty state p → "text-center py-16 text-gray-400 italic"
// Hint: grid wrapper → "grid grid-cols-1 sm:grid-cols-2 gap-4"
// Hint: card → "bg-white border border-gray-200 rounded-xl p-4
//               flex items-center gap-4 hover:shadow-md transition-shadow"
// Hint: avatar div → "w-10 h-10 rounded-full bg-indigo-100 text-indigo-700
//                      font-bold text-sm flex items-center justify-center flex-shrink-0"
// Hint: info wrapper → "flex-1 min-w-0"
// Hint: name p → "font-semibold text-gray-900 text-sm truncate"
// Hint: role p → "text-xs text-gray-500 truncate"
// Hint: location p → "text-xs text-gray-400"
// Hint: badge span → "rounded-full px-2.5 py-0.5 text-xs font-semibold flex-shrink-0"
//   Active → add: "bg-green-100 text-green-800"
//   On Leave → add: "bg-yellow-100 text-yellow-800"
//   Inactive → add: "bg-red-100 text-red-700"

const STATUS_CLASSES = {
  "Active":   "bg-green-100 text-green-800",
  "On Leave": "bg-yellow-100 text-yellow-800",
  "Inactive": "bg-red-100 text-red-700",
};

export default function EmployeeGrid({ employees }) {
  if (employees.length === 0) {
    return <p className="">No employees match the current filters.</p>;
  }

  return (
    <div className="">
      {employees.map((e) => (
        <div key={e.id} className="">
          <div className="">
            {e.name.split(" ").map((n) => n[0]).join("")}
          </div>

          <div className="">
            <p className="">{e.name}</p>
            <p className="">{e.role} · {e.department}</p>
            <p className="">📍 {e.location}</p>
          </div>

          <span className={\` \${STATUS_CLASSES[e.status] ?? ""}\`}>
            {e.status}
          </span>
        </div>
      ))}
    </div>
  );
}
`,
    },
    {
      filename: "data.js",
      language: "js",
      readOnly: true,
      content: `export const EMPLOYEES = [
  { id:  1, name: "Alice Johnson",   role: "Senior Frontend Dev",  department: "Engineering", location: "Remote",        status: "Active"   },
  { id:  2, name: "Bob Martinez",    role: "Backend Engineer",     department: "Engineering", location: "Austin, TX",    status: "Active"   },
  { id:  3, name: "Carol White",     role: "Fullstack Dev",        department: "Engineering", location: "New York",      status: "On Leave" },
  { id:  4, name: "David Kim",       role: "DevOps Engineer",      department: "Engineering", location: "Remote",        status: "Active"   },
  { id:  5, name: "Emma Davis",      role: "Product Manager",      department: "Product",     location: "San Francisco", status: "Active"   },
  { id:  6, name: "Frank Lee",       role: "Product Owner",        department: "Product",     location: "Remote",        status: "Active"   },
  { id:  7, name: "Grace Chen",      role: "UX Designer",          department: "Design",      location: "New York",      status: "Active"   },
  { id:  8, name: "Henry Brown",     role: "UI Designer",          department: "Design",      location: "Remote",        status: "Inactive" },
  { id:  9, name: "Isabel Garcia",   role: "Data Scientist",       department: "Data",        location: "Austin, TX",    status: "Active"   },
  { id: 10, name: "James Wilson",    role: "Data Engineer",        department: "Data",        location: "Remote",        status: "Active"   },
  { id: 11, name: "Karen Thompson",  role: "Marketing Manager",    department: "Marketing",   location: "San Francisco", status: "On Leave" },
  { id: 12, name: "Luis Rodriguez",  role: "SEO Specialist",       department: "Marketing",   location: "Remote",        status: "Active"   },
  { id: 13, name: "Maria Nguyen",    role: "Frontend Engineer",    department: "Engineering", location: "Austin, TX",    status: "Active"   },
  { id: 14, name: "Nathan Park",     role: "Senior Backend Dev",   department: "Engineering", location: "New York",      status: "Active"   },
  { id: 15, name: "Olivia Scott",    role: "Data Analyst",         department: "Data",        location: "San Francisco", status: "Active"   },
  { id: 16, name: "Paul Adams",      role: "Frontend Lead",        department: "Engineering", location: "Remote",        status: "Active"   },
];
`,
    },
    {
      filename: "index.html",
      language: "js",
      readOnly: true,
      content: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Tailwind Form Challenge</title>
    <script src="https://cdn.tailwindcss.com"></script>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
`,
    },
  ],
};

export default reactTailwindForm;
