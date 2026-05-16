# React: Movie Browser

**Difficulty:** Medium
**Time Limit:** 50 minutes
**Framework:** React + TypeScript
**Topics:** API Fetching, Card Components, Multi-Select Filter, Range Filter, Sort, Controlled Inputs

---

## Problem Statement

Build a **Movie Browser** that fetches a list of movies from a mock REST endpoint and displays them as cards. Users can search by title, filter by one or more genres (multi-select), filter by minimum rating, and sort the results.

---

## Functional Requirements

- [ ] On mount, fetch movies from `fetchMovies()` and render as a grid of `MovieCard` components
- [ ] Show loading and error states
- [ ] Each `MovieCard` shows: poster (placeholder), title, year, genres (as tags), rating bar, and runtime
- [ ] Search input filters by title (case-insensitive, real-time)
- [ ] Genre filter: a list of genre checkboxes — checking multiple genres shows movies that match **any** selected genre (OR logic)
- [ ] Minimum rating slider (0–10 step 0.5): hides cards below the threshold
- [ ] Sort dropdown: `"Title A–Z"`, `"Title Z–A"`, `"Rating: Best First"`, `"Year: Newest First"`, `"Runtime: Shortest First"`
- [ ] All filters apply simultaneously
- [ ] `"No movies found."` when result is empty
- [ ] `"X of Y movies"` count label

---

## UI / Visual Specification

```
┌─────────────────────────────────────────────────────────────────────┐
│  Movie Browser                                       8 of 15 movies  │
│                                                                      │
│  [🔍 Search by title...      ]    [Sort by ▼]                       │
│                                                                      │
│  Genres:  ☑ Action  ☑ Drama  ☐ Comedy  ☐ Sci-Fi  ☐ Horror  ...    │
│  Min Rating:  ────●─────────────────  6.5                           │
│                                                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐           │
│  │  [img]   │  │  [img]   │  │  [img]   │  │  [img]   │           │
│  │ Inception│  │  Dune    │  │Interstellar  │  Alien   │           │
│  │   2010   │  │  2021    │  │   2014   │  │  1979    │           │
│  │[Sci-Fi]  │  │[Sci-Fi]  │  │[Sci-Fi]  │  │[Horror]  │           │
│  │ [Actn]   │  │[Advnture]│  │[Drama]   │  │[Sci-Fi]  │           │
│  │ ★ 8.8    │  │ ★ 8.0    │  │ ★ 8.6    │  │ ★ 8.4    │           │
│  │ 148 min  │  │ 155 min  │  │ 169 min  │  │ 117 min  │           │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘           │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Technical Requirements

**Must use:**
- `useState`, `useEffect`
- A reusable `MovieCard` component
- Genre list derived from the fetched data — do NOT hardcode genre options
- TypeScript — all props and state typed

**Must NOT use:**
- External component libraries
- External filter utilities

**Constraints:**
- Genre checkboxes must be built from the unique genres present in the dataset
- The rating slider must use a native `<input type="range">`
- `fetchMovies()` simulates 350ms delay — do not modify it

---

## Starter Files

**`MovieBrowser.tsx`**
```tsx
import { useState, useEffect } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Movie {
  id: number;
  title: string;
  year: number;
  genres: string[];
  rating: number;
  runtime: number; // minutes
  posterUrl: string;
}

// ─── Mock API — do not modify ─────────────────────────────────────────────────

