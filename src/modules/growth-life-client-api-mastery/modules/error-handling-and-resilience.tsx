import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import {
  ArticleTable,
  InterviewPlaybook,
  InterviewChallenge,
  SolutionReveal,
  CodeBlock,
} from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const errorFlowDiagram = String.raw`flowchart TD
  THROW["Service/backend throws"]
  THROW --> BASE["BaseError subclass<br/>(ApplicationError: message, statusCode, name, logLevel)"]
  BASE --> MW{"which handler?"}
  MW -->|screen| EH["errorHandler<br/>log (by logLevel) → error response"]
  MW -->|execution ServiceError + metadata| EEH["executionErrorHandler<br/>→ invalidStateResponse<br/>(template or execution error response)"]
  MW -->|proxy| PEH["proxyErrorHandler"]
  EH --> RESP["client response"]
  EEH --> RESP
  PEH --> RESP`;

const observabilityDiagram = String.raw`flowchart LR
  ERR["error / event"]
  ERR --> LL{"logLevel"}
  LL -->|None| SKIP["not logged"]
  LL -->|warn/error| LOG["structured log<br/>(logObject attached)"]
  LOG --> SAMPLE["logWithSampling<br/>(rate-limit noisy logs)"]
  LOG --> MASK["mask PII fields<br/>maskValue → '*******'"]
  MASK --> DD["Datadog tracer + span tags"]`;

export const toc: TocItem[] = [
  { id: "posture", title: "The Resilience Posture", level: 2 },
  { id: "taxonomy", title: "The Error Taxonomy", level: 2 },
  { id: "application-error", title: "ApplicationError & addLogObject", level: 2 },
  { id: "handlers", title: "The Three Error Handlers", level: 2 },
  { id: "invalid-state", title: "Executions: invalidStateResponse", level: 3 },
  { id: "loglevel", title: "logLevel: Not Every Error Is Loud", level: 2 },
  { id: "observability", title: "Observability: Logging, Sampling, Masking, Datadog", level: 2 },
  { id: "degrade", title: "Graceful Degradation", level: 2 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "challenge", title: "Challenge: Handle a Failure Well", level: 2 },
  { id: "takeaways", title: "Key Takeaways", level: 2 },
];

