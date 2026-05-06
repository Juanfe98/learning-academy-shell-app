import type { TocItem } from "@/lib/types/academy";

export const toc: TocItem[] = [
  { id: "access-modifiers", title: "Access Modifiers", level: 2 },
  { id: "constructor-shorthand", title: "Constructor Parameter Shorthand", level: 2 },
  { id: "readonly-fields", title: "Readonly Fields", level: 2 },
  { id: "abstract-classes", title: "Abstract Classes", level: 2 },
  { id: "implements", title: "implements vs extends", level: 2 },
  { id: "static-members", title: "Static Members", level: 2 },
  { id: "override-keyword", title: "The override Keyword", level: 2 },
  { id: "private-fields", title: "TypeScript private vs # private", level: 2 },
  { id: "practical-patterns", title: "Practical OOP Patterns", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function Classes() {
  return (
    <div className="article-content">
      <p>
        TypeScript's class system goes significantly beyond JavaScript's. Access modifiers,
        abstract classes, interface implementation, and the <code>override</code> keyword
        are all TypeScript additions that shape how backend codebases — especially those
        using NestJS, TypeORM, or any DI framework — are structured. Interviewers probe
        these heavily precisely because they reveal how well you understand
        object-oriented design in a typed system.
      </p>

      <h2 id="access-modifiers">Access Modifiers</h2>

      <p>
        TypeScript adds <code>public</code>, <code>protected</code>, and{" "}
        <code>private</code> modifiers. These are enforced at compile time only — the
        emitted JavaScript has no equivalent enforcement.
      </p>

      <pre><code>{`class BankAccount {
  public owner: string;       // accessible anywhere
  protected balance: number;  // accessible in class + subclasses
  private _pin: number;       // accessible only in this class

  constructor(owner: string, balance: number, pin: number) {
    this.owner = owner;
    this.balance = balance;
    this._pin = pin;
  }

  public deposit(amount: number): void {
    this.balance += amount;
  }

  protected getBalance(): number {
    return this.balance;
  }

  private validatePin(pin: number): boolean {
    return pin === this._pin;
  }
}

class SavingsAccount extends BankAccount {
  withdraw(amount: number, pin: number): void {
    // ✓ protected — accessible in subclass
    if (amount > this.balance) throw new Error("Insufficient funds");
    // ✗ Error: private — not accessible in subclass
    // if (!this.validatePin(pin)) throw new Error("Invalid PIN");
    this.balance -= amount;
  }
}

const account = new BankAccount("Alice", 1000, 1234);
account.owner;       // ✓ public
// account.balance;  // ✗ Error: protected
// account._pin;     // ✗ Error: private`}</code></pre>

      <h2 id="constructor-shorthand">Constructor Parameter Shorthand</h2>

      <p>
        Declaring a modifier directly in the constructor parameter creates the property
        and assigns it automatically. This is one of TypeScript's most practical
        ergonomic improvements over plain JavaScript.
      </p>

      <pre><code>{`// Without shorthand — verbose
class UserService {
  private readonly db: Database;
  private readonly logger: Logger;

  constructor(db: Database, logger: Logger) {
    this.db = db;
    this.logger = logger;
  }
}

// With shorthand — identical behavior, far less noise
class UserService {
  constructor(
    private readonly db: Database,
    private readonly logger: Logger,
  ) {}
}

// This pattern is everywhere in NestJS:
@Injectable()
class OrderService {
  constructor(
    private readonly orderRepo: OrderRepository,
    private readonly eventBus: EventBus,
    private readonly config: ConfigService,
  ) {}
}`}</code></pre>

      <h2 id="readonly-fields">Readonly Fields</h2>

      <p>
        <code>readonly</code> fields can only be assigned in the constructor or at the
        declaration site. They're a compile-time guarantee — no reassignment anywhere else.
      </p>

      <pre><code>{`class Config {
  readonly maxRetries: number = 3;
  readonly serviceName: string;

  constructor(name: string) {
    this.serviceName = name; // ✓ allowed in constructor
  }

  update(): void {
    // this.serviceName = "other"; // ✗ Error: cannot assign to readonly
  }
}

// readonly arrays — the array reference is readonly, not the contents
class Queue<T> {
  private readonly items: T[] = [];

  enqueue(item: T): void {
    this.items.push(item); // ✓ mutating the array is fine
  }

  // To make contents immutable too, use ReadonlyArray<T>
  snapshot(): ReadonlyArray<T> {
    return this.items;
  }
}`}</code></pre>

      <h2 id="abstract-classes">Abstract Classes</h2>

      <p>
        Abstract classes define a contract that subclasses must fulfill. You can't
        instantiate them directly. They're the right tool when you want shared
        implementation alongside enforced overrides — a middle ground between a concrete
        class and a pure interface.
      </p>

      <pre><code>{`abstract class Repository<T extends { id: string }> {
  // Shared implementation — concrete, inherited by subclasses
  protected items: Map<string, T> = new Map();

  findById(id: string): T | undefined {
    return this.items.get(id);
  }

  findAll(): T[] {
    return [...this.items.values()];
  }

  // Abstract methods — subclasses MUST implement these
  abstract save(entity: T): Promise<T>;
  abstract delete(id: string): Promise<void>;
  abstract findWhere(predicate: Partial<T>): Promise<T[]>;
}

class UserRepository extends Repository<User> {
  async save(user: User): Promise<User> {
    this.items.set(user.id, user);
    // actual DB write logic here
    return user;
  }

  async delete(id: string): Promise<void> {
    this.items.delete(id);
  }

  async findWhere(predicate: Partial<User>): Promise<User[]> {
    return this.findAll().filter(u =>
      Object.entries(predicate).every(([k, v]) => u[k as keyof User] === v)
    );
  }
}

// new Repository(); // ✗ Error: Cannot create an instance of an abstract class`}</code></pre>

      <h2 id="implements">implements vs extends</h2>

      <p>
        <code>extends</code> inherits implementation. <code>implements</code> declares
        that a class satisfies a contract — without inheriting anything. A class can
        implement multiple interfaces but only extend one class.
      </p>

      <pre><code>{`interface Serializable {
  serialize(): string;
  deserialize(data: string): void;
}

interface Cacheable {
  cacheKey(): string;
  ttl(): number;
}

// Implements multiple interfaces — no inheritance
class UserSession implements Serializable, Cacheable {
  constructor(private userId: string, private token: string) {}

  serialize(): string {
    return JSON.stringify({ userId: this.userId, token: this.token });
  }

  deserialize(data: string): void {
    const parsed = JSON.parse(data);
    this.userId = parsed.userId;
    this.token = parsed.token;
  }

  cacheKey(): string { return \`session:\${this.userId}\`; }
  ttl(): number { return 3600; }
}

// Key distinction: implements does not inherit implementation
// If Serializable had a concrete method, UserSession doesn't get it
// Use extends for inheritance, implements for interface contracts

// A class can both extend and implement:
class AdminSession extends UserSession implements Auditable {
  audit(): AuditLog { /* ... */ return {} as AuditLog; }
}`}</code></pre>

      <h2 id="static-members">Static Members</h2>

      <p>
        Static members belong to the class itself, not instances. They're useful for
        factory methods, singletons, and class-level constants.
      </p>

      <pre><code>{`class Logger {
  private static instance: Logger | null = null;
  private static readonly DEFAULT_LEVEL = "info";

  private constructor(private level: string) {}

  // Singleton factory
  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger(Logger.DEFAULT_LEVEL);
    }
    return Logger.instance;
  }

  // Named factory — better than new Logger("debug") everywhere
  static debug(): Logger {
    return new Logger("debug");
  }

  log(message: string): void {
    console.log(\`[\${this.level.toUpperCase()}] \${message}\`);
  }
}

const log = Logger.getInstance();
log.log("Server started"); // [INFO] Server started

// Static methods on generic classes
class Result<T, E extends Error = Error> {
  private constructor(
    private readonly value: T | null,
    private readonly error: E | null,
  ) {}

  static ok<T>(value: T): Result<T> {
    return new Result(value, null);
  }

  static err<E extends Error>(error: E): Result<never, E> {
    return new Result(null, error);
  }

  isOk(): boolean { return this.error === null; }
  unwrap(): T {
    if (this.error) throw this.error;
    return this.value!;
  }
}`}</code></pre>

      <h2 id="override-keyword">The override Keyword</h2>

      <p>
        The <code>override</code> keyword (TypeScript 4.3+) ensures a method actually
        overrides a base class method. Without it, if the base renames or removes the
        method, your subclass silently defines a new unrelated method.
        Enable <code>noImplicitOverride</code> in tsconfig to enforce this.
      </p>

      <pre><code>{`class Animal {
  speak(): string {
    return "...";
  }

  breathe(): void {
    console.log("breathing");
  }
}

class Dog extends Animal {
  override speak(): string {  // ✓ explicit — compiler verifies base has speak()
    return "Woof!";
  }

  // override bark(): void { }  // ✗ Error: not in base class
}

// With noImplicitOverride: true in tsconfig:
class Cat extends Animal {
  speak(): string { // ✗ Error: must have 'override' modifier
    return "Meow!";
  }
}`}</code></pre>

      <h2 id="private-fields">TypeScript private vs # private</h2>

      <p>
        TypeScript's <code>private</code> is erased at runtime — it's a compile-time
        check only. JavaScript's <code>#</code> private fields are enforced at runtime
        and are truly inaccessible. Know the difference — interviewers ask this.
      </p>

      <pre><code>{`class A {
  private tsPrivate = "typescript private";
  #jsPrivate = "javascript private";

  getTs() { return this.tsPrivate; }
  getJs() { return this.#jsPrivate; }
}

const a = new A();

// TypeScript private — compile error, but works at runtime if you bypass types
// (a as any).tsPrivate; // ✓ works at runtime — no actual enforcement

// JavaScript # private — truly inaccessible at runtime
// (a as any).["#jsPrivate"]; // ✗ returns undefined — it's actually private

// # fields also don't appear in subclass scope
class B extends A {
  test() {
    // this.tsPrivate; // ✗ TS error (but accessible via any at runtime)
    // this.#jsPrivate; // ✗ TS error AND runtime error
  }
}

// Rule of thumb:
// Use TypeScript private for DX (most cases)
// Use # when you need runtime privacy guarantees (security-sensitive data)`}</code></pre>

      <h2 id="practical-patterns">Practical OOP Patterns</h2>

      <p>
        These patterns appear constantly in backend codebases. Recognize them — and
        know how to type them properly.
      </p>

      <pre><code>{`// 1. Builder pattern with method chaining
class QueryBuilder {
  private conditions: string[] = [];
  private limitValue?: number;
  private orderByField?: string;

  where(condition: string): this {  // return 'this' preserves subclass type
    this.conditions.push(condition);
    return this;
  }

  limit(n: number): this {
    this.limitValue = n;
    return this;
  }

  orderBy(field: string): this {
    this.orderByField = field;
    return this;
  }

  build(): string {
    const where = this.conditions.length
      ? \`WHERE \${this.conditions.join(" AND ")}\`
      : "";
    const order = this.orderByField ? \`ORDER BY \${this.orderByField}\` : "";
    const limit = this.limitValue ? \`LIMIT \${this.limitValue}\` : "";
    return [\`SELECT *\`, where, order, limit].filter(Boolean).join(" ");
  }
}

const query = new QueryBuilder()
  .where("age > 18")
  .where("active = true")
  .orderBy("name")
  .limit(10)
  .build();
// "SELECT * WHERE age > 18 AND active = true ORDER BY name LIMIT 10"

// 2. Mixin pattern — composing behaviors without deep inheritance
type Constructor<T = {}> = new (...args: any[]) => T;

function Timestamped<TBase extends Constructor>(Base: TBase) {
  return class extends Base {
    createdAt = new Date();
    updatedAt = new Date();

    touch(): void {
      this.updatedAt = new Date();
    }
  };
}

function SoftDeletable<TBase extends Constructor>(Base: TBase) {
  return class extends Base {
    deletedAt: Date | null = null;

    softDelete(): void {
      this.deletedAt = new Date();
    }

    isDeleted(): boolean {
      return this.deletedAt !== null;
    }
  };
}

class User {
  constructor(public name: string, public email: string) {}
}

const TimestampedUser = Timestamped(User);
const AuditableUser = SoftDeletable(Timestamped(User));

const u = new AuditableUser("Alice", "alice@example.com");
u.touch();
u.softDelete();
console.log(u.isDeleted()); // true`}</code></pre>

      <h2 id="key-takeaways">Key Takeaways</h2>

      <ul>
        <li>
          <strong>Constructor shorthand</strong> (<code>private readonly db: DB</code> in
          constructor params) eliminates boilerplate — it's idiomatic in NestJS and any DI codebase.
        </li>
        <li>
          <strong>Abstract classes</strong> give you shared implementation + enforced overrides.
          Interfaces give you pure contracts. Use abstract when subclasses need inherited behavior;
          use interfaces when you're describing a capability any class can fulfill.
        </li>
        <li>
          <strong><code>implements</code></strong> doesn't inherit anything — it only verifies
          the contract. A class can implement multiple interfaces but extend only one class.
        </li>
        <li>
          <strong>TypeScript <code>private</code></strong> is compile-time only. JavaScript
          <code>#</code> fields are runtime-enforced. Interviewers know the difference and will
          ask.
        </li>
        <li>
          <strong><code>override</code></strong> keyword + <code>noImplicitOverride</code> in
          tsconfig prevents silent method mismatches in deep inheritance hierarchies.
        </li>
        <li>
          Return <strong><code>this</code></strong> from builder methods — not the concrete
          class — so subclass chains preserve the subclass type.
        </li>
      </ul>
    </div>
  );
}
