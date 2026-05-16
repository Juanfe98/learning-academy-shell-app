import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { ArticleTable, InterviewPlaybook, InterviewChallenge } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const bffDiagram = String.raw`flowchart TD
  WEB["Web Client\nReact / Next.js"]
  MOBILE["Mobile Client\nSwift / Kotlin"]
  TV["TV Client\nApple TV / Fire TV"]

  WEB -->|"single request"| BFFWEB["BFF — Web\nAggregates: user + content + recs\nNext.js API Route / Node.js"]
  MOBILE -->|"single request"| BFFMOBILE["BFF — Mobile\nOptimized payload for mobile bandwidth\nNode.js service"]
  TV -->|"single request"| BFFTV["BFF — TV\nHeavy media metadata, minimal UI data\nNode.js service"]

  BFFWEB --> AUTH["Auth Service"]
  BFFWEB --> CONTENT["Content Service"]
  BFFWEB --> RECS["Recommendations Service"]
  BFFMOBILE --> AUTH
  BFFMOBILE --> CONTENT
  BFFTV --> CONTENT`;

const apiVersioningDiagram = String.raw`flowchart LR
  CLIENT["Clients\n(Web, Mobile, TV)"]
  GW["API Gateway\nRoute versioning\nAuth, rate limit, logging"]
  V1["v1 Service\n(legacy — maintained)"]
  V2["v2 Service\n(current — new features)"]
  V3["v3 Service\n(in development)"]
  CLIENT -->|"/api/v1/*"| GW
  CLIENT -->|"/api/v2/*"| GW
  GW --> V1
  GW --> V2
  GW -.->|"canary 5%"| V3`;

