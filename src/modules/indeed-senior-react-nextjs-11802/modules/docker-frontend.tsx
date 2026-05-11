import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { ArticleTable, InterviewPlaybook, InterviewChallenge } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const multistageDiagram = String.raw`flowchart TD
    D1["Stage 1: deps\nFROM node:20-alpine\nCopy package.json + lockfile\npnpm install --prod only\n(no devDependencies)"]
    D2["Stage 2: builder\nFROM node:20-alpine\nCopy package.json + lockfile\npnpm install (all deps)\nCopy source code\npnpm build → .next/standalone"]
    D3["Stage 3: runner\nFROM node:20-alpine\nCopy .next/standalone from builder\nCopy .next/static from builder\nRun as non-root 'nextjs' user\nEXPOSE 3000\nCMD node server.js"]

    D1 -->|"prod deps layer\n(not copied to runner)"| D2
    D2 -->|"COPY --from=builder\nonly standalone output\n~180MB vs ~2GB"| D3

    style D1 fill:#1a2a1a,stroke:#22c55e
    style D2 fill:#1a1a2a,stroke:#6366f1
    style D3 fill:#2a1a1a,stroke:#f59e0b`;

const deploymentFlowDiagram = String.raw`sequenceDiagram
    participant CI as CI Pipeline\n(GitLab CI)
    participant REG as Container Registry\n(ECR / GCR)
    participant K8S as Kubernetes\n(or ECS)
    participant APP as Running Container

    CI->>CI: docker build --target runner -t app:sha123 .
    CI->>REG: docker push app:sha123
    REG-->>CI: Image stored

    CI->>K8S: kubectl set image deployment/help-center app=app:sha123
    K8S->>REG: docker pull app:sha123
    REG-->>K8S: Image layers

    K8S->>APP: Start container with runtime env vars
    Note over K8S,APP: CONTENTSTACK_API_KEY injected via K8s Secret\nNEXT_PUBLIC_* baked into JS bundle at build time
    APP->>APP: HEALTHCHECK passes after 10s
    K8S-->>CI: Rollout complete`;

export const toc: TocItem[] = [
  { id: "why-docker-frontend", title: "Why Containerize a Next.js App", level: 2 },
  { id: "multistage-dockerfile", title: "Multi-Stage Dockerfile", level: 2 },
  { id: "standalone-output", title: "Next.js Standalone Output Mode", level: 3 },
  { id: "dockerignore", title: "The .dockerignore File", level: 3 },
  { id: "env-at-runtime", title: "Build-Time vs Runtime Environment Variables", level: 2 },
  { id: "security-practices", title: "Container Security Practices", level: 2 },
  { id: "health-check", title: "Health Check Endpoint", level: 2 },
  { id: "interview-framing", title: "Interview Playbook", level: 2 },
  { id: "key-takeaways", title: "Interview Challenge", level: 2 },
];

