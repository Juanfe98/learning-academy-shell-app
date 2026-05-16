# React: Book Library Multi-Filter

**Difficulty:** Hard
**Time Limit:** 65 minutes
**Framework:** React + TypeScript
**Topics:** API Fetching, View Toggle (Card/Table), Multiple Simultaneous Filters, Dynamic Table, useMemo, useContext

---

## Problem Statement

Build a **Book Library Explorer** with two view modes: a card grid and a table. The view mode persists in `localStorage`. Users can search, filter by genre (multi-select OR), filter by year range, filter by minimum rating, and sort. Table column visibility is user-configurable via a column toggle panel. All filters must apply across both views. Manage shared filter state via React Context.

---

## Functional Requirements

- [ ] On mount, fetch books from `fetchBooks()` and render in the active view (card or table)
- [ ] View toggle: grid icon → Card view, table icon → Table view; persisted to `localStorage`
- [ ] Each `BookCard` shows: cover (placeholder), title, author, year, genres (tags), rating, page count
- [ ] Table view uses a dynamic column set; users can show/hide columns via a "Columns" toggle panel
- [ ] Always visible column: Title (cannot be hidden)
- [ ] Toggleable columns: Author, Year, Genre, Rating, Pages
- [ ] Search filters by title or author (real-time)
- [ ] Genre filter: multi-select checkboxes; OR logic (a book matches if it has ANY selected genre)
- [ ] Year range: "From year" and "To year" numeric inputs
- [ ] Min rating: `<input type="range">` 0–5 step 0.5
- [ ] Sort dropdown: `"Title A–Z"`, `"Title Z–A"`, `"Rating: Best First"`, `"Year: Newest"`, `"Pages: Fewest"`
- [ ] All filters via shared Context — both views read the same derived list
- [ ] `"No books found."` when empty
- [ ] `"X of Y books"` count

---

## UI / Visual Specification

```
┌──────────────────────────────────────────────────────────────────────┐
│  Book Library                            23 of 24 books   [⊞] [☰]  │
│                                                                       │
│  [🔍 Search by title or author...]    [Sort by ▼]   [Columns ▼]     │
│                                                                       │
│  Genres: ☑ Fiction  ☑ Sci-Fi  ☐ Fantasy  ☐ Non-Fiction  ☐ Mystery  │
│  Year: [────] – [────]    Min Rating: ─────●────── 3.5              │
│                                                                       │
│  Card view:                              Table view:                  │
│  ┌────────┐ ┌────────┐ ┌────────┐       ┌───────────────┬──────┬───┐│
│  │ [img]  │ │ [img]  │ │ [img]  │       │ Title         │Author│Yr ││
│  │ Dune   │ │ 1984   │ │ Found. │       ├───────────────┼──────┼───┤│
│  │ F.Herb.│ │ Orwell │ │ Asimov │       │ Dune          │ H... │'65││
│  │ [Sci-Fi│ │[Dystop]│ │[Sci-Fi]│       │ 1984          │ O... │'49││
│  │  ★4.8  │ │  ★4.7  │ │  ★4.7  │       └───────────────┴──────┴───┘│
│  │ 412 pp │ │ 328 pp │ │ 255 pp │                                     │
│  └────────┘ └────────┘ └────────┘                                     │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Technical Requirements

**Must use:**
- `React.createContext` + `useContext` for shared filter state accessible by both views
- `useMemo` for the derived filtered+sorted book list
- A reusable `BookCard` component
- Dynamic table column rendering driven by user column visibility config
- `localStorage` for view mode persistence (card vs table)
- TypeScript — all props, context, and state typed

**Must NOT use:**
- External component libraries
- External state management libraries

**Constraints:**
- Column toggle state lives in the context (or alongside it), not locally in the table component
- Genre options derived from fetched data
- The context must be created in a separate `BookLibraryContext.tsx` file (or section of the file)
- `fetchBooks()` simulates 350ms delay — do not modify it

---

## Starter Files

**`BookLibrary.tsx`**
```tsx
import { useState, useEffect, useMemo, createContext, useContext } from "react";

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

// ─── Mock API — do not modify ─────────────────────────────────────────────────

