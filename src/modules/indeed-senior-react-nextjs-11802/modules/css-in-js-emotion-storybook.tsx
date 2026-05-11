import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { ArticleTable, InterviewPlaybook, InterviewChallenge } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const emotionSsrDiagram = String.raw`sequenceDiagram
    participant BR as Browser
    participant NX as Next.js Server
    participant EC as Emotion Cache
    participant HTML as HTML Response

    BR->>NX: GET /help/billing/update-billing
    NX->>EC: Create Emotion cache for this request
    EC->>EC: Collect styles during render
    NX->>HTML: Inject <style> tags with collected CSS
    HTML-->>BR: HTML with styles inline (no FOUC)
    BR->>BR: Hydrate — Emotion reuses existing cache
    Note over BR: No flash of unstyled content`;

const designSystemDiagram = String.raw`flowchart LR
    CMS["CMS data\n{ title, variant: 'featured', imageUrl }"]
    BIZ["Business Component\n<ArticleCard variant='featured' />"]
    DS["Design System Primitive\n<Card accent={theme.colors.featured} />"]
    TOKEN["Emotion Theme Token\n theme.colors.featured = '#2557d6'"]

    CMS -->|"props"| BIZ
    BIZ -->|"maps to"| DS
    DS -->|"reads"| TOKEN`;

export const toc: TocItem[] = [
  { id: "emotion-fundamentals", title: "Emotion Fundamentals: css Prop vs styled", level: 2 },
  { id: "theming", title: "Theming with ThemeProvider", level: 2 },
  { id: "typescript-theme", title: "TypeScript Theme Augmentation", level: 3 },
  { id: "ssr-emotion", title: "SSR with Emotion in Next.js App Router", level: 2 },
  { id: "global-styles", title: "Global Styles with Emotion", level: 3 },
  { id: "design-system-integration", title: "Design System Integration", level: 2 },
  { id: "storybook-setup", title: "Storybook Setup for Next.js", level: 2 },
  { id: "storybook-stories", title: "Writing Stories for CMS Components", level: 3 },
  { id: "comparison-tables", title: "Emotion vs Alternatives", level: 2 },
  { id: "interview-playbook", title: "Interview Playbook", level: 2 },
  { id: "interview-challenge", title: "Interview Challenge", level: 2 },
];

