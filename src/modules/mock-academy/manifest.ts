import type { AcademyManifest } from "@/lib/types/academy";

const manifest: AcademyManifest = {
  slug: "web-fundamentals",
  title: "Web Fundamentals",
  description:
    "A ground-up tour of the web platform — how browsers work, what HTML actually means, why CSS cascades, and the fundamentals of JavaScript that underpin every framework.",
  version: "1.0.0",
  icon: "🌐",
  accentColor: "#0ea5e9",
  totalEstimatedMinutes: 85,
  routes: [
    {
      slug: "intro",
      title: "Introduction to the Web",
      order: 0,
      estimatedMinutes: 10,
      tags: ["fundamentals", "http"],
      component: () => import("./modules/intro"),
    },
    {
      slug: "html-structure",
      title: "HTML Structure",
      order: 1,
      estimatedMinutes: 15,
      tags: ["html", "semantics"],
      component: () => import("./modules/html-structure"),
    },
    {
      slug: "css-fundamentals",
      title: "CSS Fundamentals",
      order: 2,
      estimatedMinutes: 20,
      tags: ["css", "layout"],
      component: () => import("./modules/css-fundamentals"),
    },
    {
      slug: "javascript-basics",
      title: "JavaScript Basics",
      order: 3,
      estimatedMinutes: 25,
      tags: ["javascript", "dom"],
      component: () => import("./modules/javascript-basics"),
    },
    {
      slug: "how-browsers-work",
      title: "How Browsers Work",
      order: 4,
      estimatedMinutes: 15,
      tags: ["browser", "performance"],
      component: () => import("./modules/how-browsers-work"),
    },
  ],
  learningPath: [
    "intro",
    "html-structure",
    "css-fundamentals",
    "javascript-basics",
    "how-browsers-work",
  ],
};

export default manifest;
