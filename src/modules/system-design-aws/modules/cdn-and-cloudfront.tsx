import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { CodeBlock, ArticleTable, InterviewPlaybook, InterviewChallenge, SolutionReveal } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const problemDiagram = String.raw`flowchart LR
    subgraph World["Users everywhere"]
      TK["User in Tokyo"]
      LD["User in London"]
      SP["User in São Paulo"]
    end
    ORIGIN["Single server<br/>Virginia (us-east-1)"]
    TK -->|"~150ms each way"| ORIGIN
    LD -->|"~80ms each way"| ORIGIN
    SP -->|"~120ms each way"| ORIGIN
    ORIGIN -.->|"every request crosses<br/>the ocean again"| World`;

const cdnDiagram = String.raw`flowchart LR
    TK["User in Tokyo"]
    LD["User in London"]
    SP["User in São Paulo"]
    ETK["Edge: Tokyo"]
    ELD["Edge: London"]
    ESP["Edge: São Paulo"]
    ORIGIN["Origin server<br/>Virginia"]
    TK -->|"~10ms"| ETK
    LD -->|"~8ms"| ELD
    SP -->|"~12ms"| ESP
    ETK -.->|"only on cache miss"| ORIGIN
    ELD -.->|"only on cache miss"| ORIGIN
    ESP -.->|"only on cache miss"| ORIGIN`;

const cacheFlowDiagram = String.raw`flowchart TD
    REQ["Request hits edge node"]
    CHECK{"In edge cache<br/>and not expired?"}
    HIT["CACHE HIT<br/>serve from edge in ~10ms"]
    MISS["CACHE MISS"]
    FETCH["Fetch from origin"]
    STORE["Store copy at edge<br/>for TTL seconds"]
    SERVE["Serve to user"]
    REQ --> CHECK
    CHECK -->|yes| HIT --> SERVE
    CHECK -->|no| MISS --> FETCH --> STORE --> SERVE`;

const distributionDiagram = String.raw`flowchart TD
    USER["User request"]
    DIST["CloudFront Distribution"]
    B1{"URL pattern?"}
    S3["Origin: S3 bucket<br/>/static/* → cache 1 year"]
    ALB["Origin: ALB<br/>/api/* → no cache"]
    USER --> DIST --> B1
    B1 -->|"/static/*"| S3
    B1 -->|"/api/*"| ALB`;

export const toc: TocItem[] = [
  { id: "what-is-a-cdn", title: "What Is a CDN? (Start Here)", level: 2 },
  { id: "the-problem", title: "The Problem a CDN Solves", level: 2 },
  { id: "the-solution", title: "The Solution: Caching at the Edge", level: 2 },
  { id: "hit-vs-miss", title: "Cache Hit vs Cache Miss", level: 2 },
  { id: "cloudfront", title: "CloudFront: AWS's CDN", level: 2 },
  { id: "distribution", title: "Distributions, Origins & Behaviors", level: 2 },
  { id: "ttl-and-invalidation", title: "TTL & Cache Invalidation", level: 2 },
  { id: "edge-functions", title: "Running Code at the Edge", level: 2 },
  { id: "cdn-vs-lb", title: "CDN vs Load Balancer", level: 2 },
  { id: "interview-playbook", title: "Interview Playbook", level: 2 },
  { id: "challenge", title: "Challenge: Cache a SPA + API Correctly", level: 2 },
  { id: "common-mistakes", title: "Common Mistakes", level: 2 },
  { id: "portability", title: "Generic Concept vs AWS Implementation", level: 2 },
  { id: "takeaways", title: "Key Takeaways", level: 2 },
];

