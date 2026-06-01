# React: Job Board Listings

**Difficulty:** Medium/Hard
**Time Limit:** 55 minutes
**Framework:** React + TypeScript
**Topics:** API Fetching, Card Components, Multi-Filter, Tag Filter, Search, Sort, Custom Hook

---

## Problem Statement

Build a **Job Board** that fetches job listings from a mock endpoint and renders them as cards. Users can search by title or company, filter by job type, filter by remote/on-site, filter by one or more tech tags, and sort results. Extract the fetch + filter logic into a custom `useJobListings` hook.

---

## Functional Requirements

- [ ] On mount, fetch jobs from `fetchJobs()` and render as `JobCard` components
- [ ] Show loading and error states
- [ ] Each `JobCard` displays: company logo (placeholder), job title, company name, location, job type badge, remote badge (if applicable), salary range, posted date, and tech tags
- [ ] Search input filters by job title or company name (case-insensitive, real-time)
- [ ] Job type dropdown: `"All Types"`, `"Full-time"`, `"Part-time"`, `"Contract"`, `"Internship"`
- [ ] Remote toggle: `"All"` / `"Remote Only"` / `"On-site Only"`
- [ ] Tech tag filter: a set of tag buttons; selecting one or more shows only jobs with **all** selected tags (AND logic)
- [ ] Sort dropdown: `"Most Recent"`, `"Salary: Highest First"`, `"Company A–Z"`
- [ ] All filters apply simultaneously
- [ ] `"No jobs match your criteria."` when result is empty
- [ ] `"X jobs found"` count

---

## UI / Visual Specification

```
┌──────────────────────────────────────────────────────────────────────┐
│  Job Board                                              12 jobs found │
│                                                                       │
│  [🔍 Search by title or company...]  [Job Type ▼]  [Remote ▼]       │
│                                                                       │
│  Tech Tags: [React] [TypeScript] [Node.js] [AWS] [Python] [Go] ...  │
│  Active: [React ✕] [TypeScript ✕]                                    │
│                                                                       │
│  Sort: [Most Recent ▼]                                               │
│                                                                       │
│  ┌─────────────────────────────────────────────────────┐            │
│  │  [logo]  Senior React Developer              [REMOTE]│            │
│  │          Acme Corp · San Francisco, CA               │            │
│  │          Full-time · $130k–$160k/yr                  │            │
│  │          [React] [TypeScript] [GraphQL]              │            │
│  │          Posted 2 days ago                           │            │
│  └─────────────────────────────────────────────────────┘            │
│  ┌─────────────────────────────────────────────────────┐            │
│  │  [logo]  Backend Engineer                   [ON-SITE]│            │
│  │  ...                                                 │            │
│  └─────────────────────────────────────────────────────┘            │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Technical Requirements

**Must use:**
- A custom `useJobListings()` hook that owns: fetch state, search, filter state, sort state, and the derived filtered list
- A reusable `JobCard` component
- TypeScript — all props and state typed

**Must NOT use:**
- External component libraries
- State management libraries

**Constraints:**
- Tech tag options must be derived from fetched data (unique union of all job tag arrays)
- Salary sort uses the lower bound of the range (e.g., `130000` for `"$130k–$160k"`)
- `fetchJobs()` simulates 300ms delay — do not modify it
- Tech tag filter uses AND logic: all selected tags must appear in the job's tag list

---

## Starter Files

**`JobBoard.tsx`**
```tsx
import { useState, useEffect } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type JobType = "Full-time" | "Part-time" | "Contract" | "Internship";

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
  { id: 1,  title: "Senior React Developer",      company: "Acme Corp",       location: "San Francisco, CA", type: "Full-time",  remote: true,  salaryMin: 130000, salaryMax: 160000, tags: ["React", "TypeScript", "GraphQL"],       postedDaysAgo: 2,  logoUrl: "https://placehold.co/48?text=AC" },
  { id: 2,  title: "Backend Engineer",             company: "Globex",          location: "New York, NY",      type: "Full-time",  remote: false, salaryMin: 120000, salaryMax: 150000, tags: ["Node.js", "AWS", "PostgreSQL"],          postedDaysAgo: 5,  logoUrl: "https://placehold.co/48?text=GX" },
  { id: 3,  title: "Full Stack Developer",         company: "Initech",         location: "Austin, TX",        type: "Full-time",  remote: true,  salaryMin: 110000, salaryMax: 140000, tags: ["React", "Node.js", "TypeScript", "AWS"], postedDaysAgo: 1,  logoUrl: "https://placehold.co/48?text=IT" },
  { id: 4,  title: "Frontend Intern",              company: "Umbrella Inc",    location: "Chicago, IL",       type: "Internship", remote: false, salaryMin: 25000,  salaryMax: 30000,  tags: ["React", "CSS", "JavaScript"],            postedDaysAgo: 7,  logoUrl: "https://placehold.co/48?text=UI" },
  { id: 5,  title: "DevOps Engineer",              company: "Weyland Corp",    location: "Remote",            type: "Contract",   remote: true,  salaryMin: 90000,  salaryMax: 120000, tags: ["AWS", "Docker", "Kubernetes"],           postedDaysAgo: 3,  logoUrl: "https://placehold.co/48?text=WC" },
  { id: 6,  title: "Machine Learning Engineer",   company: "Tyrell Corp",     location: "Seattle, WA",       type: "Full-time",  remote: false, salaryMin: 160000, salaryMax: 200000, tags: ["Python", "TensorFlow", "AWS"],           postedDaysAgo: 10, logoUrl: "https://placehold.co/48?text=TC" },
  { id: 7,  title: "React Native Developer",      company: "Acme Corp",       location: "Remote",            type: "Full-time",  remote: true,  salaryMin: 125000, salaryMax: 155000, tags: ["React", "TypeScript", "React Native"],   postedDaysAgo: 4,  logoUrl: "https://placehold.co/48?text=AC" },
  { id: 8,  title: "Go Backend Engineer",          company: "Initech",         location: "Denver, CO",        type: "Full-time",  remote: false, salaryMin: 115000, salaryMax: 145000, tags: ["Go", "gRPC", "PostgreSQL"],             postedDaysAgo: 6,  logoUrl: "https://placehold.co/48?text=IT" },
  { id: 9,  title: "Data Engineer",               company: "Globex",          location: "Remote",            type: "Contract",   remote: true,  salaryMin: 80000,  salaryMax: 110000, tags: ["Python", "AWS", "Spark"],               postedDaysAgo: 2,  logoUrl: "https://placehold.co/48?text=GX" },
  { id: 10, title: "TypeScript Tech Lead",         company: "Weyland Corp",    location: "Austin, TX",        type: "Full-time",  remote: false, salaryMin: 155000, salaryMax: 185000, tags: ["TypeScript", "Node.js", "AWS", "React"], postedDaysAgo: 0,  logoUrl: "https://placehold.co/48?text=WC" },
  { id: 11, title: "Part-time UI Developer",       company: "Umbrella Inc",    location: "Remote",            type: "Part-time",  remote: true,  salaryMin: 55000,  salaryMax: 70000,  tags: ["React", "CSS", "Figma"],                postedDaysAgo: 8,  logoUrl: "https://placehold.co/48?text=UI" },
  { id: 12, title: "Cloud Architect",              company: "Tyrell Corp",     location: "San Francisco, CA", type: "Full-time",  remote: false, salaryMin: 175000, salaryMax: 210000, tags: ["AWS", "Azure", "Terraform"],            postedDaysAgo: 14, logoUrl: "https://placehold.co/48?text=TC" },
];

