import { ArticleTable, InterviewPlaybook } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

export const toc: TocItem[] = [
  { id: "auth-architecture", title: "Auth Architecture in Next.js", level: 2 },
  { id: "session-strategies", title: "Session Strategies: JWT vs Database Sessions", level: 2 },
  { id: "nextauth-pattern", title: "Auth.js / NextAuth Pattern", level: 2 },
  { id: "protecting-routes", title: "Protecting Routes", level: 2 },
  { id: "middleware-auth", title: "Middleware for Auth", level: 3 },
  { id: "server-component-auth", title: "Auth in Server Components", level: 3 },
  { id: "server-action-auth", title: "Auth in Server Actions", level: 3 },
  { id: "next-headers", title: "next/headers — cookies and headers", level: 2 },
  { id: "edge-constraints", title: "Edge Runtime Constraints for Auth", level: 2 },
  { id: "rbac-pattern", title: "Role-Based Access Control Pattern", level: 2 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
];

export default function AuthenticationAndMiddleware() {
  return (
    <div className="article-content">
      <p>
        Authentication in Next.js App Router has two dimensions: where you check auth (middleware,
        Server Components, Server Actions, Route Handlers) and which session strategy you use
        (JWT cookies vs database sessions). Senior interviews probe both — they want to know
        you understand edge runtime constraints and can defend your session strategy choice.
      </p>

      <h2 id="auth-architecture">Auth Architecture in Next.js</h2>
      <p>
        The key architectural decision: <strong>middleware validates auth tokens, Server Components
        and Server Actions validate authorization</strong>. Middleware runs at the edge and handles
        the "is this request allowed to proceed?" question. The actual data access layer enforces
        "is this user allowed to access this specific resource?"
      </p>

      <pre><code>{`// Auth flows in Next.js App Router:
//
// 1. MIDDLEWARE (Edge Runtime)
//    - Read JWT from cookie
//    - Verify signature (stateless — no DB call)
//    - Redirect to login if invalid
//    - Add user context to request headers
//
// 2. SERVER COMPONENT / ROUTE HANDLER
//    - Read session from next/headers
//    - Load full user from DB if needed (for roles, permissions)
//    - Render UI based on user's actual permissions
//
// 3. SERVER ACTION
//    - Verify session again (Server Actions are public endpoints)
//    - Check that user owns the resource they're mutating
//    - Perform the mutation
//
// Why verify in both middleware AND the component/action?
// Middleware only has the token — it doesn't know the user's current role in the DB.
// Server Components/Actions have DB access and enforce the real rules.`}</code></pre>

      <h2 id="session-strategies">Session Strategies: JWT vs Database Sessions</h2>
      <ArticleTable caption="Choose based on your scale, revocation requirements, and latency budget." minWidth={900}>
        <table>
          <thead>
            <tr>
              <th>Concern</th>
              <th>JWT (Stateless)</th>
              <th>Database Sessions (Stateful)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Middleware compatibility</td>
              <td>Yes — JWT verification is stateless, works at edge</td>
              <td>Requires DB query — NOT edge-compatible without HTTP-based DB</td>
            </tr>
            <tr>
              <td>Instant revocation</td>
              <td>No — JWT is valid until it expires</td>
              <td>Yes — delete the session row</td>
            </tr>
            <tr>
              <td>Token size</td>
              <td>Large — carries all claims</td>
              <td>Small — just a session ID</td>
            </tr>
            <tr>
              <td>DB hit per request</td>
              <td>No (unless you need fresh user data)</td>
              <td>Yes — every request looks up the session</td>
            </tr>
            <tr>
              <td>Stale data risk</td>
              <td>Higher — token carries stale role/permission claims</td>
              <td>Lower — DB always has current state</td>
            </tr>
            <tr>
              <td>Best for</td>
              <td>Stateless APIs, multi-region, edge middleware</td>
              <td>Admin tools, fintech, when instant revocation is required</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="nextauth-pattern">Auth.js / NextAuth Pattern</h2>
      <p>
        Auth.js (formerly NextAuth) is the most common auth library for Next.js. It supports both
        session strategies and integrates with the App Router via a shared <code>auth()</code>
        function.
      </p>

      <pre><code>{`// src/lib/auth.ts — Auth.js v5 configuration (Next.js App Router)
import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import Credentials from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

export const { auth, signIn, signOut, handlers } = NextAuth({
  providers: [
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await db.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user || !user.passwordHash) return null;

        const valid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        );

        return valid ? { id: user.id, email: user.email, role: user.role } : null;
      },
    }),
  ],

  // Use JWT strategy (default) for edge middleware compatibility
  session: { strategy: "jwt" },

  callbacks: {
    // Add custom fields to the JWT token
    jwt({ token, user }) {
      if (user) token.role = (user as any).role;
      return token;
    },
    // Expose JWT fields in the session object
    session({ session, token }) {
      if (session.user) session.user.role = token.role as string;
      return session;
    },
  },

  pages: {
    signIn: "/login",      // custom login page
    error: "/auth/error",  // custom error page
  },
});

// src/app/api/auth/[...nextauth]/route.ts — expose the auth handlers
import { handlers } from "@/lib/auth";
export const { GET, POST } = handlers;`}</code></pre>

      <h2 id="protecting-routes">Protecting Routes</h2>
      <p>
        Routes should be protected at two levels: broadly in middleware (redirect unauthenticated
        users), and specifically in Server Components and Server Actions (enforce fine-grained
        authorization).
      </p>

      <h3 id="middleware-auth">Middleware for Auth</h3>

      <pre><code>{`// middleware.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth"; // Auth.js v5 exports auth() for middleware

export default auth((request) => {
  const { auth: session, nextUrl } = request;
  const isLoggedIn = !!session;
  const isOnDashboard = nextUrl.pathname.startsWith("/dashboard");

  if (isOnDashboard && !isLoggedIn) {
    const loginUrl = new URL("/login", nextUrl);
    loginUrl.searchParams.set("callbackUrl", nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect logged-in users away from auth pages
  if (isLoggedIn && nextUrl.pathname.startsWith("/login")) {
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};

// For manual JWT verification (without Auth.js):
import { jwtVerify } from "jose";

export async function middleware(request: NextRequest) {
  const token = request.cookies.get("access-token")?.value;

  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);

    // Pass user ID to downstream Server Components via header
    const response = NextResponse.next();
    response.headers.set("x-user-id", payload.sub ?? "");
    response.headers.set("x-user-role", (payload as any).role ?? "");
    return response;
  } catch {
    return NextResponse.redirect(new URL("/login", request.url));
  }
}`}</code></pre>

      <h3 id="server-component-auth">Auth in Server Components</h3>

      <pre><code>{`// src/app/dashboard/page.tsx — Server Component protected at component level
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await auth(); // reads the session from cookies

  if (!session) {
    redirect("/login"); // belt-and-suspenders: also protected by middleware
  }

  // session.user is now typed and available
  const user = session.user;
  const data = await db.report.findMany({ where: { userId: user.id } });

  return (
    <div>
      <h1>Welcome, {user.name}</h1>
      <ReportList reports={data} />
    </div>
  );
}

// Helper for DRY session access — reuse across Server Components
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export async function requireAuth() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return session.user;
}

// Usage:
export default async function ProtectedPage() {
  const user = await requireAuth();
  // ...
}`}</code></pre>

      <h3 id="server-action-auth">Auth in Server Actions</h3>

      <pre><code>{`// ALWAYS verify auth in Server Actions — they are public POST endpoints
"use server";
import { auth } from "@/lib/auth";

export async function deletePost(postId: string) {
  const session = await auth();

  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  // Check resource ownership — do not trust the client for this
  const post = await db.post.findUnique({
    where: { id: postId },
    select: { authorId: true },
  });

  if (!post) throw new Error("Not found");
  if (post.authorId !== session.user.id) throw new Error("Forbidden");

  await db.post.delete({ where: { id: postId } });
  revalidatePath("/posts");
}

// Pattern: helper function for authorized DB queries
async function getAuthorizedPost(postId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const post = await db.post.findFirst({
    where: {
      id: postId,
      authorId: session.user.id, // DB-level ownership check
    },
  });

  if (!post) throw new Error("Not found or forbidden");
  return post;
}`}</code></pre>

      <h2 id="next-headers">next/headers — cookies and headers</h2>
      <p>
        Access request cookies and headers from any Server Component, Server Action, or Route
        Handler using <code>next/headers</code>.
      </p>

      <pre><code>{`// In Next.js 15, both cookies() and headers() return Promises
import { cookies, headers } from "next/headers";

// Server Component
export default async function Page() {
  const cookieStore = await cookies();
  const headerStore = await headers();

  const theme = cookieStore.get("theme")?.value ?? "dark";
  const userAgent = headerStore.get("user-agent") ?? "";

  return <div data-theme={theme}>{/* ... */}</div>;
}

// Server Action
"use server";
export async function setTheme(theme: string) {
  const cookieStore = await cookies();
  cookieStore.set("theme", theme, {
    httpOnly: false, // theme can be read by JS
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365, // 1 year
  });
}

// Reading cookies in a Route Handler
import { NextRequest } from "next/server";
export async function GET(request: NextRequest) {
  // Route Handlers can read cookies from the request directly:
  const sessionCookie = request.cookies.get("session")?.value;
  // Or from next/headers (same thing, different API style):
  const cookieStore = await cookies();
  const session = cookieStore.get("session")?.value;
}`}</code></pre>

      <h2 id="edge-constraints">Edge Runtime Constraints for Auth</h2>
      <p>
        Middleware runs on the Edge Runtime. This means:
      </p>
      <ul>
        <li>
          <strong>JWT verification is fine at the edge</strong> — use the{" "}
          <code>jose</code> library (edge-compatible).
        </li>
        <li>
          <strong>Database queries are NOT possible at the edge</strong> — TCP connections
          (Prisma, pg, MySQL2) do not work. If you need DB access, use an HTTP-based
          database driver (PlanetScale serverless, Supabase REST, Drizzle with libSQL HTTP).
        </li>
        <li>
          <strong>Node.js crypto module is unavailable</strong> — use Web Crypto API
          (<code>crypto.subtle</code>) instead.
        </li>
        <li>
          <strong>bcrypt is too slow at the edge</strong> — password hashing should happen
          in a Route Handler (Node.js runtime), not in middleware.
        </li>
      </ul>

      <pre><code>{`// ✓ Edge-compatible JWT verification:
import { jwtVerify, SignJWT } from "jose"; // edge-compatible

const secret = new TextEncoder().encode(process.env.JWT_SECRET);

// Verify
const { payload } = await jwtVerify(token, secret);

// Sign (in a Route Handler or Server Action — not in middleware)
const token = await new SignJWT({ sub: userId, role: user.role })
  .setProtectedHeader({ alg: "HS256" })
  .setIssuedAt()
  .setExpirationTime("24h")
  .sign(secret);

// ✗ NOT edge-compatible:
import bcrypt from "bcrypt";           // uses native Node.js modules
import { PrismaClient } from "@prisma/client"; // requires TCP connection`}</code></pre>

      <h2 id="rbac-pattern">Role-Based Access Control Pattern</h2>

      <pre><code>{`// src/lib/permissions.ts
export type Role = "user" | "moderator" | "admin";

const roleHierarchy: Record<Role, number> = {
  user: 0,
  moderator: 1,
  admin: 2,
};

export function hasRole(userRole: Role, requiredRole: Role): boolean {
  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}

// Middleware: only check if user is authenticated, not their specific role
// Role checks happen in Server Components where you have full context

// Server Component using RBAC
import { auth } from "@/lib/auth";
import { hasRole } from "@/lib/permissions";
import { redirect, notFound } from "next/navigation";

export default async function AdminPanel() {
  const session = await auth();
  const user = session?.user;

  if (!user) redirect("/login");

  // Role check in the Server Component — NOT in middleware
  if (!hasRole(user.role as Role, "admin")) {
    notFound(); // or redirect("/forbidden")
  }

  return <div>Admin panel content</div>;
}

// Type augmentation for Auth.js session (TypeScript)
// src/types/next-auth.d.ts
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
    } & DefaultSession["user"];
  }
}`}</code></pre>

      <h2 id="interview-framing">Interview Framing</h2>
      <InterviewPlaybook
        title="How to answer auth questions in a Next.js senior interview"
        intro="Auth questions in Next.js interviews usually dig into three areas: where auth lives, session strategy tradeoffs, and edge runtime constraints. Have crisp answers for all three."
        steps={[
          "Explain the layered approach: Middleware validates tokens at the edge (fast, no DB). Server Components and Server Actions verify the full session and check resource ownership (has DB access). Both layers matter — middleware alone is insufficient for row-level security.",
          "Defend your session strategy: JWT cookies are stateless and edge-compatible but cannot be instantly revoked. Database sessions can be revoked instantly but require a DB query on every request. Choose based on the revocation requirement and whether you need edge middleware.",
          "Explain the edge constraint clearly: Middleware runs on the Edge Runtime (not Node.js). This means no Prisma, no pg, no native modules. JWT verification with jose is fine. If you need DB access in middleware, use an HTTP-based database driver.",
          "Cover the security rules: Server Actions are public POST endpoints — they are not protected by middleware. Every action must independently verify the session and check resource ownership. Never trust the client's claim about which resource they're modifying.",
          "Know the next/headers API: cookies() and headers() are Promises in Next.js 15. They work in Server Components, Server Actions, and Route Handlers. They opt the component into dynamic rendering.",
        ]}
      />
    </div>
  );
}
