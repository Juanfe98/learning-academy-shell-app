# React: News Feed with Pagination

**Difficulty:** Medium/Hard
**Time Limit:** 55 minutes
**Framework:** React + TypeScript
**Topics:** API Fetching, Card Components, Pagination, Search, Category Filter, Sort, Custom Hook

---

## Problem Statement

Build a **News Feed** that fetches articles from a mock endpoint and renders them as cards. The dataset is large — articles are displayed **10 per page** with pagination controls. Users can search by headline or author, filter by category, and sort results. Extract all data logic into a custom `useNewsFeed` hook.

---

## Functional Requirements

- [ ] On mount, fetch articles from `fetchArticles()` and render as `ArticleCard` components
- [ ] Show loading and error states
- [ ] Each `ArticleCard` displays: category badge, headline, author, source, published date (formatted), description snippet (max 120 chars, truncated with "..."), and reading time
- [ ] Show **10 articles per page** with previous/next page buttons and a `"Page X of Y"` indicator
- [ ] Page resets to 1 whenever search, category, or sort changes
- [ ] Search input filters by headline or author (case-insensitive, real-time)
- [ ] Category dropdown: `"All Categories"` + unique categories derived from data
- [ ] Sort dropdown: `"Newest First"`, `"Oldest First"`, `"Reading Time: Shortest"`, `"Author A–Z"`
- [ ] All filters apply before pagination
- [ ] `"No articles found."` when filtered result is empty
- [ ] `"X articles"` total count label (count of filtered results, not total)

---

## UI / Visual Specification

```
┌──────────────────────────────────────────────────────────────────────┐
│  News Feed                                          32 articles       │
│                                                                       │
│  [🔍 Search by headline or author...]  [Category ▼]  [Sort by ▼]    │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │  [TECH]  The Future of AI in Software Development            │    │
│  │          By Jane Smith · TechCrunch · Jan 15, 2024 · 5 min  │    │
│  │          Artificial intelligence is reshaping how developers │    │
│  │          write code, with tools like GitHub Copilot...       │    │
│  └──────────────────────────────────────────────────────────────┘    │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │  [BUSINESS]  Global Markets React to Fed Decision            │    │
│  │  ...                                                         │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                                                                       │
│               ← Prev    Page 2 of 4    Next →                        │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Technical Requirements

**Must use:**
- A custom `useNewsFeed()` hook owning: fetch state, search, category, sort, page, and derived paginated list
- A reusable `ArticleCard` component
- TypeScript — all props and state typed

**Must NOT use:**
- External pagination libraries
- External component libraries

**Constraints:**
- Category options derived from fetched data — no hardcoded list
- Description truncation logic must live inside `ArticleCard`, not in the hook
- When on page 3 and the user applies a filter that produces only 1 page of results, page must reset to 1
- `fetchArticles()` simulates 400ms delay — do not modify it

---

## Starter Files

**`NewsFeed.tsx`**
```tsx
import { useState, useEffect } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Article {
  id: number;
  headline: string;
  author: string;
  source: string;
  category: string;
  description: string;
  publishedAt: string;    // ISO 8601
  readingTimeMin: number;
}

// ─── Mock API — do not modify ─────────────────────────────────────────────────

