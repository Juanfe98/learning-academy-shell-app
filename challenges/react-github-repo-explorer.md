# React: GitHub Repository Explorer

**Difficulty:** Medium/Hard
**Time Limit:** 55 minutes
**Framework:** React + TypeScript
**Topics:** Real REST API, Async State, Card Components, Search, Filter, Sort, Pagination

---

## Problem Statement

Build a **GitHub Repository Explorer** that fetches public repositories for a given GitHub username via the real GitHub REST API, displays them as cards, and lets the user search, filter by language, and sort results. The username input must be controlled — no fetch fires until the user submits.

---

## Functional Requirements

- [ ] A username input + "Search" button at the top
- [ ] On submit, fetch repos from `https://api.github.com/users/{username}/repos?per_page=100`
- [ ] Render each repo as a `RepoCard` component showing: name, description, language badge, stars count, forks count, last updated date (formatted as `"Updated Jan 5, 2024"`)
- [ ] Local search input (below the username bar) filters visible cards by repo name or description (real-time)
- [ ] Language dropdown filters to a single language; options derived from the fetched repos (`"All Languages"` default)
- [ ] Sort dropdown: `"Stars: High to Low"`, `"Stars: Low to High"`, `"Name A–Z"`, `"Updated: Most Recent"`
- [ ] Show loading spinner while fetching
- [ ] Show a not-found message if the username returns 404
- [ ] Show a generic error message for other failures
- [ ] Show empty state `"No repositories match."` when local filters produce no results
- [ ] Show `"X repositories"` count

---

## UI / Visual Specification

```
┌──────────────────────────────────────────────────────────────────────┐
│  GitHub Repo Explorer                                                │
│  ┌──────────────────────────┐  ┌────────┐                           │
│  │  github username...       │  │ Search │                           │
│  └──────────────────────────┘  └────────┘                           │
│                                                                      │
│  [🔍 Filter repos...      ]   [Language ▼]   [Sort by ▼]  42 repos  │
│                                                                      │
│  ┌─────────────────────────┐  ┌─────────────────────────┐           │
│  │ react-dashboard          │  │ ts-utils                 │           │
│  │ A dashboard built with  │  │ TypeScript utility belt  │           │
│  │ [TypeScript]             │  │ [TypeScript]             │           │
│  │ ★ 142  ⑂ 23              │  │ ★ 89  ⑂ 11               │           │
│  │ Updated Mar 12, 2024     │  │ Updated Jan 4, 2024      │           │
│  └─────────────────────────┘  └─────────────────────────┘           │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Technical Requirements

**Must use:**
- `useState`, `useEffect` (for side effects), `useRef` (for the input focus or abort controller)
- A reusable `RepoCard` component
- An `AbortController` to cancel in-flight requests when a new search is submitted before the previous one resolves
- TypeScript — all props and state typed

**Must NOT use:**
- External HTTP libraries (axios, got, etc.) — use native `fetch`
- External component libraries

**Constraints:**
- Language filter options must be derived from fetched data (no hardcoded list)
- Repos with `null` language show as `"Unknown"` in the filter list
- Date formatting must not use external libraries — use `Intl.DateTimeFormat` or manual formatting
- The username input must be trimmed before use; empty submit is a no-op

---

## Starter Files

**`GithubRepoExplorer.tsx`**
```tsx
import { useState, useRef } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Repo {
  id: number;
  name: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  updated_at: string; // ISO 8601
  html_url: string;
}

// ─── Your implementation ──────────────────────────────────────────────────────

interface RepoCardProps {
  repo: Repo;
}

function RepoCard({ repo }: RepoCardProps) {
  // TODO: implement
  return <div>{repo.name}</div>;
}

function formatDate(isoString: string): string {
  // TODO: return "Updated Jan 5, 2024" style string
  return isoString;
}

export default function GithubRepoExplorer() {
  // TODO: implement

  return (
    <div>
      <h1>GitHub Repo Explorer</h1>
      {/* TODO: username input + Search button */}
      {/* TODO: local filter bar (search, language, sort) */}
      {/* TODO: repo grid */}
    </div>
  );
}
```

---

## Acceptance Criteria / Test Cases

| # | Action | Expected Result |
|---|---|---|
| 1 | Submit empty username | No fetch, no state change |
| 2 | Submit `"torvalds"` (valid user) | Repos fetched and rendered as cards |
| 3 | Language dropdown | Options built from fetched repos, no duplicates |
| 4 | Filter by `"C"` | Only C repos shown |
| 5 | Local search `"linux"` | Only repos with "linux" in name or description |
| 6 | Sort `"Stars: High to Low"` | Most starred repo first |
| 7 | Submit new username while previous is loading | Previous request cancelled (AbortController) |
| 8 | Submit non-existent username | `"User not found."` message |
| 9 | Language filter + local search combined | Both filters apply simultaneously |
| 10 | All local filters cleared | Full repo list for the current user shown |

---

## Bonus (if time allows)

- Persist the last searched username in `localStorage` and pre-fill on load
- Add a "View on GitHub" link on each card
- Show a skeleton loading grid instead of a spinner
