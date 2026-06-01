import type { Challenge } from "@/lib/challenges/types";

const reactGithubRepoExplorer: Challenge = {
  slug: "react-github-repo-explorer",
  title: "GitHub Repository Explorer",
  description:
    "Fetch public repos from the real GitHub REST API for a given username. Implement AbortController for request cancellation, local search by name/description, a language filter derived from the data, and sort controls.",
  difficulty: "advanced",
  tags: ["react", "typescript", "hooks", "rest-api", "fetch", "abort-controller", "search", "filter", "sort"],
  environment: "react-ts",
  entryFile: "App.tsx",
  problemStatement: `# GitHub Repository Explorer

**Difficulty:** Advanced | **Time Limit:** 55 minutes

---

## Problem Statement

Build a **GitHub Repository Explorer** that fetches public repositories for a given GitHub username via the real GitHub REST API. Display repos as cards with search, language filter, and sort. The username input is controlled — no fetch fires until the user submits.

---

## Functional Requirements

- A username input + "Search" button at the top
- On submit, fetch from \`https://api.github.com/users/{username}/repos?per_page=100\`
- Each \`RepoCard\` shows: name, description, language badge, stars (★), forks (⑂), and formatted update date
- Local search filters by repo name or description (real-time, case-insensitive)
- Language dropdown derived from fetched data (\`"All Languages"\` default; \`null\` language → \`"Unknown"\`)
- Sort: \`"Stars: High to Low"\`, \`"Stars: Low to High"\`, \`"Name A–Z"\`, \`"Updated: Most Recent"\`
- Show loading spinner during fetch
- Show \`"User not found."\` on 404; show generic error for other failures
- Show \`"No repositories match."\` when filters produce empty result
- Show \`"X repositories"\` count
- Use \`AbortController\` to cancel in-flight requests when a new search is submitted

---

## Technical Requirements

**Must use:**
- \`useState\`, \`useRef\`
- A reusable \`RepoCard\` component
- \`AbortController\` — cancel the previous fetch when a new one starts
- Native \`fetch\` — no external HTTP libraries
- \`Intl.DateTimeFormat\` or manual formatting for dates (no libraries)
- TypeScript — all props and state typed

**Constraints:**
- Empty username submit is a no-op (trim first)
- Language filter options derived from fetched data — no hardcoded list
- Repos with \`null\` language → shown as \`"Unknown"\` in filter

---

## Acceptance Criteria

| # | Action | Expected Result |
|---|---|---|
| 1 | Submit empty username | No fetch fires |
| 2 | Submit \`"torvalds"\` | Repos fetched and rendered |
| 3 | Language dropdown | Built from fetched repos, no duplicates |
| 4 | Filter by \`"C"\` | Only C repos shown |
| 5 | Search \`"linux"\` | Only repos with "linux" in name or description |
| 6 | Sort \`"Stars: High to Low"\` | Most-starred first |
| 7 | New search while loading | Previous request cancelled via AbortController |
| 8 | Non-existent username | \`"User not found."\` |
| 9 | Language filter + search combined | Both apply simultaneously |
| 10 | Clear all local filters | Full repo list restored |

---

## Bonus

- Persist last searched username in \`localStorage\` and pre-fill on load
- Add "View on GitHub" link on each card (use \`html_url\`)
`,
  files: [
    {
      filename: "App.tsx",
      language: "tsx",
      content: `import { useState, useRef } from "react";
import "./styles.css";

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

type SortOption = "stars-desc" | "stars-asc" | "name-asc" | "updated-desc";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(isoString: string): string {
  // TODO: return "Updated Jan 5, 2024" style string
  // Hint: new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(isoString))
  return \`Updated \${isoString}\`;
}

// ─── RepoCard component ───────────────────────────────────────────────────────

interface RepoCardProps {
  repo: Repo;
}

function RepoCard({ repo }: RepoCardProps) {
  // TODO: render name, description, language badge, stars, forks, formatted date
  return (
    <div className="repo-card">
      <p className="repo-name">{repo.name}</p>
      <p className="repo-desc">{repo.description ?? "No description"}</p>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function App() {
  const [usernameInput, setUsernameInput] = useState("");
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [language, setLanguage] = useState("All Languages");
  const [sort, setSort] = useState<SortOption>("stars-desc");

  // useRef to hold the AbortController so we can cancel in-flight requests
  const abortRef = useRef<AbortController | null>(null);

  async function handleSearch() {
    const username = usernameInput.trim();
    if (!username) return; // TODO: empty submit is a no-op

    // TODO: cancel previous in-flight request
    // abortRef.current?.abort();
    // abortRef.current = new AbortController();

    setLoading(true);
    setError(null);
    setRepos([]);
    setCurrentUser(username);
    setSearch("");
    setLanguage("All Languages");

    // TODO: fetch from https://api.github.com/users/{username}/repos?per_page=100
    // Use the signal from abortRef.current for cancellation
    // Handle 404 → "User not found."
    // Handle AbortError → ignore (user started a new search)
    // Handle other errors → "Failed to load repositories."
    // On success → setRepos(data)
    // Always → setLoading(false)
    setLoading(false);
  }

  // TODO: derive unique language options from repos
  // null language → "Unknown"; sort alphabetically; prepend "All Languages"
  const languageOptions: string[] = ["All Languages"];

  // TODO: compute filteredRepos
  // 1. Filter by search (name or description, case-insensitive)
  // 2. Filter by language (skip if "All Languages"; treat null as "Unknown")
  // 3. Sort by current sort option (use .slice() before .sort())
  const filteredRepos: Repo[] = [];

  return (
    <div className="explorer">
      <h1>GitHub Repo Explorer</h1>

      <div className="username-bar">
        <input
          className="username-input"
          placeholder="Enter GitHub username..."
          value={usernameInput}
          onChange={(e) => setUsernameInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
        />
        <button className="search-btn" onClick={handleSearch} disabled={loading}>
          {loading ? "Loading..." : "Search"}
        </button>
      </div>

      {error && <p className="error-msg">{error}</p>}

      {currentUser && !loading && !error && (
        <>
          <div className="filter-bar">
            <input
              className="filter-input"
              placeholder="Filter repos..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {/* TODO: language <select> bound to language state, options from languageOptions */}
            {/* TODO: sort <select> bound to sort state */}
            <span className="count">{filteredRepos.length} repositories</span>
          </div>

          {filteredRepos.length === 0 ? (
            <p className="status-msg">No repositories match.</p>
          ) : (
            <div className="repo-grid">
              {filteredRepos.map((r) => (
                <RepoCard key={r.id} repo={r} />
              ))}
            </div>
          )}
        </>
      )}

      {!currentUser && !loading && (
        <p className="status-msg">Enter a GitHub username above and press Search.</p>
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
  background: #f6f8fa;
  color: #24292f;
}

h1 { margin: 0 0 16px; font-size: 1.4rem; }

.username-bar {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.username-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #d0d7de;
  border-radius: 6px;
  font-size: 14px;
}

.search-btn {
  padding: 8px 18px;
  background: #2da44e;
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  font-weight: 600;
}

.search-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.search-btn:hover:not(:disabled) { background: #2c974b; }

.filter-bar {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.filter-input,
.lang-select,
.sort-select {
  padding: 6px 10px;
  border: 1px solid #d0d7de;
  border-radius: 6px;
  font-size: 13px;
}

.filter-input { flex: 1; min-width: 140px; }

.count { font-size: 13px; color: #57606a; margin-left: auto; }

.repo-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 14px;
}

.repo-card {
  background: #fff;
  border: 1px solid #d0d7de;
  border-radius: 8px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.repo-name {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: #0969da;
}

.repo-desc {
  margin: 0;
  font-size: 13px;
  color: #57606a;
  line-height: 1.4;
  flex: 1;
}

.repo-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.lang-badge {
  font-size: 12px;
  font-weight: 600;
  background: #ddf4ff;
  color: #0969da;
  border-radius: 999px;
  padding: 2px 8px;
}

.repo-stars,
.repo-forks,
.repo-updated {
  font-size: 12px;
  color: #57606a;
}

.status-msg {
  text-align: center;
  padding: 40px;
  color: #57606a;
  font-size: 14px;
}

.error-msg {
  color: #cf222e;
  background: #ffebe9;
  border: 1px solid #ff818266;
  border-radius: 6px;
  padding: 10px 14px;
  font-size: 14px;
  margin-bottom: 14px;
}
`,
    },
  ],
};

export default reactGithubRepoExplorer;
