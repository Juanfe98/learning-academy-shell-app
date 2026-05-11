import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { ArticleTable, InterviewPlaybook, InterviewChallenge } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const apolloDataFlowDiagram = String.raw`flowchart TD
    SC["Server Component\n(ArticlePage)"]
    CC["Client Component\n(RelatedArticles)"]
    PF["Plain fetch to\nGraphQL endpoint"]
    AC["Apollo Client\nuseQuery / useSuspenseQuery"]
    IC["InMemoryCache\nnormalized by uid"]
    CDN["Contentstack\nGraphQL API"]

    SC -->|"no Apollo needed"| PF
    PF -->|"fetch + next cache"| CDN
    CC --> AC
    AC -->|"cache hit?"| IC
    IC -->|"cache miss"| CDN
    CDN --> IC
    IC --> AC`;

const fragmentDiagram = String.raw`flowchart TD
    ROOT["ArticlePageQuery\n(root query)"]
    AF["ArticleFields fragment\n(used by ArticleHeader)"]
    AUTH["AuthorFields fragment\n(used by AuthorCard)"]
    CAT["CategoryFields fragment\n(used by CategoryBadge)"]
    REL["RelatedArticleFields fragment\n(used by RelatedArticles)"]

    ROOT -->|"composes"| AF
    ROOT -->|"composes"| AUTH
    ROOT -->|"composes"| CAT
    ROOT -->|"composes"| REL

    AF -. "defined next to".- AH["ArticleHeader component"]
    AUTH -. "defined next to".- AC["AuthorCard component"]
    CAT -. "defined next to".- CB["CategoryBadge component"]
    REL -. "defined next to".- RA["RelatedArticles component"]`;

export const toc: TocItem[] = [
  { id: "contentstack-graphql", title: "Contentstack GraphQL API", level: 2 },
  { id: "apollo-setup", title: "Apollo Client Setup in Next.js App Router", level: 2 },
  { id: "apollo-hooks", title: "Apollo Hooks: useQuery, useLazyQuery, useSuspenseQuery", level: 2 },
  { id: "fragment-colocation", title: "Fragment Colocation Pattern", level: 2 },
  { id: "contentstack-patterns", title: "Contentstack-Specific GraphQL Patterns", level: 2 },
  { id: "pagination", title: "Pagination with Skip and Limit", level: 3 },
  { id: "cache-normalization", title: "Apollo Cache Normalization", level: 3 },
  { id: "server-vs-client", title: "Server Component GraphQL vs Apollo Client", level: 2 },
  { id: "error-handling", title: "Error Handling in GraphQL", level: 2 },
  { id: "interview-playbook", title: "Interview Playbook", level: 2 },
  { id: "interview-challenge", title: "Interview Challenge", level: 2 },
];

