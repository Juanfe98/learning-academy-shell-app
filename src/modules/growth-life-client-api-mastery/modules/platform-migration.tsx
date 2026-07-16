import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import {
  ArticleTable,
  InterviewPlaybook,
  InterviewChallenge,
  SolutionReveal,
  CodeBlock,
} from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const dualPathDiagram = String.raw`flowchart TD
  REQ["Screen request"]
  REQ --> FLAG{"platform flag on?"}
  FLAG -->|no| LEGACY["Legacy: domain/screen/<br/>xService.ts → fillTemplate"]
  FLAG -->|yes| PLAT["Platform: pipeline → assembly<br/>→ ejsRendering"]
  LEGACY --> RESP["UI + analytics JSON"]
  PLAT --> RESP
  PARITY["__parity__ tests<br/>compare both outputs"]
  LEGACY -.-> PARITY
  PLAT -.-> PARITY`;

const platformLayersDiagram = String.raw`flowchart LR
  subgraph plat["src/platform/"]
    CORE["core/<br/>orchestration + domain"]
    CONTRACTS["contracts/<br/>screen + domain"]
    PRES["presentation/<br/>assemblies"]
    BACK["backends/"]
    TRACK["migration-tracking/"]
    PAR["__parity__/"]
  end
  CORE --> PIPE["screens/xPipeline.ts"]
  PRES --> ASM["assemblies/xAssembly.ts"]`;

const lifecycleDiagram = String.raw`flowchart LR
  M["migrating<br/>both live, change both"] --> Q["qa<br/>platform in QA,<br/>legacy changes need justification"]
  Q --> D["deprecated<br/>legacy scheduled for removal,<br/>touch only platform"]`;

export const toc: TocItem[] = [
  { id: "why", title: "Why a Migration Is Happening", level: 2 },
  { id: "dual", title: "The Dual-Path World", level: 2 },
  { id: "layers", title: "The Platform Layers", level: 2 },
  { id: "config", title: "migrationConfig.ts: The Source of Truth", level: 2 },
  { id: "lifecycle", title: "The Migration Lifecycle", level: 3 },
  { id: "rule", title: "The Change-Both Rule", level: 2 },
  { id: "parity", title: "Parity Testing", level: 2 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "challenge", title: "Challenge: Change a Migrating Screen", level: 2 },
  { id: "takeaways", title: "Key Takeaways", level: 2 },
];

