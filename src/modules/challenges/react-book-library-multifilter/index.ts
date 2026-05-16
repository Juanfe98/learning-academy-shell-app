import type { Challenge } from "@/lib/challenges/types";

const reactBookLibraryMultifilter: Challenge = {
  slug: "react-book-library-multifilter",
  title: "Book Library Multi-Filter",
  description:
    "Build a book library with card and table views (view persisted in localStorage). Share ALL filter state via React Context. Implement multi-select genre OR filter, year range, min-rating slider, and sort. Table view has a user-configurable column visibility panel. Title column is always visible.",
  difficulty: "advanced",
  tags: ["react", "typescript", "context", "useMemo", "view-toggle", "localStorage", "multi-filter", "dynamic-table"],
  environment: "react-ts",
  entryFile: "App.tsx",
  problemStatement: `# Book Library Multi-Filter

**Difficulty:** Advanced | **Time Limit:** 65 minutes

---

## Problem Statement

Build a **Book Library Explorer** with card and table views. View mode persists in \`localStorage\`. Share ALL filter/sort state through a \`BookLibraryContext\` so both views read the same derived list. Table view has user-configurable column visibility.

---

## Functional Requirements

- On mount, fetch books from \`fetchBooks()\` and render in the active view
- View toggle: ⊞ (Card) / ☰ (Table) — persisted to \`localStorage\`
- \`BookCard\` shows: cover, title, author, year, genres, rating, page count
- Table: dynamic columns — user toggles visibility via a "Columns" panel
  - **Always visible:** Title
  - **Toggleable:** Author, Year, Genre, Rating, Pages
- Search by title or author (real-time)
- Genre checkboxes: OR logic — book matches if it has ANY selected genre
- Genre options derived from data
- Year range: "From" and "To" number inputs
- Min rating slider (\`<input type="range">\`, 0–5, step 0.5)
- Sort: \`"Title A–Z"\`, \`"Title Z–A"\`, \`"Rating: Best First"\`, \`"Year: Newest"\`, \`"Pages: Fewest"\`
- All filters via shared Context — same derived list for both views
- \`"No books found."\` when empty
- \`"X of Y books"\` count

---

## Technical Requirements

**Must use:**
- \`React.createContext\` + \`useContext\` for shared state
- \`useMemo\` for the derived filtered+sorted list
- A reusable \`BookCard\` component
- \`localStorage\` for view persistence
- TypeScript — context type, props, state all typed

**Constraints:**
- Column toggle state lives in the context, not locally in the table component
- Genre checkboxes are OR logic (any match = include)
- Title column cannot be hidden
- \`fetchBooks()\` simulates 350ms delay — do not modify it

---

## Acceptance Criteria

| # | Action | Expected Result |
|---|---|---|
| 1 | Page loads | 24 books in card view |
| 2 | Toggle to table | Same list shown as table |
| 3 | Refresh | View persisted from localStorage |
| 4 | Check \`"Sci-Fi"\` | All Sci-Fi books (OR) |
| 5 | Check \`"Sci-Fi"\` + \`"Fantasy"\` | Sci-Fi OR Fantasy |
| 6 | Year range 2000–2021 | Books in that range |
| 7 | Min rating 4.7 | Books rated ≥ 4.7 |
| 8 | Search \`"weir"\` | Both Andy Weir books |
| 9 | Hide "Author" in table | Column gone; Title always visible |
| 10 | All filters active | Correct intersection in both views |
`,
  files: [
    {
      filename: "App.tsx",
      language: "tsx",
      content: `import { useState, useEffect, useMemo, createContext, useContext } from "react";
import "./styles.css";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Book {
  id: number;
  title: string;
  author: string;
  year: number;
  genres: string[];
  rating: number;
  pages: number;
  coverUrl: string;
}

type SortOption = "title-asc" | "title-desc" | "rating-desc" | "year-desc" | "pages-asc";

type ColumnKey = "author" | "year" | "genres" | "rating" | "pages";

// ─── Mock API — do not modify ─────────────────────────────────────────────────

const MOCK_BOOKS: Book[] = [
  { id: 1,  title: "Dune",                           author: "Frank Herbert",     year: 1965, genres: ["Sci-Fi", "Adventure"],        rating: 4.8, pages: 412,  coverUrl: "https://placehold.co/80x120?text=Dune"      },
  { id: 2,  title: "1984",                           author: "George Orwell",     year: 1949, genres: ["Dystopia", "Fiction"],         rating: 4.7, pages: 328,  coverUrl: "https://placehold.co/80x120?text=1984"      },
  { id: 3,  title: "Foundation",                     author: "Isaac Asimov",      year: 1951, genres: ["Sci-Fi"],                      rating: 4.7, pages: 255,  coverUrl: "https://placehold.co/80x120?text=Foundation"},
  { id: 4,  title: "The Hitchhiker Guide",           author: "Douglas Adams",     year: 1979, genres: ["Sci-Fi", "Comedy"],            rating: 4.6, pages: 193,  coverUrl: "https://placehold.co/80x120?text=H2G2"      },
  { id: 5,  title: "Brave New World",                author: "Aldous Huxley",     year: 1932, genres: ["Dystopia", "Sci-Fi"],          rating: 4.4, pages: 311,  coverUrl: "https://placehold.co/80x120?text=BNW"       },
  { id: 6,  title: "The Name of the Wind",           author: "Patrick Rothfuss",  year: 2007, genres: ["Fantasy"],                     rating: 4.8, pages: 662,  coverUrl: "https://placehold.co/80x120?text=NofW"      },
  { id: 7,  title: "Sapiens",                        author: "Yuval Noah Harari", year: 2011, genres: ["Non-Fiction", "History"],      rating: 4.5, pages: 443,  coverUrl: "https://placehold.co/80x120?text=Sapiens"   },
  { id: 8,  title: "Gone Girl",                      author: "Gillian Flynn",     year: 2012, genres: ["Mystery", "Thriller"],         rating: 4.2, pages: 422,  coverUrl: "https://placehold.co/80x120?text=GoneGirl"  },
  { id: 9,  title: "The Pragmatic Programmer",       author: "David Thomas",      year: 1999, genres: ["Non-Fiction", "Tech"],         rating: 4.6, pages: 352,  coverUrl: "https://placehold.co/80x120?text=PragProg"  },
  { id: 10, title: "Atomic Habits",                  author: "James Clear",       year: 2018, genres: ["Non-Fiction", "Self-Help"],    rating: 4.6, pages: 320,  coverUrl: "https://placehold.co/80x120?text=AtomicH"   },
  { id: 11, title: "Neuromancer",                    author: "William Gibson",    year: 1984, genres: ["Sci-Fi", "Cyberpunk"],         rating: 4.3, pages: 271,  coverUrl: "https://placehold.co/80x120?text=Neuro"     },
  { id: 12, title: "The Alchemist",                  author: "Paulo Coelho",      year: 1988, genres: ["Fiction", "Philosophy"],       rating: 4.1, pages: 208,  coverUrl: "https://placehold.co/80x120?text=Alchemist" },
  { id: 13, title: "A Brief History of Time",        author: "Stephen Hawking",   year: 1988, genres: ["Non-Fiction", "Science"],      rating: 4.4, pages: 212,  coverUrl: "https://placehold.co/80x120?text=BriefHist" },
  { id: 14, title: "The Lord of the Rings",          author: "J.R.R. Tolkien",    year: 1954, genres: ["Fantasy", "Adventure"],        rating: 4.9, pages: 1178, coverUrl: "https://placehold.co/80x120?text=LOTR"      },
  { id: 15, title: "Project Hail Mary",              author: "Andy Weir",         year: 2021, genres: ["Sci-Fi"],                      rating: 4.9, pages: 476,  coverUrl: "https://placehold.co/80x120?text=HailMary"  },
  { id: 16, title: "The Girl with the Dragon Tattoo",author: "Stieg Larsson",     year: 2005, genres: ["Mystery", "Thriller"],         rating: 4.3, pages: 672,  coverUrl: "https://placehold.co/80x120?text=GWDT"      },
  { id: 17, title: "Deep Work",                      author: "Cal Newport",       year: 2016, genres: ["Non-Fiction", "Productivity"], rating: 4.5, pages: 296,  coverUrl: "https://placehold.co/80x120?text=DeepWork"  },
  { id: 18, title: "Enders Game",                    author: "Orson Scott Card",  year: 1985, genres: ["Sci-Fi", "Adventure"],         rating: 4.7, pages: 352,  coverUrl: "https://placehold.co/80x120?text=Ender"     },
  { id: 19, title: "Think and Grow Rich",            author: "Napoleon Hill",     year: 1937, genres: ["Non-Fiction", "Self-Help"],    rating: 4.1, pages: 233,  coverUrl: "https://placehold.co/80x120?text=ThinkGrow" },
  { id: 20, title: "The Martian",                    author: "Andy Weir",         year: 2011, genres: ["Sci-Fi", "Adventure"],         rating: 4.7, pages: 369,  coverUrl: "https://placehold.co/80x120?text=Martian"   },
  { id: 21, title: "Clean Code",                     author: "Robert C. Martin",  year: 2008, genres: ["Non-Fiction", "Tech"],         rating: 4.3, pages: 431,  coverUrl: "https://placehold.co/80x120?text=CleanCode" },
  { id: 22, title: "The Hobbit",                     author: "J.R.R. Tolkien",    year: 1937, genres: ["Fantasy", "Adventure"],        rating: 4.8, pages: 310,  coverUrl: "https://placehold.co/80x120?text=Hobbit"    },
  { id: 23, title: "Flowers for Algernon",           author: "Daniel Keyes",      year: 1966, genres: ["Sci-Fi", "Fiction"],           rating: 4.6, pages: 311,  coverUrl: "https://placehold.co/80x120?text=Algernon"  },
  { id: 24, title: "The Subtle Art of Not Giving",   author: "Mark Manson",       year: 2016, genres: ["Non-Fiction", "Self-Help"],    rating: 4.0, pages: 224,  coverUrl: "https://placehold.co/80x120?text=SubtleArt" },
];

async function fetchBooks(): Promise<Book[]> {
  await new Promise((res) => setTimeout(res, 350));
  return MOCK_BOOKS;
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface BookLibraryContextValue {
  // Raw and filtered data
  books: Book[];
  filteredBooks: Book[];
  allGenres: string[];
  loading: boolean;
  error: string | null;

  // Filter state
  search: string;
  setSearch: (v: string) => void;
  selectedGenres: Set<string>;
  toggleGenre: (g: string) => void;
  yearFrom: string;
  setYearFrom: (v: string) => void;
  yearTo: string;
  setYearTo: (v: string) => void;
  minRating: number;
  setMinRating: (v: number) => void;
  sort: SortOption;
  setSort: (v: SortOption) => void;

  // Table column visibility — Title always shown; these are the optional ones
  visibleColumns: Set<ColumnKey>;
  toggleColumn: (col: ColumnKey) => void;
}

const BookLibraryContext = createContext<BookLibraryContextValue | null>(null);

function useBookLibrary(): BookLibraryContextValue {
  const ctx = useContext(BookLibraryContext);
  if (!ctx) throw new Error("useBookLibrary must be used inside BookLibraryProvider");
  return ctx;
}

const ALL_OPTIONAL_COLUMNS: ColumnKey[] = ["author", "year", "genres", "rating", "pages"];

function BookLibraryProvider({ children }: { children: React.ReactNode }) {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [selectedGenres, setSelectedGenres] = useState<Set<string>>(new Set());
  const [yearFrom, setYearFrom] = useState("");
  const [yearTo, setYearTo] = useState("");
  const [minRating, setMinRating] = useState(0);
  const [sort, setSort] = useState<SortOption>("title-asc");
  const [visibleColumns, setVisibleColumns] = useState<Set<ColumnKey>>(
    new Set(ALL_OPTIONAL_COLUMNS)
  );

  useEffect(() => {
    // TODO: call fetchBooks(), update books/loading/error state
  }, []);

  // TODO: derive unique sorted genres from books
  const allGenres = useMemo<string[]>(() => [], [books]);

  function toggleGenre(g: string) {
    // TODO: add/remove genre from selectedGenres (create new Set, not mutate)
  }

  function toggleColumn(col: ColumnKey) {
    // TODO: add/remove column from visibleColumns (create new Set)
  }

  // TODO: compute filteredBooks with useMemo
  // 1. search (title or author, case-insensitive)
  // 2. selectedGenres — if Set is empty, show all; else book must have ANY selected genre (OR)
  // 3. yearFrom / yearTo — book.year >= parseInt(yearFrom) if set, same for yearTo
  // 4. minRating — book.rating >= minRating
  // 5. sort — use .slice() before .sort()
  const filteredBooks = useMemo<Book[]>(() => {
    return []; // TODO: replace with real implementation
  }, [books, search, selectedGenres, yearFrom, yearTo, minRating, sort]);

  return (
    <BookLibraryContext.Provider value={{
      books, filteredBooks, allGenres, loading, error,
      search, setSearch, selectedGenres, toggleGenre,
      yearFrom, setYearFrom, yearTo, setYearTo,
      minRating, setMinRating, sort, setSort,
      visibleColumns, toggleColumn,
    }}>
      {children}
    </BookLibraryContext.Provider>
  );
}

// ─── BookCard component ───────────────────────────────────────────────────────

interface BookCardProps {
  book: Book;
}

function BookCard({ book }: BookCardProps) {
  // TODO: render cover image, title, author, year, genre tags, rating (★ X.X), page count
  return (
    <div className="book-card">
      <img src={book.coverUrl} alt={book.title} className="book-cover" />
      <p className="book-title">{book.title}</p>
      <p className="book-author">{book.author}</p>
    </div>
  );
}

// ─── CardView ────────────────────────────────────────────────────────────────

function CardView() {
  const { filteredBooks } = useBookLibrary();
  // TODO: render grid of BookCard components
  return (
    <div className="book-grid">
      {filteredBooks.map((b) => <BookCard key={b.id} book={b} />)}
    </div>
  );
}

// ─── TableView ───────────────────────────────────────────────────────────────

const COLUMN_LABELS: Record<ColumnKey, string> = {
  author: "Author",
  year: "Year",
  genres: "Genre",
  rating: "Rating",
  pages: "Pages",
};

function TableView() {
  const { filteredBooks, visibleColumns, toggleColumn } = useBookLibrary();
  const [showColPanel, setShowColPanel] = useState(false);

  // TODO: render table with:
  // - a "Columns" button that toggles the column visibility panel
  // - always-visible "Title" th
  // - optional columns from visibleColumns
  // - one row per filteredBook
  return (
    <div>
      <div className="table-controls">
        <button className="col-toggle-btn" onClick={() => setShowColPanel(!showColPanel)}>
          Columns ▾
        </button>
        {showColPanel && (
          <div className="col-panel">
            <p className="col-panel-title">Always visible: Title</p>
            {ALL_OPTIONAL_COLUMNS.map((col) => (
              <label key={col} className="col-label">
                <input
                  type="checkbox"
                  checked={visibleColumns.has(col)}
                  onChange={() => toggleColumn(col)}
                />
                {COLUMN_LABELS[col]}
              </label>
            ))}
          </div>
        )}
      </div>
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Title</th>
              {/* TODO: render <th> for each visible optional column */}
            </tr>
          </thead>
          <tbody>
            {filteredBooks.map((book) => (
              <tr key={book.id}>
                <td>{book.title}</td>
                {/* TODO: render <td> for each visible optional column */}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function App() {
  const [view, setView] = useState<"card" | "table">(() => {
    try {
      return (localStorage.getItem("book-library-view") as "card" | "table") ?? "card";
    } catch {
      return "card";
    }
  });

  function handleViewChange(v: "card" | "table") {
    setView(v);
    localStorage.setItem("book-library-view", v);
  }

  return (
    <BookLibraryProvider>
      <AppInner view={view} onViewChange={handleViewChange} />
    </BookLibraryProvider>
  );
}

function AppInner({ view, onViewChange }: { view: "card" | "table"; onViewChange: (v: "card" | "table") => void }) {
  const {
    books, filteredBooks, allGenres, loading, error,
    search, setSearch, selectedGenres, toggleGenre,
    yearFrom, setYearFrom, yearTo, setYearTo,
    minRating, setMinRating, sort, setSort,
  } = useBookLibrary();

  if (loading) return <div className="status-msg">Loading books...</div>;
  if (error) return <div className="status-msg error">{error}</div>;

  return (
    <div className="library">
      <div className="lib-header">
        <h1>Book Library</h1>
        <div className="header-right">
          <span className="count">{filteredBooks.length} of {books.length} books</span>
          <div className="view-toggle">
            <button className={\`view-btn\${view === "card" ? " active" : ""}\`} onClick={() => onViewChange("card")} title="Card view">⊞</button>
            <button className={\`view-btn\${view === "table" ? " active" : ""}\`} onClick={() => onViewChange("table")} title="Table view">☰</button>
          </div>
        </div>
      </div>

      <div className="controls-row">
        <input
          className="search-input"
          placeholder="Search by title or author..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="sort-select" value={sort} onChange={(e) => setSort(e.target.value as SortOption)}>
          <option value="title-asc">Title A–Z</option>
          <option value="title-desc">Title Z–A</option>
          <option value="rating-desc">Rating: Best First</option>
          <option value="year-desc">Year: Newest</option>
          <option value="pages-asc">Pages: Fewest</option>
        </select>
      </div>

      <div className="genre-filter">
        <span className="filter-label">Genres:</span>
        {/* TODO: render a checkbox for each genre in allGenres
            - checked when genre is in selectedGenres
            - onChange calls toggleGenre(genre) */}
        {allGenres.length === 0 && <span className="placeholder-hint">(genres load after fetch)</span>}
      </div>

      <div className="range-filters">
        <label className="range-label">
          Year from:
          <input type="number" className="year-input" value={yearFrom} onChange={(e) => setYearFrom(e.target.value)} placeholder="e.g. 2000" />
        </label>
        <label className="range-label">
          to:
          <input type="number" className="year-input" value={yearTo} onChange={(e) => setYearTo(e.target.value)} placeholder="e.g. 2024" />
        </label>
        <label className="range-label">
          Min rating:
          {/* TODO: <input type="range" min="0" max="5" step="0.5"> bound to minRating */}
          <span className="rating-value">{minRating.toFixed(1)} ★</span>
        </label>
      </div>

      {filteredBooks.length === 0 ? (
        <p className="status-msg">No books found.</p>
      ) : (
        view === "card" ? <CardView /> : <TableView />
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

.lib-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}

h1 { margin: 0; font-size: 1.5rem; }

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.count { font-size: 13px; color: #6b7280; }

.view-toggle { display: flex; gap: 4px; }

.view-btn {
  padding: 5px 10px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: #fff;
  font-size: 16px;
  cursor: pointer;
}

.view-btn.active { background: #6366f1; color: #fff; border-color: #6366f1; }

.controls-row {
  display: flex;
  gap: 8px;
  margin-bottom: 10px;
}

.search-input { flex: 1; }

.search-input,
.sort-select {
  padding: 7px 10px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 13px;
}

.genre-filter {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  margin-bottom: 10px;
}

.filter-label { font-size: 12px; font-weight: 600; color: #374151; }

.genre-checkbox {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 999px;
  padding: 3px 10px;
  cursor: pointer;
}

.range-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  margin-bottom: 14px;
}

.range-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #374151;
}

.year-input {
  width: 80px;
  padding: 5px 8px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 13px;
}

.rating-value {
  font-size: 13px;
  font-weight: 600;
  color: #f59e0b;
  min-width: 40px;
}

.placeholder-hint { font-size: 12px; color: #9ca3af; font-style: italic; }

/* Card view */
.book-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: 14px;
}

.book-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.book-cover {
  width: 100%;
  display: block;
}

.book-card > * { padding: 0 10px; }
.book-title { margin: 8px 0 2px; font-size: 12px; font-weight: 700; line-height: 1.3; }
.book-author { margin: 0 0 4px; font-size: 11px; color: #6b7280; }
.book-year { margin: 0; font-size: 11px; color: #9ca3af; }
.book-rating { margin: 0; font-size: 11px; color: #f59e0b; }
.book-pages { margin: 0 0 8px; font-size: 11px; color: #9ca3af; }

.book-genres {
  display: flex;
  flex-wrap: wrap;
  gap: 3px;
  padding: 0 10px 6px;
}

.genre-tag {
  font-size: 10px;
  background: #ede9fe;
  color: #5b21b6;
  border-radius: 999px;
  padding: 1px 6px;
}

/* Table view */
.table-controls {
  position: relative;
  display: flex;
  justify-content: flex-end;
  margin-bottom: 8px;
}

.col-toggle-btn {
  padding: 5px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: #fff;
  font-size: 12px;
  cursor: pointer;
}

.col-panel {
  position: absolute;
  top: 32px;
  right: 0;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 10px 14px;
  z-index: 10;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  min-width: 160px;
}

.col-panel-title { margin: 0 0 6px; font-size: 11px; color: #9ca3af; }

.col-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  padding: 3px 0;
  cursor: pointer;
}

.table-wrapper {
  overflow-x: auto;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

thead { background: #f3f4f6; }

th {
  padding: 10px 14px;
  text-align: left;
  font-weight: 600;
  color: #374151;
  border-bottom: 1px solid #e5e7eb;
  white-space: nowrap;
}

td {
  padding: 9px 14px;
  border-bottom: 1px solid #f3f4f6;
  color: #374151;
}

tr:last-child td { border-bottom: none; }

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

export default reactBookLibraryMultifilter;
