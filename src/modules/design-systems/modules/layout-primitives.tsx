import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { ArticleTable, InterviewPlaybook, InterviewChallenge, SolutionReveal, CodeBlock } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const compositionDiagram = String.raw`flowchart TD
  subgraph Primitives["Layout primitives (no margins!)"]
    BOX["Box<br/>padding, bg, border"]
    STACK["Stack<br/>vertical rhythm + gap"]
    CLUSTER["Cluster<br/>wrap + gap (tags, toolbars)"]
    GRID["Grid<br/>responsive columns"]
    INLINE["Inline<br/>label + control"]
  end
  STACK --> PAGE["Any layout, composed"]
  CLUSTER --> PAGE
  GRID --> PAGE
  BOX --> PAGE
  INLINE --> PAGE`;

const marginDiagram = String.raw`flowchart LR
  subgraph Bad["Margins on components (leaks)"]
    C1["Card (margin-bottom: 16px)"] --> C2["Card spacing depends on context"]
    C2 --> C3["Reuse breaks: wrong gap elsewhere"]
  end
  subgraph Good["Spacing owned by layout"]
    S["Stack gap=4"] --> CC1["Card (no margin)"]
    S --> CC2["Card (no margin)"]
    CC1 --> OK["Card reusable anywhere"]
    CC2 --> OK`;

