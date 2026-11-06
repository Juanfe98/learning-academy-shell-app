import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import {
  ArticleTable,
  InterviewPlaybook,
  InterviewChallenge,
  SolutionReveal,
  CodeBlock,
} from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const tenancyDiagram = String.raw`flowchart TD
  subgraph shared["Shared once (commerce-base)"]
    LOGIC["pages, hooks, atoms,<br/>services, machines"]
  end
  subgraph vary["Varies per brand"]
    DATA["data-interface-{brand}<br/>(transport)"]
    TOKENS["design tokens / CSS"]
    LAYOUT["layout wrapper + footer"]
    ROUTES["Next.js routes"]
  end
  LOGIC --> D["Disney+"]
  LOGIC --> H["Hulu"]
  LOGIC --> E["ESPN+"]
  DATA --> D & H & E
  TOKENS --> D & H & E`;

const catalogDiagram = String.raw`flowchart TD
  WS["pnpm-workspace.yaml catalogs"]
  WS --> DEF["catalog:default (base)"]
  WS --> COM["catalog:commerce"]
  WS --> GRO["catalog:growth"]
  WS --> IDE["catalog:identity"]
  DEF --> PIN["one pinned version per dep"]
  COM --> OVR["team-specific overrides"]`;

const dimensionsDiagram = String.raw`flowchart LR
  REQ["A single request"]
  REQ --> BRAND["brand (PRODUCT / partnerName)"]
  REQ --> REGION["region (geo atom)"]
  REQ --> LANG["language (URL)"]
  REQ --> FLAGS["flags + experiments"]
  BRAND & REGION & LANG & FLAGS --> UI["the rendered experience"]`;

export const toc: TocItem[] = [
  { id: "why", title: "Why This Matters", level: 2 },
  { id: "monorepo", title: "The Monorepo Shape", level: 2 },
  { id: "catalogs", title: "Version Catalogs and Workspace Protocol", level: 2 },
  { id: "tenancy", title: "How Multi-Tenancy Actually Works", level: 2 },
  { id: "product", title: "PRODUCT: The Brand Selector", level: 3 },
  { id: "dimensions", title: "The Dimensions of Variation", level: 2 },
  { id: "partner", title: "partnerName: Brand at Runtime", level: 2 },
  { id: "boundaries", title: "Ownership Boundaries", level: 2 },
  { id: "interview", title: "Interview Framing", level: 2 },
  { id: "challenge", title: "Challenge: Ship a Brand-Specific Behavior", level: 2 },
  { id: "takeaways", title: "Key Takeaways", level: 2 },
];

