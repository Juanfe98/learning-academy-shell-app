import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { ArticleTable } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const layeredArchDiagram = String.raw`flowchart TD
    subgraph HTTP ["HTTP Layer"]
        R[Router / Controller]
    end
    subgraph SVC ["Service Layer"]
        S[Service / Use Case]
    end
    subgraph REPO ["Repository Layer"]
        Rp[Repository]
    end
    subgraph INFRA ["Infrastructure"]
        DB[(Database)]
        EXT[External APIs]
        CACHE[(Cache)]
    end

    R -->|"DTO in"| S
    S -->|"domain calls"| Rp
    Rp --> DB
    Rp --> CACHE
    S --> EXT

    style HTTP fill:#6366f1,color:#fff
    style SVC fill:#10b981,color:#fff
    style REPO fill:#f59e0b,color:#000
    style INFRA fill:#374151,color:#fff`;

const cleanArchDiagram = String.raw`flowchart LR
    subgraph Domain ["Domain (innermost)"]
        E[Entities]
        DL[Domain Logic]
    end
    subgraph App ["Application"]
        UC[Use Cases]
        P[Ports / Interfaces]
    end
    subgraph Infra ["Infrastructure (outermost)"]
        DB[(DB Adapter)]
        HTTP[Express Controller]
        EXT[Email / Queue]
    end

    HTTP -->|"calls"| UC
    UC --> E
    UC --> P
    DB -.->|"implements"| P
    EXT -.->|"implements"| P

    style Domain fill:#6366f1,color:#fff
    style App fill:#10b981,color:#fff
    style Infra fill:#374151,color:#fff`;

const diDiagram = String.raw`flowchart TD
    C[Controller] -->|"depends on interface"| SI[IUserService]
    S[UserService] -.->|"implements"| SI
    S -->|"depends on interface"| RI[IUserRepository]
    R[UserRepository] -.->|"implements"| RI
    R --> DB[(Database)]

    COMP[Composition Root\napp.ts] -->|"wires"| R
    COMP -->|"wires"| S
    COMP -->|"wires"| C`;

const monolithVsMicroDiagram = String.raw`flowchart LR
    subgraph Monolith
        direction TB
        M1[Auth module]
        M2[Orders module]
        M3[Products module]
        M1 --- M2 --- M3
        M1 --- DB1[(Single DB)]
    end
    subgraph Microservices
        direction TB
        S1[Auth service]
        S2[Order service]
        S3[Product service]
        S1 --- DB2[(Auth DB)]
        S2 --- DB3[(Order DB)]
        S3 --- DB4[(Product DB)]
        S1 <-->|"HTTP / events"| S2
        S2 <-->|"HTTP / events"| S3
    end`;

export const toc: TocItem[] = [
  { id: "project-structure", title: "How do you structure a Node.js backend project?", level: 2 },
  { id: "layered-arch", title: "What is layered architecture?", level: 2 },
  { id: "clean-arch", title: "What is clean architecture?", level: 2 },
  { id: "dependency-injection", title: "What is dependency injection?", level: 2 },
  { id: "di-nodejs", title: "Applying dependency injection in Node.js", level: 2 },
  { id: "factory-functions", title: "What is a factory function and why use it?", level: 2 },
  { id: "ioc", title: "What is inversion of control?", level: 2 },
  { id: "thin-controllers", title: "How do you keep controllers thin?", level: 2 },
  { id: "separate-concerns", title: "Separating business logic from infrastructure", level: 2 },
  { id: "testable-services", title: "How do you make services testable?", level: 2 },
  { id: "logic-layers", title: "Domain, application, and infrastructure logic", level: 2 },
  { id: "dtos", title: "What are DTOs?", level: 2 },
  { id: "mappers", title: "What are mappers?", level: 2 },
  { id: "repository-pattern", title: "What is the repository pattern?", level: 2 },
  { id: "repo-overkill", title: "When is the repository pattern overkill?", level: 2 },
  { id: "cross-cutting", title: "How do you handle cross-cutting concerns?", level: 2 },
  { id: "reusable-middleware", title: "Designing reusable middleware", level: 2 },
  { id: "circular-deps", title: "How do you avoid circular dependencies?", level: 2 },
  { id: "config", title: "How do you handle configuration cleanly?", level: 2 },
  { id: "large-codebase", title: "Designing modules in a large codebase", level: 2 },
  { id: "monolith-vs-micro", title: "Monolith vs microservices", level: 2 },
  { id: "split-services", title: "How do you split responsibilities between services?", level: 2 },
];

