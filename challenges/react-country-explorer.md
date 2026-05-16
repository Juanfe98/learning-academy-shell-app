# React: Country Explorer (REST Countries API)

**Difficulty:** Medium
**Time Limit:** 50 minutes
**Framework:** React + TypeScript
**Topics:** Real REST API, Card Components, Search, Filter, Sort, Favorites (localStorage), Custom Hook

---

## Problem Statement

Build a **Country Explorer** that fetches data from the real [REST Countries API](https://restcountries.com/v3.1/all?fields=name,flags,region,subregion,population,area,languages,capital,cca3). Display countries as cards. Users can search by name or capital, filter by region, sort results, and toggle countries as favorites — favorites are persisted in `localStorage` and can be shown in an isolated view.

---

## Functional Requirements

- [ ] On mount, fetch from `https://restcountries.com/v3.1/all?fields=name,flags,region,subregion,population,area,languages,capital,cca3`
- [ ] Show loading (skeleton cards) and error states
- [ ] Each `CountryCard` displays: flag image, common name, capital(s), region, population (formatted with commas), area (km²), language count
- [ ] A heart button on each card toggles the country as a favorite (filled heart = favorited)
- [ ] Favorites persisted to `localStorage` (keyed by `cca3` code)
- [ ] `"Show Favorites Only"` toggle — when on, only favorited countries shown; other filters still apply
- [ ] Search input filters by common name or capital (real-time)
- [ ] Region filter dropdown: `"All Regions"` + unique regions from data
- [ ] Sort dropdown: `"Name A–Z"`, `"Name Z–A"`, `"Population: Largest"`, `"Area: Largest"`, `"Most Languages"`
- [ ] All filters apply simultaneously
- [ ] `"No countries found."` when result is empty
- [ ] `"X countries"` count

---

## UI / Visual Specification

```
┌──────────────────────────────────────────────────────────────────────┐
│  Country Explorer                                        45 countries │
│                                                                       │
│  [🔍 Search by name or capital...]  [Region ▼]  [Sort ▼]            │
│                                                  [♥ Show Favorites]  │
│                                                                       │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐   │
│  │       🇩🇪        │  │       🇧🇷        │  │       🇯🇵        │   │
│  │   Germany        │  │   Brazil         │  │   Japan          │   │
│  │   Berlin         │  │   Brasília       │  │   Tokyo          │   │
│  │   Europe         │  │   Americas       │  │   Asia           │   │
│  │   84,270,625     │  │   215,353,593    │  │   125,681,593    │   │
│  │   357,114 km²    │  │   8,515,767 km²  │  │   377,930 km²    │   │
│  │   1 language     │  │   1 language     │  │   1 language     │   │
│  │              [♡] │  │              [♥] │  │              [♡] │   │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘   │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Technical Requirements

**Must use:**
- A custom `useCountryExplorer()` hook owning: fetch, favorites (localStorage sync), filter/sort state, and derived list
- A reusable `CountryCard` component accepting a `CountryCard: Country` prop and an `onToggleFavorite` callback
- `AbortController` to cancel the fetch on unmount
- `Intl.NumberFormat` for population and area formatting
- TypeScript — all props and state typed

**Must NOT use:**
- External HTTP libraries
- External component libraries

**Constraints:**
- Favorites stored as `Set<string>` of `cca3` codes, serialized to JSON array in localStorage key `"country-favorites"`
- Language count = `Object.keys(country.languages ?? {}).length`
- Capital is an array — display as comma-joined string; handle countries with no capital (empty array)
- Skeleton loading: show 12 placeholder cards while fetching

---

## Starter Files

**`CountryExplorer.tsx`**
```tsx
import { useState, useEffect, useRef } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CountryName {
  common: string;
  official: string;
}

interface CountryFlags {
  png: string;
  svg: string;
  alt: string;
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

// ─── Your implementation ──────────────────────────────────────────────────────

const API_URL =
  "https://restcountries.com/v3.1/all?fields=name,flags,region,subregion,population,area,languages,capital,cca3";

function useCountryExplorer() {
  // TODO: implement
  // Returns: { countries, filteredCountries, loading, error, favorites,
  //            toggleFavorite, search, setSearch, region, setRegion,
  //            sort, setSort, showFavoritesOnly, setShowFavoritesOnly }
}

interface CountryCardProps {
  country: Country;
  isFavorite: boolean;
  onToggleFavorite: (cca3: string) => void;
}

function CountryCard({ country, isFavorite, onToggleFavorite }: CountryCardProps) {
  // TODO: implement
  return <div>{country.name.common}</div>;
}

function SkeletonCard() {
  // TODO: placeholder card shown during loading
  return <div className="skeleton-card" />;
}

export default function CountryExplorer() {
  // TODO: use hook, build UI
  return (
    <div>
      <h1>Country Explorer</h1>
    </div>
  );
}
```

---

## Acceptance Criteria / Test Cases

| # | Action | Expected Result |
|---|---|---|
| 1 | Page loads | Skeleton cards shown, then real country cards |
| 2 | Search `"ger"` | Germany, Algeria, etc. shown |
| 3 | Filter region `"Europe"` | European countries only |
| 4 | Sort `"Population: Largest"` | China or India first |
| 5 | Click heart on Germany | Heart fills; Germany added to favorites |
| 6 | Refresh page | Germany still favorited (localStorage) |
| 7 | Toggle `"Show Favorites Only"` | Only Germany shown (assuming only one favorited) |
| 8 | `"Show Favorites Only"` + region `"Asia"` | Favorites in Asia only (intersection) |
| 9 | Un-favorite all | `"No countries found."` in favorites-only mode |
| 10 | Sort `"Most Languages"` | Countries with most language entries first |

---

## Bonus (if time allows)

- Clicking a card opens a detail panel/modal with extended info (borders, currencies, timezone)
- Add a `"Compare"` mode where selecting two countries renders them side-by-side