const MOCK_ARTICLES: Article[] = [
  { id: 1,  headline: "The Future of AI in Software Development",        author: "Jane Smith",      source: "TechCrunch",    category: "Tech",     description: "Artificial intelligence is reshaping how developers write code, with tools like GitHub Copilot leading the charge across teams of all sizes.", publishedAt: "2024-01-15T10:30:00Z", readingTimeMin: 5  },
  { id: 2,  headline: "Global Markets React to Fed Interest Rate Decision", author: "Robert Chen",  source: "Bloomberg",     category: "Business", description: "Stock markets around the world responded sharply to the Federal Reserve's unexpected hold on interest rates, raising questions about inflation timelines.", publishedAt: "2024-01-14T08:00:00Z", readingTimeMin: 4  },
  { id: 3,  headline: "New Study Links Ultra-Processed Foods to Brain Fog", author: "Dr. Amy Lee",  source: "Health Today",  category: "Health",   description: "Researchers at Stanford found significant correlations between diets high in ultra-processed foods and cognitive decline in adults over 40.", publishedAt: "2024-01-13T14:15:00Z", readingTimeMin: 6  },
  { id: 4,  headline: "SpaceX Starship Achieves Full Flight Success",     author: "Mike Torres",    source: "Space News",    category: "Science",  description: "After two failed test flights, SpaceX's Starship rocket completed a full orbital test flight, marking a milestone for commercial deep-space travel.", publishedAt: "2024-01-12T20:45:00Z", readingTimeMin: 7  },
  { id: 5,  headline: "React 20 Announced with Server Components Overhaul", author: "Sarah Park",  source: "Dev.to",        category: "Tech",     description: "The React team unveiled version 20 at React Conf, featuring a redesigned server components model and new concurrent rendering primitives.", publishedAt: "2024-01-11T09:00:00Z", readingTimeMin: 8  },
  { id: 6,  headline: "Olympic Games 2028 Venue Construction Begins",    author: "Carlos Rivera",  source: "ESPN",          category: "Sports",   description: "Los Angeles started construction of key Olympic venues today, with organizers promising carbon-neutral operations throughout the 2028 games.", publishedAt: "2024-01-10T11:30:00Z", readingTimeMin: 3  },
  { id: 7,  headline: "EU Passes Landmark Data Privacy Regulation",      author: "Elena Müller",   source: "Reuters",       category: "Politics", description: "European Parliament voted 487-23 to pass the new Digital Privacy Act, imposing stricter requirements on data brokers and social media platforms.", publishedAt: "2024-01-09T16:00:00Z", readingTimeMin: 5  },
  { id: 8,  headline: "TypeScript 6.0 Ships with Isolated Declarations", author: "Matt Johnson",  source: "InfoQ",         category: "Tech",     description: "Microsoft released TypeScript 6.0 featuring isolated declarations, enabling faster parallel builds and a revamped module resolution algorithm.", publishedAt: "2024-01-08T13:00:00Z", readingTimeMin: 6  },
  { id: 9,  headline: "Scientists Discover New Antibiotic from Soil Bacteria", author: "Dr. Kim Park", source: "Nature",  category: "Science",  description: "A team from MIT discovered a novel antibiotic compound effective against drug-resistant superbugs, isolated from soil samples collected in the Amazon.", publishedAt: "2024-01-07T10:00:00Z", readingTimeMin: 9  },
  { id: 10, headline: "Bitcoin Surpasses $70,000 All-Time High",         author: "Anna White",     source: "CoinDesk",      category: "Business", description: "Bitcoin broke through $70,000 for the first time, driven by institutional ETF inflows and tightening supply following the upcoming halving event.", publishedAt: "2024-01-06T22:00:00Z", readingTimeMin: 4  },
  { id: 11, headline: "Formula 1 Unveils 2026 Car Regulations",          author: "James Hunt Jr.", source: "Autosport",     category: "Sports",   description: "The FIA and Formula 1 published the final technical regulations for 2026 cars, introducing active aerodynamics and a return to smaller, lighter chassis.", publishedAt: "2024-01-05T09:30:00Z", readingTimeMin: 5  },
  { id: 12, headline: "New Mental Health App Claims to Outperform Therapy", author: "Dr. Laura Fox", source: "Wired",       category: "Health",   description: "A controversial study commissioned by Bloom Health claims their AI-powered app produced better outcomes than 12-week CBT for mild depression cases.", publishedAt: "2024-01-04T07:00:00Z", readingTimeMin: 7  },
  { id: 13, headline: "Next.js 15 Introduces Native View Transitions",   author: "Guillermo R.",   source: "Vercel Blog",   category: "Tech",     description: "Vercel's Next.js 15 ships with native View Transitions API support, enabling smooth page animations without JavaScript-heavy animation libraries.", publishedAt: "2024-01-03T12:00:00Z", readingTimeMin: 5  },
  { id: 14, headline: "Amazon Announces 50,000 Layoffs Amid AI Restructure", author: "Ben Gray",   source: "WSJ",           category: "Business", description: "Amazon will cut 50,000 roles over 18 months as part of an organizational restructure that redirects headcount investment toward AI infrastructure.", publishedAt: "2024-01-02T15:00:00Z", readingTimeMin: 4  },
  { id: 15, headline: "Climate Scientists Issue Code Red for Ocean Temperatures", author: "Dr. Sara Ocean", source: "Guardian", category: "Science", description: "Global ocean surface temperatures in 2023 shattered all previous records, with scientists warning of cascading effects on fisheries and weather patterns.", publishedAt: "2024-01-01T08:00:00Z", readingTimeMin: 6  },
  { id: 16, headline: "NFL Playoff Picture Set After Wild Card Weekend",  author: "Tom Brady Sr.",  source: "NFL.com",       category: "Sports",   description: "Eight teams advance after an exciting Wild Card weekend filled with overtime finishes, setting up a highly anticipated divisional round.", publishedAt: "2023-12-31T23:00:00Z", readingTimeMin: 3  },
  { id: 17, headline: "WHO Warns of New Respiratory Virus in Southeast Asia", author: "Dr. Liu Wei", source: "WHO",          category: "Health",   description: "The World Health Organization issued a global health advisory after clusters of a novel respiratory pathogen were detected across three countries.", publishedAt: "2023-12-30T10:00:00Z", readingTimeMin: 5  },
  { id: 18, headline: "GPT-5 Benchmarks Leak Ahead of Release",          author: "Lex Marks",      source: "The Verge",     category: "Tech",     description: "Internal benchmarks from OpenAI's GPT-5 evaluation suite leaked online, showing dramatic improvements in mathematical reasoning and code generation.", publishedAt: "2023-12-29T18:00:00Z", readingTimeMin: 7  },
  { id: 19, headline: "US Congress Passes TikTok Divestiture Bill",      author: "Political Desk", source: "AP News",       category: "Politics", description: "The US Senate passed legislation requiring ByteDance to divest TikTok within 180 days or face a nationwide ban, awaiting presidential signature.", publishedAt: "2023-12-28T14:00:00Z", readingTimeMin: 4  },
  { id: 20, headline: "Rust Overtakes Java in Backend Survey for First Time", author: "Dev Weekly", source: "StackOverflow", category: "Tech",     description: "The annual Stack Overflow developer survey shows Rust overtaking Java in backend language preference for the first time, with 72% of users wanting to continue using it.", publishedAt: "2023-12-27T10:00:00Z", readingTimeMin: 6  },
];