const MOCK_BOOKS: Book[] = [
  { id: 1,  title: "Dune",                          author: "Frank Herbert",    year: 1965, genres: ["Sci-Fi", "Adventure"],          rating: 4.8, pages: 412, coverUrl: "https://placehold.co/80x120?text=Dune"       },
  { id: 2,  title: "1984",                          author: "George Orwell",    year: 1949, genres: ["Dystopia", "Fiction"],           rating: 4.7, pages: 328, coverUrl: "https://placehold.co/80x120?text=1984"       },
  { id: 3,  title: "Foundation",                    author: "Isaac Asimov",     year: 1951, genres: ["Sci-Fi"],                        rating: 4.7, pages: 255, coverUrl: "https://placehold.co/80x120?text=Foundation" },
  { id: 4,  title: "The Hitchhiker's Guide",        author: "Douglas Adams",    year: 1979, genres: ["Sci-Fi", "Comedy"],              rating: 4.6, pages: 193, coverUrl: "https://placehold.co/80x120?text=H2G2"       },
  { id: 5,  title: "Brave New World",               author: "Aldous Huxley",    year: 1932, genres: ["Dystopia", "Sci-Fi"],            rating: 4.4, pages: 311, coverUrl: "https://placehold.co/80x120?text=BNW"        },
  { id: 6,  title: "The Name of the Wind",          author: "Patrick Rothfuss", year: 2007, genres: ["Fantasy"],                       rating: 4.8, pages: 662, coverUrl: "https://placehold.co/80x120?text=NofW"       },
  { id: 7,  title: "Sapiens",                       author: "Yuval Noah Harari",year: 2011, genres: ["Non-Fiction", "History"],        rating: 4.5, pages: 443, coverUrl: "https://placehold.co/80x120?text=Sapiens"    },
  { id: 8,  title: "Gone Girl",                     author: "Gillian Flynn",    year: 2012, genres: ["Mystery", "Thriller"],           rating: 4.2, pages: 422, coverUrl: "https://placehold.co/80x120?text=GoneGirl"   },
  { id: 9,  title: "The Pragmatic Programmer",      author: "David Thomas",     year: 1999, genres: ["Non-Fiction", "Tech"],           rating: 4.6, pages: 352, coverUrl: "https://placehold.co/80x120?text=PragProg"   },
  { id: 10, title: "Atomic Habits",                 author: "James Clear",      year: 2018, genres: ["Non-Fiction", "Self-Help"],      rating: 4.6, pages: 320, coverUrl: "https://placehold.co/80x120?text=AtomicH"    },
  { id: 11, title: "Neuromancer",                   author: "William Gibson",   year: 1984, genres: ["Sci-Fi", "Cyberpunk"],           rating: 4.3, pages: 271, coverUrl: "https://placehold.co/80x120?text=Neuro"      },
  { id: 12, title: "The Alchemist",                 author: "Paulo Coelho",     year: 1988, genres: ["Fiction", "Philosophy"],         rating: 4.1, pages: 208, coverUrl: "https://placehold.co/80x120?text=Alchemist"  },
  { id: 13, title: "A Brief History of Time",       author: "Stephen Hawking",  year: 1988, genres: ["Non-Fiction", "Science"],        rating: 4.4, pages: 212, coverUrl: "https://placehold.co/80x120?text=BriefHist"  },
  { id: 14, title: "The Lord of the Rings",         author: "J.R.R. Tolkien",   year: 1954, genres: ["Fantasy", "Adventure"],          rating: 4.9, pages: 1178, coverUrl: "https://placehold.co/80x120?text=LOTR"      },
  { id: 15, title: "Project Hail Mary",             author: "Andy Weir",        year: 2021, genres: ["Sci-Fi"],                        rating: 4.9, pages: 476, coverUrl: "https://placehold.co/80x120?text=HailMary"   },
  { id: 16, title: "The Girl with the Dragon Tattoo", author: "Stieg Larsson", year: 2005, genres: ["Mystery", "Thriller"],           rating: 4.3, pages: 672, coverUrl: "https://placehold.co/80x120?text=GWDT"       },
  { id: 17, title: "Deep Work",                     author: "Cal Newport",      year: 2016, genres: ["Non-Fiction", "Productivity"],   rating: 4.5, pages: 296, coverUrl: "https://placehold.co/80x120?text=DeepWork"   },
  { id: 18, title: "Ender's Game",                  author: "Orson Scott Card", year: 1985, genres: ["Sci-Fi", "Adventure"],          rating: 4.7, pages: 352, coverUrl: "https://placehold.co/80x120?text=Ender"      },
  { id: 19, title: "Think and Grow Rich",           author: "Napoleon Hill",    year: 1937, genres: ["Non-Fiction", "Self-Help"],      rating: 4.1, pages: 233, coverUrl: "https://placehold.co/80x120?text=ThinkGrow"  },
  { id: 20, title: "The Martian",                   author: "Andy Weir",        year: 2011, genres: ["Sci-Fi", "Adventure"],          rating: 4.7, pages: 369, coverUrl: "https://placehold.co/80x120?text=Martian"    },
  { id: 21, title: "Clean Code",                    author: "Robert C. Martin", year: 2008, genres: ["Non-Fiction", "Tech"],           rating: 4.3, pages: 431, coverUrl: "https://placehold.co/80x120?text=CleanCode"  },
  { id: 22, title: "The Hobbit",                    author: "J.R.R. Tolkien",   year: 1937, genres: ["Fantasy", "Adventure"],          rating: 4.8, pages: 310, coverUrl: "https://placehold.co/80x120?text=Hobbit"     },
  { id: 23, title: "Flowers for Algernon",          author: "Daniel Keyes",     year: 1966, genres: ["Sci-Fi", "Fiction"],             rating: 4.6, pages: 311, coverUrl: "https://placehold.co/80x120?text=Algernon"   },
  { id: 24, title: "The Subtle Art of Not Giving",  author: "Mark Manson",      year: 2016, genres: ["Non-Fiction", "Self-Help"],      rating: 4.0, pages: 224, coverUrl: "https://placehold.co/80x120?text=SubtleArt"  },
];