export default function GraphqlForCms() {
  return (
    <div className="article-content">
      <p>
        Contentstack auto-generates a typed GraphQL API from your content types. This means every
        field you define in a content model is immediately queryable with full type information.
        In a Next.js App Router application, GraphQL can be consumed two ways: plain fetch in Server
        Components (zero bundle cost) and Apollo Client in Client Components (caching + reactivity).
        This module covers both patterns and when to use each.
      </p>

      <h2 id="contentstack-graphql">Contentstack GraphQL API</h2>
      <p>
        The GraphQL endpoint follows this pattern:
        <code> https://graphql.contentstack.com/stacks/{"{"}{"{"}API_KEY{"}"}{"}"}/graphql</code>
        with your API key and access token in headers. The schema is automatically derived from your
        content type definitions — field types map to GraphQL scalars and types predictably.
      </p>

      <pre>
        <code>{`# Contentstack auto-generates this schema from your "article" content type:
# Query all articles with filtering and sorting
query GetArticles($locale: String!, $limit: Int!, $skip: Int!) {
  all_article(
    locale: $locale
    limit: $limit
    skip: $skip
    order_by: { published_date: desc }
    where: { category: { url: { eq: "/help/billing" } } }
  ) {
    total
    items {
      title
      url
      summary
      published_date
      author {
        name
        avatar {
          url
        }
      }
      category {
        title
        url
      }
    }
  }
}

# Contentstack naming convention:
# - Single entry query: article (singular)
# - All entries query: all_article (plural with all_ prefix)
# - References become nested objects
# - Assets become objects with url, filename, content_type, dimension fields
# - Modular blocks become union types: ArticleLayoutBlocksHero | ArticleLayoutBlocksCtaBanner`}</code>
      </pre>

      <h2 id="apollo-setup">Apollo Client Setup in Next.js App Router</h2>
      <p>
        Apollo Client requires a client-side React context, which is incompatible with React Server
        Components. The solution is an ApolloWrapper client component that provides the Apollo
        context to the subtree:
      </p>

      <pre>
        <code>{`// src/lib/apollo-client.ts — server-side plain fetch client (no bundle cost)
// Use this for Server Component GraphQL queries

export async function fetchGraphQL<T>(
  query: string,
  variables?: Record<string, unknown>
): Promise<T> {
  const response = await fetch(
    \`https://graphql.contentstack.com/stacks/\${process.env.CONTENTSTACK_API_KEY}/graphql\`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        access_token: process.env.CONTENTSTACK_DELIVERY_TOKEN!,
        environment: process.env.CONTENTSTACK_ENVIRONMENT!,
      },
      body: JSON.stringify({ query, variables }),
      // Next.js cache integration
      next: { revalidate: 3600, tags: ["graphql"] },
    }
  );

  if (!response.ok) {
    throw new Error(\`GraphQL request failed: \${response.status}\`);
  }

  const { data, errors } = await response.json();
  if (errors?.length) {
    throw new Error(\`GraphQL errors: \${errors.map((e: {message: string}) => e.message).join(", ")}\`);
  }

  return data as T;
}

// src/lib/apollo-wrapper.tsx — "use client" wrapper for Apollo context
"use client";

import { ApolloClient, InMemoryCache, ApolloProvider, createHttpLink } from "@apollo/client";
import { setContext } from "@apollo/client/link/context";
import { useMemo } from "react";

function makeClient() {
  const httpLink = createHttpLink({
    uri: \`https://graphql.contentstack.com/stacks/\${process.env.NEXT_PUBLIC_CS_API_KEY}/graphql\`,
  });

  // Note: NEXT_PUBLIC_ prefix required for client-accessible env vars
  // Delivery token is read-only and safe to expose in NEXT_PUBLIC_ (unlike management tokens)
  const authLink = setContext((_, { headers }) => ({
    headers: {
      ...headers,
      access_token: process.env.NEXT_PUBLIC_CS_DELIVERY_TOKEN,
      environment: process.env.NEXT_PUBLIC_CS_ENVIRONMENT,
    },
  }));

  return new ApolloClient({
    link: authLink.concat(httpLink),
    cache: new InMemoryCache({
      typePolicies: {
        Article: {
          keyFields: ["uid"], // Contentstack's unique identifier field
        },
        Category: {
          keyFields: ["uid"],
        },
        Author: {
          keyFields: ["uid"],
        },
      },
    }),
  });
}

export function ApolloWrapper({ children }: { children: React.ReactNode }) {
  const client = useMemo(makeClient, []);
  return <ApolloProvider client={client}>{children}</ApolloProvider>;
}`}</code>
      </pre>

      <h2 id="apollo-hooks">Apollo Hooks: useQuery, useLazyQuery, useSuspenseQuery</h2>

      <ArticleTable caption="Choose the right Apollo hook based on when and how you need to trigger the query." minWidth={900}>
        <table>
          <thead>
            <tr>
              <th>Hook</th>
              <th>Trigger</th>
              <th>Loading State</th>
              <th>Suspense</th>
              <th>Use Case</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>useQuery</code></td>
              <td>Immediately on render</td>
              <td><code>loading</code> boolean in result</td>
              <td>No — component renders with loading=true</td>
              <td>Data required at render time; component owns its loading skeleton</td>
            </tr>
            <tr>
              <td><code>useLazyQuery</code></td>
              <td>Manually — returns an execute function</td>
              <td><code>loading</code> boolean after execution</td>
              <td>No</td>
              <td>User-triggered queries: search on input, load more on scroll</td>
            </tr>
            <tr>
              <td><code>useSuspenseQuery</code></td>
              <td>Immediately on render</td>
              <td>Suspends — nearest Suspense boundary shows fallback</td>
              <td>Yes — integrates with React Suspense</td>
              <td>Preferred in React 19 — parent controls loading UI with Suspense</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <pre>
        <code>{`// useQuery: component owns its loading state
import { useQuery, gql } from "@apollo/client";

const RELATED_ARTICLES = gql\`
  query GetRelatedArticles($uids: [String!]!) {
    all_article(where: { uid: { in: $uids } }) {
      items {
        ...RelatedArticleFields
      }
    }
  }
  \${RELATED_ARTICLE_FRAGMENT}
\`;

function RelatedArticles({ articleUids }: { articleUids: string[] }) {
  const { data, loading, error } = useQuery(RELATED_ARTICLES, {
    variables: { uids: articleUids },
    skip: articleUids.length === 0, // don't fire if no related articles
  });

  if (loading) return <RelatedArticlesSkeleton />;
  if (error) return null; // graceful degradation — related articles are not critical
  return <RelatedArticlesList articles={data?.all_article?.items ?? []} />;
}

// useLazyQuery: trigger on user input (Help Center search)
function HelpSearch() {
  const [search, { data, loading }] = useLazyQuery(SEARCH_ARTICLES);
  const [query, setQuery] = useState("");

  const handleSearch = (value: string) => {
    setQuery(value);
    if (value.length > 2) {
      search({ variables: { query: value } });
    }
  };

  return (
    <div>
      <input value={query} onChange={(e) => handleSearch(e.target.value)} />
      {loading && <Spinner />}
      {data && <SearchResults results={data.search_articles.items} />}
    </div>
  );
}

// useSuspenseQuery: React 19 preferred pattern
function ArticleWithSuspense({ uid }: { uid: string }) {
  const { data } = useSuspenseQuery(GET_ARTICLE, { variables: { uid } });
  // No loading check needed — Suspense boundary handles it
  return <ArticleContent article={data.article} />;
}

// Parent:
<Suspense fallback={<ArticleSkeleton />}>
  <ArticleWithSuspense uid={articleUid} />
</Suspense>`}</code>
      </pre>

      <h2 id="fragment-colocation">Fragment Colocation Pattern</h2>
      <MermaidDiagram
        chart={fragmentDiagram}
        title="Fragment Colocation — Each Component Owns Its Data Requirements"
        caption="The root query composes fragments. Each component defines the fields it needs. If a component's data requirements change, only its fragment changes — not the root query."
        minHeight={460}
      />

      <pre>
        <code>{`// Fragment colocation: define fragments next to the component that uses the data

// src/components/AuthorCard.tsx
import { gql } from "@apollo/client";

// This fragment lives next to the component that uses it
export const AUTHOR_CARD_FRAGMENT = gql\`
  fragment AuthorCardFields on Author {
    uid
    name
    bio
    avatar {
      url
      dimension {
        width
        height
      }
    }
  }
\`;

function AuthorCard({ author }: { author: AuthorCardFields }) {
  return (
    <div>
      <img src={author.avatar?.url} alt={author.name} />
      <strong>{author.name}</strong>
      <p>{author.bio}</p>
    </div>
  );
}

// src/components/CategoryBadge.tsx
export const CATEGORY_BADGE_FRAGMENT = gql\`
  fragment CategoryBadgeFields on Category {
    uid
    title
    url
  }
\`;

// src/app/help/[category]/[slug]/page-client.tsx — root query composes all fragments
import { AUTHOR_CARD_FRAGMENT } from "@/components/AuthorCard";
import { CATEGORY_BADGE_FRAGMENT } from "@/components/CategoryBadge";
import { RELATED_ARTICLE_FRAGMENT } from "@/components/RelatedArticles";

const GET_ARTICLE = gql\`
  query GetArticle($url: String!) {
    all_article(where: { url: { eq: $url } }) {
      items {
        uid
        title
        body  # JSON Rich Text field
        published_date
        author {
          ...AuthorCardFields
        }
        category {
          ...CategoryBadgeFields
        }
        related_articlesConnection(limit: 3) {
          items {
            ...RelatedArticleFields
          }
        }
      }
    }
  }
  \${AUTHOR_CARD_FRAGMENT}
  \${CATEGORY_BADGE_FRAGMENT}
  \${RELATED_ARTICLE_FRAGMENT}
\`;`}</code>
      </pre>

      <h2 id="contentstack-patterns">Contentstack-Specific GraphQL Patterns</h2>

      <pre>
        <code>{`# Querying Modular Blocks (union types) — each block type is a separate type
query GetArticleWithBlocks($url: String!) {
  all_article(where: { url: { eq: $url } }) {
    items {
      title
      layout_blocks {
        ... on ArticleLayoutBlocksHeroSection {
          hero_section {
            headline
            background_image {
              url
            }
          }
        }
        ... on ArticleLayoutBlocksCtaBanner {
          cta_banner {
            text
            button_label
            button_url
          }
        }
        ... on ArticleLayoutBlocksFaqSection {
          faq_section {
            questions {
              question
              answer
            }
          }
        }
      }
    }
  }
}

# Querying the JSON Rich Text field — returns a nested JSON object, not a string
# You get the full document tree; render it with a custom renderer, not dangerouslySetInnerHTML
query GetArticleBody($url: String!) {
  all_article(where: { url: { eq: $url } }) {
    items {
      body  # returns a JSON object: { type: "doc", children: [...] }
    }
  }
}`}</code>
      </pre>

      <h3 id="pagination">Pagination with Skip and Limit</h3>

      <pre>
        <code>{`// Contentstack GraphQL pagination uses skip + limit (not cursor-based)
const PAGINATED_ARTICLES = gql\`
  query GetArticles($categoryUrl: String!, $limit: Int!, $skip: Int!) {
    all_article(
      where: { category: { url: { eq: $categoryUrl } } }
      limit: $limit
      skip: $skip
      order_by: { published_date: desc }
    ) {
      total  # always fetch total to calculate page count
      items {
        ...ArticleCardFields
      }
    }
  }
  \${ARTICLE_CARD_FRAGMENT}
\`;

// In the component:
const PAGE_SIZE = 20;
const [page, setPage] = useState(0);

const { data } = useQuery(PAGINATED_ARTICLES, {
  variables: {
    categoryUrl: "/help/billing",
    limit: PAGE_SIZE,
    skip: page * PAGE_SIZE,
  },
});

const totalPages = Math.ceil((data?.all_article?.total ?? 0) / PAGE_SIZE);`}</code>
      </pre>

      <h3 id="cache-normalization">Apollo Cache Normalization</h3>
      <p>
        Apollo's <code>InMemoryCache</code> normalizes objects by type and key field. For Contentstack,
        the unique identifier is <code>uid</code>. Without correct configuration, the same article
        fetched by two different queries will be stored as two separate cache entries, causing
        inconsistencies when one is updated.
      </p>

      <pre>
        <code>{`// Correct InMemoryCache configuration for Contentstack
const cache = new InMemoryCache({
  typePolicies: {
    Article: { keyFields: ["uid"] },
    Category: { keyFields: ["uid"] },
    Author: { keyFields: ["uid"] },
    // Asset references use a different identifier
    SysAsset: { keyFields: ["uid"] },
  },
});

// With this config, if two queries fetch the same article by uid,
// Apollo merges them into one cache entry — no duplicate rendering.
// This is critical for Related Articles — they reference the same Article entries
// that may already be in cache from a listing page query.`}</code>
      </pre>

      <h2 id="server-vs-client">Server Component GraphQL vs Apollo Client</h2>
      <MermaidDiagram
        chart={apolloDataFlowDiagram}
        title="GraphQL Data Flow in Next.js App Router"
        caption="Server Components use plain fetch — no Apollo needed, full Next.js cache control. Client Components use Apollo for caching, reactivity, and optimistic updates."
        minHeight={420}
      />

      <ArticleTable caption="The right GraphQL strategy depends on where the component renders and whether it needs reactivity." minWidth={860}>
        <table>
          <thead>
            <tr>
              <th>Approach</th>
              <th>Where It Runs</th>
              <th>Caching</th>
              <th>Bundle Impact</th>
              <th>Reactivity</th>
              <th>Use When</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Plain fetch (Server)</strong></td>
              <td>Server Component only</td>
              <td>Next.js full-route cache, fetch cache, revalidate tags</td>
              <td>Zero — runs only on server</td>
              <td>None — static after render</td>
              <td>Article content, listing pages, SEO-critical data</td>
            </tr>
            <tr>
              <td><strong>Apollo useQuery (Client)</strong></td>
              <td>Client Component</td>
              <td>Apollo InMemoryCache (in-memory, cleared on page reload)</td>
              <td>~45KB for Apollo Client</td>
              <td>Full — polling, subscriptions, cache updates</td>
              <td>Search results, user-triggered queries, real-time data</td>
            </tr>
            <tr>
              <td><strong>Apollo useSuspenseQuery (Client)</strong></td>
              <td>Client Component</td>
              <td>Apollo InMemoryCache</td>
              <td>~45KB for Apollo Client</td>
              <td>Full — integrates with React Suspense</td>
              <td>React 19 preferred pattern; parent controls loading boundary</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="error-handling">Error Handling in GraphQL</h2>

      <pre>
        <code>{`// GraphQL errors vs network errors — they are different

// Network error: HTTP non-200 response
// Apollo surfaces this in error.networkError

// GraphQL error: HTTP 200 but errors array in response body
// Apollo surfaces this in error.graphQLErrors

function ArticleComponent({ url }: { url: string }) {
  const { data, loading, error } = useQuery(GET_ARTICLE, { variables: { url } });

  if (error?.networkError) {
    // Contentstack API is down or unreachable
    return <ErrorMessage message="Unable to load article — please try again" />;
  }

  if (error?.graphQLErrors?.length) {
    // Query had errors — likely a schema mismatch or invalid variable
    // Log to Sentry for debugging
    console.error("GraphQL errors:", error.graphQLErrors);
    return <ErrorMessage message="Content unavailable" />;
  }

  const article = data?.all_article?.items?.[0];
  if (!article) {
    // Successful query but no results — article was unpublished or slug is wrong
    return <NotFound />;
  }

  return <ArticleContent article={article} />;
}

// Server-side error handling in plain fetch:
async function getArticleServer(url: string) {
  try {
    const data = await fetchGraphQL<ArticleQueryResult>(GET_ARTICLE_QUERY, { url });
    return data.all_article?.items?.[0] ?? null;
  } catch (error) {
    // Re-throw for Next.js error boundary to handle, or return null for graceful degradation
    console.error("GraphQL fetch error:", error);
    return null; // article page will call notFound()
  }
}`}</code>
      </pre>

      <h2 id="interview-playbook">Interview Playbook</h2>
      <InterviewPlaybook
        title="How to answer: 'How do you use GraphQL in a Next.js App Router application?'"
        intro="This question has a trap: developers familiar only with Create React App assume Apollo Client goes at the root layout and every component uses useQuery. In Next.js App Router, that answer is wrong. Lead with the Server vs Client distinction."
        steps={[
          "Start with the architecture decision: In App Router, Server Components and Client Components have different constraints. Server Components can be async functions that directly await data — no hooks, no Apollo Client needed. I use plain fetch to the GraphQL endpoint for all server-side queries because it has zero bundle cost and integrates with Next.js's fetch cache.",
          "Explain when Apollo Client IS appropriate: when a component needs reactivity — live search results updating as the user types, a real-time feedback counter, or user-triggered queries with useLazyQuery. Apollo Client goes in a 'use client' wrapper component that provides context to the subtree that needs it.",
          "Describe fragment colocation: instead of one massive query at the page level, each component defines a fragment for exactly the fields it needs. The page-level query composes those fragments. If a component's data needs change, only its fragment changes. This avoids over-fetching.",
          "Address cache normalization: Contentstack entries use uid as the unique identifier. Without configuring keyFields in InMemoryCache, the same article fetched by two different queries creates duplicate cache entries. With keyFields: ['uid'], Apollo merges them automatically.",
          "Close with the error distinction: GraphQL errors (HTTP 200, errors in body) and network errors (HTTP non-200) need separate handling. GraphQL errors often indicate schema mismatches worth logging to Sentry. Network errors are operational and warrant a user-visible retry UI.",
        ]}
      />

      <h2 id="interview-challenge">Interview Challenge</h2>
      <InterviewChallenge
        title="Article Page with Fragment-Colocated GraphQL Query"
        scenario={
          <span>
            You are building the article page for the Indeed Help Center. The page needs to display:
            the article title, the JSON rich text body, the author&apos;s name and avatar image,
            the category name and link, and three related articles (title + URL). The data comes
            from Contentstack&apos;s GraphQL API. The article content is rendered server-side for
            SEO, but the related articles section is a client component that could show different
            articles based on user browsing history.
          </span>
        }
        tasks={[
          "Write the GraphQL query for the server-side article fetch — use Contentstack naming conventions (all_article, nested references, proper field names)",
          "Define fragments for AuthorCard and CategoryBadge next to their respective components, then compose them in the root query",
          "Show how the Server Component fetches the article using plain fetch (not Apollo), and how it passes the data to child components",
          "Write the RelatedArticles client component using useQuery — show the fragment, query composition, loading state, and graceful error handling",
          "Configure InMemoryCache with the correct keyFields for Contentstack Article, Author, and Category types",
        ]}
        pitfalls={[
          "Using Apollo Client (useQuery) in the Server Component for the article body — adds 45KB to the bundle for static content that never changes after render",
          "Not using the NEXT_PUBLIC_ prefix for Apollo Client environment variables — client-side Apollo cannot read server-only env vars",
          "Querying for all fields in the root query instead of using fragments — creates a maintenance burden when individual component data needs change",
          "Missing keyFields configuration — the same Article entity stored under two different cache keys causes stale data bugs",
        ]}
        signal="A strong answer correctly splits the Server Component (plain fetch, zero bundle) from the Client Component (Apollo useQuery), demonstrates fragment colocation with proper gql template literal composition, and configures keyFields matching Contentstack's uid field."
      />
    </div>
  );
}
