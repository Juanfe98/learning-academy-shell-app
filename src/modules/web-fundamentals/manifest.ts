import type { AcademyManifest } from "@/lib/types/academy";
import { WF_MODULES } from "./data";

const manifest: AcademyManifest = {
  slug: "web-fundamentals",
  title: "Web Fundamentals",
  description:
    "HTML, CSS, layout, responsive design, and accessibility — built for frontend interview prep.",
  version: "2.0.0",
  icon: "🌐",
  accentColor: "#0ea5e9",
  totalEstimatedMinutes: WF_MODULES.reduce(
    (sum, m) => sum + m.lessons.reduce((s, l) => s + l.estimatedMinutes, 0),
    0
  ),
  routes: WF_MODULES.map((m) => ({
    slug: `module/${m.id}`,
    title: m.title,
    order: m.order,
    estimatedMinutes: Math.round(m.estimatedHours * 60),
    tags: [],
    component: async () => ({ default: () => null }),
  })),
  learningPath: WF_MODULES.map((m) => `module/${m.id}`),
};

export default manifest;