async function fetchArticles(): Promise<Article[]> {
  await new Promise((res) => setTimeout(res, 400));
  return MOCK_ARTICLES;
}

// ─── Your implementation ──────────────────────────────────────────────────────

const PAGE_SIZE = 10;

function useNewsFeed() {
  // TODO: fetch, search, category, sort, page state + derived paginated list
}

interface ArticleCardProps {
  article: Article;
}

function ArticleCard({ article }: ArticleCardProps) {
  // TODO: implement — truncate description at 120 chars
  return <div>{article.headline}</div>;
}

export default function NewsFeed() {
  // TODO: use hook + build UI
  return (
    <div>
      <h1>News Feed</h1>
    </div>
  );
}
```

---

## Acceptance Criteria / Test Cases

| # | Action | Expected Result |
|---|---|---|
| 1 | Page loads | First 10 articles shown; `"Page 1 of 2"` |
| 2 | Click Next | Articles 11–20 shown; `"Page 2 of 2"` |
| 3 | Click Prev on page 1 | Button disabled or no-op |
| 4 | Filter category `"Tech"` | Only Tech articles; page resets to 1 |
| 5 | Tech has 7 articles | `"Page 1 of 1"` shown, no Next button |
| 6 | Search `"AI"` | Articles with "AI" in headline or author |
| 7 | Sort `"Oldest First"` | Dec 27 article first; page resets to 1 |
| 8 | Sort `"Reading Time: Shortest"` | 3-min articles first |
| 9 | Navigate to page 2, then apply filter | Page resets to 1 |
| 10 | Search `"zzzzz"` | `"No articles found."` |
