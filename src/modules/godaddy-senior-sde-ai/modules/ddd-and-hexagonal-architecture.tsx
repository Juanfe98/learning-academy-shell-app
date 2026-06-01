import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { ArticleTable, InterviewPlaybook, InterviewChallenge } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const dddLayersDiagram = String.raw`flowchart TD
  UI["Presentation Layer\nREST Controllers, GraphQL Resolvers, CLI"]
  APP["Application Layer\nUse Cases / Application Services\nOrchestrates domain objects"]
  DOM["Domain Layer\nEntities, Value Objects, Aggregates\nDomain Services, Domain Events\nRepository Interfaces"]
  INFRA["Infrastructure Layer\nDB adapters, HTTP clients, message queues\nImplements repository interfaces"]

  UI --> APP
  APP --> DOM
  APP --> INFRA
  INFRA --> DOM
  DOM -."no dependency on".-> INFRA
  DOM -."no dependency on".-> UI`;

const hexagonalDiagram = String.raw`flowchart LR
  subgraph HEX["Hexagon (Application Core)"]
    DOM2["Domain Model\nBusiness Logic"]
    PORTS["Ports\n(Interfaces)"]
    DOM2 --- PORTS
  end
  DRIVING["Driving Adapters\n(Primary)\nREST API\nGraphQL\nCLI\ngRPC"]
  DRIVEN["Driven Adapters\n(Secondary)\nPostgres adapter\nDynamoDB adapter\nSQS adapter\nEmail service\nLLM API client"]
  DRIVING -->|"calls"| PORTS
  PORTS -->|"calls"| DRIVEN
  TEST["Test Adapter\nIn-memory implementations\nof driven adapters"]
  TEST -->|"replaces"| DRIVEN`;

const cqrsDiagram = String.raw`flowchart TD
  CLIENT["Client Request"]
  CLIENT --> CMD["Command\n(mutates state)\nCreateTicketCommand\nEscalateTicketCommand"]
  CLIENT --> QRY["Query\n(read-only)\nGetTicketByIdQuery\nListOpenTicketsQuery"]
  CMD --> CMDH["Command Handler\nOrchestrates domain logic\nEmits domain events"]
  QRY --> QRYH["Query Handler\nReads from optimized\nread model / cache"]
  CMDH --> DOM3["Domain Model\nAggregate root\napplies business rules"]
  DOM3 --> EVTS["Domain Events\nTicketCreated\nTicketEscalated"]
  EVTS --> PROJ["Projections / Read Models\nDenormalized view for queries\nEventually consistent"]
  QRYH --> PROJ`;

