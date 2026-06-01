// Production Architecture mental model — Excalidraw diagram data
// Layout: left-to-right request flow, data layer below app layer
// Canvas: ~1820 × 480

const base = {
  angle: 0,
  version: 1,
  versionNonce: 1,
  isDeleted: false,
  updated: 1,
  link: null,
  locked: false,
};

const rect = (
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
  strokeColor: string,
  backgroundColor: string,
  textId?: string,
  extra?: Record<string, unknown>
) => ({
  ...base,
  id,
  type: "rectangle",
  x,
  y,
  width: w,
  height: h,
  strokeColor,
  backgroundColor,
  fillStyle: "solid",
  strokeWidth: 2,
  strokeStyle: "solid",
  roughness: 1,
  opacity: 100,
  boundElements: textId ? [{ id: textId, type: "text" }] : [],
  seed: Math.abs(id.split("").reduce((a, c) => a + c.charCodeAt(0), 0)),
  ...extra,
});

const label = (
  id: string,
  containerId: string,
  x: number,
  y: number,
  w: number,
  h: number,
  text: string
) => ({
  ...base,
  id,
  type: "text",
  x,
  y,
  width: w,
  height: h,
  strokeColor: "#e2e8f0",
  backgroundColor: "transparent",
  fillStyle: "solid",
  strokeWidth: 1,
  strokeStyle: "solid",
  roughness: 0,
  opacity: 100,
  text,
  fontSize: 13,
  fontFamily: 2,
  textAlign: "center",
  verticalAlign: "middle",
  baseline: 27,
  containerId,
  originalText: text,
  lineHeight: 1.25,
  boundElements: [],
  seed: Math.abs(id.split("").reduce((a, c) => a + c.charCodeAt(0), 0)),
});

const floatText = (
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
  text: string,
  color: string,
  fontSize = 11
) => ({
  ...base,
  id,
  type: "text",
  x,
  y,
  width: w,
  height: h,
  strokeColor: color,
  backgroundColor: "transparent",
  fillStyle: "solid",
  strokeWidth: 1,
  strokeStyle: "solid",
  roughness: 0,
  opacity: 100,
  text,
  fontSize,
  fontFamily: 2,
  textAlign: "center",
  verticalAlign: "middle",
  baseline: 14,
  containerId: null,
  originalText: text,
  lineHeight: 1.25,
  boundElements: [],
  seed: Math.abs(id.split("").reduce((a, c) => a + c.charCodeAt(0), 0)),
});

const arrow = (
  id: string,
  x: number,
  y: number,
  points: number[][],
  strokeColor: string,
  strokeStyle: "solid" | "dashed" = "solid",
  startArrowhead: "arrow" | null = null,
  endArrowhead: "arrow" | null = "arrow"
) => {
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const w = Math.max(...xs) - Math.min(...xs);
  const h = Math.max(...ys) - Math.min(...ys);
  return {
    ...base,
    id,
    type: "arrow",
    x,
    y,
    width: w,
    height: h,
    strokeColor,
    backgroundColor: "transparent",
    fillStyle: "solid",
    strokeWidth: 2,
    strokeStyle,
    roughness: 1,
    opacity: 100,
    points,
    lastCommittedPoint: null,
    startBinding: null,
    endBinding: null,
    startArrowhead,
    endArrowhead,
    boundElements: [],
    seed: Math.abs(id.split("").reduce((a, c) => a + c.charCodeAt(0), 0)),
  };
};

// ─── Layout constants ──────────────────────────────────────────────────────────
const MY = 200;          // main flow top
const DY = 380;          // data flow top
const H  = 58;           // box height
const W  = 145;          // standard box width

const CY_M = MY + H / 2; // 229 — center y, main flow
const CY_D = DY + H / 2; // 409 — center y, data flow
const BOT_M = MY + H;    // 258 — bottom of main flow boxes
const BOT_D = DY + H;    // 438 — bottom of data flow boxes

// Node x positions
const XU  = 10;   // USER
const XD  = 215;  // DNS
const XC  = 380;  // CDN
const XW  = 545;  // WAF
const XA  = 710;  // ALB
const XAP = 935;  // API
const XL  = 1100; // LOGIC
const XR  = 1265; // RESP
const XCA = 935;  // CACHE
const XDB = 1100; // DB
const XQ  = 1265; // QUEUE
const XWK = 1440; // WORKERS (w=155)
const XE  = 1620; // EXT (w=175)

// Center X values (x + w/2)
const CX_L  = XL  + 72; // 1172
const CX_CA = XCA + 72; // 1007
const CX_DB = XDB + 72; // 1172
const CX_Q  = XQ  + 72; // 1337
const CX_WK = XWK + 77; // 1517

