import MermaidDiagram from "@/components/diagrams/MermaidDiagram";
import { ArticleTable, InterviewPlaybook, InterviewChallenge } from "@/components/ui";
import type { TocItem } from "@/lib/types/academy";

const goConcurrencyDiagram = String.raw`flowchart TD
  MAIN["main goroutine"]
  MAIN -->|"go func()"| G1["goroutine 1\nFetch user profile"]
  MAIN -->|"go func()"| G2["goroutine 2\nFetch ticket history"]
  MAIN -->|"go func()"| G3["goroutine 3\nFetch AI context"]
  G1 -->|"result"| CH1["channel 1"]
  G2 -->|"result"| CH2["channel 2"]
  G3 -->|"result"| CH3["channel 3"]
  CH1 --> SELECT["select statement\nCollects all 3 results\nor context deadline fires"]
  CH2 --> SELECT
  CH3 --> SELECT
  SELECT --> RES["Aggregate response\nto HTTP client"]`;

const errorHandlingDiagram = String.raw`flowchart TD
  CALL["function call\nerr := doSomething()"]
  CALL --> CHECK["if err != nil"]
  CHECK -->|"error"| WRAP["fmt.Errorf wrap:\nwrap with context\nerrors.Is / errors.As for type check"]
  CHECK -->|"nil"| PROCEED["proceed with result"]
  WRAP --> SENTINEL["Sentinel error?\nerrors.Is(err, ErrNotFound)"]
  WRAP --> TYPED["Typed error?\nvar e *TicketError; errors.As(err, &e)"]
  SENTINEL --> HTTP["Map to HTTP 404"]
  TYPED --> HTTP2["Map to HTTP with e.Code"]`;