export default function DockerFrontend() {
  return (
    <div className="article-content">
      <p>
        Containerizing a Next.js application is not just packaging code — it is making your
        deployment reproducible, environment-independent, and Kubernetes-ready. The wrong
        Dockerfile ships a 2GB image, runs as root, bakes secrets into the layer, and has no
        health check. This module covers the production-correct pattern for containerizing a
        Next.js Help Center, including standalone output mode, multi-stage builds, and runtime
        environment variable injection.
      </p>

      <h2 id="why-docker-frontend">Why Containerize a Next.js App</h2>
      <p>
        Three concrete benefits for a Help Center deployment:
      </p>
      <ol>
        <li>
          <strong>Consistent environments.</strong> The container image that passes CI tests is
          the exact same artifact that runs in production. No &quot;works on my machine&quot; —
          the runtime, Node.js version, and system libraries are identical everywhere.
        </li>
        <li>
          <strong>Reproducible builds.</strong> Given the same source commit and environment
          variables, the Docker build always produces the same output. Rollbacks are instant —
          pull the previous image tag.
        </li>
        <li>
          <strong>Kubernetes-ready.</strong> Kubernetes (and ECS, Cloud Run, etc.) expects
          container images. Containerizing the frontend puts it on the same deployment platform
          as the Node.js backend and any other services — simpler operations.
        </li>
      </ol>

      <h2 id="multistage-dockerfile">Multi-Stage Dockerfile</h2>
      <MermaidDiagram
        chart={multistageDiagram}
        title="Multi-Stage Docker Build: deps → builder → runner"
        caption="Each stage has a specific purpose. The runner stage copies only the compiled output from the builder — it never touches the 800MB+ node_modules from the build. This is why the final image is ~180MB instead of ~2GB."
        minHeight={380}
      />

      <p>
        Here is the complete, production-correct Dockerfile for a Next.js application with pnpm:
      </p>

      <pre>
        <code>{`# syntax=docker/dockerfile:1

# Stage 1: install production dependencies only
FROM node:20-alpine AS deps
WORKDIR /app

# Copy only the lockfile and package.json — not source code
# This layer is cached unless dependencies change
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile --prod

# Stage 2: build the Next.js application
FROM node:20-alpine AS builder
WORKDIR /app

# Install ALL dependencies (including devDependencies needed for the build)
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile

# Copy source code AFTER installing deps — maximizes layer cache efficiency
COPY . .

# Build the app — output: .next/standalone (set in next.config.ts)
# NEXT_PUBLIC_* vars must be set here because they are baked into the JS bundle
ARG NEXT_PUBLIC_ALGOLIA_APP_ID
ARG NEXT_PUBLIC_ANALYTICS_KEY
ENV NEXT_PUBLIC_ALGOLIA_APP_ID=$NEXT_PUBLIC_ALGOLIA_APP_ID
ENV NEXT_PUBLIC_ANALYTICS_KEY=$NEXT_PUBLIC_ANALYTICS_KEY

RUN pnpm build

# Stage 3: minimal runtime image
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Create a non-root user to run the app
RUN addgroup --system --gid 1001 nodejs \\
    && adduser --system --uid 1001 nextjs

# Copy only the standalone output — this is the complete, self-contained server
# next.config output: 'standalone' creates server.js + bundled dependencies
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# Copy public folder if you have static assets (images, fonts, etc.)
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Switch to non-root user
USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \\
    CMD wget -qO- http://localhost:3000/api/health || exit 1

# server.js is generated by Next.js standalone output
CMD ["node", "server.js"]`}</code>
      </pre>

      <h3 id="standalone-output">Next.js Standalone Output Mode</h3>
      <p>
        The <code>output: &apos;standalone&apos;</code> setting in <code>next.config.ts</code> is
        the single most important optimization for containerizing Next.js. Without it, you would
        need to copy all of <code>node_modules</code> into the runtime image — typically 800MB to
        2GB. With standalone mode, Next.js traces which files are actually used and creates a{" "}
        <code>.next/standalone</code> directory containing only what is needed to run the server.
      </p>

      <pre>
        <code>{`// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // output: "standalone" tells Next.js to:
  // 1. Bundle the server.js entry point
  // 2. Trace all used node_modules
  // 3. Copy ONLY the used files to .next/standalone
  // Result: runtime image goes from ~2GB → ~150–250MB

  // Other recommended production settings:
  poweredByHeader: false, // remove X-Powered-By: Next.js header (minor security benefit)
  compress: true,         // enable gzip compression on server responses
};

export default nextConfig;

// The standalone output directory structure:
// .next/standalone/
//   server.js              ← the HTTP server entry point
//   package.json           ← minimal package.json
//   node_modules/          ← only modules actually imported by the server
//   .next/                 ← compiled server-side code (RSC, Route Handlers, etc.)
//
// .next/static/            ← JS bundles, CSS, images (copied separately to CDN or image)
// public/                  ← static files (copied separately)`}</code>
      </pre>

      <h3 id="dockerignore">The .dockerignore File</h3>
      <p>
        Without a <code>.dockerignore</code> file, every <code>COPY . .</code> instruction sends
        your entire working directory to the Docker daemon — including <code>node_modules</code>,
        <code>.next</code>, and <code>.git</code>. This makes builds slow, bloats the build
        context, and can accidentally include sensitive files.
      </p>

      <pre>
        <code>{`# .dockerignore — exclude files from the Docker build context

# Dependencies — not needed in the image (we install fresh)
node_modules
.pnpm-store

# Build output — builder stage creates this from source
.next

# Version control
.git
.gitignore

# Development files
*.local
.env.local
.env.development.local
.env*.local

# Documentation and tests (not needed at runtime)
*.md
__tests__
*.test.ts
*.test.tsx
*.spec.ts
*.spec.tsx

# Tooling
.eslintrc*
.prettierrc*
jest.config.*
vitest.config.*

# Docker files themselves
Dockerfile
.dockerignore

# OS artifacts
.DS_Store
Thumbs.db`}</code>
      </pre>

      <h2 id="env-at-runtime">Build-Time vs Runtime Environment Variables</h2>
      <ArticleTable
        caption="Next.js has two fundamentally different environment variable mechanisms. Confusing them is the most common Docker security mistake — a CMS API key baked into the bundle is exposed to every user who opens DevTools."
        minWidth={920}
      >
        <table>
          <thead>
            <tr>
              <th>Variable Type</th>
              <th>Prefix</th>
              <th>When Resolved</th>
              <th>Exposed in Browser Bundle</th>
              <th>Security Risk</th>
              <th>Use Case</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Build-time public</strong></td>
              <td><code>NEXT_PUBLIC_</code></td>
              <td>At <code>pnpm build</code> (builder stage)</td>
              <td>Yes — inlined into JS bundle</td>
              <td>High if secret — any user can read it</td>
              <td>Algolia App ID, analytics key, feature flag UI SDK key</td>
            </tr>
            <tr>
              <td><strong>Runtime server-only</strong></td>
              <td>No prefix</td>
              <td>At container start (runtime ENV or K8s secret)</td>
              <td>No — server-side only</td>
              <td>Low — never leaves the server</td>
              <td>Contentstack API key, Redis URL, database password</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <MermaidDiagram
        chart={deploymentFlowDiagram}
        title="Container Build and Deployment Flow"
        caption="The container image is built once in CI and pushed to a registry. Kubernetes pulls the image and injects runtime secrets via environment variables at container start — the image itself never contains credentials."
        minHeight={480}
      />

      <pre>
        <code>{`// The correct pattern for environment variables in Docker:

// next.config.ts — declare server-only vars that are needed at runtime
// (no prefix — they are never exposed to the browser)
const nextConfig: NextConfig = {
  output: "standalone",
  env: {
    // These are available as process.env.X in Server Components and Route Handlers
    // They are NOT in the JS bundle — safe for secrets
    // Actually, don't set them here — use the runtime ENV in Docker/K8s
  },
};

// Dockerfile builder stage — pass NEXT_PUBLIC_ vars as build ARGs
ARG NEXT_PUBLIC_ALGOLIA_APP_ID
ARG NEXT_PUBLIC_ANALYTICS_KEY
ENV NEXT_PUBLIC_ALGOLIA_APP_ID=$NEXT_PUBLIC_ALGOLIA_APP_ID
ENV NEXT_PUBLIC_ANALYTICS_KEY=$NEXT_PUBLIC_ANALYTICS_KEY
RUN pnpm build
# ✅ These are public keys — safe to bake into the bundle

# Dockerfile runner stage — do NOT include secrets as ENV
# ENV CONTENTSTACK_API_KEY=abc123  ← ❌ WRONG — baked into the image layer permanently

# Instead, inject at runtime via Kubernetes:
# ---
# apiVersion: v1
# kind: Secret
# metadata:
#   name: help-center-secrets
# stringData:
#   CONTENTSTACK_API_KEY: "abc123"
#   REDIS_URL: "rediss://..."
# ---
# In the Deployment:
# envFrom:
#   - secretRef:
#       name: help-center-secrets
# Result: env vars are available as process.env.CONTENTSTACK_API_KEY at container start
# but they are NEVER stored in the image layer or the Git repository`}</code>
      </pre>

      <h2 id="security-practices">Container Security Practices</h2>
      <p>
        Security for containerized Next.js applications follows three rules: minimal image,
        non-root user, and no secrets in layers.
      </p>

      <pre>
        <code>{`# 1. Use Alpine Linux — smaller attack surface, fewer pre-installed packages
FROM node:20-alpine AS runner  # ~5MB base vs ~200MB for node:20

# 2. Run as a non-root user — if the app is compromised, the attacker gets
# the unprivileged 'nextjs' user, not root access to the container
RUN addgroup --system --gid 1001 nodejs \\
    && adduser --system --uid 1001 nextjs
USER nextjs

# 3. Use --chown on COPY to set file ownership at copy time
# (more efficient than chown -R after copying)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# 4. Never put secrets in ENV during build
# BAD:  ENV CONTENTSTACK_API_KEY=abc123
# GOOD: inject via docker run -e or Kubernetes Secrets at runtime

# 5. Scan the image for vulnerabilities before deployment:
# trivy image your-registry/help-center:sha123
# docker scout cves your-registry/help-center:sha123

# 6. Pin the base image to a specific digest (not just "20-alpine" tag)
# Tags are mutable — a new version of node:20-alpine could break your build
# FROM node:20-alpine@sha256:abc123... (check Docker Hub for the digest)

# 7. Multi-stage builds prevent dev secrets from leaking into the runtime layer
# If you set GITHUB_TOKEN in the builder stage (to clone private repos),
# it is NOT present in the runner stage — multi-stage isolation protects you`}</code>
      </pre>

      <h2 id="health-check">Health Check Endpoint</h2>
      <p>
        Kubernetes and load balancers need to know if a container is healthy before routing traffic
        to it. Without a health check, Kubernetes routes traffic to a container that may still be
        starting up or may have crashed. The health check endpoint must be fast and must not make
        external calls — it should check only what the server itself can determine.
      </p>

      <pre>
        <code>{`// src/app/api/health/route.ts — simple health check endpoint
export async function GET() {
  // Check that the server is alive — keep it lightweight
  // Do NOT make external calls (Redis, Contentstack) here:
  // a) External services being slow would cause unnecessary restarts
  // b) Health checks must respond in milliseconds

  return Response.json(
    {
      status: "ok",
      timestamp: new Date().toISOString(),
      // Include the build version so you can verify which version is running
      version: process.env.BUILD_SHA ?? "unknown",
    },
    { status: 200 }
  );
}

// For a more thorough liveness/readiness split (Kubernetes pattern):
// /api/health/live   — is the process alive? (used by liveness probe)
// /api/health/ready  — is the app ready to serve traffic? (can check Redis connectivity)

// In the Dockerfile:
// HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \\
//     CMD wget -qO- http://localhost:3000/api/health || exit 1

// Kubernetes equivalent (more configurable):
// livenessProbe:
//   httpGet:
//     path: /api/health
//     port: 3000
//   initialDelaySeconds: 15
//   periodSeconds: 30
//   failureThreshold: 3
// readinessProbe:
//   httpGet:
//     path: /api/health
//     port: 3000
//   initialDelaySeconds: 5
//   periodSeconds: 10`}</code>
      </pre>

      <h2 id="interview-framing">Interview Playbook</h2>
      <InterviewPlaybook
        title="How would you containerize a Next.js application for production?"
        intro="This question tests whether you understand the full production deployment lifecycle for a Next.js app, not just 'run docker build'. The interviewer wants to hear about multi-stage builds, standalone output, and runtime secret injection."
        steps={[
          "Start with standalone output mode in next.config.ts — this reduces the runtime image from 2GB to ~200MB by tracing and copying only the files the server actually imports. Without this, the Dockerfile is unacceptably bloated.",
          "Describe the three-stage Dockerfile: deps stage installs only production dependencies (for layer caching), builder stage installs all deps and runs pnpm build, runner stage copies only the standalone output from the builder. The runner never touches node_modules.",
          "Explain the NEXT_PUBLIC_ vs runtime env var distinction: public vars (Algolia key, analytics ID) are passed as build ARGs and baked into the JS bundle at pnpm build time. Secret vars (Contentstack API key, Redis URL) are never in the image — they are injected at container start via Kubernetes Secrets or docker run -e.",
          "Mention security: run as a non-root user (addgroup/adduser, USER nextjs), use Alpine Linux as the base image, scan with Trivy before pushing to the registry.",
          "Close with the health check: a /api/health route that returns 200 quickly, referenced in the HEALTHCHECK Dockerfile instruction. Kubernetes uses this to know when the container is ready to receive traffic.",
        ]}
      />

      <h2 id="key-takeaways">Interview Challenge</h2>
      <InterviewChallenge
        title="Fix the Broken Dockerfile"
        scenario={
          <span>
            A junior engineer wrote the following Dockerfile for the Indeed Help Center. It
            builds and runs locally, but it has <strong>five production problems</strong>. Identify
            every problem and write the corrected Dockerfile.
            <pre style={{ marginTop: "0.75rem", fontSize: "0.85rem" }}>
              <code>{`FROM node:20
WORKDIR /app
COPY . .
ENV CONTENTSTACK_API_KEY=cs_prod_abc123secret
ENV NODE_ENV=production
RUN npm install
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]`}</code>
            </pre>
          </span>
        }
        tasks={[
          "Identify all five production problems in the Dockerfile above — be specific about why each one is a problem, not just what it is",
          "Write the corrected multi-stage Dockerfile using node:20-alpine, pnpm, standalone output mode, non-root user, and health check",
          "Explain how CONTENTSTACK_API_KEY should be injected at runtime instead, and what the Kubernetes Secret manifest would look like",
          "The image currently has no .dockerignore. List the six most important entries to add and explain the consequence of each missing exclusion",
          "After fixing the Dockerfile, how do you verify the image size reduction from standalone mode? What command shows the image size, and what size range should you expect for a typical Next.js Help Center?",
        ]}
        pitfalls={[
          "Identifying only obvious problems (running as root, no health check) and missing the CONTENTSTACK_API_KEY baked into an image layer — this is the most critical security issue",
          "Not knowing that NEXT_PUBLIC_ variables are baked at build time — proposing to inject them via K8s Secrets at runtime will not work for client-side code",
          "Using npm instead of pnpm (the project uses pnpm) — a small but telling detail in interviews",
          "Forgetting to copy the public/ directory or .next/static — the app will serve but all images and CSS will 404",
          "Setting the health check URL to / instead of /api/health — the homepage might be a heavy ISR page with external fetches; the health check must be lightweight",
        ]}
        signal="A strong answer identifies: single-stage build (no multi-stage), node:20 instead of alpine (image size), CONTENTSTACK_API_KEY baked into layer (critical security issue), no standalone output (image will be 2GB+), and running npm start instead of node server.js (standalone mode requires direct node invocation). Then writes a clean corrected Dockerfile and knows to inject secrets via K8s Secret, not ENV."
      />
    </div>
  );
}
