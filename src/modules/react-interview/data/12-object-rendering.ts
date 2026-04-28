import type { ChallengeTopic } from "./types";

const topic: ChallengeTopic = {
  id: "object-rendering",
  title: "Object → UI",
  icon: "📊",
  description:
    "Traverse nested data objects and render structured UIs. Arrays inside objects become components. The key skill: decompose data shape into component shape.",
  accentColor: "#f59e0b",
  challenges: [
    {
      id: "render-report-object",
      topicId: "object-rendering",
      title: "Render a nested report object as a structured table",
      difficulty: "easy",
      estimatedMinutes: 15,
      description:
        "You receive a `report` object with a `title`, a `summary`, and a `regions` array. Each region has a `name`, a `total`, and a `products` array. Render the report as a readable UI: show the title and summary at the top, then for each region render its name and total, and beneath it a table of its products (name, units, revenue). Wherever you see an array in the data — put a component there.",
      concepts: [
        "object traversal",
        "array.map",
        "component decomposition",
        "JSX",
      ],
      starterCode: `const report = {
  title: "Q1 Sales Report",
  summary: "Strong performance across all regions. North led in revenue.",
  regions: [
    {
      name: "North",
      total: 120000,
      products: [
        { name: "Widget A", units: 500, revenue: 50000 },
        { name: "Widget B", units: 700, revenue: 70000 },
      ],
    },
    {
      name: "South",
      total: 85000,
      products: [
        { name: "Widget A", units: 300, revenue: 30000 },
        { name: "Widget C", units: 550, revenue: 55000 },
      ],
    },
    {
      name: "East",
      total: 60000,
      products: [
        { name: "Widget B", units: 200, revenue: 20000 },
        { name: "Widget C", units: 400, revenue: 40000 },
      ],
    },
  ],
};

function ProductTable({ products }) {
  // TODO: render a table with columns: Name | Units | Revenue
}

function RegionSection({ region }) {
  // TODO: render region name, total, and its ProductTable
}

function SalesReport({ report }) {
  // TODO: render title, summary, and map regions to RegionSection
}

export default function App() {
  return <SalesReport report={report} />;
}`,
      hints: [
        "Start from the outside in: `SalesReport` renders title + summary + `report.regions.map(r => <RegionSection region={r} />)`.",
        "`RegionSection` renders the region's name, total, and delegates products to `<ProductTable products={region.products} />`.",
        "`ProductTable` maps `products` to `<tr>` rows inside a `<table>` with `<thead>` columns.",
      ],
      tests: [
        {
          description: "renders the report title",
          code: `
it("renders the report title", () => {
  render(<App />);
  expect(screen.getByText("Q1 Sales Report")).toBeTruthy();
});`,
        },
        {
          description: "renders all three region names",
          code: `
it("renders all three region names", () => {
  render(<App />);
  expect(screen.getByText("North")).toBeTruthy();
  expect(screen.getByText("South")).toBeTruthy();
  expect(screen.getByText("East")).toBeTruthy();
});`,
        },
        {
          description: "renders product names from the North region",
          code: `
it("renders product names from the North region", () => {
  render(<App />);
  expect(screen.getAllByText("Widget A").length).toBeGreaterThanOrEqual(1);
  expect(screen.getAllByText("Widget B").length).toBeGreaterThanOrEqual(1);
});`,
        },
        {
          description: "renders the summary text",
          code: `
it("renders the summary text", () => {
  render(<App />);
  expect(screen.getByText(/Strong performance/)).toBeTruthy();
});`,
        },
      ],
    },
    {
      id: "object-to-table",
      topicId: "object-rendering",
      title: "Render a dynamic table from a columns/rows config object",
      difficulty: "easy",
      estimatedMinutes: 12,
      description:
        "You receive a `tableData` object with two keys: `columns` (an array of header strings) and `rows` (an array of arrays, each being one row of values). Render a proper `<table>` — `<thead>` from `columns`, `<tbody>` with one `<tr>` per row. The table must work for any number of columns and rows without hardcoding column names.",
      concepts: ["object traversal", "array.map", "dynamic rendering", "table"],
      starterCode: `const tableData = {
  columns: ["Employee", "Department", "Salary", "Start Date"],
  rows: [
    ["Alice Martin",  "Engineering", "$120,000", "2021-03-15"],
    ["Bob Chen",      "Design",      "$95,000",  "2022-07-01"],
    ["Carol Smith",   "Engineering", "$130,000", "2020-01-10"],
    ["David Park",    "Marketing",   "$88,000",  "2023-02-20"],
    ["Eva Torres",    "Design",      "$102,000", "2021-11-05"],
  ],
};

function DataTable({ data }) {
  // TODO: render <table> using data.columns for <thead> and data.rows for <tbody>
}

export default function App() {
  return <DataTable data={tableData} />;
}`,
      hints: [
        "Build `<thead>` by mapping `data.columns`: `data.columns.map((col, i) => <th key={i}>{col}</th>)`.",
        "Build `<tbody>` by mapping `data.rows`, then for each row map its values to `<td>` cells.",
        "Use the row index as the outer key and cell index as the inner key since the data has no IDs.",
      ],
      tests: [
        {
          description: "renders all 4 column headers",
          code: `
it("renders all 4 column headers", () => {
  render(<App />);
  expect(screen.getByText("Employee")).toBeTruthy();
  expect(screen.getByText("Department")).toBeTruthy();
  expect(screen.getByText("Salary")).toBeTruthy();
  expect(screen.getByText("Start Date")).toBeTruthy();
});`,
        },
        {
          description: "renders all 5 employee names",
          code: `
it("renders all 5 employee names", () => {
  render(<App />);
  expect(screen.getByText("Alice Martin")).toBeTruthy();
  expect(screen.getByText("Bob Chen")).toBeTruthy();
  expect(screen.getByText("Carol Smith")).toBeTruthy();
  expect(screen.getByText("David Park")).toBeTruthy();
  expect(screen.getByText("Eva Torres")).toBeTruthy();
});`,
        },
        {
          description: "renders a table element",
          code: `
it("renders a <table> element", () => {
  render(<App />);
  expect(document.querySelector("table")).toBeTruthy();
  expect(document.querySelector("thead")).toBeTruthy();
  expect(document.querySelector("tbody")).toBeTruthy();
});`,
        },
        {
          description: "tbody has exactly 5 rows",
          code: `
it("tbody has exactly 5 rows", () => {
  render(<App />);
  const rows = document.querySelectorAll("tbody tr");
  expect(rows.length).toBe(5);
});`,
        },
      ],
    },
    {
      id: "nested-api-dashboard",
      topicId: "object-rendering",
      title: "Render a nested API response as a department dashboard",
      difficulty: "medium",
      estimatedMinutes: 25,
      description:
        "You receive a `company` object that mirrors a real API response: it has a `name`, `founded` year, and a `departments` array. Each department has a `name`, `headcount`, `budget`, and an `employees` array. Each employee has `name`, `role`, and `yearsAtCompany`. Render a dashboard: company header at the top, then one card per department showing its stats and a table of its employees. No hardcoded field names — derive everything from the data shape.",
      concepts: [
        "nested object traversal",
        "component decomposition",
        "array.map",
        "data-driven UI",
      ],
      starterCode: `const company = {
  name: "Acme Corp",
  founded: 2010,
  departments: [
    {
      name: "Engineering",
      headcount: 3,
      budget: "$2,400,000",
      employees: [
        { name: "Alice Martin",  role: "Senior Engineer",  yearsAtCompany: 4 },
        { name: "Carol Smith",   role: "Staff Engineer",   yearsAtCompany: 6 },
        { name: "Liam Nguyen",   role: "Junior Engineer",  yearsAtCompany: 1 },
      ],
    },
    {
      name: "Design",
      headcount: 2,
      budget: "$800,000",
      employees: [
        { name: "Bob Chen",    role: "Lead Designer",  yearsAtCompany: 3 },
        { name: "Eva Torres",  role: "UI Designer",    yearsAtCompany: 2 },
      ],
    },
    {
      name: "Marketing",
      headcount: 2,
      budget: "$600,000",
      employees: [
        { name: "David Park",   role: "Marketing Manager",  yearsAtCompany: 1 },
        { name: "Sara Lin",     role: "Content Strategist", yearsAtCompany: 2 },
      ],
    },
  ],
};

function EmployeeTable({ employees }) {
  // TODO: render a table with Name | Role | Years columns
}

function DepartmentCard({ department }) {
  // TODO: render card with department name, headcount, budget, and EmployeeTable
}

function CompanyDashboard({ company }) {
  // TODO: render company name + founded year, then map departments to DepartmentCard
}

export default function App() {
  return <CompanyDashboard company={company} />;
}`,
      hints: [
        "Work outside-in: `CompanyDashboard` → `company.departments.map(d => <DepartmentCard department={d} />)`.",
        "`DepartmentCard` shows `department.name`, `department.headcount`, `department.budget`, then renders `<EmployeeTable employees={department.employees} />`.",
        "`EmployeeTable` maps `employees` to rows with `employee.name`, `employee.role`, `employee.yearsAtCompany`. Each array in the data = one component.",
      ],
      tests: [
        {
          description: "renders the company name",
          code: `
it("renders the company name", () => {
  render(<App />);
  expect(screen.getByText("Acme Corp")).toBeTruthy();
});`,
        },
        {
          description: "renders all three department names",
          code: `
it("renders all three department names", () => {
  render(<App />);
  expect(screen.getByText("Engineering")).toBeTruthy();
  expect(screen.getByText("Design")).toBeTruthy();
  expect(screen.getByText("Marketing")).toBeTruthy();
});`,
        },
        {
          description: "renders employee names across departments",
          code: `
it("renders employee names across departments", () => {
  render(<App />);
  expect(screen.getByText("Alice Martin")).toBeTruthy();
  expect(screen.getByText("Bob Chen")).toBeTruthy();
  expect(screen.getByText("David Park")).toBeTruthy();
});`,
        },
        {
          description: "renders employee roles",
          code: `
it("renders employee roles", () => {
  render(<App />);
  expect(screen.getByText("Senior Engineer")).toBeTruthy();
  expect(screen.getByText("Lead Designer")).toBeTruthy();
});`,
        },
        {
          description: "renders budget values",
          code: `
it("renders budget values for each department", () => {
  render(<App />);
  expect(screen.getByText("$2,400,000")).toBeTruthy();
  expect(screen.getByText("$800,000")).toBeTruthy();
  expect(screen.getByText("$600,000")).toBeTruthy();
});`,
        },
      ],
    },
    {
      id: "react-product-comparison-table",
      topicId: "object-rendering",
      title: "Render a realistic product comparison table from config data",
      difficulty: "hard",
      estimatedMinutes: 35,
      description:
        "You receive a configuration object describing plans and feature rows. Render a semantic comparison table with a highlighted recommended plan, human-readable status cells, and a supporting section title. This is a realistic UI exercise in turning structured data into a polished React interface.",
      targetImage: {
        src: "/react-challenges/product-comparison-table.svg",
        alt: "React interview target mock for a realistic product comparison page with a semantic feature matrix and highlighted recommended plan.",
        caption:
          "The UI should feel like a real pricing comparison screen, but the key skill is still data-to-UI rendering: headers, rows, status cells, and recommended-plan emphasis all come from config.",
      },
      concepts: [
        "object traversal",
        "config-driven UI",
        "table rendering",
        "conditional rendering",
        "semantic HTML",
      ],
      starterCode: `const comparison = {
  title: "Choose the right plan for your team",
  recommendedPlanId: "growth",
  plans: [
    { id: "starter", name: "Starter", price: "$19" },
    { id: "growth", name: "Growth", price: "$79" },
    { id: "scale", name: "Scale", price: "$199" },
  ],
  featureRows: [
    {
      feature: "Seats included",
      values: { starter: "5", growth: "20", scale: "Unlimited" },
    },
    {
      feature: "Unlimited projects",
      values: { starter: false, growth: true, scale: true },
    },
    {
      feature: "SSO support",
      values: { starter: false, growth: false, scale: true },
    },
    {
      feature: "Audit logs",
      values: { starter: false, growth: false, scale: true },
    },
  ],
};

function formatValue(value) {
  // TODO:
  // true -> "Included"
  // false -> "Not included"
  // strings stay as-is
}

function ComparisonTable({ comparison }) {
  // TODO:
  // 1. render the title
  // 2. render a semantic table with a caption
  // 3. render one plan column per comparison.plans entry
  // 4. visually label the recommended plan
  // 5. render feature rows from comparison.featureRows
  return <section />;
}

function App() {
  return <ComparisonTable comparison={comparison} />;
}

export default App;`,
      hints: [
        "Map `comparison.plans` once for the column headers, and again inside each feature row for the value cells.",
        "Use a row header cell for the feature name: `<th scope='row'>`.",
        "A small helper like `formatValue` keeps the JSX much cleaner when booleans and strings are mixed in the same table.",
      ],
      tests: [
        {
          description: "renders the page title and the three plan names",
          code: `
it("renders the page title and plan names", () => {
  render(<App />);
  expect(screen.getByText("Choose the right plan for your team")).toBeTruthy();
  expect(screen.getByText("Starter")).toBeTruthy();
  expect(screen.getByText("Growth")).toBeTruthy();
  expect(screen.getByText("Scale")).toBeTruthy();
});`,
        },
        {
          description: "renders a semantic table and the feature row labels",
          code: `
it("renders a semantic table and feature labels", () => {
  render(<App />);
  expect(document.querySelector("table")).toBeTruthy();
  expect(screen.getByText("Seats included")).toBeTruthy();
  expect(screen.getByText("Unlimited projects")).toBeTruthy();
});`,
        },
        {
          description: "formats boolean plan values into human-readable labels",
          code: `
it("formats booleans as Included and Not included", () => {
  render(<App />);
  expect(screen.getAllByText("Included").length).toBeGreaterThan(0);
  expect(screen.getAllByText("Not included").length).toBeGreaterThan(0);
});`,
        },
      ],
    },
  ],
};

export default topic;