export const toc: TocItem[] = [
  { id: "go-for-ts-devs", title: "Go for TypeScript Developers", level: 2 },
  { id: "types-interfaces", title: "Types & Interfaces", level: 3 },
  { id: "error-handling", title: "Error Handling — the Go Way", level: 2 },
  { id: "sentinel-typed", title: "Sentinel Errors & Typed Errors", level: 3 },
  { id: "concurrency", title: "Goroutines & Channels", level: 2 },
  { id: "patterns", title: "Concurrency Patterns", level: 3 },
  { id: "context", title: "Context Package — Cancellation & Deadlines", level: 2 },
  { id: "http-servers", title: "HTTP Servers in Go", level: 2 },
  { id: "testing-go", title: "Testing in Go", level: 2 },
  { id: "generics", title: "Go Generics", level: 2 },
  { id: "go-ddd", title: "DDD Patterns in Go", level: 2 },
  { id: "interview-framing", title: "Interview Framing", level: 2 },
  { id: "challenge", title: "Go Challenge", level: 2 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function GolangForBackend() {
  return (
    <div className="article-content">
      <p>
        The GoDaddy JD lists Go as a preferred (not required) language. In practice, AI
        backend systems at GoDaddy are likely polyglot — TypeScript for API layers and Go
        for high-throughput services. Even if you primarily write TypeScript, demonstrating
        Go proficiency is a significant differentiator. This module covers Go through the
        lens of a TypeScript developer — the differences, the idioms, and the patterns GoDaddy
        evaluates.
      </p>

      <h2 id="go-for-ts-devs">Go for TypeScript Developers</h2>
      <p>
        Go is statically typed, compiled, and has no runtime type system. The conceptual shift
        from TypeScript: <strong>Go is explicit about everything</strong> — no implicit type
        coercion, no optional chaining, no <code>null</code> coalescence. The trade-off is a
        language that is radically simpler to reason about at the cost of more verbose code.
      </p>

      <ArticleTable caption="TypeScript vs Go key differences — syntax and philosophy." minWidth={820}>
        <table>
          <thead>
            <tr>
              <th>Concept</th>
              <th>TypeScript</th>
              <th>Go</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Null safety</td>
              <td><code>option?.field ?? default</code></td>
              <td>Pointer vs nil check: <code>if p == nil {"{ ... }"}</code></td>
            </tr>
            <tr>
              <td>Error handling</td>
              <td><code>try/catch</code> (exceptions)</td>
              <td>Multiple return: <code>value, err := fn()</code></td>
            </tr>
            <tr>
              <td>Generics</td>
              <td><code>function fn{"<T>(x: T): T"}</code></td>
              <td><code>func Fn[T any](x T) T</code></td>
            </tr>
            <tr>
              <td>Interfaces</td>
              <td>Explicit: <code>implements Interface</code></td>
              <td>Implicit: if type has the methods, it satisfies the interface</td>
            </tr>
            <tr>
              <td>Classes</td>
              <td>class keyword, inheritance</td>
              <td>Structs + methods on types, composition not inheritance</td>
            </tr>
            <tr>
              <td>Async</td>
              <td><code>async/await</code>, Promise chain</td>
              <td>Goroutines + channels (not async/await — goroutines block internally)</td>
            </tr>
            <tr>
              <td>Modules</td>
              <td>npm packages, import/export</td>
              <td>Go modules (go.mod), package-level visibility (uppercase = exported)</td>
            </tr>
          </tbody>
        </table>
      </ArticleTable>

      <h3 id="types-interfaces">Types & Interfaces</h3>
      <pre><code>{`// Structs replace classes in Go — methods are defined on the type
type SupportTicket struct {
    ID         string
    CustomerID string
    Subject    string
    Status     TicketStatus
    Category   TicketCategory
    CreatedAt  time.Time
    events     []DomainEvent  // unexported (lowercase) = private to package
}

// Methods on struct — receiver is by value (copy) or pointer (mutation)
// Use pointer receiver when: 1) method mutates the struct, 2) struct is large
func (t *SupportTicket) Escalate(reason string) error {
    if t.Status == StatusClosed {
        return &TicketError{
            Code:    "TICKET_ALREADY_CLOSED",
            Message: fmt.Sprintf("ticket %s is already closed", t.ID),
        }
    }
    t.Status = StatusEscalated
    t.events = append(t.events, TicketEscalated{
        TicketID: t.ID,
        Reason:   reason,
        OccurredAt: time.Now(),
    })
    return nil
}

// Interface: IMPLICIT satisfaction — SupportTicket doesn't need to declare it
type TicketRepository interface {
    Save(ctx context.Context, ticket *SupportTicket) error
    FindByID(ctx context.Context, id string) (*SupportTicket, error)
    FindOpenByCustomer(ctx context.Context, customerID string) ([]*SupportTicket, error)
}

// DynamoDB adapter automatically satisfies TicketRepository if it has these methods
type DynamoTicketRepository struct {
    client    *dynamodb.Client
    tableName string
}

func (r *DynamoTicketRepository) Save(ctx context.Context, ticket *SupportTicket) error {
    // implementation
    return nil
}

// Test double: also satisfies TicketRepository — zero configuration
type InMemoryTicketRepository struct {
    tickets map[string]*SupportTicket
    mu      sync.RWMutex
}

func (r *InMemoryTicketRepository) FindByID(ctx context.Context, id string) (*SupportTicket, error) {
    r.mu.RLock()
    defer r.mu.RUnlock()
    if t, ok := r.tickets[id]; ok {
        return t, nil
    }
    return nil, ErrNotFound
}`}</code></pre>

      <h2 id="error-handling">Error Handling — the Go Way</h2>
      <p>
        Go has no exceptions. Every function that can fail returns an <code>error</code> as
        its last return value. This forces callers to explicitly handle every failure — there
        is no way to accidentally ignore an error the way you can with uncaught exceptions.
        The initial verbosity pays off in systems where errors are frequent and important.
      </p>

      <MermaidDiagram
        chart={errorHandlingDiagram}
        title="Go Error Handling Flow"
        caption="Every error is checked at the call site. Errors are wrapped with context as they propagate up the stack. At the HTTP boundary, typed errors are mapped to status codes."
        minHeight={320}
      />

      <h3 id="sentinel-typed">Sentinel Errors & Typed Errors</h3>
      <pre><code>{`// Sentinel errors — package-level variables for well-known conditions
var (
    ErrNotFound         = errors.New("not found")
    ErrAlreadyClosed    = errors.New("ticket already closed")
    ErrQuotaExceeded    = errors.New("ticket quota exceeded")
)

// Typed errors — carry additional context
type TicketError struct {
    Code    string
    Message string
    TicketID string
}

func (e *TicketError) Error() string {
    return fmt.Sprintf("[%s] %s (ticket: %s)", e.Code, e.Message, e.TicketID)
}

// Wrapping errors with context (Go 1.13+)
func (r *DynamoTicketRepository) FindByID(ctx context.Context, id string) (*SupportTicket, error) {
    item, err := r.client.GetItem(ctx, &dynamodb.GetItemInput{/* ... */})
    if err != nil {
        // Wrap with context — preserves the original error for errors.Is/As
        return nil, fmt.Errorf("DynamoTicketRepository.FindByID: %w", err)
    }
    if item.Item == nil {
        return nil, fmt.Errorf("ticket %s: %w", id, ErrNotFound)
    }
    return mapToDomain(item.Item), nil
}

// HTTP handler: type checking with errors.Is and errors.As
func (h *TicketHandler) GetTicket(w http.ResponseWriter, r *http.Request) {
    id := chi.URLParam(r, "id")
    ticket, err := h.ticketRepo.FindByID(r.Context(), id)
    if err != nil {
        if errors.Is(err, ErrNotFound) {
            writeJSON(w, http.StatusNotFound, ErrorResponse{Code: "NOT_FOUND"})
            return
        }
        // Type assertion for custom error types
        var ticketErr *TicketError
        if errors.As(err, &ticketErr) {
            writeJSON(w, http.StatusBadRequest, ErrorResponse{Code: ticketErr.Code})
            return
        }
        // Unknown error — log and return 500
        slog.Error("unexpected error", "err", err, "ticketId", id)
        writeJSON(w, http.StatusInternalServerError, ErrorResponse{Code: "INTERNAL_ERROR"})
        return
    }
    writeJSON(w, http.StatusOK, mapToDTO(ticket))
}`}</code></pre>

      <h2 id="concurrency">Goroutines & Channels</h2>
      <p>
        Goroutines are Go&apos;s equivalent of lightweight threads, but they are managed by
        the Go runtime — not the OS. You can run hundreds of thousands of goroutines with
        minimal memory overhead. Channels are typed communication pipes between goroutines.
        The Go philosophy: <strong>&quot;Don&apos;t communicate by sharing memory; share memory
        by communicating.&quot;</strong>
      </p>

      <MermaidDiagram
        chart={goConcurrencyDiagram}
        title="Goroutine Fan-Out Pattern — Parallel API Calls"
        caption="Three goroutines fetch data simultaneously. The main goroutine collects all results via channels. Total time = max(3 calls), not sum(3 calls). Context cancellation propagates to all goroutines."
        minHeight={380}
      />

      <h3 id="patterns">Concurrency Patterns</h3>
      <pre><code>{`// Fan-out + collect: fetch multiple services in parallel
type CustomerContext struct {
    Profile     *CustomerProfile
    Tickets     []*SupportTicket
    AiContext   *AiConversationContext
}

func fetchCustomerContext(ctx context.Context, customerID string) (*CustomerContext, error) {
    type result[T any] struct {
        value T
        err   error
    }

    profileCh := make(chan result[*CustomerProfile], 1)
    ticketsCh := make(chan result[[]*SupportTicket], 1)
    aiCtxCh := make(chan result[*AiConversationContext], 1)

    go func() {
        p, err := profileService.GetProfile(ctx, customerID)
        profileCh <- result[*CustomerProfile]{p, err}
    }()
    go func() {
        t, err := ticketRepo.FindOpenByCustomer(ctx, customerID)
        ticketsCh <- result[[]*SupportTicket]{t, err}
    }()
    go func() {
        a, err := aiService.GetContext(ctx, customerID)
        aiCtxCh <- result[*AiConversationContext]{a, err}
    }()

    // Collect — returns as soon as all three complete or context cancels
    profileRes := <-profileCh
    ticketsRes := <-ticketsCh
    aiCtxRes := <-aiCtxCh

    if profileRes.err != nil { return nil, fmt.Errorf("profile: %w", profileRes.err) }
    if ticketsRes.err != nil { return nil, fmt.Errorf("tickets: %w", ticketsRes.err) }
    if aiCtxRes.err != nil { return nil, fmt.Errorf("ai context: %w", aiCtxRes.err) }

    return &CustomerContext{
        Profile:   profileRes.value,
        Tickets:   ticketsRes.value,
        AiContext: aiCtxRes.value,
    }, nil
}

// Worker pool: bounded concurrency for batch AI classification
func classifyTicketsBatch(ctx context.Context, tickets []*SupportTicket, concurrency int) {
    jobs := make(chan *SupportTicket, len(tickets))
    results := make(chan ClassificationResult, len(tickets))

    // Start worker pool
    for range concurrency {  // Go 1.22+ range over int
        go func() {
            for ticket := range jobs {
                category, err := aiClassifier.Classify(ctx, ticket.Subject)
                results <- ClassificationResult{TicketID: ticket.ID, Category: category, Err: err}
            }
        }()
    }

    // Send all jobs
    for _, t := range tickets { jobs <- t }
    close(jobs)

    // Collect results
    for range tickets {
        r := <-results
        if r.Err != nil {
            slog.Warn("classification failed", "ticketId", r.TicketID, "err", r.Err)
        }
    }
}`}</code></pre>

      <h2 id="context">Context Package — Cancellation & Deadlines</h2>
      <p>
        The <code>context.Context</code> package is Go&apos;s mechanism for propagating
        cancellation, deadlines, and request-scoped values across goroutines and API boundaries.
        <strong>Every function that does I/O must accept a context as its first parameter.</strong>
        This is a hard convention in Go, not optional.
      </p>
      <pre><code>{`// HTTP handler: derive a child context with timeout for the request
func (h *TicketHandler) CreateTicket(w http.ResponseWriter, r *http.Request) {
    // Add a 5-second deadline for the entire request processing
    ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
    defer cancel()  // ALWAYS defer cancel — prevents goroutine leak

    body := parseBody[CreateTicketRequest](w, r)
    if body == nil { return }

    ticket, err := h.createTicket.Execute(ctx, body)
    if err != nil {
        if errors.Is(err, context.DeadlineExceeded) {
            writeJSON(w, http.StatusGatewayTimeout, ErrorResponse{Code: "TIMEOUT"})
            return
        }
        handleError(w, err)
        return
    }
    writeJSON(w, http.StatusCreated, ticket)
}

// Context values: request-scoped data (correlation ID, authenticated user)
type contextKey string
const userKey contextKey = "authenticated_user"

func withUser(ctx context.Context, user *AuthenticatedUser) context.Context {
    return context.WithValue(ctx, userKey, user)
}

func userFromContext(ctx context.Context) (*AuthenticatedUser, bool) {
    user, ok := ctx.Value(userKey).(*AuthenticatedUser)
    return user, ok
}

// Auth middleware sets the user, downstream handlers retrieve it
func authMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        user, err := extractAndValidateJWT(r.Header.Get("Authorization"))
        if err != nil {
            writeJSON(w, http.StatusUnauthorized, ErrorResponse{Code: "UNAUTHORIZED"})
            return
        }
        ctx := withUser(r.Context(), user)
        next.ServeHTTP(w, r.WithContext(ctx))
    })
}`}</code></pre>

      <h2 id="http-servers">HTTP Servers in Go</h2>
      <pre><code>{`// Using chi router (lightweight, idiomatic Go)
import "github.com/go-chi/chi/v5"
import "github.com/go-chi/chi/v5/middleware"

func buildRouter(ticketHandler *TicketHandler) http.Handler {
    r := chi.NewRouter()

    // Global middleware
    r.Use(middleware.RequestID)      // sets X-Request-ID
    r.Use(middleware.RealIP)
    r.Use(middleware.Logger)         // structured request logging
    r.Use(middleware.Recoverer)      // catches panics, returns 500
    r.Use(middleware.Timeout(60 * time.Second))

    r.Route("/api/v1", func(r chi.Router) {
        // Protected routes
        r.Group(func(r chi.Router) {
            r.Use(authMiddleware)
            r.Route("/tickets", func(r chi.Router) {
                r.Post("/", ticketHandler.CreateTicket)
                r.Get("/{id}", ticketHandler.GetTicket)
                r.Post("/{id}/escalate", ticketHandler.EscalateTicket)
                r.Get("/{id}/messages", ticketHandler.GetMessages)
            })
        })

        // Health check — no auth
        r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
            writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
        })
    })

    return r
}

// Graceful shutdown — critical for on-call scenarios (drain in-flight requests)
func runServer(ctx context.Context, handler http.Handler, port string) error {
    srv := &http.Server{Addr: ":" + port, Handler: handler}

    go func() {
        <-ctx.Done()  // wait for shutdown signal
        shutdownCtx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
        defer cancel()
        srv.Shutdown(shutdownCtx)
    }()

    if err := srv.ListenAndServe(); err != http.ErrServerClosed {
        return fmt.Errorf("server: %w", err)
    }
    return nil
}`}</code></pre>

      <h2 id="testing-go">Testing in Go</h2>
      <pre><code>{`// Go testing: built-in testing package, table-driven tests
func TestSupportTicket_Escalate(t *testing.T) {
    tests := []struct {
        name        string
        status      TicketStatus
        wantErr     bool
        wantErrCode string
    }{
        {name: "open ticket escalates successfully", status: StatusOpen, wantErr: false},
        {name: "closed ticket returns error", status: StatusClosed, wantErr: true, wantErrCode: "TICKET_ALREADY_CLOSED"},
        {name: "already escalated returns error", status: StatusEscalated, wantErr: true},
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            ticket := &SupportTicket{ID: "t-1", Status: tt.status}
            err := ticket.Escalate("test reason")

            if (err != nil) != tt.wantErr {
                t.Errorf("Escalate() error = %v, wantErr %v", err, tt.wantErr)
            }
            if tt.wantErrCode != "" {
                var ticketErr *TicketError
                if !errors.As(err, &ticketErr) || ticketErr.Code != tt.wantErrCode {
                    t.Errorf("expected error code %s, got %v", tt.wantErrCode, err)
                }
            }
        })
    }
}

// HTTP integration test using httptest
func TestTicketHandler_CreateTicket(t *testing.T) {
    repo := &InMemoryTicketRepository{tickets: make(map[string]*SupportTicket)}
    handler := NewTicketHandler(NewCreateTicketUseCase(repo))
    router := buildRouter(handler)

    body := \`{"subject":"Domain not resolving","description":"48 hours no resolution","category":"domain"}\`
    req := httptest.NewRequest(http.MethodPost, "/api/v1/tickets", strings.NewReader(body))
    req.Header.Set("Content-Type", "application/json")
    req.Header.Set("Authorization", "Bearer "+testToken(t, "cust-123"))

    w := httptest.NewRecorder()
    router.ServeHTTP(w, req)

    if w.Code != http.StatusCreated {
        t.Errorf("expected 201, got %d: %s", w.Code, w.Body.String())
    }
    var resp CreateTicketResponse
    json.NewDecoder(w.Body).Decode(&resp)
    if resp.TicketID == "" {
        t.Error("expected non-empty ticketId")
    }
}`}</code></pre>

      <h2 id="generics">Go Generics</h2>
      <pre><code>{`// Go 1.18+ generics — type parameters with constraints

// Generic Result type (mirrors TypeScript Result pattern)
type Result[T any] struct {
    Value T
    Err   error
}

func OK[T any](value T) Result[T]  { return Result[T]{Value: value} }
func Fail[T any](err error) Result[T] { return Result[T]{Err: err} }

// Generic pagination helper
type Page[T any] struct {
    Items      []T
    Total      int
    Cursor     string
    HasNext    bool
}

// Generic repository interface
type Repository[T any, ID comparable] interface {
    Save(ctx context.Context, entity T) error
    FindByID(ctx context.Context, id ID) (T, error)
    Delete(ctx context.Context, id ID) error
}`}</code></pre>

      <h2 id="go-ddd">DDD Patterns in Go</h2>
      <pre><code>{`// Value object in Go: struct with no exported mutable fields
type Email struct {
    value string  // unexported — immutable from outside the package
}

func NewEmail(raw string) (Email, error) {
    normalized := strings.ToLower(strings.TrimSpace(raw))
    if !emailRegex.MatchString(normalized) {
        return Email{}, fmt.Errorf("invalid email: %s", raw)
    }
    return Email{value: normalized}, nil
}

func (e Email) String() string { return e.value }
func (e Email) Equals(other Email) bool { return e.value == other.value }

// Domain event in Go
type TicketEscalated struct {
    EventID    string    \`json:"eventId"\`
    OccurredAt time.Time \`json:"occurredAt"\`
    EventType  string    \`json:"eventType"\`
    TicketID   string    \`json:"ticketId"\`
    Reason     string    \`json:"reason"\`
}

func (e TicketEscalated) GetEventType() string { return e.EventType }
func (e TicketEscalated) GetEventID() string   { return e.EventID }`}</code></pre>

      <h2 id="interview-framing">Interview Framing</h2>

      <InterviewPlaybook
        title="How to answer: 'What is your experience with Go and how does it compare to TypeScript?'"
        intro="GoDaddy wants to see genuine Go experience, not just 'I've read about it.' Even if your Go is secondary, show you understand the fundamental differences and why Go excels for certain backend scenarios."
        steps={[
          "Acknowledge the difference honestly: 'My primary language is TypeScript, but I have built production services in Go. The mental shift that took the longest was error handling — moving from exceptions to explicit error return values.'",
          "Name Go's genuine strengths: 'Go is my choice when I need: predictable memory allocation (no GC pauses from class hierarchies), goroutine-based concurrency for thousands of concurrent connections, or a service that needs to compile to a tiny statically-linked binary for container deployment.'",
          "Show interface understanding: 'The thing I appreciate most about Go is implicit interface satisfaction. If a type has the methods, it satisfies the interface — no import coupling, no circular dependency risk. That makes hexagonal architecture very clean in Go.'",
          "Connect to the role: 'For GoDaddy's AI backend — processing millions of support interactions — Go is an excellent fit for the classification pipeline where throughput and latency matter. TypeScript for the API layer, Go for the compute-intensive processing tier.'",
        ]}
      />

      <InterviewChallenge
        title="Go Challenge: Concurrent AI Classification Service"
        scenario={
          <>
            You need to implement a service in Go that receives batches of support ticket
            subjects (up to 500 per request) and classifies each one using an LLM API.
            The LLM API accepts one subject at a time. The service must: classify all
            tickets with at most 20 concurrent LLM calls, respect a 30-second overall
            deadline, and return partial results if some classifications fail.
          </>
        }
        tasks={[
          "Define the service struct and its dependencies (LLM client, concurrency limit).",
          "Implement ClassifyBatch using goroutines, channels, and a semaphore for concurrency limiting.",
          "Propagate context cancellation — if the context deadline fires, return partial results already completed.",
          "Define the return type: how do you represent partial success (some succeeded, some failed)?",
          "Write one table-driven test for the concurrency limit behavior.",
        ]}
      />

      <h2 id="key-takeaways">Key Takeaways</h2>
      <ul>
        <li>Go interfaces are satisfied <strong>implicitly</strong> — if a type has the methods, it satisfies the interface. No <code>implements</code> keyword, no import coupling.</li>
        <li>Go error handling is <strong>explicit at every call site</strong> — no exceptions means no accidental ignored errors. Every function that can fail must return an <code>error</code>.</li>
        <li><strong>Goroutines + channels</strong> enable fan-out patterns that make parallel API calls trivial — fetch user profile, tickets, and AI context simultaneously with clean channel-based collection.</li>
        <li><code>context.Context</code> must be the <strong>first parameter of every function that does I/O</strong> — this is a hard Go convention, not optional. Context propagates deadlines and cancellation signals.</li>
        <li><strong>Table-driven tests</strong> are the idiomatic Go testing pattern — one test function, many sub-cases via a struct slice, <code>t.Run</code> for sub-test isolation.</li>
        <li>For GoDaddy&apos;s AI backend: Go is the right choice for <strong>high-throughput, latency-sensitive classification pipelines</strong>. TypeScript for the developer-friendly API and orchestration layers.</li>
      </ul>
    </div>
  );
}
