import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import {
  ArticleTable,
  InterviewPlaybook,
  InterviewChallenge,
  SolutionReveal,
} from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const appRouterTypeFlow = String.raw`flowchart TD
  PAGE["Page Component\n(async Server Component)"]
  PARAMS["params: Promise<{ slug: string }>"]
  SEARCH["searchParams: Promise<{ q?: string }>"]
  AWAIT_P["const { slug } = await params"]
  AWAIT_S["const { q } = await searchParams"]
  TYPED_SLUG["slug: string ✓"]
  TYPED_Q["q: string | undefined ✓"]
  RENDER["Return JSX with fully-typed data"]

  PAGE --> PARAMS
  PAGE --> SEARCH
  PARAMS --> AWAIT_P --> TYPED_SLUG --> RENDER
  SEARCH --> AWAIT_S --> TYPED_Q --> RENDER`;

const pagesRouterInferFlow = String.raw`flowchart LR
  GSP["getServerSideProps\nreturn { props: { user } }"]
  INFER["InferGetServerSidePropsType\n<typeof getServerSideProps>"]
  COMPONENT["Page Component\n({ user }: InferredProps)"]
  SINGLE["Single source of truth\nfor props type"]

  GSP -->|"TypeScript infers Props"| INFER
  INFER -->|"Auto-typed"| COMPONENT
  GSP -->|"Refactor here..."| SINGLE
  SINGLE -->|"...component updates automatically"| COMPONENT`;

