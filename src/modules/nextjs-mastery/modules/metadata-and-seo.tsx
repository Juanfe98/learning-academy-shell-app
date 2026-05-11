import type { TocItem } from "@/lib/types/academy";

export const toc: TocItem[] = [
  { id: "static-metadata", title: "Static Metadata Export", level: 2 },
  { id: "dynamic-metadata", title: "Dynamic Metadata with generateMetadata", level: 2 },
  { id: "open-graph", title: "Open Graph and Twitter Cards", level: 2 },
  { id: "opengraph-image", title: "opengraph-image.tsx — Generated OG Images", level: 3 },
  { id: "robots", title: "robots.ts", level: 2 },
  { id: "sitemap", title: "sitemap.ts", level: 2 },
  { id: "canonical-metadata", title: "Canonical URLs and Alternate Links", level: 2 },
  { id: "metadata-inheritance", title: "Metadata Inheritance and Merging", level: 2 },
  { id: "common-mistakes", title: "Common Mistakes", level: 2 },
];

export default function MetadataAndSeo() {
  return (
    <div className="article-content">
      <p>
        Next.js App Router has a first-class metadata API. You export a <code>metadata</code>{" "}
        object or a <code>generateMetadata</code> function from any <code>layout.tsx</code> or{" "}
        <code>page.tsx</code> and Next.js compiles it into the correct <code>&lt;head&gt;</code>{" "}
        tags — title, description, Open Graph, Twitter cards, robots, and more. No{" "}
        <code>next/head</code>, no Helmet.
      </p>

      <h2 id="static-metadata">Static Metadata Export</h2>
      <p>
        For pages with fixed metadata (not dependent on data fetching), export a{" "}
        <code>metadata</code> object.
      </p>

      <pre><code>{`// src/app/about/page.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Us",
  description: "Learn more about our company and team.",
};

export default function AboutPage() {
  return <main>About content</main>;
}

// src/app/layout.tsx — root metadata (applies to all pages as defaults)
export const metadata: Metadata = {
  title: {
    default: "My App",       // used when a page has no title
    template: "%s | My App", // %s is replaced by the page's title
  },
  description: "The best app ever built",
  keywords: ["next.js", "react", "app"],
  authors: [{ name: "Juan Montana" }],
  creator: "Juan Montana",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://myapp.com",
    siteName: "My App",
  },
  twitter: {
    card: "summary_large_image",
    creator: "@juanmontana",
  },
  robots: {
    index: true,
    follow: true,
  },
};

// Page title with template applied: "About Us | My App"
// The template from the root layout is inherited and applied
export const metadata: Metadata = {
  title: "About Us", // becomes "About Us | My App" via the root template
};

// To opt out of the template:
export const metadata: Metadata = {
  title: {
    absolute: "My App - About", // ignores the template entirely
  },
};`}</code></pre>

      <h2 id="dynamic-metadata">Dynamic Metadata with generateMetadata</h2>
      <p>
        When metadata depends on fetched data (a blog post title, product name, etc.), export
        an async <code>generateMetadata</code> function. Next.js calls this before rendering
        and uses the returned metadata for the page's <code>&lt;head&gt;</code>.
      </p>

      <pre><code>{`// src/app/blog/[slug]/page.tsx
import type { Metadata } from "next";

// generateMetadata receives the same props as the page component
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  // Fetch the post data — Next.js deduplicates this with the page's own fetch
  const post = await getPost(slug);

  if (!post) {
    return {
      title: "Post Not Found",
      robots: { index: false },
    };
  }

  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: "article",
      publishedTime: post.publishedAt.toISOString(),
      authors: [post.author.name],
      images: [
        {
          url: post.coverImage,
          width: 1200,
          height: 630,
          alt: post.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt,
      images: [post.coverImage],
    },
  };
}

export default async function BlogPost({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPost(slug);
  // Note: both getPost() calls are deduplicated by Next.js (request memoization)
  return <article>{post.content}</article>;
}`}</code></pre>

      <h2 id="open-graph">Open Graph and Twitter Cards</h2>
      <p>
        Open Graph tags control how your pages appear when shared on social media (LinkedIn,
        Facebook, Slack). Twitter cards control the Twitter/X preview. Both are set in the
        <code>openGraph</code> and <code>twitter</code> metadata fields.
      </p>

      <pre><code>{`export const metadata: Metadata = {
  openGraph: {
    type: "website",       // or "article", "product", "video.movie", etc.
    url: "https://myapp.com/products/widget",
    title: "The Widget",
    description: "The best widget for your needs",
    images: [
      {
        url: "https://myapp.com/og/widget.jpg",
        width: 1200,   // recommended OG image dimensions
        height: 630,
        alt: "Photo of the Widget product",
      },
    ],
    siteName: "My App",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image", // or "summary", "app", "player"
    title: "The Widget",
    description: "The best widget for your needs",
    images: ["https://myapp.com/og/widget.jpg"],
    creator: "@myhandle",
    site: "@mysite",
  },
};`}</code></pre>

      <h3 id="opengraph-image">opengraph-image.tsx — Generated OG Images</h3>
      <p>
        Next.js can generate OG images dynamically using the <code>ImageResponse</code> API.
        Create an <code>opengraph-image.tsx</code> file in a route directory and export a
        default function that returns an <code>ImageResponse</code>.
      </p>

      <pre><code>{`// src/app/blog/[slug]/opengraph-image.tsx
import { ImageResponse } from "next/og";

export const runtime = "edge";       // run on edge for faster cold starts
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OGImage({
  params,
}: {
  params: { slug: string };
}) {
  const post = await getPost(params.slug);

  return new ImageResponse(
    (
      // JSX rendered to an image using Satori
      <div
        style={{
          background: "#0c0c0f",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "flex-end",
          padding: "60px",
        }}
      >
        <div style={{ fontSize: 64, color: "#f0f0f5", fontWeight: 700 }}>
          {post.title}
        </div>
        <div style={{ fontSize: 32, color: "#a0a0b8", marginTop: 16 }}>
          {post.author.name}
        </div>
      </div>
    ),
    { ...size }
  );
}

// Next.js automatically serves this image at:
// /blog/[slug]/opengraph-image
// And adds the correct og:image meta tag pointing to it.

// You can also use static image files:
// opengraph-image.png — static OG image for the route
// twitter-image.png  — static Twitter card image`}</code></pre>

      <h2 id="robots">robots.ts</h2>
      <p>
        Generate a <code>robots.txt</code> programmatically. Place <code>robots.ts</code> in{" "}
        <code>src/app/</code> and export a default function.
      </p>

      <pre><code>{`// src/app/robots.ts
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/dashboard/", "/admin/"],
      },
      {
        userAgent: "Googlebot",
        allow: "/",
        disallow: "/private/",
        crawlDelay: 10,
      },
    ],
    sitemap: "https://myapp.com/sitemap.xml",
    host: "https://myapp.com",
  };
}

// Generated robots.txt:
// User-agent: *
// Allow: /
// Disallow: /api/
// Disallow: /dashboard/
// Disallow: /admin/
// Sitemap: https://myapp.com/sitemap.xml`}</code></pre>

      <h2 id="sitemap">sitemap.ts</h2>
      <p>
        Generate a <code>sitemap.xml</code> from your data sources. For large sitemaps,
        Next.js supports multiple sitemap files and a sitemap index.
      </p>

      <pre><code>{`// src/app/sitemap.ts
import type { MetadataRoute } from "next";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Fetch dynamic routes
  const posts = await db.post.findMany({
    select: { slug: true, updatedAt: true },
    where: { published: true },
  });

  const postEntries: MetadataRoute.Sitemap = posts.map((post) => ({
    url: \`https://myapp.com/blog/\${post.slug}\`,
    lastModified: post.updatedAt,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  // Static routes
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: "https://myapp.com",
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: "https://myapp.com/about",
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];

  return [...staticRoutes, ...postEntries];
}

// For large sites (50,000+ URLs), use generateSitemaps() to split across multiple files:
export async function generateSitemaps() {
  const totalPosts = await db.post.count({ where: { published: true } });
  const sitemapCount = Math.ceil(totalPosts / 50000);
  return Array.from({ length: sitemapCount }, (_, i) => ({ id: i }));
}

// Then receive the id in the sitemap function:
export async function sitemap({ id }: { id: number }): Promise<MetadataRoute.Sitemap> {
  const posts = await db.post.findMany({
    skip: id * 50000,
    take: 50000,
  });
  // ...
}`}</code></pre>

      <h2 id="canonical-metadata">Canonical URLs and Alternate Links</h2>

      <pre><code>{`export const metadata: Metadata = {
  alternates: {
    canonical: "https://myapp.com/blog/my-post", // the "true" URL for this content
    languages: {
      "en-US": "https://myapp.com/en/blog/my-post",
      "es-ES": "https://myapp.com/es/blog/my-post",
    },
    types: {
      "application/rss+xml": "https://myapp.com/feed.xml",
    },
  },
};`}</code></pre>

      <h2 id="metadata-inheritance">Metadata Inheritance and Merging</h2>
      <p>
        Metadata defined in a <code>layout.tsx</code> is inherited by all pages in that
        segment. A page's <code>metadata</code> is shallowly merged with (and overrides)
        the layout's metadata. Nested keys like <code>openGraph</code> are NOT deeply merged —
        they override the whole field.
      </p>

      <pre><code>{`// Root layout — base metadata
export const metadata: Metadata = {
  title: { default: "App", template: "%s | App" },
  description: "Default description",
  openGraph: {
    siteName: "App",
    type: "website",
  },
};

// Blog post page — overrides
export const metadata: Metadata = {
  title: "My Post", // becomes "My Post | App" via root template
  // description is inherited from root layout
  openGraph: {
    // ⚠ This REPLACES the entire openGraph from the layout, not merges with it
    // If you don't repeat siteName here, it won't appear in the rendered tags
    title: "My Post",
    type: "article",
    // siteName is LOST — the root openGraph.siteName is not inherited into this block
  },
};

// Best practice: spread the base openGraph when overriding
import { siteConfig } from "@/lib/site-config";

export async function generateMetadata({ params }) {
  const post = await getPost((await params).slug);
  return {
    title: post.title,
    openGraph: {
      ...siteConfig.openGraph, // spread base OG data
      title: post.title,
      description: post.excerpt,
      type: "article",
    },
  };
}`}</code></pre>

      <h2 id="common-mistakes">Common Mistakes</h2>
      <ul>
        <li>
          <strong>Using <code>next/head</code> in App Router.</strong> The old{" "}
          <code>next/head</code> does not work in App Router. Use the <code>metadata</code>{" "}
          export or <code>generateMetadata</code> function exclusively.
        </li>
        <li>
          <strong>Forgetting that <code>openGraph</code> does not deep-merge.</strong>{" "}
          Overriding <code>openGraph</code> in a page replaces the entire object. Spread
          your base config to preserve site-wide properties.
        </li>
        <li>
          <strong>Missing <code>await params</code> in <code>generateMetadata</code>.</strong>{" "}
          In Next.js 15, <code>params</code> is a Promise in both <code>generateMetadata</code>{" "}
          and the page component.
        </li>
        <li>
          <strong>Not testing OG images with social previews.</strong> Use tools like{" "}
          <code>opengraph.xyz</code> or the Facebook Sharing Debugger to verify that OG tags
          render correctly before deploying.
        </li>
      </ul>
    </div>
  );
}
