import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { ArticleTable } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const productionArchDiagram = String.raw`flowchart TD
    CLIENTS["Web / Mobile Clients"]
    CLIENTS --> LB["Load Balancer\n(nginx / AWS ALB)"]
    LB --> N1["Node.js Process 1\nPM2 / Pod 1"]
    LB --> N2["Node.js Process 2\nPM2 / Pod 2"]
    LB --> N3["Node.js Process 3\nPM2 / Pod 3"]
    N1 --> REDIS[("Redis\nSessions / Cache")]
    N2 --> REDIS
    N3 --> REDIS
    N1 --> DB[("PostgreSQL\nPrimary")]
    N2 --> DB
    N3 --> DB
    DB --> DBR[("PostgreSQL\nRead Replica")]`;

export const toc: TocItem[] = [
  { id: "production-arch", title: "Production Architecture", level: 2 },
  { id: "clustering", title: "Node.js Clustering", level: 2 },
  { id: "graceful-shutdown", title: "Graceful Shutdown", level: 2 },
  { id: "structured-logging", title: "Structured Logging with pino", level: 2 },
  { id: "health-checks", title: "Health Check Endpoints", level: 2 },
  { id: "env-config", title: "Environment Config Management", level: 2 },
  { id: "compression", title: "Response Compression", level: 2 },
  { id: "process-management", title: "Process Management", level: 2 },
  { id: "memory-leaks", title: "Memory Leak Patterns", level: 2 },
  { id: "monitoring", title: "Monitoring & Observability", level: 2 },
];