export default function ErrorHandlingAndResilience() {
  return (
    <div className="article-content">
      <p>
        A BFF on the subscriber hot path fails constantly in small ways — a backend times out, a
        template is malformed, a header is missing, a subscription is in an unexpected state. What
        separates a robust service from a fragile one is not avoiding errors but <strong>handling
        them deliberately</strong>: a typed error taxonomy, middleware that maps errors to the right
        response, log levels that keep signal above noise, and graceful degradation so one failing
        backend doesn&apos;t take down a whole screen. This module covers all of it.
      </p>

      <h2 id="posture">The Resilience Posture</h2>
      <p>
        You&apos;ve already seen this posture twice: mirroring init is <em>fail-open</em> (module 2),
        and template fetch failures can fall back to hardcoded templates when available (module 4).
        Be precise, though: malformed raw templates raise <code>MalformedTemplateError</code>, and
        truly missing templates raise template-not-found internal errors. The principle throughout is:{" "}
        <strong>infrastructure and optional partial failures may degrade gracefully; genuinely
        unrecoverable states surface as mapped errors.</strong> Errors are typed, logged at an
        appropriate level, and mapped to a response shape the client can handle.
      </p>

      <h2 id="taxonomy">The Error Taxonomy</h2>
      <p>
        Client-facing application errors live under <code>src/domain/error/models/</code> and extend
        <code>ApplicationError</code>, which itself extends <code>BaseError</code> from{" "}
        <code>src/lib/errors/BaseError.ts</code>. Backend/service errors have their own classes under
        <code>src/backends/**/errors</code>, often extending shared service-error infrastructure.
        Each error carries the data ultimately exposed to the client and how it should be logged.
      </p>
      <ArticleTable
        caption="The error model hierarchy in src/domain/error/models/."
        minWidth={820}
      >
        <table>
          <thead>
            <tr><th>Error</th><th>Represents</th></tr>
          </thead>
          <tbody>
            <tr><td><code>ApplicationError</code></td><td>General app error; base for the client-facing ones</td></tr>
            <tr><td><code>BadRequestError</code></td><td>Invalid input (400)</td></tr>
            <tr><td><code>JoiValidationError</code></td><td>Joi schema validation failure (from routes)</td></tr>
            <tr><td><code>AjvValidationError</code></td><td>JSON-schema (Ajv) validation failure</td></tr>
            <tr><td><code>UnauthorizedError</code></td><td>Auth/session failure (401)</td></tr>
            <tr><td><code>NotFoundError</code></td><td>Missing resource (404)</td></tr>
            <tr><td><code>InternalServerError</code></td><td>Server-side failure (500)</td></tr>
            <tr><td><code>MissingJsonBodyError</code></td><td>Expected a JSON body, none present</td></tr>
            <tr><td><code>UnknownError</code></td><td>Fallback for anything unclassified</td></tr>
            <tr><td><code>invalidStateResponse</code></td><td>Builder/type for invalid execution states; returned by the execution error path, not an Error subclass</td></tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="application-error">ApplicationError &amp; addLogObject</h2>
      <p>
        <code>ApplicationError</code> is the archetype. It carries a <code>message</code>,{" "}
        <code>statusCode</code>, <code>name</code> (like <code>&quot;BAD_REQUEST_ERROR&quot;</code>),
        and a <code>logLevel</code>. Its <code>addLogObject()</code> method attaches arbitrary context
        for logs and <strong>returns <code>this</code> for chaining</strong> — the pattern you saw in
        the template fallback.
      </p>
      <CodeBlock
        lang="typescript"
        filename="src/domain/error/models/ApplicationError.ts (excerpt)"
        code={`class ApplicationError extends BaseError {
  protected logObject?: Record<string, unknown>;

  constructor({ message, statusCode, name, logLevel }: {
    message: string; statusCode: number; name: ErrorName; logLevel: LogLevel;
  }) {
    super({ message, logLevel, statusCode, name });
  }

  /** Attach context that shows up in logs; returns this for chaining. */
  addLogObject(logObject: Record<string, unknown>): ApplicationError {
    this.logObject = logObject;
    return this;
  }
}`}
      />
      <CodeBlock
        lang="typescript"
        filename="the chaining pattern in practice (templateService)"
        code={`throw new InternalServerError(ApplicationErrorCode.FallbackTemplateNotFound)
  .addLogObject({ fallbackLocation });`}
      />

      <h2 id="handlers">The Three Error Handlers</h2>
      <p>
        Errors don&apos;t map themselves — middleware does, and there are <strong>three</strong>, one
        per response family. This mirrors the screens/executions/proxy split from earlier modules.
      </p>
      <MermaidDiagram
        chart={errorFlowDiagram}
        title="A thrown error routes to the right handler"
        caption="Screen errors → errorHandler. Metadata-bearing execution ServiceErrors → executionErrorHandler invalid-state response. Proxy errors → proxyErrorHandler."
        minHeight={440}
      />
      <ArticleTable
        caption="The three error-handling middlewares."
        minWidth={800}
      >
        <table>
          <thead>
            <tr><th>Handler</th><th>Handles</th><th>Produces</th></tr>
          </thead>
          <tbody>
            <tr><td><code>errorHandler</code></td><td>Screen/general errors</td><td>An error response (status + body), after logging</td></tr>
            <tr><td><code>executionErrorHandler</code></td><td>Metadata-bearing execution <code>ServiceError</code>s</td><td>An <code>invalidStateResponse</code> — a processed template or execution error response with HTTP 200</td></tr>
            <tr><td><code>proxyErrorHandler</code></td><td>Proxy-route failures</td><td>Proxy-appropriate error response</td></tr>
          </tbody>
        </table>
      </ArticleTable>
      <p>
        The <code>errorHandler</code> is registered first inside <code>routes()</code> so — by the
        onion model — it wraps every downstream middleware and route. It logs the error (respecting
        its <code>logLevel</code>, and attaching <code>standardHeaders</code>/body/query for a{" "}
        <code>JoiValidationError</code>) and then emits the mapped response.
      </p>

      <h3 id="invalid-state">Executions: invalidStateResponse</h3>
      <p>
        Executions are special: some execution failures should not just 500 — the client often needs
        a <em>screen</em> or structured execution error back explaining the invalid state. The real{" "}
        <code>executionErrorHandler</code> catches <code>ServiceError</code> instances only when they
        carry <code>errorTemplateMetadata</code> or <code>errorResponseMetadata</code>; then it logs,
        builds the invalid-state body, and returns HTTP <code>200</code>. Other errors are rethrown
        to the top-level handler. Invalid-state templates are keyed by an{" "}
        <code>InvalidResponseConfigType</code> (e.g. <code>'cancel-subscription'</code>,{" "}
        <code>'switch-subscription'</code>, <code>'redeem-gift-card'</code>,{" "}
        <code>'zipcode'</code>, …). This is why, back in module 11, a guard could &quot;return an
        invalid response with no mutation&quot; — that invalid response is a real rendered response the
        user can act on.
      </p>

      <h2 id="loglevel">logLevel: Not Every Error Is Loud</h2>
      <p>
        Every error carries a <code>logLevel</code>. Crucially, one value is <code>None</code> —
        meaning <strong>don&apos;t log it at all</strong>. Some errors are expected control flow (a
        redirect, a known invalid state) and logging them would just create noise that buries real
        incidents. The handlers explicitly check <code>error.logLevel !== LogLevel.None</code> before
        writing anything. Choosing the right level for a new error is a real design decision, not an
        afterthought.
      </p>

      <h2 id="observability">Observability: Logging, Sampling, Masking, Datadog</h2>
      <p>
        Handling an error also means <em>seeing</em> it — without drowning in logs or leaking secrets.
        The <code>lib/</code> layer provides the tooling.
      </p>
      <MermaidDiagram
        chart={observabilityDiagram}
        title="From error to observable signal — safely"
        caption="logLevel gates whether it's logged; logWithSampling rate-limits noisy logs; mask redacts PII; Datadog gets traces and span tags."
        minHeight={360}
      />
      <ArticleTable
        caption="The observability tooling and what each solves."
        minWidth={820}
      >
        <table>
          <thead>
            <tr><th>Tool</th><th>Location</th><th>Solves</th></tr>
          </thead>
          <tbody>
            <tr><td><code>logger</code> (winston)</td><td><code>lib/logger.ts</code></td><td>Structured, leveled logging with a named source</td></tr>
            <tr><td><code>logWithSampling</code></td><td><code>lib/logWithSampling.ts</code></td><td>Rate-limits high-volume logs so hot paths don&apos;t flood</td></tr>
            <tr><td><code>mask</code> / <code>maskValue</code></td><td><code>middlewares/mask.ts</code></td><td>Redacts sensitive fields to <code>'*******'</code> in logged req/res</td></tr>
            <tr><td>Datadog (<code>tracer</code>, <code>featureFlagSpanTags</code>)</td><td><code>lib/datadog/</code></td><td>Distributed tracing + span tags (incl. which flags/experiments were active)</td></tr>
            <tr><td><code>datadogTags</code> middleware</td><td><code>middlewares/datadogTags.ts</code></td><td>Per-flow tagging (the v2 <code>createDatadogTagMiddleware</code> you saw)</td></tr>
          </tbody>
        </table>
      </ArticleTable>
      <p>
        <code>maskValue</code> is deliberately simple — it swaps named fields for{" "}
        <code>'*******'</code> before they reach a log. The point is a hard rule: <strong>secrets and
        PII must never hit the logs.</strong> This is the same instinct as{" "}
        <code>CLAUDE.md</code>&apos;s &quot;don&apos;t expose secrets&quot; — enforced in code.
      </p>

      <h2 id="degrade">Graceful Degradation</h2>
      <p>
        Tie it together with the failure modes from earlier modules. The service&apos;s standard moves
        when something goes wrong:
      </p>
      <ArticleTable
        caption="Failure → graceful response, across the service."
        minWidth={820}
      >
        <table>
          <thead>
            <tr><th>Failure</th><th>Graceful move</th></tr>
          </thead>
          <tbody>
            <tr><td>Template fetch failure</td><td>Warn + <code>loadFallbackForScreen()</code> when a hardcoded fallback exists</td></tr>
            <tr><td>Malformed raw template</td><td><code>MalformedTemplateError</code> so bad template deployments are visible</td></tr>
            <tr><td>Missing requested template</td><td>Template-not-found internal error with template configuration attached</td></tr>
            <tr><td>Mirroring/infra init fails at boot</td><td>Fail-open — log and continue serving</td></tr>
            <tr><td>Cache miss / cache down</td><td>Fall through to the real fetcher (cache is a speedup, not truth)</td></tr>
            <tr><td>Execution reaches invalid state</td><td><code>invalidStateResponse</code> — a rendered screen, not a raw 500</td></tr>
            <tr><td>Invalid request input</td><td><code>JoiValidationError</code> → 400 with details</td></tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="interview-framing">Interview Framing</h2>
      <InterviewPlaybook
        title="How to answer: 'How does this service handle failure?'"
        intro="Show the typed taxonomy, the three handlers, logLevel discipline, and graceful degradation."
        steps={[
          "State the posture: infra/optional partial failures may degrade gracefully; unrecoverable states surface as mapped errors.",
          "Describe the taxonomy: BaseError → ApplicationError and friends (BadRequest, Unauthorized, NotFound, InternalServer…), each with message/statusCode/name/logLevel and addLogObject for context.",
          "Name the three handlers: errorHandler (screens/general), executionErrorHandler for metadata-bearing ServiceErrors (→ invalidStateResponse), proxyErrorHandler — errorHandler registered first so it wraps everything.",
          "Explain logLevel including None (don't log expected control-flow errors), plus masking PII and sampling noisy logs, with Datadog tracing/span tags.",
          "Close with examples: template fetch fallback, fail-open mirroring, cache miss fall-through, invalidStateResponse for metadata-bearing ServiceErrors.",
        ]}
      />

      <h2 id="challenge">Challenge: Handle a Failure Well</h2>
      <InterviewChallenge
        title="A backend times out mid-screen"
        scenario={
          <>
            While building a screen, an optional recommendations backend intermittently times out.
            A colleague&apos;s code lets the error propagate, which 500s the entire screen — including
            the parts that <em>did</em> load. Redesign the handling: what error type, what log level,
            what the user should see, and how you keep the incident visible without flooding logs.
          </>
        }
        tasks={[
          "Decide whether this should crash the screen, and what the user sees instead.",
          "Choose how to represent/handle the timeout (throw vs degrade) and why.",
          "Pick a log level and justify it; explain how you avoid log-flooding if it happens often.",
          "State what must NOT appear in whatever you log.",
        ]}
        pitfalls={[
          "Letting an optional backend's failure 500 the whole screen.",
          "Logging every timeout at error level, flooding logs and burying real incidents.",
          "Logging the raw request with tokens/PII unmasked.",
          "Treating a recoverable partial failure as unrecoverable.",
        ]}
        signal="A strong answer degrades gracefully (omit the recommendations section, render the rest), logs at a modest level with sampling, masks PII, and reserves hard errors for unrecoverable states."
      />
      <SolutionReveal difficulty="medium">
        <p>
          A recommendations section is non-essential, so a timeout should <strong>degrade, not
          crash</strong>: catch it in the section builder, omit the recommendations section, and
          render everything else. The user sees a complete screen minus one optional module — far
          better than a 500 that hides the parts that loaded fine. This is the same graceful-
          degradation posture as template fallbacks and cache-miss fall-through.
        </p>
        <p>
          For visibility: log at <code>warn</code> (recoverable, expected-ish), not <code>error</code>{" "}
          — and if the timeout is frequent, route it through <code>logWithSampling</code> so it
          doesn&apos;t flood the logs and bury genuine incidents. Attach useful context via{" "}
          <code>addLogObject</code> (which section, which backend, latency), but{" "}
          <strong>mask</strong> anything sensitive — never log raw tokens, account identifiers, or
          headers unredacted. Reserve a thrown <code>InternalServerError</code> for a truly
          unrecoverable state (e.g. the primary offer fetch failing), not an optional add-on.
        </p>
      </SolutionReveal>

      <h2 id="takeaways">Key Takeaways</h2>
      <ul>
        <li>
          <strong>Posture:</strong> infra/optional partial failures may degrade gracefully; unrecoverable
          states become mapped errors.
        </li>
        <li>
          <strong>Typed taxonomy:</strong> <code>BaseError</code> → <code>ApplicationError</code> +
          BadRequest/Unauthorized/NotFound/InternalServer/Joi/Ajv…, each with statusCode, name,
          logLevel, and <code>addLogObject</code>.
        </li>
        <li>
          <strong>Three handlers:</strong> <code>errorHandler</code> (screens),{" "}
          <code>executionErrorHandler</code> (→ <code>invalidStateResponse</code> template),{" "}
          <code>proxyErrorHandler</code> — errorHandler first so it wraps everything.
        </li>
        <li>
          <strong><code>logLevel</code> matters</strong>, including <code>None</code>; use{" "}
          <code>logWithSampling</code> for noisy paths and <code>mask</code> to redact PII; Datadog
          gets traces + span tags.
        </li>
        <li>
          <strong>Graceful degradation where safe:</strong> template fetch fallback, fail-open mirroring,
          cache-miss fall-through, and invalid-state execution responses.
        </li>
      </ul>
    </div>
  );
}
