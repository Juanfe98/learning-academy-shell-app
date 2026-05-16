import type { Challenge } from "@/lib/challenges/types";

const reactCascadingDropdowns: Challenge = {
  slug: "react-cascading-dropdowns",
  title: "React: Cascading Dependent Dropdowns",
  description:
    "Build a job search form with three dependent dropdowns: Department → Role → Level. Each dropdown's options depend on the value selected in the previous one. Practice multi-table data composition and controlled component chains.",
  difficulty: "intermediate",
  tags: ["react", "dropdowns", "dependent-selects", "forms", "state", "filtering", "controlled-components"],
  environment: "react-js",
  entryFile: "App.jsx",
  problemStatement: `## Problem Statement

You have three data tables: **Departments**, **Roles** (linked to department), and **Levels** (linked to role). Build a job search form where each dropdown's options depend on the previous selection.

---

## Dropdown Chain

\`\`\`
Department → Role → Level → [Search Results]
\`\`\`

| Dropdown | Options from | Resets when |
|---|---|---|
| Department | All unique departments | — |
| Role | Roles belonging to selected department | Department changes |
| Level | Levels belonging to selected role | Role changes |

---

## Rules

1. Role dropdown is **disabled** until a Department is selected.
2. Level dropdown is **disabled** until a Role is selected.
3. Selecting a new Department **resets** Role and Level.
4. Selecting a new Role **resets** Level.
5. Show a "Clear All" button that resets every dropdown.

---

## Results

Below the form, show a list of matching job postings from \`JOB_POSTINGS\` that match **all** selected criteria.

- Show: title, department, role, level, salary range, location.
- Show count: **"X openings found"**.
- When nothing is selected yet: show **"Select filters above to see openings."**
- When filters return no results: **"No openings match your filters."**

---

## Hint

Derive dropdown options with \`.filter()\` + \`Array.from(new Set(...))\` on the datasets.
When Department changes: call \`setRole("")\` and \`setLevel("")\`.
`,
  files: [
    {
      filename: "App.jsx",
      language: "jsx",
      content: `import { useState } from "react";
import JobSearchForm from "./JobSearchForm";
import JobList from "./JobList";
import { DEPARTMENTS, ROLES, LEVELS, JOB_POSTINGS } from "./data";

export default function App() {
  // TODO: state for department (""), role (""), level ("")

  // TODO: derive available roles — only roles whose department matches selected department
  // If no department selected, show all roles
  const availableRoles = [];

  // TODO: derive available levels — only levels whose role matches selected role
  // If no role selected, show all levels
  const availableLevels = [];

  // TODO: filter JOB_POSTINGS by all three criteria (only apply a criterion if it's non-empty)
  const filteredJobs = [];

  function handleDepartmentChange(value) {
    // TODO: set department, reset role to "", reset level to ""
  }

  function handleRoleChange(value) {
    // TODO: set role, reset level to ""
  }

  function handleLevelChange(value) {
    // TODO: set level
  }

  function handleClear() {
    // TODO: reset all three to ""
  }

  return (
    <div className="app">
      <h1>Job Search</h1>
      <p className="subtitle">Filter openings by department, role, and level.</p>
      <JobSearchForm
        department={""}
        role={""}
        level={""}
        departments={DEPARTMENTS}
        availableRoles={availableRoles}
        availableLevels={availableLevels}
        onDepartmentChange={handleDepartmentChange}
        onRoleChange={handleRoleChange}
        onLevelChange={handleLevelChange}
        onClear={handleClear}
      />
      <JobList jobs={filteredJobs} filtersActive={false} />
    </div>
  );
}
`,
    },
    {
      filename: "JobSearchForm.jsx",
      language: "jsx",
      content: `export default function JobSearchForm({
  department, role, level,
  departments, availableRoles, availableLevels,
  onDepartmentChange, onRoleChange, onLevelChange, onClear,
}) {
  return (
    <form className="search-form" onSubmit={(e) => e.preventDefault()}>
      {/* Department dropdown — always enabled */}
      <div className="field">
        <label htmlFor="department">Department</label>
        {/* TODO: <select> with value={department}, onChange calls onDepartmentChange */}
        {/* Options: "All Departments" + departments.map(...) */}
        <select id="department" value={department} onChange={() => {}}>
          <option value="">All Departments</option>
        </select>
      </div>

      {/* Role dropdown — disabled when no department selected */}
      <div className="field">
        <label htmlFor="role">Role</label>
        {/* TODO: <select> disabled={!department}, onChange calls onRoleChange */}
        {/* Options: "All Roles" + availableRoles.map(...) */}
        <select id="role" value={role} onChange={() => {}} disabled={!department}>
          <option value="">All Roles</option>
        </select>
      </div>

      {/* Level dropdown — disabled when no role selected */}
      <div className="field">
        <label htmlFor="level">Level</label>
        {/* TODO: <select> disabled={!role}, onChange calls onLevelChange */}
        {/* Options: "All Levels" + availableLevels.map(...) */}
        <select id="level" value={level} onChange={() => {}} disabled={!role}>
          <option value="">All Levels</option>
        </select>
      </div>

      <button type="button" className="clear-btn" onClick={onClear}>
        Clear All
      </button>
    </form>
  );
}
`,
    },
    {
      filename: "JobList.jsx",
      language: "jsx",
      content: `export default function JobList({ jobs, filtersActive }) {
  if (!filtersActive) {
    return <p className="hint">Select filters above to see openings.</p>;
  }
  if (jobs.length === 0) {
    return <p className="empty">No openings match your filters.</p>;
  }
  return (
    <div>
      <p className="count">{jobs.length} opening{jobs.length !== 1 ? "s" : ""} found</p>
      <ul className="job-list">
        {jobs.map((job) => (
          <li key={job.id} className="job-card">
            {/* TODO: show title, department, role, level, salary, location */}
            <div className="job-title">{job.title}</div>
            <div className="job-meta">
              {job.department} · {job.role} · {job.level}
            </div>
            <div className="job-details">
              <span className="salary">{job.salary}</span>
              <span className="location">📍 {job.location}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
`,
    },
    {
      filename: "data.js",
      language: "js",
      readOnly: true,
      content: `export const DEPARTMENTS = ["Engineering", "Product", "Design", "Data", "Marketing"];

export const ROLES = [
  { id: "fe",    label: "Frontend",          department: "Engineering" },
  { id: "be",    label: "Backend",           department: "Engineering" },
  { id: "fs",    label: "Fullstack",         department: "Engineering" },
  { id: "devops",label: "DevOps/Platform",   department: "Engineering" },
  { id: "pm",    label: "Product Manager",   department: "Product" },
  { id: "po",    label: "Product Owner",     department: "Product" },
  { id: "ux",    label: "UX Designer",       department: "Design" },
  { id: "ui",    label: "UI Designer",       department: "Design" },
  { id: "da",    label: "Data Analyst",      department: "Data" },
  { id: "ds",    label: "Data Scientist",    department: "Data" },
  { id: "de",    label: "Data Engineer",     department: "Data" },
  { id: "mk",    label: "Marketing Manager", department: "Marketing" },
  { id: "seo",   label: "SEO Specialist",    department: "Marketing" },
];

export const LEVELS = [
  { id: "jr",  label: "Junior",    roles: ["fe","be","fs","ux","ui","da","mk","seo"] },
  { id: "mid", label: "Mid",       roles: ["fe","be","fs","devops","ux","ui","da","ds","mk","seo"] },
  { id: "sr",  label: "Senior",    roles: ["fe","be","fs","devops","pm","po","ux","ui","da","ds","de","mk"] },
  { id: "lead",label: "Lead",      roles: ["fe","be","fs","devops","pm","da","ds","de"] },
  { id: "staff",label: "Staff",    roles: ["fe","be","fs","devops","ds","de"] },
  { id: "princ",label: "Principal",roles: ["fe","be","devops","ds"] },
];

export const JOB_POSTINGS = [
  { id:  1, title: "Junior Frontend Dev",       department: "Engineering", role: "Frontend",         level: "Junior",    salary: "$65k–$85k",   location: "Remote" },
  { id:  2, title: "Mid Frontend Engineer",     department: "Engineering", role: "Frontend",         level: "Mid",       salary: "$90k–$115k",  location: "Austin, TX" },
  { id:  3, title: "Senior Frontend Engineer",  department: "Engineering", role: "Frontend",         level: "Senior",    salary: "$130k–$160k", location: "Remote" },
  { id:  4, title: "Lead Frontend Engineer",    department: "Engineering", role: "Frontend",         level: "Lead",      salary: "$160k–$190k", location: "San Francisco" },
  { id:  5, title: "Staff Frontend Engineer",   department: "Engineering", role: "Frontend",         level: "Staff",     salary: "$190k–$230k", location: "Remote" },
  { id:  6, title: "Junior Backend Dev",        department: "Engineering", role: "Backend",          level: "Junior",    salary: "$70k–$90k",   location: "Austin, TX" },
  { id:  7, title: "Senior Backend Engineer",   department: "Engineering", role: "Backend",          level: "Senior",    salary: "$140k–$170k", location: "Remote" },
  { id:  8, title: "Staff Backend Engineer",    department: "Engineering", role: "Backend",          level: "Staff",     salary: "$200k–$240k", location: "New York" },
  { id:  9, title: "Fullstack Engineer (Mid)",  department: "Engineering", role: "Fullstack",        level: "Mid",       salary: "$95k–$120k",  location: "Remote" },
  { id: 10, title: "Senior Fullstack Engineer", department: "Engineering", role: "Fullstack",        level: "Senior",    salary: "$135k–$165k", location: "Chicago" },
  { id: 11, title: "DevOps Engineer (Mid)",     department: "Engineering", role: "DevOps/Platform",  level: "Mid",       salary: "$100k–$125k", location: "Remote" },
  { id: 12, title: "Senior DevOps Engineer",    department: "Engineering", role: "DevOps/Platform",  level: "Senior",    salary: "$145k–$175k", location: "Seattle" },
  { id: 13, title: "Product Manager",           department: "Product",     role: "Product Manager",  level: "Senior",    salary: "$130k–$155k", location: "Remote" },
  { id: 14, title: "Lead Product Manager",      department: "Product",     role: "Product Manager",  level: "Lead",      salary: "$165k–$195k", location: "San Francisco" },
  { id: 15, title: "Product Owner",             department: "Product",     role: "Product Owner",    level: "Mid",       salary: "$85k–$110k",  location: "Remote" },
  { id: 16, title: "Junior UX Designer",        department: "Design",      role: "UX Designer",      level: "Junior",    salary: "$60k–$80k",   location: "Remote" },
  { id: 17, title: "Senior UX Designer",        department: "Design",      role: "UX Designer",      level: "Senior",    salary: "$120k–$150k", location: "New York" },
  { id: 18, title: "Senior UI Designer",        department: "Design",      role: "UI Designer",      level: "Senior",    salary: "$115k–$145k", location: "Remote" },
  { id: 19, title: "Data Analyst",              department: "Data",        role: "Data Analyst",     level: "Mid",       salary: "$85k–$110k",  location: "Austin, TX" },
  { id: 20, title: "Senior Data Scientist",     department: "Data",        role: "Data Scientist",   level: "Senior",    salary: "$150k–$185k", location: "Remote" },
  { id: 21, title: "Staff Data Scientist",      department: "Data",        role: "Data Scientist",   level: "Staff",     salary: "$200k–$245k", location: "San Francisco" },
  { id: 22, title: "Data Engineer (Senior)",    department: "Data",        role: "Data Engineer",    level: "Senior",    salary: "$145k–$175k", location: "Remote" },
  { id: 23, title: "Marketing Manager",         department: "Marketing",   role: "Marketing Manager",level: "Mid",       salary: "$80k–$105k",  location: "Austin, TX" },
  { id: 24, title: "Senior SEO Specialist",     department: "Marketing",   role: "SEO Specialist",   level: "Senior",    salary: "$95k–$120k",  location: "Remote" },
];
`,
    },
    {
      filename: "styles.css",
      language: "css",
      content: `* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: system-ui, sans-serif;
  background: #f8fafc;
  color: #0f172a;
  padding: 24px;
}

.app { max-width: 780px; margin: 0 auto; }

h1 { font-size: 1.6rem; font-weight: 700; margin-bottom: 4px; }
.subtitle { color: #64748b; font-size: 14px; margin-bottom: 20px; }

.search-form {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr auto;
  gap: 12px;
  align-items: end;
  padding: 20px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  margin-bottom: 24px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}

.field { display: flex; flex-direction: column; gap: 5px; }

label { font-size: 12px; font-weight: 600; color: #475569; text-transform: uppercase; letter-spacing: 0.04em; }

select {
  padding: 9px 12px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-size: 14px;
  color: #1e293b;
  background: #fff;
  cursor: pointer;
  outline: none;
  transition: border-color 150ms, box-shadow 150ms;
}

select:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.15); }
select:disabled { background: #f1f5f9; color: #94a3b8; cursor: not-allowed; }

.clear-btn {
  padding: 9px 16px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 13px;
  color: #64748b;
  cursor: pointer;
  font-weight: 500;
  height: fit-content;
  transition: all 150ms;
}
.clear-btn:hover { background: #f8fafc; color: #334155; border-color: #cbd5e1; }

.count { font-size: 14px; color: #64748b; font-weight: 500; margin-bottom: 12px; }
.hint  { color: #94a3b8; font-style: italic; font-size: 14px; padding: 24px; text-align: center; }
.empty { color: #94a3b8; font-style: italic; font-size: 14px; padding: 24px; text-align: center; }

.job-list { list-style: none; display: flex; flex-direction: column; gap: 10px; }

.job-card {
  padding: 16px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.04);
  display: flex;
  flex-direction: column;
  gap: 6px;
  transition: box-shadow 150ms;
}
.job-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
.job-title { font-weight: 600; font-size: 15px; color: #0f172a; }
.job-meta  { font-size: 13px; color: #64748b; }
.job-details { display: flex; gap: 16px; margin-top: 4px; }
.salary   { font-size: 13px; font-weight: 600; color: #059669; }
.location { font-size: 13px; color: #64748b; }

@media (max-width: 600px) {
  .search-form { grid-template-columns: 1fr; }
}
`,
    },
  ],
};

export default reactCascadingDropdowns;
