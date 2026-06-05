import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { ArticleTable, InterviewPlaybook, InterviewChallenge, SolutionReveal, CodeBlock } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const tableLayersDiagram = String.raw`flowchart TD
  LOGIC["Logic layer (headless)<br/>TanStack Table: sort/filter/page/select"] --> PRES["Presentation layer<br/>token-styled Table primitives"]
  PRES --> COMPOSED["Composed DataTable<br/>(opinionated, batteries-included)"]
  LOGIC -.->|"also usable directly<br/>for custom tables"| PRES`;

const virtualizationDiagram = String.raw`flowchart LR
  DATA["10,000 rows"] --> VIRT["Virtualizer"]
  VIRT --> VISIBLE["Render only ~20 visible rows<br/>+ small overscan"]
  VISIBLE --> DOM["DOM stays tiny -> 60fps scroll"]
  DATA -.->|"naive: render all"| JANK["10k DOM nodes -> jank / crash"]`;

export const toc: TocItem[] = [
  { id: "hardest-component", title: "The Hardest Component", level: 2 },
  { id: "primitives-vs-datatable", title: "Two Layers: Table Primitives vs DataTable", level: 2 },
  { id: "accessible-table", title: "The Accessible Table Primitives", level: 2 },
  { id: "headless-logic", title: "Headless Logic with TanStack Table", level: 2 },
  { id: "composed", title: "Composing the DataTable", level: 2 },
  { id: "virtualization", title: "Virtualization for Large Data", level: 2 },
  { id: "states", title: "The States Everyone Forgets", level: 2 },
  { id: "responsive", title: "Responsive Tables", level: 2 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "challenge", title: "Challenge", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function DataTablesAndComplexComponents() {
  return (
    <div className="article-content">
      <p>
        The data table is the component that breaks design systems. It combines sorting, filtering,
        pagination, row selection, column resizing, sticky headers, virtualization for large data,
        accessibility for a grid, and a dozen states (loading, empty, error, partial). Teams either
        ship a rigid table nobody can extend or no table at all — and then every product builds its
        own. This module builds a real, layered DataTable: accessible primitives + headless logic +
        a composed batteries-included component, all runnable.
      </p>

      <h2 id="hardest-component">The Hardest Component</h2>
      <p>
        What makes tables uniquely hard is the <strong>combinatorial surface</strong>: every feature
        (sort, filter, paginate, select, expand, resize) interacts with every other, and the
        accessibility model for an interactive grid (<code>role=&quot;grid&quot;</code>, arrow-key
        navigation between cells) is among the most complex in the ARIA spec. Add 10,000 rows and you
        need virtualization. This is why the build-vs-buy decision is even sharper here than for a
        Combobox.
      </p>

      <h2 id="primitives-vs-datatable">Two Layers: Table Primitives vs DataTable</h2>
      <p>
        The winning architecture ships <strong>two things</strong>: low-level, accessible{" "}
        <strong>Table primitives</strong> (styled <code>Table</code>, <code>THead</code>,{" "}
        <code>Tr</code>, <code>Th</code>, <code>Td</code>) for teams that want full control, and an
        opinionated, <strong>batteries-included DataTable</strong> built on a headless logic engine
        for the common case. Don&rsquo;t force everyone into the opinionated one — escape hatches
        prevent forking.
      </p>

      <MermaidDiagram
        chart={tableLayersDiagram}
        title="The table architecture"
        caption="A headless logic layer drives an opinionated DataTable, while styled primitives stay available for fully custom tables."
        minHeight={300}
      />

      <h2 id="accessible-table">The Accessible Table Primitives</h2>
      <p>
        Start with semantic, token-styled primitives. For <em>static tabular data</em>, a real{" "}
        <code>&lt;table&gt;</code> with proper <code>&lt;th scope&gt;</code> is the accessible base —
        don&rsquo;t rebuild it from divs. Add <code>aria-sort</code> on sortable headers.
      </p>

      <CodeBlock
        code={`export function Table(props: React.TableHTMLAttributes<HTMLTableElement>) {
  return <table className="ds-table" {...props} />;
}
export function Th({ sort, ...props }: { sort?: "asc" | "desc" | "none" } & React.ThHTMLAttributes<HTMLTableCellElement>) {
  return <th scope="col" aria-sort={sort ?? undefined} className="ds-th" {...props} />;
}
export const THead = (p: React.HTMLAttributes<HTMLTableSectionElement>) => <thead className="ds-thead" {...p} />;
export const Tr = (p: React.HTMLAttributes<HTMLTableRowElement>) => <tr className="ds-tr" {...p} />;
export const Td = (p: React.TdHTMLAttributes<HTMLTableCellElement>) => <td className="ds-td" {...p} />;`}
        lang="tsx"
        filename="Table.tsx"
      />

      <CodeBlock
        code={`.ds-table { width: 100%; border-collapse: collapse; }
.ds-th, .ds-td {
  padding: var(--space-3) var(--space-4);
  text-align: left;
  border-bottom: 1px solid var(--color-border-subtle);
}
.ds-th { color: var(--color-text-muted); font-weight: 600; position: sticky; top: 0; background: var(--color-bg-surface); }
.ds-tr:hover .ds-td { background: var(--color-bg-hover); }
.ds-th[aria-sort] { cursor: pointer; }   /* sortable affordance */`}
        lang="css"
        filename="table.css"
      />

      <h2 id="headless-logic">Headless Logic with TanStack Table</h2>
      <p>
        The logic — sorting, filtering, pagination, selection, column model — is exactly the kind of
        thing you should <strong>not</strong> hand-roll. <strong>TanStack Table</strong> is the
        headless standard: it computes everything and renders nothing, so you bring your own
        token-styled primitives. This mirrors the headless principle from the component-architecture
        module, applied to the hardest component.
      </p>

      <CodeBlock
        code={`import {
  useReactTable, getCoreRowModel, getSortedRowModel,
  getPaginationRowModel, flexRender, type ColumnDef, type SortingState,
} from "@tanstack/react-table";

interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  loading?: boolean;
  emptyMessage?: string;
}

export function DataTable<T>({ data, columns, loading, emptyMessage = "No data" }: DataTableProps<T>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);

  const table = useReactTable({
    data, columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  if (loading) return <TableSkeleton columns={columns.length} />;     // loading state
  if (data.length === 0) return <EmptyState message={emptyMessage} />; // empty state

  return (
    <Table>
      <THead>
        {table.getHeaderGroups().map((hg) => (
          <Tr key={hg.id}>
            {hg.headers.map((header) => {
              const sorted = header.column.getIsSorted();
              return (
                <Th
                  key={header.id}
                  sort={sorted === "asc" ? "asc" : sorted === "desc" ? "desc" : "none"}
                  onClick={header.column.getToggleSortingHandler()}
                >
                  {flexRender(header.column.columnDef.header, header.getContext())}
                  {sorted === "asc" ? " ↑" : sorted === "desc" ? " ↓" : ""}
                </Th>
              );
            })}
          </Tr>
        ))}
      </THead>
      <tbody>
        {table.getRowModel().rows.map((row) => (
          <Tr key={row.id}>
            {row.getVisibleCells().map((cell) => (
              <Td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</Td>
            ))}
          </Tr>
        ))}
      </tbody>
    </Table>
  );
}`}
        lang="tsx"
        filename="DataTable.tsx"
      />

      <h2 id="composed">Composing the DataTable</h2>
      <p>
        Consumers define columns declaratively and get sorting, pagination, and states for free — the
        batteries-included experience built on accessible primitives:
      </p>

      <CodeBlock
        code={`const columns: ColumnDef<User>[] = [
  { accessorKey: "name", header: "Name" },
  { accessorKey: "email", header: "Email" },
  { accessorKey: "role", header: "Role", cell: (c) => <Badge>{c.getValue<string>()}</Badge> },
  { id: "actions", header: "", cell: (c) => <RowMenu user={c.row.original} /> },
];

<DataTable data={users} columns={columns} loading={isLoading} emptyMessage="No users yet" />`}
        lang="tsx"
        filename="usage.tsx"
      />

      <h2 id="virtualization">Virtualization for Large Data</h2>
      <p>
        Rendering 10,000 rows means 10,000+ DOM nodes — slow or crashing. <strong>Virtualization</strong>{" "}
        (TanStack Virtual) renders only the rows in the viewport plus a small overscan, recycling
        them as you scroll, so the DOM stays tiny regardless of dataset size.
      </p>

      <MermaidDiagram
        chart={virtualizationDiagram}
        title="Virtualization keeps the DOM small"
        caption="Only the visible rows (plus overscan) are rendered; the rest exist as data, so scroll stays at 60fps even with 10k rows."
        minHeight={260}
      />

      <CodeBlock
        code={`import { useVirtualizer } from "@tanstack/react-virtual";

function VirtualRows<T>({ rows }: { rows: Row<T>[] }) {
  const parentRef = React.useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48,     // estimated row height
    overscan: 8,                // render a few extra above/below
  });

  return (
    <div ref={parentRef} style={{ height: 600, overflow: "auto" }}>
      <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
        {virtualizer.getVirtualItems().map((vi) => (
          <div key={vi.key}
               style={{ position: "absolute", top: 0, transform: \`translateY(\${vi.start}px)\`, width: "100%" }}>
            {/* render rows[vi.index] */}
          </div>
        ))}
      </div>
    </div>
  );
}
// Note: virtualized rows can't use a native <table> layout — use role="grid" + CSS grid rows.`}
        lang="tsx"
        filename="virtual-rows.tsx"
      />

      <h2 id="states">The States Everyone Forgets</h2>
      <p>
        A table isn&rsquo;t done until <em>every</em> state is designed and shipped as a story. These
        are where unfinished tables embarrass teams in production:
      </p>
      <ul>
        <li><strong>Loading</strong> — skeleton rows, not a blank flash or a centered spinner that shifts layout.</li>
        <li><strong>Empty</strong> — a real empty state with guidance/CTA, not &ldquo;0 results.&rdquo;</li>
        <li><strong>Error</strong> — a retry affordance, not a silent blank.</li>
        <li><strong>Partial / loading more</strong> — infinite scroll or &ldquo;load more&rdquo; indicator.</li>
        <li><strong>No matches after filter</strong> — distinct from &ldquo;no data at all.&rdquo;</li>
        <li><strong>Selection</strong> — header checkbox is indeterminate when some rows are selected.</li>
      </ul>

      <h2 id="responsive">Responsive Tables</h2>
      <p>
        Tables and small screens conflict. Three strategies, picked per use case: <strong>horizontal
        scroll</strong> (simplest, keep the table, scroll the container — works for data-dense
        tables), <strong>column priority</strong> (hide low-priority columns at narrow widths), or{" "}
        <strong>card transformation</strong> (each row becomes a stacked card below a breakpoint —
        best for human-readable records). The system should support at least scroll + column-hiding
        as built-in options.
      </p>

      <ArticleTable
        caption="Responsive table strategies."
        minWidth={800}
      >
        <table>
          <thead>
            <tr><th>Strategy</th><th>How</th><th>Best for</th></tr>
          </thead>
          <tbody>
            <tr><td>Horizontal scroll</td><td>Overflow container</td><td>Dense data, many columns</td></tr>
            <tr><td>Column priority</td><td>Hide low-priority columns</td><td>Tables with a clear key column</td></tr>
            <tr><td>Card transform</td><td>Row → stacked card</td><td>Human-readable records (users, orders)</td></tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="interview-framing">Interview Framing</h2>
      <InterviewPlaybook
        title="How to answer: 'How would you build a data table for a design system?'"
        intro="The ultimate component question. The signal: layered architecture, headless logic, every state, virtualization, and accessibility — not a monolith."
        steps={[
          "Acknowledge it's the hardest component: sort/filter/paginate/select all interact, grid a11y is complex, and large data needs virtualization.",
          "Ship two layers: accessible token-styled Table primitives for custom tables + an opinionated DataTable for the common case (don't force one).",
          "Use a headless logic engine (TanStack Table) — never hand-roll sorting/filtering/pagination; bring your own styled primitives.",
          "Virtualize large datasets (TanStack Virtual) so the DOM stays small; note virtualized rows need role=grid + CSS, not native <table>.",
          "Design EVERY state (loading skeleton, empty, error+retry, no-match, selection-indeterminate) and ship each as a story; support responsive strategies.",
        ]}
      />

      <InterviewChallenge
        title="Scale the table to 50,000 rows"
        scenario={
          <>
            Your DataTable works great for 200 rows but a team needs to show 50,000 with sorting and
            filtering. It freezes the browser on load, sorting takes seconds, and scrolling is
            unusable. They also need a sticky header and row selection that survives sorting.
          </>
        }
        tasks={[
          "Diagnose the performance problems and fix each.",
          "Decide where sorting/filtering should happen at this scale.",
          "Keep accessibility and selection correct under virtualization + sorting.",
        ]}
      />
      <SolutionReveal difficulty="hard">
        <p>
          <strong>Diagnosis:</strong> (1) freeze on load = rendering 50k rows into the DOM →{" "}
          <strong>virtualize</strong> (render ~20 visible). (2) slow sort = sorting 50k rows on the
          client per interaction → at this scale, move <strong>sorting/filtering server-side</strong>{" "}
          (send sort/filter/page params, return one page) so the client never holds or processes all
          50k. (3) unusable scroll = same DOM-size problem, fixed by virtualization.
        </p>
        <p>
          <strong>Where logic runs:</strong> 200 rows → client-side (TanStack core models). 50k →
          server-side pagination/sort/filter; TanStack supports <code>manualSorting</code>/
          <code>manualPagination</code> so the table delegates to your API and just renders the
          returned page.
        </p>
        <p>
          <strong>A11y + selection under virtualization:</strong> virtualized rows can&rsquo;t use a
          native <code>&lt;table&gt;</code> (rows aren&rsquo;t all present), so use{" "}
          <code>role=&quot;grid&quot;</code> with proper row/cell roles and{" "}
          <code>aria-rowcount</code>/<code>aria-rowindex</code> reflecting the <em>full</em> dataset,
          not just rendered rows. Keep <strong>selection state keyed by row id</strong> (not index)
          in a Set/Map outside the virtualizer, so it survives sorting, filtering, and rows scrolling
          out of view; the header checkbox shows <code>indeterminate</code> when some-but-not-all of
          the full set is selected. Sticky header: <code>position: sticky</code> on the header row /
          a fixed header outside the scroll container.
        </p>
      </SolutionReveal>

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>
          The <strong>data table is the hardest component</strong> — interacting features, complex
          grid a11y, and large-data performance.
        </li>
        <li>
          Ship <strong>two layers</strong>: accessible token-styled Table primitives + an opinionated
          DataTable; don&rsquo;t force everyone into the opinionated one.
        </li>
        <li>
          Use <strong>headless logic</strong> (TanStack Table) for sort/filter/paginate/select;
          bring your own styled primitives.
        </li>
        <li>
          <strong>Virtualize</strong> large datasets (TanStack Virtual); virtualized rows need{" "}
          <code>role=&quot;grid&quot;</code> + ARIA row counts, not a native <code>&lt;table&gt;</code>.
        </li>
        <li>
          Design <strong>every state</strong> (loading/empty/error/no-match/selection) and support{" "}
          <strong>responsive strategies</strong>; at scale, move sort/filter <strong>server-side</strong>{" "}
          and key selection by row id.
        </li>
      </ul>
    </div>
  );
}
