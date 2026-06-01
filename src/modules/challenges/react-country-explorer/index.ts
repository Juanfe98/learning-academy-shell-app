import type { Challenge } from "@/lib/challenges/types";

const reactCountryExplorer: Challenge = {
  slug: "react-country-explorer",
  title: "Country Explorer",
  description:
    "Fetch country data from the real REST Countries API. Show skeleton cards while loading. Implement search by name/capital, region dropdown, sort, and a favorites system persisted in localStorage. Favorites can be isolated via a toggle. Use AbortController for fetch cleanup on unmount.",
  difficulty: "intermediate",
  tags: ["react", "typescript", "rest-api", "custom-hook", "localStorage", "favorites", "abort-controller", "search", "filter", "sort"],
  environment: "react-ts",
  entryFile: "App.tsx",
  problemStatement: `# Country Explorer

**Difficulty:** Intermediate | **Time Limit:** 50 minutes

---

## Problem Statement

Build a **Country Explorer** that fetches data from the real REST Countries API. Display countries as cards with search, region filter, sort, and a favorites system persisted in \`localStorage\`.

---

## Functional Requirements

- On mount, fetch from \`https://restcountries.com/v3.1/all?fields=name,flags,region,subregion,population,area,languages,capital,cca3\`
- Show **12 skeleton cards** while fetching; show error state on failure
- Each \`CountryCard\` shows: flag, name, capital(s), region, population (formatted), area (km²), language count
- Heart button on each card toggles it as a favorite (♥ filled = favorited)
- Favorites persisted to \`localStorage\` key \`"country-favorites"\` as JSON array of \`cca3\` codes
- \`"Show Favorites Only"\` toggle — other filters still apply
- Search by common name or capital (real-time, case-insensitive)
- Region dropdown derived from data (\`"All Regions"\` default)
- Sort: \`"Name A–Z"\`, \`"Name Z–A"\`, \`"Population: Largest"\`, \`"Area: Largest"\`, \`"Most Languages"\`
- All filters apply simultaneously
- \`"No countries found."\` when empty
- \`"X countries"\` count

---

## Technical Requirements

**Must use:**
- A custom \`useCountryExplorer()\` hook — owns fetch, favorites, all filter/sort state, derived list
- A reusable \`CountryCard\` component
- \`AbortController\` — cancel fetch on unmount
- \`Intl.NumberFormat\` for population and area formatting
- TypeScript — all props and state typed

**Constraints:**
- Language count = \`Object.keys(country.languages ?? {}).length\`
- Capital is an array — comma-join; handle empty array (show \`"N/A"\`)
- Favorites: \`Set<string>\` of \`cca3\` codes, serialized to JSON in localStorage
- Skeleton: show exactly 12 placeholder cards while loading

---

## Acceptance Criteria

| # | Action | Expected Result |
|---|---|---|
| 1 | Page loads | 12 skeletons, then country cards |
| 2 | Search \`"ger"\` | Germany, Algeria, etc. |
| 3 | Filter \`"Europe"\` | European countries only |
| 4 | Sort \`"Population: Largest"\` | China or India first |
| 5 | Heart on Germany | Heart fills; saved to localStorage |
| 6 | Refresh | Germany still favorited |
| 7 | \`"Show Favorites Only"\` | Only favorited countries |
| 8 | Favorites + region \`"Asia"\` | Intersection |
| 9 | Un-favorite all | \`"No countries found."\` |
| 10 | Sort \`"Most Languages"\` | Countries with most languages first |
`,
  files: [
    {
      filename: "App.tsx",
      language: "tsx",
      content: `import { useState, useEffect, useRef, useMemo } from "react";
import "./styles.css";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CountryName {
  common: string;
  official: string;
}

interface CountryFlags {
  png: string;
  svg: string;
  alt?: string;
}

interface Country {
  cca3: string;
  name: CountryName;
  flags: CountryFlags;
  region: string;
  subregion: string;
  population: number;
  area: number;
  languages: Record<string, string> | null;
  capital: string[];
}

type SortOption = "name-asc" | "name-desc" | "population-desc" | "area-desc" | "languages-desc";

// ─── Constants ────────────────────────────────────────────────────────────────

const API_URL =
  "https://restcountries.com/v3.1/all?fields=name,flags,region,subregion,population,area,languages,capital,cca3";

const FAVORITES_KEY = "country-favorites";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const numFmt = new Intl.NumberFormat("en-US");

function formatPop(n: number): string {
  return numFmt.format(n);
}

function formatArea(n: number): string {
  return \`\${numFmt.format(Math.round(n))} km²\`;
}

function langCount(country: Country): number {
  return Object.keys(country.languages ?? {}).length;
}

function loadFavorites(): Set<string> {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    if (raw) return new Set(JSON.parse(raw) as string[]);
  } catch {}
  return new Set();
}

function saveFavorites(favorites: Set<string>): void {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify([...favorites]));
}

// ─── Custom hook ──────────────────────────────────────────────────────────────

function useCountryExplorer() {
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(() => loadFavorites());

  const [search, setSearch] = useState("");
  const [region, setRegion] = useState("All Regions");
  const [sort, setSort] = useState<SortOption>("name-asc");
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // TODO: create AbortController, fetch from API_URL using its signal
    // On success: setCountries(data), setLoading(false)
    // On AbortError: ignore (component unmounted)
    // On other errors: setError("Failed to load countries."), setLoading(false)
    // Return cleanup: abortRef.current?.abort()
    abortRef.current = new AbortController();
    return () => abortRef.current?.abort();
  }, []);

  function toggleFavorite(cca3: string) {
    // TODO: create new Set (don't mutate), toggle cca3, call saveFavorites, setFavorites
  }

  // TODO: derive unique sorted regions from countries
  const allRegions = useMemo<string[]>(() => ["All Regions"], [countries]);

  // TODO: compute filteredCountries
  // 1. showFavoritesOnly → only countries whose cca3 is in favorites
  // 2. search → filter by country.name.common or country.capital (case-insensitive)
  //    capital is an array: check if ANY element includes the search string
  // 3. region → filter by country.region
  // 4. sort → .slice().sort()
  //    "Most Languages" sorts by langCount(country) descending
  const filteredCountries = useMemo<Country[]>(() => {
    return []; // TODO: replace
  }, [countries, favorites, search, region, sort, showFavoritesOnly]);

  return {
    countries, filteredCountries, loading, error,
    favorites, toggleFavorite, allRegions,
    search, setSearch, region, setRegion,
    sort, setSort, showFavoritesOnly, setShowFavoritesOnly,
  };
}

// ─── CountryCard component ────────────────────────────────────────────────────

interface CountryCardProps {
  country: Country;
  isFavorite: boolean;
  onToggleFavorite: (cca3: string) => void;
}

function CountryCard({ country, isFavorite, onToggleFavorite }: CountryCardProps) {
  const capital = country.capital.length > 0 ? country.capital.join(", ") : "N/A";
  const langs = langCount(country);

  // TODO: render full card layout with flag, name, capital, region, population, area, language count
  return (
    <div className="country-card">
      <img
        src={country.flags.png}
        alt={country.flags.alt ?? country.name.common}
        className="country-flag"
      />
      <div className="card-body">
        <p className="country-name">{country.name.common}</p>
        <p className="country-detail">🏛 {capital}</p>
        <p className="country-detail">🌍 {country.region}</p>
        {/* TODO: add population, area, language count rows */}
        <button
          className={\`fav-btn\${isFavorite ? " active" : ""}\`}
          onClick={() => onToggleFavorite(country.cca3)}
          title={isFavorite ? "Remove from favorites" : "Add to favorites"}
        >
          {isFavorite ? "♥" : "♡"}
        </button>
      </div>
    </div>
  );
}

// ─── SkeletonCard component ───────────────────────────────────────────────────

function SkeletonCard() {
  return <div className="skeleton-card" />;
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function App() {
  const {
    countries, filteredCountries, loading, error,
    favorites, toggleFavorite, allRegions,
    search, setSearch, region, setRegion,
    sort, setSort, showFavoritesOnly, setShowFavoritesOnly,
  } = useCountryExplorer();

  if (error) return <div className="status-msg error">{error}</div>;

  return (
    <div className="explorer">
      <div className="explorer-header">
        <h1>Country Explorer</h1>
        <span className="count">{loading ? "Loading..." : \`\${filteredCountries.length} countries\`}</span>
      </div>

      <div className="controls">
        <input
          className="search-input"
          placeholder="Search by name or capital..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="region-select" value={region} onChange={(e) => setRegion(e.target.value)}>
          {allRegions.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <select className="sort-select" value={sort} onChange={(e) => setSort(e.target.value as SortOption)}>
          <option value="name-asc">Name A–Z</option>
          <option value="name-desc">Name Z–A</option>
          <option value="population-desc">Population: Largest</option>
          <option value="area-desc">Area: Largest</option>
          <option value="languages-desc">Most Languages</option>
        </select>
        <button
          className={\`fav-toggle\${showFavoritesOnly ? " active" : ""}\`}
          onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
        >
          {showFavoritesOnly ? "♥ Favorites" : "♡ Show Favorites"}
        </button>
      </div>

      {loading ? (
        <div className="country-grid">
          {Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : filteredCountries.length === 0 ? (
        <p className="status-msg">No countries found.</p>
      ) : (
        <div className="country-grid">
          {filteredCountries.map((c) => (
            <CountryCard
              key={c.cca3}
              country={c}
              isFavorite={favorites.has(c.cca3)}
              onToggleFavorite={toggleFavorite}
            />
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

.explorer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}

h1 { margin: 0; font-size: 1.5rem; }
.count { font-size: 13px; color: #6b7280; }

.controls {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.search-input { flex: 1; min-width: 160px; }

.search-input,
.region-select,
.sort-select {
  padding: 7px 10px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 13px;
}

.fav-toggle {
  padding: 7px 14px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: #fff;
  font-size: 13px;
  cursor: pointer;
}

.fav-toggle.active {
  background: #fef2f2;
  border-color: #f87171;
  color: #dc2626;
}

.country-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 14px;
}

.country-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  position: relative;
}

.country-flag {
  width: 100%;
  height: 110px;
  object-fit: cover;
  display: block;
}

.card-body {
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 3px;
  flex: 1;
}

.country-name {
  margin: 0;
  font-weight: 700;
  font-size: 13px;
  line-height: 1.3;
}

.country-detail {
  margin: 0;
  font-size: 12px;
  color: #4b5563;
}

.fav-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  background: rgba(255,255,255,0.85);
  border: none;
  border-radius: 50%;
  width: 28px;
  height: 28px;
  font-size: 15px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6b7280;
  backdrop-filter: blur(4px);
}

.fav-btn.active { color: #dc2626; }
.fav-btn:hover { color: #dc2626; }

/* Skeleton */
.skeleton-card {
  background: linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
  border-radius: 10px;
  height: 210px;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
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

export default reactCountryExplorer;