export const toc: TocItem[] = [
  { id: "why-ddd", title: "Why Domain Driven Design", level: 2 },
  { id: "building-blocks", title: "DDD Building Blocks", level: 2 },
  { id: "entities-value-objects", title: "Entities vs Value Objects", level: 3 },
  { id: "aggregates", title: "Aggregates & Aggregate Roots", level: 3 },
  { id: "domain-events", title: "Domain Events", level: 3 },
  { id: "bounded-contexts", title: "Bounded Contexts", level: 2 },
  { id: "context-mapping", title: "Context Mapping Patterns", level: 3 },
  { id: "hexagonal", title: "Hexagonal Architecture (Ports & Adapters)", level: 2 },
  { id: "ports-adapters", title: "Ports, Adapters & Testability", level: 3 },
  { id: "cqrs", title: "CQRS Pattern", level: 2 },
  { id: "repositories", title: "Repository Pattern", level: 2 },
  { id: "godaddy-domain", title: "Applying DDD to GoDaddy Care", level: 2 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "challenge", title: "Architecture Challenge", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function DddAndHexagonalArchitecture() {
  return (
    <div className="article-content">
      <p>
        The GoDaddy JD explicitly calls out Domain Driven Design, Hexagonal Architecture, Design
        Patterns, and Testing as core requirements — not nice-to-haves. These are the software
        craftsmanship foundations GoDaddy evaluates in every engineering interview. This module
        builds the complete mental model from first principles and maps it to the AI customer care
        context you will be working in.
      </p>

      <h2 id="why-ddd">Why Domain Driven Design</h2>
      <p>
        Domain Driven Design (DDD) is not a framework — it is a philosophy for structuring
        complex software around the <strong>core business domain</strong> rather than around
        the database schema, HTTP endpoints, or framework conventions. The central insight:
        the code should speak the language of the business. When a product manager talks about
        &quot;escalating a support ticket,&quot; those exact words should exist as
        <code>EscalateTicket</code> in the codebase — not buried inside a
        <code>PUT /tickets/:id</code> handler that also handles a dozen other mutations.
      </p>
      <p>
        DDD solves the most painful long-term problem in software: systems that were easy to
        build initially but become impossible to reason about at scale. The root cause is
        almost always that the code doesn&apos;t model the business — it models the data.
      </p>

      <h2 id="building-blocks">DDD Building Blocks</h2>

      <MermaidDiagram
        chart={dddLayersDiagram}
        title="DDD Layered Architecture"
        caption="The domain layer has zero dependencies on outer layers. Infrastructure implements the interfaces the domain defines — not the other way around. This is the key dependency inversion that makes the domain testable in isolation."
        minHeight={380}
      />

      <h3 id="entities-value-objects">Entities vs Value Objects</h3>
      <p>
        This distinction is the most common DDD interview question. An <strong>Entity</strong>
        has identity that persists across state changes. A <strong>Value Object</strong> has
        no identity — it is defined entirely by its value and is immutable.
      </p>
      <pre><code>{`// Entity: identity is what matters, not the fields
// A SupportTicket is still the same ticket even if its status changes
class SupportTicket {
  constructor(
    private readonly id: TicketId,    // identity — never changes
    private customerId: CustomerId,
    private status: TicketStatus,
    private subject: string,
  ) {}

  escalate(reason: string): void {
    if (this.status !== TicketStatus.Open) {
      throw new DomainError("Only open tickets can be escalated");
    }
    this.status = TicketStatus.Escalated;
    this.recordEvent(new TicketEscalated(this.id, reason, new Date()));
  }

  // Equality by identity
  equals(other: SupportTicket): boolean {
    return this.id.equals(other.id);
  }
}

// Value Object: value IS the identity — immutable, no concept of "same object"
// Two Email objects with the same address ARE the same thing
class Email {
  private constructor(private readonly value: string) {}

  static create(raw: string): Email {
    const normalized = raw.trim().toLowerCase();
    if (!/.+@.+\\..+/.test(normalized)) {
      throw new DomainError(\`Invalid email: \${raw}\`);
    }
    return new Email(normalized);
  }

  toString(): string { return this.value; }

  // Equality by value
  equals(other: Email): boolean {
    return this.value === other.value;
  }
}

// Value Object: money — immutable, equality by value
class Money {
  constructor(
    private readonly amount: number,
    private readonly currency: "USD" | "EUR" | "GBP",
  ) { Object.freeze(this); }  // enforce immutability

  add(other: Money): Money {
    if (this.currency !== other.currency) throw new DomainError("Currency mismatch");
    return new Money(this.amount + other.amount, this.currency);
  }
}`}</code></pre>

      <h3 id="aggregates">Aggregates & Aggregate Roots</h3>
      <p>
        An <strong>Aggregate</strong> is a cluster of related entities and value objects that
        are treated as a single unit for data changes. The <strong>Aggregate Root</strong> is
        the only entry point — external code never directly mutates child entities. This is the
        DDD concept that most teams get wrong by not enforcing it.
      </p>
      <pre><code>{`// Aggregate: SupportConversation owns its Messages
// External code can only interact through SupportConversation (the root)
class SupportConversation {
  private readonly messages: Message[] = [];
  private readonly events: DomainEvent[] = [];

  constructor(
    private readonly id: ConversationId,
    private readonly customerId: CustomerId,
    private status: ConversationStatus,
  ) {}

  // External code calls methods on the root — never on Message directly
  addCustomerMessage(content: string, attachments: Attachment[] = []): void {
    if (this.status === ConversationStatus.Closed) {
      throw new DomainError("Cannot add message to closed conversation");
    }
    const message = Message.create(
      MessageId.generate(),
      this.id,
      MessageAuthor.Customer,
      content,
      attachments,
    );
    this.messages.push(message);
    this.events.push(new CustomerMessageAdded(this.id, message.id, content));
  }

  addAgentReply(agentId: AgentId, content: string): void {
    const message = Message.create(
      MessageId.generate(), this.id, MessageAuthor.Agent, content, [],
    );
    this.messages.push(message);
    this.events.push(new AgentReplied(this.id, agentId, message.id));
  }

  close(resolvedBy: AgentId): void {
    this.status = ConversationStatus.Closed;
    this.events.push(new ConversationClosed(this.id, resolvedBy, new Date()));
  }

  pullEvents(): DomainEvent[] {
    const pending = [...this.events];
    this.events.length = 0;
    return pending;
  }
}

// Rule: Aggregates should be small. If aggregates grow large, it's a sign
// your bounded context needs splitting or your aggregate design is wrong.
// A SupportConversation should NOT contain the entire customer order history.`}</code></pre>

      <h3 id="domain-events">Domain Events</h3>
      <p>
        Domain events represent something significant that happened in the domain — a fact,
        not a command. They enable loose coupling between bounded contexts and are the
        foundation of event-driven architecture in a DDD system.
      </p>
      <pre><code>{`// Domain events are immutable facts — named in past tense
interface DomainEvent {
  readonly eventId: string;
  readonly occurredAt: Date;
  readonly eventType: string;
}

class TicketEscalated implements DomainEvent {
  readonly eventId = crypto.randomUUID();
  readonly occurredAt = new Date();
  readonly eventType = "ticket.escalated";

  constructor(
    readonly ticketId: TicketId,
    readonly reason: string,
    readonly escalatedBy: AgentId,
  ) {}
}

// Event handler in another bounded context (notification context)
class NotifyOnTicketEscalated {
  async handle(event: TicketEscalated): Promise<void> {
    await this.notificationService.notifyManager({
      ticketId: event.ticketId.value,
      reason: event.reason,
    });
  }
}
// The key: support context knows nothing about notification context
// They communicate only through events — no direct dependency`}</code></pre>

      <h2 id="bounded-contexts">Bounded Contexts</h2>
      <p>
        A Bounded Context is a linguistic boundary within which a domain model is consistent.
        The word &quot;Customer&quot; means something different in the Support context
        (a person with a problem) than in the Billing context (a payment entity). Trying to
        share one <code>Customer</code> entity across both contexts creates a
        <strong>big ball of mud</strong> — a model that tries to be everything and ends up
        representing nothing cleanly.
      </p>

      <h3 id="context-mapping">Context Mapping Patterns</h3>

      <ArticleTable caption="Context mapping patterns — how bounded contexts integrate with each other." minWidth={820}>
        <table>
          <thead>
            <tr>
              <th>Pattern</th>
              <th>Relationship</th>
              <th>When to use</th>
              <th>GoDaddy example</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Shared Kernel</td>
              <td>Two teams share a subset of the domain model</td>
              <td>Very high cohesion, shared team ownership</td>
              <td>CustomerId shared between Auth and Support contexts</td>
            </tr>
            <tr>
              <td>Customer/Supplier</td>
              <td>Upstream team defines the API, downstream consumes</td>
              <td>Clear ownership hierarchy, upstream is stable</td>
              <td>Billing context (supplier) → Support context (customer)</td>
            </tr>
            <tr>
              <td>Anti-Corruption Layer (ACL)</td>
              <td>Translation layer isolates your domain from an external model</td>
              <td>Integrating with legacy systems or external APIs</td>
              <td>Translating third-party LLM API responses into domain events</td>
            </tr>
            <tr>
              <td>Open Host Service</td>
              <td>Publish a protocol/API that others can consume</td>
              <td>Your context is consumed by many others</td>
              <td>Auth context exposes identity for all other contexts</td>
            </tr>
            <tr>
              <td>Published Language</td>
              <td>Well-documented domain model / schema shared publicly</td>
              <td>Multiple teams need the same schema</td>
              <td>Shared event schema for domain events via AsyncAPI</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h2 id="hexagonal">Hexagonal Architecture (Ports & Adapters)</h2>
      <p>
        Hexagonal architecture (Alistair Cockburn, 2005) solves the testability problem in
        layered architectures. The core principle: the application talks to the outside world
        through <strong>ports</strong> (interfaces it defines) and <strong>adapters</strong>
        (implementations that connect ports to the real world). Tests use in-memory adapters —
        the entire application can be tested without a database, HTTP server, or cloud service.
      </p>

      <MermaidDiagram
        chart={hexagonalDiagram}
        title="Hexagonal Architecture — Ports & Adapters"
        caption="The application core defines the ports (interfaces). Adapters implement them. The test adapter replaces all driven adapters — the domain runs in pure memory with no external dependencies."
        minHeight={380}
      />

      <h3 id="ports-adapters">Ports, Adapters & Testability</h3>
      <pre><code>{`// PORT: an interface defined by the APPLICATION CORE
// The application core owns this interface — it describes what it needs
interface TicketRepository {
  save(ticket: SupportTicket): Promise<void>;
  findById(id: TicketId): Promise<SupportTicket | null>;
  findOpenByCustomer(customerId: CustomerId): Promise<SupportTicket[]>;
}

interface AiClassificationPort {
  classify(text: string): Promise<TicketCategory>;
}

// DRIVEN ADAPTER: implements the port for production
class DynamoDbTicketRepository implements TicketRepository {
  constructor(private readonly client: DynamoDBClient, private readonly table: string) {}

  async save(ticket: SupportTicket): Promise<void> {
    await this.client.send(new PutItemCommand({
      TableName: this.table,
      Item: TicketMapper.toDynamo(ticket),
    }));
  }

  async findById(id: TicketId): Promise<SupportTicket | null> {
    const result = await this.client.send(new GetItemCommand({
      TableName: this.table,
      Key: { pk: { S: \`TICKET#\${id.value}\` } },
    }));
    return result.Item ? TicketMapper.toDomain(result.Item) : null;
  }
}

// TEST ADAPTER: implements the port in memory — no AWS needed for tests
class InMemoryTicketRepository implements TicketRepository {
  private tickets = new Map<string, SupportTicket>();

  async save(ticket: SupportTicket): Promise<void> {
    this.tickets.set(ticket.id.value, ticket);
  }

  async findById(id: TicketId): Promise<SupportTicket | null> {
    return this.tickets.get(id.value) ?? null;
  }

  async findOpenByCustomer(customerId: CustomerId): Promise<SupportTicket[]> {
    return [...this.tickets.values()].filter(
      t => t.customerId.equals(customerId) && t.isOpen()
    );
  }
}

// APPLICATION SERVICE (Use Case): wires together domain + ports
class EscalateTicketUseCase {
  constructor(
    private readonly ticketRepo: TicketRepository,    // injected port
    private readonly eventBus: DomainEventBus,         // injected port
  ) {}

  async execute(command: EscalateTicketCommand): Promise<void> {
    const ticket = await this.ticketRepo.findById(command.ticketId);
    if (!ticket) throw new TicketNotFoundError(command.ticketId);

    ticket.escalate(command.reason);

    await this.ticketRepo.save(ticket);
    await this.eventBus.publish(ticket.pullEvents());
  }
}

// UNIT TEST: zero external dependencies, fully deterministic
describe("EscalateTicketUseCase", () => {
  it("escalates an open ticket and publishes event", async () => {
    const repo = new InMemoryTicketRepository();
    const eventBus = new InMemoryEventBus();
    const useCase = new EscalateTicketUseCase(repo, eventBus);

    const ticket = SupportTicket.create({ customerId: CustomerId.of("cust-1") });
    await repo.save(ticket);

    await useCase.execute({ ticketId: ticket.id, reason: "Customer very upset" });

    const saved = await repo.findById(ticket.id);
    expect(saved?.status).toBe(TicketStatus.Escalated);
    expect(eventBus.published).toContainEqual(
      expect.objectContaining({ eventType: "ticket.escalated" })
    );
  });
});`}</code></pre>

      <h2 id="cqrs">CQRS Pattern</h2>
      <p>
        Command Query Responsibility Segregation separates operations that mutate state
        (Commands) from operations that read state (Queries). This is not about microservices —
        it can be applied within a single service. The benefit: each side can be optimized
        independently. Commands go through rich domain logic; queries hit a denormalized read
        model optimized for display.
      </p>

      <MermaidDiagram
        chart={cqrsDiagram}
        title="CQRS Flow — Commands vs Queries"
        caption="Commands mutate domain state and emit events. Events update read models (projections) asynchronously. Queries read from the optimized read model — never from the write model."
        minHeight={360}
      />

      <pre><code>{`// Command: intent to change state — validated, then handled
interface EscalateTicketCommand {
  readonly ticketId: TicketId;
  readonly reason: string;
  readonly requestedBy: AgentId;
}

// Query: reads only, returns a DTO (not a domain object)
interface GetTicketDetailsQuery {
  readonly ticketId: string;
}

// Query result: a DTO shaped for the UI — not a domain object
interface TicketDetailsDto {
  id: string;
  subject: string;
  status: string;
  customerName: string;        // denormalized from Customer context
  assignedAgentName: string;   // denormalized from Agent context
  messageCount: number;
  createdAt: string;
  escalationHistory: { reason: string; at: string }[];
}

// Query handler reads from the read model (optimized view)
// This could be a DynamoDB table structured for reads, not writes
class GetTicketDetailsQueryHandler {
  async handle(query: GetTicketDetailsQuery): Promise<TicketDetailsDto | null> {
    // Read from the pre-projected read model — fast, no joins
    return this.readModelRepo.findTicketDetails(query.ticketId);
  }
}

// Why CQRS matters for AI: the read model for AI features
// can be a vector embedding store — separate from the write model
// Commands: create ticket → write to DynamoDB (source of truth)
// Projection: ticket created → embed subject → write to vector DB (read model for AI search)`}</code></pre>

      <h2 id="repositories">Repository Pattern</h2>
      <p>
        Repositories are the abstraction that decouples the domain from persistence technology.
        The key design rule: <strong>repositories are defined in the domain layer, implemented
        in the infrastructure layer</strong>. The domain never imports a database library — it
        only imports its own interfaces.
      </p>
      <pre><code>{`// GOOD: Repository interface in the domain layer
// This file imports NOTHING from infrastructure
interface SupportTicketRepository {
  save(ticket: SupportTicket): Promise<void>;
  nextId(): TicketId;
  findById(id: TicketId): Promise<SupportTicket | null>;
  findByCustomer(customerId: CustomerId, filters?: TicketFilters): Promise<SupportTicket[]>;
}

// ANTI-PATTERN: leaking infrastructure into the domain
// Never return ORM entities from a repository — that ties the domain to the ORM
interface BadRepository {
  // ✗ Returns DynamoDB raw Item — domain now depends on AWS SDK types
  findById(id: string): Promise<Record<string, AttributeValue> | null>;
}

// Correct: repository returns DOMAIN objects, always
// The mapper lives in infrastructure and handles the translation
class DynamoTicketMapper {
  static toDomain(item: Record<string, AttributeValue>): SupportTicket {
    return SupportTicket.reconstitute({
      id: TicketId.of(item.pk.S!.replace("TICKET#", "")),
      customerId: CustomerId.of(item.customerId.S!),
      status: item.status.S! as TicketStatus,
      subject: item.subject.S!,
    });
  }
}`}</code></pre>

      <h2 id="godaddy-domain">Applying DDD to GoDaddy Care</h2>
      <p>
        GoDaddy&apos;s customer care domain has several natural bounded contexts. Understanding
        these before your interview demonstrates that you can apply DDD to real business problems,
        not just recite theory.
      </p>
      <pre><code>{`// Bounded contexts in GoDaddy Care:

// 1. Support Context (core domain — this is where you work)
//    Aggregates: SupportConversation, SupportTicket
//    Domain Events: ConversationStarted, TicketEscalated, IssueCategorized
//    Value Objects: ConversationChannel (chat/email/phone), Priority, TicketCategory

// 2. AI/Classification Context (core domain — new capability)
//    Aggregates: ClassificationJob, AiConversationSession
//    Domain Events: IntentClassified, SentimentAnalyzed, ResponseGenerated
//    Value Objects: IntentScore, SentimentScore, PromptTemplate

// 3. Customer Identity Context (generic — can use off-shelf)
//    Aggregates: Customer, CustomerProfile
//    Shared via: Shared Kernel (CustomerId) + Anti-Corruption Layer for profile data

// 4. Knowledge Base Context (supporting — feeds AI)
//    Aggregates: Article, ArticleVersion
//    Domain Events: ArticlePublished, ArticleDeprecated
//    Value Objects: Embedding (vector representation)

// 5. Routing Context (supporting — assigns tickets to agents)
//    Aggregates: AgentQueue, RoutingRule
//    Domain Events: TicketAssigned, AgentAvailabilityChanged
//    Value Objects: AgentSkill, QueuePriority

// Integration:
// Support → AI context: ConversationStarted event triggers intent classification
// AI → Support context: IntentClassified event updates ticket category + priority
// Support → Routing context: TicketEscalated event triggers re-routing`}</code></pre>

      <h2 id="interview-framing">Interview Framing</h2>

      <InterviewPlaybook
        title="How to answer: 'What is Domain Driven Design and when would you use it?'"
        intro="GoDaddy explicitly lists DDD as a requirement. They want to see fluency, not just familiarity. The weak answer defines DDD from a textbook. The strong answer explains when it is and isn't worth the cost."
        steps={[
          "Define the problem it solves: 'DDD is a set of principles for structuring complex software around the business domain rather than the database schema. It solves the most painful long-term problem: code that models data instead of business behavior — which becomes impossible to extend safely.'",
          "Name the key building blocks concisely: 'The three most important: Entities have persistent identity; Value Objects have no identity and are immutable; Aggregates enforce consistency boundaries — external code only interacts through the root.'",
          "Explain Hexagonal Architecture connection: 'I pair DDD with Hexagonal Architecture — ports defined by the domain, adapters in infrastructure. This is what makes the domain fully testable in isolation. No database, no cloud, just pure business logic tests.'",
          "Name when NOT to use it: 'DDD has overhead. For CRUD apps with simple business logic, it is overengineering. I apply it when the domain is complex enough that the language gap between business and code is causing bugs or slow development.'",
        ]}
      />

      <InterviewChallenge
        title="Architecture Challenge: Model the GoDaddy Support Ticket Domain"
        scenario={
          <>
            GoDaddy receives millions of support tickets annually. A ticket goes through
            states: open → in-progress → escalated → resolved → closed. Tickets can be
            re-opened. An AI system classifies tickets on creation. Escalated tickets must
            notify a manager. You are designing the domain model for this system.
          </>
        }
        tasks={[
          "Define the SupportTicket aggregate: what are its Entities, Value Objects, and invariants?",
          "What domain events does the SupportTicket emit across its lifecycle?",
          "How do you enforce the rule: 'A closed ticket cannot be escalated' in the domain model (not in a controller)?",
          "Where does the AI classification fit — is it part of the SupportTicket aggregate or a separate bounded context?",
          "Define the TicketRepository interface as it should exist in the domain layer.",
        ]}
      />

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li><strong>Entities have identity; Value Objects have value</strong> — the most common DDD interview question. Value Objects are immutable and compared by value.</li>
        <li><strong>Aggregates enforce consistency</strong> — external code never directly mutates child entities. The aggregate root is the only entry point for state changes.</li>
        <li><strong>Domain Events</strong> are immutable facts named in past tense — they decouple bounded contexts without creating direct dependencies.</li>
        <li><strong>Hexagonal Architecture</strong> makes DDD testable — ports are interfaces owned by the domain, adapters live in infrastructure. Tests use in-memory adapters.</li>
        <li><strong>CQRS</strong> separates the write model (rich domain logic) from the read model (optimized for queries) — critical for AI features where the read model is a vector database.</li>
        <li>The most common DDD mistake: repositories that return ORM entities instead of domain objects. Repositories must always return domain objects — the mapper lives in infrastructure.</li>
      </ul>
    </div>
  );
}