const MOCK_MOVIES: Movie[] = [
  { id: 1,  title: "Inception",           year: 2010, genres: ["Sci-Fi", "Action", "Thriller"], rating: 8.8, runtime: 148, posterUrl: "https://placehold.co/120x180?text=Inception" },
  { id: 2,  title: "Dune",                year: 2021, genres: ["Sci-Fi", "Adventure"],           rating: 8.0, runtime: 155, posterUrl: "https://placehold.co/120x180?text=Dune" },
  { id: 3,  title: "Interstellar",        year: 2014, genres: ["Sci-Fi", "Drama"],               rating: 8.6, runtime: 169, posterUrl: "https://placehold.co/120x180?text=Interstellar" },
  { id: 4,  title: "Alien",              year: 1979, genres: ["Horror", "Sci-Fi"],              rating: 8.4, runtime: 117, posterUrl: "https://placehold.co/120x180?text=Alien" },
  { id: 5,  title: "The Dark Knight",    year: 2008, genres: ["Action", "Crime", "Drama"],      rating: 9.0, runtime: 152, posterUrl: "https://placehold.co/120x180?text=DarkKnight" },
  { id: 6,  title: "Parasite",          year: 2019, genres: ["Drama", "Thriller"],             rating: 8.5, runtime: 132, posterUrl: "https://placehold.co/120x180?text=Parasite" },
  { id: 7,  title: "Superbad",          year: 2007, genres: ["Comedy"],                        rating: 7.6, runtime: 113, posterUrl: "https://placehold.co/120x180?text=Superbad" },
  { id: 8,  title: "The Grand Budapest Hotel", year: 2014, genres: ["Comedy", "Drama"],        rating: 8.1, runtime: 99,  posterUrl: "https://placehold.co/120x180?text=Budapest" },
  { id: 9,  title: "Mad Max: Fury Road", year: 2015, genres: ["Action", "Adventure"],          rating: 8.1, runtime: 120, posterUrl: "https://placehold.co/120x180?text=MadMax" },
  { id: 10, title: "Get Out",           year: 2017, genres: ["Horror", "Thriller"],            rating: 7.7, runtime: 104, posterUrl: "https://placehold.co/120x180?text=GetOut" },
  { id: 11, title: "Everything Everywhere All at Once", year: 2022, genres: ["Sci-Fi", "Comedy", "Drama"], rating: 7.8, runtime: 139, posterUrl: "https://placehold.co/120x180?text=EEAAO" },
  { id: 12, title: "Knives Out",        year: 2019, genres: ["Crime", "Drama", "Thriller"],   rating: 7.9, runtime: 130, posterUrl: "https://placehold.co/120x180?text=KnivesOut" },
  { id: 13, title: "The Matrix",        year: 1999, genres: ["Sci-Fi", "Action"],              rating: 8.7, runtime: 136, posterUrl: "https://placehold.co/120x180?text=Matrix" },
  { id: 14, title: "Hereditary",        year: 2018, genres: ["Horror"],                       rating: 7.3, runtime: 127, posterUrl: "https://placehold.co/120x180?text=Hereditary" },
  { id: 15, title: "1917",             year: 2019, genres: ["Action", "Drama"],              rating: 8.3, runtime: 119, posterUrl: "https://placehold.co/120x180?text=1917" },
];

async function fetchMovies(): Promise<Movie[]> {
  await new Promise((res) => setTimeout(res, 350));
  return MOCK_MOVIES;
}

// ─── Your implementation ──────────────────────────────────────────────────────

interface MovieCardProps {
  movie: Movie;
}

function MovieCard({ movie }: MovieCardProps) {
  // TODO: implement
  return <div>{movie.title}</div>;
}

export default function MovieBrowser() {
  // TODO: implement
  return (
    <div>
      <h1>Movie Browser</h1>
      {/* TODO: search, genre checkboxes, rating slider, sort */}
      {/* TODO: movie grid */}
    </div>
  );
}
```

---

## Acceptance Criteria / Test Cases

| # | Action | Expected Result |
|---|---|---|
| 1 | Page loads | 15 movie cards shown; genre checkboxes derived from data |
| 2 | Search `"inc"` | Inception shown |
| 3 | Check `"Horror"` genre | Alien, Get Out, Hereditary visible |
| 4 | Check `"Action"` + `"Horror"` | Union: movies with Action OR Horror |
| 5 | Set min rating to `8.5` | Only movies with rating ≥ 8.5 shown |
| 6 | Sort `"Year: Newest First"` | 2022 (EEAAO) first, 1979 (Alien) last |
| 7 | Sort `"Runtime: Shortest First"` | 99 min (Budapest) first |
| 8 | Search `"the"` + min rating `8.5` | Both filters apply: The Dark Knight, The Matrix |
| 9 | Uncheck all genres | All movies back in view (no genre filter) |
| 10 | Search `"zzzz"` | `"No movies found."` |
