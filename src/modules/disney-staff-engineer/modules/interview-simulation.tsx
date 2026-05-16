import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { InterviewPlaybook, InterviewChallenge, SolutionReveal } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const interviewFormatDiagram = String.raw`flowchart TD
  START["Disney Staff Engineer Interview\n~5-6 hours total"]
  START --> R1["Round 1 — Recruiter Screen\n30 min\nExperience + motivation"]
  R1 --> R2["Round 2 — Technical Screen\n60 min\nLive coding + system design intro"]
  R2 --> R3["Round 3 — Deep Dive Coding\n60 min\nReact architecture challenge"]
  R2 --> R4["Round 4 — System Design\n60 min\nDesign Disney-scale frontend"]
  R2 --> R5["Round 5 — Leadership & Cross-functional\n45 min\nADR decisions, mentoring, stakeholder alignment"]
  R2 --> R6["Round 6 — Behavioral\n45 min\nSTAR stories, Disney values"]
  R3 & R4 & R5 & R6 --> DECISION["Hiring Committee\nDecision"]`;

export const toc: TocItem[] = [
  { id: "interview-format", title: "Interview Format & What Disney Evaluates", level: 2 },
  { id: "round1-coding", title: "Round 1: Live Coding — React & TypeScript", level: 2 },
  { id: "q1-component-system", title: "Q1: CMS-Driven Component Registry", level: 3 },
  { id: "q2-generic-table", title: "Q2: Generic Type-Safe Data Table", level: 3 },
  { id: "q3-data-fetching", title: "Q3: Request Deduplication Layer", level: 3 },
  { id: "round2-architecture", title: "Round 2: Architecture Decisions", level: 2 },
  { id: "q4-state-migration", title: "Q4: State Management Migration", level: 3 },
  { id: "q5-micro-frontend", title: "Q5: Micro-Frontend Boundaries", level: 3 },
  { id: "round3-system-design", title: "Round 3: System Design Deep Dive", level: 2 },
  { id: "q6-espn-live", title: "Q6: ESPN Live Scoreboard at Scale", level: 3 },
  { id: "round4-leadership", title: "Round 4: Leadership & Cross-Team", level: 2 },
  { id: "q7-tech-debt", title: "Q7: Inheriting Technical Debt", level: 3 },
  { id: "q8-alignment", title: "Q8: Getting Alignment on Hard Decisions", level: 3 },
  { id: "round5-behavioral", title: "Round 5: Behavioral (STAR)", level: 2 },
  { id: "q9-arch-change", title: "Q9: Leading an Architectural Change", level: 3 },
  { id: "q10-conflict", title: "Q10: Technical Disagreement", level: 3 },
  { id: "q11-failure", title: "Q11: A Time You Failed", level: 3 },
  { id: "disney-values", title: "Disney Values Alignment", level: 2 },
  { id: "questions-to-ask", title: "Questions to Ask Your Interviewer", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function InterviewSimulation() {
  return (
    <div className="article-content">
      <p>
        This module simulates the Disney Staff Engineer interview from the interviewer&apos;s
        perspective. Each question is followed by what a <strong>weak answer</strong> sounds
        like, what a <strong>strong answer</strong> demonstrates, and the model response you
        should practice. Work through each one out loud — the ability to articulate under
        pressure is the skill being tested.
      </p>

      <h2 id="interview-format">Interview Format & What Disney Evaluates</h2>

      <MermaidDiagram
        chart={interviewFormatDiagram}
        title="Disney Staff Engineer Interview Pipeline"
        caption="Expect 5-6 rounds total. Each round is scored independently by the interviewer. The hiring committee aggregates all scores and discussion before making a decision."
        minHeight={380}
      />

      <p>
        Disney evaluates staff engineers on five dimensions. Know these so you can
        consciously demonstrate each one:
      </p>
      <pre><code>{`// Disney Staff Engineer Evaluation Rubric (inferred from JD + typical Big Tech rubric):

1. Technical Excellence
   - Correctness of code
   - Complexity analysis (time/space)
   - Edge case handling
   - TypeScript and React expertise at scale

2. Architectural Thinking
   - System design at 100M+ scale
   - Trade-off analysis (naming pros/cons explicitly)
   - Cross-team impact reasoning
   - Failure mode identification

3. Technical Leadership
   - How you build consensus
   - How you mentor senior engineers
   - ADR / RFC process knowledge
   - Code review philosophy

4. Collaboration & Communication
   - Clarity when explaining complex concepts
   - API design collaboration process
   - Stakeholder alignment
   - "disagree and commit" pattern

5. Disney Values Alignment
   - Creativity and innovation
   - Optimism and positivity
   - Guest focus (user empathy in UI decisions)
   - Inclusion (accessibility, i18n)
   - Decency — how you treat engineers in disagreement scenarios`}</code></pre>

      <h2 id="round1-coding">Round 1: Live Coding — React & TypeScript</h2>
      <p>
        Disney coding rounds use a shared editor (CoderPad or similar). You will be asked
        to implement something from scratch. The interviewer cares more about your thought
        process than the final answer — talk as you type.
      </p>

      <h3 id="q1-component-system">Q1: CMS-Driven Component Registry</h3>

      <InterviewChallenge
        title="[INTERVIEWER] Implement a CMS component registry system"
        scenario={
          <>
            <strong>Interviewer says:</strong> &quot;We have a CMS that returns page configurations
            as JSON. Each configuration is an ordered list of blocks, where each block has a
            type (like <code>hero_carousel</code>, <code>content_row</code>,
            <code>promo_banner</code>) and some data. Implement a system where marketing can
            configure page layouts that get rendered without code changes. You have 30 minutes.&quot;
          </>
        }
        tasks={[
          "Define the TypeScript types for the CMS block configuration.",
          "Implement a component registry that maps block types to React components.",
          "Build a PageRenderer that renders blocks in order from the configuration.",
          "Handle unknown block types gracefully (warn, do not crash).",
        ]}
      />

      <SolutionReveal>
        <pre><code>{`// Step 1: Define the types — talk through this with the interviewer
// "I'll start with the types since they define the contract."

type BlockType = "hero_carousel" | "content_row" | "promo_banner" | "spotlight";

interface BaseBlock {
  id: string;
  type: BlockType;
}

interface HeroCarouselBlock extends BaseBlock {
  type: "hero_carousel";
  data: { slides: { imageUrl: string; title: string; ctaUrl: string }[] };
}

interface ContentRowBlock extends BaseBlock {
  type: "content_row";
  data: { title: string; genre: string; contentIds: string[] };
}

interface PromoBannerBlock extends BaseBlock {
  type: "promo_banner";
  data: { message: string; ctaLabel: string; ctaUrl: string; backgroundColor: string };
}

type CMSBlock = HeroCarouselBlock | ContentRowBlock | PromoBannerBlock;

interface PageConfig {
  pageId: string;
  slug: string;
  blocks: CMSBlock[];
}

// Step 2: The component registry
// "The key insight here is that the registry maps type strings to components.
// I want the registry to be type-safe — if I register a handler, it should
// receive the correctly typed block, not the base type."

type BlockRenderers = {
  [K in CMSBlock["type"]]: React.ComponentType<Extract<CMSBlock, { type: K }>>;
};

const BLOCK_REGISTRY: BlockRenderers = {
  hero_carousel: HeroCarousel,
  content_row: ContentRow,
  promo_banner: PromoBanner,
};

// Step 3: PageRenderer
// "I'll use type narrowing via the 'type' discriminant to render the correct component."

function BlockRenderer({ block }: { block: CMSBlock }) {
  const Component = BLOCK_REGISTRY[block.type];

  if (!Component) {
    // Unknown block type — warn in dev, render nothing in prod
    if (process.env.NODE_ENV === "development") {
      console.warn(\`[PageRenderer] Unknown block type: "\${block.type}". Add it to BLOCK_REGISTRY.\`);
    }
    return null;
  }

  // TypeScript needs help here: the registry lookup doesn't automatically
  // narrow the block type to match the component's expected props.
  // Cast is safe here because the registry enforces the mapping.
  return <Component {...(block as never)} />;
}

function PageRenderer({ config }: { config: PageConfig }) {
  return (
    <main>
      {config.blocks.map((block) => (
        <BlockRenderer key={block.id} block={block} />
      ))}
    </main>
  );
}

// Step 4: A/B testing extension (if time permits — mention the approach)
// "To support A/B testing two layouts, I would wrap PageRenderer to accept
// an experiment variant. The CMS would return two page configs for the variant
// and control, and the shell app would select based on the user's bucket."

interface ExperimentConfig {
  experimentId: string;
  variant: "control" | "treatment";
  control: PageConfig;
  treatment: PageConfig;
}

function ExperimentPageRenderer({ experiment, userBucket }: {
  experiment: ExperimentConfig;
  userBucket: "control" | "treatment";
}) {
  const config = userBucket === "treatment" ? experiment.treatment : experiment.control;
  return <PageRenderer config={config} />;
}`}</code></pre>
      </SolutionReveal>

      <h3 id="q2-generic-table">Q2: Generic Type-Safe Data Table</h3>

      <InterviewChallenge
        title="[INTERVIEWER] Build a generic DataTable component"
        scenario={
          <>
            <strong>Interviewer says:</strong> &quot;Our internal tooling teams need a reusable
            DataTable component. It should work with any data shape while being type-safe.
            Specifically, column definitions should enforce that accessor keys exist on the
            row type at compile time. Show me the TypeScript types and the component signature.&quot;
          </>
        }
        tasks={[
          "Define Column<T> where the accessor key is constrained to keyof T.",
          "Make the cell value in the renderer typed to the field's actual type (not unknown).",
          "Support computed columns where the accessor is a function instead of a key.",
          "Show a usage example with a concrete type.",
        ]}
      />

      <SolutionReveal>
        <pre><code>{`// "I'll use a generic approach with conditional types to get the cell value type right."

// Column definition — generic over row type T
type Column<T> = {
  key: string;               // display key, for React list rendering
  header: string;            // column header label
  // Accessor: either a direct key of T, or a function that computes the cell value
  accessor: keyof T | ((row: T) => React.ReactNode);
  // Optional custom renderer — receives the typed value when accessor is a key
  render?: (value: T[keyof T], row: T) => React.ReactNode;
  width?: string;
};

// DataTable props — columns and rows are co-typed
interface DataTableProps<T> {
  rows: T[];
  columns: Column<T>[];
  getRowKey: (row: T) => string | number;  // stable key for React list
}

function DataTable<T>({ rows, columns, getRowKey }: DataTableProps<T>) {
  function getCellValue(row: T, col: Column<T>): React.ReactNode {
    if (typeof col.accessor === "function") {
      return col.accessor(row);
    }
    const value = row[col.accessor];
    return col.render
      ? col.render(value, row)
      : (value as React.ReactNode) ?? null;
  }

  return (
    <table>
      <thead>
        <tr>
          {columns.map((col) => <th key={col.key}>{col.header}</th>)}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={getRowKey(row)}>
            {columns.map((col) => (
              <td key={col.key}>{getCellValue(row, col)}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// Usage — TypeScript enforces column accessor keys
interface ContentItem {
  id: string;
  title: string;
  rating: number;
  releaseYear: number;
  type: "MOVIE" | "SERIES";
}

const contentColumns: Column<ContentItem>[] = [
  { key: "title", header: "Title", accessor: "title" },
  { key: "type",  header: "Type",  accessor: "type" },
  {
    key: "rating",
    header: "Rating",
    accessor: "rating",
    render: (value) => <RatingStars value={value as number} />,
  },
  // Computed column — function accessor
  {
    key: "age",
    header: "Age",
    accessor: (row) => new Date().getFullYear() - row.releaseYear + " yrs",
  },
];

// ✗ TypeScript error: "invalidField" is not keyof ContentItem
// { key: "x", header: "X", accessor: "invalidField" }

<DataTable
  rows={contentItems}
  columns={contentColumns}
  getRowKey={(row) => row.id}
/>`}</code></pre>
      </SolutionReveal>

      <h3 id="q3-data-fetching">Q3: Request Deduplication Layer</h3>

      <InterviewChallenge
        title="[INTERVIEWER] Implement request deduplication"
        scenario={
          <>
            <strong>Interviewer says:</strong> &quot;Multiple components on the Disney+ homepage
            all fetch the same user profile data on mount. This causes 5-8 simultaneous
            requests to the same endpoint. Implement a request deduplication layer that ensures
            the same URL is fetched only once, even if requested concurrently by multiple
            callers.&quot;
          </>
        }
        tasks={[
          "Implement a deduplicated fetch function that returns the same Promise to all concurrent callers.",
          "Ensure the in-flight cache is cleared after the request completes (success or error).",
          "Handle the case where a new request comes in after the previous one completed.",
          "Show how this integrates with React — a hook that uses this deduplication layer.",
        ]}
      />

      <SolutionReveal>
        <pre><code>{`// "The key insight: store in-flight Promises in a Map. Multiple callers get the
// same Promise, so the fetch runs only once regardless of how many call it."

const inflight = new Map<string, Promise<unknown>>();

async function deduplicatedFetch<T>(url: string, options?: RequestInit): Promise<T> {
  if (inflight.has(url)) {
    // Return the existing in-flight promise — same result, no new network request
    return inflight.get(url) as Promise<T>;
  }

  const promise = fetch(url, options)
    .then(res => {
      if (!res.ok) throw new ApiError(res.status, url);
      return res.json() as Promise<T>;
    })
    .finally(() => {
      // Clear from cache when done — success OR failure
      // Next request will trigger a fresh fetch
      inflight.delete(url);
    });

  inflight.set(url, promise);
  return promise;
}

// React hook that wraps it
function useDeduplicatedFetch<T>(url: string) {
  const [state, setState] = useState<
    | { status: "idle" }
    | { status: "loading" }
    | { status: "success"; data: T }
    | { status: "error"; error: Error }
  >({ status: "idle" });

  useEffect(() => {
    setState({ status: "loading" });
    deduplicatedFetch<T>(url)
      .then(data => setState({ status: "success", data }))
      .catch(error => setState({ status: "error", error }));
  }, [url]);

  return state;
}

// In production: use React Query / SWR — they implement this pattern
// (and request deduplication, caching, stale-while-revalidate) out of the box.
// I'd implement this manually only for a lightweight solution without those deps.
// "I'd mention React Query here and note this is reinventing their wheel."`}</code></pre>
      </SolutionReveal>

      <h2 id="round2-architecture">Round 2: Architecture Decisions</h2>

      <h3 id="q4-state-migration">Q4: State Management Migration</h3>

      <InterviewChallenge
        title="[INTERVIEWER] You are inheriting a React codebase with significant technical debt"
        scenario={
          <>
            <strong>Interviewer says:</strong> &quot;The Disney Parks web app was built 4 years
            ago with Redux (pre-Redux Toolkit). It has 30+ slices, extensive thunk middleware,
            no TypeScript, and 15% test coverage. You have been tasked with modernizing it.
            The team has 8 engineers. Where do you start?&quot;
          </>
        }
        tasks={[
          "What is your first step before writing any code?",
          "How do you prioritize: TypeScript migration vs Redux modernization vs test coverage?",
          "How do you avoid a 'big bang rewrite' that stalls feature delivery?",
          "How do you get team buy-in for a multi-quarter modernization effort?",
        ]}
      />

      <SolutionReveal>
        <pre><code>{`// Strong answer framework:

// Step 1: Measure before planning
"Before I write a single line or propose any changes, I spend two weeks
in observation mode:
- Profile the app: which pages are slowest? Which components re-render most?
- Audit incident history: what categories of bugs are most frequent?
  (type errors? state shape bugs? race conditions?)
- Talk to the team: what is their biggest daily frustration?
This data converts 'we should modernize' into a concrete business case."

// Step 2: Prioritize by risk and ROI
"My priority order would be:
1. TypeScript for the most bug-prone modules FIRST (not a full migration)
   — specifically the payment and auth flows where type errors = production incidents.
2. Test coverage for the critical paths — not blanket 80% coverage,
   but tests for the 20% of code that causes 80% of incidents.
3. Redux Toolkit migration opportunistically — when a slice needs changes
   for a feature, modernize it then. Do not modernize for its own sake."

// Step 3: The strangler fig pattern (no big bang rewrites)
"I use the strangler fig pattern:
- New features are built with the modern stack (RTK, TypeScript, tests)
- Existing code is migrated when it needs changes for feature work
- The old patterns shrink over time without a dedicated migration sprint
- Feature delivery never pauses"

// Step 4: Team buy-in
"I write an RFC documenting:
- The current cost (incident frequency, ramp-up time for new engineers)
- The proposed modernization with a phased timeline
- The 'strangler fig' approach so nobody thinks we're pausing features
Then I schedule a 30-minute review with the team and the PM.
I frame it as: 'The first phase takes 3 sprints and reduces our incident
rate by an estimated X%. Here is the ROI calculation.'"`}</code></pre>
      </SolutionReveal>

      <h3 id="q5-micro-frontend">Q5: Micro-Frontend Boundaries</h3>

      <InterviewChallenge
        title="[INTERVIEWER] Define the micro-frontend boundaries for Disney's web platform"
        scenario={
          <>
            <strong>Interviewer says:</strong> &quot;We have five teams: Platform (shared infrastructure),
            Disney+ (streaming), ESPN (sports), Parks (theme parks digital), and Commerce (subscriptions,
            purchases). Each team wants to own their frontend independently. How do you define the
            boundaries and what does each team own?&quot;
          </>
        }
        tasks={[
          "Define what each team owns — both code and runtime surface.",
          "What does the Platform team own that other teams cannot override?",
          "How do you handle features that span multiple teams? (e.g., a user watches Disney+ then buys a Parks ticket in the same session)",
          "What are the top three risks of this architecture and how do you mitigate them?",
        ]}
      />

      <SolutionReveal>
        <pre><code>{`// Team ownership model:

// Platform Team (Shell App)
// - Routing and URL structure
// - Disney Account authentication
// - @disney/ui design system
// - Navigation (global header, footer)
// - Feature flag infrastructure
// - Analytics event schema and SDK
// Rule: other teams consume Platform's APIs; they do not modify Platform code

// Disney+ Team (MFE: streaming)
// - /movies/*, /series/*, /watch/* routes
// - ContentCard, ContentRow, HeroCarousel, VideoPlayer components
// - Watchlist and Continue Watching (calls Platform's User Service)

// ESPN Team (MFE: sports)
// - /espn/* routes
// - Live scoreboard, game schedule, highlights
// - Fantasy sports features

// Parks Team (MFE: experiences)
// - /parks/* routes
// - Wait times, ride info, park map, dining reservations
// - Lightning Lane purchase (calls Commerce team's APIs)

// Commerce Team (MFE: subscriptions)
// - /subscribe/*, /account/billing/* routes
// - Checkout flow, subscription management
// - Surfaces as a modal/sheet from other MFEs (not a full page takeover)

// Cross-team feature: Disney+ watch → Parks ticket purchase
// "The Disney+ MFE emits a shell event: 'user clicked Parks promotion'
// The Shell routes to the Parks MFE with context params.
// If purchase needed, Parks MFE opens the Commerce MFE as a modal.
// Communication is through the Shell's event bus — MFEs never talk directly."

// Top 3 risks:
// 1. React version divergence → singleton enforcement in Module Federation + ADR
// 2. Auth context not propagated to new MFE → Platform team owns auth context shape
// 3. Analytics schema fragmentation → Platform owns event schema, all MFEs import it`}</code></pre>
      </SolutionReveal>

      <h2 id="round3-system-design">Round 3: System Design Deep Dive</h2>

      <h3 id="q6-espn-live">Q6: ESPN Live Scoreboard at Scale</h3>

      <InterviewChallenge
        title="[INTERVIEWER] Design the ESPN live scoreboard for 50M concurrent users"
        scenario={
          <>
            <strong>Interviewer says:</strong> &quot;The Super Bowl is in two weeks. We expect
            50M concurrent users watching score updates on ESPN. The current polling-based
            scoreboard sends one HTTP request per user every 10 seconds. At 50M users, that
            is 5M requests per second. This will take down our servers. Design a scalable
            solution. You have 35 minutes.&quot;
          </>
        }
        tasks={[
          "What is wrong with the current architecture and why does it not scale?",
          "Propose an alternative architecture. Draw the components and data flow.",
          "How many server connections does your solution require vs the current approach?",
          "What happens when the WebSocket/SSE server goes down during the game?",
          "How do you handle a user who tabs away and comes back 5 minutes later?",
        ]}
      />

      <SolutionReveal>
        <pre><code>{`// Problem with current approach:
// 50M users × 1 request/10s = 5M req/s
// Each request: TCP handshake + HTTP headers + JSON response
// Stateless — server must look up the latest score for every request
// CDN cannot cache — scores change every few seconds

// Proposed architecture: SSE via CDN-cached event stream

// How it works:
// 1. A small fleet of Score Publisher services subscribes to the score event bus
//    (fed by official NFL data feed)
// 2. Score Publishers write score updates to an in-memory store (Redis Pub/Sub)
// 3. SSE Gateway servers subscribe to Redis and push updates to connected clients
// 4. CloudFront CDN terminates SSE connections at edge — massive fan-out at edge

// Connection math:
// Current: 50M req/10s = 5M req/s (all reach origin)
// SSE: 50M persistent connections, but distributed across CDN edge nodes
// CDN edge nodes: 400 PoPs × 125K connections each = 50M connections
// Origin SSE gateways: 50K connections per server × 1000 servers
// (much smaller than 5M req/s — SSE connections are long-lived)

// Score update fanout:
// NFL data → Score Publisher → Redis Pub/Sub → SSE Gateways → CDN edges → Users
// Score update propagates to all 50M users in ~200ms

// Resilience:
// Reconnection: EventSource auto-reconnects on disconnect (browser-native)
// Missed updates: SSE supports Last-Event-ID header
//   → client sends "last event I received"
//   → server replays missed events from a short event log (60s window)
// SSE server down: CDN retries next healthy SSE gateway
// Fallback: if SSE unavailable, degrade to 30-second polling (not 10s)

// Tab visibility:
// document.addEventListener("visibilitychange", () => {
//   if (document.hidden) {
//     eventSource.close();    // disconnect while tabbed away
//   } else {
//     reconnect();            // reconnect on tab focus
//     // request score refresh via REST to catch up on missed time
//   }
// });`}</code></pre>
      </SolutionReveal>

      <h2 id="round4-leadership">Round 4: Leadership & Cross-Team</h2>

      <h3 id="q7-tech-debt">Q7: Inheriting Technical Debt Across Teams</h3>

      <InterviewChallenge
        title="[INTERVIEWER] Two teams are blocked by a shared architectural problem"
        scenario={
          <>
            <strong>Interviewer says:</strong> &quot;The Disney+ and ESPN teams both need
            real-time notifications (new content alerts, live game starts). Neither team
            has built a notification system before. Both teams have started independent
            implementations that are already diverging. As the staff engineer, how do
            you handle this?&quot;
          </>
        }
        tasks={[
          "What do you do in the first 24 hours?",
          "How do you decide whether this should be a Platform team responsibility or a shared service owned by one of the product teams?",
          "Write the first paragraph of the RFC you would produce.",
          "How do you handle a situation where the Disney+ team lead disagrees with your proposed approach?",
        ]}
      />

      <SolutionReveal>
        <pre><code>{`// First 24 hours:
"I would not make any technical decisions yet. First I talk to both teams:
- What exactly do they need? (notification types, user controls, delivery channels)
- How far along are the implementations?
- What are the blockers that made them start independently?
Often the problem is not technical — it's that neither team knew the other was building the same thing."

// Platform vs product team ownership decision:
"Notifications are a cross-cutting concern that will spread to Parks and Commerce eventually.
Cross-cutting + multiple consumers = Platform team responsibility.
I would propose this in the RFC with the justification:
'If ESPN owns notifications, Disney+ becomes dependent on ESPN for a feature
that has nothing to do with sports. Platform team ownership prevents that coupling.'"

// RFC first paragraph:
"# RFC: Centralized Notification Service

## Problem
Disney+ and ESPN teams have independently begun building notification systems
with divergent implementations. Without intervention, we will have two systems
that cannot be unified, cannot share user notification preferences, and will
create inconsistent user experience across Disney's web surface. Additionally,
when Parks and Commerce eventually need notifications (expected Q4), they will
face the same problem — and we will have four incompatible systems.

This RFC proposes a Platform team-owned Notification Service that provides a
unified API for all MFEs."

// Handling disagreement from Disney+ team lead:
"I would schedule a 30-minute 1:1 with the Disney+ lead to understand their concern.
Is it a technical disagreement (they think my approach is wrong)?
Or is it about ownership and autonomy (they don't want to depend on Platform)?
Most disagreements at this level are about the second thing.
My response: 'I hear you on the dependency concern. What if we defined an SLA
for Platform's notification service — e.g., 99.9% uptime with a 24-hour response
time on API changes? Would that address the concern?'
If we still can't agree, I write up both positions clearly in the RFC and escalate
to the engineering manager — not to 'win' but to get a decision made transparently."`}</code></pre>
      </SolutionReveal>

      <h3 id="q8-alignment">Q8: Getting Alignment on Hard Decisions</h3>

      <InterviewChallenge
        title="[INTERVIEWER] The team disagrees on a migration strategy"
        scenario={
          <>
            <strong>Interviewer says:</strong> &quot;You want to migrate the Disney+ web
            client from Create React App to Next.js. The engineering manager supports it.
            Three senior engineers support it. Two senior engineers are against it — they
            think the performance gains don&apos;t justify the migration cost, and one of
            them has been at Disney for 8 years. How do you proceed?&quot;
          </>
        }
        tasks={[
          "Do you proceed despite the dissent, since you have majority support?",
          "How do you engage with the two dissenting engineers specifically?",
          "How do you structure the final decision-making moment?",
          "What does 'disagree and commit' look like in practice here?",
        ]}
      />

      <SolutionReveal>
        <pre><code>{`// Strong answer:

// "Majority support does not mean you should proceed over meaningful dissent.
// The 8-year engineer's concern deserves serious engagement — they have context
// I might not have. My first step is a 1:1 with each dissenting engineer."

// Engaging with dissenting engineers:
"I ask: 'Help me understand the specific risks you're most concerned about.
Is it the migration effort itself? A specific Next.js limitation you've seen?
A timeline concern?' Then I listen. Do not defend your position first.
After they explain, I say: 'Would you be willing to co-author the risk section
of the RFC? Your concerns should be in the document regardless of the outcome —
they are valid considerations that future engineers should know about.'
This transforms them from a blocker into a contributor."

// Decision-making structure:
"After all feedback is incorporated, I call a decision meeting with a clear agenda:
1. I present the updated RFC with the dissenting concerns addressed or documented.
2. I explicitly name the decision I am recommending.
3. I ask: 'Are there any remaining blocking concerns? Not preferences — blockers.'
A blocker is a reason we should NOT proceed. A preference is 'I would have chosen differently.'
If no blockers: we proceed.
If a blocker: we address it or escalate to the engineering manager."

// Disagree and commit:
"After the decision is made, I say explicitly to the dissenting engineers:
'I know this wasn't your preferred path. I want to be clear that your concerns
were heard and are documented in the ADR. I would like your help making this
migration successful — specifically, your experience with Disney's deployment
process is critical for the rollout plan.'
Disagree and commit means you get their expertise in service of the decision,
even though they didn't prefer it. You do not get silence and passive resistance."`}</code></pre>
      </SolutionReveal>

      <h2 id="round5-behavioral">Round 5: Behavioral (STAR)</h2>
      <p>
        Disney behavioral interviews use the STAR format (Situation, Task, Action, Result).
        Prepare 5-7 stories that can be adapted to multiple questions. Each story should have
        a specific, measurable result — not &quot;things improved&quot; but &quot;deploy frequency
        increased from 1x/week to 5x/week.&quot;
      </p>

      <h3 id="q9-arch-change">Q9: Leading an Architectural Change</h3>

      <InterviewPlaybook
        title="[INTERVIEWER] Tell me about a time you drove a significant architectural change."
        intro="This question tests your ability to build consensus, manage stakeholders, and deliver technical change at organizational scale — not just implement something."
        steps={[
          "S/T — Set the stage: 'We had a React codebase across 3 teams with no shared component library. Every team was duplicating UI patterns with slight variations. This was causing 3-4 design inconsistencies per sprint and slowing onboarding for new engineers by 2 weeks.'",
          "A — The actions YOU specifically took: 'I proposed a shared design system. I ran a 2-week audit, wrote an RFC, scheduled review sessions with all 3 team leads, addressed 11 blocking concerns, and produced a migration guide and Storybook reference. I did the first 20% of the migration myself to prove the pattern.'",
          "R — Quantified result: 'Within 3 months, all new UI work used the shared system. Design inconsistency bugs dropped 80%. Onboarding time for new engineers reduced from 2 weeks to 4 days for the UI layer.'",
          "Reflection: 'The biggest lesson: I almost skipped the RFC process because I was confident the solution was right. The RFC surfaced a performance concern from the mobile team lead that changed the component API significantly. Without it, we would have shipped the wrong thing.'",
        ]}
      />

      <h3 id="q10-conflict">Q10: Technical Disagreement</h3>

      <InterviewPlaybook
        title="[INTERVIEWER] Describe a time you disagreed with a technical decision and what you did."
        intro="Disney evaluates psychological safety culture — they want engineers who can disagree respectfully and move forward productively."
        steps={[
          "Set up: Name the decision and why you disagreed — make your position technically grounded, not political.",
          "Process: 'I asked for a 30-minute 1:1 with the decision-maker. I shared my analysis — specifically the edge cases I was worried about — in a written doc beforehand so it wasn't a surprise.'",
          "Resolution: 'We agreed to a two-week spike to test my concern. The spike showed my concern was valid in a specific configuration. We modified the approach — not fully my recommendation, but incorporating the risk mitigation I identified.'",
          "Growth: 'I learned that written pre-reads before difficult conversations dramatically improve their quality. The other person has time to think, not just react. I now do this for any significant technical disagreement.'",
        ]}
      />

      <h3 id="q11-failure">Q11: A Time You Failed</h3>

      <InterviewPlaybook
        title="[INTERVIEWER] Tell me about a significant technical failure you were responsible for."
        intro="This question tests self-awareness, intellectual honesty, and the ability to learn systematically. Disney does not expect perfection — they expect engineers who fail thoughtfully and improve."
        steps={[
          "Name it clearly — do not hedge or minimize: 'I shipped a performance optimization to the search results page that caused a 40% increase in re-renders under high-load conditions. We caught it 3 hours after deploy from RUM alerts, but it affected users in peak traffic.'",
          "Own it: 'I had not profiled the new code under a realistic data load. I tested with the happy-path dataset, not with the full content library. That was my mistake.'",
          "What you did: 'I rolled back immediately, wrote an incident report, and conducted a 30-minute blameless postmortem with the team.'",
          "Systemic fix: 'We added a performance profiling step to our CI pipeline that runs against a production-scale dataset. We also added a Lighthouse CI budget so performance regressions fail the build. I have not shipped a performance regression since, and neither has anyone else on the team.'",
        ]}
      />

      <h2 id="disney-values">Disney Values Alignment</h2>
      <p>
        Disney explicitly screens for cultural fit. The five Disney values are: Innovation,
        Quality, Community, Storytelling, and Optimism. Frame at least one answer per round
        around one of these values.
      </p>
      <pre><code>{`// Disney value alignment examples for technical interviews:

// Innovation:
"I proposed moving from polling to SSE for live scores. It wasn't the safe
choice — it required new infrastructure. But the improvement in user experience
and server cost savings was significant enough to justify the risk."

// Quality:
"I don't consider a feature done until it has tests for the happy path, the
error path, and at least two edge cases. That's not gold-plating — that's the
bar for shipping with confidence at Disney's scale."

// Community / Inclusion:
"Every UI I architect includes accessibility from day one — keyboard navigation,
screen reader support, sufficient color contrast. Not as an afterthought, but
as part of the definition of done. Disney's audience includes users with
disabilities, and our platform should work for all of them."

// Storytelling (user focus):
"When I design an API, I start by writing the code I wish existed as a consumer.
Then I implement it. The API tells a story — what operations are possible,
what errors mean, how to sequence calls — and that story should be obvious
without reading documentation."

// Optimism:
"I approach technical debt and legacy code as an opportunity, not a burden.
Every time I touch old code, I leave it better than I found it. Over time,
that compounds into a significantly better codebase."`}</code></pre>

      <h2 id="questions-to-ask">Questions to Ask Your Interviewer</h2>
      <p>
        Always have three to five prepared questions. The questions you ask signal as much
        as the answers you give. At the staff engineer level, ask questions that demonstrate
        you are thinking about organizational scale, not just the job.
      </p>
      <pre><code>{`// Strong questions for a Disney Staff Engineer interview:

// Technical / Architecture:
"What is the biggest frontend architectural challenge the team is facing in the
next 12 months? Is it the micro-frontend integration, the design system adoption,
or something else?"

"How do the web, iOS, and Android teams coordinate on shared features like the
Disney account authentication flow? Is there an RFC process for cross-platform decisions?"

"What does the test coverage look like across the Disney+ and ESPN frontends?
Where are the biggest gaps?"

// Team / Process:
"How does the team handle architectural disagreements? Is there a formal RFC
or ADR process, or is it more informal?"

"What does a typical week look like for the staff engineers on this team?
What percentage of time is coding vs design vs communication?"

// Growth / Org:
"What is the biggest opportunity for a new staff engineer to make an immediate
impact in the first 90 days?"

"How does Disney think about platform engineering vs product engineering at the
staff level? Is there a clear distinction, or do staff engineers work across both?"`}</code></pre>

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li><strong>Talk as you type</strong> — the interviewer evaluates your problem-solving process, not just the final answer. Narrate your reasoning out loud.</li>
        <li><strong>Ask clarifying questions first</strong> — for system design and architecture questions, spending 5 minutes on requirements framing is the highest-ROI time in the interview.</li>
        <li>For behavioral questions, <strong>be specific and quantify</strong> — &quot;deploy frequency increased from 1x/week to 5x/week&quot; is stronger than &quot;things improved significantly.&quot;</li>
        <li><strong>Name the failure modes</strong> — in every architecture question, proactively say &quot;and here is what breaks and how we recover&quot; before the interviewer asks.</li>
        <li>Disney screens for <strong>disagree and commit</strong> — show that you can hold a position under pressure, engage with dissent seriously, and then fully commit to the team decision.</li>
        <li>The questions you ask at the end of each round are your last impression — ask about organizational challenges and leadership opportunities, not compensation or work-life balance.</li>
      </ul>
    </div>
  );
}
