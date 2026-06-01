import type { Challenge } from "@/lib/challenges/types";

const reactMovieBrowser: Challenge = {
  slug: "react-movie-browser",
  title: "Movie Browser",
  description:
    "Fetch a list of movies and render them as cards. Implement real-time title search, multi-select genre checkboxes (OR logic, options derived from data), a minimum-rating range slider, and a sort dropdown — all applied simultaneously.",
  difficulty: "intermediate",
  tags: ["react", "typescript", "hooks", "api-fetching", "multi-filter", "range-input", "sort"],
  environment: "react-ts",
  entryFile: "App.tsx",
  problemStatement: `# Movie Browser

**Difficulty:** Intermediate | **Time Limit:** 50 minutes

---

## Problem Statement

Build a **Movie Browser** that fetches a list of movies from a mock REST endpoint and displays them as cards. Users can search by title, filter by one or more genres (multi-select), filter by minimum rating, and sort the results.

---

## Functional Requirements

- On mount, fetch movies from \`fetchMovies()\` and render as a grid of \`MovieCard\` components
- Show loading and error states
- Each \`MovieCard\` shows: poster, title, year, genres (as tags), rating, and runtime
- Search input filters by title (case-insensitive, real-time)
- Genre filter: checkboxes — checking multiple shows movies that match **any** selected genre (OR logic)
- Genre options must be **derived from the fetched data** — do NOT hardcode them
- Minimum rating slider (0–10 step 0.5): hides cards below the threshold
- Sort dropdown: \`"Title A–Z"\`, \`"Title Z–A"\`, \`"Rating: Best First"\`, \`"Year: Newest First"\`, \`"Runtime: Shortest First"\`
- All filters apply simultaneously
- \`"No movies found."\` when result is empty
- \`"X of Y movies"\` count label

---

## Technical Requirements

**Must use:**
- \`useState\`, \`useEffect\`
- A reusable \`MovieCard\` component
- Native \`<input type="range">\` for the rating slider
- TypeScript — all props and state typed

**Constraints:**
- Genre checkboxes built from unique genres in the dataset — no hardcoded list
- \`fetchMovies()\` simulates 350ms delay — do not modify it

---

## Acceptance Criteria

| # | Action | Expected Result |
|---|---|---|
| 1 | Page loads | 15 movie cards; genre checkboxes derived from data |
| 2 | Search \`"inc"\` | Inception shown |
| 3 | Check \`"Horror"\` | Alien, Get Out, Hereditary visible |
| 4 | Check \`"Action"\` + \`"Horror"\` | Union: movies with Action OR Horror |
| 5 | Set min rating to \`8.5\` | Only movies rated ≥ 8.5 shown |
| 6 | Sort \`"Year: Newest First"\` | 2022 (EEAAO) first, 1979 (Alien) last |
| 7 | Sort \`"Runtime: Shortest First"\` | 99 min (Budapest) first |
| 8 | Search \`"the"\` + min rating \`8.5\` | Both filters apply simultaneously |
| 9 | Uncheck all genres | All movies back in view |
| 10 | Search \`"zzzz"\` | \`"No movies found."\` |
`,
  files: [
    {
      filename: "App.tsx",
      language: "tsx",
      content: `import { useState, useEffect } from "react";
import "./styles.css";

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

type SortOption = "title-asc" | "title-desc" | "rating-desc" | "year-desc" | "runtime-asc";

// ─── Mock API — do not modify ─────────────────────────────────────────────────

const MOCK_MOVIES: Movie[] = [
  { id: 1,  title: "Inception",                      year: 2010, genres: ["Sci-Fi", "Action", "Thriller"],        rating: 8.8, runtime: 148, posterUrl: "https://placehold.co/120x180?text=Inception"    },
  { id: 2,  title: "Dune",                           year: 2021, genres: ["Sci-Fi", "Adventure"],                 rating: 8.0, runtime: 155, posterUrl: "https://placehold.co/120x180?text=Dune"         },
  { id: 3,  title: "Interstellar",                   year: 2014, genres: ["Sci-Fi", "Drama"],                     rating: 8.6, runtime: 169, posterUrl: "https://placehold.co/120x180?text=Interstellar" },
  { id: 4,  title: "Alien",                          year: 1979, genres: ["Horror", "Sci-Fi"],                    rating: 8.4, runtime: 117, posterUrl: "https://placehold.co/120x180?text=Alien"        },
  { id: 5,  title: "The Dark Knight",                year: 2008, genres: ["Action", "Crime", "Drama"],            rating: 9.0, runtime: 152, posterUrl: "https://placehold.co/120x180?text=DarkKnight"   },
  { id: 6,  title: "Parasite",                       year: 2019, genres: ["Drama", "Thriller"],                   rating: 8.5, runtime: 132, posterUrl: "https://placehold.co/120x180?text=Parasite"     },
  { id: 7,  title: "Superbad",                       year: 2007, genres: ["Comedy"],                              rating: 7.6, runtime: 113, posterUrl: "https://placehold.co/120x180?text=Superbad"     },
  { id: 8,  title: "The Grand Budapest Hotel",       year: 2014, genres: ["Comedy", "Drama"],                     rating: 8.1, runtime: 99,  posterUrl: "https://placehold.co/120x180?text=Budapest"     },
  { id: 9,  title: "Mad Max: Fury Road",             year: 2015, genres: ["Action", "Adventure"],                 rating: 8.1, runtime: 120, posterUrl: "https://placehold.co/120x180?text=MadMax"       },
  { id: 10, title: "Get Out",                        year: 2017, genres: ["Horror", "Thriller"],                  rating: 7.7, runtime: 104, posterUrl: "https://placehold.co/120x180?text=GetOut"       },
  { id: 11, title: "Everything Everywhere All at Once", year: 2022, genres: ["Sci-Fi", "Comedy", "Drama"],       rating: 7.8, runtime: 139, posterUrl: "https://placehold.co/120x180?text=EEAAO"         },
  { id: 12, title: "Knives Out",                     year: 2019, genres: ["Crime", "Drama", "Thriller"],          rating: 7.9, runtime: 130, posterUrl: "https://placehold.co/120x180?text=KnivesOut"    },
  { id: 13, title: "The Matrix",                     year: 1999, genres: ["Sci-Fi", "Action"],                    rating: 8.7, runtime: 136, posterUrl: "https://placehold.co/120x180?text=Matrix"       },
  { id: 14, title: "Hereditary",                     year: 2018, genres: ["Horror"],                              rating: 7.3, runtime: 127, posterUrl: "https://placehold.co/120x180?text=Hereditary"   },
  { id: 15, title: "1917",                           year: 2019, genres: ["Action", "Drama"],                     rating: 8.3, runtime: 119, posterUrl: "https://placehold.co/120x180?text=1917"         },
];

async function fetchMovies(): Promise<Movie[]> {
  await new Promise((res) => setTimeout(res, 350));
  return MOCK_MOVIES;
}

// ─── MovieCard component ──────────────────────────────────────────────────────

interface MovieCardProps {
  movie: Movie;
}

function MovieCard({ movie }: MovieCardProps) {
  // TODO: render poster image, title, year, genre tags, rating (★ X.X), runtime (X min)
  return (
    <div className="movie-card">
      <p className="movie-title">{movie.title}</p>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function App() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [selectedGenres, setSelectedGenres] = useState<Set<string>>(new Set());
  const [minRating, setMinRating] = useState(0);
  const [sort, setSort] = useState<SortOption>("title-asc");

  useEffect(() => {
    // TODO: call fetchMovies(), update movies/loading/error state
  }, []);

  // TODO: derive unique sorted genres from the movies array
  const allGenres: string[] = [];

  // TODO: toggleGenre — adds genre to selectedGenres if absent, removes if present
  function toggleGenre(genre: string) {
    // TODO
  }

  // TODO: compute filteredMovies
  // 1. Filter by title search (case-insensitive)
  // 2. Filter by selectedGenres — if Set is empty, show all; otherwise movie must have ANY selected genre
  // 3. Filter by minRating (movie.rating >= minRating)
  // 4. Sort by current sort option
  // Use .slice() before .sort() to avoid mutating state
  const filteredMovies: Movie[] = [];

  if (loading) return <div className="status-msg">Loading movies...</div>;
  if (error) return <div className="status-msg error">{error}</div>;

  return (
    <div className="browser">
      <div className="browser-header">
        <h1>Movie Browser</h1>
        <span className="count">{filteredMovies.length} of {movies.length} movies</span>
      </div>

      <div className="controls-row">
        <input
          className="search-input"
          placeholder="Search by title..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="sort-select"
          value={sort}
          onChange={(e) => setSort(e.target.value as SortOption)}
        >
          <option value="title-asc">Title A–Z</option>
          <option value="title-desc">Title Z–A</option>
          <option value="rating-desc">Rating: Best First</option>
          <option value="year-desc">Year: Newest First</option>
          <option value="runtime-asc">Runtime: Shortest First</option>
        </select>
      </div>

      <div className="genre-filter">
        <span className="filter-label">Genres:</span>
        {/* TODO: render a checkbox for each genre in allGenres
            - checked when genre is in selectedGenres
            - onChange calls toggleGenre(genre) */}
        <span className="placeholder-hint">(genre checkboxes go here)</span>
      </div>

      <div className="rating-filter">
        <span className="filter-label">Min Rating:</span>
        {/* TODO: render <input type="range" min="0" max="10" step="0.5"> bound to minRating */}
        <span className="rating-value">{minRating.toFixed(1)}</span>
      </div>

      {filteredMovies.length === 0 ? (
        <p className="status-msg">No movies found.</p>
      ) : (
        <div className="movie-grid">
          {filteredMovies.map((m) => (
            <MovieCard key={m.id} movie={m} />
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

.browser-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}

h1 { margin: 0; font-size: 1.5rem; }

.count { font-size: 13px; color: #6b7280; }

.controls-row {
  display: flex;
  gap: 10px;
  margin-bottom: 12px;
}

.search-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
}

.sort-select {
  padding: 8px 10px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
}

.genre-filter,
.rating-filter {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 10px;
}

.filter-label {
  font-size: 13px;
  font-weight: 600;
  color: #374151;
  margin-right: 4px;
}

.genre-checkbox {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  cursor: pointer;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 999px;
  padding: 3px 10px;
}

.genre-checkbox input { cursor: pointer; }

.rating-value {
  font-size: 13px;
  font-weight: 600;
  color: #4f46e5;
  min-width: 28px;
}

.placeholder-hint { font-size: 12px; color: #9ca3af; font-style: italic; }

.movie-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 14px;
  margin-top: 14px;
}

.movie-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.movie-card img {
  width: 100%;
  display: block;
}

.movie-card-body {
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.movie-title {
  font-weight: 700;
  font-size: 13px;
  margin: 0;
  line-height: 1.3;
}

.movie-year { font-size: 12px; color: #6b7280; margin: 0; }

.genres {
  display: flex;
  flex-wrap: wrap;
  gap: 3px;
}

.genre-tag {
  font-size: 10px;
  background: #ede9fe;
  color: #5b21b6;
  border-radius: 999px;
  padding: 1px 6px;
}

.movie-rating { font-size: 12px; color: #f59e0b; margin: 0; }
.movie-runtime { font-size: 11px; color: #9ca3af; margin: 0; }

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

export default reactMovieBrowser;
