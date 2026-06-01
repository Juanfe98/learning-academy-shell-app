import type { Challenge } from "@/lib/challenges/types";

const reactJobBoard: Challenge = {
  slug: "react-job-board",
  title: "Job Board Listings",
  description:
    "Fetch job listings and render them as cards. Extract all data logic into a custom useJobListings hook. Implement search by title/company, job type dropdown, remote toggle, multi-tag AND filter (tags derived from data), and sort by recency or salary.",
  difficulty: "advanced",
  tags: ["react", "typescript", "custom-hook", "api-fetching", "multi-filter", "and-logic", "sort"],
  environment: "react-ts",
  entryFile: "App.tsx",
  problemStatement: `# Job Board Listings

**Difficulty:** Advanced | **Time Limit:** 55 minutes

---

## Problem Statement

Build a **Job Board** that fetches job listings from a mock endpoint and renders them as cards. Extract all fetch + filter logic into a custom \`useJobListings\` hook.

---

## Functional Requirements

- On mount, fetch jobs from \`fetchJobs()\` and render as \`JobCard\` components
- Show loading and error states
- Each \`JobCard\` shows: logo, title, company, location, type badge, remote badge, salary range, posted date, tags
- Search filters by job title or company (case-insensitive, real-time)
- Job type dropdown: \`"All Types"\`, \`"Full-time"\`, \`"Part-time"\`, \`"Contract"\`, \`"Internship"\`
- Remote toggle: \`"All"\` / \`"Remote Only"\` / \`"On-site Only"\`
- Tech tag filter: clicking a tag toggles it; jobs must have **ALL** selected tags (AND logic)
- Tag options derived from fetched data — no hardcoded list
- Sort: \`"Most Recent"\`, \`"Salary: Highest First"\`, \`"Company A–Z"\`
- All filters apply simultaneously
- \`"No jobs match your criteria."\` when empty
- \`"X jobs found"\` count

---

## Technical Requirements

**Must use:**
- A custom \`useJobListings()\` hook — owns fetch state, all filter/sort state, and derived list
- A reusable \`JobCard\` component
- TypeScript — all props and state typed

**Constraints:**
- Salary sort uses \`salaryMin\` as the key
- Tag filter: AND logic — all selected tags must appear in job's tag array
- \`fetchJobs()\` simulates 300ms delay — do not modify it

---

## Acceptance Criteria

| # | Action | Expected Result |
|---|---|---|
| 1 | Page loads | 12 job cards; tags derived from all jobs |
| 2 | Search \`"react"\` | Jobs with "React" in title or company |
| 3 | Type \`"Contract"\` | DevOps Engineer + Data Engineer |
| 4 | \`"Remote Only"\` | Only remote jobs |
| 5 | \`"On-site Only"\` | Only non-remote jobs |
| 6 | Click \`[TypeScript]\` | Jobs with TypeScript tag |
| 7 | Click \`[TypeScript]\` + \`[AWS]\` | Jobs with BOTH tags (AND) |
| 8 | Sort \`"Salary: Highest First"\` | Cloud Architect ($175k) first |
| 9 | Sort \`"Most Recent"\` | Posted 0 days ago first |
| 10 | Tag filter + remote toggle | Intersection applied |
`,
  files: [
    {
      filename: "App.tsx",
      language: "tsx",
      content: `import { useState, useEffect } from "react";
import "./styles.css";

// ─── Types ────────────────────────────────────────────────────────────────────

type JobType = "Full-time" | "Part-time" | "Contract" | "Internship";
type RemoteFilter = "all" | "remote" | "onsite";
type SortOption = "recent" | "salary-desc" | "company-asc";

interface Job {
  id: number;
  title: string;
  company: string;
  location: string;
  type: JobType;
  remote: boolean;
  salaryMin: number;
  salaryMax: number;
  tags: string[];
  postedDaysAgo: number;
  logoUrl: string;
}

// ─── Mock API — do not modify ─────────────────────────────────────────────────

const MOCK_JOBS: Job[] = [
  { id: 1,  title: "Senior React Developer",    company: "Acme Corp",    location: "San Francisco, CA", type: "Full-time",  remote: true,  salaryMin: 130000, salaryMax: 160000, tags: ["React", "TypeScript", "GraphQL"],        postedDaysAgo: 2,  logoUrl: "https://placehold.co/48?text=AC" },
  { id: 2,  title: "Backend Engineer",           company: "Globex",       location: "New York, NY",      type: "Full-time",  remote: false, salaryMin: 120000, salaryMax: 150000, tags: ["Node.js", "AWS", "PostgreSQL"],           postedDaysAgo: 5,  logoUrl: "https://placehold.co/48?text=GX" },
  { id: 3,  title: "Full Stack Developer",       company: "Initech",      location: "Austin, TX",        type: "Full-time",  remote: true,  salaryMin: 110000, salaryMax: 140000, tags: ["React", "Node.js", "TypeScript", "AWS"],  postedDaysAgo: 1,  logoUrl: "https://placehold.co/48?text=IT" },
  { id: 4,  title: "Frontend Intern",            company: "Umbrella Inc", location: "Chicago, IL",       type: "Internship", remote: false, salaryMin: 25000,  salaryMax: 30000,  tags: ["React", "CSS", "JavaScript"],             postedDaysAgo: 7,  logoUrl: "https://placehold.co/48?text=UI" },
  { id: 5,  title: "DevOps Engineer",            company: "Weyland Corp", location: "Remote",            type: "Contract",   remote: true,  salaryMin: 90000,  salaryMax: 120000, tags: ["AWS", "Docker", "Kubernetes"],            postedDaysAgo: 3,  logoUrl: "https://placehold.co/48?text=WC" },
  { id: 6,  title: "Machine Learning Engineer", company: "Tyrell Corp",  location: "Seattle, WA",       type: "Full-time",  remote: false, salaryMin: 160000, salaryMax: 200000, tags: ["Python", "TensorFlow", "AWS"],            postedDaysAgo: 10, logoUrl: "https://placehold.co/48?text=TC" },
  { id: 7,  title: "React Native Developer",    company: "Acme Corp",    location: "Remote",            type: "Full-time",  remote: true,  salaryMin: 125000, salaryMax: 155000, tags: ["React", "TypeScript", "React Native"],    postedDaysAgo: 4,  logoUrl: "https://placehold.co/48?text=AC" },
  { id: 8,  title: "Go Backend Engineer",        company: "Initech",      location: "Denver, CO",        type: "Full-time",  remote: false, salaryMin: 115000, salaryMax: 145000, tags: ["Go", "gRPC", "PostgreSQL"],              postedDaysAgo: 6,  logoUrl: "https://placehold.co/48?text=IT" },
  { id: 9,  title: "Data Engineer",             company: "Globex",       location: "Remote",            type: "Contract",   remote: true,  salaryMin: 80000,  salaryMax: 110000, tags: ["Python", "AWS", "Spark"],                postedDaysAgo: 2,  logoUrl: "https://placehold.co/48?text=GX" },
  { id: 10, title: "TypeScript Tech Lead",       company: "Weyland Corp", location: "Austin, TX",        type: "Full-time",  remote: false, salaryMin: 155000, salaryMax: 185000, tags: ["TypeScript", "Node.js", "AWS", "React"],  postedDaysAgo: 0,  logoUrl: "https://placehold.co/48?text=WC" },
  { id: 11, title: "Part-time UI Developer",     company: "Umbrella Inc", location: "Remote",            type: "Part-time",  remote: true,  salaryMin: 55000,  salaryMax: 70000,  tags: ["React", "CSS", "Figma"],                 postedDaysAgo: 8,  logoUrl: "https://placehold.co/48?text=UI" },
  { id: 12, title: "Cloud Architect",            company: "Tyrell Corp",  location: "San Francisco, CA", type: "Full-time",  remote: false, salaryMin: 175000, salaryMax: 210000, tags: ["AWS", "Azure", "Terraform"],             postedDaysAgo: 14, logoUrl: "https://placehold.co/48?text=TC" },
];

async function fetchJobs(): Promise<Job[]> {
  await new Promise((res) => setTimeout(res, 300));
  return MOCK_JOBS;
}

// ─── Custom hook ──────────────────────────────────────────────────────────────

interface UseJobListingsResult {
  jobs: Job[];
  filteredJobs: Job[];
  allTags: string[];
  loading: boolean;
  error: string | null;
  search: string;
  setSearch: (v: string) => void;
  jobType: string;
  setJobType: (v: string) => void;
  remoteFilter: RemoteFilter;
  setRemoteFilter: (v: RemoteFilter) => void;
  selectedTags: Set<string>;
  toggleTag: (tag: string) => void;
  sort: SortOption;
  setSort: (v: SortOption) => void;
}

function useJobListings(): UseJobListingsResult {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [jobType, setJobType] = useState("All Types");
  const [remoteFilter, setRemoteFilter] = useState<RemoteFilter>("all");
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [sort, setSort] = useState<SortOption>("recent");

  useEffect(() => {
    // TODO: call fetchJobs(), update jobs/loading/error state
  }, []);

  // TODO: derive unique sorted tags from all jobs
  const allTags: string[] = [];

  function toggleTag(tag: string) {
    // TODO: add tag to selectedTags if absent, remove if present
    // Hint: create a new Set (don't mutate), then setSelectedTags
  }

  // TODO: compute filteredJobs
  // Apply in order: search → jobType → remoteFilter → selectedTags (AND) → sort
  // Salary sort: ascending salaryMin descending → highest first
  const filteredJobs: Job[] = [];

  return { jobs, filteredJobs, allTags, loading, error, search, setSearch, jobType, setJobType, remoteFilter, setRemoteFilter, selectedTags, toggleTag, sort, setSort };
}

// ─── JobCard component ────────────────────────────────────────────────────────

interface JobCardProps {
  job: Job;
}

function JobCard({ job }: JobCardProps) {
  const salaryLabel = \`$\${(job.salaryMin / 1000).toFixed(0)}k–$\${(job.salaryMax / 1000).toFixed(0)}k/yr\`;
  const postedLabel = job.postedDaysAgo === 0 ? "Posted today" : \`Posted \${job.postedDaysAgo}d ago\`;

  // TODO: render full card layout
  // Hint: show logo, title, company · location, type badge, remote badge, salary, tags, posted date
  return (
    <div className="job-card">
      <img src={job.logoUrl} alt={job.company} className="job-logo" />
      <div className="job-info">
        <p className="job-title">{job.title}</p>
        <p className="job-meta">{job.company} · {job.location}</p>
        <p className="job-salary">{salaryLabel} · {postedLabel}</p>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function App() {
  const {
    jobs, filteredJobs, allTags, loading, error,
    search, setSearch, jobType, setJobType,
    remoteFilter, setRemoteFilter, selectedTags, toggleTag,
    sort, setSort,
  } = useJobListings();

  if (loading) return <div className="status-msg">Loading jobs...</div>;
  if (error) return <div className="status-msg error">{error}</div>;

  return (
    <div className="board">
      <div className="board-header">
        <h1>Job Board</h1>
        <span className="count">{filteredJobs.length} jobs found</span>
      </div>

      <div className="controls-row">
        <input
          className="search-input"
          placeholder="Search by title or company..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="type-select" value={jobType} onChange={(e) => setJobType(e.target.value)}>
          {["All Types", "Full-time", "Part-time", "Contract", "Internship"].map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <select className="remote-select" value={remoteFilter} onChange={(e) => setRemoteFilter(e.target.value as RemoteFilter)}>
          <option value="all">All</option>
          <option value="remote">Remote Only</option>
          <option value="onsite">On-site Only</option>
        </select>
        <select className="sort-select" value={sort} onChange={(e) => setSort(e.target.value as SortOption)}>
          <option value="recent">Most Recent</option>
          <option value="salary-desc">Salary: Highest First</option>
          <option value="company-asc">Company A–Z</option>
        </select>
      </div>

      <div className="tag-filter">
        <span className="filter-label">Tags:</span>
        {/* TODO: render a button for each tag in allTags
            - active when tag is in selectedTags
            - onClick calls toggleTag(tag) */}
        {allTags.length === 0 && <span className="placeholder-hint">(tags load after fetch)</span>}
      </div>

      {filteredJobs.length === 0 ? (
        <p className="status-msg">No jobs match your criteria.</p>
      ) : (
        <div className="job-list">
          {filteredJobs.map((job) => (
            <JobCard key={job.id} job={job} />
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

.board-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}

h1 { margin: 0; font-size: 1.5rem; }
.count { font-size: 13px; color: #6b7280; }

.controls-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 10px;
}

.search-input { flex: 1; min-width: 160px; }

.search-input,
.type-select,
.remote-select,
.sort-select {
  padding: 7px 10px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 13px;
}

.tag-filter {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  margin-bottom: 14px;
}

.filter-label {
  font-size: 12px;
  font-weight: 600;
  color: #374151;
}

.tag-btn {
  padding: 3px 10px;
  border: 1px solid #d1d5db;
  border-radius: 999px;
  font-size: 12px;
  background: #fff;
  cursor: pointer;
}

.tag-btn:hover { border-color: #6366f1; color: #6366f1; }
.tag-btn.active { background: #6366f1; color: #fff; border-color: #6366f1; }

.placeholder-hint { font-size: 12px; color: #9ca3af; font-style: italic; }

.job-list { display: flex; flex-direction: column; gap: 10px; }

.job-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 14px;
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.job-logo {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  flex-shrink: 0;
}

.job-info { flex: 1; }

.job-title {
  margin: 0 0 2px;
  font-size: 15px;
  font-weight: 700;
}

.job-meta,
.job-salary {
  margin: 0;
  font-size: 13px;
  color: #6b7280;
}

.badges {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 6px;
}

.badge {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 999px;
}

.badge-type { background: #ede9fe; color: #5b21b6; }
.badge-remote { background: #d1fae5; color: #065f46; }
.badge-onsite { background: #fee2e2; color: #991b1b; }

.job-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 6px;
}

.job-tag {
  font-size: 11px;
  background: #f3f4f6;
  color: #374151;
  border-radius: 4px;
  padding: 2px 7px;
}

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

export default reactJobBoard;