export default function PlatformMigration() {
  return (
    <div className="article-content">
      <p>
        The single fact most likely to bite a new engineer: some screens exist{" "}
        <strong>twice</strong>. There&apos;s the legacy implementation in{" "}
        <code>src/domain/screen/</code> and a newer one in <code>src/platform/</code>, and for
        migrating screens <em>both run live behind a feature flag</em>. Change one and forget the
        other, and you ship a bug that only appears for half your users. This module explains the
        migration, the platform architecture, and the discipline — anchored on{" "}
        <code>migrationConfig.ts</code> — that keeps the two sides in sync.
      </p>

      <h2 id="why">Why a Migration Is Happening</h2>
      <p>
        The legacy screen pattern (Group 2) is a hand-written orchestration function per screen. The{" "}
        <code>src/platform/</code> effort replaces that with a more structured pipeline: declarative
        orchestration, typed contracts, and reusable domain/presentation layers. The goal is less
        bespoke glue per screen and more shared, testable machinery. But you can&apos;t flip a large
        production service overnight — so screens migrate one at a time, with both implementations
        live and a flag choosing which one serves each request.
      </p>

      <h2 id="dual">The Dual-Path World</h2>
      <MermaidDiagram
        chart={dualPathDiagram}
        title="Two implementations, one flag"
        caption="For a migrating screen, a feature flag routes each request to either the legacy service or the platform pipeline. Parity tests compare their outputs."
        minHeight={420}
      />
      <p>
        Recall from module 4 that the template engine even exposes a platform rendering variant
        (<code>fillEjsData as fillEjsDataPlatform</code> from{" "}
        <code>!platform/core/utils/ejsRendering</code>). That&apos;s the platform side&apos;s
        rendering path. The two implementations converge on the same response contract — that&apos;s
        what makes a flag-controlled swap possible and what parity tests verify.
      </p>

      <h2 id="layers">The Platform Layers</h2>
      <p>
        <code>src/platform/</code> is organized very differently from the legacy screen folders. It
        separates orchestration, contracts, and presentation:
      </p>
      <MermaidDiagram
        chart={platformLayersDiagram}
        title="The src/platform structure"
        caption="Orchestration pipelines fetch/compose data; contracts type the boundaries; presentation assemblies build the UI; parity tests guard equivalence."
        minHeight={340}
      />
      <ArticleTable
        caption="The platform sub-layers and their responsibilities."
        minWidth={840}
      >
        <table>
          <thead>
            <tr><th>Path</th><th>Owns</th></tr>
          </thead>
          <tbody>
            <tr><td><code>platform/core/orchestration/screens/</code></td><td>Per-screen <code>xPipeline.ts</code> — declarative data orchestration</td></tr>
            <tr><td><code>platform/core/domain/</code></td><td>Domain capabilities (commerce, compliance, content, identity, targeting)</td></tr>
            <tr><td><code>platform/presentation/screen/assemblies/</code></td><td>Per-screen <code>xAssembly.ts</code> — builds the UI from orchestrated data</td></tr>
            <tr><td><code>platform/contracts/</code></td><td>Typed contracts for screen + domain boundaries</td></tr>
            <tr><td><code>platform/backends/</code></td><td>Platform-side backend access</td></tr>
            <tr><td><code>platform/migration-tracking/</code></td><td>Per-screen migration tracking JSON</td></tr>
            <tr><td><code>platform/__parity__/</code></td><td>Parity tests comparing legacy vs platform output</td></tr>
          </tbody>
        </table>
      </ArticleTable>
      <p>
        So a migrated screen has a <code>xPipeline.ts</code> (orchestration), an{" "}
        <code>xAssembly.ts</code> (presentation), a <code>xSchema.ts</code> (orchestrator schema),
        and contracts — the platform counterparts to the legacy service + metrics builder + contract
        type.
      </p>

      <h2 id="config">migrationConfig.ts: The Source of Truth</h2>
      <p>
        <code>src/platform/migrationConfig.ts</code> is the registry that tells you, for any screen,
        whether it&apos;s migrating and exactly which files constitute each side. Entries are created
        with <code>createScreenConfig()</code>, which derives the standard legacy and platform file
        paths from the screen name + domain by convention.
      </p>
      <CodeBlock
        lang="typescript"
        filename="src/platform/migrationConfig.ts"
        code={`export const migrationRegistry: MigrationRegistry = {
  subscriptionDetails: createScreenConfig({
    screen: 'subscriptionDetails', domain: 'account', status: 'migrating',
  }),
  billingHistory: createScreenConfig({
    screen: 'billingHistory', domain: 'account', status: 'migrating',
  }),
  planSelector: createScreenConfig({
    screen: 'planSelector', domain: 'landing', status: 'migrating',
  }),
  welcome: createScreenConfig({
    screen: 'welcome', domain: 'landing', status: 'migrating',
    otherLegacyFiles: [ /* extra files beyond the conventions */ ],
    otherPlatformFiles: [ /* ... */ ],
  }),
  // ...accountDetails, deviceOutOfHouseholdOtpSuccess, etc.
};`}
      />
      <p>
        <code>createScreenConfig</code> generates the <code>legacy[]</code> and{" "}
        <code>platform[]</code> glob lists — the legacy service/constants/metrics/contract/route/
        fixtures, and the platform pipeline/assembly/schema/contracts. When a screen has files off the
        naming convention, they&apos;re listed explicitly via <code>otherLegacyFiles</code> /{" "}
        <code>otherPlatformFiles</code>. Before touching any screen,{" "}
        <strong>check this file first.</strong>
      </p>

      <h3 id="lifecycle">The Migration Lifecycle</h3>
      <MermaidDiagram
        chart={lifecycleDiagram}
        title="migrating → qa → deprecated"
        caption="The status tells you your obligation: change both while migrating; justify legacy changes in qa; touch only platform once deprecated."
        minHeight={220}
      />
      <ArticleTable
        caption="What each migration status obliges you to do."
        minWidth={800}
      >
        <table>
          <thead>
            <tr><th>Status</th><th>Meaning</th><th>Your obligation</th></tr>
          </thead>
          <tbody>
            <tr><td><code>migrating</code></td><td>Both implementations active</td><td>Reflect changes in <strong>both</strong> legacy and platform</td></tr>
            <tr><td><code>qa</code></td><td>Platform in QA</td><td>Legacy changes need justification</td></tr>
            <tr><td><code>deprecated</code></td><td>Legacy scheduled for removal</td><td>Touch <strong>only</strong> the platform side</td></tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="rule">The Change-Both Rule</h2>
      <p>
        This is the rule from <code>CLAUDE.md</code> that the whole module builds to: <strong>if a
        screen is <code>migrating</code>, a behavioral change must be made in both the legacy service
        and the platform pipeline/assembly.</strong> If you&apos;re unsure how to reflect a change on
        the other side, say so rather than guessing — a silent divergence is worse than an explicit
        question. A <code>migration:check</code> script and a <code>migration-check.yml</code> CI
        workflow exist specifically to catch diffs that touch one side but not the other.
      </p>

      <h2 id="parity">Parity Testing</h2>
      <p>
        How do you know the two implementations actually behave identically? <strong>Parity
        tests.</strong> <code>src/platform/__parity__/</code> holds <code>*.parity.test.ts</code>{" "}
        files run via <code>npm run parity</code> (<code>HULU_ENV=ci</code>), which exercise both the
        legacy and platform paths and compare their outputs. <code>parity:matrix</code> reports
        coverage across screens. Parity is the safety net that lets the flag flip with confidence — if
        outputs diverge, the test fails before users see it.
      </p>

      <h2 id="interview-framing">Interview Framing</h2>
      <InterviewPlaybook
        title="How to answer: 'What's the platform migration and how does it affect my changes?'"
        intro="Show you understand the dual-path world, the config source of truth, and the change-both discipline."
        steps={[
          "Explain the goal: replace bespoke per-screen legacy services with a structured platform pipeline (orchestration + contracts + presentation).",
          "Describe the dual-path world: for migrating screens, both implementations run live and a feature flag routes each request; they share one response contract.",
          "Name migrationConfig.ts as the source of truth — createScreenConfig lists the legacy and platform files per screen, with a status (migrating/qa/deprecated).",
          "State the change-both rule: while migrating, a behavioral change goes in both the legacy service and the platform pipeline/assembly — check the config before editing.",
          "Close with parity tests + migration-check CI as the guardrails that catch divergence between the two sides.",
        ]}
      />

      <h2 id="challenge">Challenge: Change a Migrating Screen</h2>
      <InterviewChallenge
        title="Add a legal disclaimer to billingHistory"
        scenario={
          <>
            Compliance needs a new legal disclaimer line on the <code>billingHistory</code> screen.
            You open <code>billingHistoryService.ts</code>, add the disclaimer, and your legacy test
            passes. Explain why you may not be done, how you&apos;d find out, and what else you must
            do.
          </>
        }
        tasks={[
          "Describe the very first check you should have done before editing, and where.",
          "Given billingHistory is 'migrating', state exactly what else must change and where (platform side).",
          "Explain how parity tests and migration-check CI would react to a one-sided change.",
          "Say what you'd do if you don't know how to make the equivalent platform change.",
        ]}
        pitfalls={[
          "Editing only the legacy service and trusting the legacy test's green check.",
          "Not consulting migrationConfig.ts to learn the screen is migrating.",
          "Assuming a passing legacy test means the platform path is also correct.",
          "Guessing at the platform change instead of flagging uncertainty.",
        ]}
        signal="A strong answer checks migrationConfig first, mirrors the change in the platform pipeline/assembly, relies on parity + migration-check, and escalates uncertainty rather than diverging."
      />
      <SolutionReveal difficulty="hard">
        <p>
          First move should have been to check <code>src/platform/migrationConfig.ts</code>:{" "}
          <code>billingHistory</code> is registered with <code>status: 'migrating'</code>, which
          means <strong>both</strong> implementations serve production traffic behind a flag. A green
          legacy test only proves the legacy path — the platform path still renders the old output for
          the users the flag routes there.
        </p>
        <p>
          So you must also add the disclaimer on the platform side: the change lives in the{" "}
          <code>billingHistory</code> platform pipeline/assembly (and its contract if the shape
          changes) under <code>src/platform/</code>. <code>migration-check</code> CI flags a diff
          that touched the legacy files but not the platform files, and the{" "}
          <code>billingHistory</code> parity test would fail because legacy and platform outputs now
          differ — both are catching your one-sided change. If you genuinely don&apos;t know how to
          express the disclaimer in the platform assembly, <code>CLAUDE.md</code> is explicit:{" "}
          <em>tell the reviewer/user</em> rather than shipping a divergence. An honest &quot;I&apos;m
          not sure how this maps to the platform side&quot; is the correct output.
        </p>
      </SolutionReveal>

      <h2 id="takeaways">Key Takeaways</h2>
      <ul>
        <li>
          <strong>Some screens exist twice</strong> — legacy in <code>domain/screen/</code>, platform
          in <code>src/platform/</code> — both live behind a flag while migrating.
        </li>
        <li>
          <strong>Platform layers:</strong> orchestration pipelines, presentation assemblies, typed
          contracts, migration-tracking, and <code>__parity__</code>.
        </li>
        <li>
          <strong><code>migrationConfig.ts</code> is the source of truth</strong> —{" "}
          <code>createScreenConfig</code> lists each screen&apos;s legacy + platform files and a
          status.
        </li>
        <li>
          <strong>Status = obligation:</strong> <code>migrating</code> → change both;{" "}
          <code>qa</code> → justify legacy changes; <code>deprecated</code> → platform only.
        </li>
        <li>
          <strong>Change-both rule:</strong> a behavioral change to a migrating screen goes in both
          sides — flag uncertainty rather than diverge.
        </li>
        <li>
          <strong>Parity tests + migration-check CI</strong> catch divergence before users do.
        </li>
      </ul>
    </div>
  );
}