async function fetchJobs(): Promise<Job[]> {
  await new Promise((res) => setTimeout(res, 300));
  return MOCK_JOBS;
}

// ─── Your implementation ──────────────────────────────────────────────────────

function useJobListings() {
  // TODO: owns fetch, search, filters, sort state + derived list
  // Return: { jobs, allTags, loading, error, search, setSearch, ... }
}

interface JobCardProps {
  job: Job;
}

function JobCard({ job }: JobCardProps) {
  // TODO: implement
  return <div>{job.title}</div>;
}

export default function JobBoard() {
  // TODO: use the hook, build the UI
  return (
    <div>
      <h1>Job Board</h1>
    </div>
  );
}
```

---

## Acceptance Criteria / Test Cases

| # | Action | Expected Result |
|---|---|---|
| 1 | Page loads | 12 job cards; tech tags derived from all jobs |
| 2 | Search `"react"` | Jobs with "React" in title or company |
| 3 | Select type `"Contract"` | DevOps Engineer + Data Engineer |
| 4 | Toggle `"Remote Only"` | Only remote jobs |
| 5 | Toggle `"On-site Only"` | Only non-remote jobs |
| 6 | Click tag `[TypeScript]` | Jobs containing TypeScript tag |
| 7 | Click `[TypeScript]` + `[AWS]` | Jobs with BOTH tags (AND logic) |
| 8 | Sort `"Salary: Highest First"` | Cloud Architect ($175k) first |
| 9 | Sort `"Most Recent"` | Job posted 0 days ago first |
| 10 | All tag filters combined with remote toggle | Intersection of both applied |