export const bigPictureData = {
  elements: [
    // ── Node rectangles ──────────────────────────────────────────────────────
    rect("r-user",    XU,  MY, W,   H, "#818cf8", "#1e1e3a", "t-user"),
    rect("r-dns",     XD,  MY, W,   H, "#60a5fa", "#1a2a3a", "t-dns"),
    rect("r-cdn",     XC,  MY, W,   H, "#60a5fa", "#1a2a3a", "t-cdn"),
    rect("r-waf",     XW,  MY, W,   H, "#60a5fa", "#1a2a3a", "t-waf"),
    rect("r-alb",     XA,  MY, W,   H, "#60a5fa", "#1a2a3a", "t-alb"),
    rect("r-api",     XAP, MY, W,   H, "#818cf8", "#1e1e3a", "t-api"),
    rect("r-logic",   XL,  MY, W,   H, "#818cf8", "#1e1e3a", "t-logic"),
    rect("r-resp",    XR,  MY, W,   H, "#818cf8", "#1e1e3a", "t-resp"),
    rect("r-cache",   XCA, DY, W,   H, "#4ade80", "#0a1e10", "t-cache"),
    rect("r-db",      XDB, DY, W,   H, "#94a3b8", "#1a1f2e", "t-db"),
    rect("r-queue",   XQ,  DY, W,   H, "#fbbf24", "#1e1500", "t-queue"),
    rect("r-workers", XWK, DY, 155, H, "#c084fc", "#1a1028", "t-workers"),
    rect("r-ext",     XE,  DY, 175, H, "#2dd4bf", "#0a1e1e", "t-ext"),

    // ── Group rectangles (dashed borders) ────────────────────────────────────
    rect("g-entry", 200, 180, 675, 100, "#334155", "transparent", undefined, { strokeStyle: "dashed", strokeWidth: 1, roughness: 0, fillStyle: "solid" }),
    rect("g-app",   920, 180, 510, 100, "#334155", "transparent", undefined, { strokeStyle: "dashed", strokeWidth: 1, roughness: 0, fillStyle: "solid" }),
    rect("g-data",  920, 358, 900, 100, "#334155", "transparent", undefined, { strokeStyle: "dashed", strokeWidth: 1, roughness: 0, fillStyle: "solid" }),

    // ── Node labels ──────────────────────────────────────────────────────────
    label("t-user",    "r-user",    XU,  MY, W,   H, "User\nBrowser / Mobile"),
    label("t-dns",     "r-dns",     XD,  MY, W,   H, "Route 53\nDNS"),
    label("t-cdn",     "r-cdn",     XC,  MY, W,   H, "CloudFront\nCDN"),
    label("t-waf",     "r-waf",     XW,  MY, W,   H, "WAF +\nRate Limits"),
    label("t-alb",     "r-alb",     XA,  MY, W,   H, "ALB /\nAPI Gateway"),
    label("t-api",     "r-api",     XAP, MY, W,   H, "API Services\n(ECS / Lambda)"),
    label("t-logic",   "r-logic",   XL,  MY, W,   H, "Auth, Validation\n& Business Logic"),
    label("t-resp",    "r-resp",    XR,  MY, W,   H, "Response\nAssembly"),
    label("t-cache",   "r-cache",   XCA, DY, W,   H, "Redis\nCache"),
    label("t-db",      "r-db",      XDB, DY, W,   H, "Primary\nDatabase"),
    label("t-queue",   "r-queue",   XQ,  DY, W,   H, "Queue /\nEvent Bus"),
    label("t-workers", "r-workers", XWK, DY, 155, H, "Workers &\nLambdas"),
    label("t-ext",     "r-ext",     XE,  DY, 175, H, "S3, Notifications\n& External APIs"),

    // ── Group labels (floating, dim) ─────────────────────────────────────────
    floatText("tg-entry", 215,  183, 200, 16, "Traffic Entry Layer",  "#64748b", 11),
    floatText("tg-app",   935,  183, 200, 16, "Stateless App Layer",  "#64748b", 11),
    floatText("tg-data",  935,  361, 210, 16, "Data & Async Systems", "#64748b", 11),

    // ── Async label on dashed arrow ──────────────────────────────────────────
    floatText("ft-queue-label", 1195, 292, 140, 30, "offload slow\nor retryable work", "#fbbf24", 10),

    // ── Arrows (main request flow) ───────────────────────────────────────────
    arrow("a-user-dns",   XU + W,    CY_M, [[0,0],[60,0]],  "#6366f1"),
    arrow("a-dns-cdn",    XD + W,    CY_M, [[0,0],[20,0]],  "#6366f1"),
    arrow("a-cdn-waf",    XC + W,    CY_M, [[0,0],[20,0]],  "#6366f1"),
    arrow("a-waf-alb",    XW + W,    CY_M, [[0,0],[20,0]],  "#6366f1"),
    arrow("a-alb-api",    XA + W,    CY_M, [[0,0],[80,0]],  "#6366f1"),
    arrow("a-api-logic",  XAP + W,   CY_M, [[0,0],[20,0]],  "#6366f1"),
    arrow("a-logic-resp", XL + W,    CY_M, [[0,0],[20,0]],  "#6366f1"),

    // ── Arrows (data layer — bidirectional) ──────────────────────────────────
    arrow("a-logic-cache", CX_L, BOT_M, [[0,0],[-165,122]], "#64748b", "solid", "arrow", "arrow"),
    arrow("a-logic-db",    CX_L, BOT_M, [[0,0],[0,122]],    "#64748b", "solid", "arrow", "arrow"),

    // ── Dashed arrow (async offload) ─────────────────────────────────────────
    arrow("a-logic-queue", CX_L, BOT_M, [[0,0],[165,122]], "#fbbf24", "dashed"),

    // ── Arrows (async path) ──────────────────────────────────────────────────
    arrow("a-queue-workers", XQ  + W,   CY_D, [[0,0],[30,0]],            "#c084fc"),
    arrow("a-workers-ext",   XWK + 155, CY_D, [[0,0],[25,0]],            "#2dd4bf"),
    arrow("a-workers-db",    CX_WK,     BOT_D, [[0,0],[0,40],[-345,40],[-345,0]], "#64748b"),
  ],
  appState: {
    viewBackgroundColor: "#0c0c14",
    theme: "dark",
  },
  files: {},
};
