import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import {
  ArticleTable,
  InterviewPlaybook,
  InterviewChallenge,
  SolutionReveal,
  CodeBlock,
} from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const systemDiagram = String.raw`flowchart TD
  subgraph apps["Brand apps (Next.js Pages Router)"]
    D["commerce-disneyplus"]
    H["commerce-hulu"]
    E["commerce-espn"]
  end
  subgraph shared["@solo/commerce-base (this package)"]
    PAGES["Brand-agnostic pages<br/>(PlansPage, BillingPage...)"]
    HOOKS["Hooks, atoms, services"]
    LAYOUTS["Layouts + provider stack"]
  end
  subgraph di["Per-brand data interfaces"]
    DID["data-interface-disney (SDK)"]
    DIH["data-interface-hulu (HTTP)"]
    DIE["data-interface-espn"]
  end
  FLEX["Flex BFF<br/>(growth-life-client-api)"]

  D & H & E -->|"import @solo/commerce-base/src/..."| shared
  shared -->|"reads dataInterfaceAtom"| di
  di -->|"getFlexScreen / flexExecution"| FLEX`;

const ownershipDiagram = String.raw`flowchart LR
  CB["commerce-base/src"]
  CB --> COMMON["common/ (platform)"]
  CB --> SIGNUP["signup/ (merch)"]
  CB --> PAY["payments/ (payret)"]
  CB --> RET["retention/ (payret)"]
  CB --> ACC["account/"]
  CB --> ID["identity/"]
  CB --> PROF["profiles/ (profiles team)"]
  CB --> TRANS["transactional/"]`;

const importDiagram = String.raw`flowchart TD
  ROUTE["pages/commerce/plans/index.page.tsx<br/>(brand route)"]
  ROUTE -->|"import BasePlansPage"| BASE["@solo/commerce-base/src/signup/pages"]
  ROUTE -->|"attach getPageLayout"| LAYOUT["ApplicationLayout + DisneyLayout"]
  ROUTE -->|"export getServerSideProps"| GSSP["buildGetServerSideProps([...])"]
  BASE --> RENDER["content-only component"]`;

export const toc: TocItem[] = [
  { id: "one-line", title: "The One-Line Definition", level: 2 },
  { id: "problem", title: "The Problem It Solves", level: 2 },
  { id: "system", title: "The System in Context", level: 2 },
  { id: "not-a-package", title: "A Source Library, Not a Built Package", level: 2 },
  { id: "features", title: "Feature-Based Organization", level: 2 },
  { id: "ownership", title: "Who Owns What", level: 3 },
  { id: "brand-wiring", title: "How a Brand App Uses It", level: 2 },
  { id: "misconceptions", title: "Three Misconceptions to Unlearn", level: 2 },
  { id: "interview", title: "Interview Framing", level: 2 },
  { id: "challenge", title: "Challenge: Where Does This Change Go?", level: 2 },
  { id: "takeaways", title: "Key Takeaways", level: 2 },
];