export default function CssInJsEmotionStorybook() {
  return (
    <div className="article-content">
      <p>
        Emotion is a runtime CSS-in-JS library. The Indeed codebase uses it for component styling,
        and the JD calls out Storybook explicitly. This module covers Emotion's two styling APIs,
        how to wire it up correctly for SSR in Next.js App Router (critical — get this wrong and
        you get a flash of unstyled content on every page load), design system integration patterns,
        and Storybook for CMS-fed components.
      </p>

      <h2 id="emotion-fundamentals">Emotion Fundamentals: css Prop vs styled</h2>

      <pre>
        <code>{`// Two APIs — same output (CSS class injection), different DX

// 1. css prop — colocated with JSX, dynamic styles as object or template literal
/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react";

// Object style (TypeScript-friendly, no template literal parsing overhead)
function HeroSection({ featured }: { featured: boolean }) {
  return (
    <section
      css={{
        padding: "48px 24px",
        background: featured ? "var(--color-primary)" : "var(--color-surface)",
        borderRadius: "12px",
        "@media (min-width: 768px)": {
          padding: "64px 48px",
        },
      }}
    >
      Hero content
    </section>
  );
}

// Template literal style — easier to paste existing CSS
const heroStyle = css\`
  padding: 48px 24px;
  border-radius: 12px;

  @media (min-width: 768px) {
    padding: 64px 48px;
  }
\`;

// 2. styled — creates a new component with styles baked in
import styled from "@emotion/styled";

const HeroSectionStyled = styled.section<{ featured: boolean }>\`
  padding: 48px 24px;
  border-radius: 12px;
  background: \${({ featured, theme }) =>
    featured ? theme.colors.primary : theme.colors.surface};
\`;

// css prop: best for one-off styles directly on a JSX element — no new component
// styled: best for components that have consistent style variants and need theme access`}</code>
      </pre>

      <h2 id="theming">Theming with ThemeProvider</h2>

      <pre>
        <code>{`// Define the theme object
const indeedTheme = {
  colors: {
    primary: "#2557d6",
    primaryHover: "#1a3fa0",
    surface: "#ffffff",
    surfaceAlt: "#f5f5f5",
    text: "#1a1a1a",
    textMuted: "#666666",
    border: "#e5e5e5",
    error: "#d9360b",
    success: "#2e7d32",
  },
  spacing: {
    xs: "4px",
    sm: "8px",
    md: "16px",
    lg: "24px",
    xl: "48px",
  },
  typography: {
    fontFamily: "'Indeed Sans', -apple-system, BlinkMacSystemFont, sans-serif",
    fontSize: {
      sm: "14px",
      base: "16px",
      lg: "20px",
      xl: "24px",
      "2xl": "32px",
    },
    fontWeight: {
      regular: 400,
      medium: 500,
      bold: 700,
    },
    lineHeight: {
      tight: 1.3,
      normal: 1.6,
      relaxed: 1.75,
    },
  },
  radii: {
    sm: "4px",
    md: "8px",
    lg: "16px",
    full: "9999px",
  },
} as const;

type IndeedTheme = typeof indeedTheme;

// Usage in styled component:
const Button = styled.button<{ variant: "primary" | "secondary" }>\`
  padding: \${({ theme }) => \`\${theme.spacing.sm} \${theme.spacing.md}\`};
  background: \${({ variant, theme }) =>
    variant === "primary" ? theme.colors.primary : "transparent"};
  color: \${({ variant, theme }) =>
    variant === "primary" ? "#ffffff" : theme.colors.primary};
  border: 2px solid \${({ theme }) => theme.colors.primary};
  border-radius: \${({ theme }) => theme.radii.md};
  font-size: \${({ theme }) => theme.typography.fontSize.base};
  font-weight: \${({ theme }) => theme.typography.fontWeight.medium};
  cursor: pointer;

  &:hover {
    background: \${({ variant, theme }) =>
      variant === "primary" ? theme.colors.primaryHover : theme.colors.surfaceAlt};
  }
\`;`}</code>
      </pre>

      <h3 id="typescript-theme">TypeScript Theme Augmentation</h3>

      <pre>
        <code>{`// Augment Emotion's Theme interface so TypeScript knows your theme shape
// This makes theme.colors.primary fully typed throughout the codebase

// src/types/emotion.d.ts
import "@emotion/react";
import { IndeedTheme } from "@/styles/theme";

declare module "@emotion/react" {
  // Merge your theme type into Emotion's Theme interface
  export interface Theme extends IndeedTheme {}
}

// Now every styled component and useTheme call has full type safety:
const Component = styled.div\`
  color: \${({ theme }) => theme.colors.primary}; // ✓ TypeScript knows this is a string
  padding: \${({ theme }) => theme.spacing.nonexistent}; // ✗ TypeScript error — good!
\`;

// useTheme hook — access theme in functional components without styled:
import { useTheme } from "@emotion/react";

function ArticleDate({ date }: { date: string }) {
  const theme = useTheme(); // type: IndeedTheme
  return (
    <time
      css={{
        color: theme.colors.textMuted,
        fontSize: theme.typography.fontSize.sm,
      }}
    >
      {date}
    </time>
  );
}`}</code>
      </pre>

      <h2 id="ssr-emotion">SSR with Emotion in Next.js App Router</h2>
      <MermaidDiagram
        chart={emotionSsrDiagram}
        title="Emotion SSR Flow in Next.js App Router"
        caption="Without SSR setup, Emotion injects styles client-side after hydration — causing a flash of unstyled content. CacheProvider extracts styles during server render and injects them into HTML."
        minHeight={380}
      />

      <pre>
        <code>{`// Required: Emotion SSR setup for Next.js App Router
// Without this, pages will show unstyled content on first load before hydration

// src/lib/emotion-cache.ts
import createCache from "@emotion/cache";

export function createEmotionCache() {
  return createCache({ key: "css" });
}

// src/components/providers/EmotionProvider.tsx — "use client" wrapper
"use client";

import { CacheProvider } from "@emotion/react";
import { ThemeProvider } from "@emotion/react";
import { createEmotionCache } from "@/lib/emotion-cache";
import { indeedTheme } from "@/styles/theme";
import { useMemo } from "react";

export function EmotionProvider({ children }: { children: React.ReactNode }) {
  const cache = useMemo(() => createEmotionCache(), []);

  return (
    <CacheProvider value={cache}>
      <ThemeProvider theme={indeedTheme}>
        {children}
      </ThemeProvider>
    </CacheProvider>
  );
}

// src/app/layout.tsx — wrap with EmotionProvider
import { EmotionProvider } from "@/components/providers/EmotionProvider";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <EmotionProvider>
          {children}
        </EmotionProvider>
      </body>
    </html>
  );
}

// Important: CacheProvider must be a client component
// It wraps the tree with context — Server Components above it still work,
// but styled components and useTheme only work in Client Components`}</code>
      </pre>

      <h3 id="global-styles">Global Styles with Emotion</h3>

      <pre>
        <code>{`// Global styles — applied to the entire document
// Use for CSS reset, base typography, and design token CSS variables
import { Global, css } from "@emotion/react";

function GlobalStyles() {
  return (
    <Global
      styles={css\`
        /* CSS Reset */
        *, *::before, *::after {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        /* Base typography */
        html {
          font-size: 16px;
          -webkit-font-smoothing: antialiased;
        }

        body {
          font-family: 'Indeed Sans', -apple-system, BlinkMacSystemFont, sans-serif;
          color: #1a1a1a;
          background: #ffffff;
          line-height: 1.6;
        }

        /* Accessible focus styles */
        :focus-visible {
          outline: 3px solid #2557d6;
          outline-offset: 2px;
          border-radius: 2px;
        }

        /* Article content typography */
        .article-content h2 { font-size: 24px; margin-top: 32px; margin-bottom: 16px; }
        .article-content p  { margin-bottom: 16px; }
        .article-content ul, .article-content ol { padding-left: 24px; margin-bottom: 16px; }
      \`}
    />
  );
}`}</code>
      </pre>

      <h2 id="design-system-integration">Design System Integration</h2>
      <MermaidDiagram
        chart={designSystemDiagram}
        title="Design System Component Consumption Pattern"
        caption="Business components map CMS data to design system primitives. They never re-implement styling already in the design system — they compose."
        minHeight={280}
      />

      <pre>
        <code>{`// Consuming Indeed's design system (XDS) while customizing with Emotion
// Scenario: XDS Button exists but needs a CMS-controlled color variant

// 1. Use the design system primitive directly when it fits:
import { Button } from "@indeed/xds";

function ArticleCta({ cta }: { cta: CmsCtaData }) {
  return <Button href={cta.url}>{cta.label}</Button>;
}

// 2. Extend/wrap when customization is needed:
import styled from "@emotion/styled";
import { Card } from "@indeed/xds";

// Wrap the design system Card with CMS-driven variant styling
const FeaturedArticleCard = styled(Card)<{ featured: boolean }>\`
  border-left: 4px solid \${({ featured, theme }) =>
    featured ? theme.colors.primary : "transparent"};
  box-shadow: \${({ featured }) =>
    featured ? "0 4px 12px rgba(37, 87, 214, 0.15)" : "none"};
\`;

// 3. Never override design system internals — use the API they expose:
// BAD: reaches inside XDS component to change its styles
const BadCard = styled(Card)\`
  .xds-card-inner { padding: 0; } /* fragile — breaks when XDS updates */
\`;

// GOOD: use the design system's exposed props
<Card spacing="none" />`}</code>
      </pre>

      <h2 id="storybook-setup">Storybook Setup for Next.js</h2>

      <pre>
        <code>{`# Install Storybook with the Next.js framework preset
npx storybook@latest init
# Select: React, then Next.js framework (handles routing mocks, image optimization)

# .storybook/main.ts
import type { StorybookConfig } from "@storybook/nextjs";

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.tsx"],
  framework: "@storybook/nextjs",
  addons: [
    "@storybook/addon-essentials",  // docs, controls, actions, backgrounds
    "@storybook/addon-a11y",        // accessibility panel with axe-core
    "@chromatic-com/storybook",     // visual regression testing
  ],
};

export default config;

// .storybook/preview.tsx — wrap all stories with Emotion provider
import { EmotionProvider } from "../src/components/providers/EmotionProvider";
import type { Preview } from "@storybook/react";

const preview: Preview = {
  decorators: [
    (Story) => (
      <EmotionProvider>
        <Story />
      </EmotionProvider>
    ),
  ],
  parameters: {
    backgrounds: {
      default: "light",
      values: [
        { name: "light", value: "#ffffff" },
        { name: "dark", value: "#0c0c0f" },
      ],
    },
  },
};

export default preview;`}</code>
      </pre>

      <h3 id="storybook-stories">Writing Stories for CMS Components</h3>

      <pre>
        <code>{`// src/components/blocks/ArticleCard.stories.tsx
import type { Meta, StoryObj } from "@storybook/react";
import ArticleCard from "./ArticleCard";

const meta: Meta<typeof ArticleCard> = {
  title: "CMS Blocks/ArticleCard",
  component: ArticleCard,
  tags: ["autodocs"], // generates documentation from JSDoc and prop types
  argTypes: {
    article: { control: false }, // complex object — don't show in controls
    "article.title": { control: "text" }, // override to allow text control
  },
};

export default meta;
type Story = StoryObj<typeof ArticleCard>;

// The base story — simulates typical CMS data
export const Default: Story = {
  args: {
    article: {
      uid: "blt123",
      title: "How to update your billing information",
      summary: "Learn how to change your payment method, billing address, and invoice preferences.",
      url: "/help/billing/update-billing",
      published_date: "2024-01-15",
      author: {
        name: "Support Team",
        avatar: { url: "https://via.placeholder.com/40" },
      },
      category: { title: "Billing", url: "/help/billing" },
    },
    featured: false,
  },
};

// Featured variant — highlighted border from Emotion theme
export const Featured: Story = {
  args: {
    ...Default.args,
    featured: true,
  },
};

// Edge case: very long title
export const LongTitle: Story = {
  args: {
    article: {
      ...Default.args!.article,
      title:
        "A very long article title that tests how the card component handles text overflow " +
        "when editors write titles that exceed the expected character count for this component",
    },
  },
};

// Edge case: no optional fields (summary, featured image)
export const Minimal: Story = {
  args: {
    article: {
      uid: "blt456",
      title: "Account FAQ",
      summary: undefined,
      url: "/help/account/faq",
      published_date: "2024-01-10",
      author: { name: "Support Team", avatar: undefined },
      category: { title: "Account", url: "/help/account" },
    },
    featured: false,
  },
};

// Interaction test — click triggers the article link
import { expect, userEvent, within } from "@storybook/test";

export const Clickable: Story = {
  ...Default,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const link = canvas.getByRole("link", { name: /how to update/i });
    await expect(link).toBeInTheDocument();
    await expect(link).toHaveAttribute("href", "/help/billing/update-billing");
  },
};`}</code>
      </pre>

      <h2 id="comparison-tables">Emotion vs Alternatives</h2>

      <ArticleTable caption="Emotion css prop vs styled — different use cases, same output." minWidth={860}>
        <table>
          <thead>
            <tr>
              <th>Aspect</th>
              <th>css prop</th>
              <th>styled</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Performance</td>
              <td>Slightly faster (no component wrapper)</td>
              <td>Adds thin component wrapper</td>
            </tr>
            <tr>
              <td>Readability</td>
              <td>Style and JSX colocated — easy to scan</td>
              <td>Component name adds semantics (HeroSection vs div)</td>
            </tr>
            <tr>
              <td>Variants</td>
              <td>Inline conditional (verbose for many variants)</td>
              <td>Clean variant prop pattern via template literal logic</td>
            </tr>
            <tr>
              <td>Theme access</td>
              <td>Requires useTheme hook</td>
              <td>Automatic via ThemeProvider injection</td>
            </tr>
            <tr>
              <td>Reusability</td>
              <td>Not reusable without extracting to variable</td>
              <td>Component is naturally reusable</td>
            </tr>
            <tr>
              <td>Best for</td>
              <td>One-off, context-specific styles on existing elements</td>
              <td>Design system primitives, reusable block components</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <ArticleTable caption="CSS-in-JS vs CSS Modules vs Tailwind — the architectural tradeoffs." minWidth={900}>
        <table>
          <thead>
            <tr>
              <th>Aspect</th>
              <th>Emotion (CSS-in-JS)</th>
              <th>CSS Modules</th>
              <th>Tailwind CSS</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>SSR Complexity</td>
              <td>High — requires CacheProvider + style extraction setup</td>
              <td>None — CSS is static</td>
              <td>None — utility classes are static</td>
            </tr>
            <tr>
              <td>Runtime Bundle</td>
              <td>~10KB runtime for style injection</td>
              <td>Zero runtime</td>
              <td>Zero runtime</td>
            </tr>
            <tr>
              <td>Dynamic Styles</td>
              <td>Excellent — interpolate any JS value into styles</td>
              <td>Limited — CSS custom properties for dynamic values</td>
              <td>Requires generating all possible classes at build time</td>
            </tr>
            <tr>
              <td>TypeScript DX</td>
              <td>Excellent with theme augmentation</td>
              <td>Good with CSS Modules type generation</td>
              <td>Good with VS Code extension</td>
            </tr>
            <tr>
              <td>Design Token Integration</td>
              <td>Theme object with full TS types</td>
              <td>CSS custom properties (global)</td>
              <td>tailwind.config.ts extends</td>
            </tr>
            <tr>
              <td>When to Choose</td>
              <td>Existing codebase using it; design systems with complex theming</td>
              <td>Simple component styles; zero-runtime requirement</td>
              <td>Rapid development; design systems with utility-first approach</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="interview-playbook">Interview Playbook</h2>
      <InterviewPlaybook
        title="How to answer: 'What's your experience with CSS-in-JS? What tradeoffs would you consider vs Tailwind?'"
        intro="This question is about tradeoffs, not advocacy. Neither answer is wrong — demonstrate that you can reason about the choice for a specific context, not that you have a religion."
        steps={[
          "Acknowledge both approaches are valid: Emotion and Tailwind solve the same problem differently. I choose based on what the project already uses and the team's preferences. For the Indeed codebase that uses Emotion, I'd invest in the Emotion mental model.",
          "Name Emotion's strengths for this role: dynamic styles are natural (interpolate theme tokens and component props directly). TypeScript theme augmentation gives type safety for design tokens. Storybook integration is seamless. Complex variant patterns are readable with the styled API.",
          "Name the tradeoffs honestly: Emotion adds SSR complexity — you need CacheProvider in the Next.js layout or you get FOUC. There's a ~10KB runtime bundle. If the team switches to RSC-heavy architecture, Emotion's client-side requirement means more 'use client' boundaries.",
          "Name Tailwind's strengths in contrast: zero runtime, no SSR setup, works naturally in Server Components, fast iteration with utility classes. The constraint of pre-defined utilities forces design token discipline. For new projects starting from scratch, Tailwind + CSS custom properties is often simpler.",
          "Close with pragmatism: if I joined Indeed and the codebase uses Emotion, I would use Emotion correctly — CacheProvider for SSR, TypeScript theme augmentation, styled for design system primitives. I would not advocate for migrating to Tailwind unless there was a clear performance or maintenance problem to solve.",
        ]}
      />

      <h2 id="interview-challenge">Interview Challenge</h2>
      <InterviewChallenge
        title="Build an ArticleCard Component with Emotion and Storybook"
        scenario={
          <span>
            The Help Center needs a reusable <code>ArticleCard</code> component that displays a
            CMS article preview in a list or grid. It must support a <code>featured</code> variant
            (with a blue left border and subtle shadow), render a CMS image with a fallback
            placeholder, and be documented with Storybook stories for all variants. The design
            system provides a <code>{"<Card>"}</code> primitive — use it as the base.
          </span>
        }
        tasks={[
          "Define the ArticleCard prop types — include the CMS article data shape (title, summary, url, featured_image with url + dimension, author with name + avatar, published_date) and a featured boolean",
          "Implement ArticleCard using Emotion styled with the Card design system primitive — the featured variant must use theme tokens for color (not hardcoded hex values)",
          "Handle the CMS image gracefully: show the featured image with correct width/height from the dimension field, fall back to a placeholder div if featured_image is undefined, and always provide an alt attribute",
          "Write Storybook stories covering: Default (with image), Featured variant, Minimal (no image, no summary), and a LongTitle edge case story",
          "Add an interaction test using Storybook's play function that verifies the article title is an accessible link with the correct href",
        ]}
        pitfalls={[
          "Using hardcoded hex colors instead of theme tokens — defeats the purpose of theming and makes global color changes require hunting through component files",
          "Not configuring EmotionProvider in .storybook/preview.tsx — ThemeProvider is not available in stories, so styled components can't access the theme",
          "Using dangerouslySetInnerHTML for the article summary — the CMS summary field is plain text, not HTML; just render it as text",
          "Forgetting to pass width and height to next/image for the CMS image — causes CLS on the article listing page",
        ]}
        signal="A strong answer uses styled(Card) not a raw div, accesses theme tokens in the template literal via ({ theme }), renders the image conditionally with dimension-based width/height, and writes Storybook stories that simulate realistic CMS data shapes including edge cases for missing optional fields."
      />
    </div>
  );
}
