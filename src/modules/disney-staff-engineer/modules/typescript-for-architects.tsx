import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { ArticleTable, InterviewPlaybook, InterviewChallenge } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const typeSafetyDiagram = String.raw`flowchart TD
  INPUT["Runtime data\n(API response, user input, env var)"]
  INPUT --> ZOD["Zod / io-ts schema\nRuntime validation + type narrowing"]
  ZOD -->|"valid"| TYPED["Typed domain model\nTypeScript knows the exact shape"]
  ZOD -->|"invalid"| ERR["Typed error\nnever reaches the typed path"]
  TYPED --> DERIVED["Derived types\nMapped / conditional types from the base"]
  DERIVED --> API["API contract\nType-safe call signatures"]
  API --> UI["UI components\nProps are derived — cannot drift from API"]`;

const discriminatedUnionDiagram = String.raw`stateDiagram-v2
  [*] --> Idle
  Idle --> Loading: fetchContent()
  Loading --> Success: data received
  Loading --> Error: network/parse failure
  Error --> Loading: retry()
  Success --> Loading: refresh()
  Success --> [*]
  note right of Loading
    state = { status: 'loading' }
    No data or error fields
  end note
  note right of Success
    state = { status: 'success', data: Content[] }
    TypeScript guarantees data exists
  end note
  note right of Error
    state = { status: 'error', error: ApiError }
    TypeScript guarantees error exists
  end note`;