export default function WhatIsCommerceBase() {
  return (
    <div className="article-content">
      <p>
        Before you can safely change a line in <code>@solo/commerce-base</code>, you need the right
        mental model of what it is and — just as importantly — what it is <em>not</em>. It is the
        shared brain behind checkout, billing, account, and subscription flows for three streaming
        brands at once. Almost every confusion a new engineer has traces to one of three
        misconceptions, and this module installs the correct model so the rest of the academy clicks
        into place.
      </p>

      <h2 id="one-line">The One-Line Definition</h2>
      <p>
        <strong>
          commerce-base (CUP V2 — Commerce Unified Platform) is a shared source-level React/TypeScript
          library that provides brand-agnostic commerce pages, hooks, state, and layouts for the
          Disney+, Hulu, and ESPN+ Next.js commerce apps.
        </strong>{" "}
        The three brand apps import from it directly; each supplies its own layout, footer, and — most
        importantly — a brand-specific <em>data interface</em> that commerce-base calls without
        knowing which brand it&apos;s serving.
      </p>

      <h2 id="problem">The Problem It Solves</h2>
      <p>
        Disney+, Hulu, and ESPN+ have nearly identical commerce needs: pick a plan, enter payment,
        review, manage the subscription, cancel. Without a shared base, each brand would reimplement
        plans/billing/cancellation — three copies of the same intricate, region-aware, experiment-
        laden logic, drifting apart over time. commerce-base collapses that into one place: the{" "}
        <strong>shared logic and UI live once</strong>, and the brands differ only in their data
        transport, styling tokens, and a thin layout wrapper.
      </p>
      <ArticleTable
        caption="What's shared vs what's per-brand."
        minWidth={820}
      >
        <table>
          <thead>
            <tr>
              <th>Shared (commerce-base)</th>
              <th>Per-brand (each app)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Page components (plans, billing, account, cancel)</td>
              <td>Layout wrapper (<code>DisneyLayout</code>, etc.)</td>
            </tr>
            <tr>
              <td>Hooks, Jotai atoms, services</td>
              <td>Data interface (SDK vs HTTP transport)</td>
            </tr>
            <tr>
              <td>State machines, experiment hooks</td>
              <td>Footer, brand metadata</td>
            </tr>
            <tr>
              <td>Provider/layout composition primitives</td>
              <td>Design tokens / CSS, Next.js routes</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="system">The System in Context</h2>
      <MermaidDiagram
        chart={systemDiagram}
        title="commerce-base in its ecosystem"
        caption="Three brand apps import commerce-base source directly. commerce-base reads a per-brand data interface (dataInterfaceAtom) that talks to the Flex BFF. The shared code never hardcodes a brand."
        minHeight={460}
      />
      <p>
        Note the flow of dependencies: brand apps depend on commerce-base; commerce-base depends only
        on an <em>interface</em> (<code>DATA_INTERFACE</code>) that each brand fulfills. This is
        classic dependency inversion — the shared code is written against an abstraction, and the
        concrete transport is injected at runtime.
      </p>

      <h2 id="not-a-package">A Source Library, Not a Built Package</h2>
      <p>
        Here is a fact that surprises everyone: <strong>commerce-base is consumed as raw source, not
        a built artifact.</strong> Its <code>package.json</code> declares{" "}
        <code>&quot;main&quot;: &quot;src/index.tsx&quot;</code>, but that file{" "}
        <em>doesn&apos;t exist</em> — the field is vestigial. Brand apps import via deep subpaths
        directly into <code>src/</code>:
      </p>
      <CodeBlock
        lang="tsx"
        filename="apps/commerce/disneyPlus (real imports)"
        code={`import { SiteHeaderBase } from '@solo/commerce-base/src/common/components/site-header';
import { ApplicationLayout, PageContainer, Main } from '@solo/commerce-base/src/common/layouts';
import { BillingPage as BasePage } from '@solo/commerce-base/src/signup/pages';
import { getBillingPageProps } from '@solo/commerce-base/src/signup/pages/billing-page-props';`}
      />
      <p>
        Feature exposure happens at the <strong>feature-folder level</strong>: each domain has its own
        barrel. The signup pages barrel is the &quot;page catalog&quot; (
        <code>src/signup/pages/index.ts</code>):
      </p>
      <CodeBlock
        lang="typescript"
        filename="src/signup/pages/index.ts"
        code={`export { BillingPage } from './billing-page';
export { PlansPage } from './plans-page';
export { WelcomeBackPage } from './welcome-back-page';
export { ReviewSubscriptionPage } from './review-subscription-page';
export { StudentPage } from './student-page';
export { StudentLoadingPage } from './student-loading-page';`}
      />
      <p>
        The practical implication: there&apos;s no build step between editing commerce-base and seeing
        it in a brand app — the brand app transpiles the source. The <code>PRODUCT</code> env var (
        <code>process.env.PRODUCT</code>) selects which brand you&apos;re building/running.
      </p>

      <h2 id="features">Feature-Based Organization</h2>
      <p>
        commerce-base is organized by feature domain, not by technical layer. The top-level folders
        under <code>src/</code>:
      </p>
      <MermaidDiagram
        chart={ownershipDiagram}
        title="commerce-base feature domains"
        caption="Feature-based, not layer-based. common/ is the platform foundation; each other folder is a commerce domain owned by a specific team."
        minHeight={320}
      />
      <ArticleTable
        caption="The domains, by size and role (source-file counts approximate)."
        minWidth={820}
      >
        <table>
          <thead>
            <tr>
              <th>Domain</th>
              <th>Owns</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>common/</code></td>
              <td>Platform foundation: layouts, hooks, atoms, context, dictionary, i18n/geo, services</td>
            </tr>
            <tr>
              <td><code>signup/</code></td>
              <td>Plans, offers, billing, cadence, welcome-back, upgrade, add-ons, student</td>
            </tr>
            <tr>
              <td><code>payments/</code></td>
              <td>Payment forms, change-payment, wallet, gift-card, SCA, APM</td>
            </tr>
            <tr>
              <td><code>retention/</code></td>
              <td>Cancel, pause, restart flows</td>
            </tr>
            <tr>
              <td><code>account/</code></td>
              <td>Account details, subscription details, billing history, charges</td>
            </tr>
            <tr>
              <td><code>identity/</code></td>
              <td>Login, logout, magic link, credentials within commerce</td>
            </tr>
            <tr>
              <td><code>profiles/</code></td>
              <td>Profile add/edit/select/transfer flows (XState-heavy)</td>
            </tr>
            <tr>
              <td><code>transactional/</code></td>
              <td>Activation, redemption</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h3 id="ownership">Who Owns What</h3>
      <p>
        Ownership is <strong>granular</strong> — different teams own different folders, enforced via
        CODEOWNERS. <code>common/</code> and infrastructure belong to the platform team;{" "}
        <code>signup/</code> merchandising to Merch; <code>payments/</code> and{" "}
        <code>retention/</code> to PayRet; <code>profiles/</code> to the Profiles team; experiment
        components/hooks to the Experimentation team. <strong>Check CODEOWNERS before editing</strong>{" "}
        — a plausible-looking change in the wrong folder pulls in a different reviewing team.
      </p>

      <h2 id="brand-wiring">How a Brand App Uses It</h2>
      <p>
        A brand route is thin: it re-exports a base page, decorates it with a layout function, and
        exports a server-side-props builder.
      </p>
      <MermaidDiagram
        chart={importDiagram}
        title="A brand route wiring commerce-base"
        caption="The Next.js route imports a content-only base page, attaches getPageLayout (composing the shared + brand layout), and exports getServerSideProps. The next module goes deep on this flow."
        minHeight={360}
      />
      <p>
        The page-flow module covers <code>getPageLayout</code>, <code>getServerSideProps</code>, and
        the provider stack in detail. For now the takeaway is: <strong>commerce-base ships the
        content; the brand app supplies the shell and the data transport.</strong>
      </p>

      <h2 id="misconceptions">Three Misconceptions to Unlearn</h2>
      <ArticleTable
        caption="Common wrong mental models and the correction."
        minWidth={840}
      >
        <table>
          <thead>
            <tr>
              <th>Misconception</th>
              <th>Reality</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>&quot;commerce-base is a published npm package I build and version.&quot;</td>
              <td>It&apos;s consumed as raw source via deep <code>src/</code> imports; no build artifact.</td>
            </tr>
            <tr>
              <td>&quot;It calls brand APIs directly.&quot;</td>
              <td>It calls an injected <code>DATA_INTERFACE</code> read from <code>dataInterfaceAtom</code>; the brand app provides the impl.</td>
            </tr>
            <tr>
              <td>&quot;A screen looks wrong, so the fix is here.&quot;</td>
              <td>Offer/price/eligibility often comes from the Flex BFF; commerce-base may only render it.</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="interview">Interview Framing</h2>
      <InterviewPlaybook
        title="How to answer: 'What is commerce-base?'"
        intro="Lead with the purpose, then the shared-vs-per-brand split, then the source-library and data-interface boundaries."
        steps={[
          "Purpose: a shared source-level React/TS library (CUP V2) providing brand-agnostic commerce pages, hooks, state, and layouts for the Disney+, Hulu, and ESPN+ apps.",
          "The split: shared logic/UI lives once; brands differ only in data transport (data interface), styling tokens, layout wrapper, and Next.js routes.",
          "It's a source library, not a built package — brand apps import @solo/commerce-base/src/... directly; PRODUCT selects the brand.",
          "Dependency inversion: commerce-base is written against the DATA_INTERFACE abstraction and reads the concrete impl from dataInterfaceAtom, injected per brand at runtime.",
          "Feature-based org with granular team ownership (common/signup/payments/retention/account/identity/profiles/transactional) — check CODEOWNERS before editing.",
        ]}
      />

      <h2 id="challenge">Challenge: Where Does This Change Go?</h2>
      <InterviewChallenge
        title="Route four incoming changes to the right place"
        scenario={
          <>
            You&apos;re triaging four requests: (1) change the price shown for a plan in Brazil during
            a promo; (2) add a new payment method to the billing form for all brands; (3) change the
            Disney+ header logo; (4) fix a cancellation redirect that only affects Germany. For each,
            decide whether it belongs in commerce-base, a brand app, or the Flex BFF — and if
            commerce-base, which domain folder.
          </>
        }
        tasks={[
          "Classify each change: commerce-base (which folder), brand app, or Flex BFF.",
          "Justify the price change decision using the 'renders vs computes' boundary.",
          "Explain why the payment method goes in shared code but the header logo doesn't.",
          "Name the commerce-base folder and likely owning team for the cancellation fix.",
        ]}
        pitfalls={[
          "Assuming a visible price bug is always a commerce-base change (offer/price may come from Flex).",
          "Putting brand-specific chrome (header logo) into shared commerce-base code.",
          "Editing a folder without checking which team owns it.",
        ]}
        signal="A strong answer sends the price to the Flex BFF (it computes eligible offer/price; commerce-base renders it), the payment method to payments/ in commerce-base (shared across brands, PayRet-owned), the header logo to the Disney+ brand app, and the German cancel fix to retention/ (PayRet) — and checks CODEOWNERS for the last two."
      />
      <SolutionReveal difficulty="medium">
        <p>
          <strong>(1) Brazil promo price →</strong> most likely the <strong>Flex BFF</strong>. Which
          offer is eligible and what price it carries is computed upstream; commerce-base typically
          renders what Flex returns. Only if commerce-base re-derives the price locally would it be a
          change here.
        </p>
        <p>
          <strong>(2) New payment method →</strong> <strong>commerce-base <code>payments/</code></strong>{" "}
          (PayRet-owned). It&apos;s shared behavior across all brands, so it belongs in the shared
          library, not any single app.
        </p>
        <p>
          <strong>(3) Disney+ header logo →</strong> the <strong>Disney+ brand app</strong>. Brand
          chrome (header/footer/layout) is per-app; commerce-base provides{" "}
          <code>SiteHeaderBase</code> but the brand supplies the specific logo/layout.
        </p>
        <p>
          <strong>(4) German cancel redirect →</strong> <strong>commerce-base{" "}
          <code>retention/</code></strong> (PayRet). The regulated-cancel logic lives in{" "}
          <code>retention/cancel/hooks/</code> with a <code>region === &apos;DE&apos;</code> guard.
          Check CODEOWNERS before editing (2) and (4) to pull in the right reviewers.
        </p>
      </SolutionReveal>

      <h2 id="takeaways">Key Takeaways</h2>
      <ul>
        <li>
          <strong>Shared brain for three brands.</strong> commerce-base (CUP V2) provides
          brand-agnostic commerce pages, hooks, state, and layouts.
        </li>
        <li>
          <strong>Source library, not a package.</strong> Brands import{" "}
          <code>@solo/commerce-base/src/...</code> directly; <code>PRODUCT</code> picks the brand.
        </li>
        <li>
          <strong>Dependency inversion.</strong> Written against <code>DATA_INTERFACE</code>; the
          brand injects the impl via <code>dataInterfaceAtom</code>.
        </li>
        <li>
          <strong>Feature-based, granularly owned.</strong> common/signup/payments/retention/account/
          identity/profiles/transactional — check CODEOWNERS.
        </li>
        <li>
          <strong>Renders vs computes.</strong> Offer/price/eligibility often comes from the Flex
          BFF; a visible bug isn&apos;t automatically a commerce-base change.
        </li>
      </ul>
    </div>
  );
}
