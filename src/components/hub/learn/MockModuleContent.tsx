export type { TocItem } from "@/lib/types/academy";
import type { TocItem } from "@/lib/types/academy";

export const MOCK_TOC: TocItem[] = [
  { id: "what-is-graphql", title: "What is GraphQL?", level: 2 },
  { id: "why-not-rest", title: "Why not just REST?", level: 2 },
  { id: "core-concepts", title: "Core Concepts", level: 2 },
  { id: "type-system", title: "Type System", level: 3 },
  { id: "queries-and-mutations", title: "Queries & Mutations", level: 3 },
  { id: "resolvers", title: "Resolvers", level: 3 },
  { id: "your-first-schema", title: "Your First Schema", level: 2 },
  { id: "summary", title: "Summary", level: 2 },
];

export default function MockModuleContent() {
  return (
    <div className="article-content">
      <p>
        GraphQL is a query language for your API, and a server-side runtime for
        executing those queries using a type system you define for your data. It
        was developed internally by Meta in 2012 and open-sourced in 2015.
      </p>

      <h2 id="what-is-graphql">What is GraphQL?</h2>

      <p>
        At its core, GraphQL gives clients the ability to <strong>ask for exactly what
        they need</strong> — nothing more, nothing less. Unlike REST where the server
        determines the shape of the response, in GraphQL the client is in control.
      </p>

      <blockquote>
        <p>
          &ldquo;GraphQL is a query language for APIs and a runtime for fulfilling
          those queries with your existing data.&rdquo; — graphql.org
        </p>
      </blockquote>

      <p>
        A GraphQL service is created by defining <strong>types</strong> and
        <strong> fields</strong> on those types, then providing <strong>resolver
        functions</strong> for each field. Once running, you send GraphQL queries and
        the server returns exactly the fields you requested.
      </p>

      <h2 id="why-not-rest">Why not just REST?</h2>

      <p>
        REST APIs have served the web well for decades, but they come with
        real friction at scale:
      </p>

      <ul>
        <li>
          <strong>Over-fetching</strong> — <code>GET /users/42</code> returns a full
          user object even when you only need the <code>name</code>.
        </li>
        <li>
          <strong>Under-fetching</strong> — displaying a user&apos;s posts requires
          <code> GET /users/42</code>, then <code>GET /users/42/posts</code>, then
          possibly <code>GET /posts/7/comments</code>. Multiple round trips.
        </li>
        <li>
          <strong>Versioning</strong> — adding a field to an endpoint risks breaking
          clients that don&apos;t expect it. REST APIs accumulate <code>/v1</code>,{" "}
          <code>/v2</code>, <code>/v3</code> over time.
        </li>
      </ul>

      <p>
        GraphQL solves all three. You request exactly the fields you need, in one
        round trip, and the schema evolves without versioning.
      </p>

      <h2 id="core-concepts">Core Concepts</h2>

      <h3 id="type-system">Type System</h3>

      <p>
        Every GraphQL API is defined by a <strong>schema</strong> — a strongly typed
        contract between the client and the server. Types are the foundation:
      </p>

      <pre>
        <code>
          <span className="tok-keyword">type</span>{" "}
          <span className="tok-type">User</span>{" "}
          <span className="tok-punct">{"{"}</span>
          {"\n  "}
          <span className="tok-prop">id</span>
          <span className="tok-punct">:</span>{" "}
          <span className="tok-type">ID</span>
          <span className="tok-punct">!</span>
          {"\n  "}
          <span className="tok-prop">name</span>
          <span className="tok-punct">:</span>{" "}
          <span className="tok-type">String</span>
          <span className="tok-punct">!</span>
          {"\n  "}
          <span className="tok-prop">email</span>
          <span className="tok-punct">:</span>{" "}
          <span className="tok-type">String</span>
          <span className="tok-punct">!</span>
          {"\n  "}
          <span className="tok-prop">posts</span>
          <span className="tok-punct">:</span>{" "}
          <span className="tok-punct">[</span>
          <span className="tok-type">Post</span>
          <span className="tok-punct">!]!</span>
          {"\n"}
          <span className="tok-punct">{"}"}</span>
          {"\n\n"}
          <span className="tok-keyword">type</span>{" "}
          <span className="tok-type">Post</span>{" "}
          <span className="tok-punct">{"{"}</span>
          {"\n  "}
          <span className="tok-prop">id</span>
          <span className="tok-punct">:</span>{" "}
          <span className="tok-type">ID</span>
          <span className="tok-punct">!</span>
          {"\n  "}
          <span className="tok-prop">title</span>
          <span className="tok-punct">:</span>{" "}
          <span className="tok-type">String</span>
          <span className="tok-punct">!</span>
          {"\n  "}
          <span className="tok-prop">author</span>
          <span className="tok-punct">:</span>{" "}
          <span className="tok-type">User</span>
          <span className="tok-punct">!</span>
          {"\n"}
          <span className="tok-punct">{"}"}</span>
        </code>
      </pre>

      <p>
        The <code>!</code> suffix means the field is <strong>non-nullable</strong> — the
        server guarantees it will never return <code>null</code>. Square brackets
        denote <strong>list</strong> types.
      </p>

      <h3 id="queries-and-mutations">Queries & Mutations</h3>

      <p>
        There are two root operation types you&apos;ll use constantly:
      </p>

      <ul>
        <li>
          <strong>Query</strong> — read data (analogous to HTTP GET)
        </li>
        <li>
          <strong>Mutation</strong> — write data (analogous to POST / PUT / DELETE)
        </li>
      </ul>

      <p>
        Here&apos;s a query that fetches a user with only the fields we need, plus
        their post titles — in a single request:
      </p>

      <pre>
        <code>
          <span className="tok-keyword">query</span>{" "}
          <span className="tok-fn">GetUserWithPosts</span>
          <span className="tok-punct">(</span>
          <span className="tok-prop">$id</span>
          <span className="tok-punct">:</span>{" "}
          <span className="tok-type">ID</span>
          <span className="tok-punct">!) {"{"}</span>
          {"\n  "}
          <span className="tok-fn">user</span>
          <span className="tok-punct">(</span>
          <span className="tok-prop">id</span>
          <span className="tok-punct">:</span>{" "}
          <span className="tok-prop">$id</span>
          <span className="tok-punct">) {"{"}</span>
          {"\n    "}
          <span className="tok-prop">name</span>
          {"\n    "}
          <span className="tok-prop">email</span>
          {"\n    "}
          <span className="tok-prop">posts</span>
          <span className="tok-punct">{" {"}</span>
          {"\n      "}
          <span className="tok-prop">id</span>
          {"\n      "}
          <span className="tok-prop">title</span>
          {"\n    "}
          <span className="tok-punct">{"}"}</span>
          {"\n  "}
          <span className="tok-punct">{"}"}</span>
          {"\n"}
          <span className="tok-punct">{"}"}</span>
        </code>
      </pre>

      <p>
        The server responds with a JSON object whose shape <strong>exactly mirrors</strong>{" "}
        the query. No more, no less.
      </p>

      <h3 id="resolvers">Resolvers</h3>

      <p>
        A <strong>resolver</strong> is a function that returns data for a specific field
        in your schema. Every field in a GraphQL schema is backed by a resolver.
      </p>

      <pre>
        <code>
          <span className="tok-keyword">const</span>{" "}
          <span className="tok-prop">resolvers</span>
          <span className="tok-op"> = </span>
          <span className="tok-punct">{"{"}</span>
          {"\n  "}
          <span className="tok-type">Query</span>
          <span className="tok-punct">: {"{"}</span>
          {"\n    "}
          <span className="tok-fn">user</span>
          <span className="tok-punct">: (</span>
          <span className="tok-prop">_parent</span>
          <span className="tok-punct">,</span>{" "}
          <span className="tok-punct">{"{ "}</span>
          <span className="tok-prop">id</span>
          <span className="tok-punct">{" }"}</span>
          <span className="tok-punct">,</span>{" "}
          <span className="tok-prop">ctx</span>
          <span className="tok-punct">)</span>
          <span className="tok-op"> =&gt; </span>
          {"\n      "}
          <span className="tok-prop">ctx</span>
          <span className="tok-punct">.</span>
          <span className="tok-prop">db</span>
          <span className="tok-punct">.</span>
          <span className="tok-fn">findUserById</span>
          <span className="tok-punct">(</span>
          <span className="tok-prop">id</span>
          <span className="tok-punct">),</span>
          {"\n  "}
          <span className="tok-punct">{"}"}</span>
          <span className="tok-punct">,</span>
          {"\n  "}
          <span className="tok-type">User</span>
          <span className="tok-punct">: {"{"}</span>
          {"\n    "}
          <span className="tok-fn">posts</span>
          <span className="tok-punct">: (</span>
          <span className="tok-prop">parent</span>
          <span className="tok-punct">,</span>{" "}
          <span className="tok-prop">_args</span>
          <span className="tok-punct">,</span>{" "}
          <span className="tok-prop">ctx</span>
          <span className="tok-punct">)</span>
          <span className="tok-op"> =&gt; </span>
          {"\n      "}
          <span className="tok-prop">ctx</span>
          <span className="tok-punct">.</span>
          <span className="tok-prop">db</span>
          <span className="tok-punct">.</span>
          <span className="tok-fn">findPostsByUserId</span>
          <span className="tok-punct">(</span>
          <span className="tok-prop">parent</span>
          <span className="tok-punct">.</span>
          <span className="tok-prop">id</span>
          <span className="tok-punct">),</span>
          {"\n  "}
          <span className="tok-punct">{"}"},</span>
          {"\n"}
          <span className="tok-punct">{"}"}</span>
          <span className="tok-punct">;</span>
        </code>
      </pre>

      <h2 id="your-first-schema">Your First Schema</h2>

      <p>
        Putting it all together, here&apos;s the minimal schema and server setup
        you&apos;d write to expose a <code>hello</code> query:
      </p>

      <pre>
        <code>
          <span className="tok-keyword">import</span>
          <span className="tok-punct">{" { "}</span>
          <span className="tok-prop">ApolloServer</span>
          <span className="tok-punct">{" } "}</span>
          <span className="tok-keyword">from</span>{" "}
          <span className="tok-string">&apos;@apollo/server&apos;</span>
          <span className="tok-punct">;</span>
          {"\n\n"}
          <span className="tok-keyword">const</span>{" "}
          <span className="tok-prop">typeDefs</span>
          <span className="tok-op"> = </span>
          <span className="tok-string">{"`"}</span>
          {"\n  "}
          <span className="tok-string">
            type Query {"{"} hello: String {"}"}{"\n"}
          </span>
          <span className="tok-string">{"`"}</span>
          <span className="tok-punct">;</span>
          {"\n\n"}
          <span className="tok-keyword">const</span>{" "}
          <span className="tok-prop">resolvers</span>
          <span className="tok-op"> = </span>
          <span className="tok-punct">{"{"}</span>
          {"\n  "}
          <span className="tok-type">Query</span>
          <span className="tok-punct">{": { "}</span>
          <span className="tok-fn">hello</span>
          <span className="tok-punct">: () =&gt; </span>
          <span className="tok-string">&apos;Hello, GraphQL!&apos;</span>
          <span className="tok-punct">{" },\n};"}</span>
          {"\n\n"}
          <span className="tok-keyword">const</span>{" "}
          <span className="tok-prop">server</span>
          <span className="tok-op"> = </span>
          <span className="tok-keyword">new</span>{" "}
          <span className="tok-fn">ApolloServer</span>
          <span className="tok-punct">{"({"}</span>{" "}
          <span className="tok-prop">typeDefs</span>
          <span className="tok-punct">,</span>{" "}
          <span className="tok-prop">resolvers</span>{" "}
          <span className="tok-punct">{"});"}</span>
        </code>
      </pre>

      <h2 id="summary">Summary</h2>

      <p>
        In this module you&apos;ve learned:
      </p>

      <ul>
        <li>GraphQL is a typed query language where the client controls the response shape</li>
        <li>The <strong>schema</strong> is the contract between client and server</li>
        <li><strong>Queries</strong> read data; <strong>mutations</strong> write data</li>
        <li><strong>Resolvers</strong> are the functions that actually fetch or compute field values</li>
      </ul>

      <p>
        In the next module, we&apos;ll go deeper on <strong>Schema Design Principles</strong> —
        naming conventions, nullable vs. non-nullable fields, and how to model
        real-world domains in GraphQL.
      </p>
    </div>
  );
}
