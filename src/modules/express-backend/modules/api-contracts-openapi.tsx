import type { TocItem } from "@/lib/types/academy";

export const toc: TocItem[] = [
  { id: "why-contracts", title: "Why API Contracts Matter", level: 2 },
  { id: "openapi", title: "OpenAPI / Swagger", level: 2 },
  { id: "schema-first", title: "Schema-First vs Code-First", level: 2 },
  { id: "contract-testing", title: "Contract Testing", level: 2 },
  { id: "versioning-deprecation", title: "Versioning and Deprecation", level: 2 },
  { id: "consumer-sdks", title: "Generated Clients and SDKs", level: 2 },
];

export default function ApiContractsOpenApi() {
  return (
    <div className="article-content">
      <p>
        Senior backend engineers treat APIs as products with contracts. Express does not enforce
        contracts by itself, so teams add OpenAPI, schema validation, generated clients, and contract
        tests to avoid breaking consumers.
      </p>

      <h2 id="why-contracts">Why API Contracts Matter</h2>
      <ul>
        <li>Frontend, mobile, partner, and backend teams can work independently.</li>
        <li>Breaking changes are detected before production.</li>
        <li>Documentation stays closer to implementation.</li>
        <li>Clients can be generated with typed request/response models.</li>
      </ul>

      <h2 id="openapi">OpenAPI / Swagger</h2>
      <p>
        OpenAPI describes paths, methods, parameters, request bodies, responses, auth schemes, and
        reusable schemas. It is useful for docs, mocks, generated clients, contract tests, and API
        gateway validation.
      </p>
      <pre><code>{`paths:
  /users/{id}:
    get:
      parameters:
        - in: path
          name: id
          required: true
          schema: { type: string }
      responses:
        "200":
          description: User found
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/User"
        "404":
          description: User not found`}</code></pre>

      <h2 id="schema-first">Schema-First vs Code-First</h2>
      <ul>
        <li><strong>Schema-first</strong>: OpenAPI is the source of truth; generate server/client types.</li>
        <li><strong>Code-first</strong>: route schemas or Zod schemas generate OpenAPI docs.</li>
        <li><strong>Hybrid</strong>: validate with Zod and generate OpenAPI with tooling, but review the produced spec.</li>
      </ul>
      <p>
        Interview answer: either is valid. The senior concern is keeping runtime validation,
        TypeScript types, documentation, and client expectations from drifting apart.
      </p>

      <h2 id="contract-testing">Contract Testing</h2>
      <p>
        Contract tests verify that provider and consumer expectations match. Options include Pact,
        OpenAPI response validation in integration tests, generated client smoke tests, and schema
        compatibility checks in CI.
      </p>
      <pre><code>{`// Integration test idea: assert responses match the public contract
const res = await request(app).get("/users/u1").expect(200);
expect(UserResponseSchema.parse(res.body)).toEqual(res.body);

// Stronger CI: fail if an OpenAPI diff removes a field, changes a type,
// removes a status code, or tightens a request schema without a new version.`}</code></pre>

      <h2 id="versioning-deprecation">Versioning and Deprecation</h2>
      <p>
        Avoid versioning for every small change. Additive changes are usually backward compatible.
        Breaking changes need a migration period, deprecation headers/docs, metrics for old consumers,
        and sometimes parallel versions.
      </p>

      <h2 id="consumer-sdks">Generated Clients and SDKs</h2>
      <p>
        Generated clients reduce boilerplate and type mismatches, but bad specs generate bad clients.
        Ensure errors, pagination, auth, timeouts, retries, and idempotency are represented clearly in
        the contract.
      </p>
    </div>
  );
}
