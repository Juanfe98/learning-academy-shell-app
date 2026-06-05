import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { ArticleTable, InterviewPlaybook, InterviewChallenge, SolutionReveal, CodeBlock } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const semverDiagram = String.raw`flowchart TD
  CH{"What changed?"} -->|"Bug fix, no API change"| P["PATCH 1.2.x"]
  CH -->|"New feature, backward compatible"| MI["MINOR 1.x.0"]
  CH -->|"Breaking change to public API"| MA["MAJOR x.0.0"]
  P --> SAFE["Safe auto-update"]
  MI --> SAFE
  MA --> MIG["Requires migration<br/>+ codemod + guide"]`;

const changesetsDiagram = String.raw`flowchart LR
  PR["PR with change"] --> CS["Add a changeset<br/>(intent + bump level)"]
  CS --> MERGE["Merge to main"]
  MERGE --> BOT["Changesets bot opens<br/>'Version Packages' PR"]
  BOT --> VER["Bumps versions +<br/>generates CHANGELOG"]
  VER --> PUB["Merge -> CI publishes to npm"]`;

export const toc: TocItem[] = [
  { id: "the-stakes", title: "Why Versioning Is High-Stakes", level: 2 },
  { id: "semver", title: "Semantic Versioning", level: 2 },
  { id: "what-is-breaking", title: "What Counts as Breaking", level: 3 },
  { id: "changesets", title: "Changesets: Automating Releases", level: 2 },
  { id: "deprecation", title: "Deprecation, Not Deletion", level: 2 },
  { id: "codemods", title: "Codemods & Migration Guides", level: 2 },
  { id: "strategies", title: "Release Strategies", level: 2 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "challenge", title: "Challenge", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function VersioningAndReleases() {
  return (
    <div className="article-content">
      <p>
        A design system is a dependency that hundreds of apps install, which makes versioning a
        position of enormous responsibility: <strong>a careless breaking change can break every
        product in the company at once</strong>. The whole discipline of versioning and releases
        exists to let the system evolve without betraying the trust of the teams depending on it.
        Get this wrong and teams pin to an old version and stop upgrading — the slow death of a
        design system. This module covers semver, automated releases with Changesets, and the
        deprecation/migration craft that keeps consumers upgrading willingly.
      </p>

      <h2 id="the-stakes">Why Versioning Is High-Stakes</h2>
      <p>
        Unlike an app, where a bug affects one product, a design system bug or breaking change
        radiates to every consumer simultaneously. This asymmetry means the system must be{" "}
        <strong>more conservative and more communicative</strong> than ordinary software. The
        currency you&rsquo;re protecting is <em>trust</em>: if upgrading is scary, teams stop
        upgrading, fragment across versions, and the system fails at its one job — consistency.
      </p>

      <h2 id="semver">Semantic Versioning</h2>
      <p>
        <strong>Semantic Versioning (semver)</strong> — <code>MAJOR.MINOR.PATCH</code> — is the
        contract that tells consumers what an upgrade will do to them. It is not bureaucracy; it is
        the promise that lets a team run <code>npm update</code> without fear.
      </p>

      <MermaidDiagram
        chart={semverDiagram}
        title="Choosing a version bump"
        caption="Patches and minors are safe to auto-adopt; majors signal a breaking change that requires a migration path."
        minHeight={360}
      />

      <ArticleTable
        caption="Semver bump levels and what each promises consumers."
        minWidth={800}
      >
        <table>
          <thead>
            <tr>
              <th>Bump</th>
              <th>Version</th>
              <th>Meaning</th>
              <th>Consumer action</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>PATCH</strong></td>
              <td><code>1.4.2 → 1.4.3</code></td>
              <td>Bug fix, no API change</td>
              <td>Update freely</td>
            </tr>
            <tr>
              <td><strong>MINOR</strong></td>
              <td><code>1.4.3 → 1.5.0</code></td>
              <td>New backward-compatible feature</td>
              <td>Update freely; opt into new APIs</td>
            </tr>
            <tr>
              <td><strong>MAJOR</strong></td>
              <td><code>1.5.0 → 2.0.0</code></td>
              <td>Breaking change to public API</td>
              <td>Read migration guide; run codemod</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h3 id="what-is-breaking">What Counts as Breaking</h3>
      <p>
        Engineers routinely under-estimate this. Breaking changes include: removing or renaming a
        prop, changing a prop&rsquo;s type or default, removing a component, changing DOM structure
        that consumers&rsquo; CSS or tests target, and even <strong>visual changes significant
        enough to break layouts</strong>. The subtle one: changing a default value (e.g.{" "}
        <code>size</code> default from <code>md</code> to <code>lg</code>) is breaking even though
        no API signature changed — every un-specified usage silently changes appearance.
      </p>

      <h2 id="changesets">Changesets: Automating Releases</h2>
      <p>
        <strong>Changesets</strong> is the de facto release tool for monorepos. The workflow
        decouples <em>declaring intent</em> (at PR time, the author writes what changed and the bump
        level) from <em>cutting a release</em> (batched later). It then computes correct version
        bumps across interdependent packages, generates changelogs, and publishes — all automated.
      </p>

      <MermaidDiagram
        chart={changesetsDiagram}
        title="The Changesets release flow"
        caption="Each PR adds a changeset describing intent; a bot batches them into a Version PR that, when merged, bumps versions and publishes."
        minHeight={300}
      />

      <CodeBlock
        code={`# Author runs this in their PR; it writes a markdown file to .changeset/
$ pnpm changeset

# Interactive prompt produces .changeset/cool-lions-jump.md:
---
"@acme/react": minor
"@acme/tokens": patch
---
Add \`tone\` prop to Button for subtle/loud emphasis. Token color-action-subtle added.

# Later, in CI on main:
$ pnpm changeset version   # consumes changesets, bumps versions, writes CHANGELOG.md
$ pnpm changeset publish   # publishes changed packages to npm with correct versions`}
        lang="bash"
        filename="changesets-flow.sh"
      />

      <p>
        Why it&rsquo;s better than conventional-commits-only automation: the bump level is a{" "}
        <em>human decision</em> recorded at review time (when context is freshest), it handles
        cascading bumps across monorepo packages correctly, and the &ldquo;Version Packages&rdquo;
        PR is a reviewable summary of everything about to ship.
      </p>

      <h2 id="deprecation">Deprecation, Not Deletion</h2>
      <p>
        The cardinal rule of evolving a public API: <strong>deprecate before you delete</strong>.
        Removing a prop immediately is hostile; marking it deprecated, warning at runtime/build
        time, and removing it only in a future major gives teams a window to migrate on their
        schedule. A deprecation is a promise: &ldquo;this still works, but plan to move.&rdquo;
      </p>

      <CodeBlock
        code={`interface ButtonProps {
  variant?: "primary" | "secondary" | "danger";
  /** @deprecated Use \`variant="danger"\` instead. Removed in v3. */
  isDanger?: boolean;
}

function Button({ variant, isDanger, ...props }: ButtonProps) {
  if (process.env.NODE_ENV !== "production" && isDanger) {
    console.warn("[Button] \`isDanger\` is deprecated; use variant=\\"danger\\". Removed in v3.");
  }
  const resolved = isDanger ? "danger" : variant;   // keep it working meanwhile
  return <button data-variant={resolved} {...props} />;
}`}
        lang="tsx"
        filename="deprecation.tsx"
      />

      <h2 id="codemods">Codemods & Migration Guides</h2>
      <p>
        For a major version, the system&rsquo;s job is to make migration <em>cheap</em>. Two
        deliverables: a <strong>migration guide</strong> (every breaking change, before/after, and
        why), and ideally <strong>codemods</strong> — automated scripts (jscodeshift / ts-morph)
        that rewrite consumer code mechanically. When Material UI or Chakra ship a major, they ship
        codemods so a 500-file app upgrades in minutes, not weeks. Shipping the codemod with the
        major is what makes teams actually adopt it instead of pinning forever.
      </p>

      <CodeBlock
        code={`// A codemod (jscodeshift) that rewrites isDanger -> variant="danger"
export default function transform(file, api) {
  const j = api.jscodeshift;
  const root = j(file.source);

  root.findJSXElements("Button").forEach((path) => {
    const attrs = path.node.openingElement.attributes;
    const idx = attrs.findIndex((a) => a.name?.name === "isDanger");
    if (idx !== -1) {
      attrs.splice(idx, 1);                                   // remove isDanger
      attrs.push(j.jsxAttribute(j.jsxIdentifier("variant"),  // add variant="danger"
        j.literal("danger")));
    }
  });
  return root.toSource();
}
// Consumers run:  npx @acme/codemods button-v3 ./src`}
        lang="javascript"
        filename="button-v3.codemod.js"
      />

      <h2 id="strategies">Release Strategies</h2>
      <p>
        Mature systems offer more than &ldquo;latest.&rdquo; <strong>Canary / next</strong>{" "}
        pre-release tags (<code>npm publish --tag next</code>) let brave teams test upcoming changes
        without affecting the default <code>latest</code> install. <strong>Snapshot releases</strong>{" "}
        publish a one-off version from a PR so a consumer can verify a fix before it lands. And a{" "}
        predictable <strong>cadence</strong> (e.g. patches as needed, minors weekly, majors a few
        times a year with long notice) lets teams plan. The anti-pattern is surprise majors with no
        runway.
      </p>

      <h2 id="interview-framing">Interview Framing</h2>
      <InterviewPlaybook
        title="How to answer: 'How do you version and release a design system without breaking consumers?'"
        intro="The interviewer wants to hear that you treat consumers' trust as the asset and have a concrete deprecation/migration craft, not just 'we use semver.'"
        steps={[
          "Frame the stakes: a breaking change radiates to every consuming app at once; trust is the asset, and lost trust means teams stop upgrading.",
          "Use semver as a contract; be precise about what's breaking — including default-value changes and DOM/visual changes, not just API removals.",
          "Automate releases with Changesets: declare intent + bump level at PR time, batch into a Version PR, auto-changelog and publish.",
          "Deprecate before deleting: keep the old path working with a warning, remove only in a future major.",
          "Ship migration guides AND codemods with every major so upgrading is cheap; offer canary/next tags and a predictable cadence.",
        ]}
      />

      <InterviewChallenge
        title="Plan a breaking redesign rollout"
        scenario={
          <>
            You must overhaul the <code>Button</code> API: rename three props, change the default
            size, and alter the rendered DOM (consumers&rsquo; CSS targets the old structure). 200+
            apps depend on it. Leadership wants it shipped without &ldquo;breaking everyone.&rdquo;
          </>
        }
        tasks={[
          "Classify each change (patch/minor/major) and justify, including the sneaky default-size change.",
          "Lay out the release plan that lets 200 apps migrate without a fire drill.",
          "Decide what you ship alongside the new version to make adoption realistic.",
        ]}
      />
      <SolutionReveal difficulty="hard">
          <p>
            <strong>Classification:</strong> renaming props = breaking (MAJOR). Changing the default
            size = breaking (MAJOR) — every unspecified usage changes appearance silently. DOM
            change = breaking (MAJOR) since consumer CSS/tests target it. So this is a single{" "}
            <code>2.0.0</code>.
          </p>
          <p>
            <strong>Plan — soften the major:</strong> First ship a <em>minor</em> that adds the new
            prop names and deprecates the old ones (both work, old ones warn). Hold the default-size
            and DOM changes for the major. Announce the major with a long runway, publish a{" "}
            <code>next</code> tag so teams can test early, and provide a migration guide.
          </p>
          <p>
            <strong>Ship alongside the major:</strong> a <strong>codemod</strong> that renames the
            props automatically, a migration guide covering the DOM change with CSS before/after,
            and an explicit note that the default size changed (with a one-line way to restore old
            behavior, e.g. <code>size=&quot;md&quot;</code> everywhere via the codemod). Keep{" "}
            <code>1.x</code> on a maintenance track for critical fixes during the migration window
            so no team is forced to jump before they&rsquo;re ready.
          </p>
        </SolutionReveal>

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>
          Versioning protects <strong>consumer trust</strong> — a breaking change hits every app at
          once, so the system must be conservative and communicative.
        </li>
        <li>
          Use <strong>semver</strong> as a contract; recognize sneaky breaking changes (default-value
          changes, DOM/visual changes), not just API removals.
        </li>
        <li>
          Automate releases with <strong>Changesets</strong>: intent + bump declared at PR time,
          batched into a reviewable Version PR, auto-changelog and publish.
        </li>
        <li>
          <strong>Deprecate before deleting</strong> — keep the old path working with a warning,
          remove only in a future major.
        </li>
        <li>
          Ship <strong>migration guides and codemods</strong> with every major so upgrading is
          cheap; offer <strong>canary/next</strong> tags and a predictable cadence.
        </li>
      </ul>
    </div>
  );
}