export default function InterviewArchitecture() {
  return (
    <div className="article-content">
      <p>
        Section 9 of 18 — Architecture &amp; Clean Code. This is where senior engineers are
        separated from mid-level: not just knowing how to write code, but how to structure systems
        so they remain maintainable, testable, and extensible as the team and codebase grow.
      </p>

      {/* ── 1 ── */}
      <h2 id="project-structure">How do you structure a Node.js backend project?</h2>
      <p>
        The most common pattern for Express APIs is a feature-based or layer-based folder structure.
        The key principle: <strong>group by what changes together</strong>.
      </p>
      <pre><code>{`src/
├── config/           # env validation, constants
├── middleware/        # global middleware (auth, error handler, logger)
├── modules/          # feature modules — one folder per domain
│   └── users/
│       ├── user.controller.ts
│       ├── user.service.ts
│       ├── user.repository.ts
│       ├── user.dto.ts
│       ├── user.mapper.ts
│       ├── user.routes.ts
│       └── user.test.ts
├── lib/              # shared utilities, base classes, types
├── db/               # database client, migrations setup
└── app.ts            # Express app composition + middleware wiring
    server.ts         # HTTP server, graceful shutdown`}</code></pre>
      <p>
        Keep <code>app.ts</code> responsible only for middleware registration and router mounting.
        Keep <code>server.ts</code> responsible only for starting the HTTP server and handling
        process signals. This separation makes testing <code>app.ts</code> with supertest trivial
        — no port binding needed.
      </p>

      {/* ── 2 ── */}
      <h2 id="layered-arch">What is layered architecture?</h2>
      <MermaidDiagram chart={layeredArchDiagram} />
      <p>
        Layered architecture divides the codebase into horizontal layers where each layer depends
        only on the layer directly below it. The classic 3-layer backend:
      </p>
      <ArticleTable caption="Layered architecture — responsibilities at each layer" minWidth={780}>
        <table>
          <thead>
            <tr>
              <th>Layer</th>
              <th>Responsibility</th>
              <th>Must NOT do</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Controller (HTTP)</strong></td>
              <td>Parse request, validate input, call service, serialize response</td>
              <td>Business logic, database queries, business rule enforcement</td>
            </tr>
            <tr>
              <td><strong>Service (Business)</strong></td>
              <td>Orchestrate use cases, enforce business rules, coordinate repos</td>
              <td>HTTP concerns (req/res), raw SQL, framework specifics</td>
            </tr>
            <tr>
              <td><strong>Repository (Data)</strong></td>
              <td>CRUD operations, query construction, data mapping</td>
              <td>Business rules, HTTP concerns, calling other services</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>
      <p>
        Dependencies flow strictly downward. The controller knows about the service; the service
        knows about the repository; the repository knows about the database. Nothing flows upward.
      </p>

      {/* ── 3 ── */}
      <h2 id="clean-arch">What is clean architecture?</h2>
      <MermaidDiagram chart={cleanArchDiagram} />
      <p>
        Clean architecture (Robert C. Martin) is a stricter evolution of layered architecture. The
        key rule: the <strong>dependency rule</strong> — source code dependencies point only
        inward. Inner layers know nothing about outer layers.
      </p>
      <ul>
        <li>
          <strong>Domain (innermost)</strong> — entities and domain logic. Pure TypeScript, zero
          dependencies on frameworks, ORMs, or HTTP.
        </li>
        <li>
          <strong>Application</strong> — use cases that orchestrate domain entities. Depends on
          domain only. Defines <em>ports</em> (interfaces) that infrastructure must implement.
        </li>
        <li>
          <strong>Infrastructure (outermost)</strong> — Express controllers, Prisma repositories,
          email adapters. Depends on application via interface implementation.
        </li>
      </ul>
      <p>
        This makes the domain and use cases completely framework-agnostic and trivially testable.
        The tradeoff: more boilerplate — ports, adapters, mappers. Worth it for large, long-lived
        systems. Overkill for a CRUD API with 5 models.
      </p>

      {/* ── 4 ── */}
      <h2 id="dependency-injection">What is dependency injection?</h2>
      <p>
        Dependency injection (DI) means a class or function receives its dependencies from the
        outside rather than creating them internally. Instead of instantiating a database client
        inside a service, the client is passed in — injected — by whoever creates the service.
      </p>
      <pre><code>{`// WITHOUT DI — service creates its own dependency (hard to test)
class UserService {
  private repo = new UserRepository(); // tightly coupled

  async getUser(id: number) {
    return this.repo.findById(id);
  }
}

// WITH DI — dependency is passed in (loose coupling)
class UserService {
  constructor(private readonly repo: IUserRepository) {}

  async getUser(id: number) {
    return this.repo.findById(id);
  }
}

// In tests — inject a mock
const mockRepo: IUserRepository = { findById: vi.fn().mockResolvedValue(fakeUser) };
const service = new UserService(mockRepo);`}</code></pre>
      <p>
        DI inverts the control of dependency creation from the class to the caller. Combined with
        interfaces, it lets you swap implementations (real DB vs in-memory stub) without touching
        the class under test.
      </p>

      {/* ── 5 ── */}
      <h2 id="di-nodejs">Applying dependency injection in Node.js</h2>
      <MermaidDiagram chart={diDiagram} />
      <p>
        Node.js has no built-in DI container. Three common approaches:
      </p>
      <pre><code>{`// 1. Manual wiring (composition root in app.ts) — simplest, no library
import { PrismaClient } from "@prisma/client";
import { UserRepository } from "./modules/users/user.repository";
import { UserService } from "./modules/users/user.service";
import { UserController } from "./modules/users/user.controller";
import { createUserRouter } from "./modules/users/user.routes";

const prisma = new PrismaClient();
const userRepo = new UserRepository(prisma);
const userService = new UserService(userRepo);
const userController = new UserController(userService);
const userRouter = createUserRouter(userController);

app.use("/users", userRouter);

// 2. tsyringe — lightweight DI container (Microsoft)
import "reflect-metadata";
import { container, injectable, inject } from "tsyringe";

@injectable()
class UserService {
  constructor(@inject("IUserRepository") private repo: IUserRepository) {}
}

container.register("IUserRepository", { useClass: UserRepository });
const service = container.resolve(UserService);

// 3. Factory functions — functional DI without classes
function createUserService(repo: IUserRepository) {
  return {
    async getUser(id: number) { return repo.findById(id); },
    async createUser(data: CreateUserDTO) { return repo.create(data); },
  };
}

const userService = createUserService(new UserRepository(prisma));`}</code></pre>
      <p>
        Manual wiring is the most common choice for small-to-medium Node.js APIs — it is
        transparent, zero-magic, and easy to trace. DI containers make sense when the dependency
        graph is large and you want automatic resolution.
      </p>

      {/* ── 6 ── */}
      <h2 id="factory-functions">What is a factory function and why use it?</h2>
      <p>
        A factory function is a function that creates and returns an object — an alternative to
        using <code>class</code> + <code>new</code>. In Node.js it is often preferred because it
        avoids <code>this</code> binding issues and is easier to type with TypeScript interfaces.
      </p>
      <pre><code>{`// Class approach
class EmailService {
  constructor(private readonly apiKey: string) {}
  send(to: string, subject: string, body: string) { /* ... */ }
}

// Factory function approach — same result, simpler
function createEmailService(apiKey: string) {
  return {
    send(to: string, subject: string, body: string) {
      // use apiKey via closure
    },
  };
}

// Factory shines for typed return values
interface EmailService {
  send(to: string, subject: string, body: string): Promise<void>;
}

function createEmailService(apiKey: string): EmailService {
  return {
    async send(to, subject, body) { /* ... */ },
  };
}

// Easy to create test doubles
const mockEmailService: EmailService = {
  send: vi.fn().mockResolvedValue(undefined),
};`}</code></pre>
      <p>
        Factory functions also make it trivial to return different implementations based on
        environment — return a real SMTP adapter in production and a no-op logger in tests — all
        without DI frameworks.
      </p>

      {/* ── 7 ── */}
      <h2 id="ioc">What is inversion of control?</h2>
      <p>
        Inversion of Control (IoC) is a broader principle: instead of your code calling a
        framework, the framework calls your code. DI is one form of IoC (control of dependency
        creation is inverted). Express middleware is another example: Express controls when your
        handler runs, not the other way around.
      </p>
      <pre><code>{`// Normal control — you call the library
const result = library.doThing();

// Inverted control — the framework calls you
app.get("/users", (req, res) => {
  // Express calls this when a GET /users request arrives
});

// DI as IoC — caller controls what the class gets
class UserService {
  constructor(private repo: IUserRepository) {}
  // UserService doesn't control which IUserRepository it gets
}`}</code></pre>
      <p>
        IoC reduces coupling. The Hollywood Principle summarizes it: "Don&apos;t call us, we&apos;ll
        call you." Classes declare what they need; the composition root (or framework) decides what
        to provide.
      </p>

      {/* ── 8 ── */}
      <h2 id="thin-controllers">How do you keep controllers thin?</h2>
      <p>
        A controller should do exactly five things: parse the request, validate the input, call the
        service, handle errors, and serialize the response. All business logic lives in the service.
      </p>
      <pre><code>{`// FAT controller — antipattern
router.post("/orders", async (req, res) => {
  const { userId, items } = req.body;

  // Business logic in controller — wrong
  if (items.length === 0) return res.status(400).json({ error: "No items" });
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return res.status(404).json({ error: "User not found" });

  let total = 0;
  for (const item of items) {
    const product = await prisma.product.findUnique({ where: { id: item.productId } });
    if (!product) return res.status(404).json({ error: "Product not found" });
    total += product.price * item.quantity;
  }
  const order = await prisma.order.create({ data: { userId, total, items } });
  res.status(201).json(order);
});

// THIN controller — correct
router.post("/orders", async (req, res, next) => {
  try {
    const dto = createOrderSchema.parse(req.body); // validate only
    const order = await orderService.createOrder(dto); // delegate
    res.status(201).json(orderMapper.toResponse(order));
  } catch (err) {
    next(err); // centralized error handling
  }
});`}</code></pre>

      {/* ── 9 ── */}
      <h2 id="separate-concerns">Separating business logic from infrastructure</h2>
      <p>
        Business logic is the code that enforces rules specific to your domain — rules that would
        exist even if you switched databases or frameworks. Infrastructure is everything else:
        database queries, HTTP calls, email sending, caching.
      </p>
      <pre><code>{`// Service — pure business logic, no infrastructure
class OrderService {
  constructor(
    private readonly orderRepo: IOrderRepository,
    private readonly productRepo: IProductRepository,
    private readonly emailService: IEmailService,
  ) {}

  async createOrder(dto: CreateOrderDTO): Promise<Order> {
    // Business rule — not an infrastructure concern
    const items = await Promise.all(
      dto.items.map(async (item) => {
        const product = await this.productRepo.findById(item.productId);
        if (!product) throw new NotFoundError("Product not found");
        if (product.stock < item.quantity) throw new BusinessError("Insufficient stock");
        return { product, quantity: item.quantity };
      })
    );

    const total = items.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
    const order = await this.orderRepo.create({ userId: dto.userId, items, total });

    // Trigger side-effect via interface — service doesn't know it's SendGrid
    await this.emailService.sendOrderConfirmation(order);
    return order;
  }
}

// Repository — infrastructure concern, handles Prisma/SQL details
class OrderRepository implements IOrderRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: CreateOrderData): Promise<Order> {
    return this.prisma.order.create({
      data: {
        userId: data.userId,
        total: data.total,
        items: { create: data.items.map(i => ({ productId: i.product.id, quantity: i.quantity })) },
      },
      include: { items: true },
    });
  }
}`}</code></pre>

      {/* ── 10 ── */}
      <h2 id="testable-services">How do you make services testable?</h2>
      <p>
        A service is testable when all its dependencies are injected via interfaces — so tests can
        inject fakes instead of real infrastructure.
      </p>
      <pre><code>{`// Interface-driven dependencies
interface IUserRepository {
  findById(id: number): Promise<User | null>;
  create(data: CreateUserData): Promise<User>;
}

// Service accepts IUserRepository — not UserRepository (the Prisma impl)
class UserService {
  constructor(private readonly repo: IUserRepository) {}

  async getUser(id: number): Promise<User> {
    const user = await this.repo.findById(id);
    if (!user) throw new NotFoundError("User not found");
    return user;
  }
}

// Test — inject in-memory stub, no database needed
describe("UserService.getUser", () => {
  it("throws NotFoundError when user does not exist", async () => {
    const mockRepo: IUserRepository = {
      findById: vi.fn().mockResolvedValue(null),
      create: vi.fn(),
    };
    const service = new UserService(mockRepo);
    await expect(service.getUser(99)).rejects.toThrow(NotFoundError);
  });

  it("returns user when found", async () => {
    const fakeUser = { id: 1, email: "a@b.com" };
    const mockRepo: IUserRepository = {
      findById: vi.fn().mockResolvedValue(fakeUser),
      create: vi.fn(),
    };
    const service = new UserService(mockRepo);
    const result = await service.getUser(1);
    expect(result).toEqual(fakeUser);
  });
});`}</code></pre>
      <p>
        No database, no network, no environment variables required. Tests run in milliseconds and
        are deterministic.
      </p>

      {/* ── 11 ── */}
      <h2 id="logic-layers">Domain, application, and infrastructure logic</h2>
      <ArticleTable caption="Three kinds of logic — know where each one belongs" minWidth={840}>
        <table>
          <thead>
            <tr>
              <th>Type</th>
              <th>What it is</th>
              <th>Examples</th>
              <th>Where it lives</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Domain logic</strong></td>
              <td>Business rules that encode domain knowledge — would be true regardless of technology</td>
              <td>An order total cannot be negative. A user cannot be both admin and banned.</td>
              <td>Entity classes, domain services</td>
            </tr>
            <tr>
              <td><strong>Application logic</strong></td>
              <td>Orchestration of use cases — coordinates domain entities and infrastructure ports</td>
              <td>createOrder: fetch products → validate stock → persist → send email</td>
              <td>Service / use-case classes</td>
            </tr>
            <tr>
              <td><strong>Infrastructure logic</strong></td>
              <td>Technical plumbing — how data is stored, sent, or retrieved</td>
              <td>Prisma queries, Redis commands, SendGrid API calls, S3 uploads</td>
              <td>Repositories, adapters, external clients</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>
      <p>
        The golden rule: domain logic must never import from infrastructure. If your entity class
        imports Prisma, you have mixed concerns.
      </p>

      {/* ── 12 ── */}
      <h2 id="dtos">What are DTOs?</h2>
      <p>
        A DTO (Data Transfer Object) is a plain object that carries data between layers or across
        the network. DTOs define the shape of data at layer boundaries — what the HTTP layer
        accepts, what the service layer passes around, what gets returned in the API response.
      </p>
      <pre><code>{`// Request DTO — validated at the controller boundary
import { z } from "zod";

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  role: z.enum(["user", "admin"]).default("user"),
});

type CreateUserDTO = z.infer<typeof createUserSchema>;

// Response DTO — controls what fields are exposed in the API
interface UserResponseDTO {
  id: number;
  email: string;
  name: string;
  role: string;
  createdAt: string; // ISO string, not Date object
}

// Internal DTO — passed between service and repository
interface CreateUserData {
  email: string;
  name: string;
  passwordHash: string; // not in request DTO — computed by service
  role: "user" | "admin";
}`}</code></pre>
      <p>
        DTOs prevent accidental leakage of internal fields (password hashes, internal IDs, database
        implementation details) to API consumers. They also decouple the API contract from the
        database schema — the two can evolve independently.
      </p>

      {/* ── 13 ── */}
      <h2 id="mappers">What are mappers?</h2>
      <p>
        A mapper is a pure function (or class) that converts between data shapes at layer
        boundaries. Mappers translate a Prisma model to a domain entity, a domain entity to a
        response DTO, or a request DTO to a persistence model.
      </p>
      <pre><code>{`// user.mapper.ts
import type { User as PrismaUser } from "@prisma/client";
import type { User } from "./user.entity";
import type { UserResponseDTO } from "./user.dto";

export const userMapper = {
  // Prisma model → domain entity
  toDomain(raw: PrismaUser): User {
    return {
      id: raw.id,
      email: raw.email,
      name: raw.name ?? "",
      role: raw.role as "user" | "admin",
      createdAt: raw.createdAt,
    };
  },

  // Domain entity → API response
  toResponse(user: User): UserResponseDTO {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt.toISOString(),
      // passwordHash is NOT included — mapper enforces this at compile time
    };
  },
};

// Usage in controller
const user = await userService.getUser(id);
res.json(userMapper.toResponse(user));`}</code></pre>
      <p>
        Mappers centralize transformation logic — a field rename in the DB model means one mapper
        update, not a grep across the codebase.
      </p>

      {/* ── 14 ── */}
      <h2 id="repository-pattern">What is the repository pattern?</h2>
      <p>
        The repository pattern provides a collection-like interface to data access, hiding the
        persistence mechanism behind an abstraction. The service calls{" "}
        <code>repo.findById(id)</code> without knowing whether the data comes from Postgres,
        MongoDB, or an in-memory map.
      </p>
      <pre><code>{`// Interface — defines the contract
interface IUserRepository {
  findById(id: number): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  create(data: CreateUserData): Promise<User>;
  update(id: number, data: Partial<UpdateUserData>): Promise<User>;
  delete(id: number): Promise<void>;
}

// Prisma implementation
class PrismaUserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: number): Promise<User | null> {
    const raw = await this.prisma.user.findUnique({ where: { id } });
    return raw ? userMapper.toDomain(raw) : null;
  }

  async create(data: CreateUserData): Promise<User> {
    const raw = await this.prisma.user.create({ data });
    return userMapper.toDomain(raw);
  }
  // ... other methods
}

// In-memory implementation for tests
class InMemoryUserRepository implements IUserRepository {
  private store = new Map<number, User>();
  private nextId = 1;

  async findById(id: number) { return this.store.get(id) ?? null; }
  async create(data: CreateUserData): Promise<User> {
    const user = { id: this.nextId++, ...data, createdAt: new Date() };
    this.store.set(user.id, user);
    return user;
  }
  // ...
}`}</code></pre>

      {/* ── 15 ── */}
      <h2 id="repo-overkill">When is the repository pattern overkill?</h2>
      <p>
        The repository pattern adds a layer of abstraction that pays off when:
      </p>
      <ul>
        <li>You have (or anticipate) multiple data sources</li>
        <li>You need in-memory fakes for fast unit tests</li>
        <li>Business logic is complex enough to warrant isolation from persistence</li>
      </ul>
      <p>It is overkill when:</p>
      <ul>
        <li>
          <strong>Simple CRUD apps</strong> — calling Prisma directly from a thin service is fine.
          Wrapping <code>prisma.user.findUnique</code> in a repository method that just calls{" "}
          <code>prisma.user.findUnique</code> adds zero value.
        </li>
        <li>
          <strong>Small teams / fast iteration</strong> — the abstraction layer slows you down
          before the complexity pays off.
        </li>
        <li>
          <strong>You are already using an ORM with an expressive query API</strong> — Prisma itself
          is already a repository-like abstraction. Adding another on top is often redundant.
        </li>
      </ul>
      <p>
        A pragmatic middle ground: write integration tests against the real Prisma client and skip
        the repository interface until you genuinely need to swap implementations.
      </p>

      {/* ── 16 ── */}
      <h2 id="cross-cutting">How do you handle cross-cutting concerns?</h2>
      <p>
        Cross-cutting concerns are behaviours that apply across many modules: logging, authentication,
        error handling, request tracing, caching, rate limiting. In Express the primary mechanism
        is middleware.
      </p>
      <pre><code>{`// Cross-cutting concerns wired in app.ts — applied globally or per-router
app.use(correlationIdMiddleware);   // attach request ID to every request
app.use(requestLoggerMiddleware);   // log every request/response
app.use(authMiddleware);            // verify JWT on protected routes
app.use(rateLimitMiddleware);       // throttle by IP

// Per-router (not global)
protectedRouter.use(requireAuth);
adminRouter.use(requireRole("admin"));

// Error handling — always last
app.use(errorMiddleware);

// Decorator pattern for cross-cutting on async operations
function withCache<T>(key: string, ttlSeconds: number, fn: () => Promise<T>): Promise<T> {
  return cacheClient.getOrSet(key, fn, ttlSeconds);
}

// Usage in service
async getUser(id: number): Promise<User> {
  return withCache(\`user:\${id}\`, 60, () => this.repo.findById(id));
}`}</code></pre>

      {/* ── 17 ── */}
      <h2 id="reusable-middleware">Designing reusable middleware</h2>
      <p>
        Reusable middleware is a function that returns a middleware function — a middleware factory.
        This lets you configure behaviour at registration time.
      </p>
      <pre><code>{`// Middleware factory — configurable at use-time
function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  };
}

// Usage
router.delete("/users/:id", requireRole("admin"), deleteUserHandler);
router.get("/reports", requireRole("admin", "analyst"), reportsHandler);

// Another example — rate limiter factory
function rateLimit(options: { windowMs: number; max: number }) {
  const store = new Map<string, { count: number; resetAt: number }>();
  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip ?? "unknown";
    const now = Date.now();
    const entry = store.get(key);
    if (!entry || now > entry.resetAt) {
      store.set(key, { count: 1, resetAt: now + options.windowMs });
      return next();
    }
    if (entry.count >= options.max) {
      return res.status(429).json({ error: "Too Many Requests" });
    }
    entry.count++;
    next();
  };
}

app.use("/api", rateLimit({ windowMs: 60_000, max: 100 }));`}</code></pre>

      {/* ── 18 ── */}
      <h2 id="circular-deps">How do you avoid circular dependencies?</h2>
      <p>
        Circular dependencies (<code>A</code> imports <code>B</code>, <code>B</code> imports{" "}
        <code>A</code>) cause undefined imports at runtime in Node.js because of how CommonJS
        module loading works. They indicate a design problem.
      </p>
      <p>Common causes and fixes:</p>
      <ArticleTable caption="Circular dependency causes and solutions" minWidth={780}>
        <table>
          <thead>
            <tr>
              <th>Cause</th>
              <th>Fix</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Service A imports Service B and vice versa</td>
              <td>Extract shared logic into a third Service C that both import</td>
            </tr>
            <tr>
              <td>Types and implementations in the same file</td>
              <td>Move interfaces to a separate <code>types.ts</code> file</td>
            </tr>
            <tr>
              <td>Utils barrel file imports from modules that import utils</td>
              <td>Keep utils truly generic — no domain imports</td>
            </tr>
            <tr>
              <td>Two modules need each other&apos;s events</td>
              <td>Introduce an event bus — modules subscribe/publish, no direct import</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>
      <pre><code>{`// Detect circular deps
npx madge --circular src/

// Or with eslint-plugin-import
// .eslintrc
{
  "rules": {
    "import/no-cycle": "error"
  }
}`}</code></pre>

      {/* ── 19 ── */}
      <h2 id="config">How do you handle configuration cleanly?</h2>
      <p>
        Configuration lives in environment variables. The clean pattern: validate and parse all env
        vars at startup in a single <code>config.ts</code> module. The rest of the app imports from
        config — never from <code>process.env</code> directly.
      </p>
      <pre><code>{`// src/config/index.ts
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default("15m"),
  REDIS_URL: z.string().url().optional(),
  SMTP_HOST: z.string(),
  SMTP_PORT: z.coerce.number().default(587),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error("Invalid environment variables:", parsed.error.flatten().fieldErrors);
  process.exit(1); // fail fast at startup — never fail in production after traffic starts
}

export const config = parsed.data;

// Usage everywhere else
import { config } from "@/config";

const token = jwt.sign(payload, config.JWT_SECRET, { expiresIn: config.JWT_EXPIRES_IN });`}</code></pre>
      <p>
        Benefits: type-safe config, early crash with a clear error if something is missing, single
        source of truth, easy to mock in tests by setting <code>process.env</code> before import.
      </p>

      {/* ── 20 ── */}
      <h2 id="large-codebase">Designing modules in a large codebase</h2>
      <p>
        In large codebases, feature modules become the primary unit of organization. Each module is
        a self-contained vertical slice: its own routes, controller, service, repository, types,
        and tests.
      </p>
      <pre><code>{`// Module barrel — public API of a feature module
// src/modules/users/index.ts
export { createUserRouter } from "./user.routes";
export type { UserResponseDTO } from "./user.dto";
// Service and Repository are NOT exported — internal implementation details

// Other modules import only from the barrel
import { createUserRouter } from "@/modules/users";
// NOT: import { UserService } from "@/modules/users/user.service"
//     (that would create tight coupling to internals)`}</code></pre>
      <p>Principles for large-scale module design:</p>
      <ul>
        <li>
          <strong>High cohesion</strong> — code that changes together stays together inside the
          module.
        </li>
        <li>
          <strong>Low coupling</strong> — modules communicate through well-defined public interfaces
          (barrels, event bus, shared types), not by reaching into each other&apos;s internals.
        </li>
        <li>
          <strong>Bounded context</strong> — each module owns its domain language. An{" "}
          <code>Order</code> in the orders module may look different from an <code>Order</code>{" "}
          summary in the billing module. Resist the urge to share every type globally.
        </li>
        <li>
          <strong>Feature flags over branches</strong> — new features behind a flag allow trunk-based
          development without long-lived branches breaking module boundaries.
        </li>
      </ul>

      {/* ── 21 ── */}
      <h2 id="monolith-vs-micro">Monolith vs microservices</h2>
      <MermaidDiagram chart={monolithVsMicroDiagram} />
      <ArticleTable caption="Monolith vs microservices — honest trade-off analysis" minWidth={860}>
        <table>
          <thead>
            <tr>
              <th>Dimension</th>
              <th>Monolith</th>
              <th>Microservices</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Deployment</td>
              <td>Single deployable unit — simpler CI/CD</td>
              <td>Each service deploys independently — complex orchestration</td>
            </tr>
            <tr>
              <td>Development speed</td>
              <td>Fast early — one repo, one process, direct function calls</td>
              <td>Slower — network boundaries, API contracts, distributed tracing</td>
            </tr>
            <tr>
              <td>Scaling</td>
              <td>Scale everything together</td>
              <td>Scale individual services independently</td>
            </tr>
            <tr>
              <td>Failure isolation</td>
              <td>One bug can crash the whole app</td>
              <td>One service fails, others continue (with circuit breakers)</td>
            </tr>
            <tr>
              <td>Data consistency</td>
              <td>ACID transactions across all modules</td>
              <td>Eventual consistency; sagas for distributed transactions</td>
            </tr>
            <tr>
              <td>Team scaling</td>
              <td>Coordination overhead grows with team size</td>
              <td>Teams own services autonomously</td>
            </tr>
            <tr>
              <td>Operational complexity</td>
              <td>Low — one process to monitor</td>
              <td>High — service mesh, distributed logging, tracing</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>
      <p>
        <strong>Default to a monolith</strong> until you have a concrete reason not to. Most
        startups that start with microservices spend more time on infrastructure than on the product.
        A well-structured modular monolith can be split into microservices later when team size or
        scaling requirements demand it.
      </p>

      {/* ── 22 ── */}
      <h2 id="split-services">How do you split responsibilities between services?</h2>
      <p>
        When the time comes to split, the right boundary is along <strong>business capability</strong>{" "}
        — not technical layer. You split around what the business does, not around database tables.
      </p>
      <p>Good split signals:</p>
      <ul>
        <li>Different teams own different parts of the business domain</li>
        <li>One part of the system needs to scale independently (e.g., image processing vs. search)</li>
        <li>Different parts have genuinely different availability requirements</li>
        <li>The deployment cadence of two modules is completely different</li>
      </ul>
      <p>Common mistakes when splitting:</p>
      <ul>
        <li>
          <strong>Splitting by technical layer</strong> — a "database service" and a "business
          logic service" are not microservices; they are a distributed monolith.
        </li>
        <li>
          <strong>Too fine-grained too early</strong> — nano-services with one endpoint each create
          chatty network overhead and operational burden.
        </li>
        <li>
          <strong>Shared database</strong> — two services sharing a database are a monolith in
          disguise. Each service must own its data.
        </li>
      </ul>
      <p>
        The <strong>Strangler Fig pattern</strong> is the safest migration path: route new features
        to a new service while the monolith handles legacy traffic. Gradually move functionality
        until the monolith is strangled and can be retired.
      </p>
    </div>
  );
}