export default function ProductionReady() {
  return (
    <div className="article-content">
      <p>
        A working Express app and a production-ready Express app are different things. Production
        means: handles 10x traffic spikes, recovers from crashes without human intervention, tells
        you something is wrong before users notice, and can be deployed and rolled back safely. This
        module covers the operational concerns that separate hobby projects from production systems.
      </p>

      <h2 id="production-arch">Production Architecture</h2>
      <MermaidDiagram
        chart={productionArchDiagram}
        title="Production Node.js Architecture"
        caption="Multiple Node.js processes handle concurrent requests. A load balancer distributes traffic. Redis is the shared state store — sessions, cache, rate limiting counters. PostgreSQL handles persistence with read replicas for query-heavy workloads."
        minHeight={440}
      />

      <h2 id="clustering">Node.js Clustering</h2>
      <p>
        Node.js is single-threaded: one event loop per process. A 16-core server running one Node
        process uses 1/16th of its capacity. The <code>cluster</code> module forks multiple worker
        processes, each with its own event loop, sharing a single TCP port.
      </p>
      <pre><code>{`// src/cluster.ts — manual clustering
import cluster from "cluster";
import os from "os";

const numCPUs = os.cpus().length;

if (cluster.isPrimary) {
  console.log(\`Primary process PID \${process.pid}, forking \${numCPUs} workers\`);

  // Fork one worker per CPU
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  // Restart crashed workers
  cluster.on("exit", (worker, code, signal) => {
    console.error(\`Worker \${worker.process.pid} died (code=\${code}, signal=\${signal})\`);
    console.log("Forking a new worker...");
    cluster.fork();
  });
} else {
  // Worker process — start Express server
  const app = await import("./app");
  const server = app.default.listen(process.env.PORT ?? 3000);

  console.log(\`Worker \${process.pid} listening on port \${process.env.PORT}\`);
}

// Reality: in production you'll use PM2 or Docker instead of manual clustering
// PM2 cluster mode: pm2 start dist/server.js -i max
// Docker: run multiple containers behind a load balancer
// Kubernetes: multiple pods with HPA for autoscaling

// Important: shared state (sessions, rate limits) must be in Redis
// Sticky sessions (same IP → same worker) are an antipattern — use Redis store`}</code></pre>

      <h2 id="graceful-shutdown">Graceful Shutdown</h2>
      <p>
        When a deployment occurs, Kubernetes sends <code>SIGTERM</code> to the old pod. Without a
        graceful shutdown handler, in-flight requests get a connection reset. With it, the server
        stops accepting new connections but finishes serving current requests before exiting.
      </p>
      <pre><code>{`import http from "http";
import app from "./app";
import { prisma } from "./lib/prisma";
import { redis } from "./lib/redis";
import pino from "pino";

const logger = pino();
const server = http.createServer(app);

server.listen(process.env.PORT ?? 3000, () => {
  logger.info({ port: process.env.PORT ?? 3000 }, "Server started");
});

// Track in-flight connections to wait for them during shutdown
let isShuttingDown = false;

// Inform load balancer to stop sending traffic immediately
app.use((req, res, next) => {
  if (isShuttingDown) {
    res.set("Connection", "close"); // prevent keep-alive during shutdown
    // Note: keep-alive connections won't respect this immediately
    // Use a proper draining mechanism in production
  }
  next();
});

async function shutdown(signal: string) {
  logger.info({ signal }, "Shutdown signal received");
  isShuttingDown = true;

  // 1. Stop the HTTP server — no new connections accepted
  // In-flight requests continue until they complete or timeout
  await new Promise<void>((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
  logger.info("HTTP server closed");

  // 2. Close database connections
  await prisma.$disconnect();
  logger.info("Prisma disconnected");

  // 3. Close Redis connection
  await redis.quit();
  logger.info("Redis disconnected");

  // 4. Exit
  logger.info("Graceful shutdown complete");
  process.exit(0);
}

// Force exit if graceful shutdown takes too long (Kubernetes default is 30s)
const SHUTDOWN_TIMEOUT = parseInt(process.env.SHUTDOWN_TIMEOUT_MS ?? "10000");

async function shutdownWithTimeout(signal: string) {
  const timeout = setTimeout(() => {
    logger.error("Shutdown timeout exceeded, forcing exit");
    process.exit(1);
  }, SHUTDOWN_TIMEOUT);
  timeout.unref(); // don't prevent process from exiting normally

  await shutdown(signal);
}

process.on("SIGTERM", () => shutdownWithTimeout("SIGTERM")); // Kubernetes graceful stop
process.on("SIGINT", () => shutdownWithTimeout("SIGINT"));   // Ctrl+C

// Handle uncaught exceptions and unhandled rejections
process.on("uncaughtException", (err) => {
  logger.fatal({ err }, "Uncaught exception — shutting down");
  shutdownWithTimeout("uncaughtException");
});

process.on("unhandledRejection", (reason) => {
  logger.fatal({ reason }, "Unhandled promise rejection — shutting down");
  shutdownWithTimeout("unhandledRejection");
});`}</code></pre>

      <h2 id="structured-logging">Structured Logging with pino</h2>
      <pre><code>{`// console.log is not production logging:
// - Not machine-parseable (grep only)
// - No log levels (can't filter errors vs debug)
// - No structured fields (can't query by requestId)
// - Slow (synchronous on some platforms)

// pino: fastest Node.js logger, JSON output, low overhead
import pino from "pino";
import pinoHttp from "pino-http";

const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  // In production: output raw JSON for log aggregators (CloudWatch, Datadog, ELK)
  // In development: use pino-pretty for human-readable output
  transport: process.env.NODE_ENV !== "production"
    ? { target: "pino-pretty", options: { colorize: true } }
    : undefined,
});

// pino-http: middleware that logs every request automatically
const httpLogger = pinoHttp({
  logger,
  // Redact sensitive fields from logs
  redact: {
    paths: ["req.headers.authorization", "req.body.password", "req.body.token"],
    censor: "[REDACTED]",
  },
  // Custom log level based on response status
  customLogLevel: (req, res, err) => {
    if (res.statusCode >= 500) return "error";
    if (res.statusCode >= 400) return "warn";
    return "info";
  },
  // Serialize request — what fields to include
  serializers: {
    req: (req) => ({
      id: req.id,
      method: req.method,
      url: req.url,
      userAgent: req.headers["user-agent"],
    }),
    res: (res) => ({
      statusCode: res.statusCode,
    }),
  },
});

app.use(httpLogger);

// Usage in route handlers — attach context to logs
async function createUser(req: Request, res: Response) {
  const user = await db.users.create(req.body);

  // req.log is a child logger with requestId already attached
  req.log.info({ userId: user.id }, "User created");

  res.status(201).json({ data: user });
}

// Log levels and when to use them:
// fatal: system is unrecoverable, about to crash
// error: something failed but the system continues
// warn: unexpected but handled (rate limit hit, retry succeeded)
// info: normal operational events (server started, user created)
// debug: diagnostic info for development (query params, cache status)
// trace: very verbose, only in development (every step in a flow)

logger.info({ port: 3000 }, "Server started");          // info
logger.warn({ ip: req.ip }, "Rate limit hit");           // warn
logger.error({ err, userId }, "Payment failed");         // error (include err field!)
logger.debug({ query: req.query }, "Processing query");  // debug`}</code></pre>

      <h2 id="health-checks">Health Check Endpoints</h2>
      <pre><code>{`// /health: Is the process alive? (liveness probe in Kubernetes)
// /ready: Can the process serve traffic? (readiness probe in Kubernetes)

app.get("/health", (req, res) => {
  // Simple: if we can respond, we're alive
  res.status(200).json({ status: "ok", uptime: process.uptime() });
});

// /ready: check all dependencies are connected
app.get("/ready", async (req, res) => {
  const checks: Record<string, "ok" | "error"> = {};

  // Check database
  try {
    await prisma.$queryRaw\`SELECT 1\`;
    checks.database = "ok";
  } catch {
    checks.database = "error";
  }

  // Check Redis
  try {
    await redis.ping();
    checks.redis = "ok";
  } catch {
    checks.redis = "error";
  }

  const allHealthy = Object.values(checks).every((v) => v === "ok");
  const status = allHealthy ? 200 : 503; // 503 tells load balancer to stop sending traffic

  res.status(status).json({
    status: allHealthy ? "ok" : "degraded",
    checks,
    timestamp: new Date().toISOString(),
  });
});

// Kubernetes probe configuration (in deployment.yaml)
// livenessProbe:
//   httpGet:
//     path: /health
//     port: 3000
//   initialDelaySeconds: 10  # give the app time to start
//   periodSeconds: 10
//   failureThreshold: 3       # restart pod after 3 consecutive failures
//
// readinessProbe:
//   httpGet:
//     path: /ready
//     port: 3000
//   periodSeconds: 5
//   failureThreshold: 2       # stop sending traffic after 2 consecutive failures`}</code></pre>

      <h2 id="env-config">Environment Config Management</h2>
      <pre><code>{`// Centralized, validated config — fail fast on startup if config is wrong
// src/config.ts

import { z } from "zod";
import "dotenv/config"; // loads .env in development

const ConfigSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),

  // Database
  DATABASE_URL: z.string().url(),
  DB_MAX_CONNECTIONS: z.coerce.number().int().positive().default(10),

  // Redis
  REDIS_URL: z.string(),

  // Auth
  JWT_PRIVATE_KEY: z.string().min(1),
  JWT_PUBLIC_KEY: z.string().min(1),
  SESSION_SECRET: z.string().min(32),
  ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().default(900), // 15 min
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().default(30),

  // App
  ALLOWED_ORIGINS: z.string().transform((s) => s.split(",").map((o) => o.trim())),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
  SHUTDOWN_TIMEOUT_MS: z.coerce.number().default(10_000),
});

// Parse at import time — throws if any required variable is missing
const result = ConfigSchema.safeParse(process.env);

if (!result.success) {
  console.error("Invalid environment configuration:");
  result.error.issues.forEach((issue) => {
    console.error(\`  \${issue.path.join(".")}: \${issue.message}\`);
  });
  process.exit(1); // fail fast — better than a cryptic runtime error later
}

export const config = result.data;

// Usage throughout the app — no process.env scattered everywhere
import { config } from "./config";
const { PORT, DATABASE_URL, JWT_PRIVATE_KEY } = config;`}</code></pre>

      <h2 id="compression">Response Compression</h2>
      <pre><code>{`import compression from "compression";

// compression middleware: gzip/deflate response bodies
// Reduces bandwidth — typical JSON compression ratio: 5-10x
// Only compresses if:
//   - Client sends Accept-Encoding: gzip
//   - Response is > threshold (default 1KB)
//   - Content-Type is compressible (not images, already-compressed binaries)

app.use(compression({
  threshold: 1024,  // only compress responses > 1KB
  level: 6,         // gzip compression level (1=fast/low, 9=slow/high, 6=default)
  filter: (req, res) => {
    // Don't compress already-compressed formats
    if (req.headers["x-no-compression"]) return false;
    return compression.filter(req, res); // default filter
  },
}));

// In production: use nginx or CDN for compression instead
// nginx does gzip more efficiently (C-code, dedicated, better tuning)
// CDN (CloudFront, Cloudflare): automatically compresses and caches compressed responses
// Express compression is fine for simple setups, adds CPU overhead at scale`}</code></pre>

      <h2 id="process-management">Process Management</h2>
      <ArticleTable caption="PM2 vs Docker for Node.js deployment — tradeoffs for different environments" minWidth={720}>
        <table>
          <thead>
            <tr>
              <th>Feature</th>
              <th>PM2</th>
              <th>Docker + Orchestrator</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Setup complexity</td>
              <td>Low — single command</td>
              <td>High — Dockerfile, compose/K8s config</td>
            </tr>
            <tr>
              <td>Auto-restart</td>
              <td>Yes — on crash, on schedule</td>
              <td>Yes — container restart policy / pod health probes</td>
            </tr>
            <tr>
              <td>Clustering</td>
              <td>Built-in: <code>pm2 start app.js -i max</code></td>
              <td>Multiple containers / pods with load balancer</td>
            </tr>
            <tr>
              <td>Zero-downtime deploy</td>
              <td><code>pm2 reload</code> (rolling restart)</td>
              <td>Rolling updates with health checks</td>
            </tr>
            <tr>
              <td>Monitoring</td>
              <td><code>pm2 monit</code>, keymetrics (paid)</td>
              <td>Prometheus, Grafana, CloudWatch, Datadog</td>
            </tr>
            <tr>
              <td>Multi-server</td>
              <td>Manual — install PM2 on each server</td>
              <td>Native — orchestrators handle distribution</td>
            </tr>
            <tr>
              <td>Best for</td>
              <td>Single server, VPS, rapid deployment</td>
              <td>Production, cloud, microservices, team environments</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>
      <pre><code>{`# PM2 common commands
pm2 start dist/server.js --name api       # start app
pm2 start dist/server.js -i max           # cluster mode (one worker per CPU)
pm2 reload api                            # zero-downtime restart
pm2 logs api                              # tail logs
pm2 monit                                 # real-time dashboard
pm2 save                                  # save process list
pm2 startup                               # generate startup script (survives reboot)

# ecosystem.config.js — PM2 config file
module.exports = {
  apps: [{
    name: "api",
    script: "dist/server.js",
    instances: "max",        // one per CPU
    exec_mode: "cluster",
    max_memory_restart: "500M", // restart if memory exceeds 500MB
    env: {
      NODE_ENV: "production",
      PORT: 3000,
    },
    log_file: "/var/log/api/combined.log",
    error_file: "/var/log/api/error.log",
    time: true,
  }],
};

# Dockerfile for Node.js
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS production
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production  # no devDependencies in production image
COPY --from=builder /app/dist ./dist
USER node  # don't run as root
EXPOSE 3000
CMD ["node", "dist/server.js"]`}</code></pre>

      <h2 id="memory-leaks">Memory Leak Patterns</h2>
      <pre><code>{`// Node.js memory leaks: memory grows but garbage collector can't reclaim it

// 1. Event listener leaks — most common
// Every time a connection is made, a listener is added but never removed
function BAD(connection: EventEmitter) {
  connection.on("data", (data) => processData(data)); // ✗ leaks listeners
}

function GOOD(connection: EventEmitter) {
  const handler = (data: Buffer) => processData(data);
  connection.on("data", handler);
  connection.once("close", () => connection.off("data", handler)); // ✓ cleanup
}

// Check listener count
if (emitter.listenerCount("data") > 10) {
  console.warn("Possible listener leak", emitter.listenerCount("data"));
}

// 2. Global cache without eviction
const cache = new Map(); // ✗ grows forever
const LRUCache = new Map(); // use lru-cache npm package for bounded cache
import LRU from "lru-cache";
const cache2 = new LRU({ max: 1000, ttl: 1000 * 60 * 5 }); // 1000 entries, 5 min TTL

// 3. Closure referencing large objects
function createHandler(largeBuffer: Buffer) {
  // ✗ The closure keeps largeBuffer in memory as long as handler exists
  return () => doSomethingWith(largeBuffer);
}

// ✓ Process and discard
function createHandler(largeBuffer: Buffer) {
  const result = processBuffer(largeBuffer); // extract what you need
  largeBuffer = null!; // allow GC
  return () => useResult(result);
}

// 4. setInterval without clearInterval
// Particularly dangerous in tests — intervals prevent process from exiting
const interval = setInterval(cleanup, 60_000);
// In shutdown handler:
clearInterval(interval);

// Detecting leaks in production
// heap snapshots: node --heapsnapshot-near-heap-limit=50 server.js
// clinic.js: clinic doctor -- node server.js (npm install -g clinic)
// Memory metrics: track process.memoryUsage().heapUsed in your monitoring`}</code></pre>

      <h2 id="monitoring">Monitoring & Observability</h2>
      <pre><code>{`// What to measure in production:
// 1. p99 latency (not average — averages hide tail latency)
// 2. Error rate (5xx errors per minute)
// 3. Request rate (requests per second)
// 4. CPU usage (high CPU = compute bound, need more cores)
// 5. Memory usage (growing memory = potential leak)
// 6. Event loop lag (high lag = blocking the event loop)
// 7. Active connections
// 8. DB query duration and pool utilization

// Prometheus metrics with prom-client
import promClient from "prom-client";

const register = new promClient.Registry();
promClient.collectDefaultMetrics({ register }); // CPU, memory, GC, event loop

// Custom metrics
const httpRequestDuration = new promClient.Histogram({
  name: "http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "route", "status_code"],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [register],
});

const httpRequestTotal = new promClient.Counter({
  name: "http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: ["method", "route", "status_code"],
  registers: [register],
});

// Middleware to record metrics
app.use((req, res, next) => {
  const start = Date.now();

  res.on("finish", () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route?.path ?? req.path; // matched route pattern
    const labels = { method: req.method, route, status_code: res.statusCode.toString() };

    httpRequestDuration.observe(labels, duration);
    httpRequestTotal.inc(labels);
  });

  next();
});

// Expose metrics endpoint for Prometheus scraping
app.get("/metrics", async (req, res) => {
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
});

// Event loop lag — high lag means something is blocking the event loop
// Blocking operations: synchronous fs.readFileSync, JSON.parse on huge files, crypto.pbkdf2Sync
import { monitorEventLoopDelay } from "perf_hooks";
const h = monitorEventLoopDelay({ resolution: 20 });
h.enable();

setInterval(() => {
  const lagMs = h.mean / 1e6; // nanoseconds to milliseconds
  if (lagMs > 50) {
    logger.warn({ lagMs }, "High event loop lag");
  }
  h.reset();
}, 5000);`}</code></pre>
    </div>
  );
}
