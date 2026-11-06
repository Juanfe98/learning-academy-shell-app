import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import {
  ArticleTable,
  InterviewPlaybook,
  InterviewChallenge,
  SolutionReveal,
  CodeBlock,
} from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const bridgeDiagram = String.raw`flowchart LR
  JOTAI["Jotai: dataInterfaceAtom<br/>(tenant API impl)"]
  HOOK["Query/mutation hook<br/>useAtomValue(dataInterfaceAtom)"]
  RQ["React Query<br/>useQuery / useMutation"]
  NET["Backend (Flex / SDK)"]
  JOTAI --> HOOK
  HOOK --> RQ
  RQ -->|"queryFn calls dataInterface.*"| NET
  NET -->|"data"| RQ
  RQ -->|"cached, gated, selected"| COMP["Component"]`;

const errorDiagram = String.raw`flowchart TD
  ERR["A query/mutation throws"]
  ERR --> META{"meta.owner set?"}
  META -->|"yes"| OWNED["datadogRum.addError<br/>tagged with owner"]
  META -->|"no"| UNOWNED["datadogRum.addError<br/>'Unowned ... error'"]
  OWNED --> BOUND{"useErrorBoundary?"}
  UNOWNED --> BOUND
  BOUND -->|"true"| EB["nearest PageErrorBoundary"]
  BOUND -->|"false"| SILENT["handled in-hook / defaults"]`;

const gatingDiagram = String.raw`sequenceDiagram
  participant A as useIsLoggedIn (query A)
  participant B as useAccountOnboardingStatus (query B)
  A-->>B: isLoggedIn resolves
  Note over B: enabled: Boolean(isLoggedIn)
  B->>B: only NOW does query B run
  B->>B: select derives a boolean from data`;

export const toc: TocItem[] = [
  { id: "why", title: "Why This Matters", level: 2 },
  { id: "role", title: "React Query's Role: Server State", level: 2 },
  { id: "provider", title: "The QueryClient and Its Global Error Net", level: 2 },
  { id: "bridge", title: "The Data-Interface Bridge", level: 2 },
  { id: "query", title: "The useQuery Idiom", level: 2 },
  { id: "gating", title: "Gating and Chaining with enabled", level: 3 },
  { id: "select", title: "Deriving with select", level: 3 },
  { id: "mutation", title: "The useMutation Idiom", level: 2 },
  { id: "meta-owner", title: "meta.owner: Ownership-Tagged Errors", level: 2 },
  { id: "query-params", title: "URL State Is Not Server State", level: 2 },
  { id: "version", title: "A Note on react-query v3", level: 2 },
  { id: "interview", title: "Interview Framing", level: 2 },
  { id: "challenge", title: "Challenge: A Query That Never Runs", level: 2 },
  { id: "takeaways", title: "Key Takeaways", level: 2 },
];