export const toc: TocItem[] = [
  { id: "api-design-principles", title: "API Design Principles", level: 2 },
  { id: "rest-maturity", title: "REST Maturity Model", level: 3 },
  { id: "error-standards", title: "Error Response Standards", level: 3 },
  { id: "graphql-design", title: "GraphQL Schema Design", level: 2 },
  { id: "schema-first", title: "Schema-First vs Code-First", level: 3 },
  { id: "pagination-patterns", title: "Pagination Patterns", level: 3 },
  { id: "bff-pattern", title: "Backend for Frontend (BFF) Pattern", level: 2 },
  { id: "api-versioning", title: "API Versioning Strategies", level: 2 },
  { id: "contract-testing", title: "Contract Testing with Pact", level: 2 },
  { id: "collaboration-process", title: "Cross-Team API Collaboration", level: 2 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "challenge", title: "API Design Challenge", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function ApiDesignAndCollaboration() {
  return (
    <div className="article-content">
      <p>
        The Disney JD explicitly requires a &quot;proven track record in defining and implementing
        API specifications while collaborating with service teams.&quot; This is a staff-level
        competency that combines technical API design skills with cross-team communication
        process. This module covers REST and GraphQL design, the BFF pattern, versioning
        strategy, contract testing, and the collaboration workflows that make it all work.
      </p>

      <h2 id="api-design-principles">API Design Principles</h2>
      <p>
        Good APIs are designed for the consumer, not the database schema. The most common
        mistake is exposing your internal data model directly — this creates tight coupling
        between the consumer and your implementation details, making future changes painful.
      </p>

      <h3 id="rest-maturity">REST Maturity Model</h3>
      <p>
        Leonard Richardson&apos;s maturity model describes four levels of REST API design.
        Level 3 (Hypermedia) is the theoretical ideal; most production APIs target Level 2.
        Know these levels to frame API design discussions authoritatively.
      </p>

      <ArticleTable caption="Richardson REST Maturity Model — levels, characteristics, and real examples." minWidth={820}>
        <table>
          <thead>
            <tr>
              <th>Level</th>
              <th>Name</th>
              <th>Characteristics</th>
              <th>Example</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>0</td>
              <td>The Swamp of POX</td>
              <td>Single endpoint, all actions via POST body</td>
              <td><code>POST /api {"{ action: 'getContent' }"}</code></td>
            </tr>
            <tr>
              <td>1</td>
              <td>Resources</td>
              <td>Multiple endpoints per resource, still only POST</td>
              <td><code>POST /content/123</code>, <code>POST /users/456</code></td>
            </tr>
            <tr>
              <td>2</td>
              <td>HTTP Verbs</td>
              <td>Correct HTTP methods + status codes. Industry standard.</td>
              <td><code>GET /content/123</code>, <code>PATCH /content/123</code></td>
            </tr>
            <tr>
              <td>3</td>
              <td>Hypermedia (HATEOAS)</td>
              <td>Responses include links to related actions — self-documenting</td>
              <td>Response includes <code>_links: {"{ play: '/content/123/play' }"}</code></td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <pre><code>{`// Level 2 REST — correct verbs, nouns for resources, status codes
// Disney Content API example

// GET: read a resource
GET /api/v2/content/:id
→ 200 OK: { id, title, type, rating, ... }
→ 404 Not Found: { error: "Content not found", code: "CONTENT_NOT_FOUND" }

// POST: create a resource
POST /api/v2/watchlist
Body: { contentId: "mov-123" }
→ 201 Created: { id: "wl-456", contentId: "mov-123", addedAt: "..." }
→ 409 Conflict: { error: "Already in watchlist", code: "DUPLICATE" }

// PATCH: partial update (preferred over PUT for partial updates)
PATCH /api/v2/content/:id
Body: { title: "New Title" }   // only changed fields
→ 200 OK: { ...updatedContent }

// DELETE: remove resource
DELETE /api/v2/watchlist/:id
→ 204 No Content  // success, nothing to return
→ 404 Not Found

// Resource naming rules:
// ✓ Plural nouns: /content, /users, /watchlist
// ✗ Verbs: /getContent, /createUser, /deleteItem
// ✓ Nested for owned resources: /users/:id/watchlist
// ✗ Deeply nested (>2 levels): /users/:id/content/:cid/reviews/:rid`}</code></pre>

      <h3 id="error-standards">Error Response Standards</h3>
      <p>
        Consistent error responses are a first-class API design concern. Consumers should
        never need to inspect the HTTP body structure to understand what went wrong — error
        shape must be predictable. RFC 7807 (Problem Details) is the modern standard.
      </p>
      <pre><code>{`// RFC 7807 Problem Details — standard error schema
interface ProblemDetail {
  type: string;      // URI identifying the error type
  title: string;     // human-readable summary
  status: number;    // HTTP status code
  detail: string;    // specific error context for this request
  instance?: string; // URI identifying this specific occurrence
  // domain-specific extensions:
  code: string;      // machine-readable error code for client logic
  traceId: string;   // for correlating with server logs
}

// Example: validation error on content create
{
  "type": "https://api.disney.com/errors/validation",
  "title": "Validation Error",
  "status": 422,
  "detail": "The 'rating' field must be between 0 and 10.",
  "code": "VALIDATION_FAILED",
  "traceId": "trace-abc-123",
  "violations": [
    { "field": "rating", "message": "Must be between 0 and 10", "value": 15 }
  ]
}

// TypeScript: typed error client
async function apiRequest<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  if (!res.ok) {
    const problem: ProblemDetail = await res.json();
    throw new ApiError(problem);
  }
  return res.json() as Promise<T>;
}`}</code></pre>

      <h2 id="graphql-design">GraphQL Schema Design</h2>

      <h3 id="schema-first">Schema-First vs Code-First</h3>
      <p>
        Schema-first (SDL) defines the GraphQL schema in <code>.graphql</code> files, then
        implements resolvers to match. Code-first generates the schema from code annotations
        (Pothos, TypeGraphQL). For cross-team collaboration, <strong>schema-first wins</strong>
        — the SDL is the contract document that both frontend and backend teams agree on before
        any implementation begins.
      </p>
      <pre><code>{`# schema-first SDL — agreed before any implementation
# This document is the contract between frontend and backend teams

type Content {
  id: ID!
  title: String!
  type: ContentType!
  rating: Float!
  thumbnailUrl: String!
  # Resolver fetches episodes lazily — only when requested
  episodes: [Episode!]
  # Computed field — resolver aggregates episode count
  episodeCount: Int
}

enum ContentType {
  MOVIE
  SERIES
  SHORT
}

type Query {
  content(id: ID!): Content
  # Cursor-based pagination — scalable, consistent ordering
  contentFeed(first: Int!, after: String, genre: String): ContentConnection!
  searchContent(query: String!, first: Int!): ContentConnection!
}

type ContentConnection {
  edges: [ContentEdge!]!
  pageInfo: PageInfo!
}

type ContentEdge {
  node: Content!
  cursor: String!
}

type PageInfo {
  hasNextPage: Boolean!
  endCursor: String
}`}</code></pre>

      <h3 id="pagination-patterns">Pagination Patterns</h3>
      <p>
        Offset pagination (<code>page=2&limit=20</code>) is simple but breaks with concurrent
        writes — items shift as new content is added. <strong>Cursor-based pagination</strong>
        uses an opaque cursor pointing to the last item seen, making it stable under concurrent
        mutation. Use cursor pagination for feeds and content libraries.
      </p>

      <ArticleTable caption="Pagination strategies compared for Disney content feeds." minWidth={800}>
        <table>
          <thead>
            <tr>
              <th>Strategy</th>
              <th>How it works</th>
              <th>Pros</th>
              <th>Cons</th>
              <th>Use for</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Offset</td>
              <td><code>?page=2&limit=20</code></td>
              <td>Simple, supports jump-to-page</td>
              <td>Skips/duplicates on concurrent writes, slow at high offsets</td>
              <td>Admin tables with static data</td>
            </tr>
            <tr>
              <td>Cursor (relay spec)</td>
              <td><code>after: "cursor-xyz"</code></td>
              <td>Stable under concurrent writes, consistent ordering</td>
              <td>No jump-to-page, cursor must be opaque</td>
              <td>Content feeds, infinite scroll, search results</td>
            </tr>
            <tr>
              <td>Keyset</td>
              <td><code>after_id=123</code> using indexed column</td>
              <td>Fastest at DB level — uses index seeks, not full scans</td>
              <td>Limited to single sort field, complex multi-field sorts</td>
              <td>High-throughput data streams, activity feeds</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="bff-pattern">Backend for Frontend (BFF) Pattern</h2>
      <p>
        A BFF is a server-side aggregation layer owned by the frontend team. It calls multiple
        downstream services, combines the responses, and returns exactly what the UI needs —
        nothing more, nothing less. This eliminates over-fetching, reduces round trips, and
        gives the frontend team control over their API surface.
      </p>

      <MermaidDiagram
        chart={bffDiagram}
        title="Disney BFF Architecture — One Aggregation Layer Per Platform"
        caption="Each client platform gets a dedicated BFF optimized for its bandwidth and interaction model. The web BFF aggregates user profile + content + recommendations in one request."
        minHeight={440}
      />

      <pre><code>{`// Next.js API Route as BFF — aggregates three services into one response
// /api/homepage — called once by the web client
export async function GET(req: Request) {
  const userId = getUserIdFromCookie(req);

  // Parallel fetch — all three run simultaneously, not sequentially
  const [user, featured, recommendations] = await Promise.all([
    fetchUserProfile(userId),
    fetchFeaturedContent(),
    fetchRecommendations(userId),
  ]);

  // Shape the response for THIS client's exact needs
  // Mobile BFF would return a different, smaller shape
  return Response.json({
    user: {
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      subscriptionTier: user.subscription.tier,
    },
    hero: featured.hero,
    contentRows: [
      { title: "Continue Watching", items: user.continueWatching },
      { title: "Recommended for You", items: recommendations.items },
      { title: "New on Disney+", items: featured.newReleases },
    ],
  });
}

// Why not call these three APIs from the browser?
// 1. Three round trips vs one
// 2. API keys stay server-side
// 3. Response shaped for THIS client — mobile BFF returns different payload
// 4. Error handling centralized — BFF can return fallback if recommendations fails`}</code></pre>

      <h2 id="api-versioning">API Versioning Strategies</h2>

      <MermaidDiagram
        chart={apiVersioningDiagram}
        title="API Versioning with API Gateway and Canary Traffic"
        caption="The API Gateway routes traffic by version prefix. v3 receives 5% canary traffic while v2 handles 95%. This enables safe gradual rollouts of breaking API changes."
        minHeight={280}
      />

      <pre><code>{`// URL versioning — most explicit, easiest to route at gateway level
// /api/v1/* → v1 service
// /api/v2/* → v2 service
// Breaking change: add /api/v2 endpoint, deprecate /api/v1 on a timeline

// Header versioning — cleaner URLs but harder to test in browser
Accept: application/vnd.disney.api+json;version=2

// Field-level evolution (preferred for GraphQL): add, never remove
# v1: limited fields
type Content {
  id: ID!
  title: String!
}

# v2: add optional fields — v1 clients unaffected
type Content {
  id: ID!
  title: String!
  rating: Float            # new optional field — v1 clients ignore it
  thumbnailUrl: String     # new optional field
  @deprecated(reason: "Use posterUrl") posterImage: String  # renamed, old kept
  posterUrl: String        # new name
}

// Deprecation timeline in REST:
// 1. Add new endpoint or field alongside old one
// 2. Add Deprecation header to old endpoint responses
// 3. Announce sunset date (Sunset header)
// 4. After 6+ months with no usage: remove`}</code></pre>

      <h2 id="contract-testing">Contract Testing with Pact</h2>
      <p>
        Contract testing verifies that a consumer (frontend) and provider (backend) agree on
        the API shape — without requiring both to be running simultaneously. The consumer
        defines what it needs; the provider verifies it can satisfy that definition.
        This is the gold standard for cross-team API validation.
      </p>
      <pre><code>{`// Pact: consumer-driven contract testing

// 1. Consumer (frontend team) defines what it expects from the API
// pact.spec.ts
const { PactV3 } = require("@pact-foundation/pact");

const provider = new PactV3({
  consumer: "disney-web-frontend",
  provider: "content-service",
});

describe("Content API contract", () => {
  it("returns content by ID", async () => {
    await provider
      .given("content mov-123 exists")
      .uponReceiving("a request for content mov-123")
      .withRequest({ method: "GET", path: "/api/v2/content/mov-123" })
      .willRespondWith({
        status: 200,
        body: {
          id: "mov-123",
          title: Matchers.string("Encanto"),     // any string, not exact value
          type: Matchers.string("MOVIE"),
          rating: Matchers.decimal(8.5),         // any decimal
        },
      })
      .executeTest(async (mockServer) => {
        const result = await fetchContent("mov-123", mockServer.url);
        expect(result.id).toBe("mov-123");
      });
  });
});

// 2. Contract file published to Pact Broker
// 3. Provider (backend team) verifies against the broker in their CI pipeline
// 4. Both teams get notified on contract breach — before merging`}</code></pre>

      <h2 id="collaboration-process">Cross-Team API Collaboration</h2>
      <p>
        At Disney, frontend teams collaborate with multiple backend service teams. The most
        common failure mode: frontend team discovers the API shape does not match their needs
        after the backend is already built. The fix is a process, not a technology.
      </p>
      <pre><code>{`// The Staff Engineer API Collaboration Process:

// Step 1: Consumer-first design (API Design Doc)
// Frontend team writes an API design doc BEFORE implementation starts:
// - What data does the UI need?
// - What shape minimizes client-side transformation?
// - What pagination strategy fits the UX?

// Step 2: Schema agreement meeting
// Frontend + Backend leads review the proposed API schema together.
// Sign-off before any code is written.

// Step 3: Mock server (Prism / MSW)
// Frontend team generates a mock server from the agreed schema.
// Frontend development proceeds in parallel with backend implementation.

// Using msw for local development against agreed OpenAPI spec:
import { rest } from "msw";
import { setupServer } from "msw/node";
import contentApiSpec from "./openapi/content-api.json";

const server = setupServer(
  rest.get("/api/v2/content/:id", (req, res, ctx) => {
    return res(ctx.json(generateMockContent(req.params.id as string)));
  })
);

// Step 4: Contract tests verify integration before deployment
// See Pact section above

// Step 5: API changelog for breaking changes
// Semver: PATCH for bug fixes, MINOR for new optional fields, MAJOR for breaking`}</code></pre>

      <h2 id="interview-framing">Interview Framing</h2>

      <InterviewPlaybook
        title="How to answer: 'Walk me through how you collaborated with a backend team to define an API.'"
        intro="Disney explicitly evaluates API collaboration. This is a behavioral + technical hybrid question. Use a real story but make the process explicit."
        steps={[
          "Start with the problem framing: 'When I own a UI feature that depends on a new API, my first step is writing the consumer specification — what data do I need, in what shape, with what constraints — before the backend team writes a single line.'",
          "Explain the schema agreement: 'I schedule a design review with the backend lead and a product manager. We agree on the schema, the error cases, and the versioning strategy. Nothing gets built until we sign off on the spec document.'",
          "Name the parallel development: 'After sign-off, I set up a mock server using the agreed OpenAPI spec so my team can develop the UI while the backend is being built. We don\\'t block on each other.'",
          "Close with verification: 'I use Pact contract tests so both teams get alerted in CI if the backend changes break the consumer expectations. No more \\'the API changed and nobody told us\\' surprises.'",
        ]}
      />

      <InterviewChallenge
        title="API Design Challenge: Disney Content Search API"
        scenario={
          <>
            Disney needs a new content search API to support the web, mobile, and TV clients.
            Each client has different bandwidth constraints and display needs. Web shows rich
            metadata with thumbnails; mobile needs compact results; TV needs high-res artwork.
            You are leading the API design discussion with three backend engineers.
          </>
        }
        tasks={[
          "Define the REST endpoint design: URL structure, query parameters, response shape for a search request.",
          "Should this be REST or GraphQL? Argue both sides, then make a recommendation with justification.",
          "How do you handle the different payload needs of web vs mobile vs TV clients? (BFF? GraphQL fields? API parameters?)",
          "Design the error response for: no results found, query too short, rate limit exceeded, service unavailable.",
          "How would you version this API when a breaking change is required 6 months from now?",
        ]}
      />

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li><strong>Design APIs for the consumer, not the database</strong> — exposing your data model directly creates tight coupling that makes future changes painful.</li>
        <li><strong>Schema-first GraphQL</strong> is the best cross-team collaboration tool — the SDL is a contract document both teams sign before implementation begins.</li>
        <li><strong>BFF pattern</strong> gives frontend teams control over their API surface — aggregating multiple services server-side eliminates over-fetching and multiple round trips.</li>
        <li><strong>Cursor-based pagination</strong> is the correct choice for content feeds — stable under concurrent writes, consistent ordering, scales to large datasets.</li>
        <li><strong>Contract testing with Pact</strong> catches API breaking changes before they reach production — much cheaper than debugging cross-service issues post-deploy.</li>
        <li>The staff-level collaboration process: consumer spec first → schema agreement → mock server → parallel development → contract tests. Never build the UI after waiting for the backend.</li>
      </ul>
    </div>
  );
}