export const toc: TocItem[] = [
  { id: "ts-mental-model", title: "The TypeScript Mental Model for Next.js", level: 2 },
  { id: "pages-router-type-utils", title: "Pages Router Type Utilities", level: 2 },
  { id: "infer-props-pattern", title: "The Infer* Pattern — Why It Matters", level: 3 },
  { id: "app-router-types", title: "App Router Types (Next.js 15)", level: 2 },
  { id: "route-handler-types", title: "Route Handler Types", level: 3 },
  { id: "server-action-types", title: "Server Action Types", level: 3 },
  { id: "typed-routes", title: "Experimental typedRoutes", level: 2 },
  { id: "nextconfig-types", title: "Type-Safe next.config.ts", level: 2 },
  { id: "common-ts-pitfalls", title: "Common TypeScript Pitfalls", level: 2 },
  { id: "ts-comparison-table", title: "Type Utility Reference Table", level: 2 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "interview-challenge", title: "Interview Challenge", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function TypescriptInNextjs() {
  return (
    <div className="article-content">
      <p>
        Next.js ships typed utilities for every primitive it exposes — server props, metadata,
        navigation, route handlers, and server actions. Most teams never fully use them and end up
        with <code>any</code> annotations, manual type duplication, or runtime errors that
        TypeScript could have caught at compile time. This module covers every type utility
        across both Pages Router and App Router, explains the breaking changes Next.js 15 introduced
        to App Router types, and shows exactly how to connect them so your entire data flow is
        type-safe from the server function all the way to the rendered JSX.
      </p>

      <h2 id="ts-mental-model">The TypeScript Mental Model for Next.js</h2>
      <p>
        Think of Next.js TypeScript support in three layers. First, there are{" "}
        <strong>function-level type utilities</strong> — generics that type your{" "}
        <code>getServerSideProps</code>, <code>getStaticProps</code>, and <code>generateMetadata</code>{" "}
        functions. Second, there are <strong>structural types for incoming data</strong> — what shape
        is <code>params</code>, <code>searchParams</code>, and <code>request</code>? Third, there are{" "}
        <strong>inference helpers</strong> — utilities like <code>InferGetServerSidePropsType</code>{" "}
        that derive the component props type directly from your function, so you never maintain
        the type in two places.
      </p>
      <p>
        The biggest shift in Next.js 15 is that <code>params</code> and <code>searchParams</code>{" "}
        became <strong>Promises</strong>. This is the most common source of TypeScript confusion on
        upgraded codebases — the types compile fine but runtime crashes if you forget to{" "}
        <code>await</code> them. We will cover why this happened and how to handle it correctly.
      </p>

      <h2 id="pages-router-type-utils">Pages Router Type Utilities</h2>
      <p>
        The Pages Router ships a complete set of typed wrappers in the <code>next</code> package.
        All of these are imported from <code>"next"</code> (not <code>"next/server"</code>).
      </p>

      <h3>GetServerSideProps and InferGetServerSidePropsType</h3>
      <p>
        <code>GetServerSideProps{"<Props, Params>"}</code> types the entire function including the{" "}
        <code>context</code> argument. Pair it with <code>InferGetServerSidePropsType</code> on the
        component so the props type is derived automatically rather than written twice:
      </p>

      <pre>
        <code>{`import type {
  GetServerSideProps,
  InferGetServerSidePropsType,
} from "next";

type User = { id: string; name: string; email: string };

// Props is explicit — this is the shape returned in { props: ... }
type Props = { user: User };

// Context is typed: context.params is Record<string, string | string[]>
// The second generic narrows params to your expected shape
export const getServerSideProps: GetServerSideProps<
  Props,
  { id: string }
> = async (context) => {
  // context.params is typed as { id: string } | undefined
  const id = context.params?.id;
  if (!id) return { notFound: true };

  const user = await fetchUser(id);
  if (!user) return { notFound: true };

  return { props: { user } };
};

// No manual Props type annotation needed here — TypeScript derives it
export default function UserPage({
  user,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return <h1>{user.name}</h1>;
}`}</code>
      </pre>

      <h3>GetStaticProps, GetStaticPaths, and InferGetStaticPropsType</h3>
      <p>
        The static generation utilities follow the same pattern. <code>GetStaticPaths</code> types
        the paths function and ensures your returned params objects match the expected shape:
      </p>

      <pre>
        <code>{`import type {
  GetStaticProps,
  GetStaticPaths,
  InferGetStaticPropsType,
} from "next";

type Post = { slug: string; title: string; content: string };

export const getStaticPaths: GetStaticPaths<{ slug: string }> = async () => {
  const slugs = await fetchAllSlugs();
  return {
    paths: slugs.map((slug) => ({ params: { slug } })),
    fallback: "blocking", // typed as boolean | "blocking"
  };
};

export const getStaticProps: GetStaticProps<
  { post: Post },
  { slug: string }
> = async ({ params }) => {
  const post = await fetchPost(params!.slug);
  if (!post) return { notFound: true };
  return {
    props: { post },
    revalidate: 60, // ISR: regenerate every 60 seconds
  };
};

export default function PostPage({
  post,
}: InferGetStaticPropsType<typeof getStaticProps>) {
  return <article><h1>{post.title}</h1></article>;
}`}</code>
      </pre>

      <h3>NextApiRequest and NextApiResponse</h3>
      <p>
        Pages Router API routes use <code>NextApiRequest</code> and <code>NextApiResponse{"<Data>"}</code>.
        The generic on the response types the JSON you send — TypeScript will error if you call{" "}
        <code>res.json()</code> with the wrong shape:
      </p>

      <pre>
        <code>{`import type { NextApiRequest, NextApiResponse } from "next";

type ResponseData = { user: User } | { error: string };

// res.json() is typed: must match ResponseData
export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  const id = req.query.id as string;
  const user = await fetchUser(id);
  if (!user) return res.status(404).json({ error: "Not found" });
  res.status(200).json({ user });
}`}</code>
      </pre>

      <h3>NextPage</h3>
      <p>
        <code>NextPage{"<Props>"}</code> types a page component including optional static methods
        like <code>getInitialProps</code>. Use it when you need the page component itself to be
        explicitly typed — for instance when passing it as a value or wrapping with a HOC:
      </p>

      <pre>
        <code>{`import type { NextPage } from "next";

type Props = { title: string };

const MyPage: NextPage<Props> = ({ title }) => {
  return <h1>{title}</h1>;
};

export default MyPage;`}</code>
      </pre>

      <MermaidDiagram
        chart={pagesRouterInferFlow}
        title="The Infer* Pattern — Single Source of Truth"
        caption="InferGetServerSidePropsType derives the component's props type from the function. Refactor the function return type and the component updates automatically — no manual sync required."
        minHeight={360}
      />

      <h3 id="infer-props-pattern">The Infer* Pattern — Why It Matters</h3>
      <p>
        The most common mistake when adding TypeScript to a Pages Router app is defining a separate{" "}
        <code>Props</code> type for the component and another for <code>getServerSideProps</code>.
        They drift apart over time: you rename a field in the data fetching function and forget to
        update the component type. TypeScript catches it if you use <code>Infer*</code>, but misses
        it entirely when you maintain two separate type definitions.
      </p>
      <p>
        The rule is simple: the <strong>props type lives in exactly one place — the function</strong>.
        The component reads it via <code>InferGetServerSidePropsType</code> or{" "}
        <code>InferGetStaticPropsType</code>. When you refactor the function's return type,
        TypeScript propagates the change to the component automatically. No manual sync, no drift.
      </p>

      <h2 id="app-router-types">App Router Types (Next.js 15)</h2>
      <p>
        App Router types changed significantly in Next.js 15. The key breaking change:{" "}
        <strong>
          <code>params</code> and <code>searchParams</code> are now Promises
        </strong>
        , not plain objects. This was introduced to support async request APIs and deferred
        rendering. The type shows you <code>{"Promise<{ slug: string }>"}</code> — but the
        runtime error only happens if you forget to <code>await</code> it, which TypeScript
        does not always catch at the call site if you destructure naively.
      </p>

      <MermaidDiagram
        chart={appRouterTypeFlow}
        title="App Router Type Flow — Next.js 15"
        caption="Both params and searchParams arrive as Promises in Next.js 15. You must await them before accessing individual fields. TypeScript types the awaited result correctly."
        minHeight={480}
      />

      <pre>
        <code>{`// Page component — App Router (Next.js 15)
type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function Page({ params, searchParams }: PageProps) {
  // Must await — params is a Promise, not a plain object
  const { slug } = await params;
  const { q } = await searchParams;

  const post = await fetchPost(slug);
  return <article>{post.content}</article>;
}

// Layout component — params but no searchParams
type LayoutProps = {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
};

export default async function Layout({ children, params }: LayoutProps) {
  const { lang } = await params;
  return <html lang={lang}><body>{children}</body></html>;
}

// generateMetadata — same params shape
import type { Metadata, ResolvingMetadata } from "next";

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> },
  parent: ResolvingMetadata
): Promise<Metadata> {
  const { id } = await params;
  const product = await fetchProduct(id);
  const previousImages = (await parent).openGraph?.images ?? [];

  return {
    title: product.name,
    openGraph: {
      images: [product.imageUrl, ...previousImages],
    },
  };
}`}</code>
      </pre>

      <h3 id="route-handler-types">Route Handler Types</h3>
      <p>
        App Router route handlers (inside <code>app/api/</code> or co-located with pages) use{" "}
        <code>NextRequest</code> from <code>"next/server"</code> instead of{" "}
        <code>NextApiRequest</code>. The <code>params</code> argument is also a Promise here:
      </p>

      <pre>
        <code>{`import type { NextRequest } from "next/server";

// GET /api/products/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;

  // NextRequest extends Request — typed headers, cookies, nextUrl
  const token = request.headers.get("authorization");
  const { searchParams } = request.nextUrl; // URLSearchParams
  const format = searchParams.get("format") ?? "json";

  const product = await fetchProduct(id);
  if (!product) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  return Response.json({ product });
}

// POST handler — typed request body requires manual assertion
export async function POST(request: NextRequest): Promise<Response> {
  // No built-in type for body — parse and validate manually (e.g. with zod)
  const body: unknown = await request.json();
  const parsed = CreateProductSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const product = await createProduct(parsed.data);
  return Response.json({ product }, { status: 201 });
}`}</code>
      </pre>

      <h3 id="server-action-types">Server Action Types</h3>
      <p>
        Server actions used with <code>useActionState</code> (previously <code>useFormState</code>)
        have a specific function signature — they receive the previous state and the{" "}
        <code>FormData</code>. TypeScript can enforce this signature so the hook and the action
        stay in sync:
      </p>

      <pre>
        <code>{`"use server";

// Define the state shape in one place
type FormState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: boolean;
};

// Action signature: (prevState: State, formData: FormData) => Promise<State>
export async function submitContactForm(
  prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const name = formData.get("name");
  const email = formData.get("email");

  // All FormData.get() returns string | File | null — validate explicitly
  if (typeof name !== "string" || name.trim() === "") {
    return { error: "Name is required" };
  }
  if (typeof email !== "string" || !email.includes("@")) {
    return { fieldErrors: { email: ["Valid email is required"] } };
  }

  try {
    await sendEmail({ name, email });
    return { success: true };
  } catch {
    return { error: "Failed to send. Please try again." };
  }
}

// --- In the client component ---
"use client";
import { useActionState } from "react";
import { submitContactForm } from "./actions";

const initialState: FormState = {};

export function ContactForm() {
  // useActionState infers state and action types from the action function
  const [state, action, isPending] = useActionState(
    submitContactForm,
    initialState
  );

  return (
    <form action={action}>
      {state.error && <p className="error">{state.error}</p>}
      {state.success && <p>Message sent!</p>}
      <input name="name" disabled={isPending} />
      <input name="email" disabled={isPending} />
      <button type="submit" disabled={isPending}>Send</button>
    </form>
  );
}`}</code>
      </pre>

      <h2 id="typed-routes">Experimental typedRoutes</h2>
      <p>
        Next.js ships an opt-in feature that generates compile-time types for every route in your
        app. Enable it with <code>experimental.typedRoutes</code> in <code>next.config.ts</code>.
        Once enabled, <code>{"<Link href>"}</code> and <code>router.push()</code> only accept
        valid routes — misspelled or deleted routes become TypeScript errors.
      </p>

      <pre>
        <code>{`// next.config.ts
import type { NextConfig } from "next";

const nextConfig = {
  experimental: {
    typedRoutes: true,
  },
} satisfies NextConfig;

export default nextConfig;

// After running \`next build\` or \`next dev\`, Next.js generates:
// .next/types/link.d.ts  (or __generated__/link-types.d.ts in some versions)

// These now give TypeScript errors if the route doesn't exist:
import Link from "next/link";

// ✅ Valid route
<Link href="/products/[id]" />

// ❌ TypeScript error: "/does-not-exist" is not a valid route
<Link href="/does-not-exist" />

// With router.push():
import { useRouter } from "next/navigation";

function Nav() {
  const router = useRouter();

  router.push("/dashboard");       // ✅
  router.push("/does-not-exist"); // ❌ compile-time error
}`}</code>
      </pre>

      <p>
        The most important limitation: the generated types are only as fresh as your last{" "}
        <code>next build</code> or <code>next dev</code> run. If you add a new route and your IDE
        still reports an error, restart the dev server — it regenerates the type file on startup.
        In CI, always run <code>next build</code> before your type-check step so the generated
        file exists.
      </p>

      <h2 id="nextconfig-types">Type-Safe next.config.ts</h2>
      <p>
        Next.js 15 fully supports <code>next.config.ts</code> (TypeScript, not just JavaScript).
        Use <code>satisfies NextConfig</code> instead of casting with <code>as NextConfig</code> —
        the difference matters more than it looks.
      </p>

      <pre>
        <code>{`import type { NextConfig } from "next";

// ✅ satisfies — preserves literal types AND checks compatibility
// TypeScript knows the exact shape of nextConfig, not just "NextConfig"
const nextConfig = {
  experimental: {
    typedRoutes: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.example.com",
        pathname: "/images/**",
      },
    ],
  },
  // TypeScript will error if you add an unknown field here
} satisfies NextConfig;

export default nextConfig;

// ❌ as NextConfig — unsafe cast, loses literal types, no excess property check
const badConfig = {
  unknownField: true, // No TypeScript error — cast suppresses it
} as NextConfig;`}</code>
      </pre>

      <p>
        <strong>Why <code>satisfies</code> over <code>as</code>:</strong> <code>as NextConfig</code>{" "}
        is an assertion that tells TypeScript &quot;trust me, this is correct&quot;. It suppresses
        errors on unknown fields and loses the inferred literal types on the values.{" "}
        <code>satisfies NextConfig</code> checks compatibility without widening — TypeScript still
        knows <code>protocol</code> is <code>"https"</code> (a string literal), not just{" "}
        <code>string</code>, which matters when the type expects specific literals.
      </p>

      <h2 id="common-ts-pitfalls">Common TypeScript Pitfalls</h2>
      <p>
        These are the mistakes that are not obvious from reading the docs and show up most
        frequently in real codebases.
      </p>

      <ul>
        <li>
          <strong>Forgetting <code>await params</code> in Next.js 15</strong> — TypeScript shows
          the param type as <code>{"Promise<{ id: string }>"}</code>, not <code>{"{ id: string }"}</code>.
          It is easy to write <code>const {"{ id }"} = params</code> and get{" "}
          <code>id: Promise{"<{id: string}>"}</code> — which is a function call on a Promise, not a
          string. The type error is subtle and can look like a valid destructure if you are reading
          quickly.
        </li>
        <li>
          <strong>Passing non-serializable values Server → Client</strong> — TypeScript does not
          enforce serializability. Passing a <code>Date</code> object, a class instance, or a
          function as a prop from a Server Component to a Client Component compiles fine but throws
          a runtime error. Define explicit serializable types (<code>string</code>, plain objects,
          arrays) at the Server/Client boundary.
        </li>
        <li>
          <strong>Missing <code>"use client"</code> when using hooks</strong> — <code>useState</code>,{" "}
          <code>useEffect</code>, <code>useRouter</code> are only valid in Client Components.
          TypeScript compiles the code without errors because the hook types are valid in any
          module. The failure is a runtime error: &quot;You&apos;re importing a component that needs
          useState. It only works in a Client Component.&quot; ESLint with the Next.js plugin
          catches this; plain TypeScript does not.
        </li>
        <li>
          <strong>Over-using <code>any</code> in Server Actions</strong> — a Server Action typed
          with <code>any</code> for its state kills type safety on the client. The{" "}
          <code>useActionState</code> hook infers its state type from the action function — if the
          action returns <code>any</code>, the hook&apos;s state is <code>any</code>, and you lose
          all autocomplete and error checking in the form component.
        </li>
        <li>
          <strong>Using <code>as string</code> on query params</strong> — <code>context.query.id</code>{" "}
          in Pages Router is typed as <code>string | string[] | undefined</code>, not{" "}
          <code>string</code>. Casting with <code>as string</code> hides the fact that it could be
          an array (when the URL has <code>?id=1&id=2</code>) or undefined. Use a type guard or
          take the first element explicitly: <code>const id = [context.query.id].flat()[0]</code>.
        </li>
        <li>
          <strong>Calling <code>cookies()</code> or <code>headers()</code> outside async context</strong>{" "}
          — in Next.js 15, the dynamic functions <code>cookies()</code> and <code>headers()</code>{" "}
          are async and return Promises. TypeScript types them correctly, but if you are migrating
          from Next.js 14 the old synchronous call pattern compiles and fails at runtime.
        </li>
      </ul>

      <h2 id="ts-comparison-table">Type Utility Reference Table</h2>

      <ArticleTable
        caption="Complete reference: every type utility Next.js ships, which router it belongs to, what it types, and where to import it."
        minWidth={980}
      >
        <table>
          <thead>
            <tr>
              <th>Type Utility</th>
              <th>Router</th>
              <th>Purpose</th>
              <th>Import</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>GetServerSideProps{"<P, Params>"}</code></td>
              <td>Pages</td>
              <td>Type the <code>getServerSideProps</code> function</td>
              <td><code>"next"</code></td>
              <td>Pair with <code>InferGetServerSidePropsType</code></td>
            </tr>
            <tr>
              <td><code>InferGetServerSidePropsType</code></td>
              <td>Pages</td>
              <td>Derive component props from the function type</td>
              <td><code>"next"</code></td>
              <td>Pass <code>typeof getServerSideProps</code></td>
            </tr>
            <tr>
              <td><code>GetStaticProps{"<P, Params>"}</code></td>
              <td>Pages</td>
              <td>Type the <code>getStaticProps</code> function</td>
              <td><code>"next"</code></td>
              <td>Add <code>revalidate</code> for ISR</td>
            </tr>
            <tr>
              <td><code>GetStaticPaths{"<Params>"}</code></td>
              <td>Pages</td>
              <td>Type the <code>getStaticPaths</code> function</td>
              <td><code>"next"</code></td>
              <td><code>fallback</code> typed as <code>boolean | "blocking"</code></td>
            </tr>
            <tr>
              <td><code>InferGetStaticPropsType</code></td>
              <td>Pages</td>
              <td>Derive component props from <code>getStaticProps</code></td>
              <td><code>"next"</code></td>
              <td>Same pattern as GSSP version</td>
            </tr>
            <tr>
              <td><code>NextApiRequest</code></td>
              <td>Pages</td>
              <td>Type the <code>req</code> object in API routes</td>
              <td><code>"next"</code></td>
              <td><code>req.query</code> is <code>string | string[]</code></td>
            </tr>
            <tr>
              <td><code>NextApiResponse{"<Data>"}</code></td>
              <td>Pages</td>
              <td>Type the <code>res</code> object and constrain <code>res.json()</code></td>
              <td><code>"next"</code></td>
              <td>Generic enforces response body shape</td>
            </tr>
            <tr>
              <td><code>NextPage{"<Props>"}</code></td>
              <td>Pages</td>
              <td>Type a page component as a value</td>
              <td><code>"next"</code></td>
              <td>Useful for HOCs and typed exports</td>
            </tr>
            <tr>
              <td><code>NextRequest</code></td>
              <td>App</td>
              <td>Extended <code>Request</code> for Route Handlers and Middleware</td>
              <td><code>"next/server"</code></td>
              <td>Adds <code>.nextUrl</code>, <code>.cookies</code>, <code>.geo</code></td>
            </tr>
            <tr>
              <td><code>Metadata</code></td>
              <td>App</td>
              <td>Type the return value of <code>generateMetadata</code></td>
              <td><code>"next"</code></td>
              <td>Covers OpenGraph, Twitter, robots, etc.</td>
            </tr>
            <tr>
              <td><code>ResolvingMetadata</code></td>
              <td>App</td>
              <td>Type the <code>parent</code> arg in <code>generateMetadata</code></td>
              <td><code>"next"</code></td>
              <td>Resolves parent metadata for merging</td>
            </tr>
            <tr>
              <td><code>NextConfig</code></td>
              <td>Both</td>
              <td>Type the <code>next.config.ts</code> object</td>
              <td><code>"next"</code></td>
              <td>Use with <code>satisfies</code>, not <code>as</code></td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="interview-framing">Interview Framing</h2>

      <InterviewPlaybook
        title="How to answer: How do you type getServerSideProps and infer component props from it?"
        intro="Interviewers ask this to check if you understand the Infer* pattern. A weak answer defines Props twice. A strong answer explains why single-source-of-truth matters and demonstrates the actual API."
        steps={[
          "Start with the problem: many devs define a Props type separately and then annotate both the function and the component. These drift when you refactor.",
          "Explain the correct approach: annotate getServerSideProps with GetServerSideProps<Props> so TypeScript knows what the function returns. Then use InferGetServerSidePropsType<typeof getServerSideProps> on the component.",
          "Explain why it scales: InferGetServerSidePropsType derives the component's props from the function's return type. If you rename a field in the function, TypeScript will error in the component automatically — zero manual sync.",
          "Mention the generic for params: GetServerSideProps<Props, { id: string }> narrows context.params so you don't need to cast it inside the function body.",
          "Close with the App Router equivalent: the pattern doesn't apply in the same way because App Router pages are async Server Components and props come directly from the framework — but generateMetadata has its own Metadata and ResolvingMetadata types that solve the same problem for SEO.",
        ]}
      />

      <InterviewPlaybook
        title="What changed about Next.js TypeScript types in version 15?"
        intro="This is a common question for candidates interviewing at teams that have upgraded. The key is naming the specific breaking change and explaining the production implication, not just saying 'params is async now'."
        steps={[
          "Name the breaking change: params and searchParams in App Router page and layout components changed from plain objects to Promises. So { params }: { params: { slug: string } } breaks — the correct type is { params: Promise<{ slug: string }> }.",
          "Explain why Next.js made this change: it aligns with the async request APIs introduced in Next.js 15 (cookies(), headers(), draftMode() all became async too). This enables deferred rendering and streaming at the framework level.",
          "Point out the subtle TypeScript trap: the type error from forgetting await is non-obvious. params is typed correctly as a Promise, but if you write const { slug } = params without await, TypeScript may not error immediately — you get slug typed as Promise<{slug:string}> which is valid but wrong at runtime.",
          "Mention the codemods: Next.js ships a codemod (next-async-request-api) that automatically migrates files to the new async pattern. Running it before upgrading prevents most issues.",
          "Close with the config types: next.config.ts is also now fully supported (TypeScript config file), and NextConfig is the type. Use satisfies NextConfig instead of as NextConfig to preserve literal types and catch unknown fields.",
        ]}
      />

      <h2 id="interview-challenge">Interview Challenge</h2>

      <InterviewChallenge
        title="Add TypeScript Types to Five Untyped Next.js Files"
        scenario={
          <>
            You are onboarding onto a Next.js 15 codebase that was written quickly without TypeScript
            types. You have been handed five files — a Pages Router page, a Pages Router API route,
            an App Router page, an App Router route handler, and a server action — all typed with{" "}
            <code>any</code> or no types at all. Your job is to add correct, minimal TypeScript
            types to each file without changing any runtime behavior.
          </>
        }
        tasks={[
          "File 1 (Pages Router page): Add GetServerSideProps and InferGetServerSidePropsType. The function fetches a User by id from params.",
          "File 2 (Pages Router API route): Add NextApiRequest and NextApiResponse with a typed response body that is either { product: Product } or { error: string }.",
          "File 3 (App Router page): Add correct types for params (Promise) in Next.js 15. The page receives a slug param and renders a blog post.",
          "File 4 (App Router route handler): Add NextRequest and type the params argument correctly for Next.js 15. The handler is a DELETE route for /api/users/[id].",
          "File 5 (Server Action): Add a typed FormState, type the action function signature for useActionState, and explain what happens to useActionState's inferred type if the action returns any.",
        ]}
      />

      <SolutionReveal>
        <pre>
          <code>{`// File 1 — Pages Router page (getServerSideProps + Infer*)
import type { GetServerSideProps, InferGetServerSidePropsType } from "next";

type User = { id: string; name: string; email: string };
type Props = { user: User };

export const getServerSideProps: GetServerSideProps<
  Props,
  { id: string }
> = async ({ params }) => {
  const user = await fetchUser(params!.id);
  if (!user) return { notFound: true };
  return { props: { user } };
};

export default function UserPage({
  user,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return <h1>{user.name}</h1>;
}

// ─────────────────────────────────────────────────────────────

// File 2 — Pages Router API route (NextApiRequest + NextApiResponse)
import type { NextApiRequest, NextApiResponse } from "next";

type Product = { id: string; name: string; price: number };
type ResponseData = { product: Product } | { error: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  const id = req.query.id;
  if (typeof id !== "string") {
    return res.status(400).json({ error: "Invalid id" });
  }
  const product = await fetchProduct(id);
  if (!product) return res.status(404).json({ error: "Not found" });
  res.status(200).json({ product });
}

// ─────────────────────────────────────────────────────────────

// File 3 — App Router page (Next.js 15: params is a Promise)
type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params; // must await
  const post = await fetchPost(slug);
  return <article><h1>{post.title}</h1></article>;
}

// ─────────────────────────────────────────────────────────────

// File 4 — App Router route handler (NextRequest + Promise params)
import type { NextRequest } from "next/server";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params; // params is a Promise in Next.js 15
  await deleteUser(id);
  return new Response(null, { status: 204 });
}

// ─────────────────────────────────────────────────────────────

// File 5 — Server Action (typed FormState + useActionState)
"use server";

type FormState = {
  error?: string;
  success?: boolean;
};

// Signature required by useActionState: (prevState, formData) => Promise<State>
export async function updateProfileAction(
  prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const name = formData.get("name");
  if (typeof name !== "string") return { error: "Name required" };
  await updateProfile({ name });
  return { success: true };
}

// In the client component:
// const [state, action] = useActionState(updateProfileAction, {});
// state is typed as FormState — fully typed, no any.
//
// If the action returned any instead of Promise<FormState>,
// useActionState would infer state as any — killing all autocomplete
// and error checking in every component that consumes the action state.`}</code>
        </pre>
      </SolutionReveal>

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>
          <strong>Use <code>Infer*</code> utilities in the Pages Router</strong> — never define props
          twice. <code>InferGetServerSidePropsType</code> and <code>InferGetStaticPropsType</code>{" "}
          keep the component type in sync with the data fetching function automatically.
        </li>
        <li>
          <strong><code>params</code> is a Promise in Next.js 15</strong> — always type it as{" "}
          <code>{"Promise<{ slug: string }>"}</code> and <code>await</code> it before accessing
          fields. Forgetting the await produces a subtle type mismatch that can reach runtime.
        </li>
        <li>
          <strong>Use <code>satisfies NextConfig</code> in <code>next.config.ts</code></strong> — not{" "}
          <code>as NextConfig</code>. <code>satisfies</code> preserves literal types and catches
          unknown fields; <code>as</code> silently swallows both.
        </li>
        <li>
          <strong>Type Server Action state explicitly</strong> — the state type passed to{" "}
          <code>useActionState</code> is inferred from the action function. An action that returns{" "}
          <code>any</code> infects the entire form component with <code>any</code>, defeating
          TypeScript throughout the client.
        </li>
        <li>
          <strong>Enable <code>typedRoutes</code> in production apps</strong> — it converts every{" "}
          <code>{"<Link href>"}</code> and <code>router.push()</code> call into a compile-time check.
          The generated type file must be regenerated after adding routes, so restart dev server
          or run a build in CI before your type-check step.
        </li>
      </ul>
    </div>
  );
}