export default function ReactQueryServerState() {
  return (
    <div className="article-content">
      <p>
        Anything fetched from or written to a backend goes through <strong>React Query</strong> —
        always via the tenant-specific data interface. This module covers the commerce-base idioms:
        how the <code>QueryClient</code> is configured with a global error net, how every hook bridges
        from Jotai&apos;s <code>dataInterfaceAtom</code> to the network, and the conventions (
        <code>enabled</code>, <code>select</code>, <code>meta.owner</code>) that make the difference
        between a query that works and one that silently never runs.
      </p>

      <h2 id="why">Why This Matters</h2>
      <p>
        &quot;My data isn&apos;t loading&quot; is the most common support question, and 90% of the
        time the answer is a gating condition (<code>enabled</code>) or a missing data-interface
        hydration. Understanding the standard hook shape lets you spot the problem in the hook
        signature without stepping through a debugger.
      </p>

      <h2 id="role">React Query&apos;s Role: Server State</h2>
      <p>
        React Query is the <strong>async server-state</strong> layer, distinct from Jotai (synchronous
        client state) and XState (flow state). <code>useQuery</code> for reads, <code>useMutation</code>{" "}
        for writes — and both reach the backend exclusively through the data interface. The provider
        sits just inside Jotai in <code>_app.page.tsx</code>: <code>JotaiProvider</code> →{" "}
        <code>QueryProvider</code> → page.
      </p>

      <h2 id="provider">The QueryClient and Its Global Error Net</h2>
      <p>
        <code>common/context/query-client.tsx</code> builds the client. The distinctive part is a
        global <code>QueryCache</code> + <code>MutationCache</code> <code>onError</code> that routes{" "}
        <em>every</em> error to Datadog RUM, keyed on <code>meta.owner</code>:
      </p>
      <CodeBlock
        lang="tsx"
        filename="common/context/query-client.tsx"
        code={`export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { refetchOnWindowFocus: false } },
    mutationCache: new MutationCache({
      onError: (error, _variables, _context, mutation) => {
        const { meta, options } = mutation;
        if (!meta?.owner) {
          datadogRum.addError(error, {
            mutationKey: options.mutationKey,
            message: \`Unowned mutation error in mutation. (mutationKey: "\${options.mutationKey}")\`,
          });
        }
        // ...owned-error path tags with meta.owner...
      },
    }),
    queryCache: new QueryCache({
      onError: (error, query) => { datadogRum.addError(error, { /* ... */ }); },
    }),
  });
}

export const queryClient = createQueryClient();

export function QueryProvider({ children, client }) {
  return <QueryClientProvider client={client ?? queryClient}>{children}</QueryClientProvider>;
}`}
      />
      <p>
        Two things follow from this. First, <strong>errors are centralized</strong> — you rarely
        write per-hook error logging; you set <code>meta.owner</code> and the cache handler does the
        rest. Second, there&apos;s a module singleton <code>queryClient</code>, but{" "}
        <strong>tests must call <code>createQueryClient()</code> per render</strong> (or pass one via
        the provider) for isolation — an ESLint rule bans importing the singleton into tests to
        prevent cross-suite state pollution.
      </p>

      <h2 id="bridge">The Data-Interface Bridge</h2>
      <p>
        Every hook reads the tenant API from the Jotai atom, then calls it from{" "}
        <code>queryFn</code>/<code>mutationFn</code>. This is the bridge from synchronous client state
        (which <em>holds</em> the API implementation) to async server state (which <em>uses</em> it):
      </p>
      <MermaidDiagram
        chart={bridgeDiagram}
        title="From Jotai atom to the network"
        caption="The hook reads dataInterfaceAtom (hydrated per brand), then React Query wraps the call. Disney uses the SDK; Hulu uses HTTP — the hook is unaware which."
        minHeight={320}
      />

      <h2 id="query">The useQuery Idiom</h2>
      <p>
        A representative read — <code>identity/queries/use-account-onboarding-status.ts</code>:
      </p>
      <CodeBlock
        lang="typescript"
        filename="use-account-onboarding-status.ts"
        code={`export function useAccountOnboardingStatus() {
  const { data: isLoggedIn } = useIsLoggedIn();
  const dataInterface = useAtomValue(dataInterfaceAtom);

  return useQuery({
    queryKey: ['dataInterface', 'getAccountOnboardingStatus'],
    queryFn: async () => {
      const { data, errors } = await dataInterface.getAccountOnboardingStatus();
      if (data === null) throw new Error(errors[0].message, { cause: errors });
      return data;
    },
    select: selectRequiresContentOnboarding, // derive a boolean
    meta: { errorMessage: '...', owner: Owners.PROFILES },
    enabled: Boolean(isLoggedIn),             // gate on another query
  });
}`}
      />
      <p>
        This one hook demonstrates four repo idioms at once: <code>queryKey</code> prefixed with{" "}
        <code>&apos;dataInterface&apos;</code>, the data interface read from the atom,{" "}
        <code>select</code> to derive a value, and <code>enabled</code> to chain on another query.
      </p>

      <h3 id="gating">Gating and Chaining with enabled</h3>
      <p>
        <code>enabled: Boolean(isLoggedIn)</code> means this query <strong>does not run</strong> until
        the login query resolves truthy. This chaining is everywhere in commerce-base — a query that
        needs auth, session, or location first is gated on that upstream query&apos;s result.
      </p>
      <MermaidDiagram
        chart={gatingDiagram}
        title="Query chaining via enabled"
        caption="Query B stays idle until query A resolves and its enabled condition flips true. A query stuck 'not running' almost always has an enabled that never becomes true."
        minHeight={280}
      />

      <h3 id="select">Deriving with select</h3>
      <p>
        <code>select</code> transforms the cached data before it reaches the component (here, a full
        onboarding-status object becomes a single boolean). It runs on every read but doesn&apos;t
        change what&apos;s cached — the right place for &quot;I only need one derived value from this
        response.&quot;
      </p>

      <h2 id="mutation">The useMutation Idiom</h2>
      <p>
        Writes follow the same bridge. From{" "}
        <code>payments/payment-forms/queries/use-create-braintree-payment-method-mutation.ts</code>:
      </p>
      <CodeBlock
        lang="typescript"
        filename="use-create-braintree-payment-method-mutation.ts"
        code={`export function useCreateBraintreePaymentMethodMutation() {
  const dataInterface = useAtomValue(dataInterfaceAtom);

  return useMutation({
    mutationKey: ['dataInterface.flexExecution.paypalCreatePaymentMethod'],
    meta: { owner: Owners.TAP, errorMessage: 'Create paypal payment method mutation execution failed.' },
    mutationFn: async ({ paymentDetails }) => {
      const params: FlexExecutionOptions = {
        key: 'paypalCreatePaymentMethod',
        version: 'v1',
        requestBody: paymentDetails,
      };
      return dataInterface.flexExecution<BraintreePaymentMethodData>(params);
    },
    useErrorBoundary: (error) => { datadogRum.addError(error, {}); return false; },
  });
}`}
      />
      <p>
        Note <code>flexExecution</code> is the write-side data-interface method (screens are reads,
        executions are writes — mirroring the Flex BFF&apos;s screens-vs-executions split). Mutations
        that need caller-supplied <code>onSuccess</code>/<code>onError</code> accept{" "}
        <code>options?: UseMutationOptions&lt;...&gt;</code> and spread <code>...options</code> last.
      </p>

      <h2 id="meta-owner">meta.owner: Ownership-Tagged Errors</h2>
      <p>
        Every hook passes <code>meta: {"{ owner: Owners.X, errorMessage: '...' }"}</code>. The global
        cache handler uses <code>owner</code> to route the Datadog error to the right team; an
        <strong> unowned</strong> error is logged with a distinct &quot;Unowned … error&quot; message
        so it gets noticed and tagged.
      </p>
      <MermaidDiagram
        chart={errorDiagram}
        title="How a query/mutation error is handled"
        caption="Owner tagging routes errors to the right team; useErrorBoundary decides whether the error surfaces to a PageErrorBoundary or is handled quietly with defaults."
        minHeight={360}
      />
      <p>
        <code>useErrorBoundary</code> controls surfacing: <code>true</code> throws to the nearest{" "}
        <code>PageErrorBoundary</code> (fatal-to-the-page data), a function decides case-by-case, and{" "}
        <code>false</code> keeps it quiet (like the Mystique-flags hook, which must degrade to
        defaults rather than crash).
      </p>

      <h2 id="query-params">URL State Is Not Server State</h2>
      <p>
        Two helpers manage URL query params — a different kind of state that&apos;s easy to conflate
        with React Query:
      </p>
      <ArticleTable
        caption="URL-state helpers (not React Query)."
        minWidth={820}
      >
        <table>
          <thead>
            <tr>
              <th>Helper</th>
              <th>Does</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>useCommerceQueryParams()</code></td>
              <td>Normalizes ~80 known commerce URL params into one typed object, coercing/sanitizing each</td>
            </tr>
            <tr>
              <td><code>useParsedQueryParams(schema)</code></td>
              <td>Zod-validates <code>router.query</code>, logs parse failures to Datadog, returns typed data</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>
      <p>
        These read from <code>useRouter()</code>, not the network. Keep the mental separation:{" "}
        <strong>React Query = server state; these = URL state; Jotai = client state.</strong>
      </p>

      <h2 id="version">A Note on react-query v3</h2>
      <p>
        commerce-base uses <strong>react-query v3</strong> — imports come from{" "}
        <code>&apos;react-query&apos;</code>, not <code>&apos;@tanstack/react-query&apos;</code>. The
        option shapes (object-form <code>useQuery({"{ queryKey, queryFn, ... }"})</code>) match v3.
        When reading external docs, make sure you&apos;re looking at the right major version — v4/v5
        renamed and moved several options.
      </p>

      <h2 id="interview">Interview Framing</h2>
      <InterviewPlaybook
        title="How to answer: 'How does data fetching work in commerce-base?'"
        intro="Lead with the server-state role, then the data-interface bridge, then the conventions that trip people up."
        steps={[
          "React Query is the async server-state layer (reads via useQuery, writes via useMutation), sitting just inside JotaiProvider in _app.",
          "Every hook reads the tenant API from useAtomValue(dataInterfaceAtom) and calls it in queryFn/mutationFn — the bridge from Jotai (holds the impl) to the network (uses it).",
          "Conventions: queryKey prefixed 'dataInterface', enabled to gate/chain on upstream queries, select to derive values, meta.owner for centralized Datadog error routing.",
          "The QueryClient has a global QueryCache/MutationCache onError that logs every error by owner; useErrorBoundary decides whether it surfaces to a PageErrorBoundary or degrades to defaults.",
          "Distinguish server state (React Query) from URL state (useCommerceQueryParams/useParsedQueryParams) from client state (Jotai). And note it's react-query v3.",
        ]}
      />

      <h2 id="challenge">Challenge: A Query That Never Runs</h2>
      <InterviewChallenge
        title="The subscription data never loads on the account page"
        scenario={
          <>
            On the account page, a <code>useQuery</code> for subscription data never fires — no
            network request, no error, the component sits in its loading state forever. There are no
            console errors. Diagnose the likely causes in order of probability using the commerce-base
            query idioms.
          </>
        }
        tasks={[
          "List the most likely reasons a query silently never runs (no error, no request).",
          "Explain how you'd verify the data interface is actually hydrated.",
          "Describe how enabled chaining could leave this query permanently idle.",
          "State where you'd look in Datadog and why you might see nothing there.",
        ]}
        pitfalls={[
          "Assuming a network/backend problem when no request was ever made.",
          "Overlooking an enabled condition gated on an upstream query that itself never resolves.",
          "Expecting a Datadog error when the query never threw — it just never ran.",
        ]}
        signal="A strong answer starts with enabled (a false/never-true gate), then checks that dataInterfaceAtom is hydrated (else the guard atom would throw — a clue), recognizes that a query that never RUNS produces no error and thus nothing in Datadog, and traces the upstream query the enabled condition depends on."
      />
      <SolutionReveal difficulty="medium">
        <p>
          &quot;No request, no error, stuck loading&quot; is the signature of an <code>enabled</code>{" "}
          condition that never becomes true — the most likely cause. Trace what{" "}
          <code>enabled</code> depends on (often <code>useIsLoggedIn</code>, <code>useSessionInfo</code>,
          or location readiness); if that upstream query itself never resolves, this one stays idle
          forever.
        </p>
        <p>
          Also confirm the data interface is hydrated: if it weren&apos;t, reading{" "}
          <code>dataInterfaceAtom</code> would <em>throw</em> (the guard atom), so a silent hang
          actually points <em>away</em> from a hydration problem and toward gating. Finally,
          Datadog will show nothing here because the query never threw — the global{" "}
          <code>onError</code> only fires on actual failures, and a query that never runs never fails.
          The fix is almost always correcting or unblocking the <code>enabled</code> chain.
        </p>
      </SolutionReveal>

      <h2 id="takeaways">Key Takeaways</h2>
      <ul>
        <li>
          <strong>React Query = server state.</strong> Reads (<code>useQuery</code>) and writes (
          <code>useMutation</code>), inside <code>JotaiProvider</code>.
        </li>
        <li>
          <strong>The data-interface bridge.</strong> Every hook reads{" "}
          <code>useAtomValue(dataInterfaceAtom)</code> then calls it in{" "}
          <code>queryFn</code>/<code>mutationFn</code>.
        </li>
        <li>
          <strong>Key conventions.</strong> <code>enabled</code> to gate/chain, <code>select</code> to
          derive, <code>meta.owner</code> for centralized Datadog errors.
        </li>
        <li>
          <strong>Global error net.</strong> The <code>QueryClient</code> logs all errors by owner;{" "}
          <code>useErrorBoundary</code> decides surfacing.
        </li>
        <li>
          <strong>A stuck query is usually <code>enabled</code>.</strong> No request + no error =
          a gate that never flips true.
        </li>
      </ul>
    </div>
  );
}
