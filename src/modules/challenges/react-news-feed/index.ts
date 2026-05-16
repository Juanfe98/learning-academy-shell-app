import type { Challenge } from "@/lib/challenges/types";

const reactNewsFeed: Challenge = {
  slug: "react-news-feed",
  title: "News Feed with Pagination",
  description:
    "Fetch articles and display them 10 per page with prev/next pagination. Extract all logic into a useNewsFeed custom hook. Page must reset to 1 whenever search, category filter, or sort changes. Description truncation belongs in ArticleCard, not the hook.",
  difficulty: "advanced",
  tags: ["react", "typescript", "custom-hook", "pagination", "search", "filter", "sort", "api-fetching"],
  environment: "react-ts",
  entryFile: "App.tsx",
  problemStatement: `# News Feed with Pagination

**Difficulty:** Advanced | **Time Limit:** 55 minutes

---

## Problem Statement

Build a **News Feed** that fetches articles from a mock endpoint and renders them as cards with **10 per page** pagination. Extract all data logic into a custom \`useNewsFeed\` hook.

---

## Functional Requirements

- On mount, fetch from \`fetchArticles()\` and render as \`ArticleCard\` components
- Show loading and error states
- Each \`ArticleCard\` shows: category badge, headline, author, source, formatted date, description (max 120 chars with "..."), reading time
- Show **10 articles per page** with Prev/Next buttons and \`"Page X of Y"\` indicator
- Page resets to 1 whenever search, category, or sort changes
- Search by headline or author (case-insensitive, real-time)
- Category dropdown derived from data (\`"All Categories"\` default)
- Sort: \`"Newest First"\`, \`"Oldest First"\`, \`"Reading Time: Shortest"\`, \`"Author A–Z"\`
- All filters apply before pagination
- \`"No articles found."\` when empty
- \`"X articles"\` filtered count label

---

## Technical Requirements

**Must use:**
- A custom \`useNewsFeed()\` hook — owns fetch state, all filter/sort/page state, and derived paginated list
- A reusable \`ArticleCard\` component
- TypeScript — all props and state typed

**Constraints:**
- Description truncation (120 chars + "...") must live inside \`ArticleCard\`, not in the hook
- Category options derived from fetched data — no hardcoded list
- Page resets to 1 on any filter/sort change
- \`fetchArticles()\` simulates 400ms delay — do not modify it
- \`PAGE_SIZE = 10\`

---

## Acceptance Criteria

| # | Action | Expected Result |
|---|---|---|
| 1 | Page loads | First 10 articles; \`"Page 1 of 2"\` |
| 2 | Click Next | Articles 11–20; \`"Page 2 of 2"\` |
| 3 | Click Prev on page 1 | Disabled or no-op |
| 4 | Filter \`"Tech"\` | Only Tech articles; page resets to 1 |
| 5 | Tech = 7 articles | \`"Page 1 of 1"\`; no Next |
| 6 | Search \`"AI"\` | Matching headline or author |
| 7 | Sort \`"Oldest First"\` | Dec 27 article first; page resets |
| 8 | Sort \`"Reading Time: Shortest"\` | 3-min articles first |
| 9 | Page 2 then apply filter | Page resets to 1 |
| 10 | Search \`"zzzzz"\` | \`"No articles found."\` |
`,
  files: [
    {
      filename: "App.tsx",
      language: "tsx",
      content: `import { useState, useEffect } from "react";
import "./styles.css";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Article {
  id: number;
  headline: string;
  author: string;
  source: string;
  category: string;
  description: string;
  publishedAt: string;
  readingTimeMin: number;
}

type SortOption = "newest" | "oldest" | "reading-time" | "author-asc";

// ─── Mock API — do not modify ─────────────────────────────────────────────────

const MOCK_ARTICLES: Article[] = [
  { id: 1,  headline: "The Future of AI in Software Development",           author: "Jane Smith",      source: "TechCrunch",    category: "Tech",     description: "Artificial intelligence is reshaping how developers write code, with tools like GitHub Copilot leading the charge across teams of all sizes.", publishedAt: "2024-01-15T10:30:00Z", readingTimeMin: 5 },
  { id: 2,  headline: "Global Markets React to Fed Interest Rate Decision",  author: "Robert Chen",     source: "Bloomberg",     category: "Business", description: "Stock markets around the world responded sharply to the Federal Reserve unexpected hold on interest rates, raising questions about inflation timelines.", publishedAt: "2024-01-14T08:00:00Z", readingTimeMin: 4 },
  { id: 3,  headline: "New Study Links Ultra-Processed Foods to Brain Fog",  author: "Dr. Amy Lee",     source: "Health Today",  category: "Health",   description: "Researchers at Stanford found significant correlations between diets high in ultra-processed foods and cognitive decline in adults over 40.", publishedAt: "2024-01-13T14:15:00Z", readingTimeMin: 6 },
  { id: 4,  headline: "SpaceX Starship Achieves Full Flight Success",        author: "Mike Torres",     source: "Space News",    category: "Science",  description: "After two failed test flights, SpaceX Starship rocket completed a full orbital test flight, marking a milestone for commercial deep-space travel.", publishedAt: "2024-01-12T20:45:00Z", readingTimeMin: 7 },
  { id: 5,  headline: "React 20 Announced with Server Components Overhaul",  author: "Sarah Park",      source: "Dev.to",        category: "Tech",     description: "The React team unveiled version 20 at React Conf, featuring a redesigned server components model and new concurrent rendering primitives.", publishedAt: "2024-01-11T09:00:00Z", readingTimeMin: 8 },
  { id: 6,  headline: "Olympic Games 2028 Venue Construction Begins",        author: "Carlos Rivera",   source: "ESPN",          category: "Sports",   description: "Los Angeles started construction of key Olympic venues today, with organizers promising carbon-neutral operations throughout the 2028 games.", publishedAt: "2024-01-10T11:30:00Z", readingTimeMin: 3 },
  { id: 7,  headline: "EU Passes Landmark Data Privacy Regulation",          author: "Elena Muller",    source: "Reuters",       category: "Politics", description: "European Parliament voted 487-23 to pass the new Digital Privacy Act, imposing stricter requirements on data brokers and social media platforms.", publishedAt: "2024-01-09T16:00:00Z", readingTimeMin: 5 },
  { id: 8,  headline: "TypeScript 6.0 Ships with Isolated Declarations",     author: "Matt Johnson",    source: "InfoQ",         category: "Tech",     description: "Microsoft released TypeScript 6.0 featuring isolated declarations, enabling faster parallel builds and a revamped module resolution algorithm.", publishedAt: "2024-01-08T13:00:00Z", readingTimeMin: 6 },
  { id: 9,  headline: "Scientists Discover New Antibiotic from Soil Bacteria", author: "Dr. Kim Park", source: "Nature",        category: "Science",  description: "A team from MIT discovered a novel antibiotic compound effective against drug-resistant superbugs, isolated from soil samples collected in the Amazon.", publishedAt: "2024-01-07T10:00:00Z", readingTimeMin: 9 },
  { id: 10, headline: "Bitcoin Surpasses $70,000 All-Time High",             author: "Anna White",      source: "CoinDesk",      category: "Business", description: "Bitcoin broke through $70,000 for the first time, driven by institutional ETF inflows and tightening supply following the upcoming halving event.", publishedAt: "2024-01-06T22:00:00Z", readingTimeMin: 4 },
  { id: 11, headline: "Formula 1 Unveils 2026 Car Regulations",              author: "James Hunt Jr.",  source: "Autosport",     category: "Sports",   description: "The FIA and Formula 1 published the final technical regulations for 2026 cars, introducing active aerodynamics and a return to smaller, lighter chassis.", publishedAt: "2024-01-05T09:30:00Z", readingTimeMin: 5 },
  { id: 12, headline: "New Mental Health App Claims to Outperform Therapy",  author: "Dr. Laura Fox",   source: "Wired",         category: "Health",   description: "A controversial study commissioned by Bloom Health claims their AI-powered app produced better outcomes than 12-week CBT for mild depression cases.", publishedAt: "2024-01-04T07:00:00Z", readingTimeMin: 7 },
  { id: 13, headline: "Next.js 15 Introduces Native View Transitions",       author: "Guillermo R.",    source: "Vercel Blog",   category: "Tech",     description: "Vercel Next.js 15 ships with native View Transitions API support, enabling smooth page animations without JavaScript-heavy animation libraries.", publishedAt: "2024-01-03T12:00:00Z", readingTimeMin: 5 },
  { id: 14, headline: "Amazon Announces 50,000 Layoffs Amid AI Restructure", author: "Ben Gray",        source: "WSJ",           category: "Business", description: "Amazon will cut 50,000 roles over 18 months as part of an organizational restructure that redirects headcount investment toward AI infrastructure.", publishedAt: "2024-01-02T15:00:00Z", readingTimeMin: 4 },
  { id: 15, headline: "Climate Scientists Issue Code Red for Ocean Temps",   author: "Dr. Sara Ocean",  source: "Guardian",      category: "Science",  description: "Global ocean surface temperatures in 2023 shattered all previous records, with scientists warning of cascading effects on fisheries and weather patterns.", publishedAt: "2024-01-01T08:00:00Z", readingTimeMin: 6 },
  { id: 16, headline: "NFL Playoff Picture Set After Wild Card Weekend",      author: "Tom Brady Sr.",   source: "NFL.com",       category: "Sports",   description: "Eight teams advance after an exciting Wild Card weekend filled with overtime finishes, setting up a highly anticipated divisional round.", publishedAt: "2023-12-31T23:00:00Z", readingTimeMin: 3 },
  { id: 17, headline: "WHO Warns of New Respiratory Virus in Southeast Asia", author: "Dr. Liu Wei",     source: "WHO",           category: "Health",   description: "The World Health Organization issued a global health advisory after clusters of a novel respiratory pathogen were detected across three countries.", publishedAt: "2023-12-30T10:00:00Z", readingTimeMin: 5 },
  { id: 18, headline: "GPT-5 Benchmarks Leak Ahead of Release",              author: "Lex Marks",       source: "The Verge",     category: "Tech",     description: "Internal benchmarks from OpenAI GPT-5 evaluation suite leaked online, showing dramatic improvements in mathematical reasoning and code generation.", publishedAt: "2023-12-29T18:00:00Z", readingTimeMin: 7 },
  { id: 19, headline: "US Congress Passes TikTok Divestiture Bill",          author: "Political Desk",  source: "AP News",       category: "Politics", description: "The US Senate passed legislation requiring ByteDance to divest TikTok within 180 days or face a nationwide ban, awaiting presidential signature.", publishedAt: "2023-12-28T14:00:00Z", readingTimeMin: 4 },
  { id: 20, headline: "Rust Overtakes Java in Backend Survey for First Time", author: "Dev Weekly",     source: "StackOverflow", category: "Tech",     description: "The annual Stack Overflow developer survey shows Rust overtaking Java in backend language preference for the first time, with 72% of users wanting to continue.", publishedAt: "2023-12-27T10:00:00Z", readingTimeMin: 6 },
];

async function fetchArticles(): Promise<Article[]> {
  await new Promise((res) => setTimeout(res, 400));
  return MOCK_ARTICLES;
}

// ─── ArticleCard component ────────────────────────────────────────────────────

const PAGE_SIZE = 10;

interface ArticleCardProps {
  article: Article;
}

function ArticleCard({ article }: ArticleCardProps) {
  // TODO: render full card layout
  // Description truncation (120 chars + "...") MUST live here, not in the hook
  const snippet = article.description.length > 120
    ? article.description.slice(0, 120) + "..."
    : article.description;

  const dateLabel = new Date(article.publishedAt).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });

  return (
    <div className="article-card">
      <div className="article-meta">
        <span className="category-badge">{article.category.toUpperCase()}</span>
      </div>
      <p className="article-headline">{article.headline}</p>
      {/* TODO: render author, source, date, reading time, and snippet */}
      <p className="article-byline">By {article.author} · {article.source} · {dateLabel} · {article.readingTimeMin} min</p>
      <p className="article-snippet">{snippet}</p>
    </div>
  );
}

// ─── Custom hook ──────────────────────────────────────────────────────────────

interface UseNewsFeedResult {
  articles: Article[];
  pagedArticles: Article[];
  allCategories: string[];
  loading: boolean;
  error: string | null;
  search: string;
  setSearch: (v: string) => void;
  category: string;
  setCategory: (v: string) => void;
  sort: SortOption;
  setSort: (v: SortOption) => void;
  page: number;
  totalPages: number;
  goNext: () => void;
  goPrev: () => void;
  filteredCount: number;
}

function useNewsFeed(): UseNewsFeedResult {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearchRaw] = useState("");
  const [category, setCategoryRaw] = useState("All Categories");
  const [sort, setSortRaw] = useState<SortOption>("newest");
  const [page, setPage] = useState(1);

  useEffect(() => {
    // TODO: call fetchArticles(), update articles/loading/error state
  }, []);

  // Reset page to 1 when filters change — wrap setters to auto-reset
  function setSearch(v: string) { setSearchRaw(v); setPage(1); }
  function setCategory(v: string) { setCategoryRaw(v); setPage(1); }
  function setSort(v: SortOption) { setSortRaw(v); setPage(1); }

  // TODO: derive unique sorted categories from articles
  const allCategories: string[] = ["All Categories"];

  // TODO: compute filteredArticles (search + category filter + sort)
  // Use .slice() before .sort() to avoid mutating state
  const filteredArticles: Article[] = [];

  const totalPages = Math.max(1, Math.ceil(filteredArticles.length / PAGE_SIZE));

  // TODO: compute pagedArticles — slice filteredArticles for the current page
  const pagedArticles: Article[] = [];

  function goNext() {
    // TODO: increment page if page < totalPages
  }

  function goPrev() {
    // TODO: decrement page if page > 1
  }

  return {
    articles, pagedArticles, allCategories, loading, error,
    search, setSearch, category, setCategory, sort, setSort,
    page, totalPages, goNext, goPrev, filteredCount: filteredArticles.length,
  };
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function App() {
  const {
    pagedArticles, allCategories, loading, error,
    search, setSearch, category, setCategory, sort, setSort,
    page, totalPages, goNext, goPrev, filteredCount,
  } = useNewsFeed();

  if (loading) return <div className="status-msg">Loading articles...</div>;
  if (error) return <div className="status-msg error">{error}</div>;

  return (
    <div className="feed">
      <div className="feed-header">
        <h1>News Feed</h1>
        <span className="count">{filteredCount} articles</span>
      </div>

      <div className="controls">
        <input
          className="search-input"
          placeholder="Search by headline or author..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="cat-select" value={category} onChange={(e) => setCategory(e.target.value)}>
          {allCategories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="sort-select" value={sort} onChange={(e) => setSort(e.target.value as SortOption)}>
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="reading-time">Reading Time: Shortest</option>
          <option value="author-asc">Author A–Z</option>
        </select>
      </div>

      {pagedArticles.length === 0 ? (
        <p className="status-msg">No articles found.</p>
      ) : (
        <>
          <div className="article-list">
            {pagedArticles.map((a) => <ArticleCard key={a.id} article={a} />)}
          </div>

          <div className="pagination">
            <button className="page-btn" onClick={goPrev} disabled={page === 1}>
              ← Prev
            </button>
            <span className="page-indicator">Page {page} of {totalPages}</span>
            <button className="page-btn" onClick={goNext} disabled={page === totalPages}>
              Next →
            </button>
          </div>
        </>
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

.feed-header {
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
.cat-select,
.sort-select {
  padding: 8px 10px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 13px;
}

.article-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 16px;
}

.article-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 14px;
}

.article-meta { margin-bottom: 6px; }

.category-badge {
  font-size: 10px;
  font-weight: 700;
  background: #ede9fe;
  color: #5b21b6;
  border-radius: 4px;
  padding: 2px 7px;
  letter-spacing: 0.05em;
}

.article-headline {
  margin: 0 0 4px;
  font-size: 15px;
  font-weight: 700;
  line-height: 1.4;
}

.article-byline {
  margin: 0 0 6px;
  font-size: 12px;
  color: #6b7280;
}

.article-snippet {
  margin: 0;
  font-size: 13px;
  color: #4b5563;
  line-height: 1.5;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 14px;
  margin-top: 8px;
}

.page-btn {
  padding: 7px 16px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: #fff;
  font-size: 13px;
  cursor: pointer;
}

.page-btn:hover:not(:disabled) { background: #f3f4f6; }
.page-btn:disabled { opacity: 0.4; cursor: not-allowed; }

.page-indicator { font-size: 13px; color: #374151; font-weight: 500; }

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

export default reactNewsFeed;