export const toc: TocItem[] = [
  { id: "why-primitives", title: "Why Layout Primitives", level: 2 },
  { id: "no-margins", title: "The Golden Rule: Components Have No Margins", level: 2 },
  { id: "box", title: "Box: The Base Primitive", level: 2 },
  { id: "stack", title: "Stack: Vertical & Horizontal Rhythm", level: 2 },
  { id: "cluster", title: "Cluster: Wrapping Groups", level: 2 },
  { id: "grid", title: "Grid: Responsive Columns", level: 2 },
  { id: "inline-center", title: "Inline, Center & Spacer", level: 2 },
  { id: "composing", title: "Composing a Real Layout", level: 2 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "challenge", title: "Challenge", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function LayoutPrimitives() {
  return (
    <div className="article-content">
      <p>
        Most of what a product engineer builds is <em>layout</em> — arranging things in rows,
        columns, and grids with consistent spacing. Yet most design systems ship a beautiful Button
        and leave layout to ad-hoc <code>div</code>s with one-off <code>margin</code> and{" "}
        <code>flex</code> styles, which is exactly where consistency leaks back in. <strong>Layout
        primitives</strong> — Box, Stack, Cluster, Grid, Inline — are reusable components that own
        spacing and arrangement using only your tokens. They are the highest-leverage components in
        a system because they&rsquo;re used on every screen. This module builds the full set as
        copy-pasteable code.
      </p>

      <h2 id="why-primitives">Why Layout Primitives</h2>
      <p>
        The idea (popularized by Heydon Pickering &amp; Andy Bell&rsquo;s <em>Every Layout</em>) is
        to express layout as a small set of single-purpose components that encapsulate flexbox/grid
        logic and accept only token-based spacing. Instead of every developer rewriting{" "}
        <code>display: flex; gap: 16px; flex-direction: column</code>, they write{" "}
        <code>&lt;Stack gap=&quot;4&quot;&gt;</code>. The win: spacing becomes systematic and
        impossible to get &ldquo;almost right.&rdquo;
      </p>

      <MermaidDiagram
        chart={compositionDiagram}
        title="The primitive set"
        caption="A handful of single-purpose layout components compose into any screen, each consuming only spacing tokens."
        minHeight={360}
      />

      <h2 id="no-margins">The Golden Rule: Components Have No Margins</h2>
      <p>
        The most important principle in this entire module: <strong>components should never set
        their own outer margins</strong>. A margin on a Card couples it to one context — the spacing
        it needs <em>between</em> siblings depends on where it&rsquo;s used, so a baked-in margin
        breaks reuse. Instead, <strong>spacing is owned by the parent layout primitive</strong> via{" "}
        <code>gap</code>. This single rule eliminates the most common source of layout
        inconsistency.
      </p>

      <MermaidDiagram
        chart={marginDiagram}
        title="Why components don't own margins"
        caption="Margins on components leak context-specific spacing; letting a Stack own the gap keeps components reusable anywhere."
        minHeight={300}
      />

      <h2 id="box">Box: The Base Primitive</h2>
      <p>
        <code>Box</code> is the foundation — a polymorphic element that maps token props to styles
        (padding, background, radius, border). Everything else can be built on it. Here&rsquo;s a
        complete, runnable implementation using CSS variables for the token mapping:
      </p>

      <CodeBlock
        code={`import { forwardRef } from "react";
import type { ElementType, ComponentPropsWithoutRef } from "react";

type SpaceToken = "0" | "1" | "2" | "3" | "4" | "6" | "8" | "12";

interface BoxOwnProps {
  as?: ElementType;          // polymorphic: render as section, article, etc.
  padding?: SpaceToken;
  background?: "surface" | "canvas" | "elevated";
  radius?: "sm" | "md" | "lg";
  border?: boolean;
}

export const Box = forwardRef<HTMLElement, BoxOwnProps & ComponentPropsWithoutRef<"div">>(
  function Box({ as: Tag = "div", padding, background, radius, border, style, ...props }, ref) {
    return (
      <Tag
        ref={ref}
        style={{
          padding: padding ? \`var(--space-\${padding})\` : undefined,
          background: background ? \`var(--color-bg-\${background})\` : undefined,
          borderRadius: radius ? \`var(--radius-\${radius})\` : undefined,
          border: border ? "1px solid var(--color-border-default)" : undefined,
          ...style,
        }}
        {...props}
      />
    );
  },
);`}
        lang="tsx"
        filename="Box.tsx"
      />

      <h2 id="stack">Stack: Vertical & Horizontal Rhythm</h2>
      <p>
        <code>Stack</code> is the workhorse: it lays children out in one direction with a consistent{" "}
        token <code>gap</code>. 80% of layouts are nested Stacks. Note it sets <em>no</em> margins —
        the <code>gap</code> owns all spacing.
      </p>

      <CodeBlock
        code={`type SpaceToken = "0" | "1" | "2" | "3" | "4" | "6" | "8" | "12";

interface StackProps extends React.HTMLAttributes<HTMLDivElement> {
  direction?: "vertical" | "horizontal";
  gap?: SpaceToken;
  align?: "start" | "center" | "end" | "stretch";
  justify?: "start" | "center" | "end" | "between";
}

const ALIGN = { start: "flex-start", center: "center", end: "flex-end", stretch: "stretch" };
const JUSTIFY = { start: "flex-start", center: "center", end: "flex-end", between: "space-between" };

export function Stack({
  direction = "vertical", gap = "4", align = "stretch", justify = "start", style, ...props
}: StackProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: direction === "vertical" ? "column" : "row",
        gap: \`var(--space-\${gap})\`,
        alignItems: ALIGN[align],
        justifyContent: JUSTIFY[justify],
        ...style,
      }}
      {...props}
    />
  );
}
// <Stack gap="6"><Card/><Card/><Card/></Stack>  — even 24px gaps, zero margins.`}
        lang="tsx"
        filename="Stack.tsx"
      />

      <h2 id="cluster">Cluster: Wrapping Groups</h2>
      <p>
        <code>Cluster</code> arranges a variable number of items horizontally and <strong>wraps</strong>{" "}
        them onto new lines with consistent gaps — perfect for tag lists, button toolbars, and chip
        groups where the count is unknown. It&rsquo;s a Stack-like primitive with{" "}
        <code>flex-wrap</code>.
      </p>

      <CodeBlock
        code={`interface ClusterProps extends React.HTMLAttributes<HTMLDivElement> {
  gap?: SpaceToken;
  align?: "start" | "center" | "end";
  justify?: "start" | "center" | "end" | "between";
}

export function Cluster({ gap = "2", align = "center", justify = "start", style, ...props }: ClusterProps) {
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",                 // the key difference from Stack
        gap: \`var(--space-\${gap})\`,
        alignItems: ALIGN[align],
        justifyContent: JUSTIFY[justify],
        ...style,
      }}
      {...props}
    />
  );
}
// <Cluster gap="2">{tags.map(t => <Badge key={t}>{t}</Badge>)}</Cluster>`}
        lang="tsx"
        filename="Cluster.tsx"
      />

      <h2 id="grid">Grid: Responsive Columns</h2>
      <p>
        <code>Grid</code> wraps CSS Grid for the common responsive case: a set of equal columns that
        collapse on small screens. The <code>minItemWidth</code> approach (using{" "}
        <code>auto-fit</code> + <code>minmax</code>) gives you a responsive grid <em>without media
        queries</em> — items reflow based on available space.
      </p>

      <CodeBlock
        code={`interface GridProps extends React.HTMLAttributes<HTMLDivElement> {
  minItemWidth?: string;   // e.g. "16rem" — items at least this wide, else wrap
  gap?: SpaceToken;
  columns?: number;        // OR fixed column count
}

export function Grid({ minItemWidth = "16rem", columns, gap = "4", style, ...props }: GridProps) {
  return (
    <div
      style={{
        display: "grid",
        gap: \`var(--space-\${gap})\`,
        gridTemplateColumns: columns
          ? \`repeat(\${columns}, minmax(0, 1fr))\`
          : \`repeat(auto-fit, minmax(min(\${minItemWidth}, 100%), 1fr))\`,  // intrinsic responsive
        ...style,
      }}
      {...props}
    />
  );
}
// <Grid minItemWidth="18rem" gap="6">{products.map(...)}</Grid>  — no breakpoints needed.`}
        lang="tsx"
        filename="Grid.tsx"
      />

      <h2 id="inline-center">Inline, Center & Spacer</h2>
      <p>
        Three more close out the set. <code>Inline</code> aligns a label and control on one baseline
        (icon + text). <code>Center</code> constrains content to a max readable width and centers it
        (article bodies). <code>Spacer</code> is a flexible gap that pushes siblings apart (e.g.
        title on the left, actions pushed right in a header).
      </p>

      <CodeBlock
        code={`// Center: max-width + horizontal centering for readable content
export function Center({ maxWidth = "65ch", style, ...props }: { maxWidth?: string } & React.HTMLAttributes<HTMLDivElement>) {
  return <div style={{ maxWidth, marginInline: "auto", width: "100%", ...style }} {...props} />;
}

// Spacer: grows to fill, pushing siblings apart inside a Stack/Cluster
export function Spacer() {
  return <div style={{ flex: 1 }} aria-hidden />;
}

// Header pattern: <Stack direction="horizontal" align="center">
//   <Heading>Title</Heading><Spacer /><Button>Action</Button>
// </Stack>`}
        lang="tsx"
        filename="Inline-Center-Spacer.tsx"
      />

      <ArticleTable
        caption="The layout primitive set and when to reach for each."
        minWidth={840}
      >
        <table>
          <thead>
            <tr>
              <th>Primitive</th>
              <th>Does</th>
              <th>Use for</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>Box</code></td>
              <td>Token padding/bg/radius/border</td>
              <td>Surfaces, cards, base element</td>
            </tr>
            <tr>
              <td><code>Stack</code></td>
              <td>One-direction flex + gap</td>
              <td>Vertical/horizontal rhythm (most layouts)</td>
            </tr>
            <tr>
              <td><code>Cluster</code></td>
              <td>Wrapping flex + gap</td>
              <td>Tags, toolbars, chips (unknown count)</td>
            </tr>
            <tr>
              <td><code>Grid</code></td>
              <td>Responsive columns, no media queries</td>
              <td>Card grids, galleries</td>
            </tr>
            <tr>
              <td><code>Inline</code></td>
              <td>Baseline-aligned row</td>
              <td>Icon + label, control + hint</td>
            </tr>
            <tr>
              <td><code>Center</code></td>
              <td>Max-width + center</td>
              <td>Readable article/body content</td>
            </tr>
            <tr>
              <td><code>Spacer</code></td>
              <td>Flexible gap</td>
              <td>Push siblings apart in a bar</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="composing">Composing a Real Layout</h2>
      <p>
        The payoff: a complete page layout built entirely from primitives, with zero hand-written
        flexbox and zero margins — all spacing flows from tokens.
      </p>

      <CodeBlock
        code={`function DashboardPage() {
  return (
    <Stack gap="8">                              {/* page sections, 32px apart */}
      <Stack direction="horizontal" align="center">  {/* header bar */}
        <Heading>Dashboard</Heading>
        <Spacer />
        <Cluster gap="2">                        {/* action group, wraps on mobile */}
          <Button variant="ghost">Export</Button>
          <Button>New</Button>
        </Cluster>
      </Stack>

      <Grid minItemWidth="16rem" gap="4">        {/* responsive stat cards */}
        {stats.map((s) => (
          <Box key={s.id} padding="6" background="surface" radius="lg" border>
            <Stack gap="1">
              <Text variant="caption">{s.label}</Text>
              <Heading size="lg">{s.value}</Heading>
            </Stack>
          </Box>
        ))}
      </Grid>

      <Center maxWidth="70ch">
        <Stack gap="4">{/* article-width content */}</Stack>
      </Center>
    </Stack>
  );
}`}
        lang="tsx"
        filename="DashboardPage.tsx"
      />

      <h2 id="interview-framing">Interview Framing</h2>
      <InterviewPlaybook
        title="How to answer: 'How does your design system handle layout and spacing?'"
        intro="Many candidates only think of styled atoms. Mentioning layout primitives + the no-margins rule signals real production experience."
        steps={[
          "State that layout is most of the work, so the system ships layout primitives (Box, Stack, Cluster, Grid, Inline) that own spacing via token gaps.",
          "Lead with the golden rule: components never set their own outer margins — the parent layout owns spacing, which keeps components reusable in any context.",
          "Show Grid's auto-fit + minmax pattern for responsive columns without media queries.",
          "Explain the payoff: layouts compose from a handful of primitives, spacing is always token-based, and 'almost-right' spacing becomes impossible.",
          "Mention the lineage (Every Layout) and that primitives are the highest-leverage components since they're on every screen.",
        ]}
      />

      <InterviewChallenge
        title="Refactor a margin-soup component"
        scenario={
          <>
            You find a <code>Card</code> that sets <code>margin-bottom: 16px</code> and a{" "}
            <code>CardList</code> that renders cards in a <code>div</code> with hand-written{" "}
            <code>display:flex; gap:12px</code>. In one place the cards have too much space, in
            another too little, and a designer wants the grid to become responsive.
          </>
        }
        tasks={[
          "Explain what's structurally wrong and which rule it violates.",
          "Refactor it using layout primitives so spacing is consistent and reusable.",
          "Make the card grid responsive without writing media queries.",
        ]}
      />
      <SolutionReveal difficulty="medium">
        <p>
          <strong>Wrong:</strong> the Card owns an outer margin (context coupling — violates the
          no-margins rule), and the list hardcodes off-token spacing (<code>12px</code> isn&rsquo;t a
          token step). That&rsquo;s why spacing is wrong in different contexts.
        </p>
        <CodeBlock
          code={`// Card: remove margin entirely — it only styles its own inside
function Card({ children }) {
  return <Box padding="6" background="surface" radius="lg" border>{children}</Box>;
}

// Spacing + responsiveness owned by the layout primitive, all token-based:
function CardList({ items }) {
  return (
    <Grid minItemWidth="18rem" gap="4">   {/* responsive, no media queries, token gap */}
      {items.map((i) => <Card key={i.id}>{i.content}</Card>)}
    </Grid>
  );
}`}
          lang="tsx"
        />
        <p>
          Now the Card is reusable anywhere; spacing comes from <code>Grid gap=&quot;4&quot;</code>{" "}
          (a real token), and <code>auto-fit + minmax</code> makes it responsive with no breakpoints.
        </p>
      </SolutionReveal>

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>
          <strong>Layout primitives</strong> (Box, Stack, Cluster, Grid, Inline, Center, Spacer) are
          the highest-leverage components — used on every screen.
        </li>
        <li>
          <strong>Golden rule: components own no outer margins.</strong> Spacing is owned by the
          parent layout primitive via token-based <code>gap</code>.
        </li>
        <li>
          <strong>Stack</strong> handles ~80% of layouts; <strong>Cluster</strong> wraps unknown-count
          groups; <strong>Grid</strong> with <code>auto-fit + minmax</code> is responsive without
          media queries.
        </li>
        <li>
          Primitives accept only <strong>token-based spacing</strong>, making &ldquo;almost-right&rdquo;
          spacing impossible.
        </li>
        <li>
          Whole pages <strong>compose from primitives</strong> with zero hand-written flexbox and zero
          margins.
        </li>
      </ul>
    </div>
  );
}
