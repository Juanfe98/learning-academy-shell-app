import type { TocItem } from "@/lib/types/academy";

export const toc: TocItem[] = [
  { id: "twelve-factor", title: "Twelve-Factor Backend Basics", level: 2 },
  { id: "dockerfile", title: "Production Dockerfile", level: 2 },
  { id: "container-shutdown", title: "Container Shutdown and Signal Handling", level: 2 },
  { id: "kubernetes-probes", title: "Kubernetes Readiness and Liveness", level: 2 },
  { id: "zero-downtime", title: "Zero-Downtime Deployments", level: 2 },
  { id: "config-secrets", title: "Config and Secret Rotation", level: 2 },
  { id: "runbook", title: "Senior Operations Runbook", level: 2 },
];

export default function DeploymentOperations() {
  return (
    <div className="article-content">
      <p>
        A senior Node.js engineer should know how Express behaves after it leaves localhost. This
        lesson covers Docker, probes, signals, deployments, and operational practices that frequently
        appear in senior interviews.
      </p>

      <h2 id="twelve-factor">Twelve-Factor Backend Basics</h2>
      <ul>
        <li>Config comes from environment variables or a managed secret store, not committed files.</li>
        <li>Processes are disposable: they can start, stop, and restart safely.</li>
        <li>Logs go to stdout/stderr for the platform to collect.</li>
        <li>State lives in external services: DB, Redis, object storage, queues.</li>
      </ul>

      <h2 id="dockerfile">Production Dockerfile</h2>
      <pre><code>{`# Multi-stage build for a TypeScript Express app
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
RUN pnpm build && pnpm prune --prod

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
USER node
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/package.json ./package.json
EXPOSE 3000
CMD ["node", "dist/server.js"]`}</code></pre>
      <p>
        Avoid running as root, avoid baking secrets into images, keep images small, and ensure the
        server handles <code>SIGTERM</code> for orchestrated shutdowns.
      </p>

      <h2 id="container-shutdown">Container Shutdown and Signal Handling</h2>
      <p>
        Kubernetes and many platforms send <code>SIGTERM</code> first, then <code>SIGKILL</code> after a grace
        period. Your app should fail readiness, stop accepting new connections, finish in-flight
        requests, close DB/Redis/queue clients, and exit before the grace period expires.
      </p>

      <h2 id="kubernetes-probes">Kubernetes Readiness and Liveness</h2>
      <ul>
        <li><strong>Readiness</strong>: should this pod receive traffic?</li>
        <li><strong>Liveness</strong>: is this pod stuck and should it be restarted?</li>
        <li><strong>Startup</strong>: give slow-starting apps time before liveness checks begin.</li>
      </ul>
      <pre><code>{`app.get("/health/live", (req, res) => res.sendStatus(204));

app.get("/health/ready", async (req, res) => {
  if (isShuttingDown) return res.sendStatus(503);
  await prisma.$queryRaw\`SELECT 1\`;
  res.sendStatus(204);
});`}</code></pre>

      <h2 id="zero-downtime">Zero-Downtime Deployments</h2>
      <p>
        Zero downtime requires more than a rolling update. Use backward-compatible DB migrations,
        readiness gates, connection draining, feature flags, quick rollback, and dashboards that show
        error/latency changes by version.
      </p>
      <pre><code>{`// Expand/contract migration strategy
// 1. Expand: add nullable column or new table.
// 2. Deploy app that writes both old and new formats.
// 3. Backfill historical data.
// 4. Switch reads to the new format.
// 5. Contract: remove old column after all old app versions are gone.`}</code></pre>

      <h2 id="config-secrets">Config and Secret Rotation</h2>
      <p>
        Validate config at startup with a schema. For secret rotation, support overlapping old/new
        keys, reload secrets safely when the platform supports it, and never log secret values.
      </p>

      <h2 id="runbook">Senior Operations Runbook</h2>
      <ol>
        <li>Can I deploy without dropping requests?</li>
        <li>Can I roll back without breaking migrations?</li>
        <li>Can I tell which version introduced an error?</li>
        <li>Can I rotate credentials without downtime?</li>
        <li>Can a new engineer run the service locally and in staging?</li>
      </ol>
    </div>
  );
}
