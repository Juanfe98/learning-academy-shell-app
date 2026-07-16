import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import {
  ArticleTable,
  InterviewPlaybook,
  InterviewChallenge,
  SolutionReveal,
  CodeBlock,
} from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const cacheLayerDiagram = String.raw`flowchart TD
  CALLER["Screen service"]
  CALLER --> CACHED["CachedXClient<br/>(decorator)"]
  CACHED --> RETRIEVE["retrieve({ cacheKey, cache, dataFetcher, ttlSeconds })"]
  RETRIEVE --> HIT{"key in cache?"}
  HIT -->|hit| RET["return cached value"]
  HIT -->|miss| FETCH["dataFetcher() → real XClient HTTP"]
  FETCH --> STORE["cache.set(key, value, ttl)<br/>(fire-and-forget in retrieve)"]
  STORE --> RET
  RETRIEVE --> VALKEY["Cache facade → ValkeyCache<br/>(v8 binary serialization)"]`;

const perfLayersDiagram = String.raw`flowchart LR
  subgraph req["Per request"]
    PA["Promise.all fan-out<br/>(no sequential awaits)"]
  end
  subgraph cross["Cross request"]
    C["Valkey cache<br/>(TTL per client)"]
  end
  PA --> FAST["low latency"]
  C --> FAST`;

export const toc: TocItem[] = [
  { id: "two-levers", title: "Two Performance Levers", level: 2 },
  { id: "cache-interface", title: "The Cache Interface", level: 2 },
  { id: "valkey", title: "Valkey: The Backing Store", level: 3 },
  { id: "retrieve", title: "The retrieve() Helper", level: 2 },
  { id: "cached-client", title: "The Cached-Client Decorator", level: 2 },
  { id: "ttl", title: "TTL & Cache Keys", level: 2 },
  { id: "parallel", title: "Parallelism Is the Other Half", level: 2 },
  { id: "pitfalls", title: "Caching Pitfalls", level: 2 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "challenge", title: "Challenge: Cache a Backend Read", level: 2 },
  { id: "takeaways", title: "Key Takeaways", level: 2 },
];