export default function MonorepoAndMultiTenancy() {
  return (
    <div className="article-content">
      <p>
        commerce-base serves three brands from one codebase. That&apos;s only possible because of two
        structural decisions: a <strong>monorepo</strong> that lets shared and brand code live and
        version together, and a <strong>multi-tenancy model</strong> that isolates what varies per
        brand behind a few well-defined seams. This module makes both concrete — how the repo is laid
        out, how versions are managed with pnpm catalogs, and exactly which dimensions of an
        experience vary (brand, region, language, flags) and how each is selected.
      </p>

      <h2 id="why">Why This Matters</h2>
      <p>
        The recurring question in commerce work is &quot;does this apply to all brands or just one?&quot;
        — and the answer determines where your code goes. Understanding the tenancy seams (data
        interface, tokens, layout, routes) and the selection mechanisms (<code>PRODUCT</code>,{" "}
        <code>partnerName</code>, region) is what lets you place a change correctly the first time.
      </p>

      <h2 id="monorepo">The Monorepo Shape</h2>
      <p>
        cgi-web is a pnpm + Turbo monorepo. The parts relevant to commerce:
      </p>
      <ArticleTable
        caption="The commerce-relevant workspace layout."
        minWidth={840}
      >
        <table>
          <thead>
            <tr>
              <th>Path</th>
              <th>What it is</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>apps/commerce/{"{disneyPlus,hulu,espn}"}</code></td>
              <td>Brand apps — the runnable Next.js units</td>
            </tr>
            <tr>
              <td><code>packages/cgi/commerce-base</code></td>
              <td>Shared commerce library (CUP V2)</td>
            </tr>
            <tr>
              <td><code>packages/cgi/data-interface-{"{disney,hulu,espn}"}</code></td>
              <td>Per-brand data transport implementations</td>
            </tr>
            <tr>
              <td><code>packages/cgi/cgi-design-tokens</code></td>
              <td>Per-brand CSS custom properties (colors, type, spacing)</td>
            </tr>
            <tr>
              <td><code>packages/cgi/sdk-session</code></td>
              <td>Session + access-token management (<code>getAccessToken()</code>)</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>
      <p>
        Internal packages are named <code>@solo/*</code> and referenced via the workspace protocol.
        The monorepo lets a change to a shared package and its consumers land in one PR, with Turbo
        rebuilding only what&apos;s affected.
      </p>

      <h2 id="catalogs">Version Catalogs and Workspace Protocol</h2>
      <p>
        Dependencies are pinned centrally through <strong>pnpm catalogs</strong> in{" "}
        <code>pnpm-workspace.yaml</code>, with team-specific overrides layered on the base:
      </p>
      <MermaidDiagram
        chart={catalogDiagram}
        title="pnpm version catalogs"
        caption="A base catalog pins one version per dependency; team catalogs (commerce, growth, identity) override where a team needs a different version. This keeps versions consistent without a single global lockstep."
        minHeight={320}
      />
      <ArticleTable
        caption="Catalog and workspace-protocol reference."
        minWidth={820}
      >
        <table>
          <thead>
            <tr>
              <th>Syntax</th>
              <th>Meaning</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>catalog:default</code></td>
              <td>Base versions for the whole monorepo</td>
            </tr>
            <tr>
              <td><code>catalog:commerce</code></td>
              <td>Commerce team version overrides</td>
            </tr>
            <tr>
              <td><code>workspace:*</code></td>
              <td>Any version of an internal package</td>
            </tr>
            <tr>
              <td><code>workspace:^</code> / <code>workspace:~</code></td>
              <td>Caret / tilde range for an internal package</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>
      <p>
        When you add a dependency, you reference the catalog rather than pinning a version inline —
        this is why upgrading a shared library is a catalog edit, not a hunt across dozens of{" "}
        <code>package.json</code> files. (Adding dependencies is a change-controlled action; follow
        the repo&apos;s approval conventions.)
      </p>

      <h2 id="tenancy">How Multi-Tenancy Actually Works</h2>
      <p>
        The model is simple to state: <strong>write the logic once, isolate what varies behind
        seams.</strong>
      </p>
      <MermaidDiagram
        chart={tenancyDiagram}
        title="Shared once, varies per brand"
        caption="Pages/hooks/state/machines are shared. Only four things vary per brand: the data interface (transport), design tokens, the layout wrapper + footer, and the Next.js routes. Everything else is common."
        minHeight={400}
      />
      <ArticleTable
        caption="The four brand-variation seams."
        minWidth={840}
      >
        <table>
          <thead>
            <tr>
              <th>Seam</th>
              <th>How it varies</th>
              <th>From the earlier modules</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Data transport</td>
              <td><code>data-interface-{"{brand}"}</code> (SDK vs HTTP)</td>
              <td>Data-interface pattern</td>
            </tr>
            <tr>
              <td>Styling</td>
              <td>Per-brand design tokens / CSS</td>
              <td>—</td>
            </tr>
            <tr>
              <td>Chrome</td>
              <td>Brand layout wrapper + footer</td>
              <td>Page flow &amp; layouts</td>
            </tr>
            <tr>
              <td>Routing</td>
              <td>Next.js routes decorate base pages</td>
              <td>Page flow &amp; layouts</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h3 id="product">PRODUCT: The Brand Selector</h3>
      <p>
        At build/dev time, the <code>PRODUCT</code> env var selects the brand. It flows through{" "}
        <code>getProductNameForMocks()</code> (default <code>disneyPlus</code>) to pick tenant config
        and dictionary fixtures, and <code>next.config.js</code> bridges it to the client in non-prod
        via <code>publicRuntimeConfig.productNameForMocks</code>. In production, the real config is
        used rather than fixtures.
      </p>
      <CodeBlock
        lang="bash"
        filename="brand selection"
        code={`PORT=5030 PRODUCT=hulu next dev     # run the Hulu tenant
PRODUCT=disneyPlus jest --coverage  # test defaults to the Disney+ tenant`}
      />

      <h2 id="dimensions">The Dimensions of Variation</h2>
      <p>
        A single request is shaped by <strong>four independent dimensions</strong>. Confusing them is
        the root of many bugs — &quot;it works for Disney US in English&quot; is four assumptions, not
        one.
      </p>
      <MermaidDiagram
        chart={dimensionsDiagram}
        title="Four dimensions shape every experience"
        caption="Brand, region, language, and flags/experiments are orthogonal. The rendered UI is their product — always ask which dimension a bug is actually scoped to."
        minHeight={300}
      />
      <ArticleTable
        caption="The four dimensions and how each is selected."
        minWidth={840}
      >
        <table>
          <thead>
            <tr>
              <th>Dimension</th>
              <th>Selected by</th>
              <th>Module</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Brand</td>
              <td><code>PRODUCT</code> (build) / <code>partnerName</code> (runtime)</td>
              <td>This module</td>
            </tr>
            <tr>
              <td>Region</td>
              <td><code>regionAtom</code> (derived: home ?? physical)</td>
              <td>Region &amp; globalization</td>
            </tr>
            <tr>
              <td>Language</td>
              <td>URL segment (e.g. <code>/es-419/...</code>)</td>
              <td>Dictionary &amp; i18n</td>
            </tr>
            <tr>
              <td>Flags / experiments</td>
              <td>Mystique (<code>wpnx-*</code>) + commerce config</td>
              <td>Feature flags / Experiments</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="partner">partnerName: Brand at Runtime</h2>
      <p>
        <code>PRODUCT</code> picks the brand at build/dev time, but shared code often needs the brand{" "}
        <em>at runtime</em> — and that comes from <code>partnerName</code> on the session info (
        <code>useSessionInfo().data?.partnerName</code>). You saw this in the experiments module: the
        productionalized card-number-first rule keys off it:
      </p>
      <CodeBlock
        lang="tsx"
        filename="runtime brand check"
        code={`const partnerName = useSessionInfo().data?.partnerName;
const shouldShowCardNumberFieldFirst =
  partnerName === 'disney' || partnerName === 'espn';`}
      />
      <p>
        The distinction matters: <code>PRODUCT</code> is a build-time environment concern (which app
        am I compiling); <code>partnerName</code> is a runtime data concern (which brand is this
        session). Runtime brand branching in shared code uses <code>partnerName</code>.
      </p>

      <h2 id="boundaries">Ownership Boundaries</h2>
      <p>
        Multi-tenancy is paired with <strong>granular team ownership</strong> (via CODEOWNERS): the
        platform team owns <code>common/</code> and infra, Merch owns <code>signup/</code>, PayRet
        owns <code>payments/</code> + <code>retention/</code>, Profiles owns <code>profiles/</code>,
        and Experimentation owns experiment components/hooks. Because one file can serve three brands,
        a change ripples widely — <strong>check CODEOWNERS and consider all three brands</strong>{" "}
        before editing shared code. If you add a method to one brand&apos;s data interface, check
        whether the others need it too (the type forces consistency).
      </p>

      <h2 id="interview">Interview Framing</h2>
      <InterviewPlaybook
        title="How to answer: 'How does one codebase serve three brands?'"
        intro="Lead with the monorepo + shared-library shape, then the four variation seams, then the four request dimensions."
        steps={[
          "It's a pnpm + Turbo monorepo: brand apps (apps/commerce/*) are runnable units; commerce-base is the shared library; per-brand packages (data-interface-*, design-tokens) supply what varies.",
          "Versions are managed with pnpm catalogs (default + team overrides) and internal packages use the workspace: protocol.",
          "Multi-tenancy = write logic once, isolate variation behind four seams: data interface (transport), design tokens, layout wrapper/footer, and Next.js routes.",
          "PRODUCT selects the brand at build/dev (default disneyPlus, bridged to client via next.config in non-prod); partnerName from the session is the runtime brand check in shared code.",
          "Every experience is shaped by four orthogonal dimensions — brand, region, language, flags — so always ask which dimension a bug is scoped to, and check CODEOWNERS before editing shared code.",
        ]}
      />

      <h2 id="challenge">Challenge: Ship a Brand-Specific Behavior</h2>
      <InterviewChallenge
        title="A feature must behave differently on ESPN+ than on Disney+ and Hulu"
        scenario={
          <>
            Product wants a checkout step reordered, but only for ESPN+. The logic otherwise lives in
            shared commerce-base code used by all three brands. Decide how to implement the ESPN-only
            behavior without forking the shared component, and where the brand decision should be
            made.
          </>
        }
        tasks={[
          "Decide whether to branch on PRODUCT or partnerName, and justify it.",
          "Explain why forking the component per brand is the wrong move.",
          "Describe where the brand check lives and how the shared component stays shared.",
          "Note which of the four dimensions this is and what you'd verify for the other two brands.",
        ]}
        pitfalls={[
          "Using PRODUCT (build-time) for what is a runtime session concern.",
          "Copy-forking the shared component into a brand app, causing drift.",
          "Shipping the ESPN branch without confirming Disney+/Hulu behavior is unchanged.",
        ]}
        signal="A strong answer branches on partnerName (runtime session brand) inside the shared component, keeps the single shared implementation with a conditional, avoids forking, recognizes this is the 'brand' dimension, and verifies Disney+/Hulu still get the original order."
      />
      <SolutionReveal difficulty="medium">
        <p>
          Branch on <strong><code>partnerName</code></strong>, not <code>PRODUCT</code>: this is a
          runtime concern (which brand&apos;s session is rendering), and shared code reads the brand
          from <code>useSessionInfo().data?.partnerName</code>. <code>PRODUCT</code> is a build-time
          env var — wrong tool for a per-session decision.
        </p>
        <p>
          Keep the component shared and add a conditional:{" "}
          <code>const isEspn = partnerName === &apos;espn&apos;</code>, then reorder the step when{" "}
          <code>isEspn</code>. <strong>Don&apos;t fork</strong> the component into the ESPN app — a
          fork immediately starts drifting from the Disney+/Hulu version and defeats the entire
          shared-library premise. This is purely the <em>brand</em> dimension, so region, language,
          and flags are unaffected — but you must confirm Disney+ and Hulu still render the original
          order (the conditional&apos;s <code>else</code> path), ideally with tests covering both
          branches to satisfy the 100% coverage gate.
        </p>
      </SolutionReveal>

      <h2 id="takeaways">Key Takeaways</h2>
      <ul>
        <li>
          <strong>pnpm + Turbo monorepo.</strong> Brand apps are runnable; commerce-base + per-brand
          packages are shared/varying pieces; internal packages use <code>workspace:</code>.
        </li>
        <li>
          <strong>Catalogs pin versions.</strong> <code>catalog:default</code> plus team overrides in{" "}
          <code>pnpm-workspace.yaml</code>.
        </li>
        <li>
          <strong>Four variation seams.</strong> Data interface, design tokens, layout/footer,
          routes. Everything else is shared.
        </li>
        <li>
          <strong>PRODUCT vs partnerName.</strong> Build-time brand selection vs runtime brand check.
        </li>
        <li>
          <strong>Four request dimensions.</strong> Brand, region, language, flags — orthogonal;
          always scope a bug to the right one and check CODEOWNERS.
        </li>
      </ul>
    </div>
  );
}