export default function CdnAndCloudFront() {
  return (
    <div className="article-content">
      <p>
        A <strong>CDN (Content Delivery Network)</strong> is a network of servers spread around the
        world that <strong>store copies of your content close to your users</strong>. Instead of
        every user fetching from your one server &mdash; possibly an ocean away &mdash; they fetch
        from a nearby copy. That is the whole idea in one sentence. The rest of this module builds
        the intuition from the ground up, because once the mental model clicks, CloudFront&apos;s
        knobs are just details.
      </p>

      <h2 id="what-is-a-cdn">What Is a CDN? (Start Here)</h2>
      <p>
        Imagine you run a library with exactly one copy of a popular book, in Virginia. A reader in
        Tokyo wants it. They mail a request across the Pacific, you mail the book back &mdash; days
        of travel for a book that thousands of people want to read. Now imagine you printed copies
        and placed one in a local library in Tokyo, London, and São Paulo. Readers walk to their
        local branch and get the book in minutes. <strong>That local branch is a CDN edge
        node.</strong> The book is your content. Virginia is your <strong>origin</strong>.
      </p>
      <p>
        A CDN works exactly like this for web content &mdash; images, JavaScript, CSS, videos, even
        whole HTML pages. The copies live at <strong>edge locations</strong> (AWS CloudFront has
        450+ of them globally), and users automatically connect to the nearest one.
      </p>

      <h2 id="the-problem">The Problem a CDN Solves</h2>
      <p>
        Without a CDN, every user talks to your single origin server. Physics sets a floor: data
        cannot travel faster than light, so a round trip from Tokyo to Virginia is ~150ms <em>each
        way</em> before your server does any work. Multiply that by every image, script, and
        stylesheet on the page and the site feels slow for anyone far from your server.
      </p>
      <MermaidDiagram
        chart={problemDiagram}
        title="The Problem: One Origin, Global Users"
        caption="Every request from every user crosses the same long distance to a single server. Distance becomes latency, and the origin carries 100% of the load."
        minHeight={380}
      />
      <p>
        Two problems, really: <strong>latency</strong> (far users wait) and <strong>load</strong>
        (the single origin handles every byte for everyone). A CDN attacks both at once.
      </p>

      <h2 id="the-solution">The Solution: Caching at the Edge</h2>
      <p>
        Put a copy of the content at edge nodes near users. Now the Tokyo user fetches from the Tokyo
        edge (~10ms), not Virginia (~150ms). And because the edge serves the copy, the origin only
        gets hit when the edge does not already have it. The origin&apos;s load drops dramatically.
      </p>
      <MermaidDiagram
        chart={cdnDiagram}
        title="The Solution: Copies at the Edge"
        caption="Solid lines are fast, local hops. The dotted lines to the origin happen rarely — only when the edge does not already hold a fresh copy."
        minHeight={400}
      />

      <h2 id="hit-vs-miss">Cache Hit vs Cache Miss</h2>
      <p>
        This is the single most important concept in CDNs. When a request reaches an edge node, one
        of two things happens:
      </p>
      <ul>
        <li><strong>Cache hit:</strong> the edge already has a fresh copy &rarr; it serves it
          immediately (~10ms). The origin never hears about this request.</li>
        <li><strong>Cache miss:</strong> the edge has no copy (or it expired) &rarr; the edge fetches
          from the origin, <em>stores a copy</em> for next time, and serves it. Slower, but only the
          first user pays the cost.</li>
      </ul>
      <MermaidDiagram
        chart={cacheFlowDiagram}
        title="Cache Hit vs Miss Decision"
        caption="The first request for a piece of content is a miss and warms the cache; subsequent requests within the TTL are fast hits."
        minHeight={440}
      />
      <p>
        The fraction of requests served from cache is the <strong>cache hit ratio</strong>. A high
        ratio (say 95%) means 95% of requests never touch your origin &mdash; that is the entire
        value proposition. Your job when configuring a CDN is to make as much content cacheable as
        safely possible.
      </p>

      <h2 id="cloudfront">CloudFront: AWS&apos;s CDN</h2>
      <p>
        <strong>CloudFront</strong> is AWS&apos;s CDN, with 450+ edge locations. It also terminates
        TLS at the edge (so the expensive HTTPS handshake happens ~10ms away instead of across the
        ocean) and integrates with AWS WAF and Shield for DDoS protection at the edge &mdash; bad
        traffic is blocked before it ever reaches your origin.
      </p>

      <h2 id="distribution">Distributions, Origins &amp; Behaviors</h2>
      <p>
        Three terms cover almost everything in CloudFront:
      </p>
      <ul>
        <li><strong>Distribution:</strong> one CloudFront configuration (one domain like
          <code>d123.cloudfront.net</code> or your custom domain). It owns origins and behaviors.</li>
        <li><strong>Origin:</strong> where CloudFront fetches from on a cache miss &mdash; an S3
          bucket, an ALB, an API Gateway, or any HTTP server.</li>
        <li><strong>Behavior:</strong> a rule matching a URL pattern to an origin <em>and</em> a
          caching policy. This is how one distribution serves cached static files <em>and</em>
          forwards dynamic API calls.</li>
      </ul>
      <MermaidDiagram
        chart={distributionDiagram}
        title="One Distribution, Multiple Behaviors"
        caption="Behaviors let a single CloudFront distribution cache static assets aggressively while passing API traffic straight through with no caching."
        minHeight={380}
      />

      <h2 id="ttl-and-invalidation">TTL &amp; Cache Invalidation</h2>
      <p>
        <strong>TTL</strong> (time to live) controls how long an edge keeps a copy before treating it
        as stale. Long TTL = more hits, but changes take longer to appear. The hard question is:
        <em>how do you push a new version when the edge is still serving the old one?</em>
      </p>
      <p>Two strategies, and the second is strongly preferred:</p>
      <ul>
        <li><strong>Invalidation:</strong> explicitly tell CloudFront to drop cached copies of
          certain paths. Works, but the first 1,000 paths/month are free and it costs after that, and
          it has propagation lag.</li>
        <li><strong>Content-addressed filenames:</strong> include a hash of the content in the
          filename (<code>main.a1b2c3.js</code>). A new build produces a new filename, so the CDN
          treats it as brand-new content &mdash; no invalidation needed. The HTML referencing these
          files gets a short TTL (or is invalidated) so it always points at the latest hashed assets.</li>
      </ul>
      <CodeBlock code={`# Invalidate specific paths (use sparingly)
aws cloudfront create-invalidation \\
  --distribution-id E1234567890 \\
  --paths "/index.html"

# Preferred: hashed asset names need no invalidation
#   main.a1b2c3.js   → Cache-Control: max-age=31536000 (1 year)
#   index.html       → Cache-Control: max-age=60 (or no-cache)`} lang="bash" />

      <h2 id="edge-functions">Running Code at the Edge</h2>
      <p>
        Sometimes you want logic to run <em>at the edge</em> &mdash; rewriting a URL, checking an
        auth token, adding a security header &mdash; without a round trip to the origin. CloudFront
        offers two tools for this:
      </p>
      <ArticleTable
        caption="Reach for CloudFront Functions for tiny, fast string work; reach for Lambda@Edge when you need a real runtime, network access, or longer execution."
        minWidth={780}
      >
        <table>
          <thead>
            <tr>
              <th>Feature</th>
              <th>CloudFront Functions</th>
              <th>Lambda@Edge</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Runtime</td>
              <td>JavaScript (ES 5.1)</td>
              <td>Node.js, Python</td>
            </tr>
            <tr>
              <td>Max execution time</td>
              <td>~1ms</td>
              <td>5s (viewer), 30s (origin)</td>
            </tr>
            <tr>
              <td>Network / filesystem</td>
              <td>No</td>
              <td>Yes</td>
            </tr>
            <tr>
              <td>Typical use</td>
              <td>URL rewrite, header tweak, simple token check</td>
              <td>Auth with external calls, A/B testing, dynamic edge logic</td>
            </tr>
            <tr>
              <td>Cost</td>
              <td>$0.10 / 1M invocations</td>
              <td>$0.60 / 1M + duration</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="cdn-vs-lb">CDN vs Load Balancer</h2>
      <p>
        These get confused constantly. They solve <em>different</em> problems and you typically use
        both together.
      </p>
      <ArticleTable
        caption="A CDN fights geographic latency by caching; a load balancer fights capacity limits by spreading load across servers."
        minWidth={760}
      >
        <table>
          <thead>
            <tr>
              <th>Concern</th>
              <th>CDN (CloudFront)</th>
              <th>Load Balancer (ALB/NLB)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Primary job</td>
              <td>Cache content close to users</td>
              <td>Spread requests across backend servers</td>
            </tr>
            <tr>
              <td>Solves</td>
              <td>Latency + origin load (for cacheable content)</td>
              <td>Capacity + availability</td>
            </tr>
            <tr>
              <td>Location</td>
              <td>450+ edge nodes worldwide</td>
              <td>Inside one region</td>
            </tr>
            <tr>
              <td>Used together?</td>
              <td colSpan={2}>Yes — CloudFront in front of an ALB in front of many backend servers</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="interview-playbook">Interview Playbook</h2>
      <InterviewPlaybook
        title="How to Explain a CDN in an Interview"
        intro="The strongest answers define the problem (distance + load) before naming the tool, and never confuse a CDN with a load balancer."
        steps={[
          "Define it plainly: a CDN keeps copies of content at edge servers near users, so most requests never reach the origin.",
          "State the two problems it solves: geographic latency and origin load, both via the cache hit ratio.",
          "Walk a hit vs miss: a miss fetches from origin and warms the edge; later hits are fast and origin-free.",
          "Separate it from a load balancer: CDN solves distance by caching, a load balancer solves capacity by spreading requests — you use both.",
          "Finish with a real gotcha: never cache authenticated, user-specific responses, and use hashed filenames so deploys don't serve stale assets.",
        ]}
      />

      <h2 id="challenge">Challenge: Cache a SPA + API Correctly</h2>
      <InterviewChallenge
        title="One Distribution, Two Very Different Needs"
        scenario={
          <>
            You serve a React single-page app from S3 and a JSON API from an ALB, both behind one
            CloudFront distribution on <code>app.example.com</code>. Static assets are immutable and
            should be cached for a year; <code>index.html</code> changes every deploy; and
            <code>/api/*</code> returns per-user data that must never be cached. Design the caching.
          </>
        }
        tasks={[
          "Define the behaviors and the origin each maps to.",
          "Set a sensible TTL / Cache-Control for hashed assets, for index.html, and for /api/*.",
          "Explain how a new deploy reaches users without serving a stale index.html or stale JS.",
          "State exactly why /api/* must not be cached and what header enforces it.",
        ]}
        pitfalls={[
          "Caching /api/profile — one user's data gets served to another.",
          "A long TTL on index.html — users load old HTML pointing at JS files that no longer exist.",
        ]}
        signal="A strong answer ties behaviors + TTL + hashed filenames into a deploy that is both fast and always-fresh."
      />
      <SolutionReveal difficulty="medium">
        <p>
          Three behaviors on one distribution. <code>/static/*</code> &rarr; S3 origin, cached with
          <code>Cache-Control: max-age=31536000, immutable</code> &mdash; safe because every build
          produces new hashed filenames like <code>main.a1b2c3.js</code>, so a deploy is just new
          files the edge has never seen (instant freshness, no invalidation). <code>index.html</code>
          &rarr; S3, with <code>Cache-Control: max-age=60</code> (or no-cache + a deploy-time
          invalidation of <code>/index.html</code>) so it picks up the new hashed asset references
          quickly. <code>/api/*</code> &rarr; ALB origin with caching disabled and
          <code>Cache-Control: private, no-store</code>, because responses are authenticated and
          user-specific &mdash; caching them at a shared edge would leak one user&apos;s data to
          another. The deploy stays fast (assets are permanently cached) and always fresh (the
          short-lived HTML repoints to the new immutable assets).
        </p>
      </SolutionReveal>

      <h2 id="common-mistakes">Common Mistakes</h2>
      <ul>
        <li>
          <strong>Caching authenticated responses:</strong> caching <code>/api/profile</code> at a
          shared edge can serve one user&apos;s data to another. Use
          <code>Cache-Control: private, no-store</code> for anything user-specific.
        </li>
        <li>
          <strong>Long TTL on <code>index.html</code>:</strong> after a deploy, users get old HTML
          referencing JS/CSS that no longer exists. Keep it short or invalidate it on deploy.
        </li>
        <li>
          <strong>Letting users bypass CloudFront:</strong> if the ALB is publicly reachable, anyone
          can skip the CDN (and the WAF). Restrict the ALB to CloudFront&apos;s managed prefix list.
        </li>
        <li>
          <strong>Relying on invalidation for every deploy:</strong> it costs and lags. Hashed
          filenames make most invalidation unnecessary.
        </li>
      </ul>

      <h2 id="portability">Generic Concept vs AWS Implementation</h2>
      <p>
        CDNs are the most vendor-portable layer of all &mdash; the model is identical across
        CloudFront, Cloudflare, Fastly, and Akamai. Only the nouns change.
      </p>
      <ArticleTable
        caption="Cache hit/miss, TTL, and origin are universal; 'distribution' and 'behavior' are CloudFront's words for ideas every CDN has."
        minWidth={860}
      >
        <table>
          <thead>
            <tr>
              <th>Generic concept</th>
              <th>AWS (CloudFront)</th>
              <th>Equivalent elsewhere</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Cache hit / miss / hit ratio</td>
              <td>Same</td>
              <td>Identical everywhere</td>
            </tr>
            <tr>
              <td>Origin (source of truth on a miss)</td>
              <td>Origin</td>
              <td>Origin (universal term)</td>
            </tr>
            <tr>
              <td>CDN configuration unit</td>
              <td>Distribution</td>
              <td>Zone (Cloudflare), Service (Fastly)</td>
            </tr>
            <tr>
              <td>URL-pattern &rarr; origin + cache rule</td>
              <td>Behavior</td>
              <td>Page Rules / Rulesets (Cloudflare), VCL (Fastly)</td>
            </tr>
            <tr>
              <td>Tiny, fast edge code</td>
              <td>CloudFront Functions</td>
              <td>Cloudflare Workers, Fastly Compute@Edge</td>
            </tr>
            <tr>
              <td>Full-runtime edge code</td>
              <td>Lambda@Edge</td>
              <td>Cloudflare Workers, Vercel Edge Functions</td>
            </tr>
            <tr>
              <td>Force-refresh cached content</td>
              <td>Invalidation</td>
              <td>Purge (Cloudflare, Fastly, Akamai)</td>
            </tr>
            <tr>
              <td>TTL &amp; content-hashed filenames</td>
              <td>Same</td>
              <td>Identical everywhere</td>
            </tr>
            <tr>
              <td>DDoS / firewall at the edge</td>
              <td>Shield + WAF</td>
              <td>Built-in (Cloudflare), Akamai Kona</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="takeaways">Key Takeaways</h2>
      <ul>
        <li>A CDN keeps <strong>copies of content at edge nodes near users</strong> &mdash; most
          requests never reach the origin.</li>
        <li>It solves <strong>latency</strong> (distance) and <strong>origin load</strong>, measured
          by the <strong>cache hit ratio</strong>.</li>
        <li><strong>Hit</strong> = served from edge, fast, origin untouched; <strong>miss</strong> =
          fetched from origin and cached for next time.</li>
        <li>CloudFront uses <strong>distributions, origins, and behaviors</strong>; behaviors let one
          distribution cache static and pass through dynamic.</li>
        <li>Use <strong>hashed filenames</strong> over invalidation, and <strong>never cache
          authenticated</strong> responses.</li>
        <li>A CDN is <strong>not</strong> a load balancer &mdash; one fights distance, the other
          fights capacity. Use both.</li>
      </ul>
    </div>
  );
}