export default function CachingAndPerformance() {
  return (
    <div className="article-content">
      <p>
        A BFF sits on the request hot path for millions of subscribers, fanning out to a dozen
        backends per screen. Its latency <em>is</em> the product&apos;s latency. Two mechanisms keep
        it fast: <strong>caching</strong> (avoid repeat work across requests) and{" "}
        <strong>parallelism</strong> (avoid serial work within a request). You already know the
        parallelism rule; this module teaches the caching layer — the <code>Cache</code> facade,
        Valkey, the <code>retrieve()</code> helper, and the Cached-client decorator — and ties both
        levers together.
      </p>

      <h2 id="two-levers">Two Performance Levers</h2>
      <MermaidDiagram
        chart={perfLayersDiagram}
        title="Within-request and across-request speedups"
        caption="Promise.all cuts latency within one request; the Valkey cache cuts repeat work across requests. Both are needed."
        minHeight={260}
      />

      <h2 id="cache-interface">The Cache Interface</h2>
      <p>
        Caching is abstracted behind <code>CacheInterface</code> in <code>src/lib/cache/</code>. Any
        cache implementation exposes a <code>prefix</code>, a default <code>ttlSeconds</code>,{" "}
        <code>get</code>/<code>set</code>/<code>ttl</code>/<code>delete</code>, and{" "}
        <code>ping</code> for health checks. Coding against the interface (not a concrete store) is
        what let the team swap Redis for Valkey without touching callers.
      </p>
      <CodeBlock
        lang="typescript"
        filename="src/lib/cache/CacheInterface.ts"
        code={`export interface CacheInterface {
  readonly prefix: string;        // namespaces keys per client
  readonly ttlSeconds: number;    // default TTL

  get<T>(key: string): Promise<T | undefined>;
  ttl(key: string): Promise<number | undefined>;
  set<T>(args: { key: string; value: T; ttlSeconds?: number }): Promise<void>;
  delete(key: string): Promise<void>;
  ping(): Promise<boolean>;
}`}
      />

      <h3 id="valkey">Valkey: The Backing Store</h3>
      <p>
        The concrete <code>Cache</code> class is a facade that delegates to <code>ValkeyCache</code>,
        which uses <strong>v8 binary serialization</strong>. The class comment records real history:
        it once supported a Redis→Valkey migration behind an <code>enable-valkey-cache</code>{" "}
        LaunchDarkly flag (FLEX-7586), running both stores in parallel with a flag listener toggling
        delegation — a concrete example of the flag-driven migration pattern from module 12, applied
        to infrastructure. Redis was removed once migration completed.
      </p>
      <CodeBlock
        lang="typescript"
        filename="src/lib/cache/Cache.ts (excerpt)"
        code={`class Cache implements CacheInterface {
  private readonly valkeyCache: ValkeyCache;
  readonly prefix: string;
  readonly ttlSeconds: number;

  constructor({ prefix, ttlSeconds = DEFAULT_TTL_SECONDS }: CacheConfig) {
    this.prefix = prefix;
    this.ttlSeconds = ttlSeconds;
    this.valkeyCache = new ValkeyCache({ prefix, ttlSeconds });
  }

  static cleanup(): void { ValkeyCache.cleanup(); }
}`}
      />

      <h2 id="retrieve">The retrieve() Helper</h2>
      <p>
        The core pattern is <strong>read-through caching</strong>: try the cache; on a miss, run a{" "}
        <code>dataFetcher</code> (the real backend call), store the result, return it. That&apos;s the{" "}
        <code>retrieve()</code> helper (a.k.a. the <code>DataFetcher&lt;T&gt;</code> pattern) from{" "}
        <code>cacheHelper</code>. In the real helper, cache <code>get</code> errors are logged and
        treated like misses, and setting the fetched value is intentionally fire-and-forget so cache
        latency does not block the response after a successful backend fetch.
      </p>
      <MermaidDiagram
        chart={cacheLayerDiagram}
        title="Read-through caching via retrieve()"
        caption="A cache miss falls through to the real client, then the result is stored under the key with a TTL. Callers never see the miss/hit distinction."
        minHeight={440}
      />

      <h2 id="cached-client">The Cached-Client Decorator</h2>
      <p>
        Now the &quot;raw + Cached client pair&quot; from module 6 becomes concrete. A{" "}
        <code>CachedXClient</code> implements the same interface as <code>XClient</code>, holds a{" "}
        <code>Cache</code>, and wraps each method in <code>retrieve()</code>. Here&apos;s the real{" "}
        <code>CachedCypherClient</code>:
      </p>
      <CodeBlock
        lang="typescript"
        filename="src/backends/cypher/CachedCypherClient.ts"
        code={`class CachedCypherClient implements CypherClientMethods {
  private readonly cypherClient: CypherClientMethods;
  private readonly cache: Cache;

  constructor(client: CypherClient) {
    this.cypherClient = client;
    this.cache = new Cache({ prefix: 'cypher', ttlSeconds: 1 });
  }

  async dictionaries({ screenName, screenData, req, customCacheId }): Promise<...> {
    // Cache key = everything that changes the response.
    const cacheKey = \`\${screenName}:\${JSON.stringify({
      platform: req.platform,
      preferredLanguage: req.preferredLanguage,
      tenant: req.tenant,
      ...(customCacheId && { customCacheId }),
    })}\`;

    return retrieve<CypherDictionariesResponse>({
      cacheKey,
      cache: this.cache,
      dataFetcher: () => this.cypherClient.dictionaries({ screenData, req }),
      ttlSeconds: 1800,   // override the client's default TTL per call
    });
  }
}`}
      />
      <p>
        This is the decorator pattern: <code>CachedCypherClient</code> <em>is a</em>{" "}
        <code>CypherClientMethods</code>, so callers can&apos;t tell they&apos;re talking to a cache.
        It wraps the raw client and adds caching transparently — the same shape repeats for GLO
        GraphQL, S3 site config, and template configuration.
      </p>

      <h2 id="ttl">TTL &amp; Cache Keys</h2>
      <p>
        Two decisions define a correct cache entry, and both are visible above. One implementation
        nuance matters: <code>retrieve()</code> checks <code>if (!value)</code>, so falsy cached
        values such as <code>false</code>, <code>0</code>, or an empty string behave like misses. Do
        not use this helper for meaningful falsy payloads unless you change that behavior or wrap the
        value in an object.
      </p>
      <ArticleTable
        caption="Getting a cache entry right: the key and the TTL."
        minWidth={820}
      >
        <table>
          <thead>
            <tr><th>Decision</th><th>Rule</th><th>Consequence if wrong</th></tr>
          </thead>
          <tbody>
            <tr>
              <td>Cache key</td>
              <td>Include <strong>everything</strong> that changes the response (screen, platform, language, tenant…)</td>
              <td>Too narrow → one user&apos;s data served to another (correctness bug)</td>
            </tr>
            <tr>
              <td>TTL</td>
              <td>Match data volatility; short for fast-changing, long for static</td>
              <td>Too long → stale data; too short → cache barely helps</td>
            </tr>
            <tr>
              <td>Prefix</td>
              <td>Per-client namespace (<code>'cypher'</code>) so keys don&apos;t collide</td>
              <td>Cross-client key collisions</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>
      <p>
        Note the Cypher example sets a constructor default of <code>ttlSeconds: 1</code> but overrides
        to <code>1800</code> (30 min) per call — dictionaries change rarely, so a long TTL is safe and
        valuable. The key includes language and tenant precisely because those change the localized
        result; omitting <code>preferredLanguage</code> would serve English copy to a French user.
      </p>

      <h2 id="parallel">Parallelism Is the Other Half</h2>
      <p>
        Caching removes repeat work; <code>Promise.all</code> removes serial waiting. A service that
        caches perfectly but awaits four backends sequentially is still four round-trips of latency on
        a cold cache. The two levers compound — always fan out independent fetches (module 6) and let
        the Cached clients absorb the repeats.
      </p>

      <h2 id="pitfalls">Caching Pitfalls</h2>
      <ArticleTable
        caption="The caching mistakes that cause production incidents here."
        minWidth={800}
      >
        <table>
          <thead>
            <tr><th>Pitfall</th><th>Why it bites</th></tr>
          </thead>
          <tbody>
            <tr><td>Key omits a request-varying field</td><td>Serves one user/locale/tenant&apos;s data to another — a correctness &amp; privacy bug, not just a perf issue</td></tr>
            <tr><td>Caching per-user data with a long TTL</td><td>Stale account/subscription state shown after a change</td></tr>
            <tr><td>Caching a mutation (execution) result</td><td>Executions must never be cached — state changes aren&apos;t idempotent reads</td></tr>
            <tr><td>Trusting cache availability</td><td>Cache is a speedup, not a source of truth; a miss must always fall through to the real fetcher</td></tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="interview-framing">Interview Framing</h2>
      <InterviewPlaybook
        title="How to answer: 'How does this service stay fast?'"
        intro="Show both levers — caching across requests, parallelism within — plus correct key/TTL discipline."
        steps={[
          "Name the two levers: Valkey caching across requests, Promise.all fan-out within a request; they compound.",
          "Describe the cache abstraction: CacheInterface (get/set/ttl/delete/ping), a Cache facade over ValkeyCache with v8 serialization.",
          "Explain read-through caching via retrieve()/DataFetcher: try cache → on miss call the real client → store with TTL → return.",
          "Describe the Cached-client decorator: CachedXClient implements the same interface and wraps each method in retrieve(), so callers are cache-agnostic.",
          "Stress key + TTL discipline: the key must include everything that varies the response; TTL matches volatility; never cache executions.",
        ]}
      />

      <h2 id="challenge">Challenge: Cache a Backend Read</h2>
      <InterviewChallenge
        title="Add caching to an offers-catalog read"
        scenario={
          <>
            A backend read fetches a fairly static offers catalog that&apos;s identical for all users
            in the same country and language, and it&apos;s called on many screens. You want to cache
            it. Design the cache key and TTL, place the caching correctly, and identify the one key
            mistake that would leak the wrong catalog to users.
          </>
        }
        tasks={[
          "Decide where the caching lives (which layer/class) so callers stay cache-agnostic.",
          "Design the cache key — list exactly which fields it must include and why.",
          "Choose a TTL and justify it against the data's volatility.",
          "Name the correctness bug a too-narrow key causes, and confirm this is a read (not an execution).",
        ]}
        pitfalls={[
          "Putting cache logic in the screen service instead of a Cached client.",
          "A key that omits country or language, serving the wrong catalog.",
          "A TTL so long that catalog updates never appear.",
          "Attempting to cache something that mutates state.",
        ]}
        signal="A strong answer wraps the raw client in a CachedXClient using retrieve(), keys by country+language(+platform), picks a volatility-matched TTL, and confirms it's a safe read."
      />
      <SolutionReveal difficulty="medium">
        <p>
          Put the caching in a <code>CachedOffersCatalogClient</code> that implements the same
          interface as the raw client and wraps the read in <code>retrieve()</code> — the screen
          services keep calling the same method and never know a cache exists (decorator pattern). The
          key must include <strong>every field that changes the response</strong>: at minimum{" "}
          <code>countryCode</code> and <code>preferredLanguage</code> (and <code>platform</code> if it
          affects the catalog), under a <code>'offers-catalog'</code> prefix:
        </p>
        <CodeBlock
          lang="typescript"
          code={`const cacheKey = \`catalog:\${JSON.stringify({ countryCode, preferredLanguage, platform })}\`;
return retrieve({
  cacheKey,
  cache: this.cache,           // new Cache({ prefix: 'offers-catalog', ttlSeconds: 3600 })
  dataFetcher: () => this.client.getCatalog({ countryCode, preferredLanguage }),
  ttlSeconds: 3600,            // 1h — catalog is fairly static
});`}
        />
        <p>
          The catalog changes slowly, so a long TTL (e.g. 1h) is safe and high-value. The dangerous
          mistake is a key missing <code>countryCode</code> or <code>preferredLanguage</code>: the
          first request would populate the cache, and everyone else — different country, different
          language — would get that cached catalog. That&apos;s a correctness and localization bug,
          the exact reason the Cypher key includes language and tenant. Finally, confirm this is a{" "}
          <em>read</em>: catalogs are safe to cache; executions never are.
        </p>
      </SolutionReveal>

      <h2 id="takeaways">Key Takeaways</h2>
      <ul>
        <li>
          <strong>Two levers:</strong> Valkey caching across requests + <code>Promise.all</code>{" "}
          within a request. They compound.
        </li>
        <li>
          <strong><code>CacheInterface</code></strong> (get/set/ttl/delete) abstracts the store; the{" "}
          <code>Cache</code> facade delegates to <code>ValkeyCache</code> (v8 serialization).
        </li>
        <li>
          <strong>Read-through via <code>retrieve()</code>/<code>DataFetcher</code>:</strong> cache
          miss → real client → store with TTL → return.
        </li>
        <li>
          <strong>Cached-client decorator:</strong> <code>CachedXClient</code> implements the raw
          client&apos;s interface and wraps methods in <code>retrieve()</code> — callers are
          cache-agnostic.
        </li>
        <li>
          <strong>Key + TTL discipline:</strong> the key must include everything that varies the
          response; TTL matches volatility; never cache executions.
        </li>
      </ul>
    </div>
  );
}
