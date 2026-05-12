import type { Challenge } from "@/lib/challenges/types";

const reactEmployeeDirectory: Challenge = {
  slug: "react-employee-directory",
  title: "React: Employee Directory",
  description:
    "Build an employee directory: add employees, filter by department, search by role, and remove them. Wire state management across four components.",
  difficulty: "intermediate",
  tags: ["react", "state", "lists", "filtering", "forms"],
  environment: "react-js",
  entryFile: "App.jsx",
  problemStatement: `## Problem Statement

Build an **Employee Directory** where users can add employees, filter by department, search by role, and remove employees from the list.

Edit the following components:

- \`EmployeeDirectory.jsx\` — state + filtering logic
- \`EmployeeForm.jsx\` — add employee form
- \`EmployeeFilter.jsx\` — department dropdown + role search
- \`EmployeeList.jsx\` — display and remove employees

---

## Initial State

- All input fields are empty.
- Department dropdown shows \`"Select a Department"\`.
- No employees displayed — show \`"No Employees Added."\`

---

## Adding Employees

Each employee must have: **Name**, **Role**, **Department**, **Contact** (email type).

- Employees appear in the order they were added.
- All fields are required. If any is empty, show:

\`\`\`
All fields are required!
\`\`\`

---

## Filtering by Department

- Dropdown filters the list to show only employees from that department.
- If none match, show \`"No Employees Added."\`

---

## Searching by Role

- Text input filters employees whose role contains the search string.
- If none match, show \`"No Employees Added."\`

---

## Combined Filter + Search

Department filter and role search work **together**. Example:

- Department: \`IT\` + Role search: \`Developer\`
- → Shows only employees who are in IT **and** have "Developer" in their role.

---

## Removing Employees

- Each employee has a **Remove** button.
- After removal the list updates immediately.
- If no employees remain (given the active filters), show \`"No Employees Added."\`

---

## Important

Email addresses are **unique identifiers** — no two employees will share the same contact email.
`,
  files: [
    {
      filename: "App.jsx",
      language: "jsx",
      readOnly: true,
      content: `import EmployeeDirectory from "./EmployeeDirectory";

function App() {
  return <EmployeeDirectory />;
}
`,
    },
    {
      filename: "EmployeeDirectory.jsx",
      language: "jsx",
      content: `import { useState } from "react";
import EmployeeForm from "./EmployeeForm";
import EmployeeFilter from "./EmployeeFilter";
import EmployeeList from "./EmployeeList";

function EmployeeDirectory() {
  // TODO: add state for employees (array), departmentFilter (string ""), roleSearch (string "")

  // TODO: implement — append the new employee object to employees
  function addEmployee(employee) {}

  // TODO: implement — remove employee by contact (unique email identifier)
  function removeEmployee(contact) {}

  // TODO: compute filteredEmployees from employees state:
  //   - if departmentFilter is set, keep only employees whose department matches exactly
  //   - if roleSearch is set, keep only employees whose role contains the search string (case-insensitive)
  //   - both filters apply together
  const filteredEmployees = [];

  return (
    <div className="directory">
      <h1>Employee Directory</h1>
      <EmployeeForm onAddEmployee={addEmployee} />
      <EmployeeFilter
        departmentFilter=""
        roleSearch=""
        onDepartmentChange={() => {}}
        onRoleSearchChange={() => {}}
      />
      <EmployeeList employees={filteredEmployees} onRemoveEmployee={removeEmployee} />
    </div>
  );
}

export default EmployeeDirectory;
`,
    },
    {
      filename: "EmployeeForm.jsx",
      language: "jsx",
      content: `import { useState } from "react";

const DEPARTMENTS = ["Engineering", "HR", "IT", "Marketing", "Finance"];

function EmployeeForm({ onAddEmployee }) {
  // TODO: replace these with useState() — one per field, all start as ""
  const name = "";
  const role = "";
  const department = "";
  const contact = "";

  function handleSubmit(e) {
    e.preventDefault();
    // TODO: if any field is empty → alert("All fields are required!") and return
    // TODO: call onAddEmployee({ name, role, department, contact })
    // TODO: reset all fields to ""
  }

  return (
    <form onSubmit={handleSubmit} className="employee-form">
      <input placeholder="Name" value={name} onChange={() => {}} />
      <input placeholder="Role" value={role} onChange={() => {}} />
      <select value={department} onChange={() => {}}>
        <option value="">Select a Department</option>
        {DEPARTMENTS.map((dept) => (
          <option key={dept} value={dept}>{dept}</option>
        ))}
      </select>
      <input type="email" placeholder="Contact" value={contact} onChange={() => {}} />
      <button type="submit">Add Employee</button>
    </form>
  );
}

export default EmployeeForm;
`,
    },
    {
      filename: "EmployeeFilter.jsx",
      language: "jsx",
      content: `const DEPARTMENTS = ["Engineering", "HR", "IT", "Marketing", "Finance"];

function EmployeeFilter({ departmentFilter, roleSearch, onDepartmentChange, onRoleSearchChange }) {
  // TODO: wire each control to its prop value and onChange handler
  return (
    <div className="employee-filter">
      <select value="" onChange={() => {}}>
        <option value="">All Departments</option>
        {DEPARTMENTS.map((dept) => (
          <option key={dept} value={dept}>{dept}</option>
        ))}
      </select>
      <input type="text" placeholder="Search by role..." value="" onChange={() => {}} />
    </div>
  );
}

export default EmployeeFilter;
`,
    },
    {
      filename: "EmployeeList.jsx",
      language: "jsx",
      content: `function EmployeeList({ employees, onRemoveEmployee }) {
  // TODO: when employees.length === 0 return the empty message below
  // TODO: otherwise, map employees to <li> items showing name, role, department, contact
  //       each item must have a Remove button that calls onRemoveEmployee(employee.contact)
  return <p className="empty">No Employees Added.</p>;
}

export default EmployeeList;
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
  background: #f5f5f5;
  color: #111;
}

.directory {
  max-width: 700px;
  margin: 0 auto;
}

h1 {
  font-size: 1.5rem;
  margin-bottom: 16px;
}

.employee-form {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
  padding: 12px;
  background: #fff;
  border-radius: 8px;
  border: 1px solid #ddd;
}

.employee-form input,
.employee-form select {
  flex: 1 1 160px;
  padding: 8px 10px;
  border: 1px solid #ccc;
  border-radius: 6px;
  font-size: 14px;
}

.employee-form button {
  padding: 8px 16px;
  background: #6366f1;
  color: #fff;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
}

.employee-form button:hover { background: #4f46e5; }

.employee-filter {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.employee-filter select,
.employee-filter input {
  flex: 1;
  padding: 8px 10px;
  border: 1px solid #ccc;
  border-radius: 6px;
  font-size: 14px;
}

.employee-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.employee-list li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 8px;
}

.employee-info { display: flex; flex-direction: column; gap: 2px; }
.employee-name { font-weight: 600; font-size: 14px; }
.employee-meta { font-size: 12px; color: #666; }

.employee-list button {
  padding: 6px 12px;
  background: #fee2e2;
  color: #dc2626;
  border: 1px solid #fca5a5;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  flex-shrink: 0;
}

.employee-list button:hover { background: #fecaca; }

.empty {
  color: #666;
  font-style: italic;
  text-align: center;
  padding: 24px;
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 8px;
  margin: 0;
}
`,
    },
  ],
};

export default reactEmployeeDirectory;
