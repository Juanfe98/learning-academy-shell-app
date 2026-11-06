import type { AcademyManifest } from "@/lib/types/academy";

/**
 * Server-Driven UI Lab
 *
 * A line-by-line study of a server-driven UI backend built from scratch in the
 * `server-driven-ui` repo — a personal-finance app deliberately architected to
 * mirror Disney's Flex (`growth-life-client-api`) + `cgi-web` pair.
 *
 * Unlike the growth-life-client-api Mastery academy, which studies a mature
 * production service, this one studies a system with exactly one screen and one
 * service. Every file is small enough to read in full, every decision is logged,
 * and every divergence from Flex is deliberate. The point is to see the whole
 * shape at once, then recognise it at scale.
 *
 * This first release covers the backend end to end. Client renderers follow.
 */
const manifest: AcademyManifest = {
  slug: "server-driven-ui-lab",
  title: "Server-Driven UI Lab",
  description:
    "Build and understand a server-driven UI backend from zero, mirroring Disney's Flex architecture at a scale small enough to hold in your head. One screen, one service, every file read in full — the request lifecycle, the wire contract, the Raw→Domain conversion boundary, per-surface templates, graceful degradation, and a side-by-side comparison with growth-life-client-api.",
  version: "1.0.0",
  icon: "🧩",
  accentColor: "#5eead4",
  totalEstimatedMinutes: 510,
  routes: [
    {
      slug: "what-we-are-building",
      title: "What We Are Building & Why",
      order: 0,
      estimatedMinutes: 35,
      tags: ["foundations", "architecture", "sdui", "flex"],
      keywords: [
        "server-driven ui",
        "two clients",
        "why sdui",
        "mirror the skeleton",
        "decision log",
        "personal finance ledger",
      ],
      component: () => import("./modules/what-we-are-building"),
    },
    {
      slug: "request-lifecycle",
      title: "The Request Lifecycle, End to End",
      order: 1,
      estimatedMinutes: 45,
      tags: ["foundations", "koa", "pipeline", "layers"],
      keywords: [
        "middleware",
        "route",
        "ledgerContextRouteHandler",
        "service",
        "template fill",
        "layer responsibilities",
      ],
      component: () => import("./modules/request-lifecycle"),
    },
    {
      slug: "the-wire-contract",
      title: "The Wire Contract: Elements, Copy & Tokens",
      order: 2,
      estimatedMinutes: 50,
      tags: ["contract", "elements", "design-tokens", "i18n"],
      keywords: [
        "TextElement",
        "RowElement",
        "ListElement",
        "copyText",
        "variables",
        "style tokens",
        "named slots",
      ],
      component: () => import("./modules/the-wire-contract"),
    },
    {
      slug: "unknown-types-and-degradation",
      title: "Unknown Element Types & Version Skew",
      order: 3,
      estimatedMinutes: 45,
      tags: ["contract", "resilience", "versioning", "degradation"],
      keywords: [
        "drop and log",
        "UNSUPPORTED_TYPE_FROM_FLEX",
        "version skew",
        "WireElement",
        "closed union open runtime",
        "type guards",
      ],
      component: () => import("./modules/unknown-types-and-degradation"),
    },
    {
      slug: "the-conversion-boundary",
      title: "The Conversion Boundary: Raw → Domain",
      order: 4,
      estimatedMinutes: 50,
      tags: ["pipeline", "types", "conversion", "anti-corruption"],
      keywords: [
        "RawAccount",
        "DomainAccount",
        "toDomainAccount",
        "parseMinorUnits",
        "no-restricted-imports",
        "Money minor units",
      ],
      component: () => import("./modules/the-conversion-boundary"),
    },
    {
      slug: "the-service-layer",
      title: "The Service Layer & buildSlots",
      order: 5,
      estimatedMinutes: 50,
      tags: ["pipeline", "services", "orchestration"],
      keywords: [
        "buildAccountDetailsScreen",
        "buildSlots",
        "Promise.all",
        "surface-agnostic",
        "formatMoney",
        "slot map",
      ],
      component: () => import("./modules/the-service-layer"),
    },
    {
      slug: "templates-and-fill",
      title: "Templates, Slot Markers & Per-Surface Output",
      order: 6,
      estimatedMinutes: 50,
      tags: ["pipeline", "templates", "surfaces"],
      keywords: [
        "$slot",
        "fillTemplate",
        "loadTemplate",
        "templateId",
        "per-surface templates",
        "EJS SiteConfig",
      ],
      component: () => import("./modules/templates-and-fill"),
    },
    {
      slug: "route-middleware-and-context",
      title: "Route, Middleware & LedgerContext",
      order: 7,
      estimatedMinutes: 55,
      tags: ["pipeline", "koa", "validation", "context"],
      keywords: [
        "Joi validation",
        "x-client-surface",
        "StandardHeaders",
        "LedgerContext",
        "error status mapping",
        "higher-order function returns middleware",
        "ctx.state untyped hole",
        "dependency injection",
        "flexContextRouteHandler",
      ],
      component: () => import("./modules/route-middleware-and-context"),
    },
    {
      slug: "flex-side-by-side",
      title: "Side by Side with Flex",
      order: 10,
      estimatedMinutes: 40,
      tags: ["comparison", "flex", "disney", "mastery"],
      keywords: [
        "growth-life-client-api",
        "cgi-web",
        "x-bamtech-partner",
        "elements/v1",
        "domain/common",
        "deliberate divergence",
      ],
      component: () => import("./modules/flex-side-by-side"),
    },
    {
      slug: "the-client-renderer",
      title: "The Client Renderer: A Browser for Your Vocabulary",
      order: 8,
      estimatedMinutes: 45,
      tags: ["clients", "react", "rendering", "web"],
      keywords: [
        "vocabulary client vs hardcoded pages",
        "browser analogy unknown tags",
        "App.tsx Object.entries content loop",
        "x-client-surface fetch header",
        "renderCopy placeholder visible",
        "styleClass token to css 001a",
      ],
      component: () => import("./modules/the-client-renderer"),
    },
    {
      slug: "the-element-registry",
      title: "The Element Registry & Graceful Degradation",
      order: 9,
      estimatedMinutes: 45,
      tags: ["clients", "registry", "resilience", "degradation"],
      keywords: [
        "ELEMENT_REGISTRY type to view dictionary",
        "RenderElement lookup or skip",
        "001b drop and log running code",
        "nested rows back through registry",
        "blast radius 502 vs dropped element",
        "deliberate breakage sparkline exercise",
      ],
      component: () => import("./modules/the-element-registry"),
    },
  ],
  learningPath: [
    "what-we-are-building",
    "request-lifecycle",
    "the-wire-contract",
    "unknown-types-and-degradation",
    "the-conversion-boundary",
    "the-service-layer",
    "templates-and-fill",
    "route-middleware-and-context",
    "the-client-renderer",
    "the-element-registry",
    "flex-side-by-side",
  ],
  groups: [
    {
      id: "foundations",
      title: "Path 1 — Foundations",
      description:
        "What the system is, why server-driven UI earns its complexity here, and the full path a request travels through every layer.",
      routeSlugs: ["what-we-are-building", "request-lifecycle"],
    },
    {
      id: "contract",
      title: "Path 2 — The Contract",
      description:
        "What travels on the wire, why copy is an object rather than a string, and what happens when a client meets an element type it has never seen.",
      routeSlugs: ["the-wire-contract", "unknown-types-and-degradation"],
    },
    {
      id: "pipeline",
      title: "Path 3 — The Backend Pipeline",
      description:
        "Every layer of the server, line by line: the conversion boundary, the service, template resolution and fill, and the Koa entry points.",
      routeSlugs: [
        "the-conversion-boundary",
        "the-service-layer",
        "templates-and-fill",
        "route-middleware-and-context",
      ],
    },
    {
      id: "clients",
      title: "Path 4 — The Clients",
      description:
        "The other half of the contract: a web renderer that knows vocabulary instead of screens, the element registry where drop-and-log becomes running code, and the deliberate-breakage exercise that proves it.",
      routeSlugs: ["the-client-renderer", "the-element-registry"],
    },
    {
      id: "comparison",
      title: "Path 5 — Against the Real Thing",
      description:
        "Every layer mapped onto growth-life-client-api, with each deliberate divergence and the constraint that justified it.",
      routeSlugs: ["flex-side-by-side"],
    },
  ],
};

export default manifest;
