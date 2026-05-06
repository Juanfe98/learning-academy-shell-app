import { ArticleTable } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

export const toc: TocItem[] = [
  { id: "module-systems", title: "ESM vs CommonJS", level: 2 },
  { id: "package-json", title: "package.json as Runtime Contract", level: 2 },
  { id: "exports-imports", title: "exports and imports Maps", level: 2 },
  { id: "dependency-hygiene", title: "Dependency Hygiene", level: 2 },
  { id: "env-config", title: "Environment and Configuration", level: 2 },
  { id: "tooling-stack", title: "Modern Tooling Stack", level: 2 },
];

export default function ModulesPackagesAndTooling() {
  return (
    <div className="article-content">
      <p>
        A lot of Node.js pain does not come from runtime bugs. It comes from
        package boundaries, mixed module systems, brittle scripts, loose semver
        assumptions, and configuration that only works on one laptop. This
        module is about making Node projects predictable to run, import,
        publish, and maintain.
      </p>

      <h2 id="module-systems">ESM vs CommonJS</h2>
      <ArticleTable
        caption="This comparison covers the differences interviewers and real code reviews actually care about."
        minWidth={960}
      >
        <table>
          <thead>
            <tr>
              <th>Topic</th>
              <th>ESM</th>
              <th>CommonJS</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Syntax</td>
              <td>
                <code>import</code> / <code>export</code>
              </td>
              <td>
                <code>require()</code> / <code>module.exports</code>
              </td>
            </tr>
            <tr>
              <td>Loading model</td>
              <td>Static graph, resolved before execution</td>
              <td>Dynamic at runtime</td>
            </tr>
            <tr>
              <td>Top-level await</td>
              <td>Supported</td>
              <td>Not supported directly</td>
            </tr>
            <tr>
              <td>Tree-shaking friendliness</td>
              <td>Better</td>
              <td>Worse</td>
            </tr>
            <tr>
              <td>Interop pain</td>
              <td>May need default/named import care</td>
              <td>Can consume most older packages easily</td>
            </tr>
            <tr>
              <td>Best default today</td>
              <td>Preferred for new apps and libraries</td>
              <td>Still common in legacy services and tools</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <pre>
        <code>{`// package.json
{
  "type": "module"
}

// ESM
import { readFile } from "node:fs/promises";
export function loadConfig() {}

// CommonJS
const fs = require("node:fs");
module.exports = { loadConfig };`}</code>
      </pre>

      <h2 id="package-json">package.json as Runtime Contract</h2>
      <p>
        Treat <code>package.json</code> as a contract, not just metadata. It
        tells humans and tools how the package should be loaded, which Node
        version is expected, which entrypoints are public, and which scripts
        define the workflow.
      </p>

      <ArticleTable
        caption="These fields have direct operational consequences, not just packaging trivia."
        minWidth={860}
      >
        <table>
          <thead>
            <tr>
              <th>Field</th>
              <th>Why it matters</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <code>type</code>
              </td>
              <td>
                Defines whether <code>.js</code> files are treated as ESM or
                CommonJS
              </td>
            </tr>
            <tr>
              <td>
                <code>engines</code>
              </td>
              <td>
                Protects the project from running on unsupported Node versions
              </td>
            </tr>
            <tr>
              <td>
                <code>exports</code>
              </td>
              <td>
                Controls the public surface area consumers are allowed to import
              </td>
            </tr>
            <tr>
              <td>
                <code>scripts</code>
              </td>
              <td>
                Creates consistent commands for dev, test, lint, and release
                tasks
              </td>
            </tr>
            <tr>
              <td>
                <code>private</code>
              </td>
              <td>Prevents accidental publishing of applications</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="exports-imports">exports and imports Maps</h2>
      <p>
        The <code>exports</code> field is how you prevent consumers from
        reaching into your internal folders. It lets you expose only supported
        entrypoints and even provide different files for import, require, or
        types.
      </p>

      <pre>
        <code>{`{
  "name": "@acme/utils",
  "type": "module",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    },
    "./crypto": {
      "types": "./dist/crypto.d.ts",
      "import": "./dist/crypto.js"
    }
  }
}`}</code>
      </pre>

      <p>
        Internal path aliases can also be declared with the <code>imports</code>{" "}
        field. That can be cleaner than deep relative paths, but only if the
        whole team and toolchain align on it.
      </p>

      <h2 id="dependency-hygiene">Dependency Hygiene</h2>
      <ul>
        <li>
          Prefer fewer dependencies with clearer maintenance stories over
          novelty packages.
        </li>
        <li>
          Pin or lock aggressively so CI and local dev install the same graph.
        </li>
        <li>
          Watch transitive dependency sprawl. Small apps become fragile through
          their supply chain.
        </li>
        <li>Separate runtime dependencies from dev-only tooling.</li>
        <li>
          Audit old packages for ESM compatibility, maintenance status, and
          security history.
        </li>
      </ul>

      <h2 id="env-config">Environment and Configuration</h2>
      <p>
        Configuration should come from environment variables or config files
        loaded at process start, validated once, and exposed through a typed
        config module. Do not scatter
        <code>process.env.X</code> reads across the codebase. That turns config
        into hidden global state.
      </p>

      <pre>
        <code>{`const required = ["DATABASE_URL", "JWT_SECRET"] as const;

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(\`Missing required env var: \${key}\`);
  }
}

export const config = {
  databaseUrl: process.env.DATABASE_URL!,
  jwtSecret: process.env.JWT_SECRET!,
  port: Number(process.env.PORT ?? 3000),
};`}</code>
      </pre>

      <h2 id="tooling-stack">Modern Tooling Stack</h2>
      <p>
        A practical Node stack today usually includes package management,
        linting, formatting, testing, type-checking when using TypeScript, and a
        predictable process runner for local development. The exact tools can
        differ; the principle does not. Local workflow should be one command
        away, and CI should execute the same checks with no hidden setup.
      </p>
    </div>
  );
}
