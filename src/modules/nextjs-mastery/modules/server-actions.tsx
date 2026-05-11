import { ArticleTable, InterviewPlaybook } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

export const toc: TocItem[] = [
  { id: "what-are-server-actions", title: "What Server Actions Are", level: 2 },
  { id: "defining-server-actions", title: "Defining Server Actions", level: 2 },
  { id: "form-actions", title: "Form Actions and Progressive Enhancement", level: 2 },
  { id: "use-action-state", title: "useActionState (formerly useFormState)", level: 2 },
  { id: "use-form-status", title: "useFormStatus", level: 3 },
  { id: "optimistic-updates", title: "Optimistic Updates with useOptimistic", level: 2 },
  { id: "revalidation", title: "Revalidation After Mutation", level: 2 },
  { id: "security", title: "Security Considerations", level: 2 },
  { id: "actions-vs-route-handlers", title: "Server Actions vs Route Handlers", level: 2 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
];

export default function ServerActions() {
  return (
    <div className="article-content">
      <p>
        Server Actions are async functions that run on the server, called directly from
        Client Components or form elements. They eliminate the need for a separate API layer for
        mutations — you call a function, the server runs it, and Next.js handles the HTTP transport
        transparently. They integrate natively with React's form system and enable progressive
        enhancement by default.
      </p>

      <h2 id="what-are-server-actions">What Server Actions Are</h2>
      <p>
        Before Server Actions, the mutation pattern in Next.js was: Client Component calls{" "}
        <code>fetch("/api/endpoint", {"{"} method: "POST" {"}"})</code>, the Route Handler processes it,
        and the client re-fetches or updates state. Server Actions collapse this into a direct
        function call.
      </p>

      <pre><code>{`// BEFORE Server Actions (traditional pattern):
// Client Component
async function handleSubmit(data: FormData) {
  const response = await fetch("/api/create-post", {
    method: "POST",
    body: JSON.stringify(Object.fromEntries(data)),
  });
  const post = await response.json();
  // manually update state or navigate
}

// AFTER Server Actions:
// Server Action — runs on the server, called like a regular function
"use server";
export async function createPost(data: FormData) {
  const title = data.get("title") as string;
  const post = await db.post.create({ data: { title } });
  revalidatePath("/posts");
}

// Client Component
<form action={createPost}>
  <input name="title" />
  <button type="submit">Create</button>
</form>
// The form posts to the server, createPost runs, and the page revalidates.
// No fetch(), no state management for the response.`}</code></pre>

      <h2 id="defining-server-actions">Defining Server Actions</h2>
      <p>
        Server Actions are defined with the <code>"use server"</code> directive. This can be
        placed at the top of the function body (inline) or at the top of a file (marks all
        exports as Server Actions).
      </p>

      <pre><code>{`// Pattern 1: File-level "use server" — all exports are Server Actions
// src/lib/actions/posts.ts
"use server";

import { db } from "@/lib/db";
import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";

export async function createPost(formData: FormData) {
  const title = formData.get("title") as string;
  const content = formData.get("content") as string;

  if (!title || title.length < 3) {
    // Return errors — do not throw (throws render an error boundary)
    return { error: "Title must be at least 3 characters" };
  }

  const post = await db.post.create({
    data: { title, content },
  });

  revalidateTag("posts");        // invalidate Data Cache
  redirect(\`/posts/\${post.id}\`); // redirect after creation (throws internally — wrap in try/catch if needed)
}

export async function deletePost(id: string) {
  await db.post.delete({ where: { id } });
  revalidatePath("/posts");
}

// Pattern 2: Inline "use server" — useful for one-off actions in Server Components
export default function Page() {
  async function handleSubmit(formData: FormData) {
    "use server"; // marks only this function as a Server Action
    const name = formData.get("name") as string;
    await db.user.update({ where: { id: "current" }, data: { name } });
    revalidatePath("/profile");
  }

  return (
    <form action={handleSubmit}>
      <input name="name" />
      <button type="submit">Save</button>
    </form>
  );
}`}</code></pre>

      <h2 id="form-actions">Form Actions and Progressive Enhancement</h2>
      <p>
        When you pass a Server Action to a <code>&lt;form action&gt;</code>, Next.js enables
        <strong> progressive enhancement</strong> — the form works even with JavaScript disabled,
        because the action is serialized as a POST request to the server. When JavaScript loads,
        React takes over and the transition is smooth.
      </p>

      <pre><code>{`// Basic form action — works with and without JS
export default function ContactForm() {
  return (
    <form action={submitContact}>
      <input name="email" type="email" required />
      <textarea name="message" required />
      <button type="submit">Send</button>
    </form>
  );
}

// Calling Server Actions from event handlers (not form actions)
// This does NOT have progressive enhancement — requires JS
"use client";
import { likePost } from "@/lib/actions/posts";

export function LikeButton({ postId }: { postId: string }) {
  return (
    <button
      onClick={async () => {
        await likePost(postId); // Server Action called as a regular async function
      }}
    >
      Like
    </button>
  );
}

// Binding arguments to a Server Action (partial application)
// Useful for passing data not available in the form itself
import { deletePost } from "@/lib/actions/posts";

export function PostCard({ post }: { post: Post }) {
  const deletePostWithId = deletePost.bind(null, post.id);
  return (
    <form action={deletePostWithId}>
      <button type="submit">Delete</button>
    </form>
  );
}`}</code></pre>

      <h2 id="use-action-state">useActionState (formerly useFormState)</h2>
      <p>
        <code>useActionState</code> (renamed from <code>useFormState</code> in React 19) manages
        the state returned by a Server Action. It returns the current state and a bound action
        that you pass to a form. Use it to display validation errors and form feedback.
      </p>

      <pre><code>{`// The Server Action must return state (not just undefined)
"use server";

type FormState = {
  error?: string;
  success?: boolean;
};

export async function createPost(
  prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const title = formData.get("title") as string;

  if (!title || title.length < 3) {
    return { error: "Title must be at least 3 characters" };
  }

  try {
    await db.post.create({ data: { title } });
    revalidateTag("posts");
    return { success: true };
  } catch {
    return { error: "Failed to create post" };
  }
}

// Client Component using useActionState
"use client";
import { useActionState } from "react"; // React 19 — renamed from useFormState
import { createPost } from "@/lib/actions/posts";

export function CreatePostForm() {
  const [state, formAction] = useActionState(createPost, {});

  return (
    <form action={formAction}>
      <input name="title" />
      {state.error && <p className="text-red-500">{state.error}</p>}
      {state.success && <p className="text-green-500">Post created!</p>}
      <button type="submit">Create</button>
    </form>
  );
}

// Note: In Next.js 14 with React 18, use useFormState from react-dom instead:
// import { useFormState } from "react-dom";
// In Next.js 15 with React 19, use useActionState from react:`}</code></pre>

      <h3 id="use-form-status">useFormStatus</h3>
      <p>
        <code>useFormStatus</code> gives child components access to the submission state of
        the form they are inside. It must be used in a component rendered inside a{" "}
        <code>&lt;form&gt;</code>.
      </p>

      <pre><code>{`"use client";
import { useFormStatus } from "react-dom";

// Separate component — must be a child of the form
function SubmitButton() {
  const { pending } = useFormStatus(); // pending is true while the Server Action is running

  return (
    <button type="submit" disabled={pending}>
      {pending ? "Saving..." : "Save"}
    </button>
  );
}

// Usage:
export function PostForm() {
  return (
    <form action={createPost}>
      <input name="title" />
      <SubmitButton /> {/* useFormStatus reads the parent form's pending state */}
    </form>
  );
}

// ❌ This won't work — useFormStatus must be inside the form, not at the form level:
function WrongPostForm() {
  const { pending } = useFormStatus(); // ← this form doesn't know about its own pending state
  return (
    <form action={createPost}>
      <button disabled={pending}>Save</button>
    </form>
  );
}`}</code></pre>

      <h2 id="optimistic-updates">Optimistic Updates with useOptimistic</h2>
      <p>
        <code>useOptimistic</code> shows an optimistic (assumed successful) state immediately
        while the Server Action is running in the background. If the action fails, the state
        reverts automatically.
      </p>

      <pre><code>{`"use client";
import { useOptimistic, useTransition } from "react";
import { toggleLike } from "@/lib/actions/posts";

export function LikeButton({
  postId,
  initialLiked,
  initialCount,
}: {
  postId: string;
  initialLiked: boolean;
  initialCount: number;
}) {
  const [optimisticLiked, setOptimisticLiked] = useOptimistic(
    initialLiked,
    // Reducer: given current state and the "optimistic update" value, return new optimistic state
    (_current, newLiked: boolean) => newLiked
  );

  const [optimisticCount, setOptimisticCount] = useOptimistic(
    initialCount,
    (_current, delta: number) => _current + delta
  );

  const [isPending, startTransition] = useTransition();

  const handleLike = () => {
    startTransition(async () => {
      // Apply optimistic update immediately
      setOptimisticLiked(!optimisticLiked);
      setOptimisticCount(optimisticLiked ? -1 : 1);

      // Run the actual Server Action
      await toggleLike(postId);
      // If this fails, optimistic state automatically reverts to the original values
    });
  };

  return (
    <button onClick={handleLike} disabled={isPending}>
      {optimisticLiked ? "Unlike" : "Like"} ({optimisticCount})
    </button>
  );
}`}</code></pre>

      <h2 id="revalidation">Revalidation After Mutation</h2>
      <p>
        Server Actions should revalidate the affected parts of the cache after a mutation.
        Choose the right revalidation scope to avoid invalidating more than necessary.
      </p>

      <pre><code>{`"use server";
import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";

// Narrow revalidation: only revalidate the specific post page
export async function updatePost(id: string, data: PostUpdate) {
  await db.post.update({ where: { id }, data });
  revalidatePath(\`/posts/\${id}\`);   // just this post's page
}

// Broad revalidation: invalidate the entire posts listing
export async function deletePost(id: string) {
  await db.post.delete({ where: { id } });
  revalidatePath("/posts");          // the posts list page
  revalidatePath(\`/posts/\${id}\`);   // the deleted post's page (will 404 now)
}

// Tag-based: most flexible, works with non-page data
export async function publishPost(id: string) {
  await db.post.update({ where: { id }, data: { published: true } });
  revalidateTag(\`post-\${id}\`);     // invalidates any fetch tagged with this post's id
  revalidateTag("published-posts"); // invalidates any listing of published posts
}

// Redirect after creation (must be outside try/catch if you use try/catch):
export async function createAndRedirect(formData: FormData) {
  const title = formData.get("title") as string;
  const post = await db.post.create({ data: { title } });
  revalidateTag("posts");
  redirect(\`/posts/\${post.id}\`); // redirect() throws internally, so it cannot be caught
}`}</code></pre>

      <h2 id="security">Security Considerations</h2>
      <p>
        Server Actions are POST endpoints automatically. Next.js adds CSRF protection by
        validating the <code>Origin</code> header, but you still need to handle authorization.
      </p>

      <pre><code>{`"use server";
import { getServerSession } from "@/lib/auth";

// ✓ Always check authorization in Server Actions
export async function deletePost(id: string) {
  const session = await getServerSession();

  if (!session) {
    throw new Error("Unauthorized"); // or return { error: "Unauthorized" }
  }

  // Check that the user owns the resource
  const post = await db.post.findUnique({ where: { id } });
  if (post?.authorId !== session.user.id) {
    throw new Error("Forbidden");
  }

  await db.post.delete({ where: { id } });
  revalidatePath("/posts");
}

// ✓ Validate and sanitize inputs — Server Actions receive FormData or typed arguments
// Do not trust that inputs are correctly typed at runtime
export async function updateProfile(formData: FormData) {
  const session = await getServerSession();
  if (!session) throw new Error("Unauthorized");

  const name = formData.get("name");
  if (typeof name !== "string" || name.length === 0 || name.length > 100) {
    return { error: "Invalid name" };
  }

  await db.user.update({
    where: { id: session.user.id },
    data: { name: name.trim() },
  });
}

// ❌ Server Actions are not route-level protected — middleware protects pages,
// not individual Server Actions. Always perform your own auth checks inside the action.`}</code></pre>

      <h2 id="actions-vs-route-handlers">Server Actions vs Route Handlers</h2>
      <ArticleTable caption="When to use each — they solve different problems." minWidth={900}>
        <table>
          <thead>
            <tr>
              <th>Concern</th>
              <th>Server Actions</th>
              <th>Route Handlers</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Primary use case</td>
              <td>Form mutations and data changes from React components</td>
              <td>External API consumers, webhooks, public HTTP endpoints</td>
            </tr>
            <tr>
              <td>Progressive enhancement</td>
              <td>Yes — works without JavaScript</td>
              <td>No — requires JS to call fetch()</td>
            </tr>
            <tr>
              <td>Integration with React</td>
              <td>Native — useActionState, useFormStatus, useOptimistic</td>
              <td>Manual — wrap in fetch(), manage loading state yourself</td>
            </tr>
            <tr>
              <td>Revalidation</td>
              <td>Built-in — call revalidatePath/revalidateTag directly</td>
              <td>Manual — must trigger revalidation from the client</td>
            </tr>
            <tr>
              <td>Cache control (response headers)</td>
              <td>Limited</td>
              <td>Full control — set Cache-Control, ETags, etc.</td>
            </tr>
            <tr>
              <td>Third-party access</td>
              <td>Not designed for it — POST to a specific internal endpoint</td>
              <td>Yes — designed as a public API surface</td>
            </tr>
            <tr>
              <td>File downloads, streaming</td>
              <td>No</td>
              <td>Yes</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="interview-framing">Interview Framing</h2>
      <InterviewPlaybook
        title="How to answer 'what are Server Actions and when do you use them?'"
        intro="Strong candidates explain Server Actions in terms of the problem they solve (eliminating the API layer for mutations) and know when NOT to use them."
        steps={[
          "Define them clearly: Server Actions are async functions marked with 'use server' that run on the server and can be called directly from Client Components or form elements. Next.js handles the HTTP POST transport transparently.",
          "Explain the progressive enhancement benefit: when passed to a form's action prop, the form works without JavaScript. The server receives the FormData and runs the action. React hydration then enhances it to a smooth SPA experience.",
          "Name the React integration hooks: useActionState manages the state returned by the action (for showing errors). useFormStatus gives pending state to child submit buttons. useOptimistic shows immediate feedback before the server responds.",
          "State the security rule clearly: Server Actions must implement their own authorization. Middleware protects pages, not individual actions. Every Server Action should verify the session and check resource ownership before mutating data.",
          "Know when to use Route Handlers instead: external webhooks, third-party API consumers, file downloads, streaming responses, or when you need full control over HTTP semantics (headers, status codes, content-type).",
        ]}
      />
    </div>
  );
}