export const toc: TocItem[] = [
  { id: "type-driven-dev", title: "Type-Driven Development", level: 2 },
  { id: "discriminated-unions", title: "Discriminated Unions", level: 2 },
  { id: "async-state-machine", title: "Async State Machine Pattern", level: 3 },
  { id: "api-response-types", title: "Type-Safe API Responses", level: 3 },
  { id: "advanced-generics", title: "Advanced Generics", level: 2 },
  { id: "conditional-types", title: "Conditional Types & infer", level: 3 },
  { id: "mapped-types", title: "Mapped Types", level: 3 },
  { id: "template-literals", title: "Template Literal Types", level: 2 },
  { id: "branded-types", title: "Branded / Nominal Types", level: 2 },
  { id: "type-safe-events", title: "Type-Safe Event Systems", level: 2 },
  { id: "api-contracts", title: "API Contract Design with Zod", level: 2 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "challenge", title: "TypeScript Challenge", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function TypescriptForArchitects() {
  return (
    <div className="article-content">
      <p>
        TypeScript expertise at the staff level is not about knowing every utility type —
        it is about using the type system to encode invariants that would otherwise only
        fail at runtime. The best TypeScript engineers make illegal states unrepresentable,
        derive types from a single source of truth, and design API contracts that prevent
        entire classes of bugs before a line of business logic is written.
      </p>

      <h2 id="type-driven-dev">Type-Driven Development</h2>
      <p>
        Type-driven development starts at the boundary: external data (API responses, user
        input, environment variables) enters the system unvalidated. <strong>Validate once at
        the boundary with a schema</strong>, derive the TypeScript type from that schema, and
        let the type system carry the guarantee through the rest of the codebase. Never cast
        with <code>as</code> — that is a lie to the compiler that future engineers will pay for.
      </p>

      <MermaidDiagram
        chart={typeSafetyDiagram}
        title="Type Safety from Boundary to UI"
        caption="Validate at the API boundary with Zod. All downstream types are derived — they cannot drift from what the API actually sends."
        minHeight={350}
      />

      <h2 id="discriminated-unions">Discriminated Unions</h2>
      <p>
        Discriminated unions are the most powerful pattern for modeling state that has
        mutually exclusive shapes. The discriminant field (usually <code>status</code> or
        <code>kind</code>) narrows the type in conditional blocks, eliminating entire
        categories of null-check bugs.
      </p>

      <h3 id="async-state-machine">Async State Machine Pattern</h3>
      <p>
        Every data-fetching hook has four possible states: idle, loading, success, error.
        Representing this as four boolean flags (<code>isLoading</code>, <code>isError</code>,
        etc.) creates impossible states — what does <code>isLoading && isError</code> mean?
        A discriminated union makes those states <strong>impossible to represent</strong>.
      </p>
      <pre><code>{`// Bad: impossible states are representable
type ContentState = {
  isLoading: boolean;
  isError: boolean;
  data?: Content[];
  error?: Error;
};
// Nothing prevents: { isLoading: true, isError: true, data: [...] }

// Good: discriminated union — each status has exactly the right fields
type ContentState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: Content[] }
  | { status: "error"; error: ApiError };

// TypeScript narrows in switch — no optional chaining needed
function renderContent(state: ContentState) {
  switch (state.status) {
    case "idle":    return <EmptyState />;
    case "loading": return <ContentSkeleton />;
    case "success": return <ContentGrid items={state.data} />;  // data: Content[] guaranteed
    case "error":   return <ErrorBanner error={state.error} />; // error: ApiError guaranteed
  }
}`}</code></pre>

      <MermaidDiagram
        chart={discriminatedUnionDiagram}
        title="Async State Machine as Discriminated Union"
        caption="Each state transition maps to a different union member. TypeScript enforces that you cannot access data in the error state or vice versa."
        minHeight={380}
      />

      <h3 id="api-response-types">Type-Safe API Responses</h3>
      <p>
        Disney APIs return different shapes for success and error. A single <code>ApiResponse</code>
        type handles both, and TypeScript narrows correctly in conditional blocks:
      </p>
      <pre><code>{`type ApiResponse<T> =
  | { ok: true; data: T; status: number }
  | { ok: false; error: ApiError; status: number };

async function fetchContent(id: string): Promise<ApiResponse<Content>> {
  const res = await fetch(\`/api/content/\${id}\`);
  if (!res.ok) {
    const error = await res.json();
    return { ok: false, error: parseApiError(error), status: res.status };
  }
  return { ok: true, data: ContentSchema.parse(await res.json()), status: res.status };
}

// Caller gets guaranteed narrowing
const result = await fetchContent("disney-plus-exclusive-123");
if (result.ok) {
  console.log(result.data.title);  // data: Content — guaranteed
} else {
  console.error(result.error.code); // error: ApiError — guaranteed
}`}</code></pre>

      <h2 id="advanced-generics">Advanced Generics</h2>

      <h3 id="conditional-types">Conditional Types & infer</h3>
      <p>
        Conditional types let the type system make decisions based on type relationships.
        <code>infer</code> extracts types from within other types — the key to writing
        utility types that derive shapes from existing ones.
      </p>
      <pre><code>{`// Extract the resolved type from a Promise
type Awaited<T> = T extends Promise<infer U> ? Awaited<U> : T;

// Extract the element type from an array or readonly array
type ArrayElement<T> = T extends readonly (infer E)[] ? E : never;

// Extract parameter types from a function
type FirstParam<T extends (...args: never[]) => unknown> =
  T extends (first: infer F, ...rest: never[]) => unknown ? F : never;

// Practical: derive the props of a component from its type
type ComponentProps<T> = T extends React.ComponentType<infer P> ? P : never;

// Disney use case: derive the item type from a ContentRow props type
type ContentRowItem = ArrayElement<ComponentProps<typeof ContentRow>["items"]>;
// Result: ContentItem — no manual duplication`}</code></pre>

      <h3 id="mapped-types">Mapped Types</h3>
      <p>
        Mapped types iterate over the keys of an existing type to produce a new type.
        Combined with conditional types, they enable transformations that eliminate entire
        categories of duplication in large codebases.
      </p>
      <pre><code>{`// Make all fields optional AND nullable (for partial update payloads)
type PartialNullable<T> = {
  [K in keyof T]?: T[K] | null;
};

// Make all nested objects readonly (for immutable config)
type DeepReadonly<T> = {
  readonly [K in keyof T]: T[K] extends object ? DeepReadonly<T[K]> : T[K];
};

// Extract only the function properties from a type (for API clients)
type FunctionProps<T> = {
  [K in keyof T as T[K] extends (...args: never[]) => unknown ? K : never]: T[K];
};

// Disney analytics: type-safe event map
type AnalyticsEvents = {
  "content.play": { contentId: string; userId: string; quality: "4k" | "hd" | "sd" };
  "content.pause": { contentId: string; positionMs: number };
  "search.query": { query: string; resultCount: number };
};

// Type-safe analytics client derived from the event map
function track<E extends keyof AnalyticsEvents>(
  event: E,
  properties: AnalyticsEvents[E]
): void {
  // implementation
}

track("content.play", { contentId: "m123", userId: "u456", quality: "4k" }); // ✓
track("content.play", { contentId: "m123" }); // ✗ TypeScript error: missing userId, quality`}</code></pre>

      <h2 id="template-literals">Template Literal Types</h2>
      <p>
        Template literal types create new string types by combining existing ones. They
        are powerful for type-safe CSS class generation, event namespacing, and API route
        construction.
      </p>
      <pre><code>{`type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
type ApiVersion = "v1" | "v2";
type ContentType = "movie" | "series" | "short";

// Generates all valid API route patterns
type ContentRoute = \`/api/\${ApiVersion}/\${ContentType}/:id\`;
// Resolves to: "/api/v1/movie/:id" | "/api/v1/series/:id" | ...

// Type-safe event listener namespacing
type PlayerEvent = \`player:\${"play" | "pause" | "seek" | "end"}\`;
// "player:play" | "player:pause" | "player:seek" | "player:end"

// CSS utility class generation (useful in design system work)
type Size = "sm" | "md" | "lg" | "xl";
type ClassName = \`btn-\${Size}\` | \`text-\${Size}\` | \`gap-\${Size}\`;
// "btn-sm" | "btn-md" | "text-sm" | "text-md" | ...`}</code></pre>

      <h2 id="branded-types">Branded / Nominal Types</h2>
      <p>
        TypeScript uses structural typing — two types with the same shape are interchangeable.
        Branded types add a unique tag to prevent accidentally passing a <code>UserId</code>
        where a <code>ContentId</code> is expected, even though both are strings.
      </p>
      <pre><code>{`// Brand utility — adds a phantom type to prevent accidental substitution
type Brand<T, B extends string> = T & { readonly __brand: B };

type UserId = Brand<string, "UserId">;
type ContentId = Brand<string, "ContentId">;
type SessionToken = Brand<string, "SessionToken">;

// Constructor functions that produce branded types
const UserId = (id: string): UserId => id as UserId;
const ContentId = (id: string): ContentId => id as ContentId;

// Function signatures now prevent accidental swap
function getWatchHistory(userId: UserId): Promise<ContentItem[]> { /* ... */ }
function getContentDetails(contentId: ContentId): Promise<Content> { /* ... */ }

const userId = UserId("usr-123");
const contentId = ContentId("mov-456");

getWatchHistory(userId);   // ✓
getWatchHistory(contentId); // ✗ TypeScript error: ContentId is not UserId
getContentDetails(userId);  // ✗ TypeScript error: UserId is not ContentId`}</code></pre>

      <h2 id="type-safe-events">Type-Safe Event Systems</h2>
      <p>
        Large React applications need internal event buses for cross-component communication
        that does not fit neatly into a state management solution. A typed event emitter
        ensures that event names and payloads stay consistent as the system grows.
      </p>
      <pre><code>{`type EventMap = {
  "player:play": { contentId: ContentId; startMs: number };
  "player:end": { contentId: ContentId; completedMs: number };
  "auth:logout": undefined;
  "notification:show": { message: string; level: "info" | "warning" | "error" };
};

class TypedEventBus {
  private listeners = new Map<string, Set<Function>>();

  on<E extends keyof EventMap>(
    event: E,
    handler: (payload: EventMap[E]) => void
  ): () => void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(handler);
    return () => this.listeners.get(event)?.delete(handler);
  }

  emit<E extends keyof EventMap>(event: E, payload: EventMap[E]): void {
    this.listeners.get(event)?.forEach(h => h(payload));
  }
}

const bus = new TypedEventBus();

// Correctly typed — handler receives { contentId: ContentId; startMs: number }
bus.on("player:play", ({ contentId, startMs }) => {
  analytics.track("play", { id: contentId, offset: startMs });
});

bus.emit("player:play", { contentId: ContentId("mov-123"), startMs: 0 }); // ✓
bus.emit("player:play", { contentId: "mov-123", startMs: 0 }); // ✗ not a ContentId`}</code></pre>

      <h2 id="api-contracts">API Contract Design with Zod</h2>
      <p>
        Zod schemas are the single source of truth for both runtime validation and TypeScript
        types. Define once, derive everywhere — no manual interface duplication.
      </p>
      <pre><code>{`import { z } from "zod";

const ContentSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  type: z.enum(["movie", "series", "short"]),
  rating: z.number().min(0).max(10),
  releaseYear: z.number().int().min(1923), // Disney founded 1923
  tags: z.array(z.string()),
  metadata: z.object({
    duration: z.number().optional(), // undefined for series
    episodeCount: z.number().optional(), // undefined for movies
  }),
});

// TypeScript type derived from the schema — zero duplication
type Content = z.infer<typeof ContentSchema>;

// Validated fetch — throws ZodError on shape mismatch
async function fetchContent(id: string): Promise<Content> {
  const res = await fetch(\`/api/v2/content/\${id}\`);
  if (!res.ok) throw new ApiError(res.status);
  return ContentSchema.parse(await res.json()); // runtime + compile time safety
}

// Partial schema for PATCH requests — derived from the full schema
const ContentPatchSchema = ContentSchema.partial().omit({ id: true });
type ContentPatch = z.infer<typeof ContentPatchSchema>;`}</code></pre>

      <ArticleTable caption="TypeScript patterns compared by use case and what they prevent." minWidth={800}>
        <table>
          <thead>
            <tr>
              <th>Pattern</th>
              <th>What it prevents</th>
              <th>When to use</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Discriminated union</td>
              <td>Accessing fields that don&apos;t exist in the current state</td>
              <td>Async state, fetch results, finite state machines</td>
            </tr>
            <tr>
              <td>Branded types</td>
              <td>Accidentally swapping IDs or tokens of the same primitive type</td>
              <td>Domain IDs (UserId, ContentId), tokens, validated strings</td>
            </tr>
            <tr>
              <td>Mapped types</td>
              <td>Manual duplication when one type should derive from another</td>
              <td>Partial update payloads, readonly config, API clients</td>
            </tr>
            <tr>
              <td>Template literal types</td>
              <td>Typos in event names, route strings, CSS class names</td>
              <td>Event systems, URL builders, CSS-in-TS utilities</td>
            </tr>
            <tr>
              <td>Zod + infer</td>
              <td>Type drift between runtime shape and compile-time interface</td>
              <td>All external data boundaries: API responses, form inputs, env vars</td>
            </tr>
            <tr>
              <td>Conditional types + infer</td>
              <td>Manual re-declaration of nested types</td>
              <td>Utility types, extracting element/parameter/return types</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="interview-framing">Interview Framing</h2>

      <InterviewPlaybook
        title="How to answer: 'How do you use TypeScript to enforce correctness across a large team?'"
        intro="The weak answer lists utility types. The strong answer explains how TypeScript encodes invariants that eliminate runtime bug categories."
        steps={[
          "Lead with the boundary principle: 'I validate all external data with Zod at the system boundary, derive TypeScript types from schemas, and never use `as` or `any` inside application code.'",
          "Explain discriminated unions for state: 'Impossible states should be unrepresentable. If you model async state as boolean flags, the compiler cannot help you. Discriminated unions make the compiler your ally.'",
          "Name the team-scale patterns: 'For large teams, branded types prevent accidental swapping of semantically different strings. Type-safe event maps ensure that nobody publishes or subscribes to events with the wrong payload shape.'",
          "Close with the organizational argument: 'TypeScript at this level is about the feedback loop speed. A type error at compile time costs 5 seconds. A type error caught in code review costs 30 minutes. A runtime error in production costs hours plus user trust.'",
        ]}
      />

      <InterviewChallenge
        title="TypeScript Challenge: Generic Data Table"
        scenario={
          <>
            Disney&apos;s internal tooling team needs a reusable DataTable component that
            works with any data type while remaining fully type-safe. The column definitions
            should be generic over the row type so that accessor keys are validated at
            compile time.
          </>
        }
        tasks={[
          "Define a generic Column<T> type where the accessor key is constrained to keyof T.",
          "Define the DataTable<T> component props so that columns and rows are co-typed — TypeScript errors if a column key does not exist on the row type.",
          "Add a cell renderer prop to Column<T> that receives the typed cell value (not just unknown).",
          "Handle the case where a column can render a computed value (not just a direct key access) — the accessor should accept either a key or a function (row: T) => React.ReactNode.",
          "Show how TypeScript prevents passing columns with invalid keys at the call site.",
        ]}
      />

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li><strong>Discriminated unions</strong> make impossible states unrepresentable — always prefer them over boolean flag combinations for async state.</li>
        <li><strong>Branded types</strong> prevent accidental substitution of semantically different values with the same primitive type (UserId vs ContentId).</li>
        <li><strong>Zod as the single source of truth</strong> — derive TypeScript types from schemas, never the reverse. This prevents drift between runtime shape and compile-time interface.</li>
        <li><strong>Conditional types + infer</strong> extract nested type information without manual re-declaration — the foundation of every useful utility type.</li>
        <li>Never use <code>as</code> or <code>any</code> in application code — they are lies to the compiler that shift bugs to runtime.</li>
        <li>The staff-level argument for TypeScript investment: <strong>move the feedback loop left</strong>. Compile errors are cheaper than review comments, which are cheaper than production incidents.</li>
      </ul>
    </div>
  );
}