async function fetchBooks(): Promise<Book[]> {
  await new Promise((res) => setTimeout(res, 350));
  return MOCK_BOOKS;
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface BookLibraryContextValue {
  // TODO: define context shape — filteredBooks, search, setSearch, genres, etc.
}

const BookLibraryContext = createContext<BookLibraryContextValue | null>(null);

function useBookLibrary() {
  const ctx = useContext(BookLibraryContext);
  if (!ctx) throw new Error("useBookLibrary must be used inside BookLibraryProvider");
  return ctx;
}

function BookLibraryProvider({ children }: { children: React.ReactNode }) {
  // TODO: implement provider with all filter state + derived list
  return <BookLibraryContext.Provider value={{}}>{children}</BookLibraryContext.Provider>;
}

// ─── View Components ──────────────────────────────────────────────────────────

interface BookCardProps {
  book: Book;
}

function BookCard({ book }: BookCardProps) {
  // TODO: implement
  return <div>{book.title}</div>;
}

function CardView() {
  // TODO: read from context, render grid of BookCard
  return <div>Card View</div>;
}

function TableView() {
  // TODO: read from context, render dynamic table with column toggle
  return <div>Table View</div>;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function BookLibrary() {
  const [view, setView] = useState<"card" | "table">(() => {
    return (localStorage.getItem("book-library-view") as "card" | "table") ?? "card";
  });

  const handleViewChange = (v: "card" | "table") => {
    setView(v);
    localStorage.setItem("book-library-view", v);
  };

  return (
    <BookLibraryProvider>
      <div>
        <h1>Book Library</h1>
        {/* TODO: view toggle buttons */}
        {/* TODO: filter bar (search, genres, year range, min rating, sort) */}
        {view === "card" ? <CardView /> : <TableView />}
      </div>
    </BookLibraryProvider>
  );
}
```

---

## Acceptance Criteria / Test Cases

| # | Action | Expected Result |
|---|---|---|
| 1 | Page loads | 24 books in card view (default) |
| 2 | Toggle to table view | Same filtered list shown as table |
| 3 | Refresh page | View mode persisted from localStorage |
| 4 | Check genre `"Sci-Fi"` | All sci-fi books (OR logic) |
| 5 | Check `"Sci-Fi"` + `"Fantasy"` | Sci-Fi OR Fantasy books |
| 6 | Set year range 2000–2021 | Books published 2000–2021 |
| 7 | Set min rating 4.7 | Books rated ≥ 4.7 |
| 8 | Search `"weir"` | Both Andy Weir books |
| 9 | Hide "Author" column in table | Author column disappears; Title always visible |
| 10 | All filters active simultaneously | Correct intersection shown in both views |
