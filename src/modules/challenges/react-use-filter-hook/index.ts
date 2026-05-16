import type { Challenge } from "@/lib/challenges/types";

const reactUseFilterHook: Challenge = {
  slug: "react-use-filter-hook",
  title: "React: Custom useFilterSort Hook",
  description:
    "Build a reusable useFilterSort custom hook that encapsulates filtering and sorting logic. Compose multiple filter criteria with AND logic, derive dropdown options dynamically, and reset on demand.",
  difficulty: "intermediate",
  tags: ["react", "custom-hooks", "useMemo", "useCallback", "filtering", "sorting", "hooks"],
  environment: "react-js",
  entryFile: "App.jsx",
  problemStatement: `## Problem Statement

Extract all filtering and sorting logic into a reusable custom hook: **\`useFilterSort\`**.

The hook signature:
\`\`\`js
const {
  filters,
  setFilter,
  sortBy,
  setSortBy,
  result,         // filtered + sorted array
  clearFilters,
} = useFilterSort(data, filterKeys, sortOptions);
\`\`\`

---

## Hook Requirements

### Parameters
| Param | Type | Description |
|---|---|---|
| \`data\` | \`Array\` | The raw data array to filter |
| \`filterKeys\` | \`string[]\` | Which field names can be filtered |
| \`sortOptions\` | \`object[]\` | \`{ value, label, compareFn }\` list of sort strategies |

### Returns
| Key | Type | Description |
|---|---|---|
| \`filters\` | \`Record<string, string>\` | Current filter values (initially all \`""\`) |
| \`setFilter\` | \`(key, value) => void\` | Update a single filter value |
| \`sortBy\` | \`string\` | Current sort option value |
| \`setSortBy\` | \`(value) => void\` | Update the sort |
| \`result\` | \`Array\` | Filtered + sorted data (memoized) |
| \`clearFilters\` | \`() => void\` | Reset all filters and sortBy to \`""\` |

---

## Filter Logic

- Filters apply with **AND logic**: each active filter must match.
- Empty string (\`""\`) means "no filter for this field".
- Comparison is **exact match** for select dropdowns (no partial string matching).

---

## Performance

- \`result\` must be computed with **\`useMemo\`** — recalculate only when \`data\`, \`filters\`, or \`sortBy\` change.
- \`setFilter\` and \`clearFilters\` must be wrapped in **\`useCallback\`**.

---

## App Usage

The hook is used in \`App.jsx\` to power a **Movies** filter form. You must not change \`App.jsx\` — it already uses the hook. Your job is to **implement \`useFilterSort.js\`** so \`App.jsx\` works correctly.

---

## Bonus

Add a \`resultCount\` and \`totalCount\` to the hook return so the UI can show "Showing X of Y".
`,
  files: [
    {
      filename: "App.jsx",
      language: "jsx",
      readOnly: true,
      content: `import useFilterSort from "./useFilterSort";
import { MOVIES } from "./data";

const SORT_OPTIONS = [
  { value: "year-desc",   label: "Newest First",   compareFn: (a, b) => b.year - a.year },
  { value: "year-asc",    label: "Oldest First",   compareFn: (a, b) => a.year - b.year },
  { value: "rating-desc", label: "Highest Rated",  compareFn: (a, b) => b.rating - a.rating },
  { value: "title-asc",   label: "Title A → Z",    compareFn: (a, b) => a.title.localeCompare(b.title) },
];

export default function App() {
  const { filters, setFilter, sortBy, setSortBy, result, clearFilters } = useFilterSort(
    MOVIES,
    ["genre", "director", "rating_band"],
    SORT_OPTIONS,
  );

  // Derive dropdown options from the FULL dataset (not filtered result)
  const genres     = Array.from(new Set(MOVIES.map((m) => m.genre))).sort();
  const directors  = Array.from(new Set(MOVIES.map((m) => m.director))).sort();
  const ratingBands = ["7+", "8+", "9+"];

  return (
    <div className="app">
      <h1>Movie Finder</h1>

      <div className="filter-bar">
        <select value={filters.genre ?? ""} onChange={(e) => setFilter("genre", e.target.value)}>
          <option value="">All Genres</option>
          {genres.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>

        <select value={filters.director ?? ""} onChange={(e) => setFilter("director", e.target.value)}>
          <option value="">All Directors</option>
          {directors.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>

        <select value={filters.rating_band ?? ""} onChange={(e) => setFilter("rating_band", e.target.value)}>
          <option value="">Any Rating</option>
          {ratingBands.map((b) => <option key={b} value={b}>{b}</option>)}
        </select>

        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          <option value="">Default Order</option>
          {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        <button onClick={clearFilters}>Clear</button>
      </div>

      <p className="count">Showing {result.length} of {MOVIES.length} movies</p>

      <ul className="movie-list">
        {result.map((m) => (
          <li key={m.id} className="movie-card">
            <div className="movie-left">
              <span className="movie-title">{m.title}</span>
              <span className="movie-meta">{m.director} · {m.year} · {m.genre}</span>
            </div>
            <span className="movie-rating">★ {m.rating}</span>
          </li>
        ))}
        {result.length === 0 && <li className="empty">No movies match your filters.</li>}
      </ul>
    </div>
  );
}
`,
    },
    {
      filename: "useFilterSort.js",
      language: "js",
      content: `import { useState, useMemo, useCallback } from "react";

/**
 * useFilterSort — reusable hook for filtering + sorting any array.
 *
 * @param {Array}    data         - The raw data array
 * @param {string[]} filterKeys   - Which keys can be filtered (e.g. ["genre", "director"])
 * @param {Array}    sortOptions  - [{ value, label, compareFn }]
 *
 * @returns {{ filters, setFilter, sortBy, setSortBy, result, clearFilters }}
 */
export default function useFilterSort(data, filterKeys, sortOptions) {
  // TODO: initialize filters state — an object keyed by each filterKey, all set to ""
  // Example: { genre: "", director: "", rating_band: "" }
  const [filters, setFilters] = useState({});

  // TODO: state for sortBy ("")
  const [sortBy, setSortBy] = useState("");

  // TODO: implement setFilter — update one filter key without touching the others
  // Must be wrapped in useCallback([setFilters])
  const setFilter = useCallback((key, value) => {
    // hint: use the functional form of setFilters to avoid stale closure
  }, []);

  // TODO: implement clearFilters — reset all filterKeys back to "" and sortBy to ""
  // Must be wrapped in useCallback
  const clearFilters = useCallback(() => {
  }, [filterKeys]);

  // TODO: implement result with useMemo:
  //   1. Start with data
  //   2. For each filterKey: if filters[key] is non-empty, filter to items where:
  //      - For "rating_band": item.rating >= Number(filters[key].replace("+",""))
  //      - For other keys: item[key] === filters[key]  (exact match)
  //   3. If sortBy is set, find the matching sortOption and apply its compareFn
  //   4. Return the filtered + sorted array (do NOT mutate data — use slice() before sort)
  const result = useMemo(() => {
    return data;
  }, [data, filters, sortBy, sortOptions]);

  return { filters, setFilter, sortBy, setSortBy, result, clearFilters };
}
`,
    },
    {
      filename: "data.js",
      language: "js",
      readOnly: true,
      content: `export const MOVIES = [
  { id:  1, title: "Inception",              director: "Christopher Nolan",   year: 2010, genre: "Sci-Fi",    rating: 8.8 },
  { id:  2, title: "The Dark Knight",         director: "Christopher Nolan",   year: 2008, genre: "Action",    rating: 9.0 },
  { id:  3, title: "Interstellar",            director: "Christopher Nolan",   year: 2014, genre: "Sci-Fi",    rating: 8.6 },
  { id:  4, title: "Oppenheimer",             director: "Christopher Nolan",   year: 2023, genre: "Drama",     rating: 8.4 },
  { id:  5, title: "The Prestige",            director: "Christopher Nolan",   year: 2006, genre: "Thriller",  rating: 8.5 },
  { id:  6, title: "Pulp Fiction",            director: "Quentin Tarantino",   year: 1994, genre: "Crime",     rating: 8.9 },
  { id:  7, title: "Django Unchained",        director: "Quentin Tarantino",   year: 2012, genre: "Western",   rating: 8.4 },
  { id:  8, title: "Inglourious Basterds",    director: "Quentin Tarantino",   year: 2009, genre: "War",       rating: 8.3 },
  { id:  9, title: "Kill Bill: Vol. 1",       director: "Quentin Tarantino",   year: 2003, genre: "Action",    rating: 8.1 },
  { id: 10, title: "The Godfather",           director: "Francis Ford Coppola",year: 1972, genre: "Crime",     rating: 9.2 },
  { id: 11, title: "The Godfather Part II",   director: "Francis Ford Coppola",year: 1974, genre: "Crime",     rating: 9.0 },
  { id: 12, title: "Apocalypse Now",          director: "Francis Ford Coppola",year: 1979, genre: "War",       rating: 8.4 },
  { id: 13, title: "Goodfellas",              director: "Martin Scorsese",     year: 1990, genre: "Crime",     rating: 8.7 },
  { id: 14, title: "The Departed",            director: "Martin Scorsese",     year: 2006, genre: "Thriller",  rating: 8.5 },
  { id: 15, title: "Taxi Driver",             director: "Martin Scorsese",     year: 1976, genre: "Thriller",  rating: 8.2 },
  { id: 16, title: "The Shawshank Redemption",director: "Frank Darabont",      year: 1994, genre: "Drama",     rating: 9.3 },
  { id: 17, title: "The Green Mile",          director: "Frank Darabont",      year: 1999, genre: "Drama",     rating: 8.6 },
  { id: 18, title: "Schindler's List",        director: "Steven Spielberg",    year: 1993, genre: "Drama",     rating: 8.9 },
  { id: 19, title: "Jurassic Park",           director: "Steven Spielberg",    year: 1993, genre: "Sci-Fi",    rating: 8.1 },
  { id: 20, title: "Saving Private Ryan",     director: "Steven Spielberg",    year: 1998, genre: "War",       rating: 8.6 },
  { id: 21, title: "A Beautiful Mind",        director: "Ron Howard",          year: 2001, genre: "Drama",     rating: 8.2 },
  { id: 22, title: "Arrival",                 director: "Denis Villeneuve",    year: 2016, genre: "Sci-Fi",    rating: 7.9 },
  { id: 23, title: "Blade Runner 2049",       director: "Denis Villeneuve",    year: 2017, genre: "Sci-Fi",    rating: 8.0 },
  { id: 24, title: "Dune",                    director: "Denis Villeneuve",    year: 2021, genre: "Sci-Fi",    rating: 8.0 },
];
`,
    },
    {
      filename: "styles.css",
      language: "css",
      content: `* { box-sizing: border-box; margin: 0; padding: 0; }

body { font-family: system-ui, sans-serif; background: #f3f4f6; color: #111827; padding: 24px; }

.app { max-width: 780px; margin: 0 auto; }

h1 { font-size: 1.6rem; font-weight: 700; margin-bottom: 16px; }

.filter-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  padding: 16px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  margin-bottom: 16px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}

.filter-bar select {
  flex: 1 1 150px;
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  background: #fff;
  color: #374151;
  cursor: pointer;
  outline: none;
}
.filter-bar select:focus { border-color: #6366f1; box-shadow: 0 0 0 2px rgba(99,102,241,0.2); }

.filter-bar button {
  padding: 8px 16px;
  background: #f9fafb;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  color: #374151;
  cursor: pointer;
  font-weight: 500;
}
.filter-bar button:hover { background: #f3f4f6; }

.count { font-size: 13px; color: #6b7280; margin-bottom: 10px; font-weight: 500; }

.movie-list { list-style: none; display: flex; flex-direction: column; gap: 8px; }

.movie-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.04);
}
.movie-left  { display: flex; flex-direction: column; gap: 3px; }
.movie-title { font-weight: 600; font-size: 14px; }
.movie-meta  { font-size: 12px; color: #6b7280; }
.movie-rating { font-size: 14px; font-weight: 700; color: #f59e0b; white-space: nowrap; }
.empty { color: #9ca3af; font-style: italic; text-align: center; padding: 24px; }
`,
    },
  ],
};

export default reactUseFilterHook;
